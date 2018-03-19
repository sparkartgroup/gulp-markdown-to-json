'use strict';

const assign = require('lodash.assign');
const expect = require('expect');
const fs = require('fs');
const gutil = require('gulp-util');
const ListStream = require('list-stream');
const Lab = require('lab');
const Path = require('path');
const PluginError = require('gulp-util').PluginError;
const vfs = require('vinyl-fs');
const Vinyl = require('vinyl');

const lab = exports.lab = Lab.script();
const markdown = require('./plugin');

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

const fixturePath = Path.join(process.cwd(), 'test_fixtures');
const fixtureGlob = Path.join(fixturePath, '**', '*');

const fixtureVinyl = {
  path: 'fixture.md',
  stat: fs.statSync(Path.join(fixturePath, 'blog', 'blog.md'))
};

const fixtureConfig = {
  frontmatter: { contents: new Buffer('---\ntitle: lipsum ipsum\n---\n*"dipsum"*') },
  atxHeading: { contents: new Buffer('# Titulus\n*"tipsum"*') },
  setextHeading: { contents: new Buffer('Titulus\n=======\n*"tipsum"*') },
  untitled: { contents: new Buffer('*tipsum dipsum*') },
  multipleTitles: { contents: new Buffer('---\ntitle: lipsum ipsum\n---\n# Titulus\n*"tipsum"*') },
  multipleH1: { contents: new Buffer('# lipsum ipsum\n\n# Titulus tipsum') },
  invalidYAML: { contents: new Buffer('---\ntitle: "lipsum "fragor" ipsum"\n---\n*"dipsum"*') },
  json: { contents: new Buffer('"{ \\"title\\": \\"ipsum blog\\", \\"description\\": \\"Typewriter put a bird on it\\" }"') },
  invalidJSON: { contents: new Buffer('"{ \\"title\\"') }
};

Object.keys(fixtureConfig).forEach(key => {
  fixtureConfig[key] = assign(fixtureConfig[key], fixtureVinyl);
});

fixtureConfig.invalidJSON.path = 'invalid.json';

Object.keys(testConfigs).forEach(configName => {
  lab.experiment(`Markdown and YAML parsing (${configName})`, () => {
    var config;

    lab.beforeEach(done => {
      config = testConfigs[configName];
      done();
    });

    lab.test('parses Markdown content and returns markup wrapped in JSON', function (done) {
      const fixture = new Vinyl(fixtureConfig.frontmatter);

      markdown(config)
        .on('data', file => {
          expect(file.extname).toEqual('.json');
          expect(JSON.parse(file.contents.toString()).body).toInclude('<p>');
          done();
        })
        .write(fixture);
    });

    lab.test('parses YAML front matter and merges keys', done => {
      const fixture = new Vinyl(fixtureConfig.frontmatter);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.title);
          done();
        })
        .write(fixture);
    });

    lab.test('includes file modified date (as updatedAt)', done => {
      const fixture = new Vinyl(fixtureConfig.frontmatter);

      markdown(config)
        .on('data', file => {
          const json = JSON.parse(file.contents.toString());
          expect(json.updatedAt).toEqual(fixtureVinyl.stat.mtime.toISOString());
          done();
        })
        .write(fixture);
    });

    lab.test('stream emits a PluginError with details from front-matter/js-yaml if YAML is invalid', done => {
      const fixture = new Vinyl(fixtureConfig.invalidYAML);

      markdown(config)
        .on('error', err => {
          expect(err instanceof PluginError).toBe(true);
          expect(err.name).toEqual('YAMLException');
          expect(err.stack).toInclude('line 2');
          done();
        })
        .write(fixture);
    });
  });
});

lab.experiment('Arguments API', () => {
  var config;

  lab.beforeEach(done => {
    config = testConfigs.marked;
    done();
  });

  lab.test('rename consolidated file', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config, 'blog.json'))
      .on('data', file => {
        if (Path.extname(file.path) === '.json') expect(Path.basename(file.path)).toEqual('blog.json');
      })
      .on('finish', done);
  });

  lab.test('pass a transform function', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config, 'blog.json', (data, file) => {
        data.test = true;
        return data;
      }))
      .on('data', file => {
        if (Path.extname(file.path) === '.json') {
          expect(JSON.parse(file.contents.toString()).blog.blog.test).toEqual(true);
          expect(Path.basename(file.path)).toEqual('blog.json');
        }
      })
      .on('finish', done);
  });

  lab.test('optional consolidated file rename', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config, (data, file) => {
        data.test = true;
        return data;
      }))
      .on('data', file => {
        if (file.basename === 'content.json') {
          expect(JSON.parse(file.contents.toString()).blog.blog.test).toEqual(true);
          expect(Path.basename(file.path)).toEqual('content.json');
        }
      })
      .on('finish', done);
  });
});

lab.experiment('Title extraction', () => {
  var config;

  lab.beforeEach(done => {
    config = testConfigs.marked;
    done();
  });

  lab.test('does nothing if no h1 is found', done => {
    const fixture = new Vinyl(fixtureConfig.untitled);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json).toExcludeKey('title');
        done();
      })
      .write(fixture);
  });

  lab.test('extracts a title from the first atx-style h1', done => {
    const fixture = new Vinyl(fixtureConfig.atxHeading);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('extracts a title from the first setext-style h1', done => {
    const fixture = new Vinyl(fixtureConfig.setextHeading);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('Titulus');
        done();
      })
      .write(fixture);
  });

  lab.test('uses the first h1 found', done => {
    const fixture = new Vinyl(fixtureConfig.multipleH1);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('lipsum ipsum');
        done();
      })
      .write(fixture);
  });

  lab.test('prefers YAML front matter titles over an extracted Markdown h1', done => {
    const fixture = new Vinyl(fixtureConfig.multipleTitles);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('lipsum ipsum');
        done();
      })
      .write(fixture);
  });
});

lab.experiment('Title stripping', () => {
  var config;

  lab.beforeEach(done => {
    config = {
      renderer: testConfigs.marked,
      stripTitle: true
    };
    done();
  });

  lab.test('does nothing if stripTitle option is unspecified', done => {
    const fixture = new Vinyl(fixtureConfig.atxHeading);

    markdown(testConfigs.marked)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.body).toInclude('<h1 id="titulus">Titulus</h1>');
        done();
      })
      .write(fixture);
  });

  lab.test('strips the first h1 found', done => {
    const fixture = new Vinyl(fixtureConfig.multipleH1);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('lipsum ipsum');
        expect(json.body).toExclude('<h1 id="lipsum-ipsum">lipsum ipsum</h1>');
        done();
      })
      .write(fixture);
  });

  lab.test('does not strip title if YAML-specified title is used', done => {
    const fixture = new Vinyl(fixtureConfig.multipleTitles);

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
      renderer: testConfigs.marked,
      transform: (data, file) => {
        delete data.body;
        data.path = file.path;
        return data;
      }
    };
    done();
  });

  lab.test('output file uses object returned by transform function', done => {
    const fixture = new Vinyl(fixtureConfig.frontmatter);

    markdown(config)
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(json.title).toEqual('lipsum ipsum');
        expect(json.body).toNotExist();
        expect(json.path).toExist();
        done();
      })
      .write(fixture);
  });

  lab.test('consolidated output file uses objects returned by transform function', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config))
      .on('data', file => {
        if (Path.extname(file.path) !== '.json') return;

        const json = JSON.parse(file.contents.toString());
        expect(json.blog.posts['bushwick-artisan'].body).toNotExist();
        expect(json.blog.posts['bushwick-artisan'].path).toExist();
      })
      .on('finish', done);
  });
});

lab.experiment('Output', () => {
  var config;

  lab.beforeEach(done => {
    config = config = testConfigs.marked;
    done();
  });

  lab.test('returns JSON for all Markdown in a specified directory structure', done => {
    vfs.src(fixtureGlob)
      .pipe(markdown(config))
      .pipe(ListStream.obj())
      .on('data', files => {
        const jsonFiles = files.filter(file => Path.extname(file.path) === '.json');
        expect(jsonFiles.length).toEqual(5);
      })
      .on('finish', done);
  });

  lab.test('passthrough existing JSON files', done => {
    vfs.src(fixtureGlob)
      .pipe(markdown(config))
      .pipe(ListStream.obj())
      .on('data', files => {
        const jsonFiles = files.filter(file => Path.basename(file.path) === 'site.json');
        expect(jsonFiles.length).toEqual(1);
      })
      .on('finish', done);
  });

  lab.test('skip and flag invalid JSON files', done => {
    const json = new Vinyl(fixtureConfig.json);
    const invalidJSON = new Vinyl(fixtureConfig.invalidJSON);

    markdown(config)
      .on('data', file => {
        expect(Path.basename(file.path)).toEqual('content.json');
      })
      .on('error', err => {
        expect(err instanceof PluginError).toBe(true);
        expect(err.message).toEqual('invalid.json is not valid JSON');
        done();
      })
      .write([json, invalidJSON]);
  });

  lab.test('consolidated output and single file, concurrently', () => {
    return Promise.all([
      new Promise((resolve, reject) => {
        vfs.src(fixtureGlob)
          .pipe(ListStream.obj())
          .pipe(markdown(config))
          .on('data', file => {
              expect(file.basename).toEqual('content.json');
              expect(JSON.parse(file.contents.toString()).blog.posts['oakland-activist'].body).toExist();
          })
          .on('error', reject)
          .on('finish', resolve);
      }),
      new Promise((resolve, reject) => {
        vfs.src(fixtureGlob)
          .pipe(markdown(config, (data, file) => {
            delete data.body;
            return data;
          }))
          .pipe(ListStream.obj())
          .on('data', files => {
            const jsonFiles = files.filter(file => Path.extname(file.path) === '.json');
            expect(jsonFiles.length).toEqual(5);
          })
          .on('finish', resolve);
      })
    ]);
  });
});

lab.experiment('Consolidated Output', () => {
  var config;

  lab.beforeEach(done => {
    config = config = testConfigs.marked;
    done();
  });

  lab.test('consolidates output into a single file if buffered with gulp-util', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config))
      .pipe(ListStream.obj())
      .on('data', files => {
        const jsonFiles = files.filter(file => Path.extname(file.path) === '.json');
        expect(jsonFiles.length).toEqual(1);
      })
      .on('finish', done);
  });

  lab.test('allows consolidated file to be renamed', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config, 'blog.json'))
      .on('data', file => {
        if (Path.extname(file.path) === '.json') expect(Path.basename(file.path)).toEqual('blog.json');
      })
      .on('finish', done);
  });

  lab.test('represents the directory structure as a nested object', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config))
      .on('data', file => {
        if (file && file.basename === 'content.json') {
          const json = JSON.parse(file.contents.toString());
          expect(json.blog.posts['oakland-activist']).toExist();
        }
      })
      .on('finish', done);
  });

  lab.test('deeply sorts the directory structure alphabetically', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config))
      .on('data', file => {
        const json = JSON.parse(file.contents.toString());
        expect(Object.keys(json.blog)).toEqual(['blog', 'posts', 'site']);
        expect(Object.keys(json.blog.posts)).toEqual(['bushwick-artisan', 'index', 'oakland-activist']);
      })
      .on('finish', done);
  });

  lab.test('merges files named "index" with parent directories in consolidated output', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown({
        renderer: testConfigs.marked,
        flattenIndex: true
      }))
      .on('data', file => {
        if (file && file.basename === 'content.json') {
          const json = JSON.parse(file.contents.toString());
          expect(json.blog.posts.title).toEqual('Archive');
          expect(json.blog.posts['oakland-activist']).toExist();
        }
      })
      .on('finish', done);
  });

  lab.test('merges like-named files with parent directories in consolidated output', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown({
        renderer: testConfigs.marked,
        flattenIndex: true
      }))
      .on('data', file => {
        if (file && file.basename === 'content.json') {
          const json = JSON.parse(file.contents.toString());
          expect(json.blog.title).toExist();
          expect(json.blog.posts['oakland-activist']);
        }
      })
      .on('finish', done);
  });

  lab.test('consolidated output includes passthrough JSON', done => {
    vfs.src(fixtureGlob)
      .pipe(ListStream.obj())
      .pipe(markdown(config))
      .on('data', file => {
        if (file && file.basename === 'content.json') {
          const json = JSON.parse(file.contents.toString());
          expect(json.blog.site.title).toExist();
        }
      })
      .on('finish', done);
  });
});
