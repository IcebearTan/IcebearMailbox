/* ============================================================
   拆信动画时序控制器
   ------------------------------------------------------------
   一次完整拆信：
     crack     火漆迸裂（金色粒子 + 两半封印飞散）
     flap      上盖翻开（rotateX 178°）
     swap      上盖翻过半程后沉到信纸后面
     letter    信纸从口袋里滑出
     ready     回调：app 在此刻淡入读信浮层
   合上时反向执行，最后火漆重新凝成。
   ============================================================ */
(function () {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 拆信各阶段时间点（ms）；reduce 动效偏好下整体缩短 */
  const T = REDUCED
    ? { flap: 60,  swap: 40,  letter: 110, ready: 180, settle: 40,  back: 90,  close: 140, seal: 190 }
    : { flap: 350, swap: 310, letter: 800, ready: 1280, settle: 330, back: 790, close: 1250, seal: 1680 };

  function Envelope(el) {
    this.el = el;
    this.busy = false;   // 打开中 / 已打开（合上后才复位）
    this.timers = [];
  }

  Envelope.prototype.later = function (fn, t) {
    this.timers.push(setTimeout(fn, t));
  };

  Envelope.prototype.clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  };

  /* 拆信。onReady 会在该展示信纸的时刻被调用。 */
  Envelope.prototype.open = function (onReady) {
    if (this.busy) return false;
    this.busy = true;
    const el = this.el;

    const seal = el.querySelector('.env-seal');
    if (seal && window.FX) {
      const r = seal.getBoundingClientRect();
      window.FX.burst(r.left + r.width / 2, r.top + r.height / 2);
    }

    el.classList.add('crack');
    this.later(function () { el.classList.add('flap-open'); }, T.flap);
    this.later(function () { el.classList.add('flap-behind'); }, T.flap + T.swap);
    this.later(function () { el.classList.add('letter-out'); }, T.letter);
    this.later(function () { if (onReady) onReady(); }, T.ready);
    return true;
  };

  /* 合信：浮层开始淡出后调用，反向收尾并重新凝封。 */
  Envelope.prototype.close = function () {
    if (!this.busy) return;
    this.clearTimers();
    const el = this.el;

    this.later(function () { el.classList.remove('letter-out'); }, T.settle);
    this.later(function () {
      el.classList.remove('flap-behind');
      el.classList.remove('flap-open');
    }, T.back);
    this.later(function () {
      el.classList.remove('crack');
      el.classList.add('reseal');
    }, T.close);
    this.later(function () {
      el.classList.remove('reseal');
      this.busy = false;
    }.bind(this), T.seal);
  };

  window.Envelope = Envelope;
})();
