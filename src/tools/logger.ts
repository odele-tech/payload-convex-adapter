/**
 * @fileoverview Logging Utilities for Payload Convex Adapter
 *
 * This module provides logging utilities for the adapter. It includes:
 * - A service logger factory that prefixes messages with the adapter name and prefix
 * - A generic logger factory for structured logging with multiple output methods
 *
 * ## Usage
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 * serviceLogger('Operation completed').log();
 *
 * const log = logger({ message: 'Hello' });
 * log.info();
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
 * Creates a logger with the adapter name and prefix prepended to messages.
 */
export type ServiceLogger = (message: string) => Logger;

/**
 * Creates a service logger instance with a configured prefix.
 *
 * The service logger prepends "PayloadConvexAdapter: {prefix} --" to all messages,
 * making it easy to identify adapter-related logs in the console.
 *
 * @param {CreateServiceLoggerProps} props - Configuration options
 * @returns {ServiceLogger} A function that creates loggers with the configured prefix
 *
 * @example
 * ```typescript
 * const serviceLogger = createServiceLogger({ prefix: 'my_app' });
 *
 * // Log an info message
 * serviceLogger('Document created successfully').info();
 *
 * // Log an error
 * serviceLogger('Failed to connect').error();
 *
 * // Output: "PayloadConvexAdapter: my_app -- Document created successfully"
 * ```
 */
export function createServiceLogger(
  props: CreateServiceLoggerProps
): ServiceLogger {
  const { prefix } = props;

  const serviceLogger = (message: string): Logger => {
    const log = logger({
      message: `PayloadConvexAdapter: ${prefix} -- ${message}`,
    });
    return log;
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
 * @param {LoggerProps} props - The logger configuration
 * @returns {Logger} A logger object with various output methods
 *
 * @example
 * ```typescript
 * const log = logger({ message: 'Hello World' });
 *
 * // Standard log
 * log.log();
 *
 * // Warning
 * log.warn();
 *
 * // Error
 * log.error();
 *
 * // Group logs together
 * log.group();
 * log.log();
 * log.groupEnd();
 * ```
 */
export function logger(props: LoggerProps): Logger {
  return {
    log: () => console.log(props.message),
    error: () => console.error(props.message),
    warn: () => console.warn(props.message),
    info: () => console.info(props.message),
    debug: () => console.debug(props.message),
    trace: () => console.trace(props.message),
    dir: () => console.dir(props.message),
    table: () => console.table(props.message),
    group: () => console.group(props.message),
    groupEnd: () => console.groupEnd(),
  };
}
