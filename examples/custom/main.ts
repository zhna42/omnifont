import { FontManager, type FontItem, type FontPattern, type VariantMetadata, type LoadingState } from '../../src/index';
import { customFontsJson } from './fonts';

// ── DOM ──
const loadStatus = document.getElementById('load-status') as HTMLElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const fontListEl = document.getElementById('font-list') as HTMLElement;

const selectedName = document.getElementById('selected-name') as HTMLElement;
const selectedCategory = document.getElementById('selected-category') as HTMLElement;
const preview = document.getElementById('preview') as HTMLTextAreaElement;
const preloader = document.getElementById('preloader') as HTMLElement;

const rightPlaceholder = document.getElementById('right-placeholder') as HTMLElement;
const rightPanel = document.getElementById('right-panel') as HTMLElement;
const weightSelect = document.getElementById('weight-select') as HTMLSelectElement;
const italicCheck = document.getElementById('italic-check') as HTMLInputElement;
const sizeRange = document.getElementById('size-range') as HTMLInputElement;
const sizeValue = document.getElementById('size-value') as HTMLElement;
const spacingRange = document.getElementById('spacing-range') as HTMLInputElement;
const spacingValue = document.getElementById('spacing-value') as HTMLElement;
const underlineCheck = document.getElementById('underline-check') as HTMLInputElement;
const uppercaseCheck = document.getElementById('uppercase-check') as HTMLInputElement;
const rightStatus = document.getElementById('right-status') as HTMLElement;
const applyBtn = document.getElementById('apply-btn') as HTMLButtonElement;

// Схема маппинга: шрифт содержит массив styles с явными weight, style и file.
const pattern: FontPattern = {
  root: 'data.fonts',
  family: 'name',
  category: 'type',
  url: 'file',
  variants: 'styles',
  variantUrl: 'file',
  variantWeight: 'weight',
  variantStyle: 'style',
};

const manager = new FontManager({ debug: true });
manager.setPattern(pattern);
const fonts: FontItem[] = manager.loadRawData(customFontsJson);
loadStatus.textContent = `Семейств: ${fonts.length}`;

// Прелоадер управляется событиями загрузки библиотеки (phase preview/confirm).
manager.onLoading((state: LoadingState) => {
  if (state.phase === 'preview' || state.phase === 'confirm') {
    preloader.classList.toggle('active', state.loading);
  }
});

let activeFont: FontItem | null = null;

renderList(fonts);

/** Рендерит список шрифтов слева; каждое имя написано своим шрифтом. */
function renderList(list: FontItem[]): void {
  fontListEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const font of list) {
    const item = document.createElement('div');
    item.className = 'font-item';
    item.textContent = font.family;
    item.dataset.family = font.family;
    manager.registerUiPreview(font, font.family);
    item.style.fontFamily = `"${font.family}", ${font.category}`;
    if (activeFont?.family === font.family) item.classList.add('selected');
    item.addEventListener('click', () => void selectFont(font));
    frag.appendChild(item);
  }
  fontListEl.appendChild(frag);
}

/** Человекочитаемая подпись для веса. */
function weightLabel(w: string): string {
  const names: Record<string, string> = {
    '100': 'Thin', '200': 'ExtraLight', '300': 'Light', '400': 'Regular',
    '500': 'Medium', '600': 'SemiBold', '700': 'Bold', '800': 'ExtraBold',
    '900': 'Black', '1000': 'Extra Black',
  };
  return `${w} · ${names[w] ?? ''}`.trim();
}

/** Показывает панель настроек по данным из библиотеки. */
function showPanel(meta: VariantMetadata): void {
  rightPlaceholder.style.display = 'none';
  rightPanel.style.display = 'flex';

  weightSelect.innerHTML = '';
  for (const w of meta.weights) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = weightLabel(w);
    weightSelect.appendChild(opt);
  }
  weightSelect.value = meta.defaultVariant.weight;
  weightSelect.disabled = false;

  italicCheck.checked = false;
  italicCheck.disabled = !meta.hasItalic;

  applyBtn.disabled = false;
}

/** Выбирает шрифт: заполняет правую панель и грузит превью. */
async function selectFont(font: FontItem): Promise<void> {
  activeFont = font;

  for (const el of fontListEl.querySelectorAll('.font-item')) {
    el.classList.toggle('selected', (el as HTMLElement).dataset.family === font.family);
  }

  selectedName.textContent = font.family;
  selectedCategory.textContent = `(${font.category})`;

  showPanel(manager.getVariantMetadata(font));
  rightStatus.textContent = '';
  await loadPreview();
}

/** Применяет чисто CSS-настройки к превью (без сети). */
function applyCssOnly(): void {
  if (!activeFont) return;
  const variant = manager.resolveVariant(activeFont, weightSelect.value, italicCheck.checked ? 'italic' : 'normal');
  preview.style.fontFamily = `"${activeFont.family}", ${activeFont.category}`;
  preview.style.fontWeight = variant.weight;
  preview.style.fontStyle = variant.style;
  preview.style.fontSize = `${sizeRange.value}px`;
  preview.style.letterSpacing = `${spacingRange.value}px`;
  preview.style.textDecoration = underlineCheck.checked ? 'underline' : 'none';
  preview.style.textTransform = uppercaseCheck.checked ? 'uppercase' : 'none';
  sizeValue.textContent = sizeRange.value;
  spacingValue.textContent = spacingRange.value;
}

/**
 * Грузит превью варианта через API библиотеки (эмитит события загрузки →
 * прелоадер), затем применяет CSS. Вызывается при смене толщины/наклона/текста.
 */
async function loadPreview(): Promise<void> {
  if (!activeFont) return;
  const variant = manager.resolveVariant(activeFont, weightSelect.value, italicCheck.checked ? 'italic' : 'normal');
  await manager.preview(activeFont, variant, preview.value);
  applyCssOnly();
}

/** Скачивает бинарник выбранного варианта, логирует данные и применяет через FontFace. */
async function applySelection(): Promise<void> {
  if (!activeFont) return;
  const variant = manager.resolveVariant(activeFont, weightSelect.value, italicCheck.checked ? 'italic' : 'normal');
  applyBtn.disabled = true;
  rightStatus.textContent = 'Загрузка файла...';

  try {
    manager.select(activeFont, variant.id);
    const result = await manager.confirm();

    console.group('%cSelectionResult', 'color:#22c58b;font-weight:bold');
    console.log('family:', result.family);
    console.log('variantId:', result.variantId);
    console.log('weight:', variant.weight, '| style:', variant.style);
    console.log('url:', result.url);
    console.log('buffer (bytes):', result.buffer.byteLength);
    console.groupEnd();

    const faceFamily = `${activeFont.family} ${variant.id}`;
    const face = new FontFace(faceFamily, result.buffer, {
      weight: variant.weight,
      style: variant.style,
    });
    await face.load();
    document.fonts.add(face);

    preview.style.fontFamily = `"${faceFamily}", "${activeFont.family}", ${activeFont.category}`;
    rightStatus.textContent = `Применён: ${variant.weight} ${variant.style}`;
  } catch (err) {
    console.error(err);
    rightStatus.textContent = err instanceof Error ? err.message : 'Ошибка загрузки.';
  } finally {
    applyBtn.disabled = false;
  }
}

/** Дебаунс для событий ввода текста. */
function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Фильтрует список по подстроке через manager.search. */
function onSearch(): void {
  renderList(manager.search(searchInput.value));
}

const debouncedPreview = debounce(() => void loadPreview(), 350);

// ── Слушатели ──
searchInput.addEventListener('input', onSearch);
preview.addEventListener('input', debouncedPreview);       // новые глифы → перезагрузка (spinner)
weightSelect.addEventListener('change', () => void loadPreview());
italicCheck.addEventListener('change', () => void loadPreview());
sizeRange.addEventListener('input', applyCssOnly);         // чистый CSS, без сети
spacingRange.addEventListener('input', applyCssOnly);
underlineCheck.addEventListener('change', applyCssOnly);
uppercaseCheck.addEventListener('change', applyCssOnly);
applyBtn.addEventListener('click', () => void applySelection());
