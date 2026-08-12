/* =============================================================
   Kang Ji — portfolio behaviour
   No dependencies, no build step.

   The motion here follows one idea: an interface feels alive when
   motion starts from the current on-screen value, inherits the
   user's velocity, projects momentum forward, and can be grabbed
   and reversed at any instant. Springs are the tool that makes
   that natural, because they are inherently interruptible and
   velocity-aware.
   ============================================================= */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ===========================================================
     1. Spring
     Apple replaced the physics triplet (mass / stiffness / damping)
     with two designer parameters, and so do we:

       damping  — 1.0 = critically damped, no overshoot.
                  < 1.0 overshoots. Only ever earned by a gesture
                  that carried momentum.
       response — how quickly the value reaches the target, seconds.
                  NOT a duration; a spring has no fixed duration.

     Retargeting mid-flight keeps the current position AND velocity,
     which is what makes an interruption invisible.
     =========================================================== */
  function Spring(opts) {
    this.value    = opts.from || 0;
    this.target   = opts.to || 0;
    this.velocity = opts.velocity || 0;
    this.damping  = opts.damping == null ? 1.0 : opts.damping;
    this.response = opts.response || 0.4;
    this.onUpdate = opts.onUpdate || function () {};
    this.onRest   = opts.onRest || function () {};
    this._raf = null;
    this._last = 0;
  }

  Spring.prototype.retarget = function (to, velocity) {
    this.target = to;
    if (velocity != null) this.velocity = velocity;
    this.start();
  };

  Spring.prototype.set = function (v) {
    this.stop();
    this.value = v;
    this.onUpdate(v);
  };

  Spring.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  Spring.prototype.start = function () {
    if (this._raf) return;               // already running: it will pick up the new target
    this._last = performance.now();
    var self = this;

    // Reduced motion: no travel, no oscillation — snap and let CSS cross-fade.
    if (reduceMotion.matches) {
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this.onRest();
      return;
    }

    function frame(now) {
      // Clamp dt so a backgrounded tab doesn't explode the integrator.
      var dt = Math.min((now - self._last) / 1000, 1 / 30);
      self._last = now;

      var omega = (2 * Math.PI) / self.response;
      var x = self.value - self.target;
      var accel = -(omega * omega) * x - 2 * self.damping * omega * self.velocity;

      self.velocity += accel * dt;
      self.value    += self.velocity * dt;

      self.onUpdate(self.value);

      if (Math.abs(self.value - self.target) < 0.15 && Math.abs(self.velocity) < 0.15) {
        self.value = self.target;
        self.velocity = 0;
        self.onUpdate(self.value);
        self._raf = null;
        self.onRest();
        return;
      }
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  /* Momentum projection — animate to where the gesture is GOING, not
     to where the finger happened to let go. Same exponential-decay
     form as scroll deceleration. */
  function project(velocity, decelerationRate) {
    var d = decelerationRate || 0.998;
    return (velocity / 1000) * d / (1 - d);
  }

  /* Rubber-banding: past a boundary, resist progressively instead of
     stopping hard. A hard stop reads as frozen; resistance reads as
     "responsive, but there is nothing more here". */
  function rubberband(overshoot, dimension, constant) {
    var c = constant || 0.55;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  /* ===========================================================
     2. Press feedback
     On pointer-DOWN, instantly. Cancel if the pointer wanders off
     (with a little hysteresis) so a drag-away is forgiving.
     =========================================================== */
  (function pressFeedback() {
    var pressed = null;
    var origin = null;
    var HYSTERESIS = 12;

    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest('.pressable') : null;
      if (!el) return;
      pressed = el;
      origin = { x: e.clientX, y: e.clientY };
      el.classList.add('is-pressed');
    }, { passive: true });

    document.addEventListener('pointermove', function (e) {
      if (!pressed) return;
      var dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      if (Math.sqrt(dx * dx + dy * dy) > HYSTERESIS) {
        pressed.classList.remove('is-pressed');
      } else {
        pressed.classList.add('is-pressed');  // allow drag-away-and-back
      }
    }, { passive: true });

    function release() {
      if (pressed) pressed.classList.remove('is-pressed');
      pressed = null;
    }
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
  })();

  /* ===========================================================
     3. Scroll reveal
     =========================================================== */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Tiny stagger within a group; enough to read as sequence, not as a queue.
        var siblings = Array.prototype.slice.call(
          entry.target.parentElement.querySelectorAll(':scope > .reveal, :scope > li > .reveal')
        );
        var i = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.transitionDelay = Math.min(i, 5) * 55 + 'ms';
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ===========================================================
     4. Nav scrollspy
     Wayfinding: every screen should answer "where am I".
     =========================================================== */
  (function scrollspy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var visible = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible.set(e.target.id, e.intersectionRatio); });
      var best = null, bestRatio = 0;
      visible.forEach(function (ratio, id) {
        if (ratio > bestRatio) { bestRatio = ratio; best = id; }
      });
      links.forEach(function (a) {
        a.classList.toggle('is-current', best != null && a.getAttribute('href') === '#' + best);
      });
    }, { threshold: [0, 0.15, 0.4, 0.75], rootMargin: '-20% 0px -45% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  })();

  /* ===========================================================
     5. Project sheet
     A drawer: damping 0.8, response 0.3 — the values Apple ships
     for sheets. It carries bounce because the gesture that drives
     it carries momentum.
     =========================================================== */
  var sheet     = document.getElementById('sheet');
  var scrim     = document.getElementById('scrim');
  var scroller  = document.getElementById('sheet-scroll');
  var content   = document.getElementById('sheet-content');
  var grabber   = document.getElementById('sheet-grabber');
  var closeBtn  = document.getElementById('sheet-close');
  var cards     = Array.prototype.slice.call(document.querySelectorAll('.card[data-project]'));

  var openSlug = null;
  var lastFocus = null;
  var height = 0;

  var spring = new Spring({
    damping: 0.8,
    response: 0.3,
    onUpdate: render,
    onRest: function () {
      if (spring.target >= height - 0.5) finishClose();
    }
  });

  function render(y) {
    sheet.style.transform = 'translateY(' + y + 'px)';
    var p = height ? 1 - Math.min(Math.max(y / height, 0), 1) : 0;
    scrim.style.opacity = p;
  }

  function measure() { height = sheet.offsetHeight || window.innerHeight; }

  function openSheet(slug, trigger) {
    var card = cards.filter(function (c) { return c.dataset.project === slug; })[0];
    if (!card) return;
    var detail = card.querySelector('.detail');
    if (!detail) return;

    lastFocus = trigger || document.activeElement;
    openSlug = slug;

    content.innerHTML = detail.innerHTML;
    var h = content.querySelector('.detail__title');
    if (h) h.id = 'sheet-title';
    sheet.setAttribute('aria-labelledby', h ? 'sheet-title' : '');

    scrim.hidden = false;
    sheet.hidden = false;
    document.body.classList.add('is-locked');
    scroller.scrollTop = 0;

    measure();
    spring.stop();
    spring.value = height;      // start from closed…
    spring.velocity = 0;
    render(height);
    // …force a frame so the browser has the start value before we animate.
    void sheet.offsetHeight;
    spring.retarget(0);

    if (history.replaceState) history.replaceState(null, '', '#' + slug);
    closeBtn.focus({ preventScroll: true });
  }

  function closeSheet(velocity) {
    if (openSlug == null) return;
    measure();
    spring.retarget(height, velocity || 0);
  }

  function finishClose() {
    if (openSlug == null) return;
    sheet.hidden = true;
    scrim.hidden = true;
    document.body.classList.remove('is-locked');
    content.innerHTML = '';
    openSlug = null;
    if (history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  /* ---- open triggers ---- */
  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;      // never swallow a real link
      openSheet(card.dataset.project, card);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSheet(card.dataset.project, card);
      }
    });
  });

  /* ---- close triggers ---- */
  closeBtn.addEventListener('click', function () { closeSheet(0); });
  scrim.addEventListener('click', function () { closeSheet(0); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openSlug != null) { e.preventDefault(); closeSheet(0); }
  });

  /* ---- focus trap ---- */
  sheet.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || openSlug == null) return;
    var focusables = sheet.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ===========================================================
     6. Drag to dismiss
     1:1 tracking, respecting where the sheet was grabbed. Pointer
     capture so tracking survives the pointer leaving the element.
     A short position history gives us the release velocity, which
     is handed straight to the spring so there is no visible seam
     between dragging and animating.
     =========================================================== */
  (function dragToDismiss() {
    var dragging = false;
    var startY = 0, startValue = 0;
    var history_ = [];
    var pointerId = null;
    var fromScroller = false;
    var committed = false;
    var THRESHOLD = 10;              // hysteresis before we commit to a drag

    function velocityFromHistory() {
      if (history_.length < 2) return 0;
      var last = history_[history_.length - 1];
      var ref = history_[0];
      for (var i = history_.length - 1; i >= 0; i--) {
        if (last.t - history_[i].t > 90) break;
        ref = history_[i];
      }
      var dt = (last.t - ref.t) / 1000;
      if (dt <= 0) return 0;
      return (last.y - ref.y) / dt;   // px/s, positive = downward
    }

    function onDown(e, viaScroller) {
      if (openSlug == null || e.button > 0) return;
      // From the scroll area we may only start a drag at the very top,
      // otherwise the user is scrolling, not dismissing.
      if (viaScroller && scroller.scrollTop > 0) return;

      dragging = true;
      committed = !viaScroller;       // the grabber is unambiguous: commit immediately
      fromScroller = viaScroller;
      pointerId = e.pointerId;
      startY = e.clientY;
      measure();

      // Interruptibility: read the PRESENTATION value, not the target.
      // Grabbing a sheet mid-flight must continue from where it is on
      // screen, not jump to where it was headed.
      spring.stop();
      startValue = spring.value;
      history_ = [{ y: e.clientY, t: performance.now() }];

      if (committed) {
        try { e.currentTarget.setPointerCapture(pointerId); } catch (_) {}
      }
    }

    function onMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      var dy = e.clientY - startY;
      history_.push({ y: e.clientY, t: performance.now() });
      if (history_.length > 8) history_.shift();

      if (!committed) {
        if (Math.abs(dy) < THRESHOLD) return;
        if (dy < 0) { dragging = false; return; }   // upward from the top = let it scroll
        committed = true;
        try { e.currentTarget.setPointerCapture(pointerId); } catch (_) {}
      }

      var y = startValue + dy;
      // Soft boundary at the top: you can pull past open, but not for free.
      if (y < 0) y = -rubberband(-y, height);
      spring.value = y;
      render(y);
      if (fromScroller) e.preventDefault();
    }

    function onUp(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      dragging = false;
      var wasCommitted = committed;
      committed = false;
      pointerId = null;
      if (!wasCommitted) return;

      var v = velocityFromHistory();

      // Decide by the PROJECTED resting point, not the release point.
      // A small fast flick should throw the sheet away; a large slow
      // drag that stops short should spring back.
      var projected = spring.value + project(v);
      measure();

      if (projected > height * 0.4) {
        spring.retarget(height, v);   // hand the finger's velocity to the spring
      } else {
        spring.retarget(0, v);
      }
    }

    grabber.addEventListener('pointerdown', function (e) { onDown(e, false); });
    grabber.addEventListener('pointermove', onMove);
    grabber.addEventListener('pointerup', onUp);
    grabber.addEventListener('pointercancel', onUp);

    scroller.addEventListener('pointerdown', function (e) { onDown(e, true); }, { passive: true });
    scroller.addEventListener('pointermove', onMove, { passive: false });
    scroller.addEventListener('pointerup', onUp);
    scroller.addEventListener('pointercancel', onUp);
  })();

  /* ===========================================================
     7. Deep links — a project is shareable
     =========================================================== */
  function syncFromHash() {
    var slug = location.hash.replace('#', '');
    if (!slug) return;
    var exists = cards.some(function (c) { return c.dataset.project === slug; });
    if (exists && openSlug !== slug) {
      if (openSlug) finishClose();
      openSheet(slug, null);
    }
  }
  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();

  window.addEventListener('resize', function () {
    if (openSlug != null) { measure(); render(spring.value); }
  });

  /* ===========================================================
     8. Housekeeping
     =========================================================== */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ===========================================================
     9. Colour theme — light / dark / system
     The <head> bootstrap has already stamped the right state before
     paint. This only owns the cycling, the label and persistence,
     so there is exactly one place that knows the storage key.
     =========================================================== */
  (function themeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    var KEY = 'kj-theme';
    var ORDER = ['system', 'light', 'dark'];

    function read() {
      try {
        var v = localStorage.getItem(KEY);
        return (v === 'light' || v === 'dark') ? v : 'system';
      } catch (e) { return 'system'; }
    }

    function apply(state) {
      var root = document.documentElement;
      // System removes the attribute entirely rather than setting a value.
      // The media query can only take over in the attribute's absence.
      if (state === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', state);

      try {
        if (state === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, state);
      } catch (e) {}

      btn.setAttribute('aria-label', 'Colour theme: ' + state + '. Activate to change.');

      // The two media-scoped theme-color metas cannot answer an explicit
      // override, so swap in a single fixed one while the user has chosen.
      // The colour is read back off the page rather than hardcoded, because
      // each theme has its own background and a fixed value would leave the
      // mobile status bar mismatched on three of the four.
      var dyn = document.getElementById('theme-color-explicit');
      if (state === 'system') {
        if (dyn) dyn.remove();
      } else {
        if (!dyn) {
          dyn = document.createElement('meta');
          dyn.id = 'theme-color-explicit';
          dyn.name = 'theme-color';
          document.head.appendChild(dyn);
        }
        var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
        dyn.setAttribute('content', bg || (state === 'dark' ? '#000000' : '#f5f5f7'));
      }
    }

    var current = read();
    apply(current);

    btn.addEventListener('click', function () {
      current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      apply(current);
    });
  })();

  /* ===========================================================
     10. Prototype picker — TEMPORARY
     Renders only when a ?style= parameter is present, so the live
     site never carries it. Delete this block, the .picker rules and
     the themes/ directory once a direction is chosen.

     Swapping happens in place: the overlay stylesheet's href is
     rewritten and the URL is corrected with replaceState. No
     navigation means scroll position survives, which is the whole
     point — you compare one section across four styles without
     hunting for it again each time.
     =========================================================== */
  (function stylePicker() {
    var STYLES = [
      { id: 'classic', label: 'Classic', href: null },
      { id: 'glass',   label: 'Glass',   href: 'themes/glass.css' },
      { id: 'm3',      label: 'M3',      href: 'themes/m3.css' },
      { id: 'hybrid',  label: 'Hybrid',  href: 'themes/hybrid.css' }
    ];

    var root = document.documentElement;
    var active = root.getAttribute('data-style');
    if (!active) return;

    var overlay = document.getElementById('theme-overlay');
    if (!overlay) return;

    var bar = document.createElement('div');
    bar.className = 'picker';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Design prototype');

    var label = document.createElement('span');
    label.className = 'picker__label';
    label.textContent = 'Style';
    bar.appendChild(label);

    var buttons = {};

    function select(id) {
      var def = null;
      for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) def = STYLES[i];
      if (!def) return;

      if (def.href) { overlay.href = def.href; overlay.disabled = false; }
      else { overlay.disabled = true; }

      root.setAttribute('data-style', id);
      active = id;

      Object.keys(buttons).forEach(function (k) {
        buttons[k].classList.toggle('is-current', k === id);
        buttons[k].setAttribute('aria-pressed', k === id ? 'true' : 'false');
      });

      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + '?style=' + id + location.hash);
      }
    }

    STYLES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker__btn pressable';
      b.textContent = s.label;
      b.addEventListener('click', function () { select(s.id); });
      buttons[s.id] = b;
      bar.appendChild(b);
    });

    document.body.appendChild(bar);
    select(active);
  })();

})();
