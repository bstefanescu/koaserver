import { Context } from "koa";
import { Resource, get, guard, mount, Router, serve } from "../src";

class UsersApi extends Resource {
    @get()
    getUsersIndex(ctx: Context) {
        ctx.body = 'UsersApi root'
    }
}

export class BaseResource extends Resource {

    @guard
    onAccess(ctx: Context) {
        if (ctx.request.header.authorization === 'none') {
            return false;
        }
        ctx.response.set({ 'on-access': 'BaseResource' });
        return true;
    }

    @mount('/users')
    mountUsers() {
        return UsersApi;
    }

    @mount('/users2')
    get mountUsersProp() {
        return UsersApi;
    }

    @get('/base')
    getHelloFromBase(ctx: Context) {
        ctx.body = 'hello base';
    }

    @get('/overwrite')
    getOverwriteBase(ctx: Context) {
        ctx.body = 'base endpoint';
    }

    @serve('/index.txt')
    getTextIndex() {
        return '/test/index.txt';
    }

    @serve('/static')
    getTextIndex2() {
        return '/test';
    }

    setup(router: Router): void {
        super.setup(router);
        router.mount('/users3', UsersApi);
    }
}

export class ApiRoot extends BaseResource {
    // overwrite access guard
    onAccess(ctx: Context) {
        ctx.response.set({ 'on-access': 'ApiRoot' });
        return true;
    }

    @get('/hello')
    getHelloEndpoint(ctx: Context) {
        ctx.body = 'hello';
    }

    // correct way to overwrite endpoint
    getOverwriteBase(ctx: Context) {
        ctx.body = 'ApiRoot overwrite';
    }

}

export class ApiRootBad extends BaseResource {

    @get()
    getRootEndpoint(ctx: Context) {
        ctx.body = 'ApiRootBad root';
    }

    /**
     * bad way to overwrite the guard.
     * It works but you don't need to define a new guard.
     * You should simply overwrite the method
     */
    @guard
    onAccess2(ctx: Context) {
        ctx.response.set({ 'on-access': 'ApiRootBad' });
        return true;
    }

    /**
     * Bas way to overwrite a base endpoint.
     * Even if it works, you should overwrite the method and not redefine the route
     * @param ctx
     */
    @get('/overwrite')
    getOwnOverwriteBase(ctx: Context) {
        ctx.body = 'ApiRootBad overwrite';
    }

}


export class OtherApi extends BaseResource {

    @get('/')
    getIndex(ctx: Context) {
        ctx.body = 'OtherApi root'
    }

}
