import { Context } from 'koa';
export declare type ErrorFormatter = (info: ErrorInfo, error: Error | any, opts: ErrorHandlerOpts) => string;
export declare enum ErrorContentType {
    "html" = 0,
    "json" = 1,
    "xml" = 2,
    "text" = 3
}
export interface ErrorInfo {
    status: number;
    statusCode: number;
    expose: boolean;
    ctypes?: ErrorContentType | ErrorContentType[];
    message?: string;
    detail?: string;
    error?: string;
}
export interface ErrorHandlerOpts {
    htmlRoot?: string;
    renderHTML?: (content: string, info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) => string;
    ctypes?: ErrorContentType | ErrorContentType[];
    json?: ErrorFormatter;
    xml?: ErrorFormatter;
    html?: ErrorFormatter;
    text?: ErrorFormatter;
}
/**
 * Allowed options: {
 *  dir,
 *  json,
 *  html,
 *  text,
 *  renderHTML
 * }
 * @param {*} opts
 * @returns
 */
export declare function errorHandler(ctx: Context, err: Error | any, opts?: ErrorHandlerOpts): void;
//# sourceMappingURL=error.d.ts.map