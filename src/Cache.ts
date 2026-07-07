/**
 * Cache.ts
 * Высокопроизводительный слой кэширования бинарников шрифтов (ArrayBuffer).
 * Защищает от Race Conditions за счёт кэширования Promise-ов «в полёте».
 */

import { FontManagerError } from './errors.js';

export class BinaryCache {
  /** Готовые, полностью скачанные бинарники. */
  private readonly store = new Map<string, ArrayBuffer>();
  /** Запросы «в полёте»: дедупликация параллельных обращений к одному URL. */
  private readonly pending = new Map<string, Promise<ArrayBuffer>>();

  constructor(private readonly debug = false) {}

  /** Есть ли готовый бинарник по URL. */
  has(url: string): boolean {
    return this.store.has(url);
  }

  /** Возвращает готовый бинарник из кэша или undefined. */
  peek(url: string): ArrayBuffer | undefined {
    return this.store.get(url);
  }

  /**
   * Возвращает бинарник по URL, скачивая его один раз.
   *
   * Защита от гонок: если запрос к этому URL уже выполняется, возвращается
   * тот же самый Promise — сеть не спамится дублирующими запросами.
   * При ошибке pending-запись очищается, чтобы следующая попытка могла ретраить.
   *
   * @param url    Абсолютная ссылка на файл шрифта.
   * @param signal Опциональный AbortSignal для отмены.
   * @throws FontManagerError коды `INVALID_URL`, `HTTP_ERROR`, `NETWORK_ERROR`.
   */
  async fetchBinary(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    if (typeof url !== 'string' || url.length === 0) {
      throw new FontManagerError('INVALID_URL', 'Пустой URL при загрузке шрифта.');
    }

    const cached = this.store.get(url);
    if (cached) {
      if (this.debug) console.debug('[BinaryCache] hit:', url);
      return cached;
    }

    const inFlight = this.pending.get(url);
    if (inFlight) {
      if (this.debug) console.debug('[BinaryCache] join in-flight:', url);
      return inFlight;
    }

    const promise = this.download(url, signal)
      .then((buffer) => {
        this.store.set(url, buffer);
        this.pending.delete(url);
        return buffer;
      })
      .catch((err: unknown) => {
        // Критично: снимаем pending, чтобы разрешить повторную попытку.
        this.pending.delete(url);
        throw err;
      });

    this.pending.set(url, promise);
    return promise;
  }

  /** Низкоуровневая загрузка с валидацией HTTP-статуса. */
  private async download(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
    let response: Response;
    try {
      response = await fetch(url, signal ? { signal } : undefined);
    } catch (err) {
      throw new FontManagerError(
        'NETWORK_ERROR',
        `Сетевой сбой или CORS-блокировка при загрузке: ${url}`,
        err,
      );
    }

    if (!response.ok) {
      throw new FontManagerError(
        'HTTP_ERROR',
        `Не удалось скачать шрифт: HTTP ${response.status} ${response.statusText} (${url})`,
      );
    }

    try {
      return await response.arrayBuffer();
    } catch (err) {
      throw new FontManagerError('NETWORK_ERROR', `Ошибка чтения тела ответа: ${url}`, err);
    }
  }

  /** Очищает весь кэш (готовые и pending). */
  clear(): void {
    this.store.clear();
    this.pending.clear();
  }

  /** Число готовых записей в кэше. */
  get size(): number {
    return this.store.size;
  }
}
