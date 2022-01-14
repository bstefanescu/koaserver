import http from 'http';
import Koa from 'koa';
import { LazyBody, LazyBodyOpts } from './lazy-body';
import { Router } from "./router";

export default class KoaServer extends Router {

    server?: http.Server;
    koa: Koa;

    constructor(koa: Koa = new Koa()) {
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

    withLazyBody(opts?: LazyBodyOpts): KoaServer {
        LazyBody.install(this.koa, opts);
        return this;
    }

    callback() {
        return this.koa.callback();
    }

    createServer() {
        return http.createServer(this.callback());
    }

    installExitHooks() {
        const onSigExit = async () => {
            await this.stop();
            process.exit(0);
        }
        process.on('SIGINT', onSigExit);
        process.on('SIGTERM', onSigExit);
    }

    onServerListening() {
        // do nothing: you can print a server started message
    }

    async start(port: number, opts: {
        host?: string,
        backlog?: number,
        callback?: () => void
    } = {}) {
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
