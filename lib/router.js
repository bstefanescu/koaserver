"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = exports.RouterMeta = exports.RouterContext = void 0;
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
    constructor(method, matcher, target) {
        this.method = method ? method.toUpperCase() : null;
        this.matcher = matcher;
        this.target = target;
    }
    match(ctx, path) {
        if (this.method && this.method !== ctx.method) {
            return false;
        }
        const match = this.matcher(path);
        if (match && match !== true) {
            ctx.$router.update(match.params);
            return true;
        }
        else {
            return match;
        }
    }
    dispatch(ctx) {
        return this.target(ctx);
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
    dispatch(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            let path = ctx.$router.path || '.'; // trailing path
            try {
                yield (0, koa_send_1.default)(ctx, path.startsWith('/') ? '.' + path : path, this.opts);
            }
            catch (err) {
                if (err.code === 'ENOENT') {
                    ctx.throw(404, 'File not found: ' + ctx.path);
                }
                else {
                    ctx.throw(500, 'Failed to fetch file: ' + ctx.path);
                }
            }
        });
    }
    ;
}
class RouterMeta {
    constructor(webRoot) {
        this.setupChain = [];
        this.webRoot = webRoot;
    }
    setup(resource, router) {
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
exports.RouterMeta = RouterMeta;
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
    _dispatch(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = ctx.$router.path;
            for (const route of this.routes) {
                if (route.match(ctx, path)) {
                    return route.dispatch(ctx);
                }
            }
            return this.notFound(ctx);
        });
    }
    dispatch(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.guard) {
                    if (!(yield this.guard(ctx))) {
                        ctx.throw(401);
                    }
                }
                if (this.filtersFn) {
                    return yield this.filtersFn(ctx, () => {
                        return this._dispatch(ctx);
                    });
                }
                else {
                    return yield this._dispatch(ctx);
                }
            }
            catch (err) {
                return this.onError(ctx, err);
            }
        });
    }
    middleware() {
        if (this.filters.length > 0) {
            this.filtersFn = (0, koa_compose_1.default)(this.filters);
        }
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
        (0, error_1.errorHandler)(ctx, err, Object.assign({ htmlRoot: (0, path_1.join)(this.webRoot, '/errors') }, this.errorHandlerOpts));
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
    route(method, path, target) {
        const matcher = path && path !== '/' ? (0, path_matchers_1.createPathMatcher)(path) : (path) => !path || path === '/';
        this.routes.push(new EndpointRoute(method, matcher, target));
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
        if (target) {
            if (target.__router_meta__) {
                target.__router_meta__.setup(target, router);
            }
            else if (target.prototype.__router_meta__) {
                target.prototype.__router_meta__.setup(new target(), router);
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
    get(pattern, target) {
        this.route('GET', pattern, target);
    }
    head(pattern, target) {
        this.route('HED', pattern, target);
    }
    options(pattern, target) {
        this.route('OPTIONS', pattern, target);
    }
    put(pattern, target) {
        this.route('PUT', pattern, target);
    }
    post(pattern, target) {
        this.route('POST', pattern, target);
    }
    delete(pattern, target) {
        this.route('DELETE', pattern, target);
    }
    patch(pattern, target) {
        this.route('PATCH', pattern, target);
    }
    trace(pattern, target) {
        this.route('TRACE', pattern, target);
    }
}
exports.Router = Router;
//# sourceMappingURL=router.js.map