import { Context, Middleware, Next } from "koa";
import send from 'koa-send';
import { ErrorHandlerOpts } from './error';
import { PrefixMatcher } from './path-matchers';
declare module 'koa' {
    interface BaseContext {
        $router: RouterContext;
    }
}
export declare type RouteTarget = (ctx: Context) => Promise<any>;
export declare type RouterGuard = (ctx: Context) => boolean;
export interface Route {
    match(ctx: Context, path: string): boolean;
    dispatch(ctx: Context): Promise<any>;
}
export declare class RouterContext {
    params: any;
    path: string;
    constructor(ctx: Context);
    update(params?: object): void;
}
export declare type RouterSetup = (resource: any, router: Router) => void;
export declare class RouterMeta {
    setupChain: RouterSetup[];
    webRoot?: string;
    errorhandlerOpts?: ErrorHandlerOpts;
    constructor(webRoot?: string);
    setup(resource: any, router: Router): void;
}
declare type RouterOpts = {
    webRoot?: string;
    errorHandlers?: ErrorHandlerOpts;
};
export declare class Router implements Route {
    prefix: string;
    prefixMatcher: PrefixMatcher;
    guard?: RouterGuard;
    routes: Route[];
    filters: Middleware[];
    filtersFn?: Middleware;
    webRoot: string;
    errorHandlerOpts?: ErrorHandlerOpts;
    constructor(prefix?: string, opts?: RouterOpts);
    match(ctx: Context, path: string): boolean;
    notFound(ctx: Context): void;
    _dispatch(ctx: Context): Promise<any>;
    dispatch(ctx: Context): Promise<any>;
    middleware(): (ctx: Context, next: Next) => Promise<any>;
    onError(ctx: Context, err: any): void;
    withGuard(guard: RouterGuard): Router;
    withErrorHandler(errorHandlerOpts: ErrorHandlerOpts): Router;
    withWebRoot(webRoot: string): Router;
    route(method: string | null | undefined, path: string, target: RouteTarget): void;
    routeAll(path: string, target: RouteTarget): void;
    /**
     * The target can be a resource instance or resource ctor
     * @param prefix
     * @param target
     * @returns
     */
    mount(prefix: string, target?: any): Router;
    use(middleware: Middleware): void;
    serve(pattern: string, target: string, opts?: send.SendOptions): void;
    redirect(method: string | null | undefined, pattern: string, target: string, alt?: string): void;
    get(pattern: string, target: RouteTarget): void;
    head(pattern: string, target: RouteTarget): void;
    options(pattern: string, target: RouteTarget): void;
    put(pattern: string, target: RouteTarget): void;
    post(pattern: string, target: RouteTarget): void;
    delete(pattern: string, target: RouteTarget): void;
    patch(pattern: string, target: RouteTarget): void;
    trace(pattern: string, target: RouteTarget): void;
}
export {};
//# sourceMappingURL=router.d.ts.map