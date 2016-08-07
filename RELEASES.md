# Release Notes

## [v1.0.0]

> Unreleased

**Breaking:** this plugin is no longer a wrapper, parsing and rendering is left to the user. Bring Your Own Markdown! The plugin will focus on the JSON output. The latest or LTS (v0.4.x) version of Node.js is now required.

Other updates:

- [#11] Extracted titles no longer removed automatically. Opt-in with `stripTitles: true`.
- [#10] New title extraction method does not affect newlines

[#11]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/11
[#10]: https://github.com/sparkartgroup/gulp-markdown-to-json/issues/10
[v1.0.0]: https://github.com/sparkartgroup/gulp-markdown-to-json/compare/v0.4.0...v1.0.0
