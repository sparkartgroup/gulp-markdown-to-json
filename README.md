# [gulp](http://gulpjs.com)-markdown-to-json ![CircleCI Status][circleci]

 - Parse YAML front matter and Markdown body content with [front-matter][front-matter]
 - Compile Markdown to HTML with [marked][marked]
 - Wrap it all up in JSON — goes great with [Handlebars.js][handlebars] and [solidus][solidus]


install :traffic_light:
-------

```bash
$ npm install gulp-markdown-to-json --save-dev
```

pipe :neckbeard:
----

Like any self-respecting gulp plugin, transformed source files will flow onward to the destination of your choice with directory structure preserved. Tinker with [marked’s config][marked-config] by passing an object.

**`/gulpfile.js`**

```javascript
var gulp = require('gulp');
var markdown = require('gulp-markdown-to-json');
    gulp.task('markdown', function(){
      gulp.src('./content/**/*.md')
        .pipe(markdown({
            pedantic: true,
            smartypants: true
        }))
        .pipe(gulp.dest('.'))
});
```

**`/blog/posts/bushwick-artisan.md`**

    slug: bushwick-artisan
    title: Wes Anderson pop-up Bushwick artisan
    layout: centered
    ---

    ## YOLO
    Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.

**`/blog/posts/bushwick-artisan.json`**

```json
{
    "slug": "bushwick-artisan",
    "title": "Wes Anderson pop-up Bushwick artisan", 
    "layout": "centered",
    "body": "<h2 id="yolo">YOLO</h2>\n<p>Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.</p>"
}
```


### single file style

Gather up the Markdown files beforehand with the [gulp-util buffer method][gulp-util] and the JSON will be output into a single file. This is especially handy for working with templates. Directory structure is preserved and represented as nested JSON that’s easy to iterate with [Handlebars.js][handlebars-iterate] and friends.

The output file is named **`content.json`** by default and optionally renamed:

```javascript
var gulp = require('gulp');
var gutil = require('gulp-util');
var markdown = require('gulp-markdown-to-json');

gulp.task('markdown', function(){
  gulp.src('./content/**/*.md')
    .pipe(gutil.buffer())
    .pipe(markdown('blog.json'))
    .pipe(gulp.dest('.'))
});
```

**`blog.json`**

```json
{
    "blog": {
        "posts": {
            "bushwick-artisan": {
                "slug": "bushwick-artisan",
                "title": "Wes Anderson pop-up Bushwick artisan", 
                "layout": "centered",
                "body": "<h2 id="yolo">YOLO</h2>\n<p>Chia quinoa meh, you probably haven't heard of them sartorial Holowaychuk pickled post-ironic. Plaid ugh vegan, Sixpoint 8-bit sartorial artisan semiotics put a bird on it Mission bicycle rights Club-Mate vinyl.</p>"
            }
        },
        "mission": {
            ...
        }
    }
}
```

----
**[MIT](LICENSE) LICENSE** <br>
copyright &copy; 2014 sparkart group, inc.


[gulp-util]: https://github.com/gulpjs/gulp-util#buffercb
[front-matter]: https://github.com/jxson/front-matter
[marked]: https://github.com/chjj/marked
[marked-config]: https://github.com/chjj/marked#options-1
[handlebars]: https://github.com/wycats/handlebars.js
[handlebars-iterate]: http://handlebarsjs.com/#iteration
[solidus]: https://github.com/solidusjs
[circleci]: https://circleci.com/gh/SparkartGroupInc/gulp-markdown-to-json.png?style=shield&circle-token=8bf33da398b8ab296fe670c81b3fecbae1471e25