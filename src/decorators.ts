import { RouterSetup } from ".";
import { Router } from "./router";


function getOrCreateSetupChain(target: any): RouterSetup[] {
    let setupChain = target.__setup;
    if (!setupChain) {
        target.__setup = setupChain = [];
    }
    return setupChain;
}


export function mount(path: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateSetupChain(target).push((resource: any, router: Router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    }
}

export function serve(path: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateSetupChain(target).push((resource: any, router: Router) => {
            const value = resource[propertyKey];
            router.serve(path, isGetter ? value : value());
        });
    }
}

export function use(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    getOrCreateSetupChain(target).push((resource: any, router: Router) => {
        router.use(resource[propertyKey].bind(resource));
    });
}

export function guard(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
    getOrCreateSetupChain(target).push((resource: any, router: Router) => {
        router.withGuard(resource[propertyKey].bind(resource));
    });
}

function _route(method: string, path: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        getOrCreateSetupChain(target).push((resource: any, router: Router) => {
            router.route(method, path, resource[propertyKey], resource);
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
