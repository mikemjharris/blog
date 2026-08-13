// helpers.cjs is loaded both by the server (for express-handlebars) and by the
// browser as a plain script, so it stays CommonJS JavaScript. These are its types.

/** Minimal shape of the Handlebars runtime the browser copy registers against. */
export interface HandlebarsRegistry {
  registerHelper(name: string, fn: HandlebarsHelper): void;
}

export interface HandlebarsHelperOptions {
  fn(context: unknown): string;
  inverse(context: unknown): string;
}

export type HandlebarsHelper = (
  lvalue: string | string[],
  rvalue: string,
  options: HandlebarsHelperOptions,
) => string;

export interface Helpers {
  /** Block helper rendering its body when the two values are strictly equal. */
  compare: HandlebarsHelper;
  /** Block helper rendering its body when lvalue contains rvalue. */
  includes: HandlebarsHelper;
  // Index signature so this satisfies the handlebars HelperDelegateObject contract.
  [name: string]: HandlebarsHelper;
}

/** Registers the helpers against a Handlebars instance, or returns them if given null. */
export function register(handlebars: HandlebarsRegistry): void;
export function register(handlebars: null): Helpers;

export const helpers: Helpers;
