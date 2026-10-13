// Avencia hero: a bright, glittering 3D "core". A luminous wireframe sphere of linked points turns
// in space, wrapped in a glittering particle ring and circled by four glowing satellites with
// light trails, each carrying one capability caption. Plain canvas 2D with additive blending and
// pre-rendered glow sprites (cheap to draw, no WebGL). The captions are real text (an HTML list)
// positioned over the canvas, so they stay readable and accessible. Without JavaScript the
// captions simply show as a list.
// Pauses off screen and in background tabs. With "Reduce motion" on, it turns at a slow, steady
// pace with softer twinkling and no pointer tilt.
(function () {
  var root = document.querySelector(".av-core");
  var canvas = root && root.querySelector(".av-core-canvas");
  if (!canvas || !canvas.getContext) return;
  var labels = Array.prototype.slice.call(root.querySelectorAll(".av-core-labels li"));
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var speed = reduce ? 0.35 : 1;
  var sparkle = reduce ? 0.35 : 1;

  var WHITE = "255, 250, 238", GOLD = "240, 212, 150", ICE = "170, 215, 255";

  // ---------- glow sprites (drawn once, then stamped) ----------
  function sprite(rgb, size) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d"), r = size / 2;
    var grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(" + rgb + ",1)");
    grad.addColorStop(0.18, "rgba(" + rgb + ",0.55)");
    grad.addColorStop(0.45, "rgba(" + rgb + ",0.12)");
    grad.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }
  var glowWhite = sprite(WHITE, 64), glowGold = sprite(GOLD, 64), glowIce = sprite(ICE, 64);
  function stamp(img, x, y, size, alpha) {
    if (alpha <= 0.01) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  }
  // A four-pointed star glint, like light catching a facet.
  function glint(x, y, len, alpha) {
    if (alpha <= 0.02) return;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.strokeStyle = "rgba(" + WHITE + ",1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
    ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
    ctx.stroke();
    stamp(glowWhite, x, y, len * 2.2, alpha);
  }

  // ---------- geometry ----------
  // Evenly spread points on a sphere (Fibonacci lattice), linked to their nearest neighbours.
  var N = 170, points = [], edges = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    points.push({ p: [Math.cos(th) * r, y, Math.sin(th) * r], phase: Math.random() * 6.283, rate: 0.6 + Math.random() * 1.6 });
  }
  for (var a = 0; a < N; a++) {
    for (var b = a + 1; b < N; b++) {
      var dx = points[a].p[0] - points[b].p[0], dy = points[a].p[1] - points[b].p[1], dz = points[a].p[2] - points[b].p[2];
      if (dx * dx + dy * dy + dz * dz < 0.075) edges.push([a, b]);
    }
  }
  // A glittering dust ring around the sphere.
  var dust = [];
  for (var d = 0; d < 260; d++) {
    dust.push({
      ang: Math.random() * 6.283,
      rad: 1.25 + Math.pow(Math.random(), 1.6) * 0.95,
      lift: (Math.random() - 0.5) * 0.12,
      spin: 0.04 + Math.random() * 0.08,
      phase: Math.random() * 6.283,
      rate: 0.8 + Math.random() * 2.2,
      ice: Math.random() < 0.3,
    });
  }
  // Four orbits, each tilted differently; one satellite per caption, spaced a quarter turn apart.
  var orbits = [
    { radius: 1.55, tiltX: 0.35, tiltZ: 0.15, speed: 0.22, phase: 0.0 },
    { radius: 1.75, tiltX: -0.55, tiltZ: 0.4, speed: 0.17, phase: 1.6 },
    { radius: 1.6, tiltX: 0.95, tiltZ: -0.25, speed: 0.2, phase: 3.2 },
    { radius: 1.85, tiltX: -0.2, tiltZ: -0.6, speed: 0.15, phase: 4.7 },
  ];

  var w = 0, h = 0, dpr = 1, t = 0, running = false, visible = true, raf = 0;
  var tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  function rotate(p, ay, ax) {
    var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
    var y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
    return [x, y, z];
  }
  function tiltOrbit(p, o) {
    var c = Math.cos(o.tiltX), s = Math.sin(o.tiltX);
    var y = p[1] * c - p[2] * s, z = p[1] * s + p[2] * c;
    var cz = Math.cos(o.tiltZ), sz = Math.sin(o.tiltZ);
    return [p[0] * cz - y * sz, p[0] * sz + y * cz, z];
  }
  function project(p) {
    var f = 4.2, k = f / (f + p[2]);
    var R = Math.min(w, h) * 0.24;
    return [w / 2 + p[0] * R * k, h / 2 + p[1] * R * k, k, p[2]];
  }
  function orbitPoint(orb, ang, ay, ax) {
    return project(rotate(tiltOrbit([Math.cos(ang) * orb.radius, 0, Math.sin(ang) * orb.radius], orb), ay * 0.4, ax));
  }
  function twinkle(phase, rate) {
    // Mostly calm, with brief bright flashes.
    return Math.pow(Math.max(0, Math.sin(t * rate * 2.4 + phase)), 14) * sparkle;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    var ay = t * 0.18 + tilt.x * 0.6, ax = -0.35 + tilt.y * 0.4;
    var R = Math.min(w, h) * 0.24, cx = w / 2, cy = h / 2;

    // Everything below adds light, so overlaps bloom brighter.
    ctx.globalCompositeOperation = "lighter";

    // Radiant core and halo, gently breathing.
    var breath = 1 + Math.sin(t * 0.9) * 0.06;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1 * breath);
    g.addColorStop(0, "rgba(" + GOLD + ",0.34)");
    g.addColorStop(0.28, "rgba(" + GOLD + ",0.12)");
    g.addColorStop(0.6, "rgba(" + ICE + ",0.05)");
    g.addColorStop(1, "rgba(" + ICE + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    stamp(glowWhite, cx, cy, R * 0.9 * breath, 0.55);

    // Sphere links: bright gold-white at the front, fading to blue at the back.
    var proj = points.map(function (pt) { return project(rotate(pt.p, ay, ax)); });
    ctx.lineWidth = 1;
    for (var e = 0; e < edges.length; e++) {
      var p1 = proj[edges[e][0]], p2 = proj[edges[e][1]];
      var front = (1 - (p1[3] + p2[3]) / 2) / 2;           // 1 = front, 0 = back
      ctx.globalAlpha = 0.08 + front * 0.42;
      ctx.strokeStyle = front > 0.5 ? "rgba(" + GOLD + ",1)" : "rgba(" + ICE + ",1)";
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
    // Sphere points: glowing nodes, some flashing into star glints.
    for (var i = 0; i < proj.length; i++) {
      var p = proj[i], fr = (1 - p[3]) / 2;
      stamp(fr > 0.45 ? glowGold : glowIce, p[0], p[1], 7 + fr * 10, 0.35 + fr * 0.65);
      ctx.globalAlpha = 0.5 + fr * 0.5;
      ctx.fillStyle = "rgba(" + WHITE + ",1)";
      var s = 0.8 + fr * 1.4;
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
      if (fr > 0.35) glint(p[0], p[1], 5 + fr * 9, twinkle(points[i].phase, points[i].rate) * fr);
    }

    // Glittering dust ring.
    for (var k2 = 0; k2 < dust.length; k2++) {
      var dp = dust[k2], an = dp.ang + t * dp.spin;
      var q = project(rotate([Math.cos(an) * dp.rad, dp.lift, Math.sin(an) * dp.rad], ay * 0.6, ax + 0.55));
      var df = (1 - Math.max(-1, Math.min(1, q[3] / 2.2))) / 2;
      var tw = twinkle(dp.phase, dp.rate);
      stamp(dp.ice ? glowIce : glowGold, q[0], q[1], 3 + df * 4 + tw * 10, 0.25 + df * 0.45 + tw);
      if (tw > 0.5) glint(q[0], q[1], 4 + tw * 6, tw * 0.8);
    }

    // Orbits, satellites with light trails.
    var sats = [];
    for (var o = 0; o < orbits.length; o++) {
      var orb = orbits[o];
      ctx.beginPath();
      for (var k = 0; k <= 96; k++) {
        var pt = orbitPoint(orb, (k / 96) * Math.PI * 2, ay, ax);
        if (k === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
      }
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "rgba(" + GOLD + ",1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      var sa = orb.phase + t * orb.speed;
      // Comet trail behind the satellite.
      for (var tr = 1; tr <= 14; tr++) {
        var tp = orbitPoint(orb, sa - tr * 0.045, ay, ax);
        stamp(glowGold, tp[0], tp[1], (16 - tr) * 1.5 * tp[2], (1 - tr / 15) * 0.45);
      }
      var sp = orbitPoint(orb, sa, ay, ax);
      sats.push(sp);
      var sf = (1 - Math.max(-1, Math.min(1, sp[3] / orb.radius))) / 2;   // 1 = front
      stamp(glowGold, sp[0], sp[1], 46 * sp[2], 0.5 + sf * 0.5);
      stamp(glowWhite, sp[0], sp[1], 18 * sp[2], 0.8 + sf * 0.2);
      glint(sp[0], sp[1], (9 + sf * 8) * sp[2], 0.35 + sf * 0.45 + twinkle(orb.phase * 3, 1.1) * 0.5);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Captions follow their satellites; those behind the sphere fade back.
    for (var L = 0; L < labels.length && L < sats.length; L++) {
      var sp2 = sats[L], right = sp2[0] >= w / 2;
      var front2 = (1 - Math.max(-1, Math.min(1, sp2[3] / orbits[L].radius))) / 2;
      var el = labels[L];
      // Beside the satellite, on the outer side, but never past the edge of the graphic.
      var lw = el.offsetWidth, lh = el.offsetHeight;
      var lx = right ? sp2[0] + 18 : sp2[0] - 18 - lw;
      lx = Math.max(2, Math.min(w - lw - 2, lx));
      var ly = Math.max(2, Math.min(h - lh - 2, sp2[1] - lh / 2));
      el.style.transform = "translate(" + Math.round(lx) + "px," + Math.round(ly) + "px)";
      el.style.opacity = (0.45 + front2 * 0.55).toFixed(2);
      el.style.zIndex = front2 > 0.5 ? 2 : 1;
    }
  }

  function tick() {
    raf = 0;
    if (!running) return;
    t += 0.016 * speed;
    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;
    draw();
    raf = requestAnimationFrame(tick);
  }
  function setRunning() {
    var on = visible && !document.hidden;
    if (on === running) return;
    running = on;
    if (running && !raf) raf = requestAnimationFrame(tick);
  }

  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      tilt.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      tilt.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; setRunning(); }).observe(canvas);
  }
  document.addEventListener("visibilitychange", setRunning);

  root.classList.add("is-live");
  resize();
  setRunning();
})();
