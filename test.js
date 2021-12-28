console.log(1);
(async function () {
  var x = 5; // remove await to see 1,3,2
  console.log(3);
})();
console.log(2);

class B {

}

class A extends B {

}

console.log(A.prototype instanceof B);
console.log(new A() instanceof B);