/* ================================================================
   Inline Shader Demos for the Deep Dive Article
   Each demo is a self-contained Three.js scene in a <canvas>.
   ================================================================ */

(function () {
  'use strict';

  /* ── Shared vertex shader ───────────────────────────────────── */
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

  /* ── Shared noise GLSL (included in every demo) ─────────────── */
  const noiseGLSL = `
    precision highp float;
    uniform float time;
    uniform float seed;
    uniform sampler2D grainTex;
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
  `;

  /* ── Demo shaders ───────────────────────────────────────────── */

  const demoShaders = {
    noise: noiseGLSL + `
      void main() {
        vec2 uv = vUv;
        float scale = 3.0;
        vec2 st = uv * scale;

        // Left half: raw simplex noise
        float raw = snoise01(vec2(st.x + time * 0.02, st.y - time * 0.04 + seed));

        // Right half: domain-warped noise
        float warped = pattern(st * 0.5);

        float n = (uv.x < 0.498) ? raw : warped;

        // Divider line
        float divider = smoothstep(0.002, 0.0, abs(uv.x - 0.5));
        vec3 col = vec3(n);
        col = mix(col, vec3(0.3), divider);

        gl_FragColor = vec4(col, 1.0);
      }
    `,

    mask: noiseGLSL + `
      void main() {
        vec2 uv = vUv;

        vec2 d = uv - vec2(0.5, 0.50);
        float ca = cos(0.50), sa = sin(0.50);
        d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
        d *= 0.70;

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

        gl_FragColor = vec4(vec3(blurAlpha), 1.0);
      }
    `,

    full: noiseGLSL + `
      void main() {
        vec2 uv = vUv;
        vec2 p  = gl_FragCoord.xy;

        vec3 grainColor = texture2D(grainTex,
          mod(p * 1.0 * 5.0, 1024.0) / 1024.0).rgb;

        vec2 d = uv - vec2(0.5, 0.50);
        float ca = cos(0.50), sa = sin(0.50);
        d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
        d *= 0.70;

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

        float gr = pow(grainColor.r, 1.5) + 0.5 * (1.0 - blurAlpha);
        float gg = grainColor.g;
        float ax = 0.05 * gr * cos(gg * 2.0 * PI);
        float ay = 0.05 * gr * sin(gg * 2.0 * PI);

        float ndx = 1.0 * 0.2 + 0.1 * (1.0 - blurAlpha);
        float ndy = 2.0 * 0.2 + 0.1 * (1.0 - blurAlpha);
        float nx = uv.x * ndx + ax;
        float ny = uv.y * ndy + ay;

        float n = pattern(vec2(nx, ny));
        n = pow(n * 1.05, 6.0);
        n = smoothstep(0.0, 1.0, n);

        vec3 back  = vec3(0.05);
        vec3 front = vec3(0.84, 0.86, 0.80);
        vec3 result = mix(back, front, n);

        gl_FragColor = vec4(result, blurAlpha);
      }
    `
  };

  /* ── Demo renderer factory ──────────────────────────────────── */

  function createDemo(canvasEl, shaderKey) {
    const frag = demoShaders[shaderKey];
    if (!frag) return;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true });
    renderer.setClearColor(0x0d0d0d, 1);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 5;

    const demoUniforms = {
      time:     { value: 0 },
      seed:     { value: Math.random() * 100 },
      grainTex: { value: null }
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        uniforms: demoUniforms,
        vertexShader,
        fragmentShader: frag,
        transparent: true
      })
    );
    scene.add(mesh);

    const loader = new THREE.TextureLoader();
    loader.loadAsync('grain.webp').then(tex => {
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      demoUniforms.grainTex.value = tex;
    });

    function resize() {
      const rect = canvasEl.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      canvasEl.style.width  = w + 'px';
      canvasEl.style.height = h + 'px';
      const asp = w / h;
      camera.left = -asp; camera.right = asp;
      camera.top = 1;     camera.bottom = -1;
      camera.updateProjectionMatrix();
    }

    let running = false;
    const t0 = performance.now();

    function loop() {
      if (!running) return;
      demoUniforms.time.value = (performance.now() - t0) * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !running) {
          running = true;
          resize();
          loop();
        } else if (!entry.isIntersecting && running) {
          running = false;
        }
      });
    }, { threshold: 0.05 });

    observer.observe(canvasEl);
    window.addEventListener('resize', () => { if (running) resize(); });
  }

  /* ── Initialize all demos ───────────────────────────────────── */

  function init() {
    document.querySelectorAll('[data-demo]').forEach(canvas => {
      createDemo(canvas, canvas.dataset.demo);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();
