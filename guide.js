// AI-ассистент Digital Lab: сопровождает посетителя по странице,
// подсказывает, что есть в каждом блоке.
(() => {
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => innerWidth <= 700;
  const TG = "https://t.me/alinaaa_ss";

  const LINES = {
    hero: {
      // The greeting is said once; afterwards the first screen gets a short follow-up.
      text: () =>
        greeted
          ? "Листай вниз — начнём с того, почему выбирают Digital Lab."
          : "Привет, я Диги! Расскажу тебе, как всё здесь устроено. Следуй за мной.",
      next: "Следуй за мной ↓",
    },
    why: {
      text: "Почему выбирают Digital Lab: три принципа нашей работы.",
      next: "Дальше — цены ↓",
    },
    products: {
      text: "Продуктовая линейка. Откройте направление — внутри форматы, сроки и стоимость.",
      next: "Пойдём к работам ↓",
    },
    works: {
      text: "Наши работы. Откройте проект, чтобы увидеть задачу и фотографии продукта.",
      next: "Как мы работаем ↓",
    },
    how: {
      text: () =>
        `Процесс работы: четыре этапа от задачи до запуска. Номер этапа${isMobile() ? "" : " слева"} меняется по мере чтения.`,
      next: "Знакомьтесь — команда ↓",
    },
    team: {
      text: "Команда Digital Lab. Во вкладках — опыт и компетенции основателя.",
      next: "К вопросам ↓",
    },
    faq: {
      text: "Ответы на частые вопросы перед стартом проекта.",
      next: "Финал ↓",
    },
    contact: {
      text: "Готовы обсудить задачу? Напишите Алине — предложим формат, сроки и стоимость.",
      link: { href: TG, label: "Написать Алине ↗" },
    },
  };
  const NAMES = {
    hero: "Начало",
    why: "Почему мы",
    products: "Стоимость",
    works: "Работы",
    how: "Как работаем",
    team: "Команда",
    faq: "Вопросы",
    contact: "Начать проект",
  };

  const sections = $$("[data-guide]");
  if (!sections.length) return;

  // ---- markup ---------------------------------------------------------------
  const root = document.createElement("div");
  root.className = "guide";
  root.innerHTML = `
  <div class="guide-rail" aria-hidden="true"><i class="guide-rail-fill"></i></div>
  <nav class="guide-dots" aria-label="Разделы страницы"></nav>
  <div class="guide-bot-wrap">
    <div class="guide-bubble" role="status" aria-live="polite" hidden>
      <button type="button" class="guide-close" aria-label="Скрыть подсказку">×</button>
      <button type="button" class="guide-voice" aria-pressed="true" aria-label="Выключить голос Диги" title="Голос Диги"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path class="wave" d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><path class="cross" d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      <span class="guide-name">Диги · AI-ассистент Digital Lab</span>
      <p class="guide-text"></p>
      <p class="guide-extra"></p>
      <div class="guide-actions"></div>
    </div>
    <button type="button" class="guide-bot" aria-label="Диги, AI-ассистент Digital Lab — показать подсказку">
      <svg class="ai-avatar" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="aiBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2130"/><stop offset="1" stop-color="#080b10"/></linearGradient>
          <linearGradient id="aiSkin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d96a3"/><stop offset=".22" stop-color="#e9edf2"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".78" stop-color="#d9dee5"/><stop offset="1" stop-color="#6f7884"/></linearGradient>
          <linearGradient id="aiShade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b0e14" stop-opacity=".45"/></linearGradient>
          <linearGradient id="aiGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3446"/><stop offset=".5" stop-color="#05070b"/><stop offset="1" stop-color="#121a28"/></linearGradient>
          <linearGradient id="aiNeck" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b212b"/><stop offset=".5" stop-color="#3a4452"/><stop offset="1" stop-color="#1b212b"/></linearGradient>
          <filter id="aiGlow" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="1"/></filter>
        </defs>
        <rect width="100" height="100" fill="url(#aiBg)"/>
        <path d="M8 104 C10 88 24 82 36 80 L64 80 C76 82 90 88 92 104 Z" fill="url(#aiSkin)"/>
        <path d="M8 104 C10 88 24 82 36 80 L64 80 C76 82 90 88 92 104 Z" fill="url(#aiShade)"/>
        <path d="M30 86 C40 83 60 83 70 86" stroke="#7d8794" stroke-width=".6" fill="none"/>
        <path d="M41 66 L59 66 L61 82 L39 82 Z" fill="url(#aiNeck)"/>
        <path d="M43 70 H57 M42.5 74 H57.5 M42 78 H58" stroke="#5a6574" stroke-width=".7"/>
        <path d="M50 12 C66 12 75 24 75 40 C75 52 72 60 66 66 C61 71 56 74 50 74 C44 74 39 71 34 66 C28 60 25 52 25 40 C25 24 34 12 50 12 Z" fill="url(#aiSkin)"/>
        <path d="M50 12 C66 12 75 24 75 40 C75 52 72 60 66 66 C61 71 56 74 50 74 C44 74 39 71 34 66 C28 60 25 52 25 40 C25 24 34 12 50 12 Z" fill="url(#aiShade)"/>
        <path d="M50 12 V27" stroke="#aab3bf" stroke-width=".5"/>
        <path d="M31 52 C35 61 41 66 50 67 C59 66 65 61 69 52" stroke="#9aa3af" stroke-width=".6" fill="none"/>
        <path d="M26.5 38 C26 46 27 50 29 54" stroke="#7f8995" stroke-width=".6" fill="none"/>
        <path d="M73.5 38 C74 46 73 50 71 54" stroke="#7f8995" stroke-width=".6" fill="none"/>
        <path d="M28 34 C36 30 64 30 72 34 L71 45 C63 49 37 49 29 45 Z" fill="url(#aiGlass)"/>
        <path d="M31 34.5 C40 32 58 32 66 33.5" stroke="#ffffff" stroke-opacity=".28" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <path d="M30 45.5 C38 49 62 49 70 45.5" stroke="#2f6bff" stroke-width=".9" fill="none" opacity=".95"/>
        <g class="ai-eyes">
          <path d="M35 40.2 L45 39.4" stroke="#5c8bff" stroke-width="3" stroke-linecap="round" filter="url(#aiGlow)"/>
          <path d="M55 39.4 L65 40.2" stroke="#5c8bff" stroke-width="3" stroke-linecap="round" filter="url(#aiGlow)"/>
          <path d="M35.5 40.1 L44.5 39.4" stroke="#dce7ff" stroke-width="1.1" stroke-linecap="round"/>
          <path d="M55.5 39.4 L64.5 40.1" stroke="#dce7ff" stroke-width="1.1" stroke-linecap="round"/>
        </g>
        <path d="M50 50 V57" stroke="#aab3bf" stroke-width=".6"/>
        <path d="M45 61 H55 M46 63 H54" stroke="#8b95a1" stroke-width=".7" stroke-linecap="round"/>
        <circle cx="25.5" cy="41" r="4" fill="#cfd5dc" stroke="#7f8995" stroke-width=".6"/>
        <circle cx="74.5" cy="41" r="4" fill="#cfd5dc" stroke="#7f8995" stroke-width=".6"/>
        <circle cx="74.5" cy="41" r="1.4" fill="#2f6bff"/>
      </svg>
      
    </button>
  </div>`;
  document.body.appendChild(root);
  const bot = $(".guide-bot", root),
    wrap = $(".guide-bot-wrap", root),
    bubble = $(".guide-bubble", root),
    textEl = $(".guide-text", root),
    extraEl = $(".guide-extra", root),
    actions = $(".guide-actions", root),
    fill = $(".guide-rail-fill", root),
    dotsNav = $(".guide-dots", root);

  // Section dots on the rail (desktop navigation).
  sections.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.go = s.dataset.guide;
    b.setAttribute("aria-label", NAMES[s.dataset.guide] || s.dataset.guide);
    b.innerHTML = `<span>${NAMES[s.dataset.guide] || ""}</span>`;
    b.onclick = () => goTo(s);
    dotsNav.appendChild(b);
  });
  const dots = $$("button", dotsNav);

  function goTo(el) {
    const y = el.getBoundingClientRect().top + scrollY - (el.id === "hero" ? 0 : 70);
    scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }

  // ---- bubble -------------------------------------------------------------------
  let typing = 0,
    hideTimer = 0,
    hovering = false,
    current = null,
    lastShown = null;
  function say(text, opts = {}) {
    clearTimeout(hideTimer);
    cancelAnimationFrame(typing);
    bubble.hidden = false;
    root.classList.add("talking");
    requestAnimationFrame(() => bubble.classList.add("open"));
    extraEl.textContent = opts.extra || "";
    extraEl.hidden = !opts.extra;
    actions.innerHTML = "";
    if (opts.next) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "guide-next";
      b.textContent = opts.next;
      b.onclick = () => {
        const i = sections.findIndex((s) => s.dataset.guide === current);
        const nxt = sections[Math.min(sections.length - 1, i + 1)];
        close();
        goTo(nxt);
      };
      actions.appendChild(b);
    }
    if (opts.link) {
      const a = document.createElement("a");
      a.className = "guide-next";
      a.href = opts.link.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = opts.link.label;
      actions.appendChild(a);
    }
    if (reduced) textEl.textContent = text;
    else {
      const start = performance.now();
      const tick = (now) => {
        const n = Math.min(text.length, Math.floor((now - start) / 16));
        textEl.textContent = text.slice(0, n);
        if (n < text.length) typing = requestAnimationFrame(tick);
      };
      textEl.textContent = "";
      typing = requestAnimationFrame(tick);
    }
    bot.classList.remove("hop");
    void bot.offsetWidth;
    bot.classList.add("hop");
    scheduleHide(opts.stay);
  }
  function scheduleHide(stay) {
    clearTimeout(hideTimer);
    if (stay) return;
    hideTimer = setTimeout(() => {
      if (!hovering) close();
      else scheduleHide();
    }, isMobile() ? 6000 : 7500);
  }
  function close() {
    clearTimeout(hideTimer);
    bubble.classList.remove("open");
    root.classList.remove("talking");
    setTimeout(() => {
      if (!bubble.classList.contains("open")) bubble.hidden = true;
    }, 320);
  }
  let greeted = false,
    holdUntil = 0;
  const POSES = { hero: 1, why: 4, products: 4, works: 2, how: 3, team: 1, faq: 4, contact: 5 };
  function pose() {}
  function sayFor(name) {
    const l = LINES[name];
    if (!l) return;
    pose(POSES[name] || 1);
    lastShown = name;
    const text = typeof l.text === "function" ? l.text() : l.text;
    if (name === "hero") greeted = true;
    say(text, l);
  }
  bubble.addEventListener("pointerenter", () => (hovering = true));
  bubble.addEventListener("pointerleave", () => (hovering = false));
  $(".guide-close", root).onclick = close;
  bot.onclick = () => {
    if (bubble.classList.contains("open")) close();
    else sayFor(current || "hero");
  };

  // ---- scroll tracking: current chapter, rail position, walking -----------------------
  let started = false;
  let target = 0,
    shown = 0,
    pendingSection = null,
    sectionTimer = 0,
    walkTimer = 0;
  function track() {
    const H = innerHeight,
      max = Math.max(1, document.documentElement.scrollHeight - H);
    target = Math.min(1, scrollY / max);
    let name = sections[0].dataset.guide;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= H * 0.45) name = s.dataset.guide;
    }
    if (name !== pendingSection) {
      pendingSection = name;
      clearTimeout(sectionTimer);
      sectionTimer = setTimeout(() => {
        if (pendingSection === current) return;
        current = pendingSection;
        document.body.dataset.section = current;
        dots.forEach((d) => d.toggleAttribute("aria-current", d.dataset.go === current));
        if (current !== lastShown && started && performance.now() > holdUntil) sayFor(current);
      }, 450);
    }
    root.classList.add("walking");
    clearTimeout(walkTimer);
    walkTimer = setTimeout(() => root.classList.remove("walking"), 260);
  }
  function placeDots() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    sections.forEach((s, i) => {
      const y = Math.min(1, (s.getBoundingClientRect().top + scrollY) / max);
      dots[i].style.setProperty("--y", y.toFixed(4));
    });
  }
  function animate() {
    shown += (target - shown) * (reduced ? 1 : 0.12);
    root.style.setProperty("--p", shown.toFixed(4));
    fill.style.transform = `scaleY(${shown.toFixed(4)})`;
    requestAnimationFrame(animate);
  }
  addEventListener("scroll", track, { passive: true });
  addEventListener("resize", () => {
    placeDots();
    track();
  });
  addEventListener("load", placeDots);
  placeDots();
  track();
  animate();

  setTimeout(() => {
    started = true;
    current = pendingSection || "hero";
    document.body.dataset.section = current;
    dots.forEach((d) => d.toggleAttribute("aria-current", d.dataset.go === current));
    sayFor(current);
  }, 1400);


  // ---- voice ------------------------------------------------------------------
  // Browsers only allow sound after the visitor interacts with the page, so Диги
  // greets out loud on the first click / tap / key press. A recorded file can
  // replace the browser voice: put its path into VOICE_FILE.
  const VOICE_FILE = null; // e.g. "assets/digi-voice.mp3"
  const GREETING = "Привет, я Диги! Расскажу тебе, как всё здесь устроено. Следуй за мной.";
  const voiceBtn = $(".guide-voice", root);
  let voiceOn = true;
  try { voiceOn = localStorage.getItem("digi-voice") !== "off"; } catch (e) {}
  let greetedAloud = false, audioEl = null;
  function renderVoice() {
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));
    voiceBtn.setAttribute("aria-label", voiceOn ? "Выключить голос Диги" : "Включить голос Диги");
    root.classList.toggle("voice-off", !voiceOn);
  }
  function pickVoice() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const ru = vs.filter((v) => /^ru/i.test(v.lang));
    const pref = ["Milena", "Google русский", "Yuri", "Microsoft Svetlana", "Microsoft Irina", "Microsoft Dmitry"];
    for (const p of pref) { const v = ru.find((x) => x.name.includes(p)); if (v) return v; }
    return ru[0] || null;
  }
  function stopVoice() {
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    root.classList.remove("speaking");
  }
  function speak(text) {
    if (!voiceOn) return;
    stopVoice();
    if (VOICE_FILE) {
      audioEl = audioEl || new Audio(VOICE_FILE);
      root.classList.add("speaking");
      audioEl.onended = () => root.classList.remove("speaking");
      audioEl.play().catch(() => root.classList.remove("speaking"));
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ru-RU";
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.pitch = 1.0;
    u.onstart = () => root.classList.add("speaking");
    u.onend = u.onerror = () => root.classList.remove("speaking");
    speechSynthesis.speak(u);
  }
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};
  function greetAloud() {
    if (greetedAloud || !voiceOn) return;
    greetedAloud = true;
    if (!greeted) {
      greeted = true;
      lastShown = "hero";
      say(GREETING, { next: "Следуй за мной ↓" });
    }
    speak(GREETING);
  }
  const firstTouch = (e) => {
    if (e.target.closest && e.target.closest(".guide-voice")) return;
    removeEventListener("pointerdown", firstTouch, true);
    removeEventListener("keydown", firstTouch, true);
    greetAloud();
  };
  addEventListener("pointerdown", firstTouch, true);
  addEventListener("keydown", firstTouch, true);
  voiceBtn.onclick = (e) => {
    e.stopPropagation();
    voiceOn = !voiceOn;
    try { localStorage.setItem("digi-voice", voiceOn ? "on" : "off"); } catch (err) {}
    renderVoice();
    if (!voiceOn) stopVoice();
    else { greetedAloud = true; speak(GREETING); }
  };
  bot.addEventListener("click", () => { if (voiceOn && !greetedAloud) greetAloud(); });
  addEventListener("pagehide", stopVoice);
  renderVoice();
})();
