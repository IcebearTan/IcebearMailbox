/* ============================================================
   信箱应用逻辑
   读取 window.MAILBOX（data/letters.js）：
     - 渲染标题 / 恋爱计时 / 信封列表
     - 点击信封 → 拆信动画 → 读信浮层
   未来升级成动态版时，只需用接口返回的同结构数据
   替换 window.MAILBOX，页面代码无需改动。
   ============================================================ */
(function () {
  const $ = function (s) { return document.querySelector(s); };

  const CFG = window.MAILBOX || {};
  const letters = Array.isArray(CFG.letters) ? CFG.letters : [];
  let stampUid = 0;

  /* 信纸图片带时间戳：站长改/换 SVG、JPG 后刷新立即生效，不被缓存坑 */
  const ASSET_T = String(+new Date());
  function fresh(path) {
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + '_t=' + ASSET_T;
  }

  /* ---------------- 小工具 ---------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    return m ? { y: m[1], m: pad(m[2]), d: pad(m[3]) } : null;
  }

  function fmtDate(s) {
    const p = parseDate(s);
    return p ? p.y + '.' + p.m + '.' + p.d : (s || '');
  }

  /* ---------------- 邮票 / 邮戳（内联 SVG） ---------------- */

  /* 火漆上的小心心（经典主题封印） */
  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 20.2C7.6 16.9 3.6 13.4 3.6 9.4c0-2.6 2-4.6 4.5-4.6 1.6 0 3 .8 3.9 2.1' +
    'C12.9 5.6 14.3 4.8 15.9 4.8c2.5 0 4.5 2 4.5 4.6 0 4-4 7.5-8.4 10.8z"/></svg>';

  /* 七夕封印：双子星（牛郎星与织女星） */
  const STAR_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M9 3 C9.8 6.2 11.8 8.2 15 9 C11.8 9.8 9.8 11.8 9 15 C8.2 11.8 6.2 9.8 3 9 C6.2 8.2 8.2 6.2 9 3 Z"/>' +
    '<path d="M16.5 11 C17 13 18.5 14.5 20.5 15 C18.5 15.5 17 17 16.5 19 C16 17 14.5 15.5 12.5 15 C14.5 14.5 16 13 16.5 11 Z"/>' +
    '</svg>';

  /* 三款邮票图案：小太阳 / 心 / 月亮 */
  const STAMP_ART = [
    /* 太阳与山丘 */
    '<g stroke="#e2a23c" stroke-width="2" stroke-linecap="round">' +
    '<line x1="49" y1="30" x2="44" y2="30"/><line x1="11" y1="30" x2="16" y2="30"/>' +
    '<line x1="30" y1="11" x2="30" y2="16"/><line x1="30" y1="49" x2="30" y2="44"/>' +
    '<line x1="43.4" y1="16.6" x2="39.9" y2="20.1"/><line x1="16.6" y1="16.6" x2="20.1" y2="20.1"/>' +
    '<line x1="43.4" y1="43.4" x2="39.9" y2="39.9"/><line x1="16.6" y1="43.4" x2="20.1" y2="39.9"/></g>' +
    '<circle cx="30" cy="30" r="10" fill="#e2a23c"/>' +
    '<path d="M7 62 Q 22 48 36 58 T 55 56 L 55 66 L 7 66 Z" fill="#94a06b"/>',
    /* 心 */
    '<path d="M30 46 C 17 37 13 26 20 20 C 24 16 29 18.5 30 23 C 31 18.5 36 16 40 20 ' +
    'C 47 26 43 37 30 46 Z" fill="#c4655a"/>' +
    '<circle cx="18" cy="16" r="1.6" fill="#c4655a"/><circle cx="44" cy="52" r="1.6" fill="#c4655a"/>',
    /* 月亮与星 */
    '<path d="M37 14 a15 15 0 1 0 9 26 a12 12 0 1 1 -9 -26 Z" fill="#d9b96a"/>' +
    '<path d="M18 20 l1.6 3.4 3.4 .6 -2.5 2.4 .6 3.4 -3.1-1.7 -3.1 1.7 .6-3.4 -2.5-2.4 3.4-.6 Z" fill="#d9b96a"/>'
  ];

  /* 七夕邮票：喜鹊踏枝 */
  const STAMP_ART_QIXI =
    '<path d="M46 16 C46.5 18.5 48 20 50.5 20.5 C48 21 46.5 22.5 46 25 C45.5 22.5 44 21 41.5 20.5 C44 20 45.5 18.5 46 16 Z" fill="#f3d98b"/>' +
    '<path d="M8 58 Q 30 50 52 56" fill="none" stroke="#7d8f57" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M20 55 q2 -7 8 -8 M34 53 q1 -6 7 -6" fill="none" stroke="#7d8f57" stroke-width="1.4"/>' +
    '<path d="M22 42 l-9 13 l13 -6 z" fill="#151030"/>' +
    '<path d="M22 42 q10 -13 25 -9 q7 2 5 8 q-2 5 -10 6 q-12 2 -20 -5 z" fill="#151030"/>' +
    '<path d="M27 42 q8 5 17 3 q-3 5 -11 5 q-7 0 -6 -8 z" fill="#f6ecd4"/>' +
    '<path d="M30 37 q7 -4 12 -1" fill="none" stroke="#f3d98b" stroke-width="1.4" stroke-linecap="round"/>' +
    '<circle cx="43" cy="37" r="1" fill="#f3d98b"/>';

  function stampSVG(idx, theme) {
    const w = 60, h = 74, step = 7.5, r = 3.4;
    const qixi = theme === 'qixi';
    stampUid++;
    const maskId = 'stamp-mask-' + stampUid;

    /* 沿四边打一圈齿孔圆 */
    let dots = '';
    for (let x = 0; x <= w; x += step) {
      dots += '<circle cx="' + x + '" cy="0" r="' + r + '"/><circle cx="' + x + '" cy="' + h + '" r="' + r + '"/>';
    }
    for (let y = step; y < h; y += step) {
      dots += '<circle cx="0" cy="' + y + '" r="' + r + '"/><circle cx="' + w + '" cy="' + y + '" r="' + r + '"/>';
    }

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><mask id="' + maskId + '"><rect width="' + w + '" height="' + h + '" fill="#fff"/>' + dots + '</mask></defs>' +
      '<g mask="url(#' + maskId + ')">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + (qixi ? '#3b2a63' : '#f1e3c2') + '"/>' +
      (qixi ? STAMP_ART_QIXI : STAMP_ART[idx % STAMP_ART.length]) +
      '<rect x="5" y="5" width="' + (w - 10) + '" height="' + (h - 10) + '" fill="none" stroke="' + (qixi ? '#d9c06a' : '#a9885c') + '" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>' +
      '<text x="' + (w - 7) + '" y="' + (h - 7) + '" font-size="8" text-anchor="end" fill="' + (qixi ? '#d9c06a' : '#a9843f') + '" font-family="serif">' + (qixi ? '七夕' : '信') + '</text>' +
      '</g></svg>';
  }

  function postmarkSVG(date, theme) {
    const qixi = theme === 'qixi';
    stampUid++;
    const roughId = 'ink-rough-' + stampUid;
    const p = parseDate(date);
    const md = p ? p.m + '.' + p.d : String(date || '');
    const yy = p ? p.y : '';
    const topText = qixi ? '七夕' : yy;
    /* 右侧注销线：经典=三道波纹 / 七夕=小鹊桥+双星+飞鸟 */
    const side = qixi
      ? '<path d="M82 31 q7 -8 14 0 t14 0" stroke-width="1.7"/>' +
        '<path d="M86 44 q4 -3 8 0 q4 -3 8 0" stroke-width="1.4"/>' +
        '<path d="M108 20 C108.4 22 109.6 23.2 112 23.6 C109.6 24 108.4 25.2 108 27.2 C107.6 25.2 106.4 24 104 23.6 C106.4 23.2 107.6 22 108 20 Z" fill="currentColor" stroke="none"/>' +
        '<path d="M113 38 C113.3 39.5 114.2 40.4 116 40.7 C114.2 41 113.3 41.9 113 43.4 C112.7 41.9 111.8 41 110 40.7 C111.8 40.4 112.7 39.5 113 38 Z" fill="currentColor" stroke="none"/>'
      : '<path d="M84 27 q5 -4 10 0 t10 0 t10 0 t10 0" stroke-width="1.8"/>' +
        '<path d="M84 38 q5 -4 10 0 t10 0 t10 0 t10 0" stroke-width="1.8"/>' +
        '<path d="M84 49 q5 -4 10 0 t10 0 t10 0 t10 0" stroke-width="1.8"/>';
    /* 湍流置换滤镜：油墨毛边，像真的手工盖章 */
    const rough =
      '<defs><filter id="' + roughId + '" x="-8%" y="-8%" width="116%" height="116%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter></defs>';
    return '<svg viewBox="0 0 132 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="currentColor">' +
      rough +
      '<g filter="url(#' + roughId + ')">' +
      '<circle cx="48" cy="37" r="31" stroke-width="2.4"/>' +
      '<circle cx="48" cy="37" r="26" stroke-width="1"/>' +
      '<line x1="24" y1="29" x2="72" y2="29" stroke-width="1"/>' +
      '<line x1="24" y1="45" x2="72" y2="45" stroke-width="1"/>' +
      (topText ? '<text x="48" y="26" text-anchor="middle" font-size="' + (qixi ? 10 : 8.5) + '" fill="currentColor" stroke="none">' + esc(topText) + '</text>' : '') +
      '<text x="48" y="42.5" text-anchor="middle" font-size="13" fill="currentColor" stroke="none">' + esc(md) + '</text>' +
      side +
      '</g></svg>';
  }

  /* ---------------- 七夕装饰（鹊桥与星座由 canvas 渲染，这里只留喜鹊） ---------------- */

  /* 喜鹊：振翅小鸟 */
  const MAGPIE_SVG =
    '<svg class="magpie" width="34" height="20" viewBox="0 0 34 20" aria-hidden="true">' +
    '<g class="wing"><path d="M3 12 Q13 0 23 8 Q29 3 33 10 Q26 13 19 11 Q11 15 3 12 Z" fill="#191231" stroke="rgba(231,196,106,.55)" stroke-width=".8"/></g>' +
    '<path d="M7 12 L0 19 L9 15 Z" fill="#191231" stroke="rgba(231,196,106,.4)" stroke-width=".6"/>' +
    '</svg>';

  const QIXI_DECO =
    '<div class="magpie-flock">' + MAGPIE_SVG + MAGPIE_SVG + MAGPIE_SVG + '</div>' +
    '<div class="magpie-flock f2">' + MAGPIE_SVG + MAGPIE_SVG + '</div>';

  /* ---------------- 信封 DOM ---------------- */

  function envelopeHTML(letter, idx, mini) {
    const theme = letter.theme === 'qixi' ? 'qixi' : 'classic';
    const sealIcon = theme === 'qixi' ? STAR_SVG : HEART_SVG;
    const first = (letter.pages && letter.pages[0]) || '';
    return '<button class="envelope' + (mini ? ' mini' : '') + '" data-idx="' + idx + '" data-skin="' + theme + '"' +
      ' aria-label="拆开 ' + esc(fmtDate(letter.date)) + ' 的信：' + esc(letter.title || '无题') + '">' +
      '<span class="env-float"><span class="env-scene">' +
      '<span class="env-back"></span>' +
      '<span class="env-letter">' + (first ? '<img src="' + esc(fresh(first)) + '" alt="" loading="lazy">' : '') + '</span>' +
      '<span class="env-pocket"></span>' +
      '<span class="env-flap"></span>' +
      '<span class="env-stamp">' + stampSVG(idx, theme) + '</span>' +
      '<span class="env-postmark">' + postmarkSVG(letter.date, theme) + '</span>' +
      '<span class="env-seal" aria-hidden="true">' +
      '<span class="seal-wax">' + sealIcon + '</span>' +
      '</span>' +
      '</span></span>' +
      '<span class="env-caption">' +
      '<span class="env-date">' + esc(fmtDate(letter.date)) + '</span>' +
      '<span class="env-title">' + esc(letter.title || '无题') + '</span>' +
      (letter.excerpt && !mini ? '<span class="env-excerpt">' + esc(letter.excerpt) + '</span>' : '') +
      '</span>' +
      '</button>';
  }

  /* ---------------- 页面装配 ---------------- */

  const heroSlot = $('#heroSlot');
  const shelfSection = $('#shelfSection');
  const shelfTray = $('#shelfTray');
  const layer = $('#readingLayer');
  const backdrop = $('#readingBackdrop');
  const readingTitle = $('#readingTitle');
  const readingDate = $('#readingDate');
  const readingPages = $('#readingPages');
  const readingClose = $('#readingClose');
  const bgA = $('#bgA');
  const bgB = $('#bgB');
  const qixiDeco = $('#qixiDeco');
  const loveBox = $('#loveBox');
  const calLayer = $('#calendarLayer');
  const calBackdrop = $('#calendarBackdrop');
  const calTitle = $('#calTitle');
  const calSub = $('#calSub');
  const calGrid = $('#calGrid');

  /* ---------------- 主题引擎（换肤）：双层背景交叉淡入 ---------------- */

  let currentTheme = null;
  let bgFront = null;
  let themeTimer = null;

  function setTheme(name) {
    name = name === 'qixi' ? 'qixi' : 'classic';
    if (name === currentTheme) return;
    currentTheme = name;
    document.body.dataset.theme = name;

    if (bgA && bgB) {
      const show = bgFront === bgA ? bgB : bgA;
      show.className = 'theme-bg ' + name;
      if (bgFront) {
        const hide = bgFront;
        requestAnimationFrame(function () {
          show.classList.add('on');
          if (themeTimer) clearTimeout(themeTimer);
          themeTimer = setTimeout(function () { hide.classList.remove('on'); }, 80);
        });
      } else {
        show.classList.add('on');   /* 首次进入：直接铺上 */
      }
      bgFront = show;
    }

    if (window.FX && window.FX.setTheme) window.FX.setTheme(name);
  }

  /* 标题 / 副标题 / 页脚 */
  const siteTitle = CFG.siteTitle || '给你的信';
  document.title = siteTitle;
  $('#siteTitle').textContent = siteTitle;
  $('#siteSub').textContent = CFG.subtitle || '';
  $('#siteFoot').textContent = CFG.footerText || '❋ 纸短情长 ❋';

  /* ---------------- 恋爱计时：右上角小方框 ---------------- */

  let loveStart = null;
  let loveDays = null;

  (function initLoveBox() {
    if (CFG.startDate) {
      const p = parseDate(CFG.startDate);
      if (p) {
        loveStart = new Date(+p.y, +p.m - 1, +p.d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        loveDays = Math.floor((today - loveStart) / 86400000) + 1;
        if (loveDays < 1) loveDays = 1;
      }
    }
    if (!loveBox) return;
    loveBox.hidden = false;
    if (loveStart) {
      $('#loveDays').textContent = loveDays;
      $('#loveSince').textContent = 'since ' + fmtDate(CFG.startDate);
    } else {
      loveBox.querySelector('.love-num').textContent = '设置 startDate';
      $('#loveSince').textContent = 'data/letters.js';
    }
  })();

  /* ---------------- 恋爱日历 ----------------
     标注：每月恋爱纪念日 ❤ / 周年大 ❤ / 固定节日 ✦ / 自定义日子 ✿ */

  const FESTIVALS_FIXED = [
    { md: '01-01', name: '元旦' },
    { md: '02-14', name: '情人节' },
    { md: '03-14', name: '白色情人节' },
    { md: '05-20', name: '520' },
    { md: '12-25', name: '圣诞节' }
  ];
  /* 农历节日逐年不同，按年登记（2026 七夕 = 8月19日） */
  const FESTIVALS_ONCE = { '2026-08-19': '七夕' };

  let calY = 0, calM = 0;

  function customDates() {
    const lc = CFG.loveCalendar || {};
    return Array.isArray(lc.customDates) ? lc.customDates : [];
  }

  /* 某天有什么标记 */
  function dayInfo(y, m, d) {
    const info = {};
    const iso = y + '-' + pad(m + 1) + '-' + pad(d);
    const md = pad(m + 1) + '-' + pad(d);

    if (FESTIVALS_ONCE[iso]) {
      info.fest = FESTIVALS_ONCE[iso];
    } else {
      for (let i = 0; i < FESTIVALS_FIXED.length; i++) {
        if (FESTIVALS_FIXED[i].md === md) { info.fest = FESTIVALS_FIXED[i].name; break; }
      }
    }
    customDates().forEach(function (c) {
      if (c.date === iso && c.name) info.custom = c.name;
    });

    if (loveStart) {
      if (d === loveStart.getDate()) {
        const months = (y - loveStart.getFullYear()) * 12 + (m - loveStart.getMonth());
        if (months > 0) info.anniv = '在一起满 ' + months + ' 个月';
      }
      if (m === loveStart.getMonth() && d === loveStart.getDate() &&
          y > loveStart.getFullYear()) {
        info.annivBig = '恋爱 ' + (y - loveStart.getFullYear()) + ' 周年 ❤';
      }
    }
    return info;
  }

  function renderCalendar() {
    calTitle.textContent = calY + ' 年 ' + (calM + 1) + ' 月';
    calSub.textContent = loveStart
      ? '自 ' + fmtDate(CFG.startDate) + ' 起 · 今天是第 ' + loveDays + ' 天 ❤'
      : '（在 data/letters.js 里设置 startDate 后，这里会标出每个月的纪念日）';

    const offset = (new Date(calY, calM, 1).getDay() + 6) % 7;   /* 周一开头 */
    const daysInMonth = new Date(calY, calM + 1, 0).getDate();
    const today = new Date();

    let html = '';
    for (let i = 0; i < offset; i++) html += '<span class="cal-day dim"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const info = dayInfo(calY, calM, d);
      const cls = ['cal-day'];
      let tip = '';
      if (today.getFullYear() === calY && today.getMonth() === calM && today.getDate() === d) {
        cls.push('today');
      }
      if (info.annivBig) { cls.push('anniv-big'); tip = info.annivBig; }
      else if (info.anniv) { cls.push('anniv'); tip = info.anniv; }
      if (info.fest) { cls.push('fest'); tip = (tip ? tip + ' · ' : '') + info.fest; }
      if (info.custom) { cls.push('custom'); tip = (tip ? tip + ' · ' : '') + info.custom; }
      html += '<span class="cal-day ' + cls.join(' ') + '"' +
        (tip ? ' title="' + esc(tip) + '"' : '') + '>' + d + '</span>';
    }
    calGrid.innerHTML = html;
  }

  function openCalendar() {
    const now = new Date();
    calY = now.getFullYear();
    calM = now.getMonth();
    renderCalendar();
    calLayer.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { calLayer.classList.add('show'); });
    });
    document.body.classList.add('no-scroll');
    const btn = document.getElementById('calendarClose');
    if (btn) btn.focus();
  }

  function closeCalendar() {
    if (calLayer.hidden) return;
    calLayer.classList.remove('show');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { calLayer.hidden = true; }, 360);
    if (loveBox) loveBox.focus();
  }

  function shiftMonth(delta) {
    calM += delta;
    if (calM < 0) { calM = 11; calY--; }
    else if (calM > 11) { calM = 0; calY++; }
    renderCalendar();
  }

  if (loveBox) loveBox.addEventListener('click', openCalendar);
  document.getElementById('calPrev').addEventListener('click', function () { shiftMonth(-1); });
  document.getElementById('calNext').addEventListener('click', function () { shiftMonth(1); });
  document.getElementById('calToday').addEventListener('click', function () {
    const now = new Date();
    calY = now.getFullYear(); calM = now.getMonth();
    renderCalendar();
  });
  document.getElementById('calendarClose').addEventListener('click', closeCalendar);
  if (calBackdrop) calBackdrop.addEventListener('click', closeCalendar);

  /* 信封列表 + 主屏轮换（皮肤预览式） */
  let selectedIdx = 0;

  function renderHero() {
    const wrap = $('#heroEnvelope');
    if (wrap) wrap.innerHTML = envelopeHTML(letters[selectedIdx], selectedIdx, false);
  }

  function updateShelfActive() {
    shelfTray.querySelectorAll('.envelope.mini').forEach(function (b) {
      const on = +b.dataset.idx === selectedIdx;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  /* 皮肤预览栏跟随：把选中的小信封平滑滚到正中 */
  function centerSelected() {
    const scrollEl = document.querySelector('.shelf-scroll');
    if (!scrollEl) return;
    const el = shelfTray.querySelector('.envelope.mini[data-idx="' + selectedIdx + '"]');
    if (!el) return;
    const sr = scrollEl.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const target = scrollEl.scrollLeft + (er.left - sr.left) + er.width / 2 - scrollEl.clientWidth / 2;
    scrollEl.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  /* 预加载：选中或拆信时，趁换装/拆信动画的间隙把信纸先拉下来 */
  function prefetchPages(letter) {
    ((letter && letter.pages) || []).forEach(function (p) {
      const im = new Image();
      im.src = fresh(p);
    });
  }

  /* 换信 = 换主屏信封 + 换整站皮肤 + 预览栏跟随 */
  function selectLetter(idx) {
    const n = letters.length;
    if (!n) return;
    selectedIdx = ((idx % n) + n) % n;
    renderHero();
    setTheme(letters[selectedIdx].theme);
    updateShelfActive();
    centerSelected();
    prefetchPages(letters[selectedIdx]);
  }

  if (!letters.length) {
    heroSlot.innerHTML = '<div class="empty-card">信箱还空着，等第一封信来 ✉</div>';
  } else {
    heroSlot.innerHTML =
      '<div class="hero-stage">' +
      '<button class="hero-arrow" id="heroPrev" aria-label="上一封信">❮</button>' +
      '<div class="hero-envelope" id="heroEnvelope"></div>' +
      '<button class="hero-arrow" id="heroNext" aria-label="下一封信">❯</button>' +
      '</div>' +
      '<p class="hero-hint">点按火漆 · 拆开这封信 ✧</p>';
    renderHero();

    /* 两侧切换箭头（信多才有意义） */
    const heroPrev = document.getElementById('heroPrev');
    const heroNext = document.getElementById('heroNext');
    if (letters.length > 1) {
      heroPrev.addEventListener('click', function () { selectLetter(selectedIdx - 1); });
      heroNext.addEventListener('click', function () { selectLetter(selectedIdx + 1); });
    } else {
      heroPrev.hidden = true;
      heroNext.hidden = true;
    }

    /* 信箱托盘 = 皮肤预览栏：全部信入列，跟随选中项滚动居中 */
    shelfSection.hidden = false;
    shelfTray.innerHTML = letters
      .map(function (L, i) { return envelopeHTML(L, i, true); })
      .join('');
    updateShelfActive();
    requestAnimationFrame(centerSelected);

    /* 第一屏提示：托盘看不见时引导下滑，看见了就淡出 */
    heroSlot.insertAdjacentHTML('beforeend',
      '<button class="scroll-hint" id="scrollHint" aria-label="滑到信箱托盘看全部信">' +
      '<span>往下翻 · 信箱里有 ' + letters.length + ' 封信</span>' +
      '<span class="chev" aria-hidden="true">▾</span>' +
      '</button>');
    var scrollHint = document.getElementById('scrollHint');
    scrollHint.addEventListener('click', function () {
      shelfSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          scrollHint.classList.toggle('gone', en.isIntersecting);
        });
      }, { threshold: 0.15 }).observe(shelfSection);
    }
  }

  /* 七夕装饰常驻 DOM，只在 data-theme=qixi 时浮现 */
  if (qixiDeco) qixiDeco.innerHTML = QIXI_DECO;

  /* 初始主题 = 当前选中（第一封）的主题 */
  setTheme(letters[0] && letters[0].theme);

  /* ---------------- 拆信与读信 ---------------- */

  let currentEnv = null;    // 当前拆开的信封实例
  let currentIdx = -1;      // 浮层里正在读的信
  let lastFocus = null;

  function openLetter(idx, btn) {
    if (currentEnv && currentEnv.busy) return;   // 上一封还没合上
    lastFocus = btn;
    prefetchPages(letters[idx]);                 // 拆信动画 ~2.2s，趁机下载信纸
    currentEnv = new Envelope(btn);
    currentEnv.open(function () { showReading(idx, true); });
  }

  function showReading(idx, animateIn) {
    currentIdx = idx;
    const L = letters[idx] || {};
    readingTitle.textContent = L.title || '无题';
    readingDate.textContent = fmtDate(L.date);
    setTheme(L.theme);   /* 读哪封信，整站就换哪套皮肤 */

    /* 同步主屏选中态（在浮层后面悄悄换好） */
    selectedIdx = idx;
    renderHero();
    updateShelfActive();
    currentEnv = null;   /* 旧信封 DOM 已被重渲染，无需再演合上动画 */

    if (L.pages && L.pages.length) {
      readingPages.innerHTML = L.pages.map(function (p, i) {
        return '<figure class="page-wrap"><img src="' + esc(fresh(p)) + '" alt="' +
          esc(fmtDate(L.date)) + ' 的手写信 · 第 ' + (i + 1) + ' 页"></figure>';
      }).join('');
    } else {
      readingPages.innerHTML = '<p class="pages-empty">这一封还没有放进信纸哦</p>';
    }

    layer.hidden = false;
    /* 双 rAF：确保 [hidden] 移除后过渡能触发 */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        layer.classList.add('show');
        if (animateIn && readingPages.animate) {
          readingPages.animate(
            [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
            { duration: 320, easing: 'ease-out' }
          );
        }
      });
    });
    document.body.classList.add('no-scroll');
    readingClose.focus();
  }

  function hideReading() {
    if (layer.hidden) return;
    layer.classList.remove('show');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { layer.hidden = true; }, 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    /* 合上信：保持当前选中这封的皮肤 */
    setTheme(letters[selectedIdx] && letters[selectedIdx].theme);
    if (currentEnv && currentEnv.el.isConnected) currentEnv.close();
    currentEnv = null;
  }

  /* 信封点击：主屏信封=拆信；托盘小信封=皮肤预览选信 */
  heroSlot.addEventListener('click', function (e) {
    const btn = e.target.closest('.envelope');
    if (btn) openLetter(+btn.dataset.idx, btn);
  });
  shelfTray.addEventListener('click', function (e) {
    const btn = e.target.closest('.envelope.mini');
    if (btn) selectLetter(+btn.dataset.idx);
  });

  readingClose.addEventListener('click', hideReading);
  backdrop.addEventListener('click', hideReading);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!calLayer.hidden) closeCalendar();
      else if (!layer.hidden) hideReading();
      return;
    }
    if (!layer.hidden || !calLayer.hidden) return;
    /* 左右方向键也能换信（循环） */
    if (e.key === 'ArrowLeft') selectLetter(selectedIdx - 1);
    else if (e.key === 'ArrowRight') selectLetter(selectedIdx + 1);
  });
})();
