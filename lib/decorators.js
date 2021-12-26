"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trace = exports.patch = exports.head = exports.options = exports.del = exports.put = exports.post = exports.get = exports.route = exports.guard = exports.use = exports.serve = exports.mount = void 0;
function getOrCreateSetupChain(target) {
    let setupChain = target.__setup;
    if (!setupChain) {
        target.__setup = setupChain = [];
    }
    return setupChain;
}
function mount(path) {
    return (target, propertyKey, descriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateSetupChain(target).push((resource, router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    };
}
exports.mount = mount;
function serve(path) {
    return (target, propertyKey, descriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateSetupChain(target).push((resource, router) => {
            const value = resource[propertyKey];
            router.serve(path, isGetter ? value : value());
        });
    };
}
exports.serve = serve;
function use(target, propertyKey, descriptor) {
    getOrCreateSetupChain(target).push((resource, router) => {
        router.use(resource[propertyKey].bind(resource));
    });
}
exports.use = use;
function guard(target, propertyKey, descriptor) {
    getOrCreateSetupChain(target).push((resource, router) => {
        router.withGuard(resource[propertyKey].bind(resource));
    });
}
exports.guard = guard;
function _route(method, path) {
    return (target, propertyKey, descriptor) => {
        getOrCreateSetupChain(target).push((resource, router) => {
            router.route(method, path, resource[propertyKey], resource);
        });
    };
}
function route(method, path = '/') {
    return _route(method, path);
}
exports.route = route;
function get(path = '/') {
    return _route('GET', path);
}
exports.get = get;
function post(path = '/') {
    return _route('POST', path);
}
exports.post = post;
function put(path = '/') {
    return _route('PUT', path);
}
exports.put = put;
function del(path = '/') {
    return _route('DELETE', path);
}
exports.del = del;
function options(path = '/') {
    return _route('OPTIONS', path);
}
exports.options = options;
function head(path = '/') {
    return _route('HEAD', path);
}
exports.head = head;
function patch(path = '/') {
    return _route('PATCH', path);
}
exports.patch = patch;
function trace(path = '/') {
    return _route('TRACE', path);
}
exports.trace = trace;
//# sourceMappingURL=decorators.js.map