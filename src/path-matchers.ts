import { Context } from 'koa';
import { match, MatchFunction } from 'path-to-regexp';

export type SimplePathMatcher = (path: string) => boolean;
export type PathMatcher = SimplePathMatcher | MatchFunction;
export type PrefixMatcher = (ctx: Context, path: string) => boolean;

function decode(val: string): string {
    return val ? decodeURIComponent(val) : val;
}

export function createPathMatcher(pattern: string): PathMatcher {
    pattern = normalizePath(pattern);
    if (pattern.endsWith('/*')) {
        return match(pattern.substring(0, pattern.length - 1) + ':_*', { decode: decode });
    } else if (pattern.endsWith('/+')) {
        return match(pattern.substring(0, pattern.length - 1) + ':_+', { decode: decode });
    } else if (pattern.indexOf(':') < 0 && pattern.indexOf('(') < 0) {
        // static path
        return (path: string) => {
            return path === pattern;
        };
    } else { // a regex pattern
        return match(pattern, { decode: decode });
    }
}

export function createRegexPathMatcher(pattern: string): MatchFunction {
    return match(pattern, { decode: decode });
}

export function createPathPrefixMatcher(prefix: string): PrefixMatcher {
    // normalize prefix
    prefix = normalizePath(prefix);
    if (prefix.indexOf(':') === -1 || prefix.indexOf('(') === -1) {
        return createSimplePrefixMatcher(prefix);
    } else {
        return createRegexpPrefixMatcher(prefix);
    }
}

function createRootPrefixMatcher(): PrefixMatcher {
    return (ctx: Context, path: string) => {
        // the current path is already set nd is not changing
        return true;
    }
}

export function createSimplePrefixMatcher(prefix: string): PrefixMatcher {
    if (prefix === '/') {
        return createRootPrefixMatcher();
    }
    return (ctx: Context, path: string) => {
        if (path.startsWith(prefix)) {
            if (path.length === prefix.length) {
                // exact match
                ctx.$router.path = '/';
                return true;
            } else if (path[prefix.length] === '/') {
                ctx.$router.path = path.substring(prefix.length);
                return true;
            }
        }
        return false;
    }
}

function createRegexpPrefixMatcher(prefix: string): PrefixMatcher {
    const matcher = createRegexPathMatcher(prefix + '/:_*');
    return (ctx: Context, path: string) => {
        const m = matcher(path);
        if (m) {
            ctx.$router.path = '/' + (m.params as any)._.join('/');
            return true;
        }
        return false;
    }
}

/**
 * Add leading / if absent and remove trailing /, /?, /#, ?, #
 *
 * @param prefix
 * @returns
 */
export function normalizePath(prefix: string): string {
    if (!prefix || prefix === '/') return '/';
    // remove trailing /, /?, /#, ?, #
    const last = prefix[prefix.length - 1];
    if (last === '/') {
        prefix = prefix.substring(0, prefix.length - 1);
    } else if (last === '?' || last === '#') {
        if (prefix[prefix.length - 2] === '/') {
            prefix = prefix.substring(0, prefix.length - 2);
        } else {
            prefix = prefix.substring(0, prefix.length - 1);
        }
    }
    // add leading / if absent
    return prefix[0] !== '/' ? '/' + prefix : prefix;
}
