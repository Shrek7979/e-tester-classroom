/* e-Tester: 외부 의존성 없는 QR 코드 생성기 (바이트 모드, 오류 정정 수준 M, 버전 1~10).
   window.QR.matrix(text) → 0/1 2차원 배열, window.QR.svg(text, size) → SVG 문자열 */
(function (root) {
  'use strict';
  // 버전별 (전체 코드워드, 블록당 EC 코드워드, [블록 수, 블록당 데이터 코드워드] 그룹) — 수준 M
  const SPEC = [null,
    [26, 10, [[1, 16]]], [44, 16, [[1, 28]]], [70, 26, [[1, 44]]], [100, 18, [[2, 32]]], [134, 24, [[2, 43]]],
    [172, 16, [[4, 27]]], [196, 18, [[4, 31]]], [242, 22, [[2, 38], [2, 39]]], [292, 22, [[3, 36], [2, 37]]], [346, 26, [[4, 43], [1, 44]]]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  // GF(256) 산술 (원시다항식 0x11D)
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;
  function generator(n) { let g = [1]; for (let i = 0; i < n; i++) { const next = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= mul(g[j], EXP[i]); } g = next; } return g; }
  function ecBytes(data, n) { const g = generator(n), res = data.concat(new Array(n).fill(0)); for (let i = 0; i < data.length; i++) { const c = res[i]; if (!c) continue; for (let j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], c); } return res.slice(data.length); }

  function utf8(text) { return Array.from(new TextEncoder().encode(text)); }
  function chooseVersion(len) { for (let v = 1; v <= 10; v++) { const [total, ec, groups] = SPEC[v]; const dataCw = groups.reduce((s, [b, d]) => s + b * d, 0); const header = 4 + (v < 10 ? 8 : 16); if (len * 8 + header <= dataCw * 8) return v; } throw Error('QR: 내용이 너무 깁니다'); }

  function codewords(bytes, v) {
    const [, , groups] = SPEC[v], dataCw = groups.reduce((s, [b, d]) => s + b * d, 0);
    const bits = []; const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    push(4, 4); push(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => push(b, 8));
    for (let i = 0; i < 4 && bits.length < dataCw * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let p = 0; data.length < dataCw; p++) data.push(p % 2 ? 0x11 : 0xEC);
    // 블록 분할과 인터리브
    const blocks = [], ecs = []; let off = 0;
    groups.forEach(([count, size]) => { for (let b = 0; b < count; b++) { const block = data.slice(off, off + size); off += size; blocks.push(block); ecs.push(ecBytes(block, SPEC[v][1])); } });
    const out = []; const maxLen = Math.max(...blocks.map(b => b.length));
    for (let i = 0; i < maxLen; i++) blocks.forEach(b => { if (i < b.length) out.push(b[i]); });
    for (let i = 0; i < SPEC[v][1]; i++) ecs.forEach(e => out.push(e[i]));
    return out;
  }

  function bch(value, poly, bits, shift) { let v = value << shift; for (let i = bits - 1; i >= shift; i--) if (v & (1 << i)) v ^= poly << (i - shift); return (value << shift) | v; }

  function matrix(text) {
    const bytes = utf8(text), v = chooseVersion(bytes.length), N = v * 4 + 17;
    const m = Array.from({ length: N }, () => new Array(N).fill(null)); // null = 아직 비어 있음
    const set = (r, c, val) => { if (r >= 0 && r < N && c >= 0 && c < N) m[r][c] = val; };
    const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) { const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); set(r0 + r, c0 + c, on ? 1 : 0); } };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { if (m[6][i] === null) m[6][i] = i % 2 ? 0 : 1; if (m[i][6] === null) m[i][6] = i % 2 ? 0 : 1; }
    const al = ALIGN[v];
    al.forEach(r => al.forEach(c => { if (m[r][c] !== null) return; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, (Math.max(Math.abs(dr), Math.abs(dc)) === 1) ? 0 : 1); }));
    m[N - 8][8] = 1;
    // 형식·버전 정보 자리 예약
    for (let i = 0; i < 8; i++) { if (m[8][i] === null) m[8][i] = 0; if (m[i][8] === null) m[i][8] = 0; if (m[8][N - 1 - i] === null) m[8][N - 1 - i] = 0; if (m[N - 1 - i][8] === null) m[N - 1 - i][8] = 0; }
    m[8][8] = 0;
    if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { m[N - 11 + j][i] = 0; m[i][N - 11 + j] = 0; }
    const reserved = m.map(row => row.map(x => x !== null));
    // 데이터 배치
    const cw = codewords(bytes, v); const bits = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
    let idx = 0, up = true;
    for (let col = N - 1; col > 0; col -= 2) { if (col === 6) col--; for (let k = 0; k < N; k++) { const r = up ? N - 1 - k : k; for (const c of [col, col - 1]) if (!reserved[r][c]) { m[r][c] = idx < bits.length ? bits[idx] : 0; idx++; } } up = !up; }
    // 마스크 선택
    const masks = [(r, c) => (r + c) % 2 === 0, (r, c) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
    const apply = (mask) => m.map((row, r) => row.map((x, c) => reserved[r][c] ? x : (masks[mask](r, c) ? x ^ 1 : x)));
    const writeFormat = (g, mask) => { const f = bch((0 << 3) | mask, 0x537, 15, 10) ^ 0x5412; const bit = i => (f >> i) & 1;
      for (let i = 0; i < 6; i++) g[8][i] = bit(14 - i); g[8][7] = bit(8); g[8][8] = bit(7); g[7][8] = bit(6); for (let i = 0; i < 6; i++) g[5 - i][8] = bit(5 - i);
      for (let i = 0; i < 7; i++) g[N - 1 - i][8] = bit(14 - i); for (let i = 0; i < 8; i++) g[8][N - 8 + i] = bit(7 - i);
      if (v >= 7) { const vi = bch(v, 0x1F25, 18, 12); for (let i = 0; i < 18; i++) { const b = (vi >> i) & 1; g[Math.floor(i / 3)][N - 11 + i % 3] = b; g[N - 11 + i % 3][Math.floor(i / 3)] = b; } } };
    const penalty = (g) => { let p = 0;
      const run = (get) => { for (let a = 0; a < N; a++) { let last = -1, len = 0; for (let b = 0; b < N; b++) { const x = get(a, b); if (x === last) { len++; } else { if (len >= 5) p += len - 2; last = x; len = 1; } } if (len >= 5) p += len - 2; } };
      run((a, b) => g[a][b]); run((a, b) => g[b][a]);
      for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) { const s = g[r][c] + g[r][c + 1] + g[r + 1][c] + g[r + 1][c + 1]; if (s === 0 || s === 4) p += 3; }
      const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
      const check = (get) => { for (let a = 0; a < N; a++) for (let b = 0; b <= N - 11; b++) { let ok1 = true, ok2 = true; for (let k = 0; k < 11; k++) { const x = get(a, b + k); if (x !== pat[k]) ok1 = false; if (x !== pat2[k]) ok2 = false; } if (ok1) p += 40; if (ok2) p += 40; } };
      check((a, b) => g[a][b]); check((a, b) => g[b][a]);
      let dark = 0; g.forEach(row => row.forEach(x => dark += x)); const ratio = dark * 100 / (N * N); p += Math.floor(Math.abs(ratio - 50) / 5) * 10; return p; };
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) { const g = apply(mask); writeFormat(g, mask); const s = penalty(g); if (s < bestScore) { bestScore = s; best = g; } }
    return best;
  }

  function svg(text, size = 240) {
    const m = matrix(text), N = m.length, quiet = 4, cell = size / (N + quiet * 2);
    let path = '';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (m[r][c]) path += `M${((c + quiet) * cell).toFixed(2)} ${((r + quiet) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="초대 링크 QR 코드"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#1e3d32"/></svg>`;
  }

  const api = { matrix, svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QR = api;
})(typeof window !== 'undefined' ? window : globalThis);
