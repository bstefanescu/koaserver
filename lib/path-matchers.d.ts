import { Context } from 'koa';
import { MatchFunction } from 'path-to-regexp';
export declare type SimplePathMatcher = (path: string) => boolean;
export declare type PathMatcher = SimplePathMatcher | MatchFunction;
export declare type PrefixMatcher = (ctx: Context, path: string) => boolean;
export declare function createPathMatcher(pattern: string): PathMatcher;
export declare function createRegexPathMatcher(pattern: string): MatchFunction;
export declare function createPathPrefixMatcher(prefix: string): PrefixMatcher;
export declare function createSimplePrefixMatcher(prefix: string): PrefixMatcher;
/**
 * Add leading / if absent and remove trailing /, /?, /#, ?, #
 *
 * @param prefix
 * @returns
 */
export declare function normalizePath(prefix: string): string;
//# sourceMappingURL=path-matchers.d.ts.map