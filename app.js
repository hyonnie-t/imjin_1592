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
var S = { sid: '', name: '', preview: false, scene: 0, picks: [], stats: null, submitted: false, guardOn: false };

function $(id) { return document.getElementById(id); }
function show(id) {
  ['vLogin', 'vIntro', 'vSim', 'vEnd', 'vResult', 'vDone'].forEach(function (v) { $(v).hidden = (v !== id); });
  $('stats').hidden = !(id === 'vSim' || id === 'vEnd' || id === 'vResult');
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
function renderStats() {
  Array.prototype.forEach.call(document.querySelectorAll('.stat'), function (el) {
    var v = S.stats[el.getAttribute('data-k')];
    var pips = '';
    for (var i = 0; i < CONFIG.MAX; i++) pips += '<span class="pip' + (i < v ? ' on' : '') + '"></span>';
    el.querySelector('.pips').innerHTML = pips;
    el.querySelector('.stat-num').textContent = v;
  });
}

/* ── 로그인 ── */
function login() {
  var sid = $('inSid').value.trim(), name = $('inName').value.trim();
  if (!parseSid(sid) || !name) { $('loginErr').textContent = '학번 5자리와 이름을 입력해 줘.'; return; }
  S.sid = sid; S.name = name;
  show('vIntro');
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

/* ── 지도 도식 ── */
function drawMap(curNode) {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = $('mapSvg');
  svg.innerHTML = '';
  var land = document.createElementNS(NS, 'path');
  land.setAttribute('class', 'land');
  land.setAttribute('d', 'M30 4 L58 6 L64 20 L58 34 L72 48 L90 62 L90 82 L72 94 L44 98 L22 96 L16 80 L24 62 L22 44 L28 28 Z');
  svg.appendChild(land);
  Object.keys(MAP_NODES).forEach(function (k) {
    var n = MAP_NODES[k], cur = (k === curNode);
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', cur ? 3.6 : 2.2);
    c.setAttribute('class', 'dot' + (cur ? ' cur' : ''));
    svg.appendChild(c);
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', n.x); t.setAttribute('y', n.y + (cur ? 8 : 6.5));
    t.setAttribute('class', cur ? 'cur' : '');
    t.textContent = n.label;
    svg.appendChild(t);
  });
  svg.setAttribute('aria-label', '현재 장면의 거점: ' + MAP_NODES[curNode].label);
}

/* ── 시뮬레이션 ── */
function startSim() {
  S.scene = 0; S.picks = []; S.stats = { s: CONFIG.START, m: CONFIG.START, g: CONFIG.START };
  if (!S.guardOn) { FocusGuard.start({ key: CONFIG.GAME_NAME + ':' + S.sid }); S.guardOn = true; }
  renderStats();
  show('vSim');
  renderScene();
}
function renderScene() {
  var sc = SCENES[S.scene];
  $('simProg').textContent = '장면 ' + (S.scene + 1) + ' / ' + SCENES.length;
  $('simDate').textContent = sc.date;
  $('simArea').textContent = sc.area;
  $('simPlace').textContent = sc.place;
  $('simSit').textContent = sc.situation;
  var note = $('simNote');
  note.hidden = !sc.note; note.textContent = sc.note || '';
  drawMap(sc.node);
  var box = $('choices');
  box.innerHTML = '';
  sc.choices.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'choice';
    var lt = document.createElement('span'); lt.className = 'lt'; lt.textContent = LETTERS[i] + '.';
    b.appendChild(lt); b.appendChild(document.createTextNode(c.t));
    b.addEventListener('click', function () { pick(i); });
    box.appendChild(b);
  });
  $('after').hidden = true;
  $('btnNext').textContent = (S.scene === SCENES.length - 1) ? '결과 보기' : '다음 장면으로';
}
function pick(i) {
  if (S.picks[S.scene] !== undefined) return;
  var sc = SCENES[S.scene], c = sc.choices[i];
  S.picks[S.scene] = i;
  S.stats[c.up] = clamp(S.stats[c.up] + 1);
  S.stats[c.down] = clamp(S.stats[c.down] - 1);
  renderStats();
  Array.prototype.forEach.call($('choices').children, function (b, k) {
    b.disabled = true;
    b.className = 'choice ' + (k === i ? 'picked' : 'dim');
  });
  $('fbReal').textContent = sc.history;
  var bk = $('fbBook');
  bk.hidden = !sc.book;
  if (sc.book) bk.textContent = '교과서 ' + sc.book.page + '쪽 ' + sc.book.note + ': ' + sc.book.quote;
  $('fbOther').textContent = sc.concurrent;
  var ex = $('fbExtra');
  ex.hidden = !sc.extra; ex.textContent = sc.extra || '';
  $('after').hidden = false;
  $('after').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function nextScene() {
  if (S.scene < SCENES.length - 1) { S.scene++; renderScene(); window.scrollTo(0, 0); }
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
  fillSceneSelect($('selPivot'), true);
  $('endErr').textContent = '';
  show('vEnd');
}
function toResult() {
  if ($('selPivot').value === '' || $('txtPivot').value.trim().length < 5) {
    $('endErr').textContent = '결정적이었다고 생각하는 장면과 이유를 먼저 적어 줘.'; return;
  }
  $('endErr').textContent = '';
  choiceLines($('recList'));
  fillSceneSelect($('selScene'), true);
  $('effectBox').hidden = !EFFECT_TEXTBOOK.length;
  show('vResult');
}
function showEffect() {
  var body = $('effectBody');
  body.innerHTML = '';
  EFFECT_TEXTBOOK.forEach(function (e) {
    var p = document.createElement('p');
    p.textContent = e.who + ': ' + e.text + ' (교과서 137쪽)';
    body.appendChild(p);
  });
  body.hidden = !body.hidden;
}

/* ── 제출 ── */
function sentenceCount(t) {
  return t.split(/[.!?。\n]+/).filter(function (x) { return x.trim().length >= 4; }).length;
}
function buildPlainText() {
  var d = $('selDecide').value, sc = SCENES[+$('selScene').value];
  return '[임진왜란 탐구]\n' +
    '1. 나의 선택: 일본의 교류 요청에 ' + d + '.\n' +
    '2. 근거 장면: ' + sc.place + '\n' +
    '3. 이유:\n' + $('txtEssay').value.trim();
}
function submit() {
  var err = $('resErr');
  var d = $('selDecide').value, si = $('selScene').value, reason = $('txtEssay').value.trim();
  if (!d || si === '') { err.textContent = '나의 선택과 근거 장면을 모두 골라 줘.'; return; }
  if (sentenceCount(reason) < 2) { err.textContent = '이유를 2문장 이상 써 줘.'; return; }
  err.textContent = '';
  var pivIdx = +$('selPivot').value;
  var detail = {
    picks: S.picks.map(function (p) { return LETTERS[p]; }),
    stats: S.stats,
    sameAsHistory: sameCount(),
    pivotal: { scene: pivIdx + 1, reason: $('txtPivot').value.trim() },
    impacts: { joseon: $('imJ').value.trim(), japan: $('imN').value.trim(), ming: $('imM').value.trim() },
    essay: { decision: d, scene: (+si) + 1, reason: reason }
  };
  var body = {
    studentId: S.sid,
    studentName: S.name,
    gameName: CONFIG.GAME_NAME,
    choiceSummary: S.picks.map(function (p, i) { return (i + 1) + LETTERS[p]; }).join(' '),
    diffSummary: '실제 역사와 같은 선택 ' + sameCount() + '/' + SCENES.length + ' · 결정적 장면 ' + (pivIdx + 1),
    reflection: '[결정적 장면] ' + $('txtPivot').value.trim() + '\n[선택] ' + d + ' / 근거 장면 ' + ((+si) + 1) + '\n[이유] ' + reason,
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
  $('essayQ').textContent = ESSAY_Q;
  $('hintPivot').textContent = HINTS.pivotal;
  $('hintEssay').textContent = HINTS.essay;
  renderBg();
  $('btnLogin').addEventListener('click', login);
  $('btnStart').addEventListener('click', startSim);
  $('btnNext').addEventListener('click', nextScene);
  $('btnToResult').addEventListener('click', toResult);
  $('btnEffect').addEventListener('click', showEffect);
  $('btnSubmit').addEventListener('click', submit);
  $('btnCopy').addEventListener('click', function () { copyText(); });
  if (parseSid($('inSid').value) && $('inName').value.trim()) {
    S.sid = $('inSid').value.trim(); S.name = $('inName').value.trim();
    show('vIntro');
  } else show('vLogin');
  Glossary.start({ terms: GLOSSARY });
}
init();
