import mocha from 'mocha';
import assert from 'assert';
import request from 'supertest';
import Koa, { Context } from 'koa';
import { KoaServer } from '../src';

const server = new KoaServer();

server.get('/', async (ctx: Context) => {
    ctx.body = 'hello';
});

before(() => {
    server.start(9098);
});

after(() => {
    server.stop();
})

describe('Test koaserver accept requests', () => {
    it('Accept requests', done => {
        request(server).get('/').expect(200).then(res => {
            assert.equal(res.text, 'hello');
            done();
        })
    });
});

// describe('Test koaserver accept requests error content type', () => {

//     it('Accept */* => GET / => 404 as HTML', done => {
//         request(server).get('/').set('Accept', '*/*').expect(404).then(res => {
//             assert.ok(res.text.startsWith('<!DOCTYPE html>'));
//             done();
//         }).catch(err => done(err));
//     });
//     it('Accept application/json => GET / => 404', done => {
//         request(server).get('/').set('Accept', 'application/json').expect(404).then(res => {
//             assert.strictEqual(res.body.statusCode, 404);
//             done();
//         }).catch(err => done(err));
//     });
//     it('Accept text/htnl => GET / => 404', done => {
//         request(server).get('/').set('Accept', 'text/html').expect(404).then(res => {
//             assert.ok(res.text.startsWith('<!DOCTYPE html>'));
//             done();
//         }).catch(err => done(err));
//     });
//     it('Accept text/plain => GET / => 404', done => {
//         request(server).get('/').set('Accept', 'text/plain').expect(404).then(res => {
//             res.text.startsWith('404 ')
//             done();
//         }).catch(err => done(err));
//     });

//     it('Customize errors using a 404.html file', done => {
//         app.context.onerror = errorHandler({
//             html: __dirname + '/errors'
//         });
//         request(server).get('/').set('Accept', 'text/html').expect(404).then(res => {
//             assert.strictEqual(res.text, '<html><body>Oops!</body></html>');
//             done();
//         }).catch(err => done(err));
//     });

//     it('Customize HTML errors using a function', done => {
//         app.context.onerror = errorHandler({
//             html: (data, error, opts) => '<html><body>' + data.statusCode + '</body></html>'
//         });
//         request(server).get('/').set('Accept', 'text/html').expect(404).then(res => {
//             assert.strictEqual(res.text, '<html><body>404</body></html>');
//             done();
//         }).catch(err => done(err));
//     });

//     it('Customize JSON errors using a function', done => {

//         app.context.onerror = errorHandler({
//             json: (data, error, opts) => {
//                 return { status: data.statusCode }
//             }
//         });

//         request(server).get('/').set('Accept', 'application/json').expect(404).then(res => {
//             assert.strictEqual(res.body.status, 404);
//             done();
//         }).catch(err => done(err));
//     });

// });