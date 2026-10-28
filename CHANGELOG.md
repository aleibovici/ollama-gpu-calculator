# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Calculator calibration releases are also labeled `CALIB YYYY.MM` in the app footer.

## [Unreleased]

### Added

- Open source community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, this changelog, issue forms, a pull request template, `CODEOWNERS`, `.editorconfig` and `.gitattributes`.
- CI workflow that runs tests and a production build on every pull request.
- Dependabot updates for Bun dependencies and GitHub Actions.
- ESLint (flat config with React Hooks rules) and a `lint` script, run in CI.

### Changed

- The deploy workflow now runs tests and installs from the frozen lockfile before publishing.
- README rewritten with features, how the estimates work, project structure and a privacy note.
- `package.json` now includes license, repository and description metadata. The unused Create React App `eslintConfig` was removed.

## [0.1.0] - 2026-09-13

First versioned release. It covers all work up to this date.

### Added

- CALIB 2026.09 update: expanded GPU catalog (99 GPUs), 29 Ollama model presets including MoE and cloud-only tags, KV cache type selection (f16, q8_0, q4_0) and context lengths up to 1M tokens (#12).
- Light and dark theme toggle with a saved preference (#10).
- Instrument-style UI redesign with a searchable GPU picker (May 2026).
- Calculator pipeline extracted into testable modules with baseline regression tests (May 2026).
- GPUs added over time: NVIDIA RTX 3060 8GB, RTX 3050, Tesla P4, Tesla M10, A2, L40S, L4, Tesla P100 and Apple M3 family; AMD RDNA4 consumer and workstation cards and Instinct CDNA2–CDNA4 (#6, #7).
- GitHub Actions workflow that builds and deploys to GitHub Pages (March 2026).
- MIT license (March 2026).
- Power consumption estimates, system RAM checks and configuration warnings (2024).

### Changed

- Migrated from Create React App to Bun, Vite and Vitest (#8, February 2026).

### Fixed

- Google Analytics tag now ships with the GitHub Pages build (#13).
- Single-GPU overflow and power calculation when the model fits on one GPU (#12).
- VRAM, KV cache and tokens/sec now use standard transformer math (April 2026).
- Apple unified memory handling, quantization-aware minimum RAM and power calculation (April 2026).
- GPU TFLOPS values and accessibility issues found by Lighthouse (March 2026).

[Unreleased]: https://github.com/aleibovici/ollama-gpu-calculator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aleibovici/ollama-gpu-calculator/releases/tag/v0.1.0
