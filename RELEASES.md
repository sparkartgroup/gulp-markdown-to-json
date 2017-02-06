# Release Notes

## [v1.0.3]

> February 6, 2017

- Use strict mode to maintain node 4.x support (usage of let)

## [v1.0.2]

> February 6, 2017

- [#19] Fixes issues related to plugin config cached with the module
- Clones Vinyl files before manipulation, to avoid mutation

## [v1.0.1]

> September 14, 2016

- [#16] Deeply sort path keys in consolidated output

## [v1.0.0]

> August 25, 2016

**Breaking:** this plugin is no longer a wrapper, parsing and rendering is left to the user. Bring Your Own Markdown! The plugin will focus on the JSON output.

Other updates:

- [#13] Parser errors are caught and emitted to the stream
- [#11] Extracted titles no longer removed automatically. Opt-in with `stripTitles: true`
- [#10] New title extraction method does not affect newlines
- [#6], [#9] Add optional transform function for changing JSON data
- [#7] Add config option to unwrap files named `index` or the same as parent dirs (consolidated output only)
- Add `updatedAt` to output, the file modified time from fs.Stat, as an ISO 8601 string

## [v0.4.0]

> Released August 4, 2016

Drops node 0.x support, the latest or LTS (v4.x.x) version of Node.js is now required.

## [v0.3.0]

> Released August 3, 2016

_Hey!! There's a guy coming out of the cave!_

- [#5] Fixes Windows support thanks to @danrouse

## [v0.2.0]

> Released August 18, 2014

_Pre-release_

[#19]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/19
[#16]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/16
[#13]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/13
[#11]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/11
[#10]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/10
[#6]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/6
[#7]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/7
[#9]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/9
[#5]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/5

[v1.0.3]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v1.0.1...v1.0.3
[v1.0.2]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v0.4.0...v1.0.0
[v0.4.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v0.3.0...v0.4.0
[v0.3.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/4dc86c3...v0.2.1
