/**
 * @fileoverview Logging Utilities for Payload Convex Adapter
 *
 * This module provides logging utilities for the adapter. It includes:
 * - A service logger factory that prefixes messages with the adapter name and prefix
 * - A generic logger factory for structured logging with multiple output methods
 * - Automatic sanitization of undefined values for Convex compatibility
 *
 * ## Usage
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 * serviceLogger('Operation completed').log();
 *
 * // Object messages are automatically sanitized
 * serviceLogger({ operation: 'delete', result: undefined }).log();
 *
 * const log = logger({ message: 'Hello' });
 * log.info();
 * ```
 *
 * @module tools/logger
 */

import { sanitize } from "./sanitizer";

/**
 * Props for creating a service logger.
 */
export type CreateServiceLoggerProps = {
  /** The prefix to include in log messages (usually the adapter's table prefix) */
  prefix: string;
};

/**
 * Return type for the service logger function.
 * Creates a logger with the adapter name and prefix prepended to messages.
 * Accepts both strings and objects - objects will be sanitized and stringified.
 */
export type ServiceLogger = (message: string | unknown) => Logger;

/**
 * Creates a service logger instance with a configured prefix.
 *
 * The service logger prepends "PayloadConvexAdapter: {prefix} --" to all messages,
 * making it easy to identify adapter-related logs in the console.
 *
 * **Sanitization**: Automatically sanitizes object messages to prevent Convex
 * serialization errors from undefined values.
 *
 * @param {CreateServiceLoggerProps} props - Configuration options
 * @returns {ServiceLogger} A function that creates loggers with the configured prefix
 *
 * @example
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 *
 * // Log a string message
 * serviceLogger('Document created successfully').info();
 * // Output: "PayloadConvexAdapter: my_app -- Document created successfully"
 *
 * // Log an object message (will be sanitized and stringified)
 * serviceLogger({ operation: 'delete', result: undefined }).log();
 * // Output: "PayloadConvexAdapter: my_app -- {\n  \"operation\": \"delete\",\n  \"result\": null\n}"
 *
 * // Log an error
 * serviceLogger('Failed to connect').error();
 * ```
 */
export function createServiceLogger(
  props: CreateServiceLoggerProps
): ServiceLogger {
  const { prefix } = props;

  const serviceLogger = (message: string | unknown): Logger => {
    // Handle string messages directly
    if (typeof message === "string") {
      return logger({
        message: `PayloadConvexAdapter: ${prefix} -- ${message}`,
      });
    }

    // Handle object messages: sanitize, stringify, then add prefix
    const sanitized = sanitize(message);
    let stringified: string;

    try {
      stringified = JSON.stringify(sanitized, null, 2);
    } catch {
      stringified = String(message);
    }

    return logger({
      message: `PayloadConvexAdapter: ${prefix} -- ${stringified}`,
    });
  };

  return serviceLogger;
}

/**
 * Props for creating a logger instance.
 */
export type LoggerProps = {
  /** The message to log - can be a string or any serializable value */
  message: string | unknown;

  /** Optional: disable sanitization (default: false) */
  skipSanitization?: boolean;

  /** Optional: custom JSON.stringify replacer function */
  replacer?: (key: string, value: unknown) => unknown;

  /** Optional: custom JSON.stringify space argument (default: 2) */
  space?: string | number;
};

/**
 * Logger interface providing various console output methods.
 *
 * Each method outputs the message using the corresponding console function.
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

  /**
   * Logs the message as info using console.info
   * @returns {void}
   */
  info: () => void;

  /**
   * Logs the message as debug using console.debug
   * @returns {void}
   */
  debug: () => void;

  /**
   * Logs the message with stack trace using console.trace
   * @returns {void}
   */
  trace: () => void;

  /**
   * Logs the message using console.dir for object inspection
   * @returns {void}
   */
  dir: () => void;

  /**
   * Logs the message as a table using console.table
   * @returns {void}
   */
  table: () => void;

  /**
   * Starts a new console group with the message as label
   * @returns {void}
   */
  group: () => void;

  /**
   * Ends the current console group
   * @returns {void}
   */
  groupEnd: () => void;
};

/**
 * Creates a logger instance with various output methods.
 *
 * This factory function creates a logger object that provides
 * different console methods for outputting messages.
 *
 * **Sanitization**: If the message is an object, it will be automatically
 * sanitized to convert `undefined` values to `null` before stringification.
 * This prevents Convex serialization errors.
 *
 * @param {LoggerProps} props - The logger configuration
 * @returns {Logger} A logger object with various output methods
 *
 * @example
 * ```typescript
 * // String message (backward compatible)
 * const log = logger({ message: 'Hello World' });
 * log.log();  // Output: "Hello World"
 *
 * // Object message (auto-sanitized and stringified)
 * const log = logger({
 *   message: {
 *     operation: 'delete',
 *     result: undefined  // Will become null
 *   }
 * });
 * log.log();  // Output: "{\n  \"operation\": \"delete\",\n  \"result\": null\n}"
 *
 * // Array with undefined (auto-sanitized)
 * const log = logger({
 *   message: [1, undefined, 3]
 * });
 * log.log();  // Output: "[1, null, 3]"
 *
 * // Skip sanitization if needed
 * const log = logger({
 *   message: { data: undefined },
 *   skipSanitization: true
 * });
 *
 * // Group logs together
 * log.group();
 * log.log();
 * log.groupEnd();
 * ```
 */
export function logger(props: LoggerProps): Logger {
  const { message, skipSanitization = false, replacer, space = 2 } = props;

  // Process the message
  let processedMessage: string;

  if (typeof message === "string") {
    // Already a string, use as-is
    processedMessage = message;
  } else {
    // Object/Array/Primitive - sanitize and stringify
    const valueToStringify = skipSanitization ? message : sanitize(message);

    try {
      processedMessage = JSON.stringify(
        valueToStringify,
        replacer as (key: string, value: unknown) => unknown,
        space
      );
    } catch {
      // Fallback if stringify fails
      console.error("Logger: Failed to stringify message");
      processedMessage = String(message);
    }
  }

  return {
    log: () => console.log(processedMessage),
    error: () => console.error(processedMessage),
    warn: () => console.warn(processedMessage),
    info: () => console.info(processedMessage),
    debug: () => console.debug(processedMessage),
    trace: () => console.trace(processedMessage),
    dir: () => console.dir(processedMessage),
    table: () => console.table(processedMessage),
    group: () => console.group(processedMessage),
    groupEnd: () => console.groupEnd(),
  };
}
