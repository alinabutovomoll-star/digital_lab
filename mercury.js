// Digital Lab — «ртуть»: жидкая хромированная лента, которая течёт через весь сайт.
// Лента привязана к документу: при скролле зритель движется вдоль неё,
// а по ней самой постоянно бегут блики. Рядом вьются две тонкие нити
// фирменных цветов — сапфировая и янтарная.
(() => {
  const host = document.querySelector(".flow-layers");
  if (!host) return;
  const canvas = document.createElement("canvas");
  canvas.className = "mercury-layer";
  canvas.setAttribute("aria-hidden", "true");
  host.insertBefore(canvas, host.firstChild.nextSibling);
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { canvas.remove(); return; }

  const vs = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
  const fs = `
precision highp float;
uniform vec2 R;        // canvas size, px
uniform float S;       // scroll offset, canvas px
uniform float T;       // time, s
uniform float K;       // css px -> canvas px
uniform float M;       // 1 on mobile

// centre line of the main stream as a function of document position s (css px)
float cx(float s){
  float a = 0.5 + 0.40 * sin(s * 0.00105 + 0.9) + 0.07 * sin(s * 0.0031 + T * 0.35);
  return mix(a, 0.5 + 0.44 * sin(s * 0.0012 + 0.6), M);
}
float twist(float s){ return s * 0.0042 + T * 0.55; }

vec3 env(float u, float flow){
  // studio stripes sliding along the stream -> liquid metal highlights
  float bands = 0.5 + 0.5 * sin(u * 7.0 + flow);
  vec3 c = mix(vec3(0.05,0.06,0.09), vec3(0.62,0.66,0.74), smoothstep(0.15, 0.85, u));
  c += vec3(1.0) * pow(bands, 18.0) * 0.9;
  c += vec3(0.85,0.9,1.0) * smoothstep(0.80, 0.98, u) * 0.8;
  return c;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float y = (R.y - fc.y);                 // canvas px from top
  float s = (y + S) / K;                  // document css px
  float x = fc.x / R.x;

  float c0 = cx(s), c1 = cx(s + 2.0);
  float slope = (c1 - c0) * R.x / (2.0 * K);   // dx/dy in px
  float stretch = sqrt(1.0 + slope * slope);

  float th = twist(s);
  float w0 = mix(26.0, 15.0, M) * K;
  float w = w0 * (0.22 + 0.78 * abs(cos(th)));
  float dpx = (x - c0) * R.x / stretch;     // perpendicular-ish distance, canvas px
  float v = dpx / w;

  vec4 col = vec4(0.0);

  // soft sapphire glow around the stream
  float halo = exp(-max(abs(dpx) - w, 0.0) / (34.0 * K));
  col.rgb += vec3(0.14, 0.26, 0.95) * halo * 0.16;
  col.a += halo * 0.16;

  // mercury body
  float aa = 1.2 * K / w;
  float body = 1.0 - smoothstep(1.0 - aa, 1.0, abs(v));
  if (body > 0.0) {
    float nz = sqrt(max(1.0 - v * v, 0.0));
    float side = sign(cos(th));
    // reflected direction across the tube, flipped as the ribbon turns over
    float u = 0.5 + 0.5 * (2.0 * v * nz * side);
    float flow = s * 0.018 - T * 2.4;
    vec3 m = env(u, flow);
    // iridescent rim: sapphire on one side, amber on the other
    float rim = pow(1.0 - nz, 2.2);
    vec3 iri = mix(vec3(0.20, 0.35, 1.0), vec3(1.0, 0.45, 0.14), 0.5 + 0.5 * sin(s * 0.0023 + v * 1.7 + T * 0.4));
    m = mix(m, iri * 1.25, rim * 0.75);
    // the ribbon's thin edge catches light when it turns
    m += vec3(0.9, 0.93, 1.0) * pow(1.0 - abs(cos(th)), 6.0) * 0.6;
    float shade = 0.55 + 0.45 * nz;
    m *= shade;
    col = mix(col, vec4(m, 1.0), body);
  }

  // two thin brand threads braiding around the stream
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float ph = fi * 3.14159;
    float off = (mix(46.0, 28.0, M) * K) * sin(s * 0.0062 + ph + T * 0.5);
    float d = abs(dpx - off);
    float tw = mix(1.6, 1.2, M) * K;
    float line = 1.0 - smoothstep(tw, tw + 1.4 * K, d);
    float glow = exp(-d / (9.0 * K)) * 0.35;
    vec3 tint = i == 0 ? vec3(0.32, 0.47, 1.0) : vec3(1.0, 0.50, 0.18);
    // threads pass behind the stream when their phase is "back"
    float behind = step(0.0, -cos(s * 0.0062 + ph + T * 0.5)) * body;
    float k = (line + glow) * (1.0 - behind);
    float sparkle = 0.6 + 0.4 * sin(s * 0.03 - T * 3.0 + fi * 2.0);
    col.rgb += tint * k * sparkle;
    col.a = max(col.a, clamp(k, 0.0, 1.0));
  }

  gl_FragColor = vec4(col.rgb, clamp(col.a, 0.0, 1.0));
}`;
  function sh(t, src) {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) { canvas.remove(); return; }
  const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["R", "S", "T", "K", "M"].forEach((n) => (U[n] = gl.getUniformLocation(p, n)));
  gl.clearColor(0, 0, 0, 0);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let k = 1, mobile = false;
  function resize() {
    mobile = innerWidth <= 700;
    k = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.25);
    canvas.width = Math.round(innerWidth * k);
    canvas.height = Math.round(innerHeight * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener("resize", resize); resize();

  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || document.querySelector("dialog[open]")) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.R, canvas.width, canvas.height);
    gl.uniform1f(U.S, scrollY * k);
    gl.uniform1f(U.T, reduced ? 4 : (now - t0) / 1000);
    gl.uniform1f(U.K, k);
    gl.uniform1f(U.M, mobile ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
