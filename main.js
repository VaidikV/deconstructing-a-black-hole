/* ================================================================
   Three.js — Black Hole Grain Shader
   Canonical implementation for the deep-dive article.
   ================================================================ */

const vertexShader = `
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D grainTex;
  uniform float time;
  uniform float seed;
  uniform vec3 back;
  uniform float param1;
  uniform float param2;
  uniform float param3;

  varying vec2 vUv;

  #define PI 3.141592653589793

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0),
                             dot(x12.xy,x12.xy),
                             dot(x12.zw,x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float snoise01(vec2 v) { return (1.0 + snoise(v)) * 0.5; }

  float noise2d(vec2 st) {
    return snoise01(vec2(st.x + time * 0.02, st.y - time * 0.04 + seed));
  }

  float pattern(vec2 p) {
    vec2 q = vec2(noise2d(p + vec2(0.0, 0.0)),
                  noise2d(p + vec2(5.2, 1.3)));
    vec2 r = vec2(noise2d(p + 4.0*q + vec2(1.7, 9.2)),
                  noise2d(p + 4.0*q + vec2(8.3, 2.8)));
    return noise2d(p + 1.0*r);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p  = gl_FragCoord.xy;

    vec3 grainColor = texture2D(grainTex,
      mod(p * param1 * 5.0, 1024.0) / 1024.0).rgb;

    // ── Black hole — ring + disk, rotated ~29°
    vec2 d = uv - vec2(0.63, 0.50);
    float ca = cos(0.50), sa = sin(0.50);
    d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
    d *= 0.79;

    float dist  = length(d);
    float holeR = 0.10;

    float sinEl  = d.y / (dist + 0.001);
    float outerR = mix(0.16, 0.135, (sinEl + 1.0) * 0.5);
    float equator = 1.0 - abs(sinEl);
    outerR += equator * equator * 0.015;
    float ring = smoothstep(holeR, holeR + 0.02, dist)
               * (1.0 - smoothstep(outerR, outerR + 0.06, dist));

    float taper = mix(0.07, 0.015, smoothstep(0.12, 0.35, abs(d.x)));
    float hBand = (1.0 - smoothstep(0.0, taper, abs(d.y)))
                * (1.0 - smoothstep(0.22, 0.40, abs(d.x)));

    float blurAlpha = max(ring, hBand);

    // ── Polar displacement from grain texture
    float gr = pow(grainColor.r, 1.5) + 0.5 * (1.0 - blurAlpha);
    float gg = grainColor.g;
    float ax = param2 * gr * cos(gg * 2.0 * PI);
    float ay = param2 * gr * sin(gg * 2.0 * PI);

    float ndx = 1.0 * param3 + 0.1 * (1.0 - blurAlpha);
    float ndy = 2.0 * param3 + 0.1 * (1.0 - blurAlpha);
    float nx = uv.x * ndx + ax;
    float ny = uv.y * ndy + ay;

    float n = pattern(vec2(nx, ny));
    n = pow(n * 1.05, 6.0);
    n = smoothstep(0.0, 1.0, n);

    vec3 front = vec3(0.84, 0.86, 0.80);
    vec3 result = mix(back, front, n);

    gl_FragColor = vec4(result, blurAlpha);
  }
`;

/* ── Scene ─────────────────────────────────────────────────────── */

const canvas   = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene  = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-1, 1, 1/aspect, -1/aspect, 0.1, 1000);
camera.position.set(0, 0, 10);

/* ── Background plane ──────────────────────────────────────────── */
const bgUniforms = { color: { value: new THREE.Color(0.05, 0.05, 0.05) } };
const bgMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 4),
  new THREE.ShaderMaterial({
    uniforms: bgUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
    `,
    fragmentShader: `
      uniform vec3 color;
      void main() { gl_FragColor = vec4(color, 1.0); }
    `
  })
);
bgMesh.position.z = 0;
scene.add(bgMesh);

/* ── Grain mesh ────────────────────────────────────────────────── */
const uniforms = {
  grainTex:    { value: null },
  time:        { value: 0 },
  seed:        { value: Math.random() * 100.0 },
  back:        { value: new THREE.Vector3(0.05, 0.05, 0.05) },
  param1:      { value: 1.0 },
  param2:      { value: 0.05 },
  param3:      { value: 0.2 }
};

const circleMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 3),
  new THREE.RawShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true
  })
);
circleMesh.position.set(0, 0, 1);
scene.add(circleMesh);

/* ── Textures ──────────────────────────────────────────────────── */
const loader = new THREE.TextureLoader();
loader.loadAsync('grain.webp').then(grainTex => {
  grainTex.minFilter = THREE.NearestFilter;
  grainTex.magFilter = THREE.NearestFilter;
  grainTex.generateMipmaps = false;
  uniforms.grainTex.value = grainTex;
});

/* ── Resize ────────────────────────────────────────────────────── */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  const asp = w / h;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  if (w >= h) {
    camera.left = -1; camera.right = 1;
    camera.top  =  1/asp; camera.bottom = -1/asp;
  } else {
    camera.left = -asp; camera.right = asp;
    camera.top  =  1;   camera.bottom = -1;
  }
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

/* ── Render loop ───────────────────────────────────────────────── */
const t0 = performance.now();
(function loop() {
  uniforms.time.value = (performance.now() - t0) * 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();

/* ── Scroll dim ────────────────────────────────────────────────── */
const bgCanvas = document.getElementById('bg-canvas');
let dimmed = false;
window.addEventListener('scroll', () => {
  const past = window.scrollY > window.innerHeight * 0.5;
  if (past && !dimmed) { bgCanvas.classList.add('dimmed'); dimmed = true; }
  else if (!past && dimmed) { bgCanvas.classList.remove('dimmed'); dimmed = false; }
}, { passive: true });
