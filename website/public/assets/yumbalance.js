// YumBalance product page: hero phone demo and example weight-trend chart.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- hero phone demo ---------- */
  var scenes = document.querySelectorAll(".scene");
  var tabs = document.querySelectorAll("[data-go]");
  var durations = [4200, 2800, 6200];
  var current = 0;
  var timer = null;

  var dialSpec = [
    { label: "kcal", val: "540", pct: 0.65, color: "var(--kcal)" },
    { label: "Protein", val: "32g", pct: 0.7, color: "var(--protein)" },
    { label: "Carbs", val: "58g", pct: 0.62, color: "var(--carbs)" },
    { label: "Fat", val: "18g", pct: 0.68, color: "var(--fat)" }
  ];
  var R = 23, C = 2 * Math.PI * R;
  var dialsEl = document.getElementById("dials");
  dialsEl.innerHTML = dialSpec.map(function (d) {
    return '<div><div class="dial"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">' +
      '<circle cx="28" cy="28" r="' + R + '" fill="none" stroke="var(--paper-2)" stroke-width="6"/>' +
      '<circle class="ring" cx="28" cy="28" r="' + R + '" fill="none" stroke="' + d.color + '" stroke-width="6" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-pct="' + d.pct + '"/>' +
      '</svg><span class="val">' + d.val + '</span></div><div class="dial-label">' + d.label + '</div></div>';
  }).join("");

  function animateScene(i) {
    if (i === 0) {
      var eat = document.getElementById("eatBar"), burn = document.getElementById("burnBar");
      eat.style.width = "0"; burn.style.width = "0";
      requestAnimationFrame(function () { requestAnimationFrame(function () { eat.style.width = "38%"; burn.style.width = "40%"; }); });
    }
    if (i === 2) {
      dialsEl.querySelectorAll(".ring").forEach(function (ring) {
        ring.style.strokeDashoffset = C.toFixed(1);
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          ring.style.strokeDashoffset = (C * (1 - parseFloat(ring.dataset.pct))).toFixed(1);
        }); });
      });
    }
  }

  function show(i, manual) {
    current = i;
    scenes.forEach(function (s, n) { s.classList.toggle("on", n === i); });
    tabs.forEach(function (t, n) { t.setAttribute("aria-pressed", String(n === i)); });
    animateScene(i);
    clearTimeout(timer);
    if (!reduce) timer = setTimeout(function () { show((current + 1) % scenes.length); }, manual ? durations[i] + 4000 : durations[i]);
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { show(parseInt(t.dataset.go, 10), true); }); });
  show(reduce ? 2 : 0);

  /* ---------- example weight trend ---------- */
  // 52 weekly weigh-ins: a steady downward trend with natural week-to-week wobble.
  var weeks = [];
  for (var w = 0; w <= 52; w++) {
    weeks.push(+(88.6 - w * 0.13 + Math.sin(w * 1.3) * 0.55 + Math.cos(w * 0.7) * 0.3).toFixed(1));
  }
  var goal = 76;
  var chart = document.getElementById("chart");
  var ink = "var(--paper)";

  function draw(months) {
    var n = Math.round(months * 52 / 12);
    var data = weeks.slice(weeks.length - 1 - n);
    var W = 560, H = 200, L = 34, Rt = 64, T = 12, B = 26;
    var lo = Math.floor(Math.min.apply(null, data.concat([goal])) - 1);
    var hi = Math.ceil(Math.max.apply(null, data) + 1);
    var x = function (i) { return L + (i / (data.length - 1)) * (W - L - Rt); };
    var y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var path = data.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); }).join(" ");
    var area = path + " L" + x(data.length - 1).toFixed(1) + "," + (H - B) + " L" + L + "," + (H - B) + " Z";
    var mid = Math.round((lo + hi) / 2);
    var last = data[data.length - 1], first = data[0];
    var change = (last - first).toFixed(1);
    var grid = [lo, mid, hi].map(function (v) {
      return '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + ink + '" stroke-opacity=".12"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="' + ink + '" fill-opacity=".55">' + v + '</text>';
    }).join("");
    chart.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><linearGradient id="fillg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--protein)" stop-opacity=".35"/><stop offset="1" stop-color="var(--protein)" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(goal) + '" y2="' + y(goal) + '" stroke="' + ink + '" stroke-opacity=".6" stroke-dasharray="5 5"/>' +
      '<text x="' + (W - Rt + 8) + '" y="' + (y(goal) + 4) + '" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="' + ink + '" fill-opacity=".75">Goal ' + goal + '</text>' +
      '<path d="' + area + '" fill="url(#fillg)"/>' +
      '<path d="' + path + '" fill="none" stroke="var(--protein)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x(data.length - 1) + '" cy="' + y(last) + '" r="5.5" fill="var(--protein)" stroke="var(--ink)" stroke-width="2.5"/>' +
      '<text x="' + (x(data.length - 1) + 10) + '" y="' + (y(last) + 4) + '" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="' + ink + '">' + last + ' kg</text>' +
      '<text x="' + L + '" y="' + (H - 6) + '" font-family="JetBrains Mono, monospace" font-size="11" fill="' + ink + '" fill-opacity=".55">' + months + ' months ago</text>' +
      '<text x="' + (W - Rt) + '" y="' + (H - 6) + '" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="' + ink + '" fill-opacity=".55">Today · ' + (change > 0 ? "+" : "") + change + ' kg</text>' +
      '</svg>';
    chart.setAttribute("aria-label", "Example weight trend over " + months + " months, from " + first + " kg to " + last + " kg, goal " + goal + " kg");
  }
  document.querySelectorAll("[data-months]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-months]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      draw(parseInt(b.dataset.months, 10));
    });
  });
  draw(12);
})();
