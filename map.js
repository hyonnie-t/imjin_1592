/* map.js — 도트풍 전장 지도 (canvas, 빌드 없음)
 * 80x100 설계 좌표(data.js NODE_POS)를 GW x GH 격자로 줄여 낮은 해상도 캔버스에 그린 뒤, 정수 배율로 키워 또렷하게 보여 준다.
 * 지도는 거점 위치만 단순화한 도식이다(교과서 지도를 옮긴 것이 아님).
 * 거점 버튼·라벨은 canvas 위에 올린 HTML(overlay)이라 키보드·스크린리더·터치로 쓸 수 있다. */
var MapView = (function () {
  var GW = 200, GH = 250, DW = 80, DH = 100; // 격자 한 칸 = 도트 한 개(코드 그림·제미나이 PNG 모두 같은 굵기)
  function ux(x) { return x * GW / DW; }
  function uy(y) { return y * GH / DH; }

  /* 위도·경도를 격자로 옮긴 단순화 윤곽 (한반도, 맞닿은 대륙, 제주, 일본 서쪽 끝) */
  function gx(lon) { return (15 + (lon - 124.3) * 10.0) * 2; }
  function gy(lat) { return (42.6 - lat) * 12.7 * 2; }
  function geo(list) { return list.map(function (p) { return [gx(p[0]), gy(p[1])]; }); }
  var POLY = geo([[124.3,39.9],[125.1,40.2],[125.8,40.8],[126.5,41.2],[127.4,41.5],[128.1,41.4],[129.0,41.8],[130.0,42.5],[130.6,42.4],[129.8,41.2],[129.3,40.6],[128.5,40.1],[127.6,39.7],[127.4,39.2],[128.2,38.6],[128.6,38.2],[129.1,37.5],[129.4,36.9],[129.45,36.0],[129.45,35.4],[129.2,35.1],[128.7,35.0],[128.0,34.75],[127.5,34.65],[126.9,34.4],[126.4,34.3],[126.3,34.75],[126.4,35.4],[126.55,35.95],[126.55,36.5],[126.2,36.8],[126.7,37.1],[126.6,37.5],[126.1,37.8],[125.6,37.7],[125.3,37.9],[124.9,38.1],[125.4,38.6],[125.2,39.0],[124.9,39.5],[124.6,39.7]]);
  var MAIN = geo([[118,43.5],[131.5,43.5],[131.5,42.7],[130.6,42.4],[130.0,42.5],[129.0,41.8],[128.1,41.4],[127.4,41.5],[126.5,41.2],[125.8,40.8],[125.1,40.2],[124.3,39.9],[123.5,39.7],[122.5,39.6],[121.6,38.9],[121.1,39.0],[120.5,40.0],[118,40.0]]);
  var BLOBS = [ // 제주, 일본(규슈 서쪽)
    { x: gx(126.55), y: gy(33.4), r: 8, ry: 5 }, { x: gx(131.2), y: gy(33.3), r: 18 }
  ];

  var PAL = {
    k: '#2b2118', w: '#efe3c6', W: '#cdbd97', r: '#8a3a2a', R: '#5d2a22', b: '#4a7896', B: '#2f5068',
    g: '#8a8f98', G: '#5c6168', y: '#e0b84a', e: '#c0392b', n: '#8a5a2b', N: '#5e3d1b', h: '#ffffff',
    s: '#f0c9a0', x: '#dccaa0', X: '#b8a578', f: '#f3f5f9', F: '#c9d0dc', d: '#34642a', t: '#4f8a3a', T: '#74b653',
    l: '#c8b894', m: '#a39274', M: '#7d6e56', K: '#1c1c1c', o: '#c9a46a', p: '#e58aa0', c: '#2f8f7a', u: '#3b5d9c',
    // 2배 촘촘한 그림용: 기와(1 짙은 회청 2 기와 3 기와 빛), 성돌(4 밝은 돌 5 줄눈 6 그늘 7 돌 빛), 소나무(8 그늘 9 잎 0 잎 빛 Y 끝 빛)
    1: '#343b46', 2: '#4d5764', 3: '#6f7b8a', 4: '#d9cfb6', 5: '#b9ab8c', 6: '#8f8166', 7: '#efe8d6',
    8: '#2c5a2e', 9: '#3f7d3c', 0: '#5ea24e', Y: '#93c06a', a: '#6b4a2b', i: '#f7f9fc', q: '#7d2a20', v: '#a8402e',
    D: '#3a2a1c', E: '#f1e6c8', H: '#cdb88e', I: '#dde3ec', J: '#aeb8c6', L: '#ece0bc', O: '#a98c5a', S: '#fff1b0',
    U: '#b98a1e', C: '#55b39a'
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
  /* 코드로 찍은 그림(지도 격자 한 칸 = 도트 한 개). 겉선은 spriteCanvas가 둘러 준다.
   * castle 성곽(여장·문루·기와지붕), palace 궁궐(PNG가 없을 때), tent 진영(천막·깃발), ship 판옥선(돛·노),
   * fog 안개(아직 갈 수 없는 곳), arrow 열린 곳 표시, tree 소나무, mtn/mtn2 산, boat 떠다니는 배, flag0/1 다녀온 곳 깃발 */
  function sprites() {
    var S = {};
    S.castle = [
      '......11111111111111......',
      '.....2323232323232322.....',
      '.1.23232323232323232322.1.',
      '..1111111111111111111111..',
      '.....ccycccceeccccycc.....',
      '......vqqqvqqqqvqqqv......',
      '77.777vDDDvDDDDvDDDv444.44',
      '7D.7D7vDDDvDDDDvDDDvD44.D4',
      '77777777777777777777444444',
      '5555D5555D555555D555666666',
      '44444444444444444444555555',
      '44544454445777744454666666',
      '67666666767DDDD56666555555',
      '5444544457DDDDDD5444666666',
      '555555555DDNDDNDD555555555',
      '445444544DnNDDNND454666666',
      '666766666DnyDDyND766555555',
      '544454445DnNDDNND444666666',
      '555555555DnNDDNND555555555',
      '445444544DnyDDyND454666666',
      '555555555DnNDDNND555666666',
      '666666666DnNDDNND666666666'
    ];
    S.palace = [
      '........1...yy...1........',
      '........1111111111........',
      '......23232323232322......',
      '...1.3232323232323232.1...',
      '....111111111111111111....',
      '......cccyccccccyccc......',
      '.......vDDDDvvDDDDv.......',
      '.......vDDDDvvDDDDv.......',
      '....111111111111111111....',
      '..2323232323232323232322..',
      '12323232323232323232323221',
      '11111111111111111111111111',
      '...CCCCCCCCCCCCCCCCCCCC...',
      '..ccyccyccyccyccyccycccc..',
      '...vDDDvDDDvDDvDDDvDDDv...',
      '...vooovooovDDvooovooov...',
      '...vqqqvqqqvNNvqqqvqqqv...',
      '...vqqqvqqqvNNvqqqvqqqv...',
      '...vqqqvqqqvNNvqqqvqqqv...',
      '...vDDDvDDDvNNvDDDvDDDv...',
      '.777777777555555777777777.',
      '.445444544666666444544454.',
      '.445444544555555444544454.',
      '.666666666666666666666666.'
    ];
    S.tent = [
      '....................y...',
      '..............eeeeeea...',
      '.............eeeyheea...',
      '............eeeehheea...',
      '..........y..eeeeeeea...',
      '..........a...qqqqqqa...',
      '.........xLx........a...',
      '.........xLx........a...',
      '........xLLxO.......a...',
      '.......xLXLxOO......a...',
      '.......xLXLxOO......a...',
      '......xLXLLxOOO.....a...',
      '.....xLLXLLxxOOO....a...',
      '....xLLXLDDDxxOOO...a...',
      '....xLLXDDNDDxOOO...a...',
      '...xLLLXDDNDDxOOOO..a...',
      '.eyeeyeeDDNDDeyeeyeea...',
      '.qqqqqqqDDNDDqqqqqqqa...',
      '.xLLLLXLDDNDDxxOxOOOa...',
      'xLLLLXLLDDNDDxxxOxOOO...',
      'LLLLLXLXDDNDDOxxOxxOOO..',
      'XXXXXXXOOOOOOOOOOOOOO...'
    ];
    S.ship = [
      '.........yeee...............',
      '....aaaaaaaaaaa..yeee.......',
      '....EEEEEaEEEEE..a..........',
      '....HHHHHaHHHHHE.aaaaaaa....',
      '....EEEEEaEEEEEE.aEEEEEE....',
      '....HHHHHaHHHHHE.aHHHHHH....',
      '....EEEEEaEEEEEE.aEEEEEE....',
      '....HHHHHaHHHHHE.aHHHHHH....',
      '....EEEEEaEEEEEE.aEEEEEE....',
      '.........a..EEEE.aEEEEEE....',
      '.....oooooooooooooooooo.....',
      '.....nDnnDnnDnnDnnDnnDn.....',
      '.....nNnnNnnNnnNnnNnnNn.....',
      'o...eeeeeeeeeeeeeeeeeeee...o',
      'oooooooooooooooooooooooooooo',
      '.nnDnnnDnnnDnnnDnnnDnnnDnnn.',
      '.NNNNNNNNNNNNNNNNNNNNNNNNNN.',
      '.nnnynnynnynnynnynnynnynnnn.',
      '...NNNNNNNNNNNNNNNNNNNNNN...',
      '...a.DDaDDDaDDDaDDDaDDDa....',
      '..a...a...a...a...a...a.....',
      'hhhh.......h....h......hhhhh'
    ];
    S.fog = [
      '........................',
      '........................',
      '...............J........',
      '............JIfIIIJ.....',
      '...........JyyhffIIJ....',
      '........J.JyUUffffIIJ...',
      '.....JfffIIUffUyffIIJ...',
      '....JfhfffIIffUyfIIIJ...',
      '...JfffffffIIUyIIIIfJJ..',
      '...JIfffffIIUyIIIIfffI..',
      '..JJIIfffIIIUyIIIIfffII.',
      '..JIIIIIIIIIIIIIIIIfIIIJ',
      '..IIIIIIIIIIUyIIIIIIIIIJ',
      '.JJIIIIIIIIIIIIIIIIIIIJJ',
      '..JJIIIIIIIIIIIIIJJIJJJ.',
      '..JJJJIJJJJJIJJJJJJJJJ..',
      '...JJJJJJJJJJJJJJ..J....',
      '......J.....J...........',
      '........................',
      '........................'
    ];
    S.arrow = [
      'ySSSSSSSSSSSy',
      '.yyyyyyyyyUU.',
      '..yyyyyyyUU..',
      '...yyyyyUU...',
      '....yyyUU....',
      '.....yyU.....',
      '......y......'
    ];
    S.tree = [
      '....99....',
      '....99....',
      '..Y0099...',
      '...0099...',
      '...99988..',
      '..000988..',
      '.Y0009999.',
      '.90009999.',
      '.90099888.',
      '9Y00099999',
      '9900999999',
      '.888888888',
      '..88aN88..',
      '....aN....',
      '...NaNN...'
    ];
    S.mtn = [
      '........iF........',
      '.......iiFF.......',
      '.......iiFF.......',
      '......iiiFFF......',
      '.....lilimFmm.....',
      '.....llMlmmmm.....',
      '....llllmmmmmm....',
      '...lllMllmmmmmm...',
      '...llllmlmmMMMM...',
      '..llllMllmmMMMMM..',
      '.llllllmlmmMMMMMM.',
      '.llllMlllmmMMMMMM.',
      '.ttttttttdddddddd.'
    ];
    S.mtn2 = [
      '......i......',
      '.....iiF.....',
      '....iiiFF....',
      '...llilmFm...',
      '...llMlmmm...',
      '..llllmMMMM..',
      '.lllMllmMMMM.',
      '.llllmlmMMMM.',
      '.tttttdddddd.'
    ];
    S.boat = [
      '.....e........',
      '.....aE.......',
      '...EEaEE......',
      '..EEEaEEE.....',
      '.EEEEaEEEE....',
      'EEEEEaEEEE....',
      '.HHHHaEHHH....',
      '.....a........',
      'oooooooooooooo',
      '.nnNnnnNnnnNn.',
      '..NNNNNNNNNN..',
      'hh..........hh'
    ];
    S.flag0 = [
      'y........',
      'aeeeeeee.',
      'aeehheeee',
      'aeehheeee',
      'aeeeeeeeq',
      'aqqqqqqq.',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........'
    ];
    S.flag1 = [
      'y........',
      'a...ee..e',
      'aeeeeeeee',
      'aeehheee.',
      'aeehheee.',
      'aeeeeeee.',
      'aqqqqqqq.',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........',
      'a........'
    ];
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
      var dx = (x + .5 - BLOBS[i].x) / BLOBS[i].r, dy = (y + .5 - BLOBS[i].y) / (BLOBS[i].ry || BLOBS[i].r);
      if (dx * dx + dy * dy <= 1) return 1;
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

  /* 손으로 찍은 거점 그림: img/node_<키>.png (투명 배경). NODE_IMAGES에 적힌 거점만 불러와 코드 그림 대신 쓴다.
   * NODE_IMAGES[키] = { w: 지도 몇 칸 너비로 그릴지(기본 28), done: true면 다녀온 뒤 node_<키>_done.png로 바뀐다 } */
  var nodeImgCache = {};
  function nodeImg(key, done, onLoad) {
    var cfgN = (typeof NODE_IMAGES !== 'undefined') ? NODE_IMAGES[key] : null;
    if (!cfgN) return null; // 목록에 있는 거점만 시도(없는 파일 요청 방지)
    var src = 'img/node_' + key + ((done && cfgN.done) ? '_done' : '') + '.png', im = nodeImgCache[src];
    if (im === undefined) {
      im = nodeImgCache[src] = new Image();
      im.onload = function () { im.__ok = true; if (onLoad) onLoad(); };
      im.src = src;
    }
    return (im && im.__ok && im.naturalWidth > 0) ? im : null;
  }

  /* 촘촘한 PNG(제미나이 도트)를 지도 격자(한 칸 = 도트 한 개)에 맞춰 다시 찍는다. 칸마다 가장 많이 쓰인 색 하나만 남기고(어두운 윤곽선은 40% 이상이면 살려서),
   * 코드로 찍은 다른 그림과 같은 굵기의 도트로 만든다. 결과는 지도 격자(GW x GH) 위에 그대로 올린다. */
  var gridCache = {};
  function gridSprite(im, cw, ch) {
    var ck = im.src + '|' + cw + 'x' + ch;
    if (gridCache[ck]) return gridCache[ck];
    var soft = /_done/.test(im.src); // 불탄 그림처럼 어두운 그림은 칸 평균색으로 부드럽게
    var W = im.naturalWidth, H = im.naturalHeight, s = document.createElement('canvas');
    s.width = W; s.height = H;
    var sc = s.getContext('2d'); sc.drawImage(im, 0, 0);
    var d = sc.getImageData(0, 0, W, H).data;
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var c = cv.getContext('2d'), x, y, xx, yy;
    for (y = 0; y < ch; y++) for (x = 0; x < cw; x++) {
      var x0 = Math.floor(x * W / cw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * W / cw));
      var y0 = Math.floor(y * H / ch), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / ch));
      var tot = 0, op = 0, dk = 0, dr = 0, dg = 0, db = 0, cnt = {};
      for (yy = y0; yy < y1; yy++) for (xx = x0; xx < x1; xx++) {
        var i = (yy * W + xx) * 4; tot++;
        if (d[i + 3] < 128) continue;
        op++;
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (r * .3 + g * .59 + b * .11 < 70) { dk++; dr += r; dg += g; db += b; }
        var key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4), e = cnt[key] || (cnt[key] = [0, 0, 0, 0]);
        e[0]++; e[1] += r; e[2] += g; e[3] += b;
      }
      if (op * 2 < tot) continue;
      if (!soft && dk >= op * .4 && dk < op * .85) { c.fillStyle = 'rgb(' + Math.round(dr / dk) + ',' + Math.round(dg / dk) + ',' + Math.round(db / dk) + ')'; }
      else if (soft || dk >= op * .85) { // 거의 다 어두운 칸(불탄 그림 등)은 평균색으로 부드럽게
        var sr = 0, sg = 0, sb = 0, sn = 0; Object.keys(cnt).forEach(function (k) { sn += cnt[k][0]; sr += cnt[k][1]; sg += cnt[k][2]; sb += cnt[k][3]; });
        c.fillStyle = 'rgb(' + Math.round(sr / sn) + ',' + Math.round(sg / sn) + ',' + Math.round(sb / sn) + ')';
      } else {
        var best = null; Object.keys(cnt).forEach(function (k) { if (!best || cnt[k][0] > best[0]) best = cnt[k]; });
        c.fillStyle = 'rgb(' + Math.round(best[1] / best[0]) + ',' + Math.round(best[2] / best[0]) + ',' + Math.round(best[3] / best[0]) + ')';
      }
      c.fillRect(x, y, 1, 1);
    }
    return (gridCache[ck] = cv);
  }
  function heroLeft() { // 가까운 거점의 이름표가 오른쪽이면 말은 왼쪽에 세운다(이름표 가림 방지)
    var best = null, bd = 12;
    Object.keys(NODE_POS).forEach(function (k) { var p = { x: ux(NODE_POS[k].x), y: uy(NODE_POS[k].y) }, d = Math.hypot(p.x - tokRef.x, p.y - tokRef.y); if (d < bd) { bd = d; best = k; } });
    return !!best && NODE_POS[best].side === 'right';
  }
  var tokRef = { x: 0, y: 0 };
  var HERO_CELL = 0.58; // 아바타 PNG 한 픽셀이 지도 몇 칸인지(30x64 → 약 17x37칸)

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
      var k = K[y * GW + x], col, n = vnoise(x, y, 20) * .6 + vnoise(x, y, 8) * .4, bz = bayer(x, y);
      if (k === 0) {
        var ds = DS[y * GW + x];
        // 해안에서 멀어질수록 짙어지는 띠(칸이 2배 촘촘해서 띠 폭도 2칸씩). 띠 경계는 디더로 섞는다
        var dsj = ds + (bz > .25 ? 1 : 0);
        if (ds <= 1) col = '#b4ecf6'; else if (dsj <= 3) col = '#9ee0f0'; else if (dsj <= 5) col = '#7ccbe6'; else if (dsj <= 7) col = '#66b6da'; else if (dsj <= 9) col = '#55a5cf';
        else { var dn = n + bz * .25; col = dn > .62 ? '#4a98c4' : dn > .4 ? '#4190bc' : '#3a86b3'; }
        if (ds >= 6 && ds <= 11 && ((x + y) & 1) === 0 && bz > .3) col = '#5aaad2';
        if (ds <= 2) foam.push([x, y, Math.floor(hash(x >> 1, y >> 1) * 4)]);
        else if (ds >= 8 && hash(x, y) > .989) sparks.push([x, y, Math.floor(hash(y, x) * 8)]);
      } else {
        var dl = DL[y * GW + x], pal = (k === 2) ? DRY : GRASS, idx = Math.max(0, Math.min(3, Math.floor((n + bz * .22) * 4.2 - .45)));
        if (dl <= 2) col = (k === 2) ? '#e0d29a' : ((n + bz * .2) > .5 ? '#ecdcab' : '#e2d09b');
        else if (dl <= 4 && k === 1) col = (bz > (dl === 3 ? -.2 : .2)) ? '#c9d98a' : pal[0];
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
        for (var t = 0; t <= len; t++) { // 폭 2칸: 짙은 물 + 위쪽 물빛
          var rx = Math.round(a[0] + (b[0] - a[0]) * t / len + Math.sin((t + s * 14) / 6) * wob * 2), ry = Math.round(a[1] + (b[1] - a[1]) * t / len + Math.cos((t + s * 10) / 8) * wob * 1.2);
          if (kAt(rx, ry) > 0 && DL[ry * GW + rx] > 2) {
            c.fillStyle = '#4f9cc8'; c.fillRect(rx, ry, 2, 2);
            c.fillStyle = hash(rx, ry) > .55 ? '#9ad8ee' : '#6fb8dc'; c.fillRect(rx, ry, 1, 1);
            mark(rx, ry, 1);
          }
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
      var mx = (ax + bx) / 2 + (hash(ax >> 1, by >> 1) - .5) * 28, my = (ay + by) / 2 + (hash(bx >> 1, ay >> 1) - .5) * 16;
      for (var t = 0; t <= 1; t += 0.004) { // 폭 2칸 흙길, 바퀴 자국처럼 군데군데 짙게
        var px = Math.round((1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx), py = Math.round((1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by);
        if (kAt(px, py) > 0 && DL[py * GW + px] > 2) {
          c.fillStyle = '#d9c68e'; c.fillRect(px, py, 2, 2);
          if (hash(px, py) > .8) { c.fillStyle = '#c2a96e'; c.fillRect(px + 1, py + 1, 1, 1); }
          mark(px, py, 2);
        }
      }
    });
    Object.keys(NODE_POS).forEach(function (kk) { mark(Math.round(ux(NODE_POS[kk].x)), Math.round(uy(NODE_POS[kk].y)), 16); });
    // 산줄기
    function ridge(pts, gap) {
      var pg = pts.map(function (p) { return [gx(p[0]), gy(p[1])]; }), acc = 0;
      for (var s = 1; s < pg.length; s++) {
        var a = pg[s - 1], b = pg[s], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (var t = acc; t < len; t += gap) {
          var mx = Math.round(a[0] + (b[0] - a[0]) * t / len + (hash(s, t | 0) - .5) * 6), my = Math.round(a[1] + (b[1] - a[1]) * t / len);
          var nm = (hash(mx, my) > .5) ? 'mtn' : 'mtn2', sp = spriteCanvas(nm, false);
          if (kAt(mx, my) === 1 && DL[my * GW + mx] > 6 && !occupied[my + ',' + mx]) { c.drawImage(sp, mx - (sp.width >> 1), my - sp.height + 4); mark(mx, my, 6); }
        }
        acc = ((acc + Math.ceil((len - acc) / gap) * gap) - len);
      }
    }
    ridge([[128.9, 41.0], [128.4, 40.3], [127.9, 39.4], [128.3, 38.5], [128.6, 37.6], [128.9, 36.8], [129.0, 36.0], [128.7, 35.5]], 14);
    ridge([[127.9, 36.3], [127.6, 35.6], [127.0, 35.5]], 16);
    ridge([[126.4, 40.6], [126.9, 40.0], [127.2, 39.5]], 16);
    // 숲 (나무 한 그루씩)
    var trees = [];
    for (y = 4; y < GH - 4; y += 6) for (x = 4; x < GW - 4; x += 6) {
      var jx = x + Math.floor(hash(x, y) * 6), jy = y + Math.floor(hash(y, x) * 6), kk = kAt(jx, jy);
      if (kk === 0 || DL[jy * GW + jx] < 6 || occupied[jy + ',' + jx]) continue;
      var f = vnoise(jx, jy, 26);
      if (f > (kk === 2 ? .62 : .5) && hash(jx + 5, jy + 9) > .3) trees.push([jx, jy]);
    }
    trees.sort(function (a, b) { return a[1] - b[1]; });
    trees.forEach(function (tp) { var sp = spriteCanvas('tree', false); c.drawImage(sp, tp[0] - (sp.width >> 1), tp[1] - sp.height + 2); });
    // 꽃과 풀
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (kAt(x, y) !== 1 || DL[y * GW + x] < 6 || occupied[y + ',' + x]) continue;
      var hv = hash(x * 3 + 1, y * 5 + 2);
      if (hv > .9965) { // 꽃: 가운데 노란 점 + 꽃잎
        var fc = ['#fff3a6', '#f6a9c4', '#ffffff'][Math.floor(hash(y, x) * 3)];
        c.fillStyle = fc; c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); c.fillStyle = '#e0b84a'; c.fillRect(x, y, 1, 1);
      } else if (hv < .006) { c.fillStyle = '#659d47'; c.fillRect(x, y, 1, 3); c.fillRect(x + 2, y + 1, 1, 2); c.fillStyle = '#4f8a3a'; c.fillRect(x + 1, y + 2, 1, 1); }
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
      var i;
      // 바다의 반짝임과 해안 거품
      sparks.forEach(function (w) { if (((frame >> 1) + w[2]) % 8 === 0) { lc.fillStyle = 'rgba(255,255,255,.7)'; lc.fillRect(w[0], w[1], 3, 1); lc.fillRect(w[0] + 1, w[1] - 1, 1, 1); } });
      foam.forEach(function (w) { if ((((frame >> 1) + w[2]) & 3) < 2) { lc.fillStyle = 'rgba(255,255,255,.75)'; lc.fillRect(w[0], w[1], 1, 1); } });
      // 떠다니는 배
      var boatSp = spriteCanvas('boat', true);
      [[24, 124, 10], [176, 96, 12], [156, 200, 8]].forEach(function (bt, bi) {
        var bx = bt[0] + Math.round(Math.sin(frame / 30 + bi * 2) * bt[2]), by = bt[1] + (((frame >> 2) + bi) & 1);
        lc.drawImage(boatSp, bx, by);
      });
      // 지나온 길 (점선: 3x3 붉은 점, 아래쪽 그늘)
      for (i = 1; i < route.length; i++) {
        var a = pos(route[i - 1]), b = pos(route[i]), d = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
        for (var t = 0; t <= d; t += 6) {
          var rx = Math.round(a.x + (b.x - a.x) * t / d) - 1, ry = Math.round(a.y + (b.y - a.y) * t / d) - 1;
          lc.fillStyle = '#7d221a'; lc.fillRect(rx, ry + 1, 3, 3);
          lc.fillStyle = '#c0392b'; lc.fillRect(rx, ry, 3, 3);
          lc.fillStyle = '#e8705f'; lc.fillRect(rx, ry, 1, 1);
        }
      }
      // 거점 (그림자 → 그림 → 표시)
      Object.keys(NODE_POS).forEach(function (k) {
        var st = nodeState[k] || 'locked', q = pos(k);
        var spr = (st === 'locked') ? spriteCanvas('fog', true, '#8d97a8') : spriteCanvas(ICON[k], true);
        var png = (st === 'locked') ? null : nodeImg(k, st === 'done', draw);
        if (png) { var pw = NODE_IMAGES[k].w || 28; spr = gridSprite(png, pw, Math.max(16, Math.round(pw * png.naturalHeight / png.naturalWidth))); }
        var bob = (st === 'locked') ? Math.round(Math.sin(frame / 6 + q.x) * 1.5) : 0;
        var x = Math.round(q.x - spr.width / 2), y = Math.round(q.y - spr.height / 2) + bob;
        if (st !== 'locked' && ICON[k] !== 'ship') { // 땅 위 그림자
          lc.fillStyle = 'rgba(0,0,0,.22)'; lc.fillRect(x + 2, y + spr.height - 2, spr.width - 4, 3); lc.fillRect(x + 5, y + spr.height + 1, spr.width - 10, 2);
        }
        if (st === 'open') { // 은은한 빛 테두리 + 위아래로 움직이는 화살표
          lc.fillStyle = ((frame >> 2) % 2 === 0) ? 'rgba(255,215,90,.55)' : 'rgba(255,215,90,.3)';
          lc.fillRect(x - 4, y - 4, spr.width + 8, 2); lc.fillRect(x - 4, y + spr.height + 2, spr.width + 8, 2);
          lc.fillRect(x - 4, y - 2, 2, spr.height + 4); lc.fillRect(x + spr.width + 2, y - 2, 2, spr.height + 4);
        }
        lc.drawImage(spr, x, y);
        if (st === 'open') {
          var ar = spriteCanvas('arrow', true), ay = y - ar.height - 4 - (((frame >> 1) % 4 < 2) ? 0 : 3);
          lc.drawImage(ar, Math.round(q.x - ar.width / 2), ay);
        }
        if (st === 'done') { // 깃발 꽂기(바람에 펄럭이는 두 장면)
          var fl = spriteCanvas(((frame >> 2) + k.length) & 1 ? 'flag1' : 'flag0', true);
          lc.drawImage(fl, x + spr.width - 5, y - fl.height + 8);
        }
      });
      // 말
      var pngHero = (cfg.token !== false) ? heroImg(avatarKey, tok.moving, draw) : null;
      if (cfg.token !== false && !pngHero) { // PNG가 없을 때: 코드 도트를 2배(가장 가까운 점)로
        var hero = heroCanvas(avatarKey, tok.moving && (frame % 2) ? 1 : 0), hw0 = hero.width * 2, hh0 = hero.height * 2;
        tokRef = tok;
        var hx = (heroLeft() || tok.x + 18 + hw0 / 2 > GW) ? tok.x - 18 - hw0 / 2 : tok.x + 18 - hw0 / 2;
        lc.imageSmoothingEnabled = false;
        lc.drawImage(hero, Math.round(hx), Math.round(tok.y - hh0 + 18), hw0, hh0);
      } else if (pngHero) {
        var hw = Math.max(1, Math.round(pngHero.naturalWidth * HERO_CELL)), hh = Math.max(1, Math.round(pngHero.naturalHeight * HERO_CELL));
        tokRef = tok;
        var toLeft = heroLeft() || (tok.x + 18 + hw / 2 > GW);
        var hx2 = Math.round(toLeft ? tok.x - 18 - hw / 2 : tok.x + 18 - hw / 2);
        var hy2 = Math.round(tok.y - hh + 18) - (tok.moving && (frame % 2) ? 2 : 0);
        var hs = gridSprite(pngHero, hw, hh);
        lc.fillStyle = 'rgba(0,0,0,.22)'; lc.fillRect(hx2 + 3, hy2 + hh - 2, hw - 6, 3); // 발밑 그림자
        if (tok.moving && tok.dir < 0) { lc.save(); lc.translate(hx2 + hw, hy2); lc.scale(-1, 1); lc.drawImage(hs, 0, 0); lc.restore(); }
        else lc.drawImage(hs, hx2, hy2);
      }
      dc.imageSmoothingEnabled = false;
      dc.drawImage(lo, 0, 0, cv.width, cv.height);
    }

    function loop() { frame++; draw(); }
    function startLoop() { if (!reduced && !timer) timer = setInterval(loop, 125); }

    mv.resize = function () {
      var dpr = window.devicePixelRatio || 1, cs = {}, ws = {};
      try { cs = getComputedStyle(cv); ws = getComputedStyle(wrap); } catch (e) { /* 기본값 */ }
      var bw = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
      var w = (wrap.clientWidth || 0) - (parseFloat(ws.paddingLeft) || 0) - (parseFloat(ws.paddingRight) || 0) - bw;
      if (w < 200) w = 200;
      // 기기 픽셀 기준 정수 배율: 한 칸이 언제나 같은 수의 기기 픽셀이라 DPR 2.625 폰에서도 도트 굵기가 하나로 같다
      scale = Math.max(1, Math.min(Math.round((cfg.maxScale || 3) * dpr), Math.floor(w * dpr / GW)));
      cv.width = GW * scale; cv.height = GH * scale;
      cv.style.width = (GW * scale / dpr) + 'px'; cv.style.height = (GH * scale / dpr) + 'px';
      ov.style.width = cv.style.width; ov.style.height = cv.style.height;
      ov.style.left = (cv.offsetLeft + cv.clientLeft) + 'px'; ov.style.top = (cv.offsetTop + cv.clientTop) + 'px';
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
