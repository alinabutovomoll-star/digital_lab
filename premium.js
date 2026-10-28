// Digital Lab — premium layer: фон плавно «дышит» вслед за скроллом
// и подсвечивает текущий раздел. Без ассистента и озвучки.
(() => {
  const layers = document.querySelector(".flow-layers");
  if (layers) {
    const g = document.createElement("div");
    g.className = "premium-grain";
    layers.appendChild(g);
  }
  const root = document.documentElement;
  const sections = [...document.querySelectorAll("[data-guide]")];
  let ticking = false;
  function update() {
    ticking = false;
    const max = Math.max(1, root.scrollHeight - innerHeight);
    const p = scrollY / max;
    // мягкая синусоида: пятна света расходятся и сходятся по мере чтения
    root.style.setProperty("--drift", Math.sin(p * Math.PI * 2).toFixed(3));
    let current = sections[0] && sections[0].dataset.guide;
    for (const s of sections) {
      if (s.getBoundingClientRect().top < innerHeight * 0.5) current = s.dataset.guide;
    }
    if (current && document.body.dataset.section !== current) document.body.dataset.section = current;
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();

// Плавная инерционная прокрутка — сайт листается «как видео».
(() => {
  if (!window.Lenis || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.style.scrollBehavior = "auto";
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -90 } });
  window.labLenis = lenis;
  const dialog = document.querySelector("#detail-dialog");
  if (dialog) {
    dialog.setAttribute("data-lenis-prevent", "");
    new MutationObserver(() => (dialog.open ? lenis.stop() : lenis.start())).observe(dialog, { attributes: true, attributeFilter: ["open"] });
  }
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
})();
