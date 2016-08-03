const expect = require('expect');
const fs = require('vinyl-fs');
const gutil = require('gulp-util');
const Lab = require('lab');

const lab = exports.lab = Lab.script();
const markdown = require('../index');

const fixturePath = './test/fixtures/**/*.md';

const fixtureConfig = [{
  path: 'fixture.md',
  contents: new Buffer('---\ntitle: lipsum ipsum\n---\n*"dipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('# Titulus\n*"tipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('Titulus\n=======\n*"tipsum"*')
}, {
  path: 'fixture.md',
  contents: new Buffer('---\ntitle: lipsum ipsum\n---\n# Titulus\n*"tipsum"*')
}];

lab.experiment('Markdown and YAML parsing', () => {
  lab.test('should parse Markdown content and return markup wrapped in JSON', done => {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown()
      .on('data', file => {
        expect(JSON.parse(file.contents.toString()));
        done();
      })
      .write(fixture);
  });

  lab.test('should pass on configuration objects to the marked module', done => {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown({
      smartypants: true
    })
    .on('data', file => {
      expect(file.contents.toString().match(/“/));
      done();
    })
    .write(fixture);
  });

  lab.test('should parse YAML front matter and merge keys', done => {
    const fixture = new gutil.File(fixtureConfig[0]);

    markdown()
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title);
        done();
      })
      .write(fixture);
  });

  lab.test('should extract a title if first line of Markdown is an atx-style h1', done => {
    const fixture = new gutil.File(fixtureConfig[1]);

    markdown()
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('should extract a title if first line of Markdown is a setext-style h1', done => {
    const fixture = new gutil.File(fixtureConfig[2]);

    markdown()
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('should prefer YAML front matter titles over a extracted Markdown h1', done => {
    const fixture = new gutil.File(fixtureConfig[3]);

    markdown()
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'lipsum ipsum');
        done();
      })
      .write(fixture);
  });
});

lab.experiment('Output', () => {
  lab.test('should return JSON for all Markdown in a specified directory structure', done => {
    fs.src(fixturePath)
      .pipe(markdown())
      .on('data', file => {
        expect(JSON.parse(file.contents.toString()));
      })
      .on('finish', done);
  });

  lab.test('should consolidate output into a single file if buffered with gulp-util', done => {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown());

    stream.on('finish', () => {
      expect(stream._readableState.length).toEqual(1);
      expect(stream._readableState.buffer[0].path).toEqual('/content.json');
      done();
    });
  });

  lab.test('should allow the single file to be renamed', done => {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown('blog.json', {
        smartypants: true
      }));

    stream.on('finish', () => {
      expect(stream._readableState.buffer[0].path).toEqual('/blog.json');
      expect(stream._readableState.buffer[0].contents.toString()).toInclude('“');
      done();
    });
  });

  lab.test('should represent the directory structure as a nested object', done => {
    fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown())
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.blog.posts['oakland-activist']);
      })
      .on('finish', done);
  });
});
