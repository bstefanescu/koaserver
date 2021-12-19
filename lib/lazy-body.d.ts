import readRawBody from 'raw-body';
import inflate from 'inflation';
import formidable from 'formidable';
import Koa, { Context } from 'koa';
export interface OwnOpts {
    formidable?: formidable.Options;
    inflate?: inflate.Options;
    form?: (data: string) => any;
    json?: (data: string) => any;
    xml?: (data: string) => any;
}
export declare type LazyBodyOpts = readRawBody.Options & OwnOpts;
/**
 * Request body class
 * json
 *
 */
export declare class LazyBody {
    ctx: Context;
    type: FormType;
    data: any;
    raw: string;
    files: formidable.Files | null | undefined;
    constructor(ctx: Context, type: FormType, data: any, raw: string, files: formidable.Files | null | undefined);
    assertJSON(statusCode: number, message: string): void;
    assertXML(statusCode: number, message: string): void;
    /**
     * Assert body type is urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertForm(statusCode: number, message: string): void;
    assertMultipart(statusCode: number, message: string): void;
    assertText(statusCode: number, message: string): void;
    /**
     * Assert that body type is either multipart or urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertParams(statusCode: number, message: string): void;
    get text(): string;
    get json(): any;
    get xml(): any;
    get params(): any;
    get isForm(): boolean;
    get isJSON(): boolean;
    get isXML(): boolean;
    get isMultipart(): boolean;
    get isText(): boolean;
    static install(koa: Koa, opts?: LazyBodyOpts): void;
}
declare enum FormType {
    'multipart' = 0,
    'form' = 1,
    'json' = 2,
    'xml' = 3,
    'text' = 4
}
export {};
//# sourceMappingURL=lazy-body.d.ts.map