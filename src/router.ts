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
    dispatch(ctx: Context): Promise<unknown>;
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
    thisArg: any;

    constructor(method: string | null | undefined, matcher: PathMatcher, target: RouteTarget, thisArg?: any) {
        this.method = method ? method.toUpperCase() : null;
        this.matcher = matcher;
        this.target = target;
        this.thisArg = thisArg;
    }

    match(ctx: Context, path: string): boolean {
        if (this.method && this.method !== ctx.method) {
            return false;
        }
        const match = this.matcher(path);
        if (match === true) {
            return true;
        } else if (match) {
            ctx.$router.update(match.params);
            return true;
        } else {
            return false;
        }
    }

    dispatch(ctx: Context) {
        try {
            return Promise.resolve(this.target.call(this.thisArg, ctx));
        } catch (err) {
            return Promise.reject(err);
        }
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
        let path = ctx.$router.path || '/'; // trailing path
        if (path === '/') { // exact match
            path = this.target; // rewrite exact path
        } else {
            path = this.target + path;
        }
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

    async _dispatch(ctx: Context): Promise<unknown> {
        if (this.guard) {
            if (!await this.guard(ctx)) {
                ctx.throw(401);
            }
        }
        const path = ctx.$router.path;
        for (const route of this.routes) {
            if (route.match(ctx, path)) {
                return await route.dispatch(ctx);
            }
        }
        return await this.notFound(ctx);
    }

    async dispatch(ctx: Context): Promise<unknown> {
        try {
            if (this.filters.length > 0) {
                // lazy build filters since we can add filter after registering the router
                if (!this.filtersFn) {
                    this.filtersFn = compose(this.filters);
                }
                return await this.filtersFn(ctx, () => {
                    try {
                        return Promise.resolve(this._dispatch(ctx));
                    } catch (err) {
                        return Promise.reject(err);
                    }
                });
            } else {
                return await this._dispatch(ctx);
            }
        } catch (err) {
            return await this.onError(ctx, err);
        }
    }


    middleware() {
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
        return errorHandler(ctx, err, { htmlRoot: joinPath(this.webRoot, '/errors'), ...this.errorHandlerOpts });
    }

    withGuard(guard: RouterGuard) {
        this.guard = guard;
        return this;
    }

    withErrorHandler(errorHandlerOpts: ErrorHandlerOpts) {
        this.errorHandlerOpts = errorHandlerOpts;
        return this;
    }

    withWebRoot(webRoot: string) {
        this.webRoot = webRoot;
        return this;
    }

    route(method: string | null | undefined, path: string, target: RouteTarget, thisArg?: any) {
        const matcher = path && path !== '/' ? createPathMatcher(path) : (path: string) => !path || path === '/';
        this.routes.push(new EndpointRoute(method, matcher, target, thisArg));
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
        // inherit error handling from parent router
        this.errorHandlerOpts && router.withErrorHandler(this.errorHandlerOpts);
        if (target) {
            if (target instanceof Resource) {
                target.setup(router);
            } else if (target.prototype instanceof Resource) {
                const resource = new target();
                resource.setup(router);
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

    get(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('GET', pattern, target, thisArg);
    }
    head(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('HED', pattern, target, thisArg);
    }
    options(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('OPTIONS', pattern, target, thisArg);
    }
    put(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('PUT', pattern, target, thisArg);
    }
    post(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('POST', pattern, target, thisArg);
    }
    delete(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('DELETE', pattern, target, thisArg);
    }
    patch(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('PATCH', pattern, target, thisArg);
    }
    trace(pattern: string, target: RouteTarget, thisArg?: any) {
        this.route('TRACE', pattern, target, thisArg);
    }
}

export type RouterSetup = (resource: any, router: Router) => void;
export abstract class Resource {
    /**
     * Setup the router coresponding to this resource.
     * When overwriting you must always call `super.setup(router);` otherwise
     * the decortators will not be applied to the resource
     * @param router
     */
    setup(router: Router) {
        let ctor = this.constructor as any;
        while (ctor && ctor !== Resource) {
            // setup decorators registered on ctor
            if (Array.isArray(ctor.$routerSetup)) {
                for (const setup of ctor.$routerSetup) {
                    setup(this, router);
                }
            }
            ctor = Object.getPrototypeOf(ctor);
        }
    }
}
