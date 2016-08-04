const expect = require('expect');
const fs = require('vinyl-fs');
const gutil = require('gulp-util');
const Lab = require('lab');

const lab = exports.lab = Lab.script();
const markdown = require('../index');

function commonmarkRender (string) {
  const commonmark = require('commonmark');
  const reader = new commonmark.Parser();
  const writer = new commonmark.HtmlRenderer();
  const parsed = reader.parse(string);
  return writer.render(parsed);
}

function remarkRender (string) {
  const remark = require('remark');
  const html = require('remark-html');
  return remark().use(html).process(string).toString();
}

const Remarkable = require('remarkable');
const MarkdownIt = require('markdown-it');

const remarkable = new Remarkable();
const markdownIt = new MarkdownIt();

const testConfigs = {
  'commonmark.js': commonmarkRender,
  'markdown-it': {
    renderer: markdownIt.render,
    context: markdownIt
  },
  'markdown-js': require('markdown').markdown.toHTML,
  'marked': require('marked'),
  'remark': remarkRender,
  'remarkable': {
    renderer: remarkable.render,
    context: remarkable
  }
};

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

Object.keys(testConfigs).forEach(configName => {
  lab.experiment(`Markdown and YAML parsing (${configName})`, () => {
    const config = testConfigs[configName];

    lab.test('should parse Markdown content and return markup wrapped in JSON', function (done) {
      const fixture = new gutil.File(fixtureConfig[0]);

      markdown(config)
        .on('data', file => {
          expect(JSON.parse(file.contents.toString()).body).toInclude('<p>');
          done();
        })
        .write(fixture);
    });

    lab.test('should parse YAML front matter and merge keys', done => {
      const fixture = new gutil.File(fixtureConfig[0]);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title);
          done();
        })
        .write(fixture);
    });

    lab.test('should extract a title if first line of Markdown is an atx-style h1', done => {
      const fixture = new gutil.File(fixtureConfig[1]);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title && json.title === 'Titulus');
          done();
        })
        .write(fixture);
    });

    lab.test('should extract a title if first line of Markdown is a setext-style h1', done => {
      const fixture = new gutil.File(fixtureConfig[2]);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title && json.title === 'Titulus');
          done();
        })
        .write(fixture);
    });

    lab.test('should prefer YAML front matter titles over a extracted Markdown h1', done => {
      const fixture = new gutil.File(fixtureConfig[3]);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title && json.title === 'lipsum ipsum');
          done();
        })
        .write(fixture);
    });
  });
});

lab.experiment('Output', () => {
  const config = testConfigs['marked'];

  lab.test('should return JSON for all Markdown in a specified directory structure', done => {
    fs.src(fixturePath)
      .pipe(markdown(config))
      .on('data', file => {
        expect(JSON.parse(file.contents.toString()));
      })
      .on('finish', done);
  });

  lab.test('should consolidate output into a single file if buffered with gulp-util', done => {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config));

    stream.on('finish', () => {
      expect(stream._readableState.length).toEqual(1);
      expect(stream._readableState.buffer[0].path).toEqual('/content.json');
      done();
    });
  });

  lab.test('should allow the single file to be renamed', done => {
    const stream = fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config, 'blog.json'));

    stream.on('finish', () => {
      expect(stream._readableState.buffer[0].path).toEqual('/blog.json');
      expect(stream._readableState.buffer[0].contents.toString()).toInclude('<h2');
      done();
    });
  });

  lab.test('should represent the directory structure as a nested object', done => {
    fs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config))
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.blog.posts['oakland-activist']);
      })
      .on('finish', done);
  });
});
