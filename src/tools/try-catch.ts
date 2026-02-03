/**
 * @fileoverview Result Type and Try-Catch Utilities
 *
 * This module provides a Result type for type-safe error handling without
 * exceptions. It implements a functional programming pattern where operations
 * return either an Ok (success) or Err (failure) result.
 *
 * ## Result Pattern
 * Instead of throwing exceptions, functions return a Result type that must
 * be explicitly handled. This makes error handling explicit and type-safe.
 *
 * ## Usage
 * ```typescript
 * const result = await tryCatch(someAsyncOperation());
 *
 * // Pattern matching
 * result.match({
 *   onOk: (data) => console.log('Success:', data),
 *   onErr: (error) => console.error('Error:', error),
 * });
 *
 * // Type guards
 * if (isOk(result)) {
 *   console.log(result.data);
 * }
 *
 * // Chaining
 * const final = result.andThen((data) => processData(data));
 * ```
 *
 * @module utils/try-catch
 */

// =============================================================================
// Result Types and Methods
// =============================================================================

// -- Base Types ---------------------------------------------------------------

/**
 * Base type for Result with common methods.
 * @template T - The success value type
 * @template E - The error type (extends Error)
 */
export type ResultBase<T, E extends Error = Error> = {
  readonly _tag: "_ok" | "_err";
  match: <R>(handlers: { onOk: (data: T) => R; onErr: (error: E) => R }) => R;
  andThen: <U>(fn: (data: T) => Result<U, E>) => Result<U, E>;
};

/**
 * Methods available on Ok results.
 * @template T - The success value type
 * @template E - The error type
 */
export type OkMethods<T, E extends Error = Error> = {
  andThen: <U>(fn: (data: T) => Result<U, E>) => Result<U, E>;
  isOk: () => true;
  isErr: () => false;
};

/**
 * Methods available on Err results.
 * @template T - The success value type
 * @template E - The error type
 */
export type ErrMethods<T, E extends Error = Error> = {
  andThen: <U>(fn: (data: T) => Result<U, E>) => Result<U, E>;
  isOk: () => false;
  isErr: () => true;
};

/**
 * Represents a successful result containing data.
 * @template T - The success value type
 * @template E - The error type
 */
export type Ok<T, E extends Error = Error> = ResultBase<T, E> & {
  readonly _tag: "_ok";
  readonly data: T;
  readonly error: null;
} & OkMethods<T, E>;

/**
 * Represents a failed result containing an error.
 * @template T - The success value type
 * @template E - The error type
 */
export type Err<T, E extends Error = Error> = ResultBase<T, E> & {
  readonly _tag: "_err";
  readonly data: null;
  readonly error: E;
} & ErrMethods<T, E>;

// -- Root Result Type ---------------------------------------------------------

/**
 * The Result type - either Ok (success) or Err (failure).
 * @template T - The success value type
 * @template E - The error type
 */
export type Result<T = unknown, E extends Error = Error> = Ok<T, E> | Err<T, E>;

// =============================================================================
// Helpers and Constructors
// =============================================================================

function createOkMethods<T, E extends Error = Error>(data: T): OkMethods<T, E> {
  return {
    andThen: <U>(fn: (data: T) => Result<U, E>) => fn(data),
    isOk: () => true,
    isErr: () => false,
  };
}

function createErrMethods<T, E extends Error = Error>(
  error: E,
): ErrMethods<T, E> {
  return {
    andThen: <U>(fn: (data: T) => Result<U, E>) => Err<U, E>(error),
    isOk: () => false,
    isErr: () => true,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a Result is Ok.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param {Result<T, E>} result - The result to check
 * @returns {boolean} True if the result is Ok
 */
export function isOk<T = unknown, E extends Error = Error>(
  result: Result<T, E>,
): result is Ok<T, E> {
  return result._tag === "_ok";
}

/**
 * Type guard to check if a Result is Err.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param {Result<T, E>} result - The result to check
 * @returns {boolean} True if the result is Err
 */
export function isErr<T = unknown, E extends Error = Error>(
  result: Result<T, E>,
): result is Err<T, E> {
  return result._tag === "_err";
}

// =============================================================================
// Ok and Err Constructors
// =============================================================================

/**
 * Creates an Ok result containing the given data.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param {T} data - The success value
 * @returns {Ok<T, E>} An Ok result
 *
 * @example
 * ```typescript
 * const result = Ok({ name: 'John' });
 * console.log(result.data); // { name: 'John' }
 * ```
 */
export function Ok<T, E extends Error = Error>(data: T): Ok<T, E> {
  const methods = createOkMethods<T, E>(data);
  return {
    _tag: "_ok" as const,
    data,
    error: null,
    match: <R>(handlers: { onOk: (data: T) => R; onErr: (error: E) => R }) =>
      handlers.onOk(data),
    ...methods,
  } satisfies Ok<T, E>;
}

/**
 * Creates an Err result containing the given error.
 *
 * @template T - The success value type
 * @template E - The error type
 * @param {E} [error] - The error (defaults to generic Error if not provided)
 * @returns {Err<T, E>} An Err result
 *
 * @example
 * ```typescript
 * const result = Err(new Error('Something went wrong'));
 * console.log(result.error.message); // 'Something went wrong'
 * ```
 */
export function Err<T, E extends Error = Error>(error?: E): Err<T, E> {
  // If DefaultErrors is not defined, Error fallback will throw at runtime.
  // To avoid that, use a less assuming fallback (e.g. new Error).
  const finalError: E = error || (new Error("Unknown error") as E);
  const methods = createErrMethods<T, E>(finalError);
  return {
    _tag: "_err" as const,
    data: null,
    error: finalError,
    match: <R>(handlers: { onOk: (data: T) => R; onErr: (error: E) => R }) =>
      handlers.onErr(finalError),
    ...methods,
  } satisfies Err<T, E>;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Throws the provided error.
 * Useful for converting Err results back to exceptions when needed.
 *
 * @template E - The error type
 * @param {E} error - The error to throw
 * @throws {E} Always throws the provided error
 */
export function Throw<E extends Error = Error>(error: E): never {
  throw error;
}

/**
 * Pattern matching utility for Result types.
 * @todo Complete implementation
 *
 * @template T - The Result type
 * @param {Object} params - Match parameters
 * @param {T} params.result - The result to match
 * @param {Record} params.handles - Handler functions for each tag
 */
export function Match<T extends Result>({
  result,
  handles,
}: {
  result: T;
  handles: Record<T["_tag"], (data: T["data"]) => void>;
}) {
  return void null;
}

// =============================================================================
// Async Try-Catch Wrapper
// =============================================================================

/**
 * For async function with unknown return type
 * @param fn
 * @returns
 */
export async function tryCatch<T = unknown, E extends Error = Error>(
  fn: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await fn;
    if (
      data &&
      typeof data === "object" &&
      "_tag" in data &&
      (data._tag === "_ok" || data._tag === "_err")
    ) {
      return data as unknown as Result<T, E>;
    }
    return Ok<T, E>(data);
  } catch (error) {
    // Since DefaultErrors is not defined, fallback to a simple error object
    const err = (
      error instanceof Error ? error : new Error("Unknown error")
    ) as E;
    return Err<T, E>(err);
  }
}
