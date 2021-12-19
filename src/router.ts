import { resolve as resolvePath, join as joinPath } from 'path';
import { Context, Middleware, Next } from "koa";
import compose from 'koa-compose';
import send from 'koa-send';

import { errorHandler, ErrorHandlerOpts } from './error';
import {
    normalizePath, createPathMatcher, createPathPrefixMatcher,
    createSimplePrefixMatcher, PathMatcher, PrefixMatcher
} from './path-matchers';


declare module 'koa' {
    interface BaseContext {
        $router: RouterContext;
    }
}

export type RouteTarget = (ctx: Context) => Promise<any>;
export type RouterGuard = (ctx: Context) => boolean;

export interface Route {
    match(ctx: Context, path: string): boolean;
    dispatch(ctx: Context): Promise<any>;
}


export class RouterContext {
    params: any = {};
    path: string;

    constructor(ctx: Context) {
        this.path = normalizePath(ctx.path);
        ctx.$router = this;
    }

    update(params?: object) {
        params && Object.assign(this.params, params);
    }
}

class EndpointRoute implements Route {
    method: string | null | undefined;
    matcher: PathMatcher;
    target: RouteTarget;

    constructor(method: string | null | undefined, matcher: PathMatcher, target: RouteTarget) {
        this.method = method ? method.toUpperCase() : null;
        this.matcher = matcher;
        this.target = target;
    }

    match(ctx: Context, path: string): boolean {
        if (this.method && this.method !== ctx.method) {
            return false;
        }
        const match = this.matcher(path);
        if (match && match !== true) {
            ctx.$router.update(match.params);
            return true;
        } else {
            return match;
        }
    }

    dispatch(ctx: Context) {
        return this.target(ctx);
    }
}

/**
 * A route which serve static files given a path mapping
 */
class ServeRoute implements Route {
    matcher: PrefixMatcher;
    target: string;
    opts: send.SendOptions;

    constructor(prefix: string, target: string, opts: send.SendOptions = {}) {
        this.matcher = createSimplePrefixMatcher(normalizePath(prefix));
        this.target = target;
        this.opts = opts;
    }
    match(ctx: Context, path: string): boolean {
        switch (ctx.method) {
            case 'GET':
            case 'HEAD':
                return this.matcher(ctx, path);
            default: return false;
        }

    }
    async dispatch(ctx: Context): Promise<any> {
        let path = ctx.$router.path || '.'; // trailing path
        try {
            await send(ctx,
                path.startsWith('/') ? '.' + path : path,
                this.opts);
        } catch (err) {
            if ((err as any).code === 'ENOENT') {
                ctx.throw(404, 'File not found: ' + ctx.path);
            } else {
                ctx.throw(500, 'Failed to fetch file: ' + ctx.path);
            }
        }
    };
}



export type RouterSetup = (resource: any, router: Router) => void;
export class RouterMeta {
    setupChain: RouterSetup[] = [];
    webRoot?: string;
    errorhandlerOpts?: ErrorHandlerOpts;

    constructor(webRoot?: string) {
        this.webRoot = webRoot;
    }

    setup(resource: any, router: Router) {
        if (this.webRoot) {
            router.webRoot = this.webRoot;
        }
        if (this.errorhandlerOpts) {
            router.errorHandlerOpts = this.errorhandlerOpts;
        }
        for (const setup of this.setupChain) {
            setup(resource, router);
        }
    }
}

type RouterOpts = {
    webRoot?: string,
    errorHandlers?: ErrorHandlerOpts
}

export class Router implements Route {

    prefix: string;
    prefixMatcher: PrefixMatcher;
    guard?: RouterGuard;
    routes: Route[] = [];
    filters: Middleware[] = [];
    filtersFn?: Middleware;
    webRoot: string;
    errorHandlerOpts?: ErrorHandlerOpts;

    constructor(prefix: string = '/', opts: RouterOpts = {}) {
        this.prefix = prefix;
        this.webRoot = opts.webRoot || process.cwd();
        this.errorHandlerOpts = opts.errorHandlers;
        this.prefixMatcher = createPathPrefixMatcher(prefix);
    }

    match(ctx: Context, path: string) {
        return this.prefixMatcher(ctx, path);
    }

    notFound(ctx: Context) {
        ctx.throw(404);
    }

    async _dispatch(ctx: Context) {
        const path = ctx.$router.path;
        for (const route of this.routes) {
            if (route.match(ctx, path)) {
                return route.dispatch(ctx);
            }
        }
        return this.notFound(ctx);
    }

    async dispatch(ctx: Context) {
        try {
            if (this.guard) {
                if (!await this.guard(ctx)) {
                    ctx.throw(401);
                }
            }
            if (this.filtersFn) {
                return await this.filtersFn(ctx, () => {
                    return this._dispatch(ctx);
                });
            } else {
                return await this._dispatch(ctx);
            }
        } catch (err) {
            return this.onError(ctx, err);
        }
    }

    middleware() {
        if (this.filters.length > 0) {
            this.filtersFn = compose(this.filters);
        }
        return (ctx: Context, next: Next) => {
            const $router = ctx.$router = new RouterContext(ctx);
            if (this.match(ctx, $router.path)) {
                // we never call next since the router is an endpoint
                return this.dispatch(ctx);
            } else {
                return next();
            }
        }
    }

    onError(ctx: Context, err: any): void {
        errorHandler(ctx, err, { htmlRoot: joinPath(this.webRoot, '/errors'), ...this.errorHandlerOpts });
    }

    withGuard(guard: RouterGuard): Router {
        this.guard = guard;
        return this;
    }

    withErrorHandler(errorHandlerOpts: ErrorHandlerOpts): Router {
        this.errorHandlerOpts = errorHandlerOpts;
        return this;
    }

    withWebRoot(webRoot: string): Router {
        this.webRoot = webRoot;
        return this;
    }

    route(method: string | null | undefined, path: string, target: RouteTarget) {
        const matcher = path && path !== '/' ? createPathMatcher(path) : (path: string) => !path || path === '/';
        this.routes.push(new EndpointRoute(method, matcher, target));
    }

    routeAll(path: string, target: RouteTarget) {
        this.route(null, path, target);
    }

    /**
     * The target can be a resource instance or resource ctor
     * @param prefix
     * @param target
     * @returns
     */
    mount(prefix: string, target?: any) {
        const router = new Router(prefix, { webRoot: this.webRoot });
        if (target) {
            if (target.__router_meta__) {
                (target.__router_meta__ as RouterMeta).setup(target, router);
            } else if (target.prototype.__router_meta__) {
                (target.prototype.__router_meta__ as RouterMeta).setup(new target(), router);
            } else {
                throw new Error('Unsupported router resource: ' + target);
            }
        }
        this.routes.push(router);
        return router;
    }

    use(middleware: Middleware) {
        this.filters.push(middleware);
    }

    serve(pattern: string, target: string, opts: send.SendOptions = {}) {
        if (!opts.root) opts.root = this.webRoot;
        this.routes.push(new ServeRoute(pattern, resolvePath(this.webRoot, target), opts));
    }

    redirect(method: string | null | undefined, pattern: string, target: string, alt?: string) {
        this.route(method, pattern, (ctx) => {
            ctx.redirect(target, alt);
            return Promise.resolve();
        });
    }

    get(pattern: string, target: RouteTarget) {
        this.route('GET', pattern, target);
    }
    head(pattern: string, target: RouteTarget) {
        this.route('HED', pattern, target);
    }
    options(pattern: string, target: RouteTarget) {
        this.route('OPTIONS', pattern, target);
    }
    put(pattern: string, target: RouteTarget) {
        this.route('PUT', pattern, target);
    }
    post(pattern: string, target: RouteTarget) {
        this.route('POST', pattern, target);
    }
    delete(pattern: string, target: RouteTarget) {
        this.route('DELETE', pattern, target);
    }
    patch(pattern: string, target: RouteTarget) {
        this.route('PATCH', pattern, target);
    }
    trace(pattern: string, target: RouteTarget) {
        this.route('TRACE', pattern, target);
    }
}
