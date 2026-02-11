# Ollama GPU Calculator

A web application built in React that helps users determine if their GPU meets the VRAM requirements for running various Ollama LLM models. Check it out at [http://aleibovici.github.io/ollama-gpu-calculator/](http://aleibovici.github.io/ollama-gpu-calculator/).

## About

This calculator helps you:
- Check if your GPU has sufficient VRAM for specific Ollama models
- Compare different LLM model requirements
- Determine approximate GPU specifications needed for your desired models
- Optimize model selection based on your available hardware

Join the discussion about this tool on [Reddit](https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/).

## GPU Requirements

Different Ollama models have varying VRAM requirements:
- Smaller models (3B-7B parameters) typically need 4-8GB VRAM
- Medium models (13B parameters) usually require 8-16GB VRAM
- Larger models (30B-65B parameters) need 24GB+ VRAM

Use this calculator to get ballpark estimates for your specific use case.

## Development

This project now uses [Bun.js](https://bun.sh) to replace the deprecated create-react-app, as well as offer a speedup for package management compared to npm. We currently use Vite/Vitest for bundling and testing, however, we may migrate to Bun for these needs as well at some point in the future.

To install Bun, you can simply run the following script on Linux/macOS:
```
curl -fsSL https://bun.sh/install | bash
```

Or, if you use Windows:
```
powershell -c "irm bun.sh/install.ps1 | iex"
```

You can also install with various package managers or Docker using the instructions [here](https://bun.com/docs/installation#package-managers).

Afterwards, run `bun install` in the project's root directory to install the neccesary dependencies.

## Developing and Running Locally

In the project's directory, you can run:

### `bun run start`

Runs the app in development mode.

### `bun run test`

Launches the test runner in interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `bun run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Contributing

Feel free to open issues or submit pull requests if you'd like to contribute to this project.

## Learn More

To learn more about Ollama, visit the [official Ollama documentation](https://ollama.ai/docs).

For React documentation, check out the [React documentation](https://reactjs.org/).
