/* map.js — 도트풍 전장 지도 (canvas, 빌드 없음)
 * 80x100 설계 좌표를 GW x GH 격자로 줄여 낮은 해상도 캔버스에 그린 뒤, 정수 배율로 키워 또렷하게 보여 준다.
 * 지도는 거점 위치만 단순화한 도식이다(교과서 지도를 옮긴 것이 아님).
 * 거점 버튼·라벨은 canvas 위에 올린 HTML(overlay)이라 키보드·스크린리더·터치로 쓸 수 있다. */
var MapView = (function () {
  var GW = 100, GH = 125, DW = 80, DH = 100;
  function ux(x) { return x * GW / DW; }
  function uy(y) { return y * GH / DH; }

  /* 위도·경도를 격자로 옮긴 단순화 윤곽 (한반도, 맞닿은 대륙, 제주, 일본 서쪽 끝) */
  function gx(lon) { return 15 + (lon - 124.3) * 10.0; }
  function gy(lat) { return (42.6 - lat) * 12.7; }
  function geo(list) { return list.map(function (p) { return [gx(p[0]), gy(p[1])]; }); }
  var POLY = geo([[124.3,39.9],[125.1,40.2],[125.8,40.8],[126.5,41.2],[127.4,41.5],[128.1,41.4],[129.0,41.8],[130.0,42.5],[130.6,42.4],[129.8,41.2],[129.3,40.6],[128.5,40.1],[127.6,39.7],[127.4,39.2],[128.2,38.6],[128.6,38.2],[129.1,37.5],[129.4,36.9],[129.45,36.0],[129.45,35.4],[129.2,35.1],[128.7,35.0],[128.0,34.75],[127.5,34.65],[126.9,34.4],[126.4,34.3],[126.3,34.75],[126.4,35.4],[126.55,35.95],[126.55,36.5],[126.2,36.8],[126.7,37.1],[126.6,37.5],[126.1,37.8],[125.6,37.7],[125.3,37.9],[124.9,38.1],[125.4,38.6],[125.2,39.0],[124.9,39.5],[124.6,39.7]]);
  var MAIN = geo([[118,43.5],[131.5,43.5],[131.5,42.7],[130.6,42.4],[130.0,42.5],[129.0,41.8],[128.1,41.4],[127.4,41.5],[126.5,41.2],[125.8,40.8],[125.1,40.2],[124.3,39.9],[123.5,39.7],[122.5,39.6],[121.6,38.9],[121.1,39.0],[120.5,40.0],[118,40.0]]);
  var BLOBS = [ // 제주, 일본(규슈 서쪽)
    { x: gx(126.55), y: gy(33.4), r: 3.2 }, { x: gx(131.2), y: gy(33.3), r: 9 }
  ];

  var PAL = {
    k: '#2b2118', w: '#efe3c6', W: '#cdbd97', r: '#8a3a2a', R: '#5d2a22', b: '#4a7896', B: '#2f5068',
    g: '#8a8f98', G: '#5c6168', y: '#e0b84a', e: '#c0392b', n: '#8a5a2b', N: '#5e3d1b', h: '#ffffff',
    s: '#f0c9a0', x: '#dccaa0', X: '#b8a578', f: '#f3f5f9', F: '#c9d0dc', d: '#34642a', t: '#4f8a3a', T: '#74b653',
    l: '#c8b894', m: '#a39274', M: '#7d6e56', K: '#1c1c1c', o: '#c9a46a', p: '#e58aa0', c: '#2f8f7a', u: '#3b5d9c'
  };
  var CAMP = { x: 53, y: 74 };
  var ICON = { dongnae: 'castle', uiryeong: 'tent', hanseong: 'palace', hansando: 'ship', jinju: 'castle', pyeongyang: 'castle', myeongnyang: 'ship' };

  /* ── 작은 그림 만들기 도구: 격자에 사각형·점을 찍고 문자 그림(rows)으로 뽑는다 ── */
  function grid(w, h) {
    var g = []; for (var y = 0; y < h; y++) { g.push([]); for (var x = 0; x < w; x++) g[y].push('.'); }
    return {
      w: w, h: h,
      R: function (x, y, rw, rh, ch) { for (var j = y; j < y + rh; j++) for (var i = x; i < x + rw; i++) if (j >= 0 && j < h && i >= 0 && i < w) g[j][i] = ch; },
      P: function (x, y, ch) { if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = ch; },
      C: function (cx, cy, r, ch) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r) g[j][i] = ch; },
      rows: function () { return g.map(function (r) { return r.join(''); }); }
    };
  }
  function sprites() {
    var S = {}, q;
    // 성(성곽과 문루)
    q = grid(12, 11);
    q.R(0, 4, 12, 7, 'w'); q.R(8, 4, 4, 7, 'W'); q.R(0, 9, 12, 2, 'W');
    [0, 2, 9, 11].forEach(function (i) { q.P(i, 3, 'w'); });
    q.P(1, 6, 'W'); q.P(2, 8, 'W'); q.P(9, 7, 'G'); q.P(10, 5, 'G');
    q.R(3, 0, 6, 1, 'b'); q.R(1, 1, 10, 1, 'B'); q.R(2, 2, 8, 1, 'b'); q.R(3, 3, 6, 1, 'e');
    q.R(4, 6, 4, 5, 'N'); q.R(5, 5, 2, 1, 'N'); q.R(5, 7, 1, 4, 'n');
    S.castle = q.rows();
    // 궁궐(한성) — 경복궁 그림이 img/node_hanseong.png로 오면 그것을 쓴다
    q = grid(12, 12);
    q.R(5, 0, 2, 1, 'y'); q.R(4, 1, 4, 1, 'B'); q.R(3, 2, 6, 1, 'b'); q.R(2, 3, 8, 1, 'B');
    q.R(3, 4, 6, 2, 'e'); q.R(3, 4, 1, 2, 'N'); q.R(8, 4, 1, 2, 'N'); q.R(5, 4, 2, 2, 'N');
    q.R(0, 6, 12, 2, 'b'); q.P(0, 5, 'b'); q.P(11, 5, 'b'); q.R(0, 8, 12, 1, 'B');
    q.R(2, 9, 8, 2, 'e'); q.R(2, 9, 1, 2, 'N'); q.R(9, 9, 1, 2, 'N'); q.R(5, 9, 2, 2, 'N');
    q.R(1, 11, 10, 1, 'g');
    S.palace = q.rows();
    // 진영(천막과 깃발)
    q = grid(12, 11);
    for (var r = 0; r < 8; r++) { var half = 1 + Math.floor(r * 0.7); q.R(5 - half, 3 + r, half * 2 + 1, 1, 'x'); q.R(5, 3 + r, half + 1, 1, 'X'); }
    q.R(4, 8, 3, 3, 'N'); q.R(5, 9, 1, 2, 'k');
    q.R(11, 0, 1, 10, 'n'); q.R(8, 0, 3, 3, 'e'); q.P(8, 2, 'R'); q.P(9, 1, 'h');
    S.tent = q.rows();
    // 배(판옥선)
    q = grid(12, 11);
    q.R(6, 0, 1, 6, 'N'); q.R(7, 1, 4, 3, 'h'); q.R(7, 3, 4, 1, 'e'); q.R(7, 0, 2, 1, 'e');
    q.R(3, 5, 6, 2, 'N'); q.R(2, 4, 8, 1, 'B'); q.P(4, 5, 'y'); q.P(7, 5, 'y');
    q.R(0, 7, 12, 2, 'n'); q.R(1, 9, 10, 1, 'N'); q.R(0, 7, 12, 1, 'o');
    q.R(0, 10, 3, 1, 'h'); q.R(8, 10, 4, 1, 'h');
    S.ship = q.rows();
    // 안개
    q = grid(12, 10);
    q.C(4, 5, 3, 'f'); q.C(8, 4, 3.5, 'f'); q.C(9, 6, 2.5, 'f'); q.C(5, 7, 2.5, 'f'); q.R(2, 6, 9, 2, 'f');
    q.R(1, 7, 11, 2, 'F'); q.R(3, 8, 7, 1, 'F');
    q.R(5, 1, 3, 1, 'y'); q.P(7, 2, 'y'); q.P(6, 3, 'y'); q.P(6, 5, 'y');
    S.fog = q.rows();
    // 화살표(열린 곳 표시)
    S.arrow = ['yyyyyyy', '.yyyyy.', '..yyy..', '...y...'];
    // 나무와 산
    S.tree = ['..TT...', '.TTtt..', 'TTttdd.', 'TtttddT'.slice(0, 7), '.tdddd.', '..ddd..', '...n...', '...n...'].map(function (r) { return r; });
    S.tree = ['.ttt.', 'tTttt', 'ttttd', 'tttdd', '.ddd.', '..n..', '..n..'];
    S.mtn = ['....k....', '...khk...', '..khhdk..', '.kllhddk.', 'kllllgddk', 'klllgggdk', '.kkkkkkk.'];
    S.mtn2 = ['...k...', '..khk..', '.klhdk.', 'kllgddk', '.kkkkk.'];
    S.boat = ['..h....', '.hhh...', 'hhhhh..', '..N....', 'nnnnnn.', '.nNNn..'];
    return S;
  }
  var SPR = sprites();

  /* 인물 위에 겹치는 안 되는 이름 충돌을 피하려고 낱말 풀이용 이름은 쓰지 않는다 */
  function inPoly(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function landKind(x, y) { // 0 바다, 1 한반도·섬, 2 대륙
    if (inPoly(x + .5, y + .5, POLY)) return 1;
    if (inPoly(x + .5, y + .5, MAIN)) return 2;
    for (var i = 0; i < BLOBS.length; i++) {
      var dx = x + .5 - BLOBS[i].x, dy = y + .5 - BLOBS[i].y;
      if (dx * dx + dy * dy <= BLOBS[i].r * BLOBS[i].r) return 1;
    }
    return 0;
  }
  function hash(x, y) { // 정수 32비트 해시(Math.imul로 넘침 없이)
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    h = Math.imul(h, 2246822519); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, sz) {
    var xi = Math.floor(x / sz), yi = Math.floor(y / sz), xf = x / sz - xi, yf = y / sz - yi;
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5; }

  /* 손으로 찍은 거점 그림: img/node_<key>.png (투명 배경). 있으면 코드 그림 대신 쓴다. 너비는 NODE_PNG_W 격자 칸에 맞춘다 */
  var NODE_PNG_W = 14, nodeImgCache = {};
  function nodeImg(key, onLoad) {
    if (typeof NODE_IMAGES === 'undefined' || NODE_IMAGES.indexOf(key) === -1) return null; // 목록에 있는 거점만 시도(없는 파일 요청 방지)
    var src = 'img/node_' + key + '.png', im = nodeImgCache[src];
    if (im === undefined) {
      im = nodeImgCache[src] = new Image();
      im.onload = function () { im.__ok = true; if (onLoad) onLoad(); };
      im.onerror = function () { im.__bad = true; };
      im.src = src;
    }
    return (im && im.__ok && im.naturalWidth > 0) ? im : null;
  }

  var sprCache = {};
  function spriteCanvas(name, outline, ocol) {
    var ck = name + (outline ? 'o' : '') + (ocol || '');
    if (sprCache[ck]) return sprCache[ck];
    var rows = SPR[name], w = rows[0].length, h = rows.length, pad = outline ? 1 : 0;
    var cv = document.createElement('canvas'); cv.width = w + pad * 2; cv.height = h + pad * 2;
    var c = cv.getContext('2d'), x, y;
    function on(xx, yy) { return xx >= 0 && yy >= 0 && yy < h && xx < w && rows[yy].charAt(xx) !== '.'; }
    if (outline) {
      c.fillStyle = ocol || '#2b2118';
      for (y = -1; y <= h; y++) for (x = -1; x <= w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) c.fillRect(x + 1, y + 1, 1, 1);
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var ch = rows[y].charAt(x); if (ch !== '.') { c.fillStyle = PAL[ch]; c.fillRect(x + pad, y + pad, 1, 1); } }
    return (sprCache[ck] = cv);
  }

  /* ── 바탕: 바다 깊이, 풀밭 얼룩, 모래, 강, 길, 산, 숲, 꽃 (한 번만 그린다) ── */
  var baseCv = null, foam = [], sparks = [];
  var NODE_ORDER_ROADS = [['pyeongyang', 'hanseong'], ['hanseong', 'uiryeong'], ['uiryeong', 'jinju'], ['uiryeong', 'dongnae']];
  function lerpHex(a, b, t) {
    function p(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
    var A = p(a), B = p(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function buildBase() {
    var x, y, i, K = new Uint8Array(GW * GH), DL = new Uint8Array(GW * GH), DS = new Uint8Array(GW * GH);
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) K[y * GW + x] = landKind(x, y);
    function kAt(xx, yy) { xx = Math.max(0, Math.min(GW - 1, xx)); yy = Math.max(0, Math.min(GH - 1, yy)); return K[yy * GW + xx]; }
    // 바다·땅까지의 거리(4방향 퍼지기)
    function spread(want) { // want: 거리를 잴 칸의 종류(true=땅, false=바다). 반대쪽에서 출발
      var d = new Uint8Array(GW * GH).fill(255), q = [], qi = 0;
      for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) if ((K[y * GW + x] > 0) !== want) { d[y * GW + x] = 0; q.push(y * GW + x); }
      while (qi < q.length) {
        var cur = q[qi++], cx = cur % GW, cy = (cur / GW) | 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
          var nx = cx + v[0], ny = cy + v[1];
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) return;
          var ni = ny * GW + nx;
          if (d[ni] === 255 && ((K[ni] > 0) === want)) { d[ni] = Math.min(250, d[cur] + 1); q.push(ni); }
        });
      }
      return d;
    }
    DL = spread(true); DS = spread(false);
    baseCv = document.createElement('canvas'); baseCv.width = GW; baseCv.height = GH;
    var c = baseCv.getContext('2d');
    var GRASS = ['#a7d17a', '#96c568', '#85b85d', '#74a852'], DRY = ['#cdc985', '#bfbb77', '#b1ad6a', '#a39f5f'];
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      var k = K[y * GW + x], col, n = vnoise(x, y, 10) * .6 + vnoise(x, y, 4) * .4, bz = bayer(x, y);
      if (k === 0) {
        var ds = DS[y * GW + x];
        if (ds <= 1) col = '#9ee0f0'; else if (ds === 2) col = '#7ccbe6'; else if (ds === 3) col = '#66b6da'; else if (ds === 4) col = '#55a5cf';
        else { var dn = n + bz * .25; col = dn > .62 ? '#4a98c4' : dn > .4 ? '#4190bc' : '#3a86b3'; }
        if (ds >= 3 && ds <= 5 && ((x + y) & 1) === 0 && bz > .2) col = '#5aaad2';
        if (ds <= 1) foam.push([x, y, Math.floor(hash(x, y) * 4)]);
        else if (ds >= 4 && hash(x, y) > .955) sparks.push([x, y, Math.floor(hash(y, x) * 8)]);
      } else {
        var dl = DL[y * GW + x], pal = (k === 2) ? DRY : GRASS, idx = Math.max(0, Math.min(3, Math.floor((n + bz * .22) * 4.2 - .45)));
        if (dl <= 1) col = (k === 2) ? '#e0d29a' : ((n + bz * .2) > .5 ? '#ecdcab' : '#e2d09b');
        else if (dl === 2 && k === 1) col = (bz > 0) ? '#c9d98a' : pal[0];
        else col = pal[idx];
      }
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    var occupied = {};
    function mark(px, py, r) { for (var j = -r; j <= r; j++) for (var i2 = -r; i2 <= r; i2++) occupied[(py + j) + ',' + (px + i2)] = 1; }
    // 강
    function river(pts, wob) {
      var pg = pts.map(function (p) { return [gx(p[0]), gy(p[1])]; });
      for (var s = 1; s < pg.length; s++) {
        var a = pg[s - 1], b = pg[s], len = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
        for (var t = 0; t <= len; t++) {
          var rx = Math.round(a[0] + (b[0] - a[0]) * t / len + Math.sin((t + s * 7) / 3) * wob), ry = Math.round(a[1] + (b[1] - a[1]) * t / len + Math.cos((t + s * 5) / 4) * wob * .6);
          if (kAt(rx, ry) > 0 && DL[ry * GW + rx] > 1) { c.fillStyle = '#5aa9d2'; c.fillRect(rx, ry, 1, 1); if (hash(rx, ry) > .6) { c.fillStyle = '#8fd0ea'; c.fillRect(rx, ry, 1, 1); } mark(rx, ry, 0); }
        }
      }
    }
    river([[124.3, 39.9], [125.1, 40.2], [125.8, 40.8], [126.5, 41.2], [127.4, 41.5], [128.1, 41.4]], 0);
    river([[128.1, 41.4], [129.0, 41.8], [130.0, 42.5], [130.6, 42.4]], 0);
    river([[128.3, 37.5], [127.6, 37.5], [127.0, 37.55], [126.65, 37.6], [126.4, 37.7]], .8);
    river([[129.0, 37.3], [128.85, 36.6], [128.4, 36.0], [128.35, 35.6], [128.7, 35.3], [128.95, 35.1]], .8);
    river([[127.6, 36.0], [127.2, 36.2], [126.7, 36.0]], .6);
    river([[126.6, 39.6], [125.9, 39.2], [125.5, 38.9], [125.3, 38.7]], .6);
    // 길 (거점 사이 흙길)
    NODE_ORDER_ROADS.forEach(function (pr) {
      var a = NODE_POS[pr[0]], b = NODE_POS[pr[1]], ax = ux(a.x), ay = uy(a.y), bx = ux(b.x), by = uy(b.y);
      var mx = (ax + bx) / 2 + (hash(ax | 0, by | 0) - .5) * 14, my = (ay + by) / 2 + (hash(bx | 0, ay | 0) - .5) * 8;
      for (var t = 0; t <= 1; t += 0.01) {
        var px = Math.round((1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx), py = Math.round((1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by);
        if (kAt(px, py) > 0 && DL[py * GW + px] > 1) { c.fillStyle = (t * 100 | 0) % 7 === 0 ? '#c2a96e' : '#d9c68e'; c.fillRect(px, py, 1, 1); mark(px, py, 1); }
      }
    });
    Object.keys(NODE_POS).forEach(function (kk) { mark(Math.round(ux(NODE_POS[kk].x)), Math.round(uy(NODE_POS[kk].y)), 8); });
    // 산줄기
    function ridge(pts, gap) {
      var pg = pts.map(function (p) { return [gx(p[0]), gy(p[1])]; }), acc = 0;
      for (var s = 1; s < pg.length; s++) {
        var a = pg[s - 1], b = pg[s], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var t = acc; t < len; t += gap) {
          var mx = Math.round(a[0] + (b[0] - a[0]) * t / len + (hash(s, t | 0) - .5) * 3), my = Math.round(a[1] + (b[1] - a[1]) * t / len);
          var nm = (hash(mx, my) > .5) ? 'mtn' : 'mtn2', sp = spriteCanvas(nm, false);
          if (kAt(mx, my) === 1 && DL[my * GW + mx] > 3 && !occupied[my + ',' + mx]) { c.drawImage(sp, mx - (sp.width >> 1), my - sp.height + 2); mark(mx, my, 3); }
        }
        acc = ((acc + Math.ceil((len - acc) / gap) * gap) - len);
      }
    }
    ridge([[128.9, 41.0], [128.4, 40.3], [127.9, 39.4], [128.3, 38.5], [128.6, 37.6], [128.9, 36.8], [129.0, 36.0], [128.7, 35.5]], 7);
    ridge([[127.9, 36.3], [127.6, 35.6], [127.0, 35.5]], 8);
    ridge([[126.4, 40.6], [126.9, 40.0], [127.2, 39.5]], 8);
    // 숲 (나무 한 그루씩)
    var trees = [];
    for (y = 2; y < GH - 2; y += 3) for (x = 2; x < GW - 2; x += 3) {
      var jx = x + Math.floor(hash(x, y) * 3), jy = y + Math.floor(hash(y, x) * 3), kk = kAt(jx, jy);
      if (kk === 0 || DL[jy * GW + jx] < 3 || occupied[jy + ',' + jx]) continue;
      var f = vnoise(jx, jy, 13);
      if (f > (kk === 2 ? .62 : .5) && hash(jx + 5, jy + 9) > .3) trees.push([jx, jy]);
    }
    trees.sort(function (a, b) { return a[1] - b[1]; });
    trees.forEach(function (tp) { var sp = spriteCanvas('tree', false); c.drawImage(sp, tp[0] - 2, tp[1] - 6); });
    // 꽃과 풀
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (kAt(x, y) !== 1 || DL[y * GW + x] < 3 || occupied[y + ',' + x]) continue;
      var hv = hash(x * 3 + 1, y * 5 + 2);
      if (hv > .987) { c.fillStyle = ['#fff3a6', '#f6a9c4', '#ffffff'][Math.floor(hash(y, x) * 3)]; c.fillRect(x, y, 1, 1); }
      else if (hv < .02) { c.fillStyle = '#659d47'; c.fillRect(x, y, 1, 2); }
    }
  }

  /* 인물: AVATARS 한 명의 한 프레임(0 서 있음/1 걸음)을 겉선 포함 canvas로 */
  var heroCache = {};
  function heroCanvas(key, frame) {
    var ck = key + frame; if (heroCache[ck]) return heroCache[ck];
    var av = AVATARS.filter(function (a) { return a.key === key; })[0] || AVATARS[0];
    var p = av.pants;
    var legs = frame ? ['...' + p + p + p + p + '...', '...KKKK...'] : ['..' + p + p + '..' + p + p + '..', '..KK..KK..'];
    var rows = av.body.concat(legs), w = rows[0].length, h = rows.length;
    var cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
    var c = cv.getContext('2d'), x, y;
    function on(xx, yy) { return xx >= 0 && yy >= 0 && yy < h && xx < w && rows[yy].charAt(xx) !== '.'; }
    c.fillStyle = '#2b2118';
    for (y = -1; y <= h; y++) for (x = -1; x <= w; x++) {
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) c.fillRect(x + 1, y + 1, 1, 1);
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y].charAt(x); if (ch !== '.') { c.fillStyle = PAL[ch]; c.fillRect(x + 1, y + 1, 1, 1); }
    }
    return (heroCache[ck] = cv);
  }

  /* Gemini 도트 PNG(img/avatar_<key>.png 정면, _walk.png 옆모습). 없으면 위의 코드 도트를 쓴다. */
  var imgCache = {};
  function heroImg(key, walk, onLoad) {
    var src = 'img/avatar_' + key + (walk ? '_walk' : '') + '.png';
    var im = imgCache[src];
    if (!im) {
      im = imgCache[src] = new Image();
      im.onload = function () { if (onLoad) onLoad(); };
      im.src = src;
    }
    return (im.complete && im.naturalWidth > 0) ? im : null;
  }

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* 기본값 유지 */ }

  function create(cfg) {
    if (!baseCv) buildBase();
    var cv = cfg.canvas, ov = cfg.overlay, wrap = cv.parentNode;
    var lo = document.createElement('canvas'); lo.width = GW; lo.height = GH;
    var lc = lo.getContext('2d'), dc = cv.getContext('2d');
    var scale = 4, frame = 0, timer = null;
    var nodeState = {}, badges = {}, route = [], btn = {};
    var tok = { x: ux(CAMP.x), y: uy(CAMP.y), moving: false, dir: 1 }, avatarKey = 'seonbi';
    var mv = {};

    function pos(k) { var p = NODE_POS[k]; return { x: ux(p.x), y: uy(p.y) }; }

    function build() {
      ov.innerHTML = '';
      Object.keys(NODE_POS).forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'node'; b.setAttribute('data-node', k); b.setAttribute('data-side', NODE_POS[k].side || 'bottom');
        b.style.left = (NODE_POS[k].x / DW * 100) + '%'; b.style.top = (NODE_POS[k].y / DH * 100) + '%';
        var lb = document.createElement('span'); lb.className = 'nlabel ' + (NODE_POS[k].side || 'bottom'); lb.textContent = NODE_POS[k].label;
        var bd = document.createElement('span'); bd.className = 'nbadge'; bd.hidden = true;
        b.appendChild(lb); b.appendChild(bd);
        b.addEventListener('click', function () { if (cfg.onNode && nodeState[k] !== 'locked') cfg.onNode(k, nodeState[k]); });
        ov.appendChild(b); btn[k] = b;
      });
      [['일본', 'right:4px;bottom:4px'], ['명', 'left:4px;top:4px']].forEach(function (d) {
        var sp = document.createElement('span');
        sp.className = 'land-label'; sp.textContent = d[0]; sp.style.cssText = d[1];
        ov.appendChild(sp);
      });
      refreshButtons();
    }
    function refreshButtons() {
      Object.keys(btn).forEach(function (k) {
        var st = nodeState[k] || 'locked', b = btn[k], lb = b.querySelector('.nlabel'), bd = b.querySelector('.nbadge');
        b.className = 'node ' + st; b.setAttribute('data-side', NODE_POS[k].side || 'bottom');
        var name = NODE_POS[k].label;
        if (st === 'locked') { lb.textContent = '?'; b.setAttribute('aria-label', '아직 갈 수 없는 곳'); b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1; }
        else {
          lb.textContent = name; b.removeAttribute('aria-disabled'); b.tabIndex = cfg.interactive === false ? -1 : 0;
          b.setAttribute('aria-label', st === 'open' ? name + ' 가 보기' : name + (badges[k] ? ' 내 선택 ' + badges[k] : ''));
        }
        bd.hidden = !badges[k]; bd.textContent = badges[k] || '';
        if (cfg.interactive === false) b.style.pointerEvents = 'none';
      });
    }

    function draw() {
      if (!cv.offsetParent && !cv.getClientRects().length) return;
      lc.drawImage(baseCv, 0, 0);
      var i, p;
      // 바다의 반짝임과 해안 거품
      sparks.forEach(function (w) { if (((frame >> 1) + w[2]) % 8 === 0) { lc.fillStyle = 'rgba(255,255,255,.7)'; lc.fillRect(w[0], w[1], 2, 1); } });
      foam.forEach(function (w) { if ((((frame >> 1) + w[2]) & 3) < 2) { lc.fillStyle = 'rgba(255,255,255,.75)'; lc.fillRect(w[0], w[1], 1, 1); } });
      // 떠다니는 배
      var boatSp = spriteCanvas('boat', true);
      [[12, 62, 5], [88, 48, 6], [78, 100, 4]].forEach(function (bt, bi) {
        var bx = bt[0] + Math.round(Math.sin(frame / 30 + bi * 2) * bt[2]), by = bt[1] + (((frame >> 2) + bi) & 1);
        lc.drawImage(boatSp, bx, by);
      });
      // 지나온 길 (점선)
      lc.fillStyle = '#c0392b';
      for (i = 1; i < route.length; i++) {
        var a = pos(route[i - 1]), b = pos(route[i]), d = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
        for (var t = 0; t <= d; t += 3) { lc.fillRect(Math.round(a.x + (b.x - a.x) * t / d), Math.round(a.y + (b.y - a.y) * t / d), 2, 2); }
      }
      // 거점 (그림자 → 그림 → 표시)
      var pngNodes = [];
      Object.keys(NODE_POS).forEach(function (k) {
        var st = nodeState[k] || 'locked', q = pos(k);
        var spr = (st === 'locked') ? spriteCanvas('fog', true, '#8d97a8') : spriteCanvas(ICON[k], true);
        var png = (st === 'locked') ? null : nodeImg(k, draw);
        if (png) spr = { width: NODE_PNG_W, height: Math.max(8, Math.round(NODE_PNG_W * png.naturalHeight / png.naturalWidth)) };
        var bob = (st === 'locked') ? Math.round(Math.sin(frame / 6 + q.x) * 1) : 0;
        var x = Math.round(q.x - spr.width / 2), y = Math.round(q.y - spr.height / 2) + bob;
        if (st !== 'locked' && ICON[k] !== 'ship') { // 땅 위 그림자
          lc.fillStyle = 'rgba(0,0,0,.22)'; lc.fillRect(x + 1, y + spr.height - 1, spr.width - 2, 2); lc.fillRect(x + 3, y + spr.height + 1, spr.width - 6, 1);
        }
        if (st === 'open') { // 은은한 빛 + 위아래로 움직이는 화살표
          lc.fillStyle = ((frame >> 2) % 2 === 0) ? 'rgba(255,215,90,.55)' : 'rgba(255,215,90,.3)';
          lc.fillRect(x - 2, y - 2, spr.width + 4, 1); lc.fillRect(x - 2, y + spr.height + 1, spr.width + 4, 1);
          lc.fillRect(x - 2, y - 2, 1, spr.height + 4); lc.fillRect(x + spr.width + 1, y - 2, 1, spr.height + 4);
        }
        if (png) pngNodes.push([png, x, y, spr.width, spr.height]); else lc.drawImage(spr, x, y);
        if (st === 'open') {
          var ar = spriteCanvas('arrow', true), ay = y - ar.height - 2 - (((frame >> 1) % 4 < 2) ? 0 : 2);
          lc.drawImage(ar, Math.round(q.x - ar.width / 2), ay);
        }
        if (st === 'done') { // 깃발 꽂기
          lc.fillStyle = '#2b2118'; lc.fillRect(x + spr.width - 2, y - 7, 1, 8);
          lc.fillStyle = '#c0392b'; lc.fillRect(x + spr.width - 1, y - 7, 5, 3); lc.fillStyle = '#7d221a'; lc.fillRect(x + spr.width - 1, y - 5, 5, 1);
        }
      });
      // 말 (PNG가 준비되면 아래 화면 해상도 단계에서 그린다)
      var pngHero = (cfg.token !== false) ? heroImg(avatarKey, tok.moving, draw) : null;
      if (cfg.token !== false && !pngHero) {
        var hero = heroCanvas(avatarKey, tok.moving && (frame % 2) ? 1 : 0);
        var hx = (tok.x + 9 + hero.width / 2 > GW) ? tok.x - 9 - hero.width / 2 : tok.x + 9 - hero.width / 2;
        lc.drawImage(hero, Math.round(hx), Math.round(tok.y - hero.height + 9));
      }
      dc.imageSmoothingEnabled = false;
      dc.drawImage(lo, 0, 0, cv.width, cv.height);
      pngNodes.forEach(function (n) { // 손으로 찍은 거점 그림
        var tw = n[3] * scale, th = n[4] * scale;
        dc.imageSmoothingEnabled = n[0].naturalWidth > tw;
        dc.drawImage(n[0], Math.round(n[1] * scale), Math.round(n[2] * scale), tw, th);
        dc.imageSmoothingEnabled = false;
      });
      if (pngHero) {
        var k = scale / 4, sw = pngHero.naturalWidth * k, sh = pngHero.naturalHeight * k;
        var px = tok.x * scale, py = tok.y * scale;
        var x = px + 9 * scale - sw / 2;
        if (x + sw > cv.width) x = px - 9 * scale - sw / 2;
        var y = py + 9 * scale - sh - (tok.moving && (frame % 2) ? scale : 0);
        dc.imageSmoothingEnabled = (scale % 4 !== 0);
        if (tok.moving && tok.dir < 0) { dc.save(); dc.translate(Math.round(x + sw), Math.round(y)); dc.scale(-1, 1); dc.drawImage(pngHero, 0, 0, sw, sh); dc.restore(); }
        else dc.drawImage(pngHero, Math.round(x), Math.round(y), sw, sh);
        dc.imageSmoothingEnabled = false;
      }
    }

    function loop() { frame++; draw(); }
    function startLoop() { if (!reduced && !timer) timer = setInterval(loop, 125); }

    mv.resize = function () {
      var w = (wrap.parentNode && wrap.parentNode.clientWidth) || 0;
      if (w < GW * 3) w = GW * 3;
      scale = Math.max(3, Math.min(cfg.maxScale || 4, Math.floor(w / GW)));
      cv.width = GW * scale; cv.height = GH * scale;
      cv.style.width = (GW * scale) + 'px'; cv.style.height = (GH * scale) + 'px';
      ov.style.width = cv.style.width; ov.style.height = cv.style.height;
      draw();
    };
    mv.setNodes = function (m) { nodeState = m; refreshButtons(); draw(); };
    mv.setBadges = function (m) { badges = m; refreshButtons(); };
    mv.setRoute = function (r) { route = r.slice(); draw(); };
    mv.placeToken = function (k) { var p = k ? pos(k) : { x: ux(CAMP.x), y: uy(CAMP.y) }; tok.x = p.x; tok.y = p.y; draw(); };
    mv.moveToken = function (k, cb) {
      var to = pos(k), from = { x: tok.x, y: tok.y };
      if (reduced) { tok.x = to.x; tok.y = to.y; draw(); cb(); return; }
      tok.moving = true; tok.dir = to.x >= from.x ? 1 : -1;
      var t0 = Date.now(), dur = 900;
      (function step() {
        var t = Math.min(1, (Date.now() - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        tok.x = from.x + (to.x - from.x) * e; tok.y = from.y + (to.y - from.y) * e;
        if (t < 1) setTimeout(step, 40); else { tok.moving = false; draw(); cb(); }
      })();
    };
    mv.setAvatar = function (k) { avatarKey = k; draw(); };
    mv.destroy = function () { if (timer) clearInterval(timer); timer = null; };

    build();
    mv.resize();
    startLoop();
    return mv;
  }
  return { create: create, heroCanvas: heroCanvas };
})();
