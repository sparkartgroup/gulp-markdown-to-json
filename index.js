const gutil = require('gulp-util');
const extend = require('util-extend');
const sort = require('sort-object');
const through = require('through2');
const util = require('util');

const expand = require('expand-hash');
const frontmatter = require('front-matter');

const NAME = 'gulp-markdown-to-json';
const PluginError = gutil.PluginError;

/**
 * Parses input Markdown files with given render method(s) and frontmatter with front-matter/js-yaml
 *
 * @param {stream} transform stream of Vinyl file objects
 * @param {function} (renderer|config) - Markdown function or configuration object
 * @param {object} config.renderer - Takes a string of Markdown and returns HTML.
 * @param {object} config.context - Call the renderer with the specified context for `this`
 * @returns transform stream of JSON as Vinyl file objects
 */

var stream;

module.exports = function (config, name) {
  if (typeof config === 'function') {
    var config = {
      renderer: config,
      name: name
    };
  }

  stream = through.obj(function (input, enc, callback) {
    if (!config.renderer || typeof config.renderer !== 'function') return this.emit('error', log('Markdown renderer function required'));

    var file;

    if (util.isArray(input)){
      var data = {};

      input.forEach(file => {
        const file_data = JSON.parse(toJSON(file, config).contents.toString());
        data = extend(file_data, data);
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
 * Parses frontmatter with front-matter/js-yaml
 * @param {object} file - Vinyl file object
 * @param {object} config
 * @returns JSON wrapped in a Vinyl file object
 * @private
 */

function toJSON (file, config) {
  if (file.isNull()) return;
  if (file.isStream()) return stream.emit('error', log('Streaming not supported'));

  if (file.isBuffer()) {
    const path = file.relative.split('.').shift().replace(/[\/\\]/g, '.');
    const parsed = frontmatter(file.contents.toString());
    const body = parsed.body.split(/\n/);

    const output = config.renderer.call(config.context, parsed.body);
    const markup = config.renderer.call(config.context, parsed.body).split(/\n/);

    const title = markup[0].substr(0,3) === '<h1'
      ? body[0]
      : false;

    var data = {};
    data[path] = parsed.attributes;

    if (title && !data[path].title) {
      data[path].title = (title.substr(0,1) === '#')
        ? title.substr(2)
        : title;
      data[path].body = markup.slice(1).join(' ');
    } else {
      data[path].body = config.renderer.call(config.context, parsed.body);
    }

    if (config.flatten) data = data[path];

    file.path = gutil.replaceExtension(file.path, '.json');
    file.contents = new Buffer(JSON.stringify(data));

    return file;
  }
}

/**
 * PluginError wrapper
 * @param {string} Error message
 * @private
 */

function log (message) {
  return new PluginError(NAME, message);
}
