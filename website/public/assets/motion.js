// Avencia pages: smooth scrolling (Lenis) and scroll-triggered reveals (GSAP + ScrollTrigger +
// SplitText). Content is fully visible without this file: every animation starts from the
// finished layout and only animates *in*, so a blocked script or an old browser shows the page as-is.
// People who ask their device for reduced motion get no smooth scrolling and no animations.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis) return;

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  // ---------- smooth scrolling ----------
  var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", window.ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // In-page links (#about, #products…) glide instead of jumping.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"], a[href^="/#"]');
    if (!a) return;
    var hash = a.getAttribute("href").replace(/^\//, "");
    if (location.pathname !== "/" && a.getAttribute("href").charAt(0) === "/") return;
    var target = hash.length > 1 && document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    // Lenis honours the CSS scroll-margin-top already set for the sticky header.
    lenis.scrollTo(target);
    history.replaceState(null, "", hash);
  });

  var ease = "power3.out";

  // ---------- hero ----------
  var heroTitle = document.querySelector(".av-hero h1");
  if (heroTitle && window.SplitText) {
    var split = new window.SplitText(heroTitle, { type: "words", wordsClass: "av-word" });
    gsap.from(split.words, { yPercent: 60, opacity: 0, duration: 0.9, ease: ease, stagger: 0.06, delay: 0.1 });
  }
  gsap.from(".av-hero .eyebrow, .av-hero .lede, .av-hero .cta-row", {
    y: 18, opacity: 0, duration: 0.8, ease: ease, stagger: 0.12, delay: 0.35,
  });
  gsap.from(".av-core", { opacity: 0, scale: 0.94, duration: 1.6, ease: "power2.out", delay: 0.3 });
  gsap.from(".av-field", { opacity: 0, duration: 2.2, ease: "power2.out" });

  // ---------- reveal on scroll ----------
  function reveal(selector, opts) {
    gsap.utils.toArray(selector).forEach(function (group) {
      var items = opts.children ? group.querySelectorAll(opts.children) : [group];
      if (!items.length) return;
      gsap.from(items, {
        y: opts.y || 28, opacity: 0, duration: 0.9, ease: ease, stagger: opts.stagger || 0,
        scrollTrigger: { trigger: group, start: "top 85%", once: true },
      });
    });
  }
  reveal(".av-head", { children: ".eyebrow, h2, p", stagger: 0.1 });
  reveal(".av-pillars", { children: ".av-pillar", stagger: 0.12, y: 36 });
  reveal(".av-band .wrap", { children: ".av-kicker, h2, p, .av-list li", stagger: 0.08 });
  reveal(".av-product", {});
  reveal(".av-product", { children: ".av-phone", y: 60 });

  // "How we build": the gold line draws across, then each step follows it.
  var flow = document.querySelector(".av-flow");
  if (flow) {
    var line = flow.querySelector(".av-flow-line path");
    var tl = gsap.timeline({ scrollTrigger: { trigger: flow, start: "top 80%", once: true } });
    if (line && getComputedStyle(flow.querySelector(".av-flow-line")).display !== "none") {
      tl.fromTo(line, { attr: { "stroke-dasharray": "1000 1000", "stroke-dashoffset": 1000 } },
        { attr: { "stroke-dashoffset": 0 }, duration: 1.4, ease: "power2.inOut" });
    }
    tl.from(flow.querySelectorAll(".av-node"), { y: 24, opacity: 0, duration: 0.7, ease: ease, stagger: 0.18 }, "<0.15");
  }
  reveal(".av-news", {});
  reveal(".contact-grid", { children: ".contact-card", stagger: 0.1 });
  reveal(".page-hero .wrap", { children: ".eyebrow, h1, .lede, .doc-meta, .cta-row", stagger: 0.08 });

  // The hero copy drifts up a little faster than the page as you scroll away.
  gsap.to(".av-hero-copy", {
    yPercent: -14, opacity: 0.35, ease: "none",
    scrollTrigger: { trigger: ".av-hero", start: "top top", end: "bottom top", scrub: true },
  });
})();
