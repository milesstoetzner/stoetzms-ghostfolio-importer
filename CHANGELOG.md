# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Breaking

-   The `none` input and output provider is renamed to `internal`. `none` still works as an alias in this release and will be removed in a later one. (#15)
-   The built-in map of ISINs to Yahoo symbols is removed. Pass your own file with `--ghostfolio-map`; a starting point ships in `examples/ghostfolio-map.json`. (#12)
-   A PDF that cannot be parsed now fails the whole run instead of being skipped silently. `--ignore-errors` restores the old behaviour. (#10)
-   Node.js 22.13 or newer is required. (#2)

### Added

-   `--input-provider scalable-capital --input-format json` reads the export of the official Scalable CLI (`sc broker transactions --json`), so Scalable Capital no longer needs PDFs. (#21)
-   `--watch` runs the transform again whenever the input directory changes; with the endpoint format it requires `--sync`. `--watch-debounce` sets the quiet period. (#25)
-   `--sync` makes the endpoint import idempotent: activities carry a fingerprint in their comment, and only those missing in the account are created, so the same PDF twice creates one activity. Byte-identical PDFs in the input directory are read once. `--prune` additionally deletes activities the importer created earlier that are no longer in the inputs. `--ghostfolio-endpoint` now accepts the Ghostfolio URL; the import URL still works. (#24)
-   `--ignore-errors` to skip unreadable PDFs; skipped files are reported on stderr. (#10)
-   The `internal` output provider writes `json` and `yaml` files in addition to `console`. (#7)
-   Local development environment: Ghostfolio in Docker Compose (`yarn dev:up`), `yarn dev:user` for an account id and token, synthetic example PDFs in `examples/inputs`. (#13)
-   Unit tests (`yarn test`), type checking (`yarn typecheck`) and the build run in CI; Dependabot keeps dependencies current. (#3, #5, #8)

### Changed

-   Input and output providers are classes behind a registry; unknown providers and unsupported formats are reported with the list of valid values, and the help text lists providers with their formats. Ghostfolio `console` output now prints JSON on stdout like the internal provider, instead of a debug dump on stderr. (#23)
### Fixed

-   `--output-format yaml` wrote YAML into `output.json`; the default output file is now `output.<format>`. (#22)
-   Numbers with thousands separators, e.g. `1.234,56`, were read as 1.234, so quantities and prices of 1000 or more were imported about a thousand times too small. (#6)
-   The `none` input provider crashed and `--input-file` was ignored. (#7)
-   The Ghostfolio token was printed in plain text on stdout, which also broke piping the console output. (#9)
-   Impossible dates such as 31.02. were silently rolled over instead of rejected. (#11)
-   An unknown output provider was reported as an unknown output format; errors were printed with a `DEBUG` prefix. (#11)

### Security

-   All dependencies upgraded, among them axios 1.20, js-yaml 4.3.2 and pdfjs-dist 6, resolving every open Dependabot alert. (#2)

## [0.0.1] - 2024-07-24

-   Initial release: import buy, sell and dividend PDFs from Scalable Capital and Trade Republic into Ghostfolio.

[Unreleased]: https://github.com/milesstoetzner/stoetzms-ghostfolio-importer/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/milesstoetzner/stoetzms-ghostfolio-importer/releases/tag/v0.0.1
