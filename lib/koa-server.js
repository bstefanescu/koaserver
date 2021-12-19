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
const http_1 = __importDefault(require("http"));
const koa_1 = __importDefault(require("koa"));
const lazy_body_1 = require("./lazy-body");
const router_1 = require("./router");
class KoaServer extends router_1.Router {
    constructor(koa = new koa_1.default()) {
        super();
        this.koa = koa;
    }
    setup() { }
    onStart() { }
    onStop() { }
    /**
     * To be ble to use supertest directly with a KoaServer instance
    */
    address() {
        return this.server && this.server.address();
    }
    withLazyBody(opts) {
        lazy_body_1.LazyBody.install(this.koa, opts);
        return this;
    }
    callback() {
        return this.koa.callback();
    }
    createServer() {
        return http_1.default.createServer(this.callback());
    }
    installExitHooks() {
        const onSigExit = () => __awaiter(this, void 0, void 0, function* () {
            yield this.stop();
            process.exit(0);
        });
        process.on('SIGINT', onSigExit);
        process.on('SIGTERM', onSigExit);
    }
    onServerListening() {
        this.server.address();
        //console.log(`App listening on port ${port}\nPress Ctrl+C to quit.`);
    }
    start(port, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setup();
            // add routes
            this.koa.use(this.middleware());
            // install exit hooks
            if (this.onStart) {
                yield this.onStart();
            }
            this.installExitHooks();
            // start http server
            return new Promise(resolve => {
                this.server = this.createServer();
                this.server.listen(port, opts.host, opts.backlog, () => {
                    this.onServerListening();
                    opts.callback && opts.callback();
                    resolve(this);
                });
            });
        });
    }
    stop() {
        return new Promise(resolve => {
            if (this.server) {
                this.server.close(() => __awaiter(this, void 0, void 0, function* () {
                    if (this.onStop) {
                        yield this.onStop();
                    }
                    this.server = undefined;
                }));
                resolve(null);
            }
        });
    }
}
exports.default = KoaServer;
//# sourceMappingURL=koa-server.js.map