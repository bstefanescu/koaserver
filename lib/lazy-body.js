"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LazyBody = void 0;
const raw_body_1 = __importDefault(require("raw-body"));
const inflation_1 = __importDefault(require("inflation"));
const qs_1 = __importDefault(require("qs"));
const formidable_1 = __importDefault(require("formidable"));
function parseMultipartBody(koaRequest, opts) {
    const form = (0, formidable_1.default)(opts.formidable);
    return new Promise((resolve, reject) => {
        form.parse(koaRequest.req, (err, fields, files) => {
            if (err) {
                reject(err);
            }
            else {
                resolve({
                    params: fields,
                    files: files
                });
            }
        });
    });
}
function getRawBodyText(koaRequest, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const len = koaRequest.length;
        let encoding = koaRequest.headers['content-encoding'];
        if (len && !encoding) {
            opts.length = len;
        }
        // TODO how to detect custom encoding on content type to ser encoding for readRawBody
        return (yield (0, raw_body_1.default)((0, inflation_1.default)(koaRequest.req, opts.inflate), opts)).toString( /*which charset?*/);
    });
}
/**
 * Request body class
 * json
 *
 */
class LazyBody {
    constructor(ctx, type, data, raw, files) {
        this.ctx = ctx;
        this.type = type;
        this.data = data;
        this.raw = raw;
        this.files = files;
    }
    assertJSON(statusCode, message) {
        if (this.type !== FormType.json) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    assertXML(statusCode, message) {
        if (this.type !== FormType.xml) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    /**
     * Assert body type is urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertForm(statusCode, message) {
        if (this.type !== FormType.form) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    assertMultipart(statusCode, message) {
        if (this.type !== FormType.multipart) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    assertText(statusCode, message) {
        if (this.type !== FormType.text) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    /**
     * Assert that body type is either multipart or urlencoded
     * @param {*} statusCode
     * @param {*} message
     */
    assertParams(statusCode, message) {
        if (this.type !== FormType.form && this.type !== FormType.multipart) {
            this.ctx.throw(statusCode || 415, message);
        }
    }
    get text() {
        return this.raw;
    }
    get json() {
        return this.isJSON ? this.data : undefined;
    }
    get xml() {
        return this.isXML ? this.data : undefined;
    }
    get params() {
        switch (this.type) {
            case FormType.form:
            case FormType.multipart:
                return this.data;
            default: return undefined;
        }
    }
    get isForm() {
        return this.type === FormType.form;
    }
    get isJSON() {
        return this.type === FormType.json;
    }
    get isXML() {
        return this.type === FormType.xml;
    }
    get isMultipart() {
        return this.type === FormType.multipart;
    }
    get isText() {
        return this.type === FormType.text;
    }
    static install(koa, opts = {}) {
        opts.encoding = opts.encoding || 'utf8';
        opts.limit = opts.limit || '1mb';
        Object.defineProperty(koa.request, 'body', {
            get() {
                if (!this._body) {
                    this._body = createBody(this, opts);
                }
                return this._body;
            },
            // be able to work along code using koa2-formidable (wich sets the body property pf the request)
            set(body) {
                this._body = body;
            }
        });
    }
}
exports.LazyBody = LazyBody;
var FormType;
(function (FormType) {
    FormType[FormType["multipart"] = 0] = "multipart";
    FormType[FormType["form"] = 1] = "form";
    FormType[FormType["json"] = 2] = "json";
    FormType[FormType["xml"] = 3] = "xml";
    FormType[FormType["text"] = 4] = "text";
})(FormType || (FormType = {}));
function createBody(koaRequest, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        let type, data, raw, files = null;
        if (koaRequest.is('multipart')) {
            raw = '';
            const result = yield parseMultipartBody(koaRequest, opts);
            data = result.params || {};
            files = result.files || {};
            type = FormType.multipart;
        }
        else if (koaRequest.is('urlencoded')) {
            // by default we use qs. You can replace the querystring parser using opts.form
            raw = yield getRawBodyText(koaRequest, opts);
            data = opts.form ? opts.form(raw) : qs_1.default.parse(raw);
            type = FormType.form;
        }
        else if (koaRequest.is('json', '+json')) {
            // by default we use JSON.parse. You can replace the json parser using opts.json
            raw = yield getRawBodyText(koaRequest, opts);
            data = opts.json ? opts.json(raw) : JSON.parse(raw);
            type = FormType.json;
        }
        else if (koaRequest.is('xml', '+xml')) {
            // by default fast-xml-parser is used - to change the parser you should provde an xml parser through opts.xml
            raw = yield getRawBodyText(koaRequest, opts);
            data = opts.xml ? opts.xml(raw) : require('fast-xml-parser').parse(raw);
            type = FormType.xml;
        }
        else if (koaRequest.is('text/*')) {
            raw = yield getRawBodyText(koaRequest, opts);
            type = FormType.text;
        }
        else {
            koaRequest.ctx.throw(500, 'Attempting to read text body from an usupported request content type: ' + koaRequest.headers['content-type']);
            throw '';
        }
        return new LazyBody(koaRequest.ctx, type, data, raw, files);
    });
}
//# sourceMappingURL=lazy-body.js.map