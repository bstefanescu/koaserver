import { KoaServer } from "../src";
import server from './server';

import './server.tests';
import './resource.tests';

before(() => {
    server.start(9098);
});

after(() => {
    server.stop();
});
