🇷🇺 [Читать на русском языке](./README.ru.md)

**[Live Demo](https://zhna42.github.io/omnifont/)** — Google Fonts and custom JSON modes.

# omnifont

**A zero-dependency, ultra-lightweight headless font manager for Canvas, SVG, and WebGL graphics engines.** Fetch binary font data from Google Fonts or any custom JSON backend using micro-optimized path schemas.

Built for vector editors, CAD/CAM laser pipelines, and 3D renderers where you need raw `ArrayBuffer` font data on demand — without a single runtime dependency and without any opinion about your UI.

### Key Features

- **Headless & UI-agnostic** — pure state, cache, and network logic. Bring your own React/Vue/Svelte/vanilla UI.
- **Zero dependencies** — 100% native Web APIs (`fetch`, `Map`, `Set`, `FontFace`). No lodash, no parsers, no polyfills.
- **Hybrid mode** — Google Fonts out of the box, or any custom JSON payload from your own backend.
- **Dynamic path mapping** — map arbitrary JSON shapes with a tiny `*` and `.` pattern syntax.
- **Advanced network optimization** — list previews use the Google Fonts `&text=` parameter to load only the glyphs you render, saving ~99% of preview bandwidth.
- **Promise-based cache with race-condition protection** — concurrent requests for the same binary resolve to a single in-flight `fetch`.

---

## Installation

```bash
npm install omnifont
# or
pnpm add omnifont
# or
yarn add omnifont
```

---

## Quick Start

### Scenario A — Google Fonts Mode

```ts
import { FontManager, type FontItem } from 'omnifont';

const manager = new FontManager({
  apiKey: import.meta.env.VITE_GOOGLE_FONTS_KEY,
  googleSort: 'popularity',
});

// Fetches and parses the full Google Fonts catalog into typed FontItem[].
const fonts: FontItem[] = await manager.init();

console.log(fonts.length); // e.g. 1500+
```

### Scenario B — Universal Custom JSON Mode

No API key required. Describe where your fields live, then feed in the raw response.

```ts
import { FontManager } from 'omnifont';

// Raw payload from your backend, any shape you like.
const json = [
  { name: 'Inter', cdn: { url: 'https://cdn.acme.io/inter.woff2' } },
  { name: 'Roboto', cdn: { url: 'https://cdn.acme.io/roboto.woff2' } },
];

const manager = new FontManager();

const fonts = manager
  .setPattern({ family: '*.name', url: '*.cdn.url' })
  .loadRawData(json);

console.log(fonts[0].family); // "Inter"
```

---

## UI Integration & Network Optimization

`omnifont` never downloads binary font files just to render a list. When you build your font picker, call `registerUiPreview(font, textSample)` per row. It **lazily injects a lightweight CSS rule (~2KB)** — for Google Fonts it hits the CSS2 endpoint with `&text=`, so only the glyphs in your sample are fetched — letting each row render instantly in its own typeface.

```ts
const listEl = document.querySelector('#font-list') as HTMLElement;

for (const font of manager.search('')) {
  const row = document.createElement('div');
  row.textContent = font.family;
  row.style.fontFamily = `"${font.family}", ${font.category}`;

  // Injects ~2KB of CSS for just this sample text. No binary download.
  manager.registerUiPreview(font, font.family);

  row.addEventListener('click', () => manager.select(font));
  listEl.appendChild(row);
}
```

Identical injections are de-duplicated via an internal `Set`, so re-rendering the list is free.

---

## Loading State & Preloaders

Switching weight or style, or confirming a selection, triggers a network request. Subscribe to `onLoading` to drive a spinner. The library emits `{ loading, phase, font, variant }` with `loading:true` at the start and `loading:false` at the end (even on error). `phase` is one of `catalog` (`init`), `preview`, or `confirm`.

Use the awaitable `preview(font, variant, textSample)` API to load a specific variant and wait until its glyphs are actually ready (via the native `FontFaceSet`), so your preloader reflects real readiness:

```ts
const spinner = document.querySelector('#spinner') as HTMLElement;

const off = manager.onLoading(({ loading, phase }) => {
  if (phase === 'preview' || phase === 'confirm') {
    spinner.classList.toggle('active', loading);
  }
});

// On weight/style change — resolve the variant from library metadata and load it.
const meta = manager.getVariantMetadata(font);
const variant = manager.resolveVariant(font, '700', 'italic');
await manager.preview(font, variant, sampleText); // emits preview loading events

// later, when tearing down:
off(); // unsubscribe
```

---

## Building the Variant Panel

Drive the weight/italic control panel entirely from the library — no hardcoded values:

```ts
import { FontManager, type VariantMetadata } from 'omnifont';

// When a font is selected, build controls from metadata.
function onFontSelect(font: FontItem): void {
  const meta: VariantMetadata = manager.getVariantMetadata(font);
  // meta.weights   → ["300", "400", "600", "700"]
  // meta.hasItalic → true / false
  // meta.hasNormal → true / false

  // Populate the weight dropdown.
  const weightSelect = document.querySelector('#weight-select') as HTMLSelectElement;
  weightSelect.innerHTML = '';
  for (const w of meta.weights) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `${w} · ${weightLabel[w] ?? ''}`;
    weightSelect.appendChild(opt);
  }
  weightSelect.value = meta.defaultVariant.weight;

  // Italic checkbox — enabled only when italic variants exist.
  const italicCheck = document.querySelector('#italic-check') as HTMLInputElement;
  italicCheck.checked = false;
  italicCheck.disabled = !meta.hasItalic;
}

// On any control change, resolve the concrete variant:
const variant = manager.resolveVariant(
  font,
  weightSelect.value,                       // "700"
  italicCheck.checked ? 'italic' : 'normal', // "normal"
);
// variant → { id: "700", weight: "700", style: "normal", url: "…" }
```

`resolveVariant` follows a fallback chain: exact weight & style match → same weight, opposite style → defaultVariant. Missing combinations never throw.

---

## Confirming Selection

When the user commits, `confirm()` downloads the full binary (through the race-safe cache, emitting `confirm` loading events) and hands you a clean `ArrayBuffer` ready for any graphics core.

```ts
manager.select(font); // or manager.select(font, '700italic')

const { family, variantId, buffer } = await manager.confirm();
// buffer: ArrayBuffer
```

Pipe the `buffer` straight into your engine:

```ts
import opentype from 'opentype.js';

// Vector glyph outlines for Canvas/SVG/CAD paths.
const typeface = opentype.parse(buffer);
const path = typeface.getPath('LASER-CUT', 0, 0, 72);
console.log(path.toSVG(2));
```

```ts
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// Three.js expects parsed JSON; opentype/facetype conversion feeds TextGeometry.
const loader = new FontLoader();
const face = loader.parse(convertToTypefaceJson(buffer));
```

Call `manager.cancel()` to discard the pending selection without any network activity.

---

## Custom Path JSON Schema

`setPattern` maps any backend shape to `FontItem[]` using two operators:

- `.` descends into an object property (`meta.file.url`).
- `*` flattens the current array or object values, so downstream segments apply to every element.
- Column paths (`*.name`, `*.cdn.url`) are resolved independently and zipped positionally into font entries.

Given a deeply nested, irregular backend response:

```ts
const payload = {
  result: {
    families: [
      { title: 'Inter',  assets: { woff2: 'https://cdn/inter.woff2' },  group: 'sans-serif' },
      { title: 'Lora',   assets: { woff2: 'https://cdn/lora.woff2' },   group: 'serif' },
    ],
  },
};

const fonts = manager
  .setPattern({
    family: 'result.families.*.title',
    url: 'result.families.*.assets.woff2',
    category: 'result.families.*.group',
  })
  .loadRawData(payload);
```

For collections you can also set a `root` and use paths relative to each element:

```ts
manager.setPattern({
  root: 'result.families',
  family: 'title',
  url: 'assets.woff2',
  category: 'group',
});
```

Missing paths never throw — they resolve to empty results and are skipped (with a warning when `debug: true`).

---

## API Key Security (Production Note)

Your Google Fonts `apiKey` ships in the client bundle and **is publicly visible**. This is expected for browser-side usage — lock it down at the platform level, not in code:

1. In **Google Cloud Console → APIs & Services → Credentials**, edit the key and enable **HTTP Referrer Restrictions**.
2. Add referrer masks for your origins only:

   ```
   http://localhost/*
   https://your-app.com/*
   ```

This restricts the key to requests originating from your domains, neutralizing any leaked-key abuse.

---

## License

MIT
