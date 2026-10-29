// POST /api/lead: заявка с формы -> сообщение в Telegram.
// Env (только в Vercel Environment Variables): TG_BOT_TOKEN, TG_CHAT_ID, опц. ALLOWED_ORIGINS (через запятую), DRY_RUN=1
// Тело: JSON {name, contact, task, page, website(honeypot), consent?}

const LIMITS = { name: 80, contact: 120, task: 1200, page: 300 };
const MIN = { name: 2, contact: 3, task: 0 };
const RATE = { windowMs: 10 * 60 * 1000, perIp: 3, global: 30 };
const hits = new Map(); // ip -> [timestamps]; живёт в пределах тёплого инстанса (best-effort)
let globalHits = [];
const recent = new Map(); // дедуп одинаковых заявок

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || "https://bydigitallab.ru,https://www.bydigitallab.ru")
    .split(",").map((s) => s.trim()).filter(Boolean);

const clean = (v, max) =>
  String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

function rateLimited(ip, now) {
  globalHits = globalHits.filter((t) => now - t < RATE.windowMs);
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (arr.length >= RATE.perIp || globalHits.length >= RATE.global) { hits.set(ip, arr); return true; }
  arr.push(now); globalHits.push(now); hits.set(ip, arr);
  if (hits.size > 1000) for (const [k, v] of hits) if (!v.some((t) => now - t < RATE.windowMs)) hits.delete(k);
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const send = (code, body) => res.status(code).json(body);

  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(405, { ok: false, error: "method" }); }

  // Только с нашего сайта (браузерный CSRF/чужие формы). Без Origin (curl) тоже отсекаем.
  const origin = req.headers.origin || "";
  if (!allowedOrigins().includes(origin)) return send(403, { ok: false, error: "origin" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return send(400, { ok: false, error: "bad_json" });

  // honeypot: бот заполнил скрытое поле. Отвечаем «успехом», ничего не шлём.
  if (body.website) return send(200, { ok: true });

  const d = {
    name: clean(body.name, LIMITS.name),
    contact: clean(body.contact, LIMITS.contact),
    task: clean(body.task, LIMITS.task),
    page: clean(body.page, LIMITS.page),
  };
  for (const k of Object.keys(MIN)) if (d[k].length < MIN[k]) return send(422, { ok: false, error: "invalid", field: k });
  // консенс: на форме пока текст-уведомление, чекбокса нет. Если Максим добавит чекбокс и пришлёт consent:false, отклоняем.
  if (body.consent === false) return send(422, { ok: false, error: "invalid", field: "consent" });

  const now = Date.now();
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip, now)) return send(429, { ok: false, error: "rate_limit" });

  const key = d.contact + "|" + d.task;
  if (recent.has(key) && now - recent.get(key) < RATE.windowMs) return send(200, { ok: true });
  recent.set(key, now);
  if (recent.size > 500) recent.clear();

  const text =
    "Заявка с сайта bydigitallab.ru\n" +
    "Имя: " + d.name + "\nКонтакт: " + d.contact + "\nЧем занимаются: " + (d.task || "не указано") +
    (d.page ? "\nСтраница: " + d.page : "") +
    "\nСогласие на обработку ПД: да (уведомление под формой)";

  if (process.env.DRY_RUN === "1") { console.log("[lead DRY_RUN]", JSON.stringify(d)); return send(200, { ok: true, dry: true }); }

  const token = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
  if (!token || !chat) { console.error("lead: TG_BOT_TOKEN/TG_CHAT_ID не заданы"); return send(500, { ok: false, error: "config" }); }

  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }), // без parse_mode: пользовательский текст не интерпретируется
    });
    clearTimeout(t);
    if (!r.ok) { console.error("lead: telegram status", r.status); recent.delete(key); return send(502, { ok: false, error: "telegram" }); }
    return send(200, { ok: true });
  } catch (e) {
    console.error("lead: telegram error", e && e.name);
    recent.delete(key);
    return send(502, { ok: false, error: "telegram" });
  }
};
