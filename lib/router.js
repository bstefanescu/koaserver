"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resource = exports.Router = exports.RouterContext = void 0;
const path_1 = require("path");
const koa_compose_1 = __importDefault(require("koa-compose"));
const koa_send_1 = __importDefault(require("koa-send"));
const error_1 = require("./error");
const path_matchers_1 = require("./path-matchers");
class RouterContext {
    constructor(ctx) {
        this.params = {};
        this.path = (0, path_matchers_1.normalizePath)(ctx.path);
        ctx.$router = this;
    }
    update(params) {
        params && Object.assign(this.params, params);
    }
}
exports.RouterContext = RouterContext;
class EndpointRoute {
    constructor(method, matcher, target, thisArg) {
        this.method = method ? method.toUpperCase() : null;
        this.matcher = matcher;
        this.target = target;
        this.thisArg = thisArg;
    }
    match(ctx, path) {
        if (this.method && this.method !== ctx.method) {
            return false;
        }
        const match = this.matcher(path);
        if (match === true) {
            return true;
        }
        else if (match) {
            ctx.$router.update(match.params);
            return true;
        }
        else {
            return false;
        }
    }
    dispatch(ctx) {
        try {
            return Promise.resolve(this.target.call(this.thisArg, ctx));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}
/**
 * A route which serve static files given a path mapping
 */
class ServeRoute {
    constructor(prefix, target, opts = {}) {
        this.matcher = (0, path_matchers_1.createSimplePrefixMatcher)((0, path_matchers_1.normalizePath)(prefix));
        this.target = target;
        this.opts = opts;
    }
    match(ctx, path) {
        switch (ctx.method) {
            case 'GET':
            case 'HEAD':
                return this.matcher(ctx, path);
            default: return false;
        }
    }
    async dispatch(ctx) {
        let path = ctx.$router.path || '/'; // trailing path
        if (path === '/') { // exact match
            path = this.target; // rewrite exact path
        }
        else {
            path = this.target + path;
        }
        try {
            await (0, koa_send_1.default)(ctx, path.startsWith('/') ? '.' + path : path, this.opts);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                ctx.throw(404, 'File not found: ' + ctx.path);
            }
            else {
                ctx.throw(500, 'Failed to fetch file: ' + ctx.path);
            }
        }
    }
    ;
}
class Router {
    constructor(prefix = '/', opts = {}) {
        this.routes = [];
        this.filters = [];
        this.prefix = prefix;
        this.webRoot = opts.webRoot || process.cwd();
        this.errorHandlerOpts = opts.errorHandlers;
        this.prefixMatcher = (0, path_matchers_1.createPathPrefixMatcher)(prefix);
    }
    match(ctx, path) {
        return this.prefixMatcher(ctx, path);
    }
    notFound(ctx) {
        ctx.throw(404);
    }
    async _dispatch(ctx) {
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
    async dispatch(ctx) {
        try {
            if (this.filters.length > 0) {
                // lazy build filters since we can add filter after registering the router
                if (!this.filtersFn) {
                    this.filtersFn = (0, koa_compose_1.default)(this.filters);
                }
                return await this.filtersFn(ctx, () => {
                    try {
                        return Promise.resolve(this._dispatch(ctx));
                    }
                    catch (err) {
                        return Promise.reject(err);
                    }
                });
            }
            else {
                return await this._dispatch(ctx);
            }
        }
        catch (err) {
            return await this.onError(ctx, err);
        }
    }
    middleware() {
        return (ctx, next) => {
            const $router = ctx.$router = new RouterContext(ctx);
            if (this.match(ctx, $router.path)) {
                // we never call next since the router is an endpoint
                return this.dispatch(ctx);
            }
            else {
                return next();
            }
        };
    }
    onError(ctx, err) {
        return (0, error_1.errorHandler)(ctx, err, { htmlRoot: (0, path_1.join)(this.webRoot, '/errors'), ...this.errorHandlerOpts });
    }
    withGuard(guard) {
        this.guard = guard;
        return this;
    }
    withErrorHandler(errorHandlerOpts) {
        this.errorHandlerOpts = errorHandlerOpts;
        return this;
    }
    withWebRoot(webRoot) {
        this.webRoot = webRoot;
        return this;
    }
    route(method, path, target, thisArg) {
        const matcher = path && path !== '/' ? (0, path_matchers_1.createPathMatcher)(path) : (path) => !path || path === '/';
        this.routes.push(new EndpointRoute(method, matcher, target, thisArg));
    }
    routeAll(path, target) {
        this.route(null, path, target);
    }
    /**
     * The target can be a resource instance or resource ctor
     * @param prefix
     * @param target
     * @returns
     */
    mount(prefix, target) {
        const router = new Router(prefix, { webRoot: this.webRoot });
        // inherit error handling from parent router
        this.errorHandlerOpts && router.withErrorHandler(this.errorHandlerOpts);
        if (target) {
            if (target instanceof Resource) {
                target.setup(router);
            }
            else if (target.prototype instanceof Resource) {
                const resource = new target();
                resource.setup(router);
            }
            else {
                throw new Error('Unsupported router resource: ' + target);
            }
        }
        this.routes.push(router);
        return router;
    }
    use(middleware) {
        this.filters.push(middleware);
    }
    serve(pattern, target, opts = {}) {
        if (!opts.root)
            opts.root = this.webRoot;
        this.routes.push(new ServeRoute(pattern, (0, path_1.resolve)(this.webRoot, target), opts));
    }
    redirect(method, pattern, target, alt) {
        this.route(method, pattern, (ctx) => {
            ctx.redirect(target, alt);
            return Promise.resolve();
        });
    }
    get(pattern, target, thisArg) {
        this.route('GET', pattern, target, thisArg);
    }
    head(pattern, target, thisArg) {
        this.route('HED', pattern, target, thisArg);
    }
    options(pattern, target, thisArg) {
        this.route('OPTIONS', pattern, target, thisArg);
    }
    put(pattern, target, thisArg) {
        this.route('PUT', pattern, target, thisArg);
    }
    post(pattern, target, thisArg) {
        this.route('POST', pattern, target, thisArg);
    }
    delete(pattern, target, thisArg) {
        this.route('DELETE', pattern, target, thisArg);
    }
    patch(pattern, target, thisArg) {
        this.route('PATCH', pattern, target, thisArg);
    }
    trace(pattern, target, thisArg) {
        this.route('TRACE', pattern, target, thisArg);
    }
}
exports.Router = Router;
class Resource {
    /**
     * Setup the router coresponding to this resource.
     * When overwriting you must always call `super.setup(router);` otherwise
     * the decortators will not be applied to the resource
     * @param router
     */
    setup(router) {
        let ctor = this.constructor;
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
exports.Resource = Resource;
//# sourceMappingURL=router.js.map