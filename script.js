/* script.js — ระบบฉาก การโต้ตอบ และการคำนวณวันที่ (ข้อความทั้งหมดมาจาก content.js) */
(function () {
  'use strict';

  var C = window.siteContent || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function str(v) { return typeof v === 'string' ? v : ''; }   // กัน undefined/null ไม่ให้โผล่บนหน้าจอ
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  /* ---------- วันที่ ---------- */
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function fmtEn(p) { return p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y; }
  function fmtTh(p) { return p.d + ' ' + THAI_MONTHS[p.m - 1] + ' ' + p.y; }
  // ระยะเวลาตามปฏิทินจริง (ไม่หารมิลลิวินาที)
  function span(a, b) {
    var y = b.y - a.y, m = b.m - a.m, d = b.d - a.d;
    if (d < 0) { m--; d += new Date(b.y, b.m - 1, 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y: y, m: m, d: d };
  }
  function fmtSpan(s) {
    var out = [];
    if (s.y) out.push(s.y + ' ปี');
    if (s.m) out.push(s.m + ' เดือน');
    if (s.d) out.push(s.d + ' วัน');
    return out.join(' ');
  }
  var start = parseDate(C.startDate), end = parseDate(C.anniversaryDate);

  /* ---------- ผูกข้อความจาก content.js ---------- */
  $$('[data-bind]').forEach(function (n) { n.textContent = str(C[n.getAttribute('data-bind')]); });
  document.title = str(C.title) || 'Our Little Universe';
  if (start && end) {
    $('#intro-dates').textContent = fmtEn(start) + ' — ' + fmtEn(end);
    $('#intro-duration').textContent = fmtSpan(span(start, end));
    $('#l-date').textContent = 'วันที่: ' + fmtEn(end);
  }
  if (str(C.creatorName)) $('#l-from').textContent = 'FROM: ' + C.creatorName;
  else $('#l-from').hidden = true;

  /* ---------- พื้นหลังดาว (สร้างครั้งเดียว) ---------- */
  (function buildStars() {
    var box = $('#stars');
    var n = window.matchMedia('(max-width:600px)').matches ? 55 : 90;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'), z = Math.random();
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.width = s.style.height = (1 + z * 2) + 'px';
      if (z > 0.45) {
        s.className = 'tw';
        s.style.animationDelay = (-Math.random() * 6) + 's';
        s.style.animationDuration = (4 + Math.random() * 5) + 's';
      }
      box.appendChild(s);
    }
  })();

  /* ---------- ระบบฉาก ---------- */
  var scenes = {};
  $$('.scene').forEach(function (s) { scenes[s.getAttribute('data-scene')] = s; });
  var current = 'intro';
  var revealTimer = null, activeReveal = null;

  function stopReveal() { clearTimeout(revealTimer); revealTimer = null; activeReveal = null; }

  // เผยรายการทีละข้อ (ข้ามได้ด้วย showAll)
  function reveal(items, gap, done) {
    stopReveal();
    items.forEach(function (e) { e.classList.remove('shown'); });
    if (reduceMotion) { showAll(items, done); return; }
    activeReveal = { items: items, done: done };
    var i = 0;
    (function step() {
      if (i >= items.length) { revealTimer = null; activeReveal = null; if (done) done(); return; }
      items[i++].classList.add('shown');
      revealTimer = setTimeout(step, gap);
    })();
  }
  function showAll(items, done) {
    stopReveal();
    items.forEach(function (e) { e.classList.add('shown'); });
    if (done) done();
  }

  function go(name) {
    if (!scenes[name]) return;
    stopReveal();
    document.body.classList.remove('glow');
    Object.keys(scenes).forEach(function (k) {
      scenes[k].hidden = k !== name;
      scenes[k].classList.toggle('on', k === name);
    });
    current = name;
    scenes[name].scrollTop = 0;
    if (name === 'letter') resetLetter();
    if (name === 'ending') startEnding();
    var h = $('[tabindex="-1"]', scenes[name]);
    if (h) h.focus({ preventScroll: true });
  }

  // ปุ่มนำทางทั้งหมด (data-go) ใช้ event เดียว ไม่ผูกซ้ำ
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(b.getAttribute('data-go'));
  });

  /* ---------- Modal ---------- */
  var modal = $('#modal');
  function mediaFrame(src, alt) {
    var f = el('div', 'frame');
    var ph = el('div', 'ph', src ? 'ยังไม่พบภาพ\nเพิ่มไฟล์ที่ ' + src : 'ยังไม่ได้เพิ่มภาพ');
    ph.style.whiteSpace = 'pre-line';
    f.appendChild(ph);
    if (src) {
      var im = new Image();
      im.alt = alt || '';
      im.onload = function () { f.textContent = ''; f.appendChild(im); };
      im.src = src;
    }
    return f;
  }
  function openModal(o) {
    var media = $('#m-media');
    media.textContent = '';
    if (o.media) media.appendChild(o.media);
    $('#m-title').textContent = str(o.title);
    $('#m-date').textContent = str(o.date);
    $('#m-date').hidden = !o.date;
    $('#m-text').textContent = str(o.text);
    $('#m-text').hidden = !o.text;
    if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
    $('#m-close').focus();
  }
  function closeModal() { if (modal.close) modal.close(); else modal.removeAttribute('open'); }
  $('#m-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); }); // คลิกพื้นหลังเพื่อปิด
  // ปุ่ม Escape ปิด dialog ให้อัตโนมัติ

  /* ---------- ฉาก 2: ดาว ---------- */
  var seen = {};
  var stars = Array.isArray(C.stars) ? C.stars : [];
  var progress = $('#map-progress');
  function updateProgress() {
    var n = Object.keys(seen).length;
    progress.textContent = 'สำรวจแล้ว ' + n + ' จาก ' + stars.length + ' ดวง';
  }
  stars.forEach(function (s) {
    var b = el('button', 'star');
    b.type = 'button';
    b.style.left = (Number(s.x) || 50) + '%';
    b.style.top = (Number(s.y) || 50) + '%';
    b.appendChild(el('span', 'dot'));
    b.appendChild(el('span', 'name', str(s.label)));
    var sub = el('span', 'sub', str(s.hint));
    b.appendChild(sub);
    b.title = str(s.hint);
    b.addEventListener('click', function () {
      seen[s.id] = true;
      b.classList.add('seen');
      sub.textContent = '✓ เปิดแล้ว';
      updateProgress();
      if (s.action === 'modal') {
        openModal({ title: s.modalTitle || s.label, date: start ? fmtTh(start) : '', text: s.modalText });
      } else if (s.action === 'memories' || s.action === 'letter') {
        go(s.action);
      }
    });
    $('#skymap').appendChild(b);
  });
  updateProgress();

  /* ---------- ฉาก 3: แกลเลอรี ---------- */
  (Array.isArray(C.memories) ? C.memories : []).forEach(function (m) {
    var b = el('button', 'mem');
    b.type = 'button';
    b.appendChild(mediaFrame(str(m.image), str(m.title)));
    b.appendChild(el('span', 'c-title', str(m.title)));
    if (m.date) b.appendChild(el('span', 'c-date', m.date));
    b.addEventListener('click', function () {
      openModal({ media: mediaFrame(str(m.image), str(m.title)), title: m.title, date: m.date, text: m.description });
    });
    $('#gallery').appendChild(b);
  });

  /* ---------- ฉาก 4: จดหมาย ---------- */
  var letterItems = [];
  (Array.isArray(C.letterParagraphs) ? C.letterParagraphs : []).forEach(function (t) {
    var p = el('p', 'rv', str(t));
    $('#l-body').appendChild(p);
  });
  var signLine = $('#l-sign');
  if (str(C.creatorName)) signLine.textContent = '— ' + C.creatorName; else signLine.hidden = true;
  letterItems = [$('.l-intro')].concat($$('#l-body .rv'), signLine.hidden ? [] : [signLine]);

  function resetLetter() {
    $('#letter-prep').hidden = false;
    $('#letter').hidden = true;
    letterItems.forEach(function (e) { e.classList.remove('shown'); });
  }
  $('#open-letter').addEventListener('click', function () {
    $('#letter-prep').hidden = true;
    $('#letter').hidden = false;
    reveal(letterItems, 1800, function () { $('#skip-letter').hidden = true; });
    $('#skip-letter').hidden = false;
  });
  $('#skip-letter').addEventListener('click', function () {
    showAll(letterItems, function () { $('#skip-letter').hidden = true; });
  });

  /* ---------- ฉาก 5: ตอนจบ ---------- */
  var endItems = [];
  (Array.isArray(C.encouragementMessages) ? C.encouragementMessages : []).forEach(function (t) {
    var p = el('p', 'rv', str(t));
    $('#end-body').appendChild(p);
    endItems.push(p);
  });
  function endDone() { document.body.classList.add('glow'); $('#skip-end').hidden = true; }
  function startEnding() {
    $('#skip-end').hidden = false;
    reveal(endItems, 2600, endDone);
  }
  $('#skip-end').addEventListener('click', function () { showAll(endItems, endDone); });

  go('intro');
})();
