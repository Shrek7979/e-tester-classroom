/* e-Tester: browser and Node share the same experiment engine. */
(function (root) {
  'use strict';
  function shuffle(n, random = Math.random) {
    const a = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const fixed = a => a.reduce((s, x, i) => s + (x === i + 1 ? 1 : 0), 0);
  function probability(n) {
    let term = 1, sum = 1;
    for (let k = 1; k <= n; k++) { term *= -1 / k; sum += term; }
    return sum;
  }
  function factorial(n) { let v = 1; for (let k = 2; k <= n; k++) v *= k; return v; }
  function permutations(n) {
    const result = [];
    const visit = (prefix, rest) => {
      if (!rest.length) { result.push(prefix); return; }
      rest.forEach((x, i) => visit([...prefix, x], rest.filter((_, j) => i !== j)));
    };
    visit([], Array.from({ length: n }, (_, i) => i + 1));
    return result;
  }
  function wilson(success, total) {
    if (!total) return null;
    const p = success / total, z2 = 1.96 ** 2, den = 1 + z2 / total;
    const mid = (p + z2 / (2 * total)) / den;
    const half = 1.96 * Math.sqrt(p * (1 - p) / total + z2 / (4 * total ** 2)) / den;
    return [Math.max(0, mid - half), Math.min(1, mid + half)];
  }
  const api = { shuffle, fixed, probability, factorial, permutations, wilson };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
