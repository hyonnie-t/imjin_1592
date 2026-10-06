/* map.js — 도트풍 전장 지도 (canvas, 빌드 없음)
 * 80x100 설계 좌표를 GW x GH 격자로 줄여 낮은 해상도 캔버스에 그린 뒤, 정수 배율로 키워 또렷하게 보여 준다.
 * 지도는 거점 위치만 단순화한 도식이다(교과서 지도를 옮긴 것이 아님).
 * 거점 버튼·라벨은 canvas 위에 올린 HTML(overlay)이라 키보드·스크린리더·터치로 쓸 수 있다. */
var MapView = (function () {
  var GW = 76, GH = 96, DW = 80, DH = 100;
  function ux(x) { return x * GW / DW; }
  function uy(y) { return y * GH / DH; }

  var POLY = [[18,8],[36,4],[50,8],[56,20],[50,32],[58,44],[68,52],[76,62],[78,74],[70,80],[56,82],[42,80],[32,84],[26,90],[16,88],[12,76],[18,62],[16,48],[22,36],[14,24]]
    .map(function (p) { return [ux(p[0]), uy(p[1])]; });
  var BLOBS = [ // 섬·이웃 땅 (한산도 섬, 일본, 명)
    { x: 50, y: 88, r: 5 }, { x: 78, y: 96, r: 9 }, { x: 2, y: 2, r: 11 }
  ].map(function (b) { return { x: ux(b.x), y: uy(b.y), r: b.r * GW / DW }; });

  var PAL = { k: '#2b2118', w: '#efe3c6', r: '#8a3a2a', g: '#7a7f87', b: '#3b5d9c', y: '#e0b84a', n: '#8a5a2b', s: '#f0c9a0', e: '#c0392b', h: '#ffffff', m: '#9aa0a8' };
  var SPR = {
    castle: ['k.k.k..k.k.k', 'kwkwkkkkwkwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kwwwwkkwwwwk', 'kwwwkggkwwwk', 'kwwwkggkwwwk', 'kwwwkggkwwwk', 'kkkkkkkkkkkk'],
    palace: ['kkkkkkkkkkkk', 'krrrrrrrrrrk', '.kkkkkkkkkk.', '..kwwwwwwk..', '..kwkkkkwk..', '..kwkggkwk..', '..kwkggkwk..', '..kkkkkkkk..'],
    tent:   ['.....kk..e..', '....kwwk.ee.', '...kwwwwkke.', '..kwwwwwwk..', '.kwwwkkwwwk.', 'kwwwwkgkwwwk', 'kkkkkkkkkkkk'],
    ship:   ['......k.....', '.....kyk....', '....kyyyk...', '....kyyyk...', '.....kyk....', '.kkkkkkkkkk.', '.knnnnnnnnk.', '..knnnnnnk..', '...kkkkkk...'],
    fog:    ['..kkkkkkkk..', '.kmmmmmmmmk.', 'kmmmkkkkmmmk', 'kmmkmmmmkmmk', 'kmmmmmmkmmmk', 'kmmmmmkmmmmk', 'kmmmmkmmmmmk', 'kmmmmmmmmmmk', 'kmmmmkmmmmmk', '.kmmmmmmmmk.', '..kkkkkkkk..'],
    hero1:  ['..kkkk..', '.kkkkkk.', '..kssk..', '..kssk..', '.kwwwwk.', 'kwwwwwwk', '.kwwwwk.', '.kwkkwk.', '.kk..kk.'],
    hero2:  ['..kkkk..', '.kkkkkk.', '..kssk..', '..kssk..', '.kwwwwk.', 'kwwwwwwk', '.kwwwwk.', '..kwwk..', '..kkkk..']
  };
  var ICON = { dongnae: 'castle', uiryeong: 'tent', hanseong: 'palace', hansando: 'ship', jinju: 'castle', pyeongyang: 'castle', myeongnyang: 'ship' };
  var CAMP = { x: 26, y: 54 };

  function inPoly(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function isLand(x, y) {
    if (inPoly(x + .5, y + .5, POLY)) return true;
    for (var i = 0; i < BLOBS.length; i++) {
      var dx = x + .5 - BLOBS[i].x, dy = y + .5 - BLOBS[i].y;
      if (dx * dx + dy * dy <= BLOBS[i].r * BLOBS[i].r) return true;
    }
    return false;
  }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

  /* 바탕(바다·땅)은 한 번만 그려 둔다 */
  var baseCv = null, waves = [];
  function buildBase() {
    baseCv = document.createElement('canvas'); baseCv.width = GW; baseCv.height = GH;
    var c = baseCv.getContext('2d'), x, y;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      var land = isLand(x, y), r = hash(x, y);
      if (land) {
        var shore = !isLand(x - 1, y) || !isLand(x + 1, y) || !isLand(x, y - 1) || !isLand(x, y + 1);
        c.fillStyle = shore ? '#b9a66d' : (r > .93 ? '#6f9a52' : r > .8 ? '#86b062' : '#93bd6b');
      } else {
        var near = isLand(x - 2, y) || isLand(x + 2, y) || isLand(x, y - 2) || isLand(x, y + 2);
        c.fillStyle = near ? '#4f8fb8' : (r > .9 ? '#3d7aa6' : '#4685b0');
        if (r > .955 && !near) waves.push([x, y, Math.floor(r * 1000) % 4]);
      }
      c.fillRect(x, y, 1, 1);
    }
    for (var i = 0; i < 90; i++) { // 숲 점
      x = Math.floor(hash(i, 7) * GW); y = Math.floor(hash(i, 11) * GH);
      if (isLand(x, y) && isLand(x - 2, y) && isLand(x + 2, y) && isLand(x, y - 2) && isLand(x, y + 2)) {
        c.fillStyle = '#4e7d3a'; c.fillRect(x, y, 2, 2); c.fillStyle = '#3d6330'; c.fillRect(x, y + 1, 2, 1);
      }
    }
  }

  var sprCache = {};
  function spriteCanvas(name) {
    if (sprCache[name]) return sprCache[name];
    var rows = SPR[name], w = rows[0].length, cv = document.createElement('canvas');
    cv.width = w; cv.height = rows.length;
    var c = cv.getContext('2d');
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) { var ch = row.charAt(x); if (ch !== '.') { c.fillStyle = PAL[ch]; c.fillRect(x, y, 1, 1); } }
    });
    return (sprCache[name] = cv);
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
    var tok = { x: ux(CAMP.x), y: uy(CAMP.y), moving: false };
    var mv = {};

    function pos(k) { var p = NODE_POS[k]; return { x: ux(p.x), y: uy(p.y) }; }

    function build() {
      ov.innerHTML = '';
      Object.keys(NODE_POS).forEach(function (k) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'node'; b.setAttribute('data-node', k);
        b.style.left = (NODE_POS[k].x / DW * 100) + '%'; b.style.top = (NODE_POS[k].y / DH * 100) + '%';
        var lb = document.createElement('span'); lb.className = 'nlabel'; lb.textContent = NODE_POS[k].label;
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
        b.className = 'node ' + st;
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
      waves.forEach(function (w) {
        if (((frame >> 1) + w[2]) % 4 === 0) { lc.fillStyle = '#9cc7e0'; lc.fillRect(w[0], w[1], 2, 1); }
      });
      // 지나온 길 (점선)
      lc.fillStyle = '#c0392b';
      for (i = 1; i < route.length; i++) {
        var a = pos(route[i - 1]), b = pos(route[i]), d = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y)));
        for (var t = 0; t <= d; t += 3) lc.fillRect(Math.round(a.x + (b.x - a.x) * t / d), Math.round(a.y + (b.y - a.y) * t / d), 1, 1);
      }
      // 거점
      Object.keys(NODE_POS).forEach(function (k) {
        var st = nodeState[k] || 'locked', q = pos(k);
        var spr = spriteCanvas(st === 'locked' ? 'fog' : ICON[k]);
        var x = Math.round(q.x - spr.width / 2), y = Math.round(q.y - spr.height / 2);
        if (st === 'open' && (frame >> 2) % 2 === 0) { // 깜박이는 테두리
          lc.fillStyle = '#ffd24a';
          lc.fillRect(x - 2, y - 2, spr.width + 4, 1); lc.fillRect(x - 2, y + spr.height + 1, spr.width + 4, 1);
          lc.fillRect(x - 2, y - 2, 1, spr.height + 4); lc.fillRect(x + spr.width + 1, y - 2, 1, spr.height + 4);
        }
        lc.drawImage(spr, x, y);
        if (st === 'done') { lc.fillStyle = '#c0392b'; lc.fillRect(x + spr.width - 2, y - 5, 1, 6); lc.fillRect(x + spr.width - 1, y - 5, 3, 2); }
      });
      // 말
      if (cfg.token !== false) {
        var hero = spriteCanvas(tok.moving && (frame % 2) ? 'hero2' : 'hero1');
        lc.drawImage(hero, Math.round(tok.x - hero.width / 2 + 7), Math.round(tok.y - hero.height + 8));
      }
      dc.imageSmoothingEnabled = false;
      dc.drawImage(lo, 0, 0, cv.width, cv.height);
    }

    function loop() { frame++; draw(); }
    function startLoop() { if (!reduced && !timer) timer = setInterval(loop, 125); }

    mv.resize = function () {
      var w = wrap.clientWidth || 0;
      if (w < GW * 3) w = GW * 3;
      scale = Math.max(3, Math.min(5, Math.floor(w / GW)));
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
      tok.moving = true;
      var t0 = Date.now(), dur = 900;
      (function step() {
        var t = Math.min(1, (Date.now() - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        tok.x = from.x + (to.x - from.x) * e; tok.y = from.y + (to.y - from.y) * e;
        if (t < 1) setTimeout(step, 40); else { tok.moving = false; draw(); cb(); }
      })();
    };
    mv.destroy = function () { if (timer) clearInterval(timer); timer = null; };

    build();
    mv.resize();
    startLoop();
    return mv;
  }
  return { create: create };
})();
