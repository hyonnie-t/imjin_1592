/* app.js — 임진왜란 전개과정 시뮬레이션 (history26 수업 웹앱)
 * 함수 선언을 모두 끝낸 뒤 맨 아래에서 init()을 부른다(TDZ 방지). */
var CONFIG = {
  SHEET_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec',
  GAME_NAME: 'imjin_1592',
  START: 3,
  MAX: 5,
  PADLET_BY_BAN: {
    5: 'https://padlet.com/dy_sch03/2026-2-3-5-cewq8vec8p3ew2yn',
    6: 'https://padlet.com/dy_sch03/2026-2-3-6-2xngg3v8pstkvld9',
    7: 'https://padlet.com/dy_sch03/2026-2-3-7-8ssvnriy75f7xwxs',
    8: 'https://padlet.com/dy_sch03/2026-2-3-8-gsrz2i3ca863675l'
  }
};

var LETTERS = ['A', 'B', 'C'];
var S = { avatar: 'seonbi', sid: '', name: '', preview: false, turn: 0, cur: -1, phase: 'turn', order: [], dice: [], picks: [], stats: null, submitted: false, guardOn: false };

function $(id) { return document.getElementById(id); }
function show(id) {
  ['vLogin', 'vAvatar', 'vIntro', 'vSim', 'vEnd', 'vDone'].forEach(function (v) { $(v).hidden = (v !== id); });
  if (typeof setPop === 'function') setPop(false);
  $('stats').hidden = !(id === 'vSim' || id === 'vEnd');
  $('statNote').hidden = $('stats').hidden;
  window.scrollTo(0, 0);
}
function clamp(n) { return Math.min(CONFIG.MAX, Math.max(0, n)); }
function parseSid(sid) {
  var m = /^([1-3])(\d{2})(\d{2})$/.exec(String(sid || '').trim());
  return m ? { grade: +m[1], ban: +m[2], num: +m[3] } : null;
}
function sceneLabel(i) { return '장면 ' + (i + 1) + ' — ' + SCENES[i].place; }

/* ── 자원 표시 ── */
function renderStats(animate) {
  Array.prototype.forEach.call(document.querySelectorAll('.stat'), function (el) {
    var k = el.getAttribute('data-k'), v = S.stats[k], prev = el.getAttribute('data-prev');
    var segs = '';
    for (var i = 0; i < CONFIG.MAX; i++) segs += '<span class="seg' + (i < v ? ' on' : '') + '"></span>';
    el.querySelector('.segs').innerHTML = segs;
    el.querySelector('.stat-num').textContent = v + '/' + CONFIG.MAX;
    el.classList.toggle('low', v <= 1);
    el.setAttribute('data-prev', v);
    var d = (animate && prev !== null) ? v - Number(prev) : 0;
    if (d) {
      var tag = document.createElement('span'); tag.className = 'delta ' + (d > 0 ? 'up' : 'down');
      tag.textContent = (d > 0 ? '+' : '−') + Math.abs(d);
      el.appendChild(tag); setTimeout(function () { if (tag.parentNode) tag.parentNode.removeChild(tag); }, 1600);
      el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add(d > 0 ? 'flash-up' : 'flash-down');
    }
  });
}

/* ── 로그인 ── */
function login() {
  var sid = $('inSid').value.trim(), name = $('inName').value.trim();
  if (!parseSid(sid) || !name) { $('loginErr').textContent = '학번 5자리와 이름을 입력해 줘.'; return; }
  S.sid = sid; S.name = name;
  openAvatar();
}

/* ── 인물 고르기 ── */
function openAvatar() {
  show('vAvatar');
  var box = $('avatarList'); box.innerHTML = '';
  AVATARS.forEach(function (a) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'avatar'; b.setAttribute('role', 'radio'); b.setAttribute('data-key', a.key);
    b.setAttribute('aria-checked', a.key === S.avatar ? 'true' : 'false');
    var pic = document.createElement('img');
    pic.src = 'img/avatar_' + a.key + '.png'; pic.alt = ''; pic.className = 'avatar-pic';
    pic.onload = function () { // 원본 도트의 정수배(기기 픽셀 기준)로 보여 줘서 도트 굵기를 고르게 한다
      var dpr = window.devicePixelRatio || 1, k = Math.max(1, Math.floor(2 * dpr)) / dpr;
      pic.style.width = (pic.naturalWidth * k) + 'px'; pic.style.height = (pic.naturalHeight * k) + 'px'; pic.style.padding = '4px';
    };
    pic.onerror = function () { // 이미지가 없으면 코드로 찍은 도트로 대신한다
      var src = MapView.heroCanvas(a.key, 0), cv = document.createElement('canvas');
      cv.width = src.width * 8; cv.height = src.height * 8; cv.className = 'avatar-pic';
      var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(src, 0, 0, cv.width, cv.height);
      if (pic.parentNode) pic.parentNode.replaceChild(cv, pic);
    };
    var nm = document.createElement('b'); nm.textContent = a.name;
    var ds = document.createElement('small'); ds.textContent = a.desc;
    b.appendChild(pic); b.appendChild(nm); b.appendChild(ds);
    b.addEventListener('click', function () {
      S.avatar = a.key;
      Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
    });
    box.appendChild(b);
  });
}

/* ── 도입 비교표 ── */
function renderBg() {
  var box = $('bgTable');
  box.innerHTML = '';
  BG_TABLE.forEach(function (row, i) {
    var cell = document.createElement('div');
    cell.className = 'bg-cell';
    var b = document.createElement('b'); b.textContent = row.who;
    var q = document.createElement('p'); q.className = 'sub'; q.textContent = row.hint;
    var ta = document.createElement('textarea'); ta.rows = 3; ta.setAttribute('aria-label', row.who + ' 상황 적기');
    cell.appendChild(b); cell.appendChild(q); cell.appendChild(ta);
    if (row.reveal) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn-ghost'; btn.textContent = '교과서 설명 보기';
      var rv = document.createElement('p'); rv.className = 'bg-reveal'; rv.hidden = true; rv.textContent = row.reveal;
      btn.addEventListener('click', function () { rv.hidden = !rv.hidden; });
      cell.appendChild(btn); cell.appendChild(rv);
    }
    box.appendChild(cell);
  });
}

/* ── 보드 (시기 → 현장 → 선택 → 주사위 → 실제 역사) ── */
var MV = null, MVEND = null;
function sceneByNode(node) { for (var i = 0; i < SCENES.length; i++) if (SCENES[i].node === node) return i; return -1; }
function nodeOfScene(i) { return SCENES[i].node; }
var POP_FOCUS = null;
function panel(id) {
  ['pTurn', 'pScene', 'after'].forEach(function (p) { $(p).hidden = (p !== id); });
  setPop(id !== 'pTurn');
}
function setPop(open) { // 장면·결과는 지도 위 팝업으로 보여 준다. 선택은 필수라 바깥 클릭·ESC로 닫지 않는다
  var pop = $('pop'), was = !pop.hidden;
  pop.hidden = !open;
  document.body.classList.toggle('modal-open', open);
  if (open) {
    if (!was) POP_FOCUS = document.activeElement;
    $('popCard').scrollTop = 0;
    $('popCard').focus({ preventScroll: true });
  } else if (was && POP_FOCUS && POP_FOCUS.focus && document.body.contains(POP_FOCUS)) {
    try { POP_FOCUS.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
}
function setPopHead(i, stage) {
  var sc = SCENES[i], av = $('popAv');
  $('popStage').textContent = stage;
  $('simArea').textContent = sc.area + ' · ' + sc.date;
  $('popTitle').textContent = sc.place;
  av.hidden = false; av.onerror = function () { av.hidden = true; };
  av.src = 'img/avatar_' + S.avatar + '.png';
}
function trapTab(e) { // 팝업 안에서만 Tab 이동
  if (e.key !== 'Tab' || $('pop').hidden) return;
  var f = Array.prototype.filter.call($('popCard').querySelectorAll('button,[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])'),
    function (el) { return !el.disabled && el.offsetParent !== null; });
  if (!f.length) { e.preventDefault(); return; }
  var first = f[0], last = f[f.length - 1], cur = document.activeElement;
  if (e.shiftKey && (cur === first || cur === $('popCard'))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
}
function visitedNodes() { return S.order.map(nodeOfScene); }

function nodeStates() {
  var m = {};
  Object.keys(NODE_POS).forEach(function (k) { m[k] = 'locked'; });
  S.order.forEach(function (i) { m[nodeOfScene(i)] = 'done'; });
  if (S.phase !== 'turn' && S.cur >= 0 && S.picks[S.cur] === undefined) m[nodeOfScene(S.cur)] = 'here';
  if (S.phase === 'turn') TURNS[S.turn].fronts.forEach(function (id) {
    var i = id - 1; if (S.picks[i] === undefined) m[nodeOfScene(i)] = 'open';
  });
  return m;
}
function refreshMap() { MV.setNodes(nodeStates()); MV.setRoute(visitedNodes()); }

function startSim() {
  S.turn = 0; S.picks = []; S.order = []; S.dice = []; S.phase = 'turn'; S.cur = -1;
  S.stats = { s: CONFIG.START, m: CONFIG.START, g: CONFIG.START };
  if (!S.guardOn) { FocusGuard.start({ key: CONFIG.GAME_NAME + ':' + S.sid }); S.guardOn = true; }
  if (window.DraftGuard) DraftGuard.start({ key: CONFIG.GAME_NAME, sid: S.sid }); // 글쓰기 칸 임시저장 (history26 v75)
  Array.prototype.forEach.call(document.querySelectorAll('.stat'), function (el) { el.removeAttribute('data-prev'); });
  renderStats();
  show('vSim');
  if (!MV) MV = MapView.create({ canvas: $('mapCv'), overlay: $('mapOv'), onNode: onNode });
  MV.setAvatar(S.avatar); MV.resize(); MV.placeToken(null);
  renderTurn();
}
function renderTurn() {
  S.phase = 'turn';
  var t = TURNS[S.turn], first = SCENES[t.fronts[0] - 1];
  $('simProg').textContent = '시기 ' + (S.turn + 1) + ' / ' + TURNS.length;
  $('simDate').textContent = t.label || first.date;
  $('turnTitle').textContent = '이번 시기에 갈 수 있는 현장';
  $('turnNote').textContent = t.note || '지도에서 깜박이는 곳을 누르거나 아래 버튼을 눌러 봐.';
  $('moveMsg').textContent = '';
  var box = $('frontBtns'); box.innerHTML = '';
  t.fronts.forEach(function (id) {
    var i = id - 1, sc = SCENES[i];
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'choice front';
    b.disabled = S.picks[i] !== undefined;
    b.appendChild(document.createTextNode(sc.place + ' '));
    var sm = document.createElement('small'); sm.textContent = sc.area + ' · ' + sc.date; b.appendChild(sm);
    b.addEventListener('click', function () { goFront(i); });
    box.appendChild(b);
  });
  panel('pTurn'); refreshMap();
}
function onNode(node, state) {
  if (S.phase === 'moving') return;
  var i = sceneByNode(node);
  if (state === 'open' && S.phase === 'turn') goFront(i);
  else if (state === 'done' && (S.phase === 'turn' || S.phase === 'review')) showReview(i);
}
function goFront(i) {
  if (S.phase !== 'turn' || S.picks[i] !== undefined) return;
  S.phase = 'moving'; S.cur = i;
  $('moveMsg').textContent = '이동 중…';
  Array.prototype.forEach.call($('frontBtns').children, function (b) { b.disabled = true; });
  MV.moveToken(nodeOfScene(i), function () { openScene(i); });
}
function openScene(i) {
  var sc = SCENES[i]; S.phase = 'scene'; S.cur = i;
  $('simDate').textContent = sc.date;
  setPopHead(i, '선택의 순간');
  $('simSit').textContent = sc.situation;
  var note = $('simNote'); note.hidden = !sc.note; note.textContent = sc.note || '';
  var box = $('choices'); box.innerHTML = ''; box.className = 'choices';
  sc.choices.forEach(function (c, k) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'choice';
    var lt = document.createElement('span'); lt.className = 'lt'; lt.textContent = LETTERS[k] + '.';
    b.appendChild(lt); b.appendChild(document.createTextNode(c.t));
    b.addEventListener('click', function () {
      if (S.phase !== 'scene' || box.classList.contains('locked')) return;
      box.classList.add('locked'); b.classList.add('picked'); // 고른 카드를 잠깐 눌러 보여 준 뒤 결과로 넘어간다
      setTimeout(function () { pick(k); }, 360);
    });
    box.appendChild(b);
  });
  panel('pScene'); refreshMap();
  if (window.innerWidth < 900) { var mw = document.querySelector('.mapwrap'); if (mw) window.scrollTo({ top: Math.max(0, mw.getBoundingClientRect().top + window.pageYOffset - 8), behavior: 'auto' }); }
}
function pick(k) {
  if (S.phase !== 'scene') return;
  var i = S.cur, c = SCENES[i].choices[k];
  var n = 1 + Math.floor(Math.random() * 6), e = diceEffect(n); // 게임용 무작위: 실제 역사 결과는 바뀌지 않는다
  var before = { s: S.stats.s, m: S.stats.m, g: S.stats.g };
  S.stats[c.up] = clamp(S.stats[c.up] + e.up);
  S.stats[c.down] = clamp(S.stats[c.down] - e.down);
  S.picks[i] = k; S.order.push(i);
  S.dice[i] = { n: n, up: c.up, down: c.down, gain: S.stats[c.up] - before[c.up], loss: before[c.down] - S.stats[c.down] };
  renderStats(true);
  renderRoll(i, before);
  showFeedback();
}
function renderRoll(i, before) { // 이번 선택으로 수치가 어떻게 바뀌었는지 (헤더가 화면 밖이어도 보이도록 결과 칸에 다시 보여 준다)
  var d = S.dice[i], box = $('rollBox'); box.innerHTML = '';
  [['up', d.up], ['down', d.down]].forEach(function (p) {
    var key = p[1], now = S.stats[key], was = before[key], diff = now - was;
    var row = document.createElement('div'); row.className = 'roll-row ' + (p[0] === 'up' ? 'up' : 'down');
    var segs = ''; for (var j = 0; j < CONFIG.MAX; j++) segs += '<span class="seg' + (j < now ? ' on' : '') + (j >= Math.min(now, was) && j < Math.max(now, was) ? ' chg' : '') + '"></span>';
    var amt = diff === 0 ? '변화 없음(한계)' : ((diff > 0 ? '+' : '−') + Math.abs(diff));
    row.innerHTML = '<span class="rr-name">' + RES_LABEL[key] + '</span><span class="segs">' + segs + '</span><b class="rr-amt">' + amt + '</b>';
    box.appendChild(row);
  });
  var luck = document.createElement('p'); luck.className = 'roll-note';
  luck.textContent = '🎲 ' + d.n + ' · 눈이 높을수록 이득이 커. 게임용 수치라 실제 역사는 바뀌지 않아.';
  box.appendChild(luck);
}
function fillFeedback(i) {
  var sc = SCENES[i];
  setPopHead(i, S.phase === 'review' ? '다시 보기' : '그 뒤에 벌어진 일');
  $('fbLetter').textContent = LETTERS[S.picks[i]];
  $('fbPick').textContent = sc.choices[S.picks[i]].t;
  $('fbReal').textContent = sc.history;
  var bk = $('fbBook'); bk.hidden = !sc.book;
  if (sc.book) bk.textContent = '교과서 ' + sc.book.page + '쪽 ' + sc.book.note + ': ' + sc.book.quote;
  $('fbOther').textContent = sc.concurrent;
  var ex = $('fbExtra'); ex.hidden = !sc.extra; ex.textContent = sc.extra || '';
}
function showFeedback() {
  var i = S.cur; S.phase = 'feedback';
  fillFeedback(i);
  var left = TURNS[S.turn].fronts.filter(function (id) { return S.picks[id - 1] === undefined; }).length;
  var last = (S.turn === TURNS.length - 1);
  $('btnNext').textContent = left ? '이번 시기의 다른 현장으로' : (last ? '결과 보기' : '다음 시기로');
  panel('after'); refreshMap();
}
function showReview(i) {
  S.phase = 'review'; S.reviewFrom = S.cur;
  fillFeedback(i);
  var d = S.dice[i], rb = $('rollBox'); rb.innerHTML = '';
  if (d) { var p = document.createElement('p'); p.className = 'roll-note'; p.textContent = '그때 결과 — ' + RES_LABEL[d.up] + ' +' + d.gain + ', ' + RES_LABEL[d.down] + ' −' + d.loss; rb.appendChild(p); }
  $('btnNext').textContent = '돌아가기';
  panel('after');
}
function nextStep() {
  if (S.phase === 'review') { S.phase = 'turn'; renderTurn(); return; }
  var left = TURNS[S.turn].fronts.filter(function (id) { return S.picks[id - 1] === undefined; }).length;
  if (left) { renderTurn(); return; }
  if (S.turn < TURNS.length - 1) { S.turn++; renderTurn(); window.scrollTo(0, 0); }
  else showEnd();
}

/* ── 엔딩 ── */
function sameCount() {
  var n = 0;
  SCENES.forEach(function (sc, i) { if (sc.real.indexOf(S.picks[i]) !== -1) n++; });
  return n;
}
function choiceLines(target) {
  target.innerHTML = '';
  SCENES.forEach(function (sc, i) {
    var li = document.createElement('li');
    li.textContent = sceneLabel(i) + ': ' + LETTERS[S.picks[i]] + '. ' + sc.choices[S.picks[i]].t;
    target.appendChild(li);
  });
}
function fillSceneSelect(sel, withBlank) {
  sel.innerHTML = '';
  if (withBlank) { var o0 = document.createElement('option'); o0.value = ''; o0.textContent = '장면 고르기'; sel.appendChild(o0); }
  SCENES.forEach(function (sc, i) {
    var o = document.createElement('option'); o.value = String(i); o.textContent = sceneLabel(i); sel.appendChild(o);
  });
}
function showEnd() {
  $('endS').textContent = S.stats.s; $('endM').textContent = S.stats.m; $('endG').textContent = S.stats.g;
  $('endMatch').textContent = '실제 역사와 같은 선택을 한 장면: ' + sameCount() + ' / ' + SCENES.length;
  choiceLines($('endList'));
  fillSceneSelect($('selDiary'), true);
  $('diaryFact').hidden = true; $('diaryEx').hidden = true; $('resErr').textContent = '';
  // 이 페이지에서 처음 들어올 땐 임시저장에서 복원된 일기를 지우지 않는다(새로고침 뒤 다시 도착한 경우). 다시 하기 때만 비운다.
  if (S.endShown) $('txtDiary').value = '';
  S.endShown = true;
  var btnS = $('btnSubmit'); btnS.disabled = false; btnS.textContent = '제출하기';
  $('diaryIntro').textContent = '내가 고른 인물인 ‘' + avatarName() + '’의 눈으로, 시뮬레이션에서 지나온 장면 하나를 일기로 남겨 보자.';
  show('vEnd');
  if (!MVEND) MVEND = MapView.create({ canvas: $('endCv'), overlay: $('endOv'), interactive: false, token: false });
  MVEND.resize();
  var st = {}, bd = {};
  Object.keys(NODE_POS).forEach(function (k) { st[k] = 'done'; });
  SCENES.forEach(function (sc, i) { bd[sc.node] = LETTERS[S.picks[i]]; });
  MVEND.setNodes(st); MVEND.setBadges(bd); MVEND.setRoute(visitedNodes());
}
function avatarName() { var av = AVATARS.filter(function (x) { return x.key === S.avatar; })[0]; return av ? av.name : '인물'; }
function showDiaryFact() {
  var v = $('selDiary').value, box = $('diaryFact');
  if (v === '') { box.hidden = true; $('diaryEx').hidden = true; return; }
  var i = +v, sc = SCENES[i];
  $('diaryMine').textContent = '내가 고른 선택 — ' + LETTERS[S.picks[i]] + '. ' + sc.choices[S.picks[i]].t;
  $('diaryReal').textContent = sc.date + ' · ' + sc.place + ' — ' + sc.history;
  box.hidden = false;
  showDiaryExamples(i);
}
function fillBlanks(el, text) { // '…' 자리는 빈칸 표시로 감싼다
  el.textContent = '';
  text.split('…').forEach(function (part, k) {
    if (k) { var b = document.createElement('span'); b.className = 'blank'; b.textContent = '…'; el.appendChild(b); }
    if (part) el.appendChild(document.createTextNode(part));
  });
}
function showDiaryExamples(i) {
  var sc = SCENES[i], pick = sc.choices[S.picks[i]].t;
  var map = { date: sc.date, place: sc.place, pick: pick };
  var frames = DIARY_FRAMES.concat([DIARY_PERSONA[S.avatar]]).filter(Boolean);
  frames.splice(1, 0, frames.pop()); // 인물 처지 문장을 둘째 칸에 둔다
  var list = $('dxList'); list.innerHTML = '';
  frames.forEach(function (f) {
    var li = document.createElement('li');
    fillBlanks(li, f.replace(/\{(\w+)\}/g, function (m, k) { return map[k] || m; }));
    list.appendChild(li);
  });
  var smp = $('dxSample'), has = i === DIARY_SAMPLE.scene;
  smp.hidden = !has; smp.open = false;
  if (has) { $('dxSampleHead').textContent = DIARY_SAMPLE.head; $('dxSampleText').textContent = DIARY_SAMPLE.text; }
  $('diaryEx').hidden = false;
}
function sentenceCount(t) {
  return t.split(/[.!?。\n]+/).filter(function (x) { return x.trim().length >= 4; }).length;
}
function buildPlainText() {
  var sc = SCENES[+$('selDiary').value];
  return '[임진왜란 일기]\n' +
    sc.date + ' · ' + sc.place + ' · ' + avatarName() + '의 일기\n\n' +
    $('txtDiary').value.trim();
}
function submit() {
  var err = $('resErr');
  var si = $('selDiary').value, text = $('txtDiary').value.trim();
  if (si === '') { err.textContent = '일기로 남길 장면을 먼저 골라 줘.'; return; }
  if (sentenceCount(text) < 3) { err.textContent = '일기를 3문장 이상 써 줘.'; return; }
  err.textContent = '';
  var n = +si;
  var detail = {
    avatar: S.avatar,
    picks: S.picks.map(function (p) { return LETTERS[p]; }),
    order: S.order.map(function (i) { return i + 1; }),
    dice: S.dice.map(function (d) { return d ? d.n : null; }),
    stats: S.stats,
    sameAsHistory: sameCount(),
    diary: { scene: n + 1, persona: avatarName(), text: text }
  };
  var body = {
    studentId: S.sid,
    studentName: S.name,
    gameName: CONFIG.GAME_NAME,
    choiceSummary: S.picks.map(function (p, i) { return (i + 1) + LETTERS[p]; }).join(' '),
    diffSummary: '실제 역사와 같은 선택 ' + sameCount() + '/' + SCENES.length + ' · 일기 장면 ' + (n + 1),
    reflection: '[일기 장면] ' + (n + 1) + '. ' + SCENES[n].place + '\n[인물] ' + avatarName() + '\n[일기] ' + text,
    choicesJson: JSON.stringify(detail)
  };
  Object.assign(body, FocusGuard.payload());

  var btn = $('btnSubmit');
  btn.disabled = true; btn.textContent = '보내는 중…';
  if (S.preview) { finishSubmit(true); return; }
  fetch(CONFIG.SHEET_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); }).then(function (res) {
    if (res && res.result === 'success') finishSubmit(true);
    else throw new Error((res && res.message) || '저장 실패');
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = '제출하기';
    err.textContent = '제출하지 못했어. 인터넷을 확인하고 다시 눌러 줘. ' + (e && e.message ? '(' + e.message + ')' : '');
  });
}
function finishSubmit() {
  S.submitted = true;
  if (window.DraftGuard) DraftGuard.clear(); // 제출 성공 → 임시저장 삭제
  $('doneMsg').textContent = S.preview ? '미리보기라서 실제로 저장되지는 않았어.' : '내 기록이 저장됐어.';
  var p = parseSid(S.sid);
  var link = p && p.grade === 3 ? CONFIG.PADLET_BY_BAN[p.ban] : '';
  $('padletBox').hidden = !link;
  if (link) $('padletLink').href = link;
  $('copyMsg').textContent = '';
  show('vDone');
}
function copyText() {
  var text = buildPlainText();
  var done = function () { $('copyMsg').textContent = '복사했어. 패들렛에 붙여 넣어 줘.'; };
  var fallback = function () {
    $('copyFallback').hidden = false; $('copyFallback').open = true;
    $('copyArea').value = text; $('copyArea').select();
    $('copyMsg').textContent = '아래 칸의 글을 직접 복사해 줘.';
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}

/* ── 부팅 ── */
function init() {
  var q = new URLSearchParams(location.search);
  S.preview = q.get('preview') === '1';
  $('previewBar').hidden = !S.preview;
  $('inSid').value = q.get('sid') || (S.preview ? '30512' : '');
  $('inName').value = q.get('name') || (S.preview ? '미리보기' : '');
  renderBg();
  $('btnLogin').addEventListener('click', login);
  $('btnStart').addEventListener('click', startSim);
  $('btnAvatar').addEventListener('click', function () { show('vIntro'); });
  $('btnNext').addEventListener('click', nextStep);
  document.addEventListener('keydown', trapTab);
  window.addEventListener('resize', function () { if (MV && !$('vSim').hidden) MV.resize(); if (MVEND && !$('vEnd').hidden) MVEND.resize(); });
  $('selDiary').addEventListener('change', showDiaryFact);
  $('btnSubmit').addEventListener('click', submit);
  $('btnCopy').addEventListener('click', function () { copyText(); });
  if (parseSid($('inSid').value) && $('inName').value.trim()) {
    S.sid = $('inSid').value.trim(); S.name = $('inName').value.trim();
    openAvatar();
  } else show('vLogin');
  Glossary.start({ terms: GLOSSARY });
}
init();
