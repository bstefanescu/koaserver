"use strict";
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
        const onSigExit = async () => {
            await this.stop();
            process.exit(0);
        };
        process.on('SIGINT', onSigExit);
        process.on('SIGTERM', onSigExit);
    }
    onServerListening() {
        this.server.address();
    }
    async start(port, opts = {}) {
        await this.setup();
        // add routes
        this.koa.use(this.middleware());
        // install exit hooks
        if (this.onStart) {
            await this.onStart();
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
    }
    stop() {
        return new Promise(resolve => {
            if (this.server) {
                this.server.close(async () => {
                    if (this.onStop) {
                        await this.onStop();
                    }
                    this.server = undefined;
                });
                resolve(null);
            }
        });
    }
}
exports.default = KoaServer;
//# sourceMappingURL=koa-server.js.map