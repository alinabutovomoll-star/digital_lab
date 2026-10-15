// Digital Lab — "нить": one continuous web that lives behind the whole page.
// At the top it is a knot around the 3D logo, then it unravels, wraps every
// benefit card, braids diagonally through prices, envelops the portfolio,
// weaves itself into the 3D step numerals, hugs the founder portrait and
// finally ties back into a knot around the contact buttons.
import * as THREE from "./vendor/three.module.js";
import { digitShapes } from "./digit-shapes.js";

const canvas = document.querySelector("#thread");
const ctx = canvas && canvas.getContext("2d");
if (ctx) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const PALETTE = ["#5C8BFF", "#2F6BFF", "#A9BEFF", "#FF6A3D", "#E8EEF8"];
  const TAU = Math.PI * 2;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  };

  let W = 0,
    H = 0,
    DPR = 1,
    mobile = false,
    S = 0,
    M = 0,
    cur,
    tgt,
    tmp,
    fresh = true,
    phase = [],
    rho = [];

  // ---- digit outlines (same source as the 3D numerals) -------------------
  const digits = digitShapes.map((commands) => {
    const path = new THREE.ShapePath();
    for (const [method, ...args] of commands) path[method](...args);
    const shape = path.toShapes()[0];
    return { shape };
  });
  function sampleDigits() {
    digits.forEach((d) => {
      const outer = d.shape.getSpacedPoints(M - 1);
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      outer.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      const cx = (minX + maxX) / 2,
        cy = (minY + maxY) / 2;
      const norm = (pts) => pts.map((p) => [p.x - cx, p.y - cy]);
      d.outer = norm(outer);
      d.hole = d.shape.holes.length
        ? norm(d.shape.holes[0].getSpacedPoints(M - 1))
        : null;
    });
  }

  function setup() {
    const wasMobile = mobile;
    mobile = innerWidth <= 700;
    W = innerWidth;
    H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    if (!cur || wasMobile !== mobile) {
      S = mobile ? 9 : 14;
      M = mobile ? 110 : 150;
      cur = new Float32Array(S * M * 2);
      tgt = new Float32Array(S * M * 2);
      tmp = new Float32Array(S * M * 2);
      phase = [];
      rho = [];
      for (let s = 0; s < S; s++) {
        phase.push(s / S);
        rho.push(S > 1 ? s / (S - 1) - 0.5 : 0);
      }
      sampleDigits();
      fresh = true;
    }
  }
  addEventListener("resize", setup);
  setup();

  // ---- glow sprites -------------------------------------------------------
  const sprites = PALETTE.map((c) => {
    const g = document.createElement("canvas");
    g.width = g.height = 64;
    const x = g.getContext("2d");
    const rg = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.18, c);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = rg;
    x.fillRect(0, 0, 64, 64);
    return g;
  });

  // ---- geometry helpers ---------------------------------------------------
  const v3 = new THREE.Vector3();
  function project(x, y, z, obj, cam, out, k) {
    v3.set(x, y, z).applyMatrix4(obj.matrixWorld).project(cam);
    out[k] = (v3.x * 0.5 + 0.5) * W;
    out[k + 1] = (-v3.y * 0.5 + 0.5) * H;
  }
  // Torus knot (p=2, q=3) — identical to the ribbon around the logo.
  function knot(u, out) {
    const cu = Math.cos(u),
      su = Math.sin(u),
      qp = 1.5 * u,
      cs = Math.cos(qp),
      r = 1.2;
    out[0] = r * (2 + cs) * 0.5 * cu;
    out[1] = r * (2 + cs) * su * 0.5;
    out[2] = r * Math.sin(qp) * 0.5;
  }
  const kp = [0, 0, 0];
  function knotStrand(s, i, t, out3) {
    const u = (i / (M - 1)) * TAU * 2;
    knot(u, kp);
    const amp = 0.05 + Math.abs(rho[s]) * 0.42;
    const a = u * 3 + phase[s] * TAU + t * 0.35;
    out3[0] = kp[0] + Math.cos(a) * amp;
    out3[1] = kp[1] + Math.sin(a) * amp;
    out3[2] = kp[2] + Math.sin(a * 0.7 + phase[s] * 5) * amp;
  }
  // Rounded-rect perimeter, starting at the left-middle and going clockwise.
  const rp = [0, 0, 0, 0];
  function rrPoint(l, top, w, h, rad, v) {
    rad = Math.max(0, Math.min(rad, w / 2, h / 2));
    const sv = Math.max(0, h - 2 * rad),
      sh = Math.max(0, w - 2 * rad),
      arc = (Math.PI * rad) / 2;
    const segs = [sv / 2, arc, sh, arc, sv, arc, sh, arc, sv / 2];
    const total = segs.reduce((a, b) => a + b, 0) || 1;
    let d = (((v % 1) + 1) % 1) * total,
      k = 0;
    while (k < 8 && d > segs[k]) d -= segs[k++];
    const f = segs[k] ? d / segs[k] : 0;
    const arcAt = (cx, cy, a0) => {
      const a = a0 + f * (Math.PI / 2);
      rp[2] = Math.cos(a);
      rp[3] = Math.sin(a);
      rp[0] = cx + rp[2] * rad;
      rp[1] = cy + rp[3] * rad;
    };
    switch (k) {
      case 0:
        rp[0] = l; rp[1] = top + h / 2 - d; rp[2] = -1; rp[3] = 0; break;
      case 1:
        arcAt(l + rad, top + rad, Math.PI); break;
      case 2:
        rp[0] = l + rad + d; rp[1] = top; rp[2] = 0; rp[3] = -1; break;
      case 3:
        arcAt(l + w - rad, top + rad, Math.PI * 1.5); break;
      case 4:
        rp[0] = l + w; rp[1] = top + rad + d; rp[2] = 1; rp[3] = 0; break;
      case 5:
        arcAt(l + w - rad, top + h - rad, 0); break;
      case 6:
        rp[0] = l + w - rad - d; rp[1] = top + h; rp[2] = 0; rp[3] = 1; break;
      case 7:
        arcAt(l + rad, top + h - rad, Math.PI * 0.5); break;
      default:
        rp[0] = l; rp[1] = top + h - rad - d; rp[2] = -1; rp[3] = 0;
    }
    return rp;
  }
  function bez(a, b, c, d, u) {
    const m = 1 - u;
    return m * m * m * a + 3 * m * m * u * b + 3 * m * u * u * c + u * u * u * d;
  }
  // One strand: entry curve from (ax, ay) and then a woven loop around a rect.
  function wrapStrand(out, base, s, t, ax, ay, r, padBase, entryFrac = 0.3) {
    const i0 = Math.floor(M * entryFrac);
    const pad = padBase + Math.abs(rho[s]) * (mobile ? 18 : 30);
    const ex = r.left - pad,
      ey = r.top + r.height / 2;
    const c1x = ax + (ex - ax) * 0.35,
      c1y = ay + (ey - ay) * 0.05 - 60 + rho[s] * 160,
      c2x = ex - (mobile ? 40 : 140),
      c2y = ey + rho[s] * 220;
    for (let i = 0; i < M; i++) {
      const k = base + i * 2;
      if (i < i0) {
        const u = i / i0;
        out[k] = bez(ax, c1x, c2x, ex, u);
        out[k + 1] = bez(ay, c1y, c2y, ey, u);
      } else {
        const v = ((i - i0) / (M - 1 - i0)) * 1.04;
        const wob =
          Math.sin(v * TAU * 5 + phase[s] * 9 + t * 0.7) *
          (mobile ? 5 : 8) *
          (1 + Math.abs(rho[s]));
        const p = rrPoint(r.left, r.top, r.width, r.height, mobile ? 22 : 30, v);
        out[k] = p[0] + p[2] * (pad + wob);
        out[k + 1] = p[1] + p[3] * (pad + wob);
      }
    }
  }
  // Diagonal braid: the thread crossing the page between chapters.
  function flowStrand(out, base, s, t, ax, ay, bx, by, amp) {
    const dx = bx - ax,
      dy = by - ay,
      len = Math.hypot(dx, dy) || 1,
      nx = -dy / len,
      ny = dx / len;
    for (let i = 0; i < M; i++) {
      const u = i / (M - 1),
        k = base + i * 2;
      const off =
        Math.sin(u * TAU * 1.5 + phase[s] * TAU + t * 0.45) * amp * (0.35 + Math.abs(rho[s])) +
        rho[s] * amp * 0.9 +
        Math.sin(u * TAU * 4 + t * 0.8 + s) * 6;
      out[k] = ax + dx * u + nx * off;
      out[k + 1] = ay + dy * u + ny * off;
    }
  }

  // ---- shapes per chapter -------------------------------------------------
  const k3 = [0, 0, 0];
  function shapeKnotHero(out, t) {
    const hero = window.labScenes && window.labScenes.hero;
    for (let s = 0; s < S; s++)
      for (let i = 0; i < M; i++) {
        knotStrand(s, i, t, k3);
        const k = (s * M + i) * 2;
        if (hero) {
          // Same transform as the (now hidden) 3D ribbon.
          project(k3[0], k3[1], k3[2], hero.ribbon, hero.camera, out, k);
        } else {
          const R = Math.min(W, H) * (mobile ? 0.16 : 0.2);
          const a = t * 0.2,
            x = k3[0] * Math.cos(a) - k3[2] * Math.sin(a);
          out[k] = (mobile ? 0.5 : 0.7) * W + (x * R) / 1.8;
          out[k + 1] = (mobile ? 0.5 : 0.45) * H + (k3[1] * R) / 1.8;
        }
      }
  }
  function logoCenter() {
    const hero = window.labScenes && window.labScenes.hero;
    if (!hero) return [mobile ? W * 0.5 : W * 0.25, H * 0.45];
    const o = [0, 0];
    hero.logo.updateMatrixWorld();
    project(0, 0, 0, hero.logo, hero.camera, o, 0);
    return o;
  }
  const whyCards = [...document.querySelectorAll("[data-why]")];
  function shapeWhy(out, t) {
    shapeKnotHero(out, t);
    const [lx, ly] = logoCenter();
    const rects = whyCards.map((c) => c.getBoundingClientRect());
    for (let s = 0; s < S; s++) {
      const ci = s % rects.length,
        r = rects[ci];
      const reveal = smooth((H * 0.98 - r.top) / (H * 0.45));
      if (reveal <= 0) continue;
      const base = s * M * 2;
      wrapStrand(tmp, base, s, t, lx, ly, r, mobile ? 8 : 14);
      for (let i = 0; i < M * 2; i++)
        out[base + i] += (tmp[base + i] - out[base + i]) * reveal;
    }
  }
  function shapeFlow(dir) {
    return (out, t) => {
      const amp = mobile ? 70 : 150;
      for (let s = 0; s < S; s++)
        dir > 0
          ? flowStrand(out, s * M * 2, s, t, -0.1 * W, 0.04 * H, 1.1 * W, 0.96 * H, amp)
          : flowStrand(out, s * M * 2, s, t, 1.1 * W, 0.04 * H, -0.1 * W, 0.96 * H, amp);
    };
  }
  const tiles = [...document.querySelectorAll(".case-tile")];
  function shapeWorks(out, t) {
    const vis = tiles
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.bottom > -H * 0.2 && r.top < H * 1.2 && r.width > 0);
    if (!vis.length) return shapeFlow(1)(out, t);
    for (let s = 0; s < S; s++) {
      const r = vis[s % vis.length];
      wrapStrand(out, s * M * 2, s, t, -40, H * (0.1 + phase[s] * 0.3), r, mobile ? 6 : 10, 0.25);
    }
  }
  function shapeHow(out, t) {
    const proc = window.labScenes && window.labScenes.process;
    const state = window.labProcess || { progress: 0 };
    if (!proc) return shapeFlow(-1)(out, t);
    const p = Math.max(0, Math.min(3, state.progress)),
      a = Math.floor(p),
      b = Math.min(3, a + 1),
      f = smooth((p - a - 0.25) / 0.5);
    for (let s = 0; s < S; s++) {
      const ring = s % 5 === 4;
      const useHole = s % 4 === 3;
      const da = digits[a],
        db = digits[b];
      const ca = (useHole && da.hole) || da.outer,
        cb = (useHole && db.hole) || db.outer;
      const z = rho[s] * 0.55,
        infl = 1 + Math.abs(rho[s]) * 0.16;
      for (let i = 0; i < M; i++) {
        const k = (s * M + i) * 2;
        if (ring) {
          knotStrand(s, i, t, k3);
          project(k3[0] * 0.85, k3[1] * 0.85, k3[2] * 0.85 - 0.4, proc.anchor, proc.camera, out, k);
          continue;
        }
        const j = (i + Math.floor(phase[s] * 17)) % M;
        const wob = Math.sin(i * 0.35 + t * 0.9 + s) * 0.025;
        const x = (ca[j][0] + (cb[j][0] - ca[j][0]) * f) * infl + wob,
          y = (ca[j][1] + (cb[j][1] - ca[j][1]) * f) * infl + wob;
        project(x, y, z, proc.anchor, proc.camera, out, k);
      }
    }
  }
  function shapeTeam(out, t) {
    const el =
      document.querySelector(".founder-portrait") ||
      document.querySelector(".founder-profile");
    if (!el) return shapeFlow(1)(out, t);
    const r = el.getBoundingClientRect();
    for (let s = 0; s < S; s++)
      wrapStrand(out, s * M * 2, s, t, W + 40, H * (0.15 + phase[s] * 0.2), r, mobile ? 8 : 14, 0.3);
  }
  function shapeContact(out, t) {
    const el =
      document.querySelector("#contact .contact-actions") ||
      document.querySelector("#contact");
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2 - (mobile ? 40 : 60);
    const R = Math.min(W * (mobile ? 0.46 : 0.34), H * 0.34);
    const a = t * 0.18;
    for (let s = 0; s < S; s++)
      for (let i = 0; i < M; i++) {
        knotStrand(s, i, t, k3);
        const x = k3[0] * Math.cos(a) - k3[2] * Math.sin(a),
          k = (s * M + i) * 2;
        out[k] = cx + (x * R) / 1.75;
        out[k + 1] = cy + (k3[1] * R) / 1.75 * 0.78;
      }
  }
  const shapes = {
    hero: shapeKnotHero,
    why: shapeWhy,
    products: shapeFlow(1),
    works: shapeWorks,
    how: shapeHow,
    team: shapeTeam,
    faq: shapeFlow(-1),
    contact: shapeContact,
  };
  const sections = [...document.querySelectorAll("[data-guide]")];
  const weights = new Map();
  function computeWeights() {
    weights.clear();
    const lo = H * 0.22,
      hi = H * 0.78;
    let sum = 0,
      nearest = null,
      nd = Infinity;
    sections.forEach((el) => {
      const r = el.getBoundingClientRect();
      const ov = Math.max(0, Math.min(hi, r.bottom) - Math.max(lo, r.top)) / (hi - lo);
      const d = Math.abs((r.top + r.bottom) / 2 - H / 2);
      if (d < nd) {
        nd = d;
        nearest = el.dataset.guide;
      }
      if (ov > 0.001) {
        weights.set(el.dataset.guide, ov);
        sum += ov;
      }
    });
    if (!sum && nearest) {
      weights.set(nearest, 1);
      sum = 1;
    }
    for (const [k, w] of weights) weights.set(k, w / sum);
  }

  // ---- loop ---------------------------------------------------------------
  let last = performance.now(),
    t = 0;
  const shapeBuf = () => (shapeBuf.b && shapeBuf.b.length === S * M * 2 ? shapeBuf.b : (shapeBuf.b = new Float32Array(S * M * 2)));
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || document.querySelector("dialog[open]")) {
      last = now;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const paused = (window.labMotion && window.labMotion.paused) || reduced.matches;
    if (!paused) t += dt;

    computeWeights();
    tgt.fill(0);
    const buf = shapeBuf();
    for (const [name, w] of weights) {
      if (w < 0.002 || !shapes[name]) continue;
      buf.fill(0);
      shapes[name](buf, t);
      for (let i = 0; i < buf.length; i++) tgt[i] += buf[i] * w;
    }
    if (fresh) {
      cur.set(tgt);
      fresh = false;
    } else {
      for (let s = 0; s < S; s++)
        for (let i = 0; i < M; i++) {
          const u = i / (M - 1),
            rate = 1 - Math.exp(-dt * (paused ? 30 : 16 - 8 * u)),
            k = (s * M + i) * 2;
          cur[k] += (tgt[k] - cur[k]) * rate;
          cur[k + 1] += (tgt[k + 1] - cur[k + 1]) * rate;
        }
    }
    draw();
    window.labThreadReady = true;
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const shift = (scrollY / Math.max(1, document.documentElement.scrollHeight - H)) * W * 0.8;
    const grad = ctx.createLinearGradient(-shift, 0, W * 1.6 - shift, H);
    grad.addColorStop(0, PALETTE[0]);
    grad.addColorStop(0.3, PALETTE[1]);
    grad.addColorStop(0.55, PALETTE[2]);
    grad.addColorStop(0.8, PALETTE[3]);
    grad.addColorStop(1, PALETTE[0]);
    const master = mobile ? 0.62 : 0.78;
    for (let s = 0; s < S; s++) {
      const base = s * M * 2;
      ctx.beginPath();
      ctx.moveTo(cur[base], cur[base + 1]);
      for (let i = 1; i < M - 1; i++) {
        const k = base + i * 2;
        ctx.quadraticCurveTo(cur[k], cur[k + 1], (cur[k] + cur[k + 2]) / 2, (cur[k + 1] + cur[k + 3]) / 2);
      }
      ctx.lineTo(cur[base + (M - 1) * 2], cur[base + (M - 1) * 2 + 1]);
      const accent = s % 3 === 0;
      ctx.strokeStyle = accent ? PALETTE[(s / 3) % PALETTE.length | 0] : grad;
      ctx.globalAlpha = master * (0.2 + (0.5 - Math.abs(rho[s])) * 0.55) * (accent ? 0.8 : 1);
      ctx.lineWidth = s % 5 === 0 ? (mobile ? 1.2 : 1.5) : mobile ? 0.7 : 0.85;
      ctx.stroke();
    }
    // Woven nodes and light pulses running along the thread.
    for (let s = 0; s < S; s++) {
      const base = s * M * 2,
        spr = sprites[s % sprites.length];
      ctx.globalAlpha = master * 0.55;
      for (let i = 9; i < M; i += 22) {
        const k = base + i * 2;
        ctx.drawImage(spr, cur[k] - 3, cur[k + 1] - 3, 6, 6);
      }
      const pos = ((t * (0.05 + phase[s] * 0.05) + phase[s]) % 1) * (M - 1);
      const k = base + Math.floor(pos) * 2;
      const size = mobile ? 12 : 16;
      ctx.globalAlpha = master;
      ctx.drawImage(spr, cur[k] - size / 2, cur[k + 1] - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  requestAnimationFrame(frame);
}
