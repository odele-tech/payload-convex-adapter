/**
 * @fileoverview Value Sanitization for Convex Serialization
 *
 * Convex does not support undefined values in its serialization system.
 * These utilities ensure all values are converted to valid Convex types
 * before logging or returning from functions.
 *
 * @module tools/sanitizer
 */

/**
 * Checks if a value is a plain object (not array, not null, not class instance)
 */
function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Recursively sanitizes an array for Convex serialization.
 * Converts all undefined elements to null and recursively sanitizes nested structures.
 *
 * @param arr - The array to sanitize
 * @returns A new array with all undefined values converted to null
 *
 * @example
 * sanitizeArray([1, undefined, 3]); // → [1, null, 3]
 */
export function sanitizeArray<T>(arr: T[]): any[] {
  return arr.map((item) => {
    if (item === undefined) return null;
    if (Array.isArray(item)) return sanitizeArray(item);
    if (isPlainObject(item)) return sanitizeObject(item as Record<string, any>);
    return item;
  });
}

/**
 * Recursively sanitizes an object for Convex serialization.
 * Converts all undefined property values to null and recursively
 * sanitizes nested objects and arrays.
 *
 * @param obj - The object to sanitize
 * @returns A new object with all undefined values converted to null
 *
 * @example
 * sanitizeObject({ a: undefined, b: 'hello' }); // → { a: null, b: 'hello' }
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    if (value === undefined) {
      result[key] = null;
    } else if (Array.isArray(value)) {
      result[key] = sanitizeArray(value);
    } else if (isPlainObject(value)) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Sanitizes any value (primitive, array, or object) for Convex serialization.
 * This is the main entry point for sanitization.
 *
 * @param value - Any value to sanitize
 * @returns The sanitized value with all undefined converted to null
 *
 * @example
 * sanitize(undefined);           // → null
 * sanitize([1, undefined, 3]);   // → [1, null, 3]
 * sanitize({ a: undefined });    // → { a: null }
 * sanitize('hello');             // → 'hello'
 */
export function sanitize<T>(value: T): any {
  if (value === undefined) return null;
  if (Array.isArray(value)) return sanitizeArray(value);
  if (isPlainObject(value)) return sanitizeObject(value as Record<string, any>);
  return value;
}

/**
 * Sanitizes a single value for Convex serialization.
 * Converts undefined to null, which is a valid Convex value.
 *
 * @param value - The value to sanitize
 * @returns The sanitized value (undefined → null)
 *
 * @example
 * sanitizeValue(undefined);  // → null
 * sanitizeValue('hello');    // → 'hello'
 * sanitizeValue(123);        // → 123
 */
export function sanitizeValue<T>(value: T): T extends undefined ? null : T {
  return (value === undefined ? null : value) as any;
}
