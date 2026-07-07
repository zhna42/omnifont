🇬🇧 [Read in English](./README.md)

**[Живое демо](https://zhna42.github.io/omnifont/)** — режимы Google Fonts и кастомного JSON.

# omnifont

**Легковесный headless-менеджер шрифтов с нулевыми зависимостями для графических движков Canvas, SVG и WebGL.** Получайте бинарные данные шрифтов из Google Fonts или любого кастомного JSON-бэкенда через микро-оптимизированные схемы путей.

Создан для векторных редакторов, конвейеров лазерной резки CAD/CAM и 3D-рендеров, где нужен сырой `ArrayBuffer` шрифта по требованию — без единой рантайм-зависимости и без каких-либо предположений о вашем UI.

### Ключевые возможности

- **Headless-архитектура, независимость от UI** — только логика состояния, кэша и сети. Ваш UI на React/Vue/Svelte/vanilla — на ваше усмотрение.
- **Нулевые зависимости** — 100% нативные Web API (`fetch`, `Map`, `Set`, `FontFace`). Никаких lodash, парсеров или полифилов.
- **Гибридный режим** — Google Fonts «из коробки» либо любой кастомный JSON-ответ вашего бэкенда.
- **Динамический маппинг путей** — сопоставление произвольных JSON-структур через компактный синтаксис `*` и `.`.
- **Продвинутая сетевая оптимизация** — превью списков используют параметр Google Fonts `&text=`, подгружая только отрисовываемые глифы и экономя до ~99% пропускной способности сети на превью.
- **Promise-кэш с защитой от состояния гонки** — параллельные запросы к одному бинарнику разрешаются в единственный `fetch` «в полёте».

---

## Установка

```bash
npm install omnifont
# или
pnpm add omnifont
# или
yarn add omnifont
```

---

## Быстрый старт

### Сценарий А — режим Google Fonts

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

### Сценарий Б — универсальный режим кастомного JSON

API-ключ не требуется. Опишите, где лежат ваши поля, и передайте сырой ответ.

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

## Интеграция с UI и сетевая оптимизация

`omnifont` никогда не скачивает бинарные файлы шрифтов ради отрисовки списка. При построении своего пикера вызывайте `registerUiPreview(font, textSample)` для каждой строки. Метод реализует **ленивую загрузку (lazy loading)**: он лениво инжектит лёгкое CSS-правило (~2KB) — для Google Fonts это запрос к CSS2-эндпоинту с параметром `&text=`, поэтому скачиваются **только глифы из вашего образца текста**. За счёт этого каждая строка мгновенно отображается своим шрифтом, а экономия трафика пользователя достигает **до 99%**: вместо полного бинарника грузятся лишь символы, нужные для строки-превью.

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

Идентичные инжекции дедуплицируются через внутренний `Set`, поэтому повторный рендер списка ничего не стоит.

---

## Состояние загрузки и прелоадеры

Смена толщины или наклона, а также подтверждение выбора инициируют сетевой запрос. Подпишитесь на `onLoading`, чтобы управлять прелоадером. Библиотека эмитит `{ loading, phase, font, variant }` со значением `loading:true` в начале и `loading:false` в конце (даже при ошибке). `phase` — одно из `catalog` (`init`), `preview` или `confirm`.

Используйте асинхронный метод `preview(font, variant, textSample)`, чтобы загрузить конкретное начертание и дождаться фактической готовности его глифов (через нативный `FontFaceSet`) — так прелоадер отражает реальную готовность:

```ts
const spinner = document.querySelector('#spinner') as HTMLElement;

const off = manager.onLoading(({ loading, phase }) => {
  if (phase === 'preview' || phase === 'confirm') {
    spinner.classList.toggle('active', loading);
  }
});

// При смене толщины/наклона — разрешаем вариант из метаданных библиотеки и грузим его.
const meta = manager.getVariantMetadata(font);
const variant = manager.resolveVariant(font, '700', 'italic');
await manager.preview(font, variant, sampleText); // эмитит события загрузки preview

// позже, при размонтировании:
off(); // отписка
```

---

## Построение панели начертаний

Панель управления толщиной/курсивом строится целиком из данных библиотеки — без хардкода:

```ts
import { FontManager, type VariantMetadata } from 'omnifont';

// При выборе шрифта строим контролы из метаданных.
function onFontSelect(font: FontItem): void {
  const meta: VariantMetadata = manager.getVariantMetadata(font);
  // meta.weights   → ["300", "400", "600", "700"]
  // meta.hasItalic → true / false
  // meta.hasNormal → true / false

  // Заполняем выпадающий список толщин.
  const weightSelect = document.querySelector('#weight-select') as HTMLSelectElement;
  weightSelect.innerHTML = '';
  for (const w of meta.weights) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = `${w} · ${weightLabel[w] ?? ''}`;
    weightSelect.appendChild(opt);
  }
  weightSelect.value = meta.defaultVariant.weight;

  // Чекбокс курсива — активен только при наличии italic-вариантов.
  const italicCheck = document.querySelector('#italic-check') as HTMLInputElement;
  italicCheck.checked = false;
  italicCheck.disabled = !meta.hasItalic;
}

// При любом изменении контролов разрешаем конкретный вариант:
const variant = manager.resolveVariant(
  font,
  weightSelect.value,                        // "700"
  italicCheck.checked ? 'italic' : 'normal', // "normal"
);
// variant → { id: "700", weight: "700", style: "normal", url: "…" }
```

`resolveVariant` использует цепочку фолбэков: точное совпадение веса и стиля → тот же вес в противоположном стиле → defaultVariant. Отсутствующие комбинации никогда не бросают исключений.

---

## Подтверждение выбора

Когда пользователь фиксирует выбор, `confirm()` скачивает полный бинарник (через кэш с защитой от состояния гонки, эмитя события загрузки `confirm`) и возвращает чистый `ArrayBuffer`, готовый для любого графического ядра.

```ts
manager.select(font); // or manager.select(font, '700italic')

const { family, variantId, buffer } = await manager.confirm();
// buffer: ArrayBuffer
```

Передайте `buffer` напрямую в ваш движок:

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

Вызовите `manager.cancel()`, чтобы сбросить ожидающий выбор без единого сетевого запроса.

---

## Синтаксис схемы путей для кастомного JSON

`setPattern` сопоставляет любую структуру бэкенда с `FontItem[]` при помощи двух операторов:

- `.` проваливается вглубь свойства объекта (`meta.file.url`).
- `*` разворачивает (flatten) текущий массив или значения объекта, распространяя последующие сегменты на каждый элемент.
- Пути-столбцы (`*.name`, `*.cdn.url`) вычисляются независимо и позиционно склеиваются (zip) в записи шрифтов.

Для глубоко вложенного и нерегулярного ответа бэкенда:

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

Для коллекций можно задать `root` и использовать пути относительно каждого элемента:

```ts
manager.setPattern({
  root: 'result.families',
  family: 'title',
  url: 'assets.woff2',
  category: 'group',
});
```

Отсутствующие пути никогда не бросают исключений — они разрешаются в пустой результат и пропускаются (с предупреждением при `debug: true`).

---

## Безопасность API-ключа (важно для продакшена)

Ваш `apiKey` от Google Fonts попадает в клиентский бандл и **виден публично**. Это ожидаемо для использования в браузере — ограничивайте ключ на уровне платформы, а не в коде:

1. В **Google Cloud Console → APIs & Services → Credentials (Учётные данные)** откройте ключ на редактирование и включите **Ограничения по HTTP-реферреру (HTTP Referrer Restrictions)**.
2. Добавьте маски реферреров только для ваших доменов:

   ```
   http://localhost/*
   https://your-app.com/*
   ```

Так ключ будет принимать запросы только с ваших доменов, что нейтрализует злоупотребление в случае утечки.

---

## Лицензия

MIT
