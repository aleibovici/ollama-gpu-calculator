# Contributing to Ollama GPU Calculator

Thanks for helping out! Bug reports, spec corrections, new GPUs, new model presets and UI work are all welcome.

By taking part in this project you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug.** Open a [bug report](https://github.com/aleibovici/ollama-gpu-calculator/issues/new?template=bug_report.yml) and include the inputs you used, so we can reproduce it.
- **Fix GPU or model data.** Open a [data request](https://github.com/aleibovici/ollama-gpu-calculator/issues/new?template=gpu_or_model_data.yml) with a source link, or send a PR directly (see below).
- **Suggest a feature.** Open a [feature request](https://github.com/aleibovici/ollama-gpu-calculator/issues/new?template=feature_request.yml).
- **Compare with real usage.** If you ran a model in Ollama and the calculator was far off, tell us your GPU, model, quantization, context length, and what `ollama ps` reported. These reports help tune the estimates.

For a large change, please open an issue first so we can agree on the approach before you spend time on it.

## Development setup

You need [Bun](https://bun.sh) 1.2 or later and Git.

```bash
git clone https://github.com/<your-username>/ollama-gpu-calculator.git
cd ollama-gpu-calculator
bun install
bun run start          # dev server
bunx --bun vitest run  # run tests once
bun run lint           # ESLint
bun run build          # production build into dist/
```

`bun run test` runs the tests in watch mode.

## Pull request workflow

1. Fork the repo and create a branch from `main` (for example `feat/add-rx-9060` or `fix/kv-cache-rounding`).
2. Make your change. Keep each PR focused on one thing.
3. Add or update tests when you change behavior.
4. Run `bun run lint`, `bunx --bun vitest run` and `bun run build`. All three must pass.
5. Open a PR and fill in the template. CI runs the same checks.

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) style prefixes, for example:

```text
feat: add RX 9060 specs
fix: correct H200 memory bandwidth
docs: clarify KV cache types in README
refactor: extract warning rules
test: cover MoE tokens/sec
chore: bump vite
```

## Adding or correcting a GPU

GPUs live in [`src/data/gpuSpecs.js`](src/data/gpuSpecs.js). Add an entry to `unsortedGpuSpecs` under the right vendor section. The list is sorted automatically.

```js
// Format example (this entry already exists).
'rtx5070ti': { name: 'RTX 5070 Ti', vram: 16, generation: 'Blackwell', tflops: 87.8, bandwidth: 896, tdp: 300 },
```

| Field | Meaning |
| --- | --- |
| key | A unique lowercase id with no spaces (used in tests and fixtures) |
| `name` | The display name, as the vendor writes it |
| `vram` | GB of VRAM, or the size of the unified memory pool when `unifiedMemory` is set |
| `generation` | The architecture, for example `Ada Lovelace`, `Blackwell`, `RDNA4`, `CDNA3` or `Apple Silicon` |
| `tflops` | Peak dense FP16 tensor/matrix TFLOPS, without sparsity. Shown for reference only. |
| `bandwidth` | Peak memory bandwidth in GB/s. **This drives the tokens/sec estimate, so get it right.** |
| `tdp` | Board power in watts |
| `unifiedMemory` | Optional. Set to `true` when VRAM and system RAM are the same pool (Apple Silicon, DGX Spark, Ryzen AI, MI300A). |

Please link the vendor's official spec page in your PR. Use a reputable database such as TechPowerUp only if the vendor doesn't publish the number.

## Adding a model preset

Presets live in [`src/data/modelPresets.js`](src/data/modelPresets.js). Copy a similar entry and edit it:

| Field | Meaning |
| --- | --- |
| `id`, `label`, `family` | Identifiers. `label` names the Ollama model and size, for example `gemma4 31b`. |
| `totalParamsB` | Total parameters in billions. Used for VRAM. |
| `activeParamsB` | Active parameters per token in billions. Same as total for dense models; smaller for MoE. Used for tokens/sec. |
| `moe` | `true` for mixture-of-experts models |
| `defaultQuant` | The quantization Ollama ships by default (`'4.5'` is Q4_K_M) |
| `contextDefault`, `contextMax` | Default and maximum context length in tokens |
| `modalities` | For example `['text']` or `['text', 'vision']` |
| `multimodalOverheadGB` | Extra GB for vision or audio encoders (0 for text-only) |
| `gqaRatio` | KV heads ÷ query heads (1 for standard multi-head attention) |
| `engineHint` | `gguf`, `mlx` or `cloud` |
| `cloudOnly` | `true` for Ollama Cloud tags. These skip local VRAM math. |
| `sourceUrl` | **Required.** A link to the model's page on [ollama.com/library](https://ollama.com/library) or its model card. |

## Calculator baseline tests

[`src/fixtures/calculatorBaseline.json`](src/fixtures/calculatorBaseline.json) stores the expected output for a set of reference scenarios. It makes sure the calculator's numbers don't change by accident.

- If the baseline test fails and you **didn't** mean to change the math, fix your code.
- If you **did** mean to change the math, regenerate the baseline:

  ```bash
  bun scripts/generate-calculator-baseline.mjs
  ```

  Then explain in your PR what changed and why (for example, "KV cache now accounts for GQA on preset models"). Reviewers will check the diff of the JSON.

Adding a new GPU or preset doesn't change existing baseline values.

## Code style

- Use the existing style: functional React components, 4-space indentation in source files, ES modules.
- Keep calculation logic in `calculations.js` and `calculatorOutput.js`, not in components, so it stays testable.
- New UI must work with the keyboard and in both themes.

## Reporting security issues

Please don't open a public issue. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
