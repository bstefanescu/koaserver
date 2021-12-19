import { ErrorHandlerOpts } from "./error";
import { Router, RouterMeta } from "./router";


function getOrCreateMeta(target: any): RouterMeta {
    let meta = target.__router_meta__;
    if (!meta) {
        target.__router_meta__ = meta = new RouterMeta();
    }
    return meta;
}

export function resource(opts: { webRoot?: string, errorHandlers?: ErrorHandlerOpts } = {}) {
    return (ctor: Function) => {
        const meta = getOrCreateMeta(ctor.prototype);
        meta.webRoot = opts.webRoot;
        meta.errorhandlerOpts = opts.errorHandlers;
    };
}

export function mount(path: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateMeta(target).setupChain.push((resource: any, router: Router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    }
}
// an alias for mount
export { mount as path };

export function serve(path: string) {    //?TODO
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateMeta(target).setupChain.push((resource: any, router: Router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    }
}

function _route(method: string, path: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        //TODO wrap with promise to be sur a promise is returned?
        getOrCreateMeta(target).setupChain.push((resource: any, router: Router) => {
            router.route(method, path, resource[propertyKey].bind(resource));
        });
    }
}

export function route(method: string, path: string = '/') {
    return _route(method, path);
}
export function get(path: string = '/') {
    return _route('GET', path);
}
export function post(path: string = '/') {
    return _route('POST', path);
}
export function put(path: string = '/') {
    return _route('PUT', path);
}
export function del(path: string = '/') {
    return _route('DELETE', path);
}
export function options(path: string = '/') {
    return _route('OPTIONS', path);
}
export function head(path: string = '/') {
    return _route('HEAD', path);
}
export function patch(path: string = '/') {
    return _route('PATCH', path);
}
export function trace(path: string = '/') {
    return _route('TRACE', path);
}
