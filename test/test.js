const expect = require('expect');
const vfs = require('vinyl-fs');
const gutil = require('gulp-util');
const Lab = require('lab');
const Path = require('path');

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

const fixtureConfig = {
  frontmatter: {
    path: 'fixture.md',
    contents: new Buffer('---\ntitle: lipsum ipsum\n---\n*"dipsum"*')
  },
  atxHeading: {
    path: 'fixture.md',
    contents: new Buffer('# Titulus\n*"tipsum"*')
  },
  setextHeading: {
    path: 'fixture.md',
    contents: new Buffer('Titulus\n=======\n*"tipsum"*')
  },
  untitled: {
    path: 'fixture.md',
    contents: new Buffer('*tipsum dipsum*')
  },
  multipleTitles: {
    path: 'fixture.md',
    contents: new Buffer('---\ntitle: lipsum ipsum\n---\n# Titulus\n*"tipsum"*')
  },
  multipleH1: {
    path: 'fixture.md',
    contents: new Buffer('# lipsum ipsum\n\n# Titulus tipsum')
  }
};

Object.keys(testConfigs).forEach(configName => {
  lab.experiment(`Markdown and YAML parsing (${configName})`, () => {
    var config;

    lab.beforeEach(done => {
      config = testConfigs[configName];
      done();
    });

    lab.test('parses Markdown content and returns markup wrapped in JSON', function (done) {
      const fixture = new gutil.File(fixtureConfig.frontmatter);

      markdown(config)
        .on('data', file => {
          expect(JSON.parse(file.contents.toString()).body).toInclude('<p>');
          done();
        })
        .write(fixture);
    });

    lab.test('parses YAML front matter and merges keys', done => {
      const fixture = new gutil.File(fixtureConfig.frontmatter);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title);
          done();
        })
        .write(fixture);
    });
  });
});

lab.experiment('Arguments API', () => {
  var config;

  lab.beforeEach(done => {
    config = testConfigs['marked'];
    done();
  });

  lab.test('rename consolidated output file', done => {
    vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config, 'blog.json'))
      .on('data', file => expect(Path.basename(file.path)).toEqual('blog.json'))
      .on('finish', done);
  });

  lab.test('pass a transform function', done => {
    vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config, 'blog.json', (data, file) => {
        data.test = true;
        return data;
      }))
      .on('data', file => {
        expect(JSON.parse(file.contents.toString()).blog.blog.test).toEqual(true)
        expect(Path.basename(file.path)).toEqual('blog.json')
      })
      .on('finish', done);
  });

  lab.test('optional filename', done => {
    vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config, (data, file) => {
        data.test = true;
        return data;
      }))
      .on('data', file => {
        expect(JSON.parse(file.contents.toString()).blog.blog.test).toEqual(true)
        expect(Path.basename(file.path)).toEqual('content.json')
      })
      .on('finish', done);
  });
});

lab.experiment('Title extraction', () => {
  var config;

  lab.beforeEach(done => {
    config = testConfigs['marked'];
    done();
  });

  lab.test('does nothing if no h1 is found', done => {
    const fixture = new gutil.File(fixtureConfig.untitled);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json).toExcludeKey('title');
        done();
      })
      .write(fixture);
  });

  lab.test('extracts a title from the first atx-style h1', done => {
    const fixture = new gutil.File(fixtureConfig.atxHeading);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('extracts a title from the first setext-style h1', done => {
    const fixture = new gutil.File(fixtureConfig.setextHeading);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('uses the first h1 found', done => {
    const fixture = new gutil.File(fixtureConfig.multipleH1);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'lipsum ipsum');
        done();
      })
      .write(fixture);
  });

  lab.test('prefers YAML front matter titles over an extracted Markdown h1', done => {
    const fixture = new gutil.File(fixtureConfig.multipleTitles);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'lipsum ipsum');
        done();
      })
      .write(fixture);
  });
});

lab.experiment('Title stripping', () => {
  var config;

  lab.beforeEach(done => {
    config = {
      renderer: testConfigs['marked'],
      stripTitle: true
    };
    done();
  });

  lab.test('does nothing if stripTitle option is unspecified', done => {
    const fixture = new gutil.File(fixtureConfig.atxHeading);

    markdown(testConfigs['marked'])
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.body).toInclude('<h1 id="titulus">Titulus</h1>');
        done();
      })
      .write(fixture);
  });

  lab.test('strips the first h1 found', done => {
    const fixture = new gutil.File(fixtureConfig.multipleH1);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'lipsum ipsum');
        expect(json.body).toExclude('<h1 id="lipsum-ipsum">lipsum ipsum</h1>');
        done();
      })
      .write(fixture);
  });

  lab.test('does not strip title if YAML-specified title is used', done => {
    const fixture = new gutil.File(fixtureConfig.multipleTitles);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.body).toInclude('<h1 id="titulus">Titulus</h1>');
        done();
      })
      .write(fixture);
  });
});

lab.experiment('Transform function', () => {
  var config;

  lab.beforeEach(done => {
    config = {
      renderer: testConfigs['marked'],
      transform: (data, file) => {
        delete data.body;
        data.path = file.path;
        return data;
      }
    };
    done();
  });

  lab.test('output file uses object returned by transform function', done => {
    const fixture = new gutil.File(fixtureConfig.frontmatter);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title && json.title === 'lipsum ipsum');
        expect(json.body).toNotExist();
        expect(json.path).toExist();
        done();
      })
      .write(fixture);
  });

  lab.test('consolidated output file uses objects returned by transform function', done => {
    const stream = vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config));

    stream.on('data', file => {
      const json = JSON.parse(file.contents.toString());
      expect(json.blog.posts['bushwick-artisan'].body).toNotExist();
      expect(json.blog.posts['bushwick-artisan'].path).toExist();
      done();
    });
  });
});

lab.experiment('Output', () => {
  var config;

  lab.beforeEach(done => {
    config = config = testConfigs['marked'];
    done();
  });

  lab.test('returns JSON for all Markdown in a specified directory structure', done => {
    vfs.src(fixturePath)
      .pipe(markdown(config))
      .on('data', file => expect(JSON.parse(file.contents.toString())))
      .on('finish', done);
  });

  lab.test('consolidates output into a single file if buffered with gulp-util', done => {
    const stream = vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config));

    stream.on('finish', () => {
      expect(stream._readableState.length).toEqual(1);
      expect(stream._readableState.buffer[0].path).toEqual('/content.json');
      done();
    });
  });

  lab.test('allows consolidated file to be renamed', done => {
    vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config, 'blog.json'))
      .on('data', file => expect(Path.basename(file.path)).toEqual('blog.json'))
      .on('finish', done);
  });

  lab.test('represents the directory structure as a nested object', done => {
    vfs.src(fixturePath)
      .pipe(gutil.buffer())
      .pipe(markdown(config))
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.blog.posts['oakland-activist']);
      })
      .on('finish', done);
  });
});
