var gutil = require('gulp-util');
var extend = require('util-extend');
var sort = require('sort-object');
var through = require('through2');
var util = require('util');

var expand = require('expand-hash');
var frontmatter = require('front-matter');
var marked = require('marked');

const NAME = 'gulp-markdown-to-json';
var PluginError = gutil.PluginError;
var streamingErr = new PluginError(NAME, 'Streaming not supported');

function parse( file, flatten ){
  if( file.isNull() ) return;
  if( file.isStream() ) return this.emit('error', streamingErr);

  if( file.isBuffer() ){
    var path = file.relative.split('.').shift().replace(/\//g, '.');
    var parsed = frontmatter(file.contents.toString());

    var data = {};
    data[path] = parsed.attributes;
    data[path].body = marked(parsed.body);

    if( flatten ) data = data[path];

    file.path = gutil.replaceExtension(file.path, '.json');
    file.contents = new Buffer( JSON.stringify(data) );

    return file;
  }
}

module.exports = function( config, marked_options ){
  var options = config && marked_options
    ? marked_options
    : config;

  marked.setOptions(options);

  var stream = through.obj(function( input, enc, callback ){
    if( util.isArray(input) ){
      var data = {};

      input.forEach(function( file ){
        var file_data = JSON.parse( parse(file).contents.toString() );

        data = extend(file_data, data);
      });

      var tree = sort(expand(data));
      var json = JSON.stringify(tree);
      var name = (config && typeof config === 'string') || 'content.json';

      var file = new gutil.File({
        base: '/',
        cwd: '/',
        path: '/' + name,
        contents: new Buffer(json)
      });
    }

    if( !util.isArray(input) ) var file = parse(input, true);

    this.push(file);
    callback();
  });

  return stream;
};