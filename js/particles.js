/* ============================================================
   氛围粒子与星空（主题感知）
   - 背景层（#fx-canvas，z1）
       classic：暖色光斑缓浮（source-over 柔光）
       qixi   ：摄影感星空 —— 加性混合星体（亮核+光晕+衍射星芒）、
                银河星带（密集星+星云亮斑+尘埃暗带，离屏一次烘焙）、
                天琴座/天鹰座真实连线，织女星/牛郎星高亮加签
   - 前景层（#fx-top-canvas，z90）：拆封迸溅
   挂在 window.FX：burst(x,y) / setTheme(name)
   ============================================================ */
(function () {
  const bgCanvas = document.getElementById('fx-canvas');
  const topCanvas = document.getElementById('fx-top-canvas');
  if (!bgCanvas || !topCanvas || !bgCanvas.getContext) return;
  const ctx = bgCanvas.getContext('2d');
  const tctx = topCanvas.getContext('2d');

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, raf = null, lastT = 0;
  const motes = [];
  const sparks = [];

  /* 主题淡入量：0=无星空，1=满星空，随 setTheme 缓动 */
  let themeName = 'classic';
  let themeAlpha = 0;
  let themeTarget = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------------- 贴图工厂 ---------------- */

  /* 柔光晕（经典暖光斑 / 星云亮斑） */
  function makeGlow(rgb) {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(' + rgb + ', .95)');
    grad.addColorStop(0.35, 'rgba(' + rgb + ', .4)');
    grad.addColorStop(1, 'rgba(' + rgb + ', 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }

  /* 摄影感星体：光晕 + 可选衍射星芒 + 灼亮核心，全部加性烘焙 */
  function makeStar(coreRGB, haloRGB, spikes) {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';

    let gr = g.createRadialGradient(64, 64, 0, 64, 64, 60);
    gr.addColorStop(0, 'rgba(' + haloRGB + ', .55)');
    gr.addColorStop(0.3, 'rgba(' + haloRGB + ', .16)');
    gr.addColorStop(1, 'rgba(' + haloRGB + ', 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);

    if (spikes) {
      const spike = function (x0, y0, x1, y1) {
        const lg = g.createLinearGradient(x0, y0, x1, y1);
        lg.addColorStop(0, 'rgba(255,255,255,.9)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = lg;
        g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      };
      spike(64, 6, 64, 122);
      spike(6, 64, 122, 64);
      g.globalAlpha = 0.32;
      spike(22, 22, 106, 106);
      spike(106, 22, 22, 106);
      g.globalAlpha = 1;
    }

    gr = g.createRadialGradient(64, 64, 0, 64, 64, 11);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(' + coreRGB + ', .95)');
    gr.addColorStop(1, 'rgba(' + coreRGB + ', 0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(64, 64, 11, 0, 7); g.fill();
    return c;
  }

  /* ---------------- 贴图集 ---------------- */

  const WARM_GLOWS = ['255,224,150', '255,243,214', '255,201,139'].map(makeGlow);
  const NEBULAS = [makeGlow('150,120,255'), makeGlow('170,120,220'), makeGlow('255,220,170')];

  const STAR_SMALL = [
    makeStar('255,255,255', '235,240,255', false),
    makeStar('255,244,214', '255,233,168', false),
    makeStar('235,225,255', '203,180,255', false),
    makeStar('255,255,255', '255,255,255', false)
  ];
  const STAR_VEGA = makeStar('225,235,255', '190,210,255', true);    // 织女星：蓝白
  const STAR_ALTAIR = makeStar('255,246,224', '255,225,170', true);  // 牛郎星：暖白

  const SPARKS = {
    classic: [makeGlow('255,206,100'), makeGlow('224,106,85')],
    qixi: [makeGlow('255,214,120'), makeGlow('195,160,255')]
  };

  /* ---------------- 光斑 / 星子 ---------------- */

  function newMote(fromBottom) {
    const qixi = themeName === 'qixi';
    const big = !qixi && Math.random() < 0.16;
    return {
      bx: rand(0, W),
      y: fromBottom ? H + rand(10, 60) : rand(0, H),
      r: big ? rand(30, 52) : (qixi ? rand(3, 9) : rand(5, 13)),
      vy: rand(7, 20),
      swayAmp: rand(6, 22),
      swayFreq: rand(0.00016, 0.00042),
      twFreq: qixi ? rand(0.0015, 0.0042) : rand(0.0008, 0.0022),
      phase: rand(0, Math.PI * 2),
      alpha: big ? rand(0.05, 0.1) : (qixi ? rand(0.25, 0.6) : rand(0.18, 0.5)),
      sprite: qixi ? pick(STAR_SMALL) : pick(WARM_GLOWS)
    };
  }

  function seedMotes() {
    motes.length = 0;
    const density = themeName === 'qixi' ? 15000 : 24000;
    const n = Math.max(16, Math.min(themeName === 'qixi' ? 70 : 46, Math.round(W * H / density)));
    for (let i = 0; i < n; i++) motes.push(newMote(false));
  }

  /* ---------------- 银河（离屏一次烘焙，之后每帧一张贴图） ---------------- */

  let galaxyCanvas = null;

  function buildGalaxy() {
    const c = document.createElement('canvas');
    c.width = Math.max(W, 2); c.height = Math.max(H, 2);
    const g = c.getContext('2d');

    const P1 = { x: W * 0.02, y: H * 0.86 };
    const P2 = { x: W * 0.98, y: H * 0.16 };
    const dx = P2.x - P1.x, dy = P2.y - P1.y;
    const ang = Math.atan2(dy, dx);
    const bandW = Math.min(W, H) * 0.17;
    const bandPoint = function (t, off) {
      return { x: P1.x + dx * t - dy / Math.hypot(dx, dy) * off, y: P1.y + dy * t + dx / Math.hypot(dx, dy) * off };
    };
    const gauss = function () { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; };

    /* 散布全天的暗星 */
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 140; i++) {
      g.globalAlpha = rand(0.08, 0.3);
      const r = rand(0.4, 0.9);
      g.fillRect(rand(0, W), rand(0, H), r, r);
    }

    g.globalCompositeOperation = 'lighter';

    /* 银河星云亮斑 */
    for (let i = 0; i < 6; i++) {
      const p = bandPoint(rand(0.12, 0.88), gauss() * bandW * 0.4);
      const size = rand(Math.min(W, H) * 0.16, Math.min(W, H) * 0.3);
      g.globalAlpha = rand(0.05, 0.1);
      g.drawImage(pick(NEBULAS), p.x - size / 2, p.y - size / 2, size, size);
    }

    /* 密集星带（越靠中线越密越亮） */
    const N = Math.max(250, Math.min(900, Math.round(W * H / 1600)));
    for (let i = 0; i < N; i++) {
      const t = rand(-0.04, 1.04);
      const off = gauss() * bandW;
      const p = bandPoint(t, off);
      const falloff = Math.pow(Math.max(0, 1 - Math.abs(off) / bandW), 1.6);
      g.globalAlpha = rand(0.12, 0.8) * falloff;
      const r = Math.random() < 0.05 ? rand(1.2, 2) : rand(0.4, 1.1);
      g.fillStyle = pick(['#ffffff', '#fff6e8', '#e8ecff', '#f0e4ff', '#ffffff']);
      g.fillRect(p.x - r / 2, p.y - r / 2, r, r);
    }

    /* 星团亮结 */
    for (let k = 0; k < 3; k++) {
      const cp = bandPoint(rand(0.2, 0.8), gauss() * bandW * 0.3);
      for (let i = 0; i < 7; i++) {
        g.globalAlpha = rand(0.3, 0.7);
        const r = rand(0.6, 1.4);
        g.fillRect(cp.x + gauss() * 7, cp.y + gauss() * 7, r, r);
      }
    }

    /* 尘埃暗带：沿带方向拉长的暗斑，做出云絮斑驳 */
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9; i++) {
      const p = bandPoint(rand(0.06, 0.94), gauss() * bandW * 0.35);
      const rr = bandW * rand(0.28, 0.42);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(ang);
      g.scale(2.9, 1);
      const dg = g.createRadialGradient(0, 0, 0, 0, 0, rr);
      dg.addColorStop(0, 'rgba(0,0,0,' + rand(0.14, 0.24).toFixed(2) + ')');
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = dg;
      g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fill();
      g.restore();
    }

    /* 暗带之上再覆一层薄星，保留被尘斑切割的微光 */
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N * 0.3; i++) {
      const t = rand(-0.02, 1.02);
      const off = gauss() * bandW * 0.8;
      const p = bandPoint(t, off);
      g.globalAlpha = rand(0.05, 0.25);
      g.fillRect(p.x, p.y, 0.7, 0.7);
    }

    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    galaxyCanvas = c;
  }

  /* ---------------- 星座（真实星表近似坐标） ---------------- */

  /* 天琴座：织女星 Vega 0 / ε 1 / ζ 2 / δ 3 / β 4 / γ 5，竖琴四边形+上三角 */
  const LYRA = {
    offs: [[-2.8, -2.3], [-0.9, -3.2], [-0.8, -1.1], [1.6, -0.4], [0.5, 3.1], [2.7, 3.8]],
    mags: [0.03, 4.7, 4.3, 4.2, 3.5, 3.25],
    lines: [[0, 2], [0, 1], [2, 3], [3, 5], [5, 4], [4, 2]],
    main: 0, label: '织女星', mainSprite: STAR_VEGA,
    phase: 0
  };

  /* 天鹰座：牛郎星 Altair 0，河鼓三 γ 1 / 河鼓一 β 2 左右相随（扁担两头），
     δ 3 / θ 4 展翅，λ 5 是尾羽 */
  const AQUILA = {
    offs: [[0, 0], [-1.13, -1.75], [1.13, 2.57], [-6.45, 5.69], [5.13, 9.69], [-11.1, 13.75]],
    mags: [0.76, 2.72, 3.71, 3.36, 3.24, 3.43],
    lines: [[0, 1], [0, 2], [0, 3], [0, 4], [3, 5], [4, 5]],
    main: 0, label: '牛郎星', mainSprite: STAR_ALTAIR,
    phase: 2.1
  };

  function magHalo(m) { return m < 1 ? 26 : (m < 3.5 ? 13 : (m < 4.1 ? 9.5 : 7)); }

  function drawConstellation(cst, cx, cy, size, rot, t, alpha) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    cst.offs.forEach(function (o) {
      if (o[0] < minx) minx = o[0]; if (o[0] > maxx) maxx = o[0];
      if (o[1] < miny) miny = o[1]; if (o[1] > maxy) maxy = o[1];
    });
    const s = Math.min(size / (maxx - minx), size / (maxy - miny));
    const drift = Math.sin(t * 0.00035 + cst.phase) * 7;              // 缓浮
    const sway = rot + Math.sin(t * 0.0002 + cst.phase) * 0.012;      // 微摆
    const cosr = Math.cos(sway), sinr = Math.sin(sway);

    const pts = cst.offs.map(function (o) {
      const px = (o[0] - (minx + maxx) / 2) * s;
      const py = (o[1] - (miny + maxy) / 2) * s + drift;
      return { x: cx + px * cosr - py * sinr, y: cy + px * sinr + py * cosr };
    });

    /* 连线：细弱虚线，像描在星图上 */
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(205,195,255,' + (0.20 * alpha).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    cst.lines.forEach(function (ln) {
      ctx.beginPath();
      ctx.moveTo(pts[ln[0]].x, pts[ln[0]].y);
      ctx.lineTo(pts[ln[1]].x, pts[ln[1]].y);
      ctx.stroke();
    });
    ctx.restore();

    /* 恒星：加性混合，主星带星芒 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    pts.forEach(function (p, i) {
      const isMain = i === cst.main;
      const halo = isMain ? 26 : magHalo(cst.mags[i]);
      const sprite = isMain ? cst.mainSprite : STAR_SMALL[i % STAR_SMALL.length];
      const breathe = isMain ? 1 + 0.08 * Math.sin(t * 0.0021 + cst.phase) : 1;
      const hh = halo * breathe;
      ctx.drawImage(sprite, p.x - hh, p.y - hh, hh * 2, hh * 2);
    });
    ctx.restore();

    /* 主星签名 */
    const lp = pts[cst.main];
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.font = '13px "Kaiti SC", "KaiTi", serif';
    if ('letterSpacing' in ctx) { try { ctx.letterSpacing = '3px'; } catch (e) {} }
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(243,217,139,.85)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f3d98b';
    ctx.fillText(cst.label, lp.x, lp.y + size * 0.46);
    ctx.restore();
  }

  /* ---------------- 主循环 ---------------- */

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
    if (themeTarget > 0 || themeName === 'qixi') buildGalaxy();
    if (REDUCED) renderStatic();
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

    /* 主题淡入缓动 */
    themeAlpha += (themeTarget - themeAlpha) * Math.min(1, dt * 1.8);
    if (Math.abs(themeTarget - themeAlpha) < 0.004) themeAlpha = themeTarget;

    ctx.clearRect(0, 0, W, H);
    tctx.clearRect(0, 0, W, H);

    const qixi = themeAlpha > 0.005;

    if (qixi) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = themeAlpha;
      if (galaxyCanvas) ctx.drawImage(galaxyCanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;

      const small = W < 560;
      const dim = small ? 0.45 : 1;
      const base = Math.min(W, H);
      drawConstellation(LYRA, W * (small ? 0.17 : 0.13), H * 0.62,
        base * (small ? 0.11 : 0.17), -0.18, t, themeAlpha * dim);
      drawConstellation(AQUILA, W * (small ? 0.83 : 0.87), H * 0.58,
        base * (small ? 0.13 : 0.2), 0.14, t, themeAlpha * dim);
    }

    /* 光斑 / 星子 */
    ctx.globalCompositeOperation = qixi ? 'lighter' : 'source-over';
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.y -= m.vy * dt;
      if (m.y < -m.r - 10) motes[i] = newMote(true);
      drawMote(m, t);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    /* 迸溅 */
    tctx.globalCompositeOperation = qixi ? 'lighter' : 'source-over';
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
    tctx.globalCompositeOperation = 'source-over';
    tctx.globalAlpha = 1;

    raf = requestAnimationFrame(step);
  }

  /* 减少动态：静态一帧 */
  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    if (themeTarget > 0) {
      buildGalaxy();
      ctx.globalAlpha = 1;
      ctx.drawImage(galaxyCanvas, 0, 0, W, H);
      const base = Math.min(W, H);
      const small = W < 560;
      drawConstellation(LYRA, W * (small ? 0.17 : 0.13), H * 0.62, base * (small ? 0.11 : 0.17), -0.18, 0, 1);
      drawConstellation(AQUILA, W * (small ? 0.83 : 0.87), H * 0.58, base * (small ? 0.13 : 0.2), 0.14, 0, 1);
    }
    const t = performance.now();
    for (const m of motes) drawMote(m, t);
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

  window.FX = {
    burst: function (x, y) {
      if (REDUCED) return;
      const sprites = SPARKS[themeName] || SPARKS.classic;
      sparks.push({ x: x, y: y, vx: 0, vy: -20, life: .38, maxLife: .38, r: 30, sprite: sprites[0] });
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
          sprite: i % 6 === 0 ? sprites[1] : sprites[0]
        });
      }
    },

    setTheme: function (name) {
      const next = name === 'qixi' ? 'qixi' : 'classic';
      if (next === themeName) return;
      themeName = next;
      themeTarget = next === 'qixi' ? 1 : 0;
      if (next === 'qixi' && !galaxyCanvas) buildGalaxy();

      /* 星子与暖光斑互变 */
      motes.forEach(function (m) {
        if (next === 'qixi') {
          m.big = false;
          m.r = rand(3, 9);
          m.twFreq = rand(0.0015, 0.0042);
          m.alpha = rand(0.25, 0.6);
          m.sprite = pick(STAR_SMALL);
        } else {
          const big = Math.random() < 0.16;
          m.big = big;
          m.r = big ? rand(30, 52) : rand(5, 13);
          m.twFreq = rand(0.0008, 0.0022);
          m.alpha = big ? rand(0.05, 0.1) : rand(0.18, 0.5);
          m.sprite = pick(WARM_GLOWS);
        }
      });

      if (REDUCED) renderStatic();
    }
  };

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  resize();
  if (!REDUCED) start();
})();
