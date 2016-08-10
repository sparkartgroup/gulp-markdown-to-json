# Release Notes

## [v1.0.0]

> Unreleased

**Breaking:** this plugin is no longer a wrapper, parsing and rendering is left to the user. Bring Your Own Markdown! The plugin will focus on the JSON output. The latest or LTS (v0.4.x) version of Node.js is now required.

Other updates:

- [#13] Parser errors are caught and emitted to the stream
- [#11] Extracted titles no longer removed automatically. Opt-in with `stripTitles: true`
- [#10] New title extraction method does not affect newlines
- [#6, #9] Add optional transform function for changing JSON data
- [#7] Add config option to unwrap files named `index` or the same as parent dirs (consolidated output only)

[#13]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/13
[#11]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/11
[#10]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/10
[#6]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/6
[#7]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/7
[#9]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/9
[v1.0.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v0.4.0...v1.0.0
