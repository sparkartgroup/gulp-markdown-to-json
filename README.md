[gulp](http://gulpjs.com)-markdown-to-json
==========================================

[![CircleCI Status][circleci-badge]][circleci]
[![Semistandard Style][semistandard-badge]][semistandard]

> Parse Markdown + YAML, compile Markdown to HTML, wrap it in JSON.

The neutral format of JSON opens new possibilities for your handcrafted content. Send it onward to other plugins such as [gulp-hb][hb]. When their powers combine, you get a static site generator! Pipe to [request][request] to send it to a [search index][algolia] or [import into a CMS][contentful]. Write a plugin to [tap into the stream][plugin] if you need a client library.

Table of Contents
-----------------

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

Install
-------

```bash
npm install gulp-markdown-to-json --save-dev
```

### Dependencies

This plugin does not bundle any Markdown parser to keep your options open. BYOM!

Pick one of these or write a new parser for fun!

- [commonmark.js][commonmark.js]
- [markdown-js][markdown-js]
- [markdown-it][markdown-it] ← the best
- [marked][marked]
- [remark][remark]
- [remarkable][remarkable]

Install, configure, and pass a rendering method to this plugin with a source string as its first argument. Output goes straight into the JSON file’s `body` property. If your parser requires instantiation pass a context to call it with by defining `context` in the config object. If yet more hoop jumping is required, write a wrapper function such as this example for remark:

```js
function render (string) {
  const remark = require('remark');
  const html = require('remark-html');
  return remark().use(html).process(string).toString();
}
```

> **Note:**
> YAML frontmatter blocks are stripped and handled before Markdown rendering with [front-matter][front-matter]

Usage
-----

**`/gulpfile.js`**

```javascript
const gulp = require('gulp');
const markdownToJSON = require('gulp-markdown-to-json');
const marked = require('marked');

marked.setOptions({
  pedantic: true,
  smartypants: true
});

gulp.task('markdown', () => {
  gulp.src('./content/**/*.md')
    .pipe(markdownToJSON(marked))
    .pipe(gulp.dest('.'))
});
```

Transformed source files flow onward to the destination of your choice with directory structure preserved. Any valid JSON files matched by your `gulp.src` glob passthrough.

**`/blog/posts/bushwick-artisan.md`**

```md
---
slug: bushwick-artisan
title: Wes Anderson pop-up Bushwick artisan
layout: centered
---

## YOLO
Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.
```

**`/blog/posts/bushwick-artisan.json`**

```json
{
  "slug": "bushwick-artisan",
  "title": "Wes Anderson pop-up Bushwick artisan",
  "layout": "centered",
  "body": "<h2 id=\"yolo\">YOLO</h2>\n<p>Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.</p>",
  "updatedAt": "1970-01-01T00:00:00Z"
}
```

### Consolidated Output

Gather Markdown files before piping with [list-stream][] to combine output into a single JSON file. Directory structure is preserved and represented as nested JSON for iteration with [Handlebars.js][handlebars-iterate] and friends. This is handy for navigation and other global content. Valid JSON files are included in the object if matched by your `gulp.src` glob.

The consolidated file is named **`content.json`** by default and optionally renamed.

```javascript
const gulp = require('gulp');
const ListStream = require('list-stream');
const markdownToJSON = require('gulp-markdown-to-json');
const marked = require('marked');

gulp.task('markdown', () => {
  gulp.src('./content/**/*.md')
    .pipe(ListStream.obj())
    .pipe(markdownToJSON(marked, 'blog.json'))
    .pipe(gulp.dest('.'))
});
```

**`blog.json`**

```json
{
  "blog": {
    "blog": {
      "title": "ipsum dipsum",
      "body": "<p>From west to \"east\"!</p>",
      "updatedAt": "1970-01-01T00:00:00Z"
    },
    "posts": {
      "bushwick-artisan": {
        "slug": "bushwick-artisan",
        "title": "Wes Anderson pop-up Bushwick artisan", 
        "layout": "centered",
        "body": "<h2 id=\"yolo\">YOLO</h2>\n<p>Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.</p>",
        "updatedAt": "1970-01-01T00:00:00Z"
      }
    }
  },
  "mission": {
    ...
  }
}
```

Specify `flattenIndex: true` in the config object to unwrap home page/index-style content and merge it into the parent object. Name these files `index` or the same as a parent directory.

```json
{
  "blog": {
    "title": "ipsum dipsum",
    "body": "<p>From west to \"east\"!</p>",
    "updatedAt": "1970-01-01T00:00:00Z",
    "posts": {
      ...
    }
  },
  "mission": {
    ...
  }
}
```

This avoids redundant-feeling `blog.blog` scenarios when iterating and selecting from this content.

### Title Extraction and Stripping

Define titles as `title` in the YAML frontmatter. Text of the first `<h1>` is assigned to `title` automatically if this is not specified.

Specify `stripTitle: true` in the config object to remove the first `<h1>` from the body. Use this if you are displaying the title outside of the body, in a page header for example.

**`/blog/posts/bushwick-artisan.md`**

```md
Wes Anderson pop-up Bushwick artisan
====================================

## YOLO
Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.
```

**`/blog/posts/bushwick-artisan.json`**

```json
{
  "title": "Wes Anderson pop-up Bushwick artisan", 
  "body": "<h2 id=\"yolo\">YOLO</h2>\n<p>Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.</p>",
  "updatedAt": "1970-01-01T00:00:00Z"
}
```

### Transforms

To change or add to the JSON data for each file, specify a transform function and return your desired object. This function is passed the default data and the [Vinyl file object][vinyl] for the source file.

For example:

```js
gulp.src('./content/**/*.md')
  .pipe(ListStream.obj())
  .pipe(markdownToJSON(marked, 'blog.json', (data, file) => {
    delete data.body;
    data.path = file.path;
    return data;
  }))
  .pipe(gulp.dest('.'))
```

API
---

### `markdownToJSON((renderer: Function, name?: String, transform?: Function) | config: Object) => TransformStream`

`config`

- `renderer` `Function` accepts Markdown source string, returns an escaped HTML string. **Required**
- `context` `Object` to use when calling `renderer`
- `name` `String` to rename consolidated output file, if using. Default: `content.json`
- `flattenIndex` `Boolean` unwrap files named `index` or after parent dirs in consolidated output. Default: `false`
- `stripTitle` `Boolean` strips the first `<h1>` from body, if extracted as title. Default: `false`
- `transform` `Function` to access and change the JSON data for each file before outputting

Contribute
----------

Pull requests accepted!

License
-------

**[MIT](LICENSE)**  
Copyright &copy; 2017 Sparkart Group, Inc.

[circleci]: https://circleci.com/gh/sparkartgroup/gulp-markdown-to-json
[circleci-badge]: https://circleci.com/gh/sparkartgroup/gulp-markdown-to-json.png?style=shield&circle-token=8bf33da398b8ab296fe670c81b3fecbae1471e25

[semistandard]: https://github.com/Flet/semistandard
[semistandard-badge]: https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat

[marked]: https://github.com/chjj/marked
[markdown-js]: https://github.com/evilstreak/markdown-js
[remarkable]: https://github.com/jonschlinkert/remarkable
[markdown-it]: https://github.com/markdown-it/markdown-it
[remark]: https://github.com/wooorm/remark
[commonmark.js]: https://github.com/jgm/commonmark.js
[front-matter]: https://github.com/jxson/front-matter

[hb]: https://github.com/shannonmoeller/gulp-hb
[request]: https://github.com/request/request
[algolia]: https://www.algolia.com/
[contentful]: https://www.contentful.com
[plugin]: https://git.io/v6t5d

[list-stream]: https://github.com/rvagg/list-stream
[handlebars-iterate]: http://handlebarsjs.com/#iteration

[vinyl]: https://github.com/gulpjs/vinyl
