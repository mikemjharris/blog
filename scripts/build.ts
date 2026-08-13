import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';
import * as esbuild from 'esbuild';
import Handlebars from 'handlebars';

const root = path.join(import.meta.dirname, '..');
const dist = path.join(root, 'public/dist');
const vendorDist = path.join(dist, 'vendor');

const stylesheets = [
  'public/stylesheets/reset.scss',
  'public/stylesheets/style.scss',
  'public/stylesheets/mobile.scss',
];

const clientEntry = 'public/javascripts/main.ts';

// jQuery 4 dropped the old browsers anyway, so there is nothing to gain from
// transpiling further down than this.
const BROWSER_TARGET = 'es2020';

const templateDir = 'server/views/templates';
const partialDir = 'server/views/templates/partials';

// Browser copies of the two libraries the layout loads. Built into dist so the app
// never has to serve node_modules over HTTP.
const vendor = ['jquery/dist/jquery.min.js', 'handlebars/dist/handlebars.min.js'];

// Only the chart post needs d3, and only these five modules of it. Bundling the
// subset rather than shipping the 273KB meta-package keeps it to about 42KB.
const D3_EXPORTS = [
  "export { select } from 'd3-selection';",
  "export { max } from 'd3-array';",
  "export { scaleBand, scaleLinear } from 'd3-scale';",
  "export { line, curveMonotoneX } from 'd3-shape';",
  "export { axisBottom, axisLeft } from 'd3-axis';",
].join('\n');

const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file: string, contents: string): void =>
  fs.writeFileSync(path.join(dist, file), contents);
const hbsFiles = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir)).filter((file) => file.endsWith('.hbs'));

const buildCss = (): void => {
  const css = stylesheets
    .map(
      (file) =>
        sass.compile(path.join(root, file), {
          silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
        }).css,
    )
    .join('\n');
  write('style.css', css);
};

const buildJs = async (): Promise<void> => {
  // main.ts imports the shared helpers, so this is a real bundle. jQuery, Handlebars
  // and the precompiled templates stay globals loaded by their own script tags.
  await esbuild.build({
    entryPoints: [path.join(root, clientEntry)],
    outfile: path.join(dist, 'main.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: BROWSER_TARGET,
  });
};

const buildTemplates = (): void => {
  const partials = hbsFiles(partialDir).map((file) => {
    const name = path.basename(file, '.hbs');
    const spec = Handlebars.precompile(read(path.join(partialDir, file)));
    return `Handlebars.registerPartial(${JSON.stringify(name)}, Handlebars.template(${spec}));`;
  });

  const templates = hbsFiles(templateDir).map((file) => {
    const name = path.basename(file, '.hbs');
    const spec = Handlebars.precompile(read(path.join(templateDir, file)));
    return `this["MyApp"]["templates"][${JSON.stringify(name)}] = Handlebars.template(${spec});`;
  });

  const preamble = [
    'this["MyApp"] = this["MyApp"] || {};',
    'this["MyApp"]["templates"] = this["MyApp"]["templates"] || {};',
  ];

  write('templates.js', [...preamble, ...partials, ...templates].join('\n'));
};

const copyVendor = (): void => {
  fs.mkdirSync(vendorDist, { recursive: true });
  vendor.forEach((file) => {
    fs.copyFileSync(
      path.join(root, 'node_modules', file),
      path.join(vendorDist, path.basename(file)),
    );
  });
};

// Exposed as the `d3` global because the chart post is a plain inline script.
const buildD3 = async (): Promise<void> => {
  fs.mkdirSync(vendorDist, { recursive: true });
  await esbuild.build({
    stdin: { contents: D3_EXPORTS, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'd3',
    outfile: path.join(vendorDist, 'd3.min.js'),
  });
};

const build = async (): Promise<void> => {
  fs.mkdirSync(dist, { recursive: true });
  buildCss();
  await buildJs();
  buildTemplates();
  copyVendor();
  await buildD3();
};

const watch = (): void => {
  const targets: [string, () => void | Promise<void>][] = [
    ['public/stylesheets', buildCss],
    ['public/javascripts', buildJs],
    [templateDir, buildTemplates],
  ];

  targets.forEach(([dir, rebuild]) => {
    fs.watch(path.join(root, dir), { recursive: true }, () => {
      void (async () => {
        try {
          await rebuild();
          console.log(`rebuilt ${dir}`);
        } catch (err) {
          console.error(`failed to rebuild ${dir}`, err instanceof Error ? err.message : err);
        }
      })();
    });
  });

  console.log('watching for asset changes');
};

try {
  await build();
  console.log('assets built to public/dist');
  if (process.argv.includes('--watch')) watch();
} catch (err) {
  console.error(err);
  process.exit(1);
}
