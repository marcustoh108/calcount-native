// The YumBalance demo video on the home page: plays muted on a loop like a GIF, pauses while off
// screen, and offers a Pause/Play button (needed for any motion that lasts over 5 seconds). With
// "Reduce motion" on it never starts by itself; the button plays it on request.
(function () {
  var video = document.querySelector(".av-demo");
  var button = document.querySelector(".av-demo-toggle");
  if (!video || !button) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wanted = !reduce;   // whether the viewer wants it playing
  var visible = true;

  function sync() {
    if (wanted && visible) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    else video.pause();
    button.textContent = wanted ? "Pause demo" : "Play demo";
    button.setAttribute("aria-pressed", wanted ? "false" : "true");
  }
  if (reduce) { video.removeAttribute("autoplay"); video.pause(); }
  button.hidden = false;
  button.addEventListener("click", function () { wanted = !wanted; sync(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(video);
  }
  sync();
})();
