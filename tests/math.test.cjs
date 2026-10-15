const assert = require('node:assert/strict');
const M = require('../math.js');
for (let n=2;n<=8;n++) {
  const all=M.permutations(n), successes=all.filter(a=>M.fixed(a)===0).length;
  assert.equal(all.length,M.factorial(n));
  assert.ok(Math.abs(successes/all.length-M.probability(n))<1e-12,`exact enumeration n=${n}`);
}
assert.equal(M.permutations(4).filter(a=>M.fixed(a)===0).length,9);
assert.equal(M.fixed([2,1,4,3]),0);assert.equal(M.fixed([1,2,3,4]),4);
let seed=1729;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(const n of [2,4,9,13]) {
  let success=0;
  for(let t=0;t<100000;t++) {const a=M.shuffle(n,rng);assert.deepEqual([...a].sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i+1));if(M.fixed(a)===0)success++;}
  assert.ok(Math.abs(success/100000-M.probability(n))<.007,`simulation n=${n}`);
}
assert.ok(Math.abs(M.probability(13)-1/Math.E)<1e-10);
assert.equal(M.wilson(0,0),null);
for(const [s,n] of [[0,10],[4,10],[10,10]]){const ci=M.wilson(s,n);assert.ok(ci[0]>=0&&ci[1]<=1&&ci[0]<=s/n&&ci[1]>=s/n);}
console.log('PASS exact enumeration n=2..8, 400000 simulated shuffles, finite n limits, Wilson interval edge cases');
