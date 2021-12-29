


function getOrCreateSetup(ctor) {
    let $setup = ctor.prototype.$setup;
    if (!$setup) {
        $setup = function (instance, router) {
            if (this.__proto__.$setup) this.__proto__.$setup(instance, router);
            for (setup of $setup.chain) {
                setup(instance, router);
            }
        }
        $setup.chain = [];
        ctor.prototype.$setup = $setup;
    }
    return $setup;
}


function rsetup(ctor, inst, router) {
    proto = Object.getPrototypeOf(ctor);
    if (proto && proto !== Base) {
        rsetup(proto, inst, router);
    }
    console.log('$$apply ctor setup', ctor);
}

class Base {
    setup(router) {
        rsetup(this.constructor, this, router);
    }
}

class Res1 extends Base {

}
getOrCreateSetup(Res1).chain.push((inst, router) => {
    console.log('setup from Res1');
});

class Res2 extends Res1 {

}
getOrCreateSetup(Res2).chain.push((inst, router) => {
    console.log('setup from Res2');
});

new Res2().setup('router');



console.log('+++++++', Res2.prototype.constructor === Res2);
console.log('+++++++', Res2.prototype);
console.log('+++++++', Res2);

var r = new Res2();
var p = r.constructor; //Res2;
while (p) {
    console.log('>>', p, p.name);
    p = p.__proto__;
}
console.log('&&', p)

var rr = r.constructor;
while (rr) {
    console.log('##', rr);
    rr = rr.__proto__;
}


function $ctorSetup(instance, router) {
    console.log('>> ENtER ctor', this);
    // const proto = Object.getPrototypeOf(this);
    // if (proto && proto !== Base && proto.$setup) {
    //     proto.$setup(instance, router);
    // }
    // console.log('Apply ctor setup chain of ', this);
}
Res2.$setup = $ctorSetup;
Res1.$setup = $ctorSetup;

const res2 = new Res2();
res2.setup();