/**
 * index.ts
 * FontManager — фасад-оркестратор библиотеки.
 * Чейнируемый API, гибридный режим (Google Fonts + кастомный JSON),
 * управление состоянием выбора, кэшем и инжекцией превью.
 */

import type {
  FontManagerConfig,
  FontItem,
  FontPattern,
  FontVariant,
  FontStyle,
  PendingSelection,
  SelectionResult,
  VariantMetadata,
  LoadingPhase,
  LoadingState,
  LoadingListener,
} from './types.js';
import { FontManagerError } from './errors.js';
import { PatternParser } from './PatternParser.js';
import { BinaryCache } from './Cache.js';
import { Injector } from './Injector.js';

const GOOGLE_FONTS_API = 'https://www.googleapis.com/webfonts/v1/webfonts';

/** Форма ответа Google Webfonts API (частично, только используемые поля). */
interface GoogleWebfontsResponse {
  items?: GoogleFontEntry[];
  error?: { code?: number; message?: string };
}
interface GoogleFontEntry {
  family: string;
  category: string;
  subsets: string[];
  variants: string[];
  files: Record<string, string>;
}

export class FontManager {
  private readonly config: FontManagerConfig;
  private readonly cache: BinaryCache;
  private readonly injector: Injector;
  private readonly debug: boolean;

  private pattern: FontPattern | null = null;
  private fonts: FontItem[] = [];
  private selection: PendingSelection | null = null;
  /** Подписчики на события загрузки (для прелоадера). */
  private readonly loadingListeners = new Set<LoadingListener>();

  constructor(config: FontManagerConfig = {}) {
    this.config = config;
    this.debug = config.debug ?? false;
    this.cache = new BinaryCache(this.debug);
    this.injector = new Injector(this.debug);

    if (config.customFonts?.length) {
      this.fonts = this.filterBySubsets(config.customFonts);
    }
  }

  /**
   * Устанавливает схему маппинга для парсинга кастомного JSON.
   * @returns this для чейнинга.
   */
  setPattern(pattern: FontPattern): this {
    this.pattern = pattern;
    return this;
  }

  /**
   * Подписка на события загрузки (для построения прелоадера в UI).
   *
   * Событие эмитится при `init()` (phase `catalog`), `preview()` (phase
   * `preview`) и `confirm()` (phase `confirm`) — с `loading:true` в начале
   * и `loading:false` в конце (даже при ошибке).
   *
   * @param listener Обработчик состояния загрузки.
   * @returns Функция отписки.
   */
  onLoading(listener: LoadingListener): () => void {
    this.loadingListeners.add(listener);
    return () => this.loadingListeners.delete(listener);
  }

  /** Отписка обработчика события загрузки. */
  offLoading(listener: LoadingListener): void {
    this.loadingListeners.delete(listener);
  }

  /** Эмитит событие загрузки всем подписчикам. */
  private emitLoading(state: LoadingState): void {
    for (const listener of this.loadingListeners) {
      try {
        listener(state);
      } catch (err) {
        if (this.debug) console.error('[FontManager] loading listener error:', err);
      }
    }
  }

  /** Оборачивает асинхронную операцию событиями loading:true/false. */
  private async withLoading<T>(
    phase: LoadingPhase,
    op: () => Promise<T>,
    font?: FontItem,
    variant?: FontVariant,
  ): Promise<T> {
    this.emitLoading({ loading: true, phase, font, variant });
    try {
      return await op();
    } finally {
      this.emitLoading({ loading: false, phase, font, variant });
    }
  }

  /**
   * Инициализация каталога.
   * Если задан `apiKey` — загружает и парсит каталог Google Fonts встроенным
   * паттерном. Иначе оставляет список пустым (или из customFonts), готовым
   * к вызову `loadRawData`.
   *
   * @throws FontManagerError коды `GOOGLE_API_ERROR`, `HTTP_ERROR`, `NETWORK_ERROR`.
   */
  async init(): Promise<FontItem[]> {
    if (!this.config.apiKey) {
      if (this.debug) console.debug('[FontManager] init без apiKey — ждём loadRawData.');
      return this.fonts;
    }
    return this.withLoading('catalog', () => this.fetchGoogleCatalog());
  }

  /** Загружает и парсит каталог Google Fonts (внутренняя реализация init). */
  private async fetchGoogleCatalog(): Promise<FontItem[]> {
    const sort = this.config.googleSort ?? 'popularity';
    const url = `${GOOGLE_FONTS_API}?key=${encodeURIComponent(this.config.apiKey ?? '')}&sort=${sort}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new FontManagerError('NETWORK_ERROR', 'Сбой запроса к Google Fonts API.', err);
    }

    if (!response.ok) {
      // Пытаемся распарсить payload ошибки Google, не глотая сбой молча.
      let message = `Google Fonts API вернул HTTP ${response.status}.`;
      try {
        const payload = (await response.json()) as GoogleWebfontsResponse;
        if (payload.error?.message) message = payload.error.message;
      } catch {
        /* тело не JSON — оставляем базовое сообщение */
      }
      throw new FontManagerError('GOOGLE_API_ERROR', message);
    }

    let data: GoogleWebfontsResponse;
    try {
      data = (await response.json()) as GoogleWebfontsResponse;
    } catch (err) {
      throw new FontManagerError('PARSE_ERROR', 'Не удалось разобрать ответ Google Fonts.', err);
    }

    this.fonts = this.filterBySubsets(this.parseGoogle(data.items ?? []));
    return this.fonts;
  }

  /**
   * Парсит произвольный JSON с бэкенда пользователя по заданной схеме.
   * @throws FontManagerError `INVALID_CONFIG`, если схема не задана.
   */
  loadRawData(data: unknown): FontItem[] {
    if (!this.pattern) {
      throw new FontManagerError(
        'INVALID_CONFIG',
        'Перед loadRawData вызовите setPattern() с описанием схемы.',
      );
    }
    const parsed = PatternParser.mapToFontItems(data, this.pattern, this.debug);
    this.fonts = this.filterBySubsets(parsed);
    return this.fonts;
  }

  /**
   * Быстрый поиск по подстроке в названии семейства (регистронезависимый).
   * Минимизирует аллокации: один проход, без промежуточных map/filter-цепочек.
   */
  search(query: string, category?: string): FontItem[] {
    const q = query.trim().toLowerCase();
    const result: FontItem[] = [];
    for (let i = 0; i < this.fonts.length; i++) {
      const f = this.fonts[i];
      if (category && f.category !== category) continue;
      if (q.length === 0 || f.family.toLowerCase().includes(q)) result.push(f);
    }
    return result;
  }

  /**
   * Триггерит инжектор для отрисовки лёгкого превью в UI-списке (fire-and-forget).
   * Для Google-шрифтов использует &text-оптимизацию. Не эмитит события загрузки —
   * подходит для быстрого рендера списков.
   *
   * @param font       Семейство шрифта.
   * @param textSample Текст-образец (если не задан — название семейства).
   * @param variant    Конкретный вариант (по умолчанию — defaultVariant).
   */
  registerUiPreview(font: FontItem, textSample?: string, variant?: FontVariant): void {
    const sample = textSample ?? this.config.defaultTextSample ?? font.family;
    void this.injector.inject(font, variant ?? font.defaultVariant, sample);
  }

  /**
   * Загружает превью варианта и ждёт готовности шрифта, эмитя события загрузки
   * (phase `preview`) — для показа прелоадера при смене толщины/наклона.
   *
   * Инжектит стиль превью, затем через нативный FontFaceSet API дожидается
   * фактической готовности глифов образца. Дедупликация внутри инжектора
   * гарантирует отсутствие повторных запросов.
   *
   * @param font       Семейство шрифта.
   * @param variant    Конкретный вариант (толщина + наклон).
   * @param textSample Текст-образец.
   * @returns Promise, резолвится когда превью готово к отображению.
   */
  async preview(font: FontItem, variant: FontVariant, textSample?: string): Promise<void> {
    const sample = textSample ?? this.config.defaultTextSample ?? font.family;
    await this.withLoading(
      'preview',
      async () => {
        await this.injector.inject(font, variant, sample);
        await this.waitFontReady(font, variant, sample);
      },
      font,
      variant,
    );
  }

  /** Дожидается готовности шрифта через FontFaceSet (если доступен). */
  private async waitFontReady(
    font: FontItem,
    variant: FontVariant,
    sample: string,
  ): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    const spec = `${variant.style} ${variant.weight} 24px "${font.family.replace(/"/g, '')}"`;
    try {
      await document.fonts.load(spec, sample);
    } catch (err) {
      if (this.debug) console.warn('[FontManager] waitFontReady:', err);
    }
  }

  /**
   * Сохраняет активный выбор шрифта (без скачивания бинарника).
   * @throws FontManagerError `INVALID_CONFIG`, если вариант не найден.
   */
  select(font: FontItem, variantId?: string): void {
    let variant: FontVariant | undefined;
    if (variantId) {
      variant = font.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new FontManagerError(
          'INVALID_CONFIG',
          `Вариант "${variantId}" не найден у шрифта "${font.family}".`,
        );
      }
    } else {
      variant = font.defaultVariant;
    }
    this.selection = { font, variant };
  }

  /**
   * Подтверждает выбор: скачивает полный бинарник с учётом кэша и дедупликации.
   * При сетевом сбое pending-запись очищается в Cache для возможности ретрая.
   *
   * @throws FontManagerError `NO_SELECTION`, а также сетевые коды из Cache.
   */
  async confirm(signal?: AbortSignal): Promise<SelectionResult> {
    if (!this.selection) {
      throw new FontManagerError('NO_SELECTION', 'Нет активного выбора. Вызовите select().');
    }
    const { font, variant } = this.selection;

    return this.withLoading(
      'confirm',
      async () => {
        const buffer = await this.cache.fetchBinary(variant.url, signal);
        return {
          family: font.family,
          variantId: variant.id,
          buffer,
          url: variant.url,
        };
      },
      font,
      variant,
    );
  }

  /** Сбрасывает активное состояние выбора. */
  cancel(): void {
    this.selection = null;
  }

  /** Текущий активный выбор (только чтение) или null. */
  getSelection(): Readonly<PendingSelection> | null {
    return this.selection;
  }

  /** Весь загруженный каталог (только чтение). */
  getAll(): readonly FontItem[] {
    return this.fonts;
  }

  /**
   * Возвращает метаданные начертаний для построения UI-панели.
   *
   * @param font Шрифт из каталога.
   * @returns Уникальные веса, наличие italic/normal и вариант по умолчанию.
   */
  getVariantMetadata(font: FontItem): VariantMetadata {
    const weightSet = new Set<string>();
    let hasItalic = false;
    let hasNormal = false;

    for (const v of font.variants) {
      weightSet.add(v.weight);
      if (v.style === 'italic') hasItalic = true;
      else hasNormal = true;
    }

    const weights = [...weightSet].sort((a, b) => Number(a) - Number(b));
    return {
      weights,
      hasItalic,
      hasNormal,
      defaultVariant: font.defaultVariant,
    };
  }

  /**
   * Разрешает FontVariant по желаемым весу и стилю.
   * При точном несовпадении — фолбэк: точный вес в другом стиле, затем default.
   *
   * @param font  Шрифт из каталога.
   * @param weight  Желаемый вес (строка, напр. `"700"`).
   * @param style   Желаемый стиль (`"normal"` | `"italic"`).
   * @returns Найденный или фолбэк-вариант.
   */
  resolveVariant(font: FontItem, weight: string, style: FontStyle): FontVariant {
    return (
      font.variants.find((v) => v.weight === weight && v.style === style) ??
      font.variants.find((v) => v.weight === weight) ??
      font.defaultVariant
    );
  }

  /**
   * Возвращает текущий выбранный шрифт (без варианта) или null.
   * Удобно для UI, когда нужно прочитать семейство без PendingSelection.
   */
  getSelectedFont(): FontItem | null {
    return this.selection?.font ?? null;
  }

  /** Очищает кэш бинарников и внедрённые стили. */
  dispose(): void {
    this.cache.clear();
    this.injector.clear();
    this.selection = null;
  }

  // --- Внутренние помощники ---

  /** Преобразует записи Google Fonts во внутренний FontItem[]. */
  private parseGoogle(items: GoogleFontEntry[]): FontItem[] {
    const out: FontItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      const variants = this.parseGoogleVariants(entry);
      if (variants.length === 0) continue;
      out.push({
        family: entry.family,
        category: entry.category,
        subsets: entry.subsets ?? [],
        variants,
        defaultVariant: this.pickDefault(variants),
      });
    }
    return out;
  }

  /** Строит варианты из карты files Google (ключ = регистр/вес). */
  private parseGoogleVariants(entry: GoogleFontEntry): FontVariant[] {
    const files = entry.files ?? {};
    const variants: FontVariant[] = [];
    for (const key of Object.keys(files)) {
      const url = files[key];
      if (!url) continue;
      const style: FontVariant['style'] = key.includes('italic') ? 'italic' : 'normal';
      const weightRaw = key.replace('italic', '');
      const weight = weightRaw === 'regular' || weightRaw === '' ? '400' : weightRaw;
      variants.push({ id: key, weight, style, url: url.replace(/^http:/, 'https:') });
    }
    return variants;
  }

  /** Выбирает вариант по умолчанию (regular/400 normal), иначе первый. */
  private pickDefault(variants: FontVariant[]): FontVariant {
    for (const v of variants) {
      if (v.weight === '400' && v.style === 'normal') return v;
    }
    return variants[0];
  }

  /** Фильтрует шрифты по белому списку подмножеств, если он задан. */
  private filterBySubsets(fonts: FontItem[]): FontItem[] {
    const allowed = this.config.allowedSubsets;
    if (!allowed || allowed.length === 0) return fonts;
    const set = new Set(allowed);
    const out: FontItem[] = [];
    for (let i = 0; i < fonts.length; i++) {
      const f = fonts[i];
      if (f.subsets.length === 0 || f.subsets.some((s) => set.has(s))) out.push(f);
    }
    return out;
  }
}

export { FontManagerError } from './errors.js';
export { PatternParser } from './PatternParser.js';
export { BinaryCache } from './Cache.js';
export { Injector } from './Injector.js';
export type {
  FontManagerConfig,
  FontItem,
  FontVariant,
  FontPattern,
  FontStyle,
  SelectionResult,
  PendingSelection,
  VariantMetadata,
  LoadingState,
  LoadingPhase,
  LoadingListener,
} from './types.js';
export type { FontManagerErrorCode } from './errors.js';

export default FontManager;
