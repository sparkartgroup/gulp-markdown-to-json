const gutil = require('gulp-util');
const extend = require('util-extend');
const sort = require('sort-object');
const through = require('through2');
const util = require('util');

const expand = require('expand-hash');
const frontmatter = require('front-matter');
const marked = require('marked');

const NAME = 'gulp-markdown-to-json';
const PluginError = gutil.PluginError;
const streamingErr = new PluginError(NAME, 'Streaming not supported');

function parseError(message, file, line, column) {
  return new PluginError(NAME, `${message}
    ${(file.relative)}:${line}:${column}
    ${file.contents.toString().split('\n')[line]}
    ${' '.repeat(column)}^\n`);
}

function parse(file, flatten) {
  if (file.isNull()) return;
  if (file.isStream()) return this.emit('error', streamingErr);

  if (file.isBuffer()) {
    const path = file.relative.split('.').shift().replace(/[\/\\]/g, '.');

    try {
       var parsed = frontmatter(file.contents.toString());
    } catch(err) {
        throw parseError(`[${err.name}]: ${err.reason}`, file, err.mark.line, err.mark.column);
    }

    const body = parsed.body.split(/\n/);
    const markup = marked(parsed.body).split(/\n/);

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
      data[path].body = marked(parsed.body);
    }

    if (flatten) data = data[path];

    file.path = gutil.replaceExtension(file.path, '.json');
    file.contents = new Buffer(JSON.stringify(data));

    return file;
  }
}

module.exports = function (config, marked_options) {
  const options = config && marked_options
    ? marked_options
    : config;

  marked.setOptions(options);

  const stream = through.obj(function (input, enc, callback) {
    var file;
    try {
      if (util.isArray(input)){
        var data = {};

        input.forEach(file => {
          const file_data = JSON.parse(parse(file).contents.toString());

          data = extend(file_data, data);
        });

        const tree = sort(expand(data));
        const json = JSON.stringify(tree);

        const name = config && typeof config === 'string'
          ? config
          : 'content.json';

        file = new gutil.File({
          base: '/',
          cwd: '/',
          path: '/' + name,
          contents: new Buffer(json)
        });
      } else {
        file = parse(input, true);
      }

      this.push(file);

    } catch(err) {
      console.log(err.toString());
    }

    callback();
  });

  return stream;
};
