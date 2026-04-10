# Deconstructing a Black Hole

An interactive, scroll-driven deep dive into the WebGL fragment shader behind a procedural black hole animation. No pre-rendered frames, no video — just math running live on your GPU.

**[Live Demo →](https://vaidikv.github.io/deconstructing-a-black-hole)**

---

## What It Is

This project is a single-page interactive article that walks through a custom GLSL fragment shader, piece by piece. The black hole animation you see in the background is the very shader being explained — running in real time as you read.

Topics covered:

- **Fragment shaders & WebGL** — how a GPU computes color per pixel
- **Simplex noise** — coherent noise as the foundation of the effect
- **Domain warping** — using noise to distort the coordinates of other noise, creating organic turbulence
- **Grain texture** — a 1024×1024 `.webp` encoding polar displacement vectors (magnitude + angle) per pixel
- **Procedural shape mask** — a black hole ring and accretion disk built entirely in GLSL with `smoothstep`
- **Contrast thresholding** — using a power curve (`pow(n, 6.0)`) to crush noise into sparse, bright particles
- **Color compositing** — blending everything with a two-layer Three.js scene

---

## Tech Stack

| Layer | Tool |
|---|---|
| 3D / WebGL bridge | [Three.js r128](https://threejs.org/) |
| Scroll & UI animations | [GSAP 3.12](https://gsap.com/) |
| Shading language | GLSL (via `THREE.RawShaderMaterial`) |
| Noise | Ashima Arts simplex noise (Ian McEwan & Stefan Gustavson) |
| Fonts | Hanken Grotesk, Inter, Space Mono (Google Fonts) |

---

## File Structure

```
deconstructing-a-black-hole/
├── index.html          # Article content + inline GLSL shader code
├── main.js             # Three.js scene setup, shader uniforms, render loop
├── demos.js            # In-article interactive WebGL demo canvases
├── gsap-animations.js  # Scroll-triggered GSAP animations
├── style.css           # Layout, typography, dark theme
└── grain.webp          # 1024×1024 polar displacement texture
```

---

## Running Locally

No build step required. Just serve the files over HTTP (browsers block local WebGL texture loading via `file://`):

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then open `http://localhost:8080`.

---

## How the Shader Works (TL;DR)

1. **Noise** — Simplex noise drifts over time, animated via `time` and randomized per session via `seed` uniforms.
2. **Domain warping** — Three nested layers of noise feed into each other, creating turbulent, swirling patterns.
3. **Grain displacement** — A `.webp` texture displaces each pixel's noise lookup, breaking up smooth gradients into gritty particles.
4. **Shape mask** — A procedural donut + horizontal band forms the black hole ring and accretion disk. The outer radius varies with a simulated elevation angle to fake a 3D torus.
5. **Threshold** — `pow(n * 1.05, 6.0)` crushes most of the noise field to black. Only the brightest peaks survive as visible particles.
6. **Composite** — The grain plane is transparent outside the mask; the solid dark background plane shows through, creating the void.

---

## Credits

- Grain texture, simplex noise, domain warping technique, and animation parameters inspired by **[p5aholic (Keita Yamada)](https://p5aholic.me)**. The original effect uses a pre-rendered blur texture for the shape mask; this project replaces that with a procedural GLSL black hole.
- Simplex noise implementation by **Ian McEwan and Stefan Gustavson** (Ashima Arts).
