/* Digital Lab: цели Метрики, форма заявки, липкая кнопка Telegram.
   На прод не выкатывать, пока не заполнены TODO ниже и нет ок Алины. */
(() => {
  "use strict";

  const CONFIG = {
    // ID счётчика Яндекс.Метрики (bydigitallab.ru). Данные принимаются только с указанных в настройках адресов, превью не засчитываются
    YM_ID: 113868406,
    // Vercel-функция api/lead.js (Илья). При ошибке или недоступности открываем Telegram с текстом заявки
    FORM_ENDPOINT: "/api/lead",
    TG_URL: "https://t.me/alinaaa_ss",
  };

  const DEBUG = /[?&]debug_goals\b/.test(location.search);

  // ---- Метрика ------------------------------------------------------------
  const ymLoaded = !!document.querySelector('script[src*="mc.yandex.ru/metrika/tag.js"]');
  if (CONFIG.YM_ID && !ymLoaded) {
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(s);
    window.ym(CONFIG.YM_ID, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }

  // Цели: cta_click, form_submit, tg_click
  function goal(name, params) {
    try {
      if (CONFIG.YM_ID && typeof window.ym === "function") window.ym(CONFIG.YM_ID, "reachGoal", name, params);
    } catch (e) { /* аналитика не должна ломать сайт */ }
    if (DEBUG) console.log("[goal]", name, params || "");
  }
  window.dlGoal = goal;

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    let names = (a.dataset.goal || "").split(/\s+/).filter(Boolean);
    // любая ссылка на Telegram без разметки считается tg_click
    if (!names.length && /^https:\/\/t\.me\//.test(a.getAttribute("href") || "")) names = ["tg_click"];
    names.forEach((n) => goal(n, { place: a.dataset.place || "" }));
  });

  // ---- Подстановка услуги из карточек ------------------------------------
  const form = document.getElementById("lead-form");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-service]");
    if (!a || !form) return;
    const task = form.elements.task;
    if (!task) return;
    // подставленная ранее услуга заменяется, текст пользователя после неё сохраняется
    const rest = task.value.replace(/^Услуга: .*?\.\s/, "");
    task.value = "Услуга: " + a.dataset.service + ". " + rest;
  });

  // ---- Форма --------------------------------------------------------------
  if (form) {
    const status = document.getElementById("leadStatus");
    const say = (text, ok, html) => {
      status.className = "lead-status " + (ok ? "is-ok" : "is-err");
      if (html) status.innerHTML = html; else status.textContent = text;
    };
    const tgLink = (text) => CONFIG.TG_URL + "?text=" + encodeURIComponent(text);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.elements.website.value) return; // honeypot

      const f = form.elements;
      const data = { name: f.name.value.trim(), contact: f.contact.value.trim(), task: f.task.value.trim(), page: location.href, consent: f.consent.checked };
      let bad = null;
      for (const k of ["name", "contact", "task"]) {
        const ok = data[k].length >= f[k].minLength;
        f[k].setAttribute("aria-invalid", ok ? "false" : "true");
        if (!ok && !bad) bad = f[k];
      }
      const chk = f.consent.closest("label");
      chk.classList.toggle("is-bad", !data.consent);
      if (!bad && !data.consent) { say("Для отправки нужно согласие на обработку персональных данных.", false); f.consent.focus(); return; }
      if (bad) { say("Заполните, пожалуйста, все поля.", false); bad.focus(); return; }

      const message = "Заявка с сайта bydigitallab.ru\nИмя: " + data.name + "\nКонтакт: " + data.contact + "\nЗадача: " + data.task;

      // Резервный путь: готовая заявка открывается в Telegram, остаётся нажать «Отправить»
      // Ссылка открывается по клику посетителя (жест пользователя), без window.open после await:
      // Safari/iOS такое блокирует. Со страницы не уходим, форму очищаем.
      const openTelegram = (note) => {
        const url = tgLink(message);
        goal("form_submit", { mode: "telegram" });
        say("", true, "");
        status.textContent = "";
        const p = document.createElement("span");
        p.textContent = note + " ";
        const a = document.createElement("a");
        a.href = url; a.target = "_blank"; a.rel = "noopener";
        a.className = "btn primary lead-open";
        a.textContent = "Открыть Telegram";
        a.dataset.goal = "tg_click"; a.dataset.place = "form-fallback";
        status.append(p, document.createElement("br"), a);
        form.reset();
        a.focus();
      };

      if (CONFIG.FORM_ENDPOINT) {
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 10000);
          const r = await fetch(CONFIG.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ website: "" }, data)), signal: ctl.signal });
          clearTimeout(timer);
          if (!r.ok) throw new Error(r.status);
          goal("form_submit");
          form.reset();
          say("Спасибо! Получили заявку, вернёмся с вариантом, сроком и ценой в рабочее время.", true);
        } catch (err) {
          // endpoint недоступен или вернул ошибку: не теряем заявку
          openTelegram("Форма сейчас недоступна, но заявка не потеряна: нажмите кнопку, откроется Telegram с готовым текстом, останется нажать «Отправить».");
        } finally { btn.disabled = false; }
        return;
      }

      openTelegram("Нажмите кнопку: откроется Telegram с готовым текстом заявки, останется нажать «Отправить».");
    });
  }

  // ---- Липкая кнопка: только телефон (CSS), скрыта на первом экране и у формы
  const sticky = document.getElementById("stickyTg");
  if (sticky && "IntersectionObserver" in window) {
    sticky.hidden = false;
    const watch = ["hero", "contact"].map((id) => document.getElementById(id)).filter(Boolean);
    const seen = new Set();
    const update = () => sticky.classList.toggle("is-off", seen.size > 0);
    sticky.classList.add("is-off");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? seen.add(en.target.id) : seen.delete(en.target.id)));
      update();
    }, { threshold: 0.35 });
    watch.forEach((el) => io.observe(el));
  }
})();
