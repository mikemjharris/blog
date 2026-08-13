// Globals the browser bundle relies on. jQuery, Handlebars and the precompiled
// templates are loaded by their own script tags in the layout rather than imported,
// so they are not part of the bundle and have to be declared.

import type { BlockHelper } from './helpers.ts';

declare global {
  const Handlebars: {
    registerHelper(name: string, fn: BlockHelper): void;
  };

  /** Populated by public/dist/templates.js, which the layout loads first. */
  const MyApp: {
    templates: Record<string, (context: unknown) => string>;
  };
}

export {};
