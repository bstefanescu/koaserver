/// <reference types="node" />
import http from 'http';
import Koa from 'koa';
import { LazyBodyOpts } from './lazy-body';
import { Router } from "./router";
export default class KoaServer extends Router {
    server?: http.Server;
    koa: Koa;
    constructor(koa?: Koa);
    setup(): void;
    onStart(): void;
    onStop(): void;
    /**
     * To be ble to use supertest directly with a KoaServer instance
    */
    address(): string | import("net").AddressInfo | null | undefined;
    withLazyBody(opts?: LazyBodyOpts): this;
    callback(): (req: http.IncomingMessage | import("http2").Http2ServerRequest, res: http.ServerResponse | import("http2").Http2ServerResponse) => void;
    createServer(): http.Server;
    installExitHooks(): void;
    onServerListening(): void;
    start(port: number, opts?: {
        host?: string;
        backlog?: number;
        callback?: () => void;
    }): Promise<unknown>;
    stop(): Promise<unknown>;
}
//# sourceMappingURL=koa-server.d.ts.map