const assign = require('lodash.assign');
const gutil = require('gulp-util');
const extend = require('util-extend');
const sort = require('sort-object');
const through = require('through2');

const expand = require('expand-hash');
const frontmatter = require('front-matter');

const NAME = 'gulp-markdown-to-json';
const PluginError = gutil.PluginError;

/**
 * Parses input Markdown files with given render method(s) and frontmatter with front-matter/js-yaml
 *
 * @param {stream} transform stream of Vinyl file objects
 * @param {function} (renderer, [name], [transform]|config) - Markdown function and optional name, transform function (or a configuration object)
 * @param {function} config.renderer - takes a string of Markdown and returns HTML.
 * @param {object} config.context - call the renderer with the specified context for `this`
 * @param {boolean} config.stripTitle - strips the first `<h1>` element found, if extracted as title property
 * @param {function} (data, file) config.transform - a chance to modify the data for each file before outputting
 * @returns transform stream of JSON as Vinyl file objects
 */

var stream;

module.exports = function (config, name, transform) {
  if (typeof config === 'function') {
    var config = {
      renderer: config,
    };

    if (typeof name === 'string') config.name = name;
    if (typeof name === 'function') config.transform = name;
    if (typeof transform === 'function') config.transform = transform;
  }

  config.flatten = false; // ensure default, if config has been mutated

  stream = through.obj(function (input, enc, callback) {
    if (!config.renderer || typeof config.renderer !== 'function') return this.emit('error', log('Markdown renderer function required'));

    var file;

    if (Array.isArray(input)) {
      var data = {};

      input.forEach(file => {
        const fileData = JSON.parse(toJSON(file, config).contents.toString());
        data = extend(fileData, data);
      });

      const tree = sort(expand(data));

      const json = JSON.stringify(tree);

      file = new gutil.File({
        base: '/',
        cwd: '/',
        path: '/' + (config.name || 'content.json'),
        contents: new Buffer(json)
      });
    } else {
      config.flatten = true;
      file = toJSON(input, config);
    }

    this.push(file);
    callback();
  });

  return stream;
};

/**
 * Extracts title text from first <h1> found in rendered markup
 * @param {string} markup
 * @param {boolean} strip - removes the first <h1> from the body
 * @returns title text and body, if title was stripped
 * @private
 */

function extractTitle (markup, strip) {
  const matches = /<h1[^>]*>([^<]*)<\/h1>/.exec(markup);

  if (!matches) return markup;

  const result = {
    title: matches[1]
  };

  if (strip) result.body = markup.replace(matches[0], '').trim();

  return result;
}

/**
 * Parses frontmatter with front-matter/js-yaml
 * @param {object} file - Vinyl file object
 * @param {object} config
 * @returns JSON wrapped in a Vinyl file object
 * @private
 */

function toJSON (file, config) {
  if (file.isNull()) return;
  if (file.isStream()) return stream.emit('error', log('Streaming not supported'));
  if (!file.isBuffer()) return; // skip folders

  const path = file.relative.split('.').shift().replace(/[\/\\]/g, '.');
  const parsed = frontmatter(file.contents.toString());

  var data = {};
  data[path] = parsed.attributes;
  data[path].body = config.renderer.call(config.context, parsed.body);

  if (!data[path].title) {
    const extracted = extractTitle(data[path].body, config.stripTitle);
    if (typeof extracted === 'object') data[path] = assign(data[path], extracted);
  }

  // user-defined transform step
  if (config.transform) data[path] = config.transform(data[path], file);

  // internal option: removes path from object if outputting multiple files
  if (config.flatten) data = data[path];

  file.path = gutil.replaceExtension(file.path, '.json');
  file.contents = new Buffer(JSON.stringify(data));

  return file;
}

/**
 * PluginError wrapper
 * @param {string} Error message
 * @private
 */

function log (message) {
  return new PluginError(NAME, message);
}
