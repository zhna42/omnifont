/**
 * Injector.ts
 * Динамическая инжекция CSS для лёгких превью шрифтов в UI-списках.
 * Оптимизация трафика: для Google Fonts используется параметр &text=,
 * чтобы не качать полные бинарники ради превью.
 */

import type { FontItem, FontVariant } from './types.js';
import { FontManagerError } from './errors.js';

const GOOGLE_CSS_HOST = 'https://fonts.googleapis.com/css2';

export class Injector {
  /** Реестр уже внедрённых ключей — защита от дублей. */
  private readonly injected = new Set<string>();
  /** Контейнер для динамических <style>/<link> тегов. */
  private head: HTMLHeadElement | null = null;

  constructor(private readonly debug = false) {}

  /** Ленивая проверка доступности DOM (headless-safe). */
  private ensureHead(): HTMLHeadElement {
    if (this.head) return this.head;
    if (typeof document === 'undefined' || !document.head) {
      throw new FontManagerError(
        'ENVIRONMENT_ERROR',
        'Injector требует DOM. Недоступно в текущем окружении (SSR/worker).',
      );
    }
    this.head = document.head;
    return this.head;
  }

  /**
   * Внедряет стиль превью для шрифта.
   *
   * Протокол оптимизации:
   * - Google Fonts (url содержит `fonts.gstatic`/`fonts.googleapis`): формируется
   *   `<link>` на css2 с `&text=...`, загружаются только глифы образца.
   * - Кастомный шрифт: генерируется `@font-face` в `<style>` с прямым src.
   *
   * Повторная инжекция идентичного ключа игнорируется через Set.
   *
   * @param font       Семейство шрифта.
   * @param variant    Конкретный вариант (по умолчанию — defaultVariant).
   * @param textSample Текст-образец для оптимизации трафика Google.
   * @returns Promise, который резолвится, когда стиль применён (для прелоадера).
   */
  inject(font: FontItem, variant?: FontVariant, textSample?: string): Promise<void> {
    const head = this.ensureHead();
    const v = variant ?? font.defaultVariant;
    if (!v) {
      throw new FontManagerError('INVALID_CONFIG', `У шрифта "${font.family}" нет вариантов.`);
    }

    if (this.isGoogleFont(v.url)) {
      return this.injectGoogle(head, font, v, textSample);
    }
    return this.injectCustom(head, font, v);
  }

  /** Инжекция превью Google Fonts через css2 API с оптимизацией &text. */
  private injectGoogle(
    head: HTMLHeadElement,
    font: FontItem,
    variant: FontVariant,
    textSample?: string,
  ): Promise<void> {
    // Пробелы в имени семейства заменяем на '+' для валидного URL Google.
    const familyParam = font.family.trim().replace(/\s+/g, '+');
    const italic = variant.style === 'italic' ? '1' : '0';
    const axis = `ital,wght@${italic},${variant.weight}`;

    let href = `${GOOGLE_CSS_HOST}?family=${familyParam}:${axis}&display=swap`;
    if (textSample && textSample.length > 0) {
      href += `&text=${encodeURIComponent(textSample)}`;
    }

    const key = `google:${href}`;
    if (this.injected.has(key)) {
      if (this.debug) console.debug('[Injector] skip dup google:', key);
      return Promise.resolve();
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.omnifontKey = key;
    this.injected.add(key);

    return new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      // Даже при ошибке стиля резолвим — прелоадер не должен зависнуть.
      link.addEventListener('error', () => resolve(), { once: true });
      head.appendChild(link);
    });
  }

  /** Инжекция кастомного @font-face в динамический <style>. */
  private injectCustom(head: HTMLHeadElement, font: FontItem, variant: FontVariant): Promise<void> {
    const key = `custom:${font.family}:${variant.id}:${variant.url}`;
    if (this.injected.has(key)) {
      if (this.debug) console.debug('[Injector] skip dup custom:', key);
      return Promise.resolve();
    }

    const format = this.guessFormat(variant.url);
    const srcFormat = format ? ` format("${format}")` : '';
    const css =
      `@font-face{` +
      `font-family:"${this.escapeFamily(font.family)}";` +
      `font-style:${variant.style};` +
      `font-weight:${variant.weight};` +
      `font-display:swap;` +
      `src:url("${variant.url}")${srcFormat};` +
      `}`;

    const style = document.createElement('style');
    style.dataset.omnifontKey = key;
    style.textContent = css;
    head.appendChild(style);
    this.injected.add(key);
    return Promise.resolve();
  }

  /** Определяет, относится ли URL к инфраструктуре Google Fonts. */
  private isGoogleFont(url: string): boolean {
    return url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com');
  }

  /** Угадывает CSS-формат по расширению файла. */
  private guessFormat(url: string): string | null {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.woff2')) return 'woff2';
    if (clean.endsWith('.woff')) return 'woff';
    if (clean.endsWith('.ttf')) return 'truetype';
    if (clean.endsWith('.otf')) return 'opentype';
    return null;
  }

  /** Экранирует кавычки в имени семейства для CSS. */
  private escapeFamily(family: string): string {
    return family.replace(/["\\]/g, '\\$&');
  }

  /** Удаляет все внедрённые библиотекой теги и очищает реестр. */
  clear(): void {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('[data-omnifont-key]');
    nodes.forEach((n) => n.parentNode?.removeChild(n));
    this.injected.clear();
  }
}
