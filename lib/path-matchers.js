"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePath = exports.createSimplePrefixMatcher = exports.createPathPrefixMatcher = exports.createRegexPathMatcher = exports.createPathMatcher = void 0;
const path_to_regexp_1 = require("path-to-regexp");
function decode(val) {
    return val ? decodeURIComponent(val) : val;
}
function createPathMatcher(pattern) {
    pattern = normalizePath(pattern);
    if (pattern.endsWith('/*')) {
        return (0, path_to_regexp_1.match)(pattern.substring(0, pattern.length - 1) + ':_*', { decode: decode });
    }
    else if (pattern.endsWith('/+')) {
        return (0, path_to_regexp_1.match)(pattern.substring(0, pattern.length - 1) + ':_+', { decode: decode });
    }
    else if (pattern.indexOf(':') < 0 && pattern.indexOf('(') < 0) {
        // static path
        return (path) => {
            return path === pattern;
        };
    }
    else { // a regex pattern
        return (0, path_to_regexp_1.match)(pattern, { decode: decode });
    }
}
exports.createPathMatcher = createPathMatcher;
function createRegexPathMatcher(pattern) {
    return (0, path_to_regexp_1.match)(pattern, { decode: decode });
}
exports.createRegexPathMatcher = createRegexPathMatcher;
function createPathPrefixMatcher(prefix) {
    // normalize prefix
    prefix = normalizePath(prefix);
    if (prefix.indexOf(':') === -1 || prefix.indexOf('(') === -1) {
        return createSimplePrefixMatcher(prefix);
    }
    else {
        return createRegexpPrefixMatcher(prefix);
    }
}
exports.createPathPrefixMatcher = createPathPrefixMatcher;
function createRootPrefixMatcher() {
    return (ctx, path) => {
        // the current path is already set nd is not changing
        return true;
    };
}
function createSimplePrefixMatcher(prefix) {
    if (prefix === '/') {
        return createRootPrefixMatcher();
    }
    return (ctx, path) => {
        if (path.startsWith(prefix) && (path.length === prefix.length || path[prefix.length] === '/')) {
            ctx.$router.path = path.substring(prefix.length) || '/';
            return true;
        }
        return false;
    };
}
exports.createSimplePrefixMatcher = createSimplePrefixMatcher;
function createRegexpPrefixMatcher(prefix) {
    const matcher = createRegexPathMatcher(prefix + '/:_*');
    return (ctx, path) => {
        const m = matcher(path);
        if (m) {
            ctx.$router.path = '/' + m.params._.join('/');
            return true;
        }
        return false;
    };
}
/**
 * Add leading / if absent and remove trailing /, /?, /#, ?, #
 *
 * @param prefix
 * @returns
 */
function normalizePath(prefix) {
    if (!prefix || prefix === '/')
        return '/';
    // remove trailing /, /?, /#, ?, #
    const last = prefix[prefix.length - 1];
    if (last === '/') {
        prefix = prefix.substring(0, prefix.length - 1);
    }
    else if (last === '?' || last === '#') {
        if (prefix[prefix.length - 2] === '/') {
            prefix = prefix.substring(0, prefix.length - 2);
        }
        else {
            prefix = prefix.substring(0, prefix.length - 1);
        }
    }
    // add leading / if absent
    return prefix[0] !== '/' ? '/' + prefix : prefix;
}
exports.normalizePath = normalizePath;
//# sourceMappingURL=path-matchers.js.map