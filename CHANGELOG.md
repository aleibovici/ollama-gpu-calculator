# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Calculator calibration releases are also labeled `CALIB YYYY.MM` in the app footer.

## [Unreleased]

### Added

- The model preset picker is now searchable: start typing and the list filters by name, size, vendor or capability (`qwen 27b`, `moe`, `vision`, `coder`). Words match in any order, and the GPU picker uses the same search.
- Shareable links: the URL tracks the calculator inputs (`?model=…&quant=…&ctx=…&gpu=rtx4090*2`), opening a link restores the setup, and a **Copy link** button copies it.
- "What can this setup run?" table: once a GPU is selected, every local model preset is checked against it at its default quantization and sorted by fit, with required VRAM and tokens/sec. Each row can be loaded into the calculator.
- Open source community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, this changelog, issue forms, a pull request template, `CODEOWNERS`, `.editorconfig` and `.gitattributes`.
- CI workflow that runs tests and a production build on every pull request.
- Dependabot updates for Bun dependencies and GitHub Actions.
- ESLint (flat config with React Hooks rules) and a `lint` script, run in CI.

### Changed

- Model presets re-verified against ollama.com/library (CALIB 2026.10) and grown from 29 to 74, grouped by vendor in the dropdown. New: Qwen 3.8 27b and 3.8-flash-next, the full Qwen 3.5 range, Nemotron 3.5 Super, Nemotron 3 Nano and Nano Omni, Llama 4 Scout and Maverick, Llama 3.3, DeepSeek-R1 8b/14b/32b/671b, DeepSeek-V3.1, Mistral Medium 3.5, Devstral Small 2, Mistral Small 3.2, Ministral 3, Granite 4.2, Gemma 3 4b/12b, Gemma 3n, Qwen3 8b/30b/235b, Qwen3-Coder 480b and Next, Qwen3-Next, Qwen3-VL 8b/30b, Flint, LFM 2.5, Ornith 1.5, Phi-4 and OLMo 3.1.

### Fixed

- Presets that were mixture-of-experts models listed as dense (`qwen3-coder 30b`, `qwen3.6 35b`), which made their tokens/sec far too low.
- Presets for sizes that don't exist on Ollama: `qwen3.5 32b` (replaced by 27b and 35b) and `granite4 8b` (replaced by Granite 4.2).
- Parameter counts now use Ollama's stored values, for example gemma4 e2b/e4b at 4.65B/7.52B instead of their 2B/4B "effective" size, so VRAM isn't underestimated.
- Context limits: `qwen3 32b` is 40K on Ollama, not 128K. Vision support added for `qwen3.6` and projector sizes updated from the tag metadata.
- `muse-glimmer 30b` no longer shows the MLX-only warning on GPUs that use the GGUF build.
- `minimax-m2` preset listed an 8B local model that never existed on Ollama (MiniMax-M2 was a 230B cloud-only model, retired June 2026). Replaced with the cloud-only `minimax-m3:cloud`.
- `glm-5 9b` preset described a model that doesn't exist (GLM-5 is a 744B cloud-only model, retired July 2026). Replaced with `glm-4.7-flash` (30B MoE, 3B active), Ollama's current local GLM model.

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
