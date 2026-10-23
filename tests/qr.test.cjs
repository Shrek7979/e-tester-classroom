const assert = require('node:assert/strict');
const QR = require('../qr.js');
const url = 'https://shrek7979.github.io/e-tester-classroom/?room=B3FA07';
const m = QR.matrix(url);
assert.equal(m.length, 33, 'a 58-byte URL fits version 4 (33 modules)');
assert.ok(m.every(row => row.length === 33 && row.every(x => x === 0 || x === 1)));
// finder pattern in the top-left corner: 7x7 ring with a 3x3 core
const finder = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]];
for (let r = 0; r < 7; r++) assert.deepEqual(m[r].slice(0, 7), finder[r]);
assert.deepEqual(m[7].slice(0, 8), [0,0,0,0,0,0,0,0], 'separator row');
assert.equal(m[33 - 8][8], 1, 'dark module');
assert.deepEqual(QR.matrix(url), m, 'deterministic');
assert.equal(QR.matrix('A').length, 21);
assert.equal(QR.matrix('x'.repeat(200)).length, 57, 'version 10 for 200 bytes');
assert.throws(() => QR.matrix('x'.repeat(300)));
const svg = QR.svg(url, 200);
assert.match(svg, /^<svg /); assert.match(svg, /fill="#1e3d32"/);
console.log('PASS qr.js: version selection, finder/separator/dark module placement, determinism, svg output');
