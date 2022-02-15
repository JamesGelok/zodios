import { z } from "zod";

/**
 * filter an array type by a predicate
 * @param T - array type
 * @param C - predicate object to match
 */
export type FilterArray<T, C> = T extends readonly [infer F, ...infer R]
  ? F extends Readonly<C>
    ? [F, ...FilterArray<R, C>]
    : FilterArray<R, C>
  : [];

/**
 * merge all union types into a single type
 * @param T - union type
 */
export type MergeUnion<T> = (
  T extends unknown ? (k: T) => void : never
) extends (k: infer I) => void
  ? { [K in keyof I]: I[K] }
  : never;

/**
 * get all required properties from an object type
 * @param T - object type
 */
type RequiredProps<T> = Omit<
  T,
  {
    [P in keyof T]-?: undefined extends T[P] ? P : never;
  }[keyof T]
>;

/**
 * get all optional properties from an object type
 * @param T - object type
 */
type OptionalProps<T> = Pick<
  T,
  {
    [P in keyof T]-?: undefined extends T[P] ? P : never;
  }[keyof T]
>;

/**
 * merge two types into a single type
 * @param T - first type
 * @param U - second type
 */
type MergeSimplify<T, U> = MergeUnion<T | U>;

/**
 * transform possible undefined properties from a type into optional properties
 * @param T - object type
 */
export type UndefinedToOptional<T> = MergeSimplify<
  RequiredProps<T>,
  Partial<OptionalProps<T>>
>;

/**
 * remove all the never properties from a type object
 * @param T - object type
 */
export type PickDefined<T> = Pick<
  T,
  { [K in keyof T]: T[K] extends never ? never : K }[keyof T]
>;

/**
 * check if two types are equal
 */
type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T
  ? 1
  : 2) extends <G>() => G extends U ? 1 : 2
  ? Y
  : N;

/**
 * get never if empty type
 * @param T - type
 * @example
 * ```ts
 * type A = {};
 * type B = NotEmpty<A>; // B = never
 */
export type NeverIfEmpty<T> = IfEquals<T, {}, never, T>;

type RequiredChildProps<T> = {
  [K in keyof T]: IfEquals<T[K], OptionalProps<T[K]>, never, K>;
}[keyof T];

type OptionalChildProps<T> = {
  [K in keyof T]: IfEquals<T[K], OptionalProps<T[K]>, K, never>;
}[keyof T];

/**
 * set properties to optional if their child properties are optional
 * @param T - object type
 */
export type SetPropsOptionalIfChildrenAreOptional<T> = MergeSimplify<
  Pick<Partial<T>, OptionalChildProps<T>>,
  Pick<T, RequiredChildProps<T>>
>;

/**
 * transform an array type into a readonly array type
 * @param T - array type
 */
interface ReadonlyArrayDeep<T> extends ReadonlyArray<ReadonlyDeep<T>> {}

/**
 * transform an object type into a readonly object type
 * @param T - object type
 */
type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: ReadonlyDeep<T[P]>;
};

/**
 * transform a type into a readonly type
 * @param T - type
 */
export type ReadonlyDeep<T> = T extends (infer R)[]
  ? ReadonlyArrayDeep<R>
  : T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

/**
 * Map a type an api description parameter to a zod infer type
 * @param T - array of api description parameters
 */
export type MapSchemaParameters<T> = T extends readonly [infer F, ...infer R]
  ? F extends Readonly<{
      name: infer Name;
      schema: z.ZodType<infer Z>;
    }>
    ? Name extends string
      ?
          | {
              [Key in Name]: Z;
            }
          | MapSchemaParameters<R>
      : never
    : never
  : never;

/**
 * split template type string with '/' separator into a tuple of strings
 * @param T - template type string
 * @param S - separator
 */
export type SplitTemplateType<
  T,
  C extends string = "/"
> = T extends `${infer F}${C}${infer R}`
  ? [F, ...SplitTemplateType<R, C>]
  : [T];

export type GetParamsKeys<T> = T extends `${infer F}:${infer R}/${infer S}`
  ? [R, ...GetParamsKeys<S>]
  : T extends `${infer G}:${infer U}`
  ? [U]
  : [];

export type ParamsToObject<T> = T extends [infer F, ...infer R]
  ? F extends string
    ? MergeSimplify<
        {
          [Key in F]: string | number;
        },
        ParamsToObject<R>
      >
    : ParamsToObject<R>
  : {};
