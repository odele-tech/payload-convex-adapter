/**
 * @fileoverview Logging Utilities for Payload Convex Adapter
 *
 * This module provides simple logging for Convex operations.
 * Strings get a prefix, objects/arrays are recursively serialized
 * so that deeply-nested values never appear as "[object Object]".
 *
 * ## Usage
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 *
 * serviceLogger('Operation started').log();
 * serviceLogger({ fn: 'getById', result: doc }).log();
 * ```
 *
 * @module tools/logger
 */

/**
 * Recursively serializes any value to a human-readable string.
 *
 * - Strings are returned as-is.
 * - `null` / `undefined` are coerced to their string representation.
 * - Circular references are replaced with the placeholder `"[Circular]"`.
 * - All other values (objects, arrays, primitives) are serialized with
 *   `JSON.stringify` using 2-space indentation so nested structures are
 *   fully expanded rather than collapsing to "[object Object]".
 *
 * @param value - The value to serialize.
 * @returns A fully-expanded string representation of the value.
 */
function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const seen: object[] = [];

  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.indexOf(val) !== -1) return "[Circular]";
        seen.push(val);
      }
      return val;
    },
    2
  );
}

/**
 * Props for creating a service logger.
 */
export type CreateServiceLoggerProps = {
  /** The prefix to include in log messages (usually the adapter's table prefix) */
  prefix: string;
};

/**
 * Return type for the service logger function.
 */
export type ServiceLogger = (message: string | object | unknown[]) => Logger;

/**
 * Creates a service logger instance with a configured prefix.
 *
 * @param {CreateServiceLoggerProps} props - Configuration options
 * @returns {ServiceLogger} A function that creates loggers with the configured prefix
 *
 * @example
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 *
 * // Log a string
 * serviceLogger('Operation started').log();
 *
 * // Log an object (deeply nested values are fully expanded)
 * serviceLogger({ fn: 'getById', props: { id: '123' } }).log();
 *
 * // Log an array
 * serviceLogger([1, 2, 3]).warn();
 * ```
 */
export function createServiceLogger(
  props: CreateServiceLoggerProps
): ServiceLogger {
  const { prefix } = props;

  const serviceLogger = (message: string | object | unknown[]): Logger => {
    const serialized = serialize(message);
    const formattedMessage = `PayloadConvexAdapter [${prefix}]: ${serialized}`;
    return logger({ message: formattedMessage });
  };

  return serviceLogger;
}

/**
 * Props for creating a logger instance.
 */
export type LoggerProps = {
  /** The message to log */
  message: string;
};

/**
 * Logger interface with essential console methods.
 */
export type Logger = {
  /**
   * Logs the message using console.log
   * @returns {void}
   */
  log: () => void;

  /**
   * Logs the message as an error using console.error
   * @returns {void}
   */
  error: () => void;

  /**
   * Logs the message as a warning using console.warn
   * @returns {void}
   */
  warn: () => void;
};

/**
 * Creates a logger instance with essential output methods.
 *
 * @param {LoggerProps} props - The logger configuration
 * @returns {Logger} A logger object with log, error, and warn methods
 */
export function logger(props: LoggerProps): Logger {
  const { message } = props;

  return {
    log: () => console.log(message),
    error: () => console.error(message),
    warn: () => console.warn(message),
  };
}
