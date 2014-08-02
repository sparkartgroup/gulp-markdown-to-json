var assert = require('assert');
var fs = require('vinyl-fs');
var gutil = require('gulp-util');
var path = require('path');
var util = require('util');
var Readable = require('stream').Readable;

var markdown = require('../index');

var fixture_path = './test/fixtures/**/*.md';
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

describe('tree', function(){

  it('should return JSON for all Markdown in a specified directory structure', function( done ){
    fs.src(fixture_path)
      .pipe(markdown())
      .on('data', function( file ){
        assert(JSON.parse(file.contents.toString()));
      })
      .on('finish', done);
  });

  it('should consolidate output into a single file if buffered with gulp-util', function( done ){
    var stream = fs.src(fixture_path)
      .pipe(gutil.buffer())
      .pipe(markdown());

    stream.on('finish', function(){
      assert.equal(stream._readableState.length, 1);
      assert.equal(stream._readableState.buffer[0].path, '/content.json');
      done();
    });
  });

});