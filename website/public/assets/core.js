// Avencia hero: a 3D "core". A wireframe sphere of linked points turns slowly in space, circled
// by four satellites on tilted orbits, each carrying one capability caption. Plain canvas 2D; the
// captions are real text (an HTML list) positioned over the canvas, so they stay readable and
// accessible. Without JavaScript the captions simply show as a list.
// Pauses off screen and in background tabs. With "Reduce motion" on, it turns at a slow, steady
// pace with no pointer tilt.
(function () {
  var root = document.querySelector(".av-core");
  var canvas = root && root.querySelector(".av-core-canvas");
  if (!canvas || !canvas.getContext) return;
  var labels = Array.prototype.slice.call(root.querySelectorAll(".av-core-labels li"));
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var speed = reduce ? 0.35 : 1;

  var IVORY = "243, 239, 230", GOLD = "212, 182, 122";

  // ---------- geometry ----------
  // Evenly spread points on a sphere (Fibonacci lattice), linked to their nearest neighbours.
  var N = 150, points = [], edges = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    points.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  for (var a = 0; a < N; a++) {
    for (var b = a + 1; b < N; b++) {
      var dx = points[a][0] - points[b][0], dy = points[a][1] - points[b][1], dz = points[a][2] - points[b][2];
      if (dx * dx + dy * dy + dz * dz < 0.085) edges.push([a, b]);
    }
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
    ctx.clearRect(0, 0, w, h);
    var ay = t * 0.18 + tilt.x * 0.6, ax = -0.35 + tilt.y * 0.4;

    // Soft glow behind the sphere.
    var R = Math.min(w, h) * 0.24;
    var g = ctx.createRadialGradient(w / 2, h / 2, R * 0.2, w / 2, h / 2, R * 1.9);
    g.addColorStop(0, "rgba(" + GOLD + ",0.10)");
    g.addColorStop(1, "rgba(" + GOLD + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Sphere: links first, then points; the far side is dimmer.
    var proj = points.map(function (p) { return project(rotate(p, ay, ax)); });
    ctx.lineWidth = 1;
    for (var e = 0; e < edges.length; e++) {
      var p1 = proj[edges[e][0]], p2 = proj[edges[e][1]];
      var depth = (p1[3] + p2[3]) / 2;             // -1 front … +1 back
      ctx.strokeStyle = "rgba(" + IVORY + "," + (0.05 + (1 - depth) * 0.13).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    }
    for (var i = 0; i < proj.length; i++) {
      var p = proj[i], front = (1 - p[3]) / 2;
      var s = 1 + front * 1.6;
      ctx.fillStyle = "rgba(" + IVORY + "," + (0.25 + front * 0.6).toFixed(3) + ")";
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }

    // Orbits and satellites.
    var sats = [];
    for (var o = 0; o < orbits.length; o++) {
      var orb = orbits[o];
      ctx.beginPath();
      for (var k = 0; k <= 96; k++) {
        var ang = (k / 96) * Math.PI * 2;
        var q = project(rotate(tiltOrbit([Math.cos(ang) * orb.radius, 0, Math.sin(ang) * orb.radius], orb), ay * 0.4, ax));
        if (k === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.strokeStyle = "rgba(" + GOLD + ",0.22)";
      ctx.stroke();

      var sa = orb.phase + t * orb.speed;
      var sp = project(rotate(tiltOrbit([Math.cos(sa) * orb.radius, 0, Math.sin(sa) * orb.radius], orb), ay * 0.4, ax));
      sats.push(sp);
      var sf = (1 - Math.max(-1, Math.min(1, sp[3] / orb.radius))) / 2;   // 1 = front
      ctx.fillStyle = "rgba(" + GOLD + "," + (0.12 + sf * 0.2).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(sp[0], sp[1], 9 * sp[2], 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(" + GOLD + "," + (0.55 + sf * 0.45).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(sp[0], sp[1], 3.6 * sp[2], 0, Math.PI * 2); ctx.fill();
    }

    // Captions follow their satellites; those behind the sphere fade back.
    for (var L = 0; L < labels.length && L < sats.length; L++) {
      var sp2 = sats[L], right = sp2[0] >= w / 2;
      var front2 = (1 - Math.max(-1, Math.min(1, sp2[3] / orbits[L].radius))) / 2;
      var el = labels[L];
      // Beside the satellite, on the outer side, but never past the edge of the graphic.
      var lw = el.offsetWidth, lh = el.offsetHeight;
      var lx = right ? sp2[0] + 16 : sp2[0] - 16 - lw;
      lx = Math.max(2, Math.min(w - lw - 2, lx));
      var ly = Math.max(2, Math.min(h - lh - 2, sp2[1] - lh / 2));
      el.style.transform = "translate(" + Math.round(lx) + "px," + Math.round(ly) + "px)";
      el.style.opacity = (0.35 + front2 * 0.65).toFixed(2);
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
