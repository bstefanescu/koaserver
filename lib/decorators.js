"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trace = exports.patch = exports.head = exports.options = exports.del = exports.put = exports.post = exports.get = exports.route = exports.serve = exports.path = exports.mount = exports.resource = void 0;
const router_1 = require("./router");
function getOrCreateMeta(target) {
    let meta = target.__router_meta__;
    if (!meta) {
        target.__router_meta__ = meta = new router_1.RouterMeta();
    }
    return meta;
}
function resource(opts = {}) {
    return (ctor) => {
        const meta = getOrCreateMeta(ctor.prototype);
        meta.webRoot = opts.webRoot;
        meta.errorhandlerOpts = opts.errorHandlers;
    };
}
exports.resource = resource;
function mount(path) {
    return (target, propertyKey, descriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateMeta(target).setupChain.push((resource, router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    };
}
exports.mount = mount;
exports.path = mount;
function serve(path) {
    return (target, propertyKey, descriptor) => {
        const isGetter = !!descriptor.get;
        getOrCreateMeta(target).setupChain.push((resource, router) => {
            const value = resource[propertyKey];
            router.mount(path, isGetter ? value : value());
        });
    };
}
exports.serve = serve;
function _route(method, path) {
    return (target, propertyKey, descriptor) => {
        //TODO wrap with promise to be sur a promise is returned?
        getOrCreateMeta(target).setupChain.push((resource, router) => {
            router.route(method, path, resource[propertyKey].bind(resource));
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