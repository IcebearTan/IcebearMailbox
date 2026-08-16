/* ============================================================
   氛围粒子（主题感知）
   - 背景层（#fx-canvas，z1）：classic=暖色光斑缓浮 / qixi=星子闪烁
   - 前景层（#fx-top-canvas，z90）：拆封迸溅，浮在内容之上
   挂在 window.FX：burst(x, y) 迸溅；setTheme(name) 切换粒子皮肤
   ============================================================ */
(function () {
  const bgCanvas = document.getElementById('fx-canvas');
  const topCanvas = document.getElementById('fx-top-canvas');
  if (!bgCanvas || !topCanvas || !bgCanvas.getContext) return;
  const ctx = bgCanvas.getContext('2d');
  const tctx = topCanvas.getContext('2d');

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, raf = null, lastT = 0;
  const motes = [];   // 常驻光斑/星子（背景层）
  const sparks = [];  // 迸溅火花（前景层）

  /* ---- 主题调色板 ---- */
  const PALETTES = {
    classic: {
      motes: ['255,224,150', '255,243,214', '255,201,139'],
      sparks: ['255,206,100', '224,106,85']     // 金屑 + 火漆红
    },
    qixi: {
      motes: ['255,255,255', '255,233,168', '203,180,255'],
      sparks: ['255,214,120', '195,160,255']    // 金屑 + 星紫
    }
  };
  let themeName = 'classic';
  let moteSprites = null;
  let sparkSprites = null;

  /* ---- 预渲染发光贴图 ---- */
  const spriteCache = {};
  function makeSprite(rgb) {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(' + rgb + ', 1)');
    grad.addColorStop(0.3, 'rgba(' + rgb + ', .55)');
    grad.addColorStop(1, 'rgba(' + rgb + ', 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }
  function getSprite(rgb) {
    if (!spriteCache[rgb]) spriteCache[rgb] = makeSprite(rgb);
    return spriteCache[rgb];
  }
  function applyPalette(name) {
    const pal = PALETTES[name] || PALETTES.classic;
    moteSprites = pal.motes.map(getSprite);
    sparkSprites = pal.sparks.map(getSprite);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function newMote(fromBottom) {
    const big = Math.random() < (themeName === 'qixi' ? 0.08 : 0.16);
    return {
      bx: rand(0, W),
      y: fromBottom ? H + rand(10, 60) : rand(0, H),
      r: big ? rand(30, 52) : rand(themeName === 'qixi' ? 2 : 5, themeName === 'qixi' ? 7 : 13),
      vy: rand(7, 20),
      swayAmp: rand(6, 22),
      swayFreq: rand(0.00016, 0.00042),
      twFreq: themeName === 'qixi' ? rand(0.0015, 0.0042) : rand(0.0008, 0.0022),
      phase: rand(0, Math.PI * 2),
      alpha: big ? rand(0.05, 0.1) : rand(0.18, 0.5),
      sprite: moteSprites[(Math.random() * moteSprites.length) | 0]
    };
  }

  function seedMotes() {
    motes.length = 0;
    const n = Math.max(16, Math.min(themeName === 'qixi' ? 64 : 46, Math.round(W * H / 24000)));
    for (let i = 0; i < n; i++) motes.push(newMote(false));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [bgCanvas, topCanvas].forEach(function (c) {
      c.width = W * dpr;
      c.height = H * dpr;
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedMotes();
  }

  function drawMote(m, t) {
    const x = m.bx + Math.sin(t * m.swayFreq + m.phase) * m.swayAmp;
    const a = m.alpha * (0.65 + 0.35 * Math.sin(t * m.twFreq + m.phase * 2));
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(m.sprite, x - m.r, m.y - m.r, m.r * 2, m.r * 2);
  }

  function step(t) {
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    ctx.clearRect(0, 0, W, H);
    tctx.clearRect(0, 0, W, H);

    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.y -= m.vy * dt;
      if (m.y < -m.r - 10) motes[i] = newMote(true);
      drawMote(m, t);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vy += 520 * dt;
      s.vx *= 1 - 1.4 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      tctx.globalAlpha = Math.max(0, s.life / s.maxLife);
      const r = s.r * (0.5 + 0.5 * s.life / s.maxLife);
      tctx.drawImage(s.sprite, s.x - r, s.y - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 1;
    tctx.globalAlpha = 1;
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (raf || REDUCED) return;
    lastT = performance.now();
    raf = requestAnimationFrame(step);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  applyPalette('classic');

  window.FX = {
    /* 在 (x, y)（视口坐标）迸溅一簇火花：中心闪光 + 上扬碎屑 */
    burst: function (x, y) {
      if (REDUCED) return;
      sparks.push({ x: x, y: y, vx: 0, vy: -20, life: .38, maxLife: .38, r: 30, sprite: sparkSprites[0] });
      const n = 34;
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI * 2);
        const speed = rand(120, 340);
        const life = rand(0.6, 1.1);
        sparks.push({
          x: x, y: y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - rand(60, 200),
          life: life, maxLife: life,
          r: rand(4, 9),
          sprite: i % 6 === 0 ? sparkSprites[1] : sparkSprites[0]
        });
      }
    },

    /* 切换粒子皮肤：classic 暖光斑 / qixi 星子 */
    setTheme: function (name) {
      themeName = PALETTES[name] ? name : 'classic';
      applyPalette(themeName);
      motes.forEach(function (m) {
        m.sprite = moteSprites[(Math.random() * moteSprites.length) | 0];
      });
      if (REDUCED) {
        ctx.clearRect(0, 0, W, H);
        const t = performance.now();
        for (const m of motes) drawMote(m, t);
      }
    }
  };

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  if (REDUCED) {
    const t = performance.now();
    for (const m of motes) drawMote(m, t);
  } else {
    start();
  }
})();
