/**
 * @fileoverview TypeScript Utility Types
 *
 * This module provides a comprehensive collection of TypeScript utility types
 * used throughout the Payload Convex adapter. These types enable type-safe
 * operations, transformations, and validations.
 *
 * ## Categories
 * - **Basic Types**: Extends, Object, MaybePromise, etc.
 * - **Function Types**: AsyncFunction, SyncOrAsync, etc.
 * - **Object Manipulation**: PickByValue, OmitByValue, etc.
 * - **Array/Tuple**: Head, Tail, Flatten, etc.
 * - **Union/Intersection**: UnionToIntersection, IsUnion, etc.
 * - **String Manipulation**: Capitalize, CamelCase, KebabCase
 * - **Branded Types**: Brand, ConfigId, UserId, SessionId
 * - **Conditional Types**: If, Not, And, Or
 * - **Validation**: ValidationResult, Validator, VSchema
 * - **Reactive Types**: Reactive, ReactiveConfig
 *
 * @module utils/types
 */

// =============================================================================
// BASIC TYPE UTILITIES
// =============================================================================

/**
 * Extends a type T with optional additional type U.
 * If U is undefined, returns T unchanged.
 * @template T - The base type
 * @template U - The extension type (optional)
 */
export type Extends<
  T,
  U extends Object | string | number | boolean | null | undefined = undefined,
> = U extends undefined ? T : T & U;

/**
 * Generic object type alias with optional type parameter.
 * @template T - The record type (defaults to Record<string, any>)
 */
export type Object<T extends Record<string, any> = Record<string, any>> = T;

/**
 * Filters out empty object types from a union.
 * @template T - The type to filter
 */
export type WithoutEmptyObject<T> = T extends Record<string, never> ? never : T;

/**
 * Extends a type T with a union of U.
 * @template T - The base type
 * @template U - The type to union with (optional)
 */
export type ExtendUnion<
  T,
  U extends Object | string | number | boolean | null | undefined = undefined,
> = U extends undefined ? T : T | U;

/**
 * A type that may be a value or a Promise of that value.
 * @template T - The value type
 */
export type MaybePromise<T extends Object | any = Object> = T | Promise<T>;

/**
 * A type that may be a value or a function returning that value.
 * @template T - The value type
 */
export type MaybeFunction<T extends Object | any = Object> = T | (() => T);

/**
 * A type that may be a value, a function, or an async function returning that value.
 * @template T - The value type
 */
export type ValueOrFactory<T extends Object | any = Object> =
  | T
  | (() => T)
  | (() => Promise<T>);

/**
 * Flattens complex type intersections for better IDE display.
 * @template T - The type to prettify
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Makes all properties of T optional recursively.
 * @template T - The type to make deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties of T required recursively.
 * @template T - The type to make deeply required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Makes specific properties K of T optional.
 * @template T - The base type
 * @template K - The keys to make optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specific properties K of T required.
 * @template T - The base type
 * @template K - The keys to make required
 */
export type RequiredProperties<T, K extends keyof T> = T & Required<Pick<T, K>>;

// =============================================================================
// FUNCTION TYPE UTILITIES
// =============================================================================

/**
 * Type for async functions with typed arguments and return.
 * @template TArgs - Tuple type for function arguments
 * @template TReturn - The return type
 */
export type AsyncFunction<TArgs extends any[] = any[], TReturn = any> = (
  ...args: TArgs
) => Promise<TReturn>;

export type SyncOrAsync<TArgs extends any[] = any[], TReturn = any> = (
  ...args: TArgs
) => TReturn | Promise<TReturn>;

// Note: MaybeFunction and ValueOrFactory are exported from config-types.ts

// =============================================================================
// OBJECT MANIPULATION UTILITIES
// =============================================================================

/**
 * Picks properties from T whose values extend V.
 * @template T - The source type
 * @template V - The value type to match
 */
export type PickByValue<T, V> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T]
>;

export type OmitByValue<T, V> = Omit<
  T,
  {
    [K in keyof T]: T[K] extends V ? K : never;
  }[keyof T]
>;

/**
 * Gets keys of T whose values extend U.
 * @template T - The source type
 * @template U - The value type to match
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Excludes null and undefined from T.
 * @template T - The type to make non-nullable
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

// =============================================================================
// ARRAY AND TUPLE UTILITIES
// =============================================================================

/**
 * Gets the first element type of a tuple.
 * @template T - The tuple type
 */
export type Head<T extends readonly any[]> = T extends readonly [
  infer H,
  ...any[],
]
  ? H
  : never;
/**
 * Gets all but the first element of a tuple.
 * @template T - The tuple type
 */
export type Tail<T extends readonly any[]> = T extends readonly [
  any,
  ...infer R,
]
  ? R
  : [];

/**
 * Checks if a tuple is empty.
 * @template T - The tuple type
 */
export type IsEmpty<T extends readonly any[]> = T extends readonly []
  ? true
  : false;

/**
 * Gets the length of a tuple.
 * @template T - The tuple type
 */
export type Length<T extends readonly any[]> = T["length"];

/**
 * Flattens an array type to its element type.
 * @template T - The array type
 */
export type Flatten<T> = T extends readonly (infer U)[] ? U : T;

// =============================================================================
// UNION AND INTERSECTION UTILITIES
// =============================================================================

/**
 * Converts a union type to an intersection type.
 * @template U - The union type
 */
export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Checks if a type is a union type.
 * @template T - The type to check
 */
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

/**
 * Excludes specific keys from a type (alias for Omit).
 * @template T - The source type
 * @template K - The keys to exclude
 */
export type ExcludeKeys<T, K extends keyof T> = Omit<T, K>;

/**
 * Includes only specific keys from a type (alias for Pick).
 * @template T - The source type
 * @template K - The keys to include
 */
export type IncludeKeys<T, K extends keyof T> = Pick<T, K>;

// =============================================================================
// STRING MANIPULATION UTILITIES
// =============================================================================

/**
 * Capitalizes the first character of a string type.
 * @template T - The string type
 */
export type Capitalize<T extends string> = T extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : T;

export type CamelCase<T extends string> = T extends `${infer A}_${infer B}`
  ? `${A}${Capitalize<CamelCase<B>>}`
  : T;

/**
 * Converts a camelCase string type to kebab-case.
 * @template T - The string type
 */
export type KebabCase<T extends string> = T extends `${infer A}${infer B}`
  ? A extends Lowercase<A>
    ? `${A}${KebabCase<B>}`
    : `_${Lowercase<A>}${KebabCase<B>}`
  : T;

// =============================================================================
// BRANDED TYPES
// =============================================================================

/**
 * Creates a branded type for nominal typing.
 * Branded types are structurally identical but nominally distinct.
 * @template T - The base type
 * @template B - The brand identifier
 */
export type Brand<T, B> = T & { __brand: B };

/** Branded string type for configuration IDs */
export type ConfigId = Brand<string, "ConfigId">;

/** Branded string type for user IDs */
export type UserId = Brand<string, "UserId">;

/** Branded string type for session IDs */
export type SessionId = Brand<string, "SessionId">;

// =============================================================================
// CONDITIONAL TYPE UTILITIES
// =============================================================================

/**
 * Conditional type: returns T if C is true, F otherwise.
 * @template C - The condition (boolean)
 * @template T - The type if true
 * @template F - The type if false
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Logical NOT for boolean types.
 * @template T - The boolean type
 */
export type Not<T extends boolean> = T extends true ? false : true;

/**
 * Logical AND for boolean types.
 * @template A - First boolean
 * @template B - Second boolean
 */
export type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

/**
 * Logical OR for boolean types.
 * @template A - First boolean
 * @template B - Second boolean
 */
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

// =============================================================================
// ENVIRONMENT AND RUNTIME UTILITIES
// =============================================================================

/**
 * Configuration type where values can be static or dynamic (functions).
 * @template T - The configuration type
 */
export type RuntimeConfig<T> = {
  [K in keyof T]: T[K] extends Function
    ? T[K]
    : T[K] extends object
      ? RuntimeConfig<T[K]>
      : T[K] | (() => T[K]) | (() => Promise<T[K]>);
};

// =============================================================================
// GENERIC CONSTRAINT UTILITIES
// =============================================================================

/** Generic object type with any keys and values */
export type AnyObject = Record<string | number | symbol, any>;

/** Generic function type */
export type AnyFunction = (...args: any[]) => any;

/** Generic async function type */
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Constructor type for classes.
 * @template T - The instance type
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Abstract constructor type for abstract classes.
 * @template T - The instance type
 */
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Result of a validation operation.
 * @template T - The validated value type
 */
export type ValidationResult<T> = {
  isValid: boolean;
  value?: T;
  errors?: string[];
};

/**
 * Validator function type.
 * @template T - The validated value type
 */
export type Validator<T> = (value: unknown) => ValidationResult<T>;

/**
 * Validation schema type mapping properties to validators.
 * @template T - The object type to validate
 */
export type VSchema<T> = {
  [K in keyof T]: Validator<T[K]>;
};

// =============================================================================
// PROMISE UTILITIES
// =============================================================================

/**
 * Extracts the resolved type from a Promise.
 * @template T - The Promise type
 */
export type PromiseValue<T> = T extends Promise<infer U> ? U : T;
// Note: MaybePromise is exported from config-types.ts

/**
 * Type for Promise.all results.
 * @template T - Tuple of types to resolve
 */
export type PromiseAll<T extends readonly unknown[]> = Promise<{
  [K in keyof T]: PromiseValue<T[K]>;
}>;

// =============================================================================
// REACTIVE TYPE UTILITIES
// =============================================================================

/**
 * Reactive value wrapper with subscription support.
 * @template T - The value type
 */
export type Reactive<T> = {
  readonly value: T;
  subscribe: (callback: (value: T) => void) => () => void;
  update: (updater: (current: T) => T) => void;
  set: (value: T) => void;
};

/**
 * Configuration type with reactive properties.
 * @template T - The configuration type
 */
export type ReactiveConfig<T> = {
  [K in keyof T]: T[K] extends object ? ReactiveConfig<T[K]> : Reactive<T[K]>;
};

// =============================================================================
// METADATA AND REFLECTION UTILITIES
// =============================================================================

/**
 * Adds metadata to a type.
 * @template T - The base type
 * @template M - The metadata type
 */
export type WithMetadata<T, M = Record<string, any>> = T & {
  __metadata: M;
};

/**
 * Extracts metadata from a WithMetadata type.
 * @template T - The type with metadata
 */
export type ExtractMetadata<T> =
  T extends WithMetadata<any, infer M> ? M : never;

// =============================================================================
// CONFIGURATION SPECIFIC UTILITIES
// =============================================================================

/**
 * Constraint definition for configuration values.
 * @template T - The value type
 */
export type ConfigConstraint<T> = {
  validate: (value: T) => boolean | string;
  transform?: (value: any) => T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
};

/**
 * Typed configuration with values, constraints, and metadata.
 * @template T - The configuration type
 */
export type TypedConfig<T extends Record<string, any>> = {
  [K in keyof T]: {
    value: T[K];
    constraint?: ConfigConstraint<T[K]>;
    metadata?: Record<string, any>;
  };
};
