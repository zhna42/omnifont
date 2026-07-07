/**
 * types.ts
 * Чистые интерфейсы для всего жизненного цикла данных библиотеки.
 * Ноль зависимостей, только структурные типы.
 */

/** Начертание конкретного варианта шрифта. */
export type FontStyle = 'normal' | 'italic';

/**
 * Один конкретный вариант шрифта (комбинация веса и стиля).
 */
export interface FontVariant {
  /** Уникальный идентификатор варианта, например `400` или `700italic`. */
  id: string;
  /** CSS-значение font-weight, например `400`, `700`. */
  weight: string;
  /** Стиль начертания. */
  style: FontStyle;
  /** Прямая ссылка на бинарный файл шрифта (.ttf/.woff2). */
  url: string;
}

/**
 * Полное описание семейства шрифтов, готовое к отображению в UI.
 */
export interface FontItem {
  /** Название семейства, например `Roboto`. */
  family: string;
  /** Категория, например `sans-serif`, `serif`, `monospace`. */
  category: string;
  /** Поддерживаемые подмножества символов (latin, cyrillic и т.д.). */
  subsets: string[];
  /** Все доступные варианты начертаний. */
  variants: FontVariant[];
  /** Вариант по умолчанию (обычно regular / 400). */
  defaultVariant: FontVariant;
}

/**
 * Схема маппинга для универсального парсера кастомного JSON.
 * Значения — это пути в нотации PatternParser (точка + звёздочка).
 */
export interface FontPattern {
  /** Путь к массиву/списку элементов шрифтов (корень итерации). */
  root?: string;
  /** Путь к названию семейства относительно элемента. */
  family: string;
  /** Путь к ссылке на файл шрифта относительно элемента. */
  url: string;
  /** Опциональный путь к категории. */
  category?: string;
  /** Опциональный путь к списку вариантов относительно элемента. */
  variants?: string;
  /** Путь к url внутри объекта варианта (по умолчанию — последний сегмент `url`). */
  variantUrl?: string;
  /** Путь к весу (font-weight) внутри объекта варианта. */
  variantWeight?: string;
  /** Путь к стилю (normal | italic) внутри объекта варианта. */
  variantStyle?: string;
  /** Опциональный путь к подмножествам символов. */
  subsets?: string;
}

/**
 * Конфигурация менеджера шрифтов.
 */
export interface FontManagerConfig {
  /** API-ключ Google Fonts. Если задан — `init()` загрузит каталог Google. */
  apiKey?: string;
  /** Заранее заданные пользовательские шрифты (минуя сеть). */
  customFonts?: FontItem[];
  /** Белый список подмножеств символов для фильтрации. */
  allowedSubsets?: string[];
  /** Базовый sort-параметр каталога Google Fonts. */
  googleSort?: 'alpha' | 'date' | 'popularity' | 'style' | 'trending';
  /** Включает подробное логирование в консоль. */
  debug?: boolean;
  /** Текст-образец по умолчанию для превью (оптимизация трафика). */
  defaultTextSample?: string;
}

/**
 * Результат подтверждённого выбора шрифта.
 */
export interface SelectionResult {
  /** Название выбранного семейства. */
  family: string;
  /** Идентификатор выбранного варианта. */
  variantId: string;
  /** Скачанный бинарник файла шрифта. */
  buffer: ArrayBuffer;
  /** URL, с которого получен бинарник. */
  url: string;
}

/** Внутреннее представление активного выбора до подтверждения. */
export interface PendingSelection {
  font: FontItem;
  variant: FontVariant;
}

/**
 * Метаданные шрифта для построения UI-панели начертаний.
 * Все значения — сырые строки, форматирование на стороне разработчика.
 */
export interface VariantMetadata {
  /** Все уникальные веса в порядке возрастания (напр. `["300","400","700"]`). */
  weights: string[];
  /** Есть ли хотя бы один italic/oblique вариант. */
  hasItalic: boolean;
  /** Есть ли хотя бы один normal вариант. */
  hasNormal: boolean;
  /** Вариант по умолчанию (regular 400 или первый). */
  defaultVariant: FontVariant;
}

/** Фаза сетевой операции, к которой относится состояние загрузки. */
export type LoadingPhase = 'catalog' | 'preview' | 'confirm';

/**
 * Событие изменения состояния загрузки. Используется для построения прелоадера.
 */
export interface LoadingState {
  /** Идёт ли сейчас сетевая операция. */
  loading: boolean;
  /** К какой операции относится состояние. */
  phase: LoadingPhase;
  /** Связанный шрифт (если применимо). */
  font?: FontItem;
  /** Связанный вариант (если применимо). */
  variant?: FontVariant;
}

/** Обработчик события загрузки. */
export type LoadingListener = (state: LoadingState) => void;
