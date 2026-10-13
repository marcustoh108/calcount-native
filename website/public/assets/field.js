// Avencia hero: a "signal field". A lattice of points seen in perspective rolls like a slow wave,
// with a few gold pulses travelling across it, and leans gently toward the pointer.
// Plain canvas 2D, no libraries. Pauses when off screen or in a background tab, caps the pixel
// ratio, and draws a single still frame for people who prefer reduced motion.
(function () {
  var canvas = document.querySelector(".av-field");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var COLS = 84, ROWS = 46;
  var IVORY = "243, 239, 230", GOLD = "212, 182, 122";
  var w = 0, h = 0, dpr = 1, t = 0, running = false, visible = true, raf = 0;
  var pointer = { x: 0.7, y: 0.4, tx: 0.7, ty: 0.4 };

  // Pulses travel along a row of the lattice from far left to far right.
  var pulses = [];
  function newPulse(startX) {
    return { row: 6 + Math.floor(Math.random() * (ROWS - 10)), x: startX, speed: 0.0025 + Math.random() * 0.003 };
  }
  for (var i = 0; i < 5; i++) pulses.push(newPulse(Math.random()));

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw();
  }

  // World: x in [-1, 1] across, z in [0, 1] from near (bottom) to far (top).
  function height(x, z) {
    var tilt = (pointer.x - 0.5) * 0.25 * (1 - z);
    return 0.11 * Math.sin(x * 3.1 + t * 0.6 + z * 4.0) * Math.cos(z * 5.2 - t * 0.35)
      + 0.05 * Math.sin(x * 7.0 - t * 0.9) * (1 - z) + tilt * x;
  }

  function project(x, y, z) {
    var depth = 0.7 + z * 2.2;                  // farther rows shrink toward the horizon
    var horizon = h * (0.04 + (pointer.y - 0.5) * 0.06);
    var narrow = w < 700;
    var sx = w * (narrow ? 0.5 : 0.66) + (x * w * (narrow ? 1.5 : 1.25)) / depth;
    var sy = horizon + ((0.75 - y) * h * 1.05) / depth;
    return [sx, sy, depth];
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var small = w < 700;
    // Dots, far to near so near dots sit on top.
    for (var r = ROWS - 1; r >= 0; r--) {
      var z = r / (ROWS - 1);
      var fade = Math.pow(1 - z, 1.4);
      for (var c = 0; c < COLS; c++) {
        var x = (c / (COLS - 1)) * 2 - 1;
        var y = height(x, z);
        var p = project(x, y, z);
        if (p[0] < -4 || p[0] > w + 4 || p[1] < -4 || p[1] > h + 4) continue;
        var size = (small ? 1.1 : 1.5) / p[2] + 0.35;
        var lift = Math.max(0, y) * 4;           // crests catch a little more light
        ctx.fillStyle = "rgba(" + IVORY + "," + Math.min(0.85, 0.12 + fade * 0.6 + lift * 0.25).toFixed(3) + ")";
        ctx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size);
      }
    }
    // Pulses with short fading tails.
    for (var k = 0; k < pulses.length; k++) {
      var pu = pulses[k];
      var zr = pu.row / (ROWS - 1);
      for (var s = 0; s < 14; s++) {
        var px = (pu.x - s * 0.012) * 2 - 1;
        if (px < -1 || px > 1) continue;
        var pp = project(px, height(px, zr), zr);
        var a = (1 - s / 14) * (1 - zr * 0.6);
        var rad = (s === 0 ? 2.6 : 1.6) / pp[2] + 0.6;
        ctx.fillStyle = "rgba(" + GOLD + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(pp[0], pp[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function tick() {
    raf = 0;
    if (!running) return;
    t += 0.016;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    for (var k = 0; k < pulses.length; k++) {
      pulses[k].x += pulses[k].speed;
      if (pulses[k].x > 1.2) pulses[k] = newPulse(-0.1);
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function setRunning(on) {
    on = on && visible && !reduce && !document.hidden;
    if (on === running) return;
    running = on;
    if (running && !raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", function (e) {
    pointer.tx = e.clientX / window.innerWidth;
    pointer.ty = e.clientY / window.innerHeight;
  }, { passive: true });

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      setRunning(true);
    }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { setRunning(true); });

  resize();
  setRunning(true);
})();
