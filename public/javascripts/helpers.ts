// Handlebars block helpers, shared by the server (via express-handlebars) and the
// browser bundle, so the two render templates identically.

export interface BlockOptions {
  fn(context: unknown): string;
  inverse(context: unknown): string;
}

export type BlockHelper = (
  this: unknown,
  lvalue: unknown,
  rvalue: unknown,
  options: BlockOptions,
) => string;

export interface Helpers {
  /** Renders its body when the two values are strictly equal. */
  compare: BlockHelper;
  /** Renders its body when lvalue contains rvalue. */
  includes: BlockHelper;
  // Index signature so this satisfies the handlebars HelperDelegateObject contract.
  [name: string]: BlockHelper;
}

/** `{{#compare a b}}` with one argument would otherwise pass options as rvalue. */
const requireBothValues = (options: BlockOptions | undefined): BlockOptions => {
  if (!options || typeof options.fn !== 'function') {
    throw new Error('Handlebars block helper needs 2 parameters');
  }
  return options;
};

export const helpers: Helpers = {
  compare(lvalue, rvalue, options) {
    const opts = requireBothValues(options);
    return lvalue === rvalue ? opts.fn(this) : opts.inverse(this);
  },

  includes(lvalue, rvalue, options) {
    const opts = requireBothValues(options);
    // Only arrays and strings can contain something; anything else contains nothing.
    const found =
      (Array.isArray(lvalue) || typeof lvalue === 'string') &&
      (lvalue as string[]).indexOf(rvalue as string) !== -1;
    return found ? opts.fn(this) : opts.inverse(this);
  },
};

interface HandlebarsRegistry {
  registerHelper(name: string, fn: BlockHelper): void;
}

/** Registers every helper against a Handlebars instance — used by the browser bundle. */
export const register = (handlebars: HandlebarsRegistry): void => {
  for (const [name, helper] of Object.entries(helpers)) {
    handlebars.registerHelper(name, helper);
  }
};
