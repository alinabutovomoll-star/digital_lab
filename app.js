const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let paused = reduced.matches;

// ---------------------------------------------------------------------------
// One continuous page: scroll position drives the 3D logo, the 3D numerals,
// the background glow and the thread layer (thread.js).
// ---------------------------------------------------------------------------
const clamp = (x) => Math.max(0, Math.min(1, x));
const heroEl = $("#hero"),
  heroInner = $(".flow-hero-inner"),
  whyEl = $("#why"),
  howEl = $("#how"),
  whyCards = $$("[data-why]"),
  steps = $$("[data-step]"),
  logoLayer = $("#logo-webgl"),
  digitLayer = $("#digits-webgl");
window.labMotion = {
  progress: 0,
  paused,
  mobile: innerWidth <= 700,
  visible: true,
};
window.labProcess = { progress: 0, animated: true, paused, visible: false };

// Scroll offsets at which each card sits in the reading line (55% of viewport).
function stops(cards) {
  const line = innerHeight * 0.55;
  return cards.map((c) => {
    const r = c.getBoundingClientRect();
    return scrollY + r.top + r.height / 2 - line;
  });
}
function piecewise(y, ys, from = 0) {
  if (y <= ys[0]) return from === null ? 0 : clamp(y / Math.max(1, ys[0]));
  for (let i = 1; i < ys.length; i++)
    if (y < ys[i]) return i - 1 + (y - ys[i - 1]) / Math.max(1, ys[i] - ys[i - 1]);
  return ys.length - 1;
}
function nearest(cards) {
  let best = -1,
    bestD = Infinity;
  cards.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    if (r.bottom < innerHeight * 0.12 || r.top > innerHeight * 0.88) return;
    const d = Math.abs(r.top + r.height / 2 - innerHeight * 0.55);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
let pending = 0;
function updateFlow() {
  pending = 0;
  const H = innerHeight,
    y = scrollY,
    mobile = innerWidth <= 700;
  // Hero → benefits: logo travels left (desktop) and spins once per benefit.
  // The logo finishes its move to the left before the chapter title arrives,
  // then turns a little further with every benefit card.
  const head = whyEl.querySelector(".flow-head").getBoundingClientRect();
  const headStop = Math.max(1, scrollY + head.top + head.height / 2 - H * 0.92);
  const ys = [0, headStop, ...stops(whyCards)],
    ps = [0, 0.95, 1.4, 2.2, 3];
  let heroP = 3;
  for (let i = 1; i < ys.length; i++)
    if (y < ys[i]) {
      heroP = ps[i - 1] + ((ps[i] - ps[i - 1]) * (y - ys[i - 1])) / Math.max(1, ys[i] - ys[i - 1]);
      break;
    }
  const lastWhy = whyCards[whyCards.length - 1].getBoundingClientRect();
  const logoOpacity = clamp((lastWhy.bottom - H * 0.12) / (H * 0.38));
  Object.assign(window.labMotion, {
    progress: Math.min(3, heroP),
    paused,
    mobile,
    visible: logoOpacity > 0.01,
  });
  logoLayer.style.opacity = logoOpacity.toFixed(3);
  const fade = clamp((y - H * 0.08) / (H * 0.5));
  heroInner.style.opacity = (1 - fade).toFixed(3);
  heroInner.style.transform = paused ? "none" : `translateY(${-fade * 60}px)`;
  heroEl.querySelector(".flow-hero-foot").style.opacity = (1 - fade * 1.6).toFixed(3);

  // Process: the numerals change as each step reaches the reading line.
  const hr = howEl.getBoundingClientRect();
  const stepStops = stops(steps);
  const procP = y <= stepStops[0] ? 0 : piecewise(y, stepStops, null);
  const lastStep = steps[steps.length - 1].getBoundingClientRect();
  const howHead = howEl.querySelector(".flow-head").getBoundingClientRect();
  const digitOpacity = Math.min(
    mobile
      ? clamp((H * 0.3 - howHead.bottom) / (H * 0.2))
      : clamp((H * 0.62 - hr.top) / (H * 0.32)),
    clamp((lastStep.bottom - H * 0.12) / (H * 0.38)),
  );
  Object.assign(window.labProcess, {
    progress: procP,
    paused: paused || reduced.matches,
    visible: digitOpacity > 0.01,
  });
  digitLayer.style.opacity = digitOpacity.toFixed(3);
  const fallback = $(".process-number-fallback");
  if (fallback) fallback.textContent = String(Math.round(procP) + 1);

  // Card focus states (cards stay on the page — they stack, not replace).
  const wa = nearest(whyCards),
    sa = nearest(steps);
  whyCards.forEach((c, i) => c.classList.toggle("is-active", i === wa));
  steps.forEach((c, i) => c.classList.toggle("is-active", i === sa));

  // Device mockups drift slightly with scroll.
  $$(".device-stage").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < H && rect.bottom > 0) {
      const t = paused
        ? 0
        : Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - H / 2) / H));
      el.style.setProperty("--device-y", `${t * 30}px`);
      el.style.setProperty("--device-tilt", `${t * 7}deg`);
    }
  });
}
window.labUpdateFlow = updateFlow;
addEventListener(
  "scroll",
  () => {
    if (!pending) pending = requestAnimationFrame(updateFlow);
  },
  { passive: true },
);
addEventListener("resize", () => {
  if (!pending) pending = requestAnimationFrame(updateFlow);
});
addEventListener("load", updateFlow);
updateFlow();

// Cards and blocks reveal one under another as they enter the viewport.
const revealTargets = $$(
  ".flow-card,.flow-head,.section-head,.price-folder,.case-tile,.instagram-feature,.founder-profile,.faq-item,#contact .w > *",
);
if ("IntersectionObserver" in window && !reduced.matches) {
  const obs = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  revealTargets.forEach((e, i) => {
    e.classList.add("flow-in");
    const siblings = [...e.parentElement.children].filter((x) => x.classList.contains("flow-in"));
    e.style.setProperty("--i", siblings.indexOf(e));
    obs.observe(e);
  });
} else revealTargets.forEach((e) => e.classList.add("is-in"));

const motion = $("#motion-toggle");
function setMotion() {
  window.labMotion.paused = paused;
  document.body.classList.toggle("motion-paused", paused);
  if (motion) {
    motion.setAttribute("aria-pressed", paused);
    motion.textContent = paused ? "Продолжить движение ▷" : "Пауза движения Ⅱ";
  }
  updateFlow();
}
if (motion)
  motion.onclick = () => {
    paused = !paused;
    setMotion();
  };
setMotion();

const menu = $("#mobileMenu"),
  toggle = $(".mobile-menu-toggle");
toggle.onclick = () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", open);
  menu.setAttribute("aria-hidden", !open);
  menu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
};
function closeMenu() {
  toggle.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-hidden", "true");
  menu.classList.remove("open");
  document.body.classList.remove("menu-open");
}
$$("#mobileMenu a").forEach((a) => (a.onclick = closeMenu));
addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
const cases = {
  web: {
    category: "RVNW / WEB EXPERIENCE",
    title: "Бизнес-клуб. Сильное первое впечатление.",
    description:
      "Разработали сайт RVNW: от структуры и текстов до дизайна, адаптива и готовой версии. Помогли представить клуб, направления и события в единой системе.",
    images: [],
    photos: ["video:video-web", "drive-web-01", "drive-web-02", "drive-web-03", "drive-web-04", "drive-web-05", "drive-web-06", "drive-web-07", "drive-web-08", "drive-web-09"],
    label: "Сайт RVNW",
    interest: "Сайт",
  },
  app: {
    category: "NK / TELEGRAM MINI APP",
    title: "Весь клуб. В одном приложении.",
    description:
      "Mini App для резидентов NK: профиль, подписка, каталог, база знаний, трекинг и внутренние разделы. Всё нужное участнику собрано в одном месте.",
    images: [],
    photos: ["video:video-nk", "drive-nk-01", "drive-nk-02", "drive-nk-03", "drive-nk-04", "drive-nk-05", "drive-nk-06", "drive-nk-07", "drive-nk-08", "drive-nk-09", "drive-nk-10", "drive-nk-11", "drive-nk-12", "drive-nk-13", "drive-nk-14", "drive-nk-15"],
    label: "Mini App NK",
    interest: "Telegram-продукт",
  },
  payment: {
    category: "RVNW / PAYMENT DESK",
    title: "От суммы — к оплате.",
    description:
      "Закрытый интерфейс для команды: ввод суммы в долларах, QR-код и платёжная ссылка. Приём оплаты через Stripe Checkout — на месте или по ссылке.",
    images: [],
    photos: ["video:video-pay", "drive-pay-01", "drive-pay-02", "drive-pay-03", "drive-pay-04", "drive-pay-05"],
    label: "Payment desk RVNW",
    interest: "Платёжная система",
  },
  bot: {
    category: "RVNW / TELEGRAM BOT",
    title: "Знакомство, которое ведёт к действию.",
    description:
      "Бот для направлений Online и Miami. Сценарии связаны с сайтом, оплатой и коммуникацией с менеджером.",
    images: [],
    photos: ["video:video-bot", "drive-bot-01", "drive-bot-02", "drive-bot-03", "drive-bot-04", "drive-bot-05", "drive-bot-06", "drive-bot-07", "drive-bot-08", "drive-bot-09", "drive-bot-10"],
    label: "Telegram-бот RVNW",
    interest: "Telegram-бот",
  },
  system: {
    category: "BUSINESS / MANAGEMENT SYSTEM",
    title: "Видеть бизнес целиком.",
    description:
      "ДДС, P&L, план/факт, счета и автоматические своды. Статьи, проекты и отчётность связаны между собой. Примеры интерфейсов из портфолио Digital Lab.",
    images: [
      "management-dashboard",
      "mgmt-dds-pro",
      "mgmt-pnl-pro",
      "mgmt-settings-pro",
    ],
    label: "Управленческая система",
    interest: "Управленческая система",
  },
};
const dialog = $("#detail-dialog"),
  content = $("#detail-content");
let activeCase,
  index = 0,
  opener;
function telegram(topic) {
  return (
    "https://t.me/alinaaa_ss?text=" +
    encodeURIComponent(
      "Привет, Алина! Хочу обсудить проект с Digital Lab. Интересует: " +
        topic.toLowerCase() +
        ".",
    )
  );
}
const shots = (c) => c.photos || c.images;
function showImage() {
  const c = cases[activeCase],
    list = shots(c),
    path = `assets/${list[index]}.webp`;
  $$(".pd-thumbs button").forEach((t, i) => t.toggleAttribute("aria-current", i === index));
  const isVideo = String(list[index]).startsWith("video:");
  if (c.photos && isVideo) {
    const src = `assets/${list[index].slice(6)}.mp4`;
    const holder = $("#gallery-image");
    const v = document.createElement("video");
    Object.assign(v, { src, controls: true, autoplay: true, muted: false, loop: true, playsInline: true, poster: `assets/${list[index].slice(6)}-poster.jpg` });
    v.volume = 0.6;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    v.id = "gallery-image";
    v.className = "pd-photo";
    holder.replaceWith(v);
    $(".pd-stage")?.style.removeProperty("--bgimg");
    $("#gallery-count").textContent = `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
    $("#original-image").href = src;
    $$(".pd-thumbs button").forEach((t, i) => t.toggleAttribute("aria-current", i === index));
    return;
  }
  if (c.photos && $("#gallery-image").tagName === "VIDEO") {
    const img = document.createElement("img");
    img.id = "gallery-image";
    img.className = "pd-photo";
    $("#gallery-image").replaceWith(img);
  }
  if (c.photos) {
    const img = $("#gallery-image");
    img.src = path;
    $(".pd-stage")?.style.setProperty("--bgimg", `url(${path})`);
    img.alt = `${c.label} — фото ${index + 1}`;
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
    $("#gallery-count").textContent =
      `${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
    $("#original-image").href = path;
    return;
  }
  const type =
    activeCase === "web" ||
    activeCase === "system" ||
    c.images[index] === "rvnw-bot-06"
      ? "laptop"
      : "phone";
  $("#gallery-device").className = `device device-${type}`;
  $("#gallery-image").src = path;
  $("#gallery-image").alt = `${c.label} — экран ${index + 1}`;
  $("#gallery-count").textContent =
    `${String(index + 1).padStart(2, "0")} / ${String(c.images.length).padStart(2, "0")}`;
  $("#original-image").href = path;
}
function step(d) {
  const n = shots(cases[activeCase]).length;
  index = (index + d + n) % n;
  showImage();
}
$$("[data-case]").forEach(
  (b) =>
    (b.onclick = () => {
      opener = b;
      activeCase = b.dataset.case;
      index = 0;
      const c = cases[activeCase];
      const list = shots(c);
      const media = c.photos
        ? '<img id="gallery-image" class="pd-photo" alt="">'
        : '<div class="device-gallery pd-device"><div class="device device-phone" id="gallery-device"><div class="device-display"><span class="device-camera" aria-hidden="true"></span><div class="device-screen"><img id="gallery-image" alt=""></div></div><span class="device-base" aria-hidden="true"></span></div></div>';
      const thumbs = list
        .map((x, i) =>
          String(x).startsWith("video:")
            ? `<button type="button" data-i="${i}" class="is-video" aria-label="Видео" style="background-image:url(assets/${x.slice(6)}-poster.jpg)"><span>▶</span></button>`
            : `<button type="button" data-i="${i}" aria-label="Фото ${i + 1}" style="background-image:url(assets/${x}.webp)"></button>`,
        )
        .join("");
      content.innerHTML = `<div class="pd${c.photos ? "" : " pd-screens"}"><div class="pd-stage">${media}<button type="button" class="pd-nav pd-prev" id="gallery-prev" aria-label="Предыдущее изображение">←</button><button type="button" class="pd-nav pd-next" id="gallery-next" aria-label="Следующее изображение">→</button><span class="pd-count" id="gallery-count" aria-live="polite"></span></div><div class="pd-info"><span class="pd-chip">${c.category}</span><h2 id="detail-title">${c.title}</h2><p>${c.description}</p><div class="pd-thumbs">${thumbs}</div><div class="pd-actions"><a class="pd-cta" href="${telegram(c.interest)}" target="_blank" rel="noopener">Обсудить похожий продукт <b>↗</b></a><a id="original-image" class="pd-link" target="_blank" rel="noopener">Открыть в полном размере</a></div></div></div>`;
      $$(".pd-thumbs button").forEach((t) => (t.onclick = () => { index = Number(t.dataset.i); showImage(); }));
      $("#gallery-prev").onclick = () => step(-1);
      $("#gallery-next").onclick = () => step(1);
      showImage();
      dialog.showModal();
      document.body.classList.add("dialog-open");
      dialog.scrollTop = 0;
    }),
);
$("#close-dialog").onclick = () => dialog.close();
dialog.addEventListener("close", () => {
  dialog.querySelectorAll("video").forEach((v) => v.pause());
  document.body.classList.remove("dialog-open");
  opener?.focus({ preventScroll: true });
});
dialog.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    step(1);
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    step(-1);
  }
});
dialog.addEventListener("click", (e) => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    dialog.close();
});

// Founder expertise: manual tabs keep reading pace in the visitor's hands.
const expertiseTabs = $$('.expertise-tabs [role="tab"]');
function selectExpertise(index, focus = false) {
  expertiseTabs.forEach((tab, i) => {
    const active = i === index;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  });
  if (focus) expertiseTabs[index].focus({ preventScroll: true });
}
expertiseTabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectExpertise(i));
  tab.addEventListener("keydown", (e) => {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % expertiseTabs.length;
    else if (e.key === "ArrowLeft")
      next = (i - 1 + expertiseTabs.length) % expertiseTabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = expertiseTabs.length - 1;
    else return;
    e.preventDefault();
    selectExpertise(next, true);
  });
});
