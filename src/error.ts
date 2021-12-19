import path from 'path';
import fs from 'fs';
import statuses from 'statuses';
import { Context } from 'koa';

export type ErrorFormatter = (info: ErrorInfo, error: Error | any, opts: ErrorHandlerOpts) => string;

export enum ErrorContentType {
    "html", "json", "xml", "text"
}

export interface ErrorInfo {
    status: number;
    statusCode: number;
    expose: boolean;
    ctypes?: ErrorContentType | ErrorContentType[],
    message?: string,
    detail?: string,
    error?: string,
    //[key: string]: any;
}

export interface ErrorHandlerOpts {
    htmlRoot?: string, // a directory on the file system that contains error files as [statusCode].html
    renderHTML?: (content: string, info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) => string,
    ctypes?: ErrorContentType | ErrorContentType[], // force a content type for the error
    json?: ErrorFormatter, // a json error serializer
    xml?: ErrorFormatter,
    html?: ErrorFormatter,
    text?: ErrorFormatter,
}

function readFile(file: string) {
    try {
        return fs.readFileSync(file).toString();
    } catch (e) {
        return null;
    }
}

function json(info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) {
    let content;
    if (opts.json) {
        content = opts.json(info, error, opts);
    } else {
        content = JSON.stringify({ error: info.error, status: info.status, message: info.message });
    }
    return content;
}

function html(info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) {
    let content;
    if (opts.html) {
        content = opts.html(info, error, opts);
    } else {
        content = readFile(path.resolve(opts.htmlRoot || process.cwd(), info.statusCode + '.html'));
        // use a template engine if needed
        if (content && opts.renderHTML) {
            content = opts.renderHTML(content, info, error, opts);
        }
        if (!content) {
            const title = info.statusCode + ' ' + info.error;
            const message = info.message ? '<p>' + info.message : '';
            content = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style='padding:20px'><h1>${title}</h1>${message}</body></html>`;
        }
    }
    return content;
}

function xml(info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) {
    let content;
    if (opts.xml) {
        content = opts.xml(info, error, opts);
    } else {
        content = '<?xml version="1.0" encoding="UTF-8"?><error status="${info.statusCode}" code="${info.error}">${info.message}</error>';
        return content;
    }
}

function text(info: ErrorInfo, error: Error | object, opts: ErrorHandlerOpts) {
    let content;
    if (opts.text) {
        content = opts.text(info, error, opts);
    } else {
        content = info.statusCode + ' ' + info.error + '\n\n';
        if (info.message) content += info.message + '\n';
    }
    return content;
}

function getContentType(ctx: Context, ctypes?: string | string[]) {
    let type;
    if (typeof ctypes === 'string') ctypes = [ctypes];
    if (ctypes) {
        type = ctx.accepts(ctypes as string[]);
    }
    if (!type) {
        type = ctx.accepts(ErrorContentType[ErrorContentType.html],
            ErrorContentType[ErrorContentType.json],
            ErrorContentType[ErrorContentType.xml],
            ErrorContentType[ErrorContentType.text]
        );
    }
    return type || ErrorContentType.text;
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
export function errorHandler(ctx: Context, err: Error | any, opts: ErrorHandlerOpts = {}) {
    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError =
        Object.prototype.toString.call(err) === '[object Error]' ||
        err instanceof Error;
    if (!isNativeError) err = new Error(`non-error thrown: ${err}`);

    let headerSent = false;
    if (ctx.headerSent || !ctx.writable) {
        headerSent = err.headerSent = true;
    }

    // delegate
    ctx.app.emit('error', err, ctx);

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
        return;
    }

    const { res } = ctx;

    // first unset all headers
    /* istanbul ignore else */
    if (typeof res.getHeaderNames === 'function') {
        res.getHeaderNames().forEach(name => res.removeHeader(name));
    } else {
        (res as any)._headers = {}; // Node < 7.7
    }

    // then set those specified
    err.headers && ctx.set(err.headers);

    // force text/plain
    ctx.type = 'text';

    let statusCode = err.status || err.statusCode;

    // ENOENT support
    if ('ENOENT' === err.code) statusCode = 404;

    // default to 500
    let code = statuses.message[statusCode];
    if (!code) {
        statusCode = 500;
        code = statuses.message[statusCode];
    }

    const info: ErrorInfo = {
        statusCode: statusCode,
        status: statusCode,
        error: code,
        ctypes: opts.ctypes,
        expose: err.expose || false,
    };
    if (err.expose && err.message) info.message = err.message;
    if (err.expose && err.detail) info.detail = err.detail;

    let content;
    switch (getContentType(ctx, err.ctype)) {
        case 'json': {
            ctx.type = 'application/json';
            content = json(info, err, opts);
            break;
        }
        case 'html': {
            ctx.type = 'text/html';
            content = html(info, err, opts);
            break;
        }
        case 'xml': {
            ctx.type = 'text/xml';
            content = xml(info, err, opts);
            break;
        }
        default: { // text
            ctx.type = 'text/plain';
            content = text(info, err, opts);
            break;
        }
    }

    // respond
    ctx.status = statusCode;
    ctx.length = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content!);
    res.end(content);
}
