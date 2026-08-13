const fs = require('fs');
const path = require('path');
const sass = require('sass');
const esbuild = require('esbuild');
const Handlebars = require('handlebars');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'public/dist');
const vendorDist = path.join(dist, 'vendor');

const stylesheets = [
  'public/stylesheets/reset.scss',
  'public/stylesheets/style.scss',
  'public/stylesheets/mobile.scss',
];

const scripts = ['public/javascripts/helpers.js', 'public/javascripts/main.js'];

const templateDir = 'server/views/templates';
const partialDir = 'server/views/templates/partials';

// Browser copies of the two libraries the layout loads. Built into dist so the app
// never has to serve node_modules over HTTP.
const vendor = ['jquery/dist/jquery.min.js', 'handlebars/dist/handlebars.min.js'];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, contents) => fs.writeFileSync(path.join(dist, file), contents);
const hbsFiles = (dir) =>
  fs.readdirSync(path.join(root, dir)).filter((file) => file.endsWith('.hbs'));

const buildCss = () => {
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

const buildJs = async () => {
  // Both files are globals-based IIFEs rather than modules, so they are concatenated
  // in order and minified — not bundled.
  const source = scripts.map(read).join('\n');
  const { code } = await esbuild.transform(source, { minify: true });
  write('main.js', code);
};

const buildTemplates = () => {
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

const copyVendor = () => {
  fs.mkdirSync(vendorDist, { recursive: true });
  vendor.forEach((file) => {
    fs.copyFileSync(
      path.join(root, 'node_modules', file),
      path.join(vendorDist, path.basename(file)),
    );
  });
};

const build = async () => {
  fs.mkdirSync(dist, { recursive: true });
  buildCss();
  await buildJs();
  buildTemplates();
  copyVendor();
};

const watch = () => {
  const targets = [
    ['public/stylesheets', buildCss],
    ['public/javascripts', buildJs],
    [templateDir, buildTemplates],
  ];

  targets.forEach(([dir, rebuild]) => {
    fs.watch(path.join(root, dir), { recursive: true }, async () => {
      try {
        await rebuild();
        console.log(`rebuilt ${dir}`);
      } catch (err) {
        console.error(`failed to rebuild ${dir}`, err.message);
      }
    });
  });

  console.log('watching for asset changes');
};

build()
  .then(() => {
    console.log('assets built to public/dist');
    if (process.argv.includes('--watch')) watch();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
