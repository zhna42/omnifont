/**
 * errors.ts
 * Кастомный класс ошибок для предсказуемой обработки сбоев в продакшене.
 */

/** Коды ошибок для программной обработки на стороне потребителя. */
export type FontManagerErrorCode =
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'GOOGLE_API_ERROR'
  | 'PARSE_ERROR'
  | 'NO_SELECTION'
  | 'INVALID_CONFIG'
  | 'INVALID_URL'
  | 'ENVIRONMENT_ERROR';

/**
 * Единая типизированная ошибка библиотеки.
 * Расширяет нативный Error, сохраняя код и исходную причину.
 */
export class FontManagerError extends Error {
  /** Машиночитаемый код ошибки. */
  public readonly code: FontManagerErrorCode;
  /** Исходная причина (например, пойманный сетевой Error). */
  public readonly cause?: unknown;

  constructor(code: FontManagerErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'FontManagerError';
    this.code = code;
    this.cause = cause;
    // Корректная цепочка прототипов при транспиляции в ES5-таргеты.
    Object.setPrototypeOf(this, FontManagerError.prototype);
  }
}
