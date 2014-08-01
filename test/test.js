var assert = require('assert');
var fs = require('vinyl-fs');
var gutil = require('gulp-util');
var path = require('path');
var util = require('util');

var markdown = require('../index');
var fixture_content = new Buffer('---\ntitle: lipsum ipsum\n---\n*dipsum*');

describe('parser', function(){

  it('should parse Markdown content and return markup wrapped in JSON', function( done ){
    var fixture = new gutil.File({
      path: 'fixture.md',
      contents: fixture_content
    });

    markdown()
      .on('data', function( file ){
        assert(JSON.parse(file.contents.toString()));
        done();
      })
      .write(fixture);
  });

  it('should parse YAML front matter and merge keys', function( done ){
    var fixture = new gutil.File({
      path: 'fixture.md',
      contents: fixture_content
    });

    markdown()
      .on('data', function( file ){
        var json = JSON.parse(file.contents.toString());
        assert(json.title);
        done();
      })
      .write(fixture);
  });

});
