'use strict';

const assign = require('lodash.assign');
const expand = require('expand-hash');
const extend = require('util-extend');
const isTextOrBinary = require('istextorbinary');
const frontmatter = require('front-matter');
const Path = require('path');
const PluginError = require('plugin-error');
const sort = require('sort-object');
const through = require('through2');
const Vinyl = require('vinyl');

const NAME = 'gulp-markdown-to-json';

module.exports = markdownToJSON;

/**
 * Parses input Markdown files with given render method(s) and frontmatter with front-matter/js-yaml
 *
 * @param {stream.Transform} transform stream of Vinyl file objects
 * @param {Function} (renderer, [name], [transform]|config) - Markdown function and optional name, transform function (or a configuration object)
 * @param {Function} config.renderer - takes a string of Markdown and returns HTML
 * @param {Object} config.context - call the renderer with the specified context for `this`
 * @param {Boolean} config.flattenIndex - unwrap files named `index` or the same as parent dirs (consolidated output only)
 * @param {Boolean} config.stripTitle - strips the first `<h1>` element found, if extracted as title property
 * @param {Function} (data, file) config.transform - a chance to modify the data for each file before outputting
 * @returns {stream.Transform} of JSON as Vinyl file objects
 */

function markdownToJSON (configArg, name, transform) {
  var config;

  if (typeof configArg === 'function') {
    config = {
      renderer: configArg
    };

    if (typeof name === 'string') config.name = name;
    if (typeof name === 'function') config.transform = name;
    if (typeof transform === 'function') config.transform = transform;
  } else {
    config = configArg;
  }

  const stream = through.obj(function (input, enc, callback) {
    if (!config.renderer || typeof config.renderer !== 'function') return callback(pluginError('Markdown renderer function required'));

    const isBuffered = Array.isArray(input); // as created by list-stream

    const queue = (isBuffered)
      ? input.map(file => isBinary(file))
      : [isBinary(input)];

    Promise.all(queue)
      .then(files => Promise.resolve(files.filter(file => file.isText)))
      .then(files => Promise.all(files.map(file => toJSON(file, config))))
      .then(files => {
        const invalidFiles = files.filter(file => file.isInvalid);
        const validFiles = files.filter(file => !file.isInvalid);

        invalidFiles.forEach(file => stream.emit('error', pluginError(`${Path.basename(file.basename)} is not valid JSON`)));

        if (isBuffered) return consolidateFiles(validFiles, config);

        validFiles.forEach(file => stream.push(file));
      })
      .then(consolidatedFile => {
        if (consolidatedFile) stream.push(consolidatedFile);
        callback();
      })
      .catch(err => callback(pluginError(err)));
  });

  return stream;
}

/**
 * Consolidates JSON output into a nested and sorted object whose hierarchy matches the input directory structure
 *
 * @param {Array} files - JSON output as Vinyl file objects
 * @returns {Promise.<Vinyl>}
 */

function consolidateFiles (files, config) {
  return Promise.resolve(files)
    .then(files => {
      var data = {};

      files.forEach(file => {
        var path = file.relative.split('.').shift().split(Path.sep);

        if (path.length >= 2 && config.flattenIndex) {
          var relPath = path.splice(-2, 2);
          path = (relPath[0] === relPath[1] || relPath[1] === 'index')
            ? path.concat(relPath[0])
            : path.concat(relPath);
        }

        data[path.join('.')] = JSON.parse(file.contents.toString());
      });

      data = sort(data);

      const tree = expand(data);
      const json = JSON.stringify(tree);

      return Promise.resolve(new Vinyl({
        base: '/',
        cwd: '/',
        path: '/' + (config.name || 'content.json'),
        contents: new Buffer(json)
      }));
    });
}

/**
 * Extracts title text from first <h1> found in rendered markup
 * @param {String} markup
 * @param {Boolean} strip - removes the first <h1> from the body when true
 * @returns {title: String, <body: String>}
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
 * Tests if file content is ASCII
 * @param {Vinyl} file - Vinyl file object
 * @returns {Promise.<boolean>}
 * @private
 */

function isBinary (file) {
  return new Promise((resolve, reject) => {
    isTextOrBinary.isText(Path.basename(file.path), file.contents, (err, isText) => {
      if (err) return reject(err);
      if (isText) file.isText = true;
      resolve(file);
    });
  });
}

/**
 * Tests if file content is valid JSON
 * @param {object} Vinyl file
 * @returns {boolean}
 * @private
 */

function isJSON (file) {
  try {
    JSON.parse(file.contents.toString());
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Parse text files for YAML and Markdown, render to HTML and wrap in JSON
 * @param {Vinyl} file - Vinyl file object
 * @returns {Promise.<Vinyl>}
 * @private
 */

function toJSON (file, config) {
  if (Path.extname(file.path) === '.json') {
    if (!isJSON(file)) file.isInvalid = true;
    return Promise.resolve(file);
  }

  let jsonFile = file.clone();

  return Promise.resolve(file)
    // parse YAML
    .then(file => {
      try {
        let parsed = frontmatter(file.contents.toString());
        return Promise.resolve(parsed);
      } catch (err) {
        return Promise.reject(err);
      }
    // parse and render Markdown
    }).then(parsed => {
      try {
        let data = parsed.attributes;
        data.body = config.renderer.call(config.context, parsed.body);
        return Promise.resolve(data);
      } catch (err) {
        return Promise.reject(err);
      }
    // optional transforms and output
    }).then(data => {
      if (!data.title) {
        let extracted = extractTitle(data.body, config.stripTitle);
        if (typeof extracted === 'object') data = assign(data, extracted);
      }

      data.updatedAt = file.stat.mtime.toISOString();

      if (config.transform) var transformedData = config.transform(data, file);

      jsonFile.extname = '.json';
      jsonFile.contents = new Buffer(JSON.stringify(transformedData || data));

      return Promise.resolve(jsonFile);
    });
}

/**
 * PluginError wrapper
 * @param {String} Error message
 * @returns {PluginError}
 * @private
 */

function pluginError (message) {
  return new PluginError(NAME, message);
}
