# Ollama GPU Calculator

[![CI](https://github.com/aleibovici/ollama-gpu-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/aleibovici/ollama-gpu-calculator/actions/workflows/ci.yml)
[![Deploy](https://github.com/aleibovici/ollama-gpu-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/aleibovici/ollama-gpu-calculator/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Can your GPU run that Ollama model? This web app estimates the VRAM, KV cache, system RAM, decode speed and power draw for a model on your hardware, and tells you whether it fits.

**Try it: [aleibovici.github.io/ollama-gpu-calculator](https://aleibovici.github.io/ollama-gpu-calculator/)**

Everything runs in your browser. There is no backend and nothing to install.

## Features

- **99 GPUs** across NVIDIA (Maxwell to Blackwell, consumer and data center), AMD (RDNA2 to RDNA4, Instinct CDNA1 to CDNA4, Ryzen AI) and Apple Silicon. You can search for a GPU by name.
- **29 model presets** for current Ollama models, or enter any parameter count yourself. Three presets are cloud-only; they are labeled and are not counted in local VRAM math.
- **"What can this setup run?" table.** Pick your GPUs and see every model preset ranked by fit, with required VRAM and estimated tokens/sec. Load any row into the calculator with one click.
- **Shareable links.** The URL always reflects your setup, so you can copy it (or use **Copy link**) and anyone who opens it sees the same configuration.
- **Mixture-of-experts aware.** VRAM uses total parameters, while tokens/sec uses active parameters.
- **Quantization**: FP32, FP16/BF16, Q8_0, Q4_K_M, NVFP4 and MXFP4.
- **KV cache types**: f16 (default), q8_0 and q4_0, matching Ollama's `OLLAMA_KV_CACHE_TYPE` setting, plus context lengths from 4K to 1M tokens.
- **Multi-GPU and mixed GPU setups**, with warnings about scaling losses and mixed GPU generations.
- **Unified memory** on Apple Silicon, DGX Spark and Ryzen AI, where VRAM and system RAM come from the same pool.
- A clear result (compatible, borderline or insufficient) with a breakdown of model weights and KV cache, plus estimated system RAM, tokens/sec and power.
- Light and dark themes.

## How the estimates work

The math lives in [`src/calculations.js`](src/calculations.js) and uses standard transformer formulas rather than curve fits:

| Estimate | Formula |
| --- | --- |
| Model weights | `total_params × bits_per_weight / 8` |
| KV cache | `2 × n_layers × d_model × context × bytes_per_element × gqa_ratio`, with layer count and width estimated from parameter count (`params ≈ 12·L·d²`, `d/L ≈ 128`) |
| Decode tokens/sec | `effective_memory_bandwidth / (active_weight_bytes + kv_cache_bytes)`. Single-batch decode is limited by memory bandwidth. |

GPU specs are in [`src/data/gpuSpecs.js`](src/data/gpuSpecs.js) and model presets are in [`src/data/modelPresets.js`](src/data/modelPresets.js). Each preset links to its source.

These are **estimates**. Real usage depends on the Ollama version, the backend (CUDA, ROCm, Metal, MLX), drivers, flash attention, batch size and what else is using the GPU. Leave some headroom.

## Sharing a configuration

The address bar updates as you change inputs. Links look like this:

```text
https://aleibovici.github.io/ollama-gpu-calculator/?model=qwen3.6-35b&quant=q4_k_m&kv=q8_0&ctx=32k&gpu=rtx4090*2
```

| Parameter | Meaning | Example |
| --- | --- | --- |
| `model` | Preset id (see [`modelPresets.js`](src/data/modelPresets.js)) | `gemma4-31b` |
| `params` | Parameter count in billions, for a custom model | `70` |
| `quant` | Quantization | `fp16`, `q8_0`, `q4_k_m`, `mxfp4` |
| `kv` | KV cache type (omitted when `f16`) | `q8_0`, `q4_0` |
| `ctx` | Context length | `4k` … `256k`, `1m` |
| `gpu` | One per GPU row: GPU id, plus `*count` for more than one (see [`gpuSpecs.js`](src/data/gpuSpecs.js)) | `rtx4090*2` |

Unknown or invalid values are ignored.

## Getting started

You need [Bun](https://bun.sh) 1.2 or later.

```bash
git clone https://github.com/aleibovici/ollama-gpu-calculator.git
cd ollama-gpu-calculator
bun install
bun run start
```

Then open the URL that Vite prints (usually <http://localhost:5173/ollama-gpu-calculator/>).

### Scripts

| Command | What it does |
| --- | --- |
| `bun run start` | Start the dev server with hot reload |
| `bun run test` | Run the tests in watch mode |
| `bunx --bun vitest run` | Run the tests once (what CI runs) |
| `bun run lint` | Check the code with ESLint |
| `bun run build` | Build for production into `dist/` |

## Project structure

```text
src/
├── OllamaGPUCalculator.jsx     # Main UI
├── calculations.js             # VRAM, KV cache, tokens/sec, power and RAM math
├── calculatorOutput.js         # Input validation, results and warnings
├── components/                 # GPU picker, compatibility banner, analytics
├── data/
│   ├── gpuSpecs.js             # GPU database
│   └── modelPresets.js         # Ollama model presets
├── fixtures/
│   └── calculatorBaseline.json # Regression baseline for calculator output
└── styles/
scripts/
└── generate-calculator-baseline.mjs
```

## Deployment

Every push to `main` is tested, built and published to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Contributing

Contributions are welcome. Adding a missing GPU or model, or fixing a spec, is a great first PR. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started, and use the [issue templates](https://github.com/aleibovici/ollama-gpu-calculator/issues/new/choose) to report bugs or request data changes.

Thanks to [everyone who has contributed](https://github.com/aleibovici/ollama-gpu-calculator/graphs/contributors).

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By taking part, you agree to follow it.

## Security

Please don't report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).

## Privacy

The hosted site uses Google Analytics to count page views and record which calculator settings are used (for example, preset, quantization and context length). It doesn't collect personal data that you enter. **If you fork and deploy this project, remove or replace the analytics first.** Otherwise your site sends its data to this project's Google Analytics property. Remove the Google tag from `index.html` and the `<Analytics />` component from `src/App.jsx`. Without them, the `ReactGA.event` calls in `src/OllamaGPUCalculator.jsx` do nothing.

## Community

- Discussion on [Reddit r/ollama](https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/)
- Ollama docs: [hardware support](https://docs.ollama.com/gpu) and [context length](https://docs.ollama.com/context-length)

## License

[MIT](LICENSE) © aleibovici and contributors

This project is not affiliated with or endorsed by Ollama.
