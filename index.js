var gutil = require('gulp-util');
var extend = require('util-extend');
var sort = require('sort-object');
var through = require('through2');
var util = require('util');

var expand = require('expand-hash');
var frontmatter = require('front-matter');
var marked = require('marked');

var NAME = 'gulp-markdown-to-json';
var PluginError = gutil.PluginError;
var streamingErr = new PluginError(NAME, 'Streaming not supported');

function parse( file, flatten ){
  if( file.isNull() ) return;
  if( file.isStream() ) return this.emit('error', streamingErr);

  if( file.isBuffer() ){
    var path = file.relative.split('.').shift().replace(/\//g, '.');
    var parsed = frontmatter(file.contents.toString());

    var body = parsed.body.split(/\n/);
    var markup = marked(parsed.body).split(/\n/);

    var title = markup[0].substr(0,3) === '<h1'
      ? body[0]
      : false;

    var data = {};
    data[path] = parsed.attributes;

    if( title && !data[path].title ){
      data[path].title = (title.substr(0,1) === '#')
        ? title.substr(2)
        : title;
      data[path].body = markup.slice(1).join(' ');
    } else {
      data[path].body = marked(parsed.body);
    }

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
    var file;

    if( util.isArray(input) ){
      var data = {};

      input.forEach(function( file ){
        var file_data = JSON.parse( parse(file).contents.toString() );

        data = extend(file_data, data);
      });

      var tree = sort(expand(data));
      var json = JSON.stringify(tree);

      var name = config && typeof config === 'string'
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
    callback();
  });

  return stream;
};