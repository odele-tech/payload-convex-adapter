/**
 * @fileoverview Logging Utilities for Payload Convex Adapter
 *
 * This module provides simple logging for Convex operations.
 * Strings get a prefix, objects/arrays get JSON.stringify.
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
 * // Log an object
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
    if (typeof message === "string") {
      const formattedMessage = `PayloadConvexAdapter [${prefix}]: ${message}`;
      return logger({ message: formattedMessage });
    } else {
      // Log prefix and object separately so console formats the object nicely
      const prefixMessage = `PayloadConvexAdapter [${prefix}]:`;
      return {
        log: () => console.log(prefixMessage, message),
        error: () => console.error(prefixMessage, message),
        warn: () => console.warn(prefixMessage, message),
      };
    }
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
