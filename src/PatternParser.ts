/**
 * PatternParser.ts
 * Производительная утилита для чтения значений из JSON произвольной структуры
 * (упрощённый аналог JSONPath) и маппинга их в массив FontItem.
 * Zero-dependency: только нативные конструкции языка.
 */

import type { FontItem, FontPattern, FontVariant, FontStyle } from './types.js';
import { FontManagerError } from './errors.js';

/** Внутренний тип для рефлексии произвольного JSON. */
type Json = unknown;

export class PatternParser {
  /**
   * Извлекает плоский список строковых значений по пути.
   *
   * Поддерживаемый синтаксис пути:
   * - `.`  — переход по вложенности объекта: `meta.family.name`
   * - `*`  — «выпрямление» (flatten) массива или значений объекта: `items.*.family`
   *
   * Метод не бросает исключений при отсутствии пути — возвращает `[]`,
   * что критично для устойчивости под нагрузкой.
   *
   * @param obj  Любой разобранный JSON/объект.
   * @param path Путь в точечно-звёздочной нотации.
   * @param debug Логировать ли предупреждения об отсутствующих сегментах.
   * @returns Плоский массив найденных строковых значений.
   */
  static getValueByPath(obj: Json, path: string, debug = false): string[] {
    if (obj == null || typeof path !== 'string' || path.length === 0) {
      if (debug) console.warn('[PatternParser] Пустой объект или путь:', path);
      return [];
    }

    const segments = path.split('.');
    // Текущий фронт обхода: начинаем с одного корня.
    let frontier: Json[] = [obj];

    for (let s = 0; s < segments.length; s++) {
      const segment = segments[s];
      const next: Json[] = [];

      for (let i = 0; i < frontier.length; i++) {
        const node = frontier[i];
        if (node == null) continue;

        if (segment === '*') {
          // Выпрямление: массив -> элементы, объект -> значения.
          if (Array.isArray(node)) {
            for (let k = 0; k < node.length; k++) next.push(node[k]);
          } else if (typeof node === 'object') {
            const values = Object.values(node as Record<string, Json>);
            for (let k = 0; k < values.length; k++) next.push(values[k]);
          }
          // Примитив под `*` — просто отбрасываем.
          continue;
        }

        // Обычный сегмент: индексируем объект/массив по ключу.
        if (typeof node === 'object') {
          const rec = node as Record<string, Json>;
          if (segment in rec) {
            next.push(rec[segment]);
          } else if (debug) {
            console.warn(`[PatternParser] Ключ "${segment}" не найден в пути "${path}"`);
          }
        }
      }

      frontier = next;
      if (frontier.length === 0) break;
    }

    // Финальная нормализация в строки, отбрасывая невалидные листья.
    const out: string[] = [];
    for (let i = 0; i < frontier.length; i++) {
      const leaf = frontier[i];
      if (typeof leaf === 'string') out.push(leaf);
      else if (typeof leaf === 'number' || typeof leaf === 'boolean') out.push(String(leaf));
    }
    return out;
  }

  /**
   * Возвращает «сырые» узлы по пути без приведения к строке.
   * Нужен для доступа к вложенным структурам (списки вариантов).
   */
  private static getNodesByPath(obj: Json, path: string): Json[] {
    if (obj == null || !path) return [];
    const segments = path.split('.');
    let frontier: Json[] = [obj];

    for (const segment of segments) {
      const next: Json[] = [];
      for (const node of frontier) {
        if (node == null) continue;
        if (segment === '*') {
          if (Array.isArray(node)) next.push(...node);
          else if (typeof node === 'object') next.push(...Object.values(node as Record<string, Json>));
          continue;
        }
        if (typeof node === 'object') {
          const rec = node as Record<string, Json>;
          if (segment in rec) next.push(rec[segment]);
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    return frontier;
  }

  /**
   * Строит массив FontItem из произвольного JSON согласно схеме FontPattern.
   *
   * Логика: итерируем корневые элементы (`pattern.root`), для каждого читаем
   * относительные пути (family/url/category/variants). Пути объединяются
   * позиционно, что даёт устойчивый структурированный результат.
   *
   * @param data    Разобранный JSON с бэкенда пользователя.
   * @param pattern Схема маппинга.
   * @param debug   Флаг подробного логирования.
   * @throws FontManagerError код `PARSE_ERROR` при полностью несовместимой схеме.
   */
  static mapToFontItems(data: Json, pattern: FontPattern, debug = false): FontItem[] {
    if (!pattern || !pattern.family || !pattern.url) {
      throw new FontManagerError(
        'INVALID_CONFIG',
        'FontPattern требует непустые пути "family" и "url".',
      );
    }

    // Выбор режима: zip-mode (пути с * абсолютны относительно корня data)
    // или per-element (есть root — итерация по коллекции, пути относительны).
    const useZipMode = !pattern.root && pattern.family.includes('*');

    const items: FontItem[] = [];

    if (useZipMode) {
      // Zip-mode: собираем столбцы значений из data, затем позиционно склеиваем.
      const families = PatternParser.getValueByPath(data, pattern.family, debug);
      const urls = PatternParser.getValueByPath(data, pattern.url, debug);
      const categories =
        pattern.category != null
          ? PatternParser.getValueByPath(data, pattern.category, debug)
          : [];
      const subsets =
        pattern.subsets != null
          ? PatternParser.getValueByPath(data, pattern.subsets, debug)
          : [];
      const variantNodes = pattern.variants
        ? PatternParser.getNodesByPath(data, pattern.variants)
        : null;

      const len = Math.min(families.length, urls.length);
      for (let i = 0; i < len; i++) {
        const family = families[i];
        const url = urls[i];
        const category = categories[i] ?? 'sans-serif';
        const itemSubsets: string[] = [];
        if (i < subsets.length) itemSubsets.push(subsets[i]);

        const vn = variantNodes?.[i];
        const vurls =
          vn != null && typeof vn === 'object'
            ? PatternParser.getValueByPath(vn, PatternParser.lastSegment(pattern.url), debug)
            : [];
        const variants: FontVariant[] =
          vurls.length > 0
            ? vurls.map((vu, j) => PatternParser.normalizeVariant(vu, j))
            : [PatternParser.normalizeVariant(url, i)];

        items.push({
          family,
          category,
          subsets: itemSubsets,
          variants,
          defaultVariant: variants[0],
        });
      }
    } else {
      // Per-element mode: итерируем корневые элементы.
      const rawRoots: Json[] = pattern.root
        ? PatternParser.getNodesByPath(data, pattern.root)
        : Array.isArray(data)
          ? data
          : [data];
      const roots: Json[] = [];
      for (let i = 0; i < rawRoots.length; i++) {
        const r = rawRoots[i];
        if (Array.isArray(r)) roots.push(...r);
        else roots.push(r);
      }

      for (let i = 0; i < roots.length; i++) {
        const node = roots[i];
        if (node == null || typeof node !== 'object') continue;

        const families = PatternParser.getValueByPath(node, pattern.family, debug);
        if (families.length === 0) continue;
        const family = families[0];

        const category =
          pattern.category != null
            ? PatternParser.getValueByPath(node, pattern.category, debug)[0] ?? 'sans-serif'
            : 'sans-serif';

        const subsets = pattern.subsets
          ? PatternParser.getValueByPath(node, pattern.subsets, debug)
          : [];

        const variants = PatternParser.buildVariants(node, pattern, debug);
        if (variants.length === 0) continue;

        items.push({
          family,
          category,
          subsets,
          variants,
          defaultVariant: PatternParser.pickDefaultVariant(variants),
        });
      }
    }

    if (items.length === 0 && debug) {
      console.warn('[PatternParser] Схема не дала ни одного FontItem. Проверьте пути.');
    }

    return items;
  }

  /** Собирает варианты начертаний для одного узла семейства. */
  private static buildVariants(node: Json, pattern: FontPattern, debug: boolean): FontVariant[] {
    const variants: FontVariant[] = [];

    if (pattern.variants) {
      // Вариант со списком объектов вариантов.
      const rawVariantNodes = PatternParser.getNodesByPath(node, pattern.variants);
      // Разворачиваем узлы-массивы: путь "styles" и "styles.*" эквивалентны.
      const variantNodes: Json[] = [];
      for (let i = 0; i < rawVariantNodes.length; i++) {
        const rv = rawVariantNodes[i];
        if (Array.isArray(rv)) variantNodes.push(...rv);
        else variantNodes.push(rv);
      }
      const urlKey = pattern.variantUrl ?? PatternParser.lastSegment(pattern.url);
      for (let i = 0; i < variantNodes.length; i++) {
        const vn = variantNodes[i];
        const url =
          vn != null && typeof vn === 'object'
            ? PatternParser.getValueByPath(vn, urlKey, debug)[0]
            : typeof vn === 'string'
              ? vn
              : undefined;
        if (!url) continue;

        // Явные вес и стиль из объекта варианта, если заданы в паттерне.
        const weight =
          pattern.variantWeight && vn != null && typeof vn === 'object'
            ? PatternParser.getValueByPath(vn, pattern.variantWeight, debug)[0]
            : undefined;
        const style =
          pattern.variantStyle && vn != null && typeof vn === 'object'
            ? PatternParser.getValueByPath(vn, pattern.variantStyle, debug)[0]
            : undefined;

        variants.push(PatternParser.normalizeVariant(url, i, weight, style));
      }
    }

    if (variants.length === 0) {
      // Плоский вариант: один url прямо в узле семейства.
      const urls = PatternParser.getValueByPath(node, pattern.url, debug);
      for (let i = 0; i < urls.length; i++) {
        variants.push(PatternParser.normalizeVariant(urls[i], i));
      }
    }

    return variants;
  }

  /**
   * Нормализует ссылку в FontVariant. Вес и стиль берутся из явных значений,
   * а при их отсутствии выводятся эвристически из самой ссылки.
   */
  private static normalizeVariant(
    url: string,
    index: number,
    explicitWeight?: string,
    explicitStyle?: string,
  ): FontVariant {
    const lower = url.toLowerCase();

    let style: FontStyle;
    if (explicitStyle != null) {
      style = explicitStyle.toLowerCase().startsWith('ital') ? 'italic' : 'normal';
    } else {
      style = /italic|oblique/.test(lower) ? 'italic' : 'normal';
    }

    let weight: string;
    if (explicitWeight != null && explicitWeight.length > 0) {
      weight = explicitWeight;
    } else {
      const weightMatch = lower.match(/(100|200|300|400|500|600|700|800|900)/);
      weight = weightMatch ? weightMatch[1] : '400';
    }

    const id = `${weight}${style === 'italic' ? 'italic' : ''}` || String(index);
    return { id, weight, style, url };
  }

  /** Выбирает вариант по умолчанию: regular/normal 400, иначе первый. */
  private static pickDefaultVariant(variants: FontVariant[]): FontVariant {
    for (const v of variants) {
      if (v.weight === '400' && v.style === 'normal') return v;
    }
    return variants[0];
  }

  /** Возвращает последний сегмент пути (для доступа внутри варианта). */
  private static lastSegment(path: string): string {
    const parts = path.split('.');
    let idx = parts.length - 1;
    while (idx >= 0 && (parts[idx] === '*' || parts[idx] === '')) idx--;
    return idx >= 0 ? parts[idx] : path;
  }
}
