# Ollama GPU Calculator

A simple web application for estimating whether your GPU has enough **VRAM** to run different [Ollama](https://ollama.com/) models.

🌐 **[Live Demo](https://aleibovici.github.io/ollama-gpu-calculator/)**

---

## 📖 About

Running Large Language Models (LLMs) locally with Ollama requires sufficient GPU memory (VRAM). Different models have different memory requirements, making it difficult to know which models are suitable for your hardware.

**Ollama GPU Calculator** helps you quickly compare your available GPU VRAM with the estimated VRAM requirements of different Ollama models.

It is designed to make local LLM hardware selection simpler and easier to understand.

### What it helps you do

* Check whether your GPU has enough VRAM for an Ollama model
* Compare VRAM requirements between models
* Estimate the GPU memory needed for different model sizes
* Choose models that are more suitable for your hardware
* Understand GPU and model compatibility at a glance

> **Note:** VRAM requirements are estimates. Actual memory usage can vary depending on the model, quantization, context length, GPU architecture, runtime overhead, and other workloads running on your system.

---

## ✨ Features

*  **GPU VRAM compatibility checking**
*  **Ollama model comparison**
*  **VRAM requirement estimation**
*  **Fast and simple interface**
*  **Responsive design**
*  **Runs directly in the browser**
*  **Simple compatibility calculations**

---

## 🖥️ How It Works

The calculator follows a simple process:

```text
Your Available GPU VRAM
          ↓
Select an Ollama Model
          ↓
Check Estimated VRAM Requirement
          ↓
Compare VRAM
          ↓
View Compatibility Result
```

The goal is to provide a quick reference when deciding which local LLM models are suitable for your GPU.

---

## 🎮 GPU VRAM & Model Size

VRAM requirements depend on several factors, including model size, quantization, context length, and runtime overhead.

As a **rough guideline**:

| Model Size | Approximate VRAM |
| ---------- | ---------------- |
| 3B–7B      | ~4–8 GB          |
| 8B–13B     | ~8–16 GB         |
| 30B–40B    | ~16–24+ GB       |
| 65B+       | ~24 GB+          |

> These values are general estimates and should not be treated as strict hardware requirements. Use the calculator for model-specific estimates.

---

## 🛠️ Tech Stack

| Technology                    | Purpose                            |
| ----------------------------- | ---------------------------------- |
| [React](https://react.dev/)   | User interface                     |
| [Vite](https://vite.dev/)     | Development and build tooling      |
| [Bun](https://bun.sh/)        | Package management and development |
| [Vitest](https://vitest.dev/) | Testing                            |
| JavaScript                    | Application logic                  |
| Git & GitHub                  | Version control and collaboration  |

---

## 🚀 Getting Started

Follow the steps below to run the project locally.

### Prerequisites

Make sure you have the following installed:

* [Git](https://git-scm.com/)
* [Bun](https://bun.sh/)

### 1. Clone the repository

```bash
git clone https://github.com/aleibovici/ollama-gpu-calculator.git
```

### 2. Navigate to the project

```bash
cd ollama-gpu-calculator
```

### 3. Install dependencies

```bash
bun install
```

### 4. Start the development server

```bash
bun run start
```

The application will be available at:

```text
http://localhost:5173/
```

Open the URL in your browser to use the calculator.

---

## 🧪 Testing

The project uses **Vitest** for testing.

Run the test suite with:

```bash
bun run test
```

Make sure all tests pass before submitting changes.

---

## 📦 Production Build

Create a production build with:

```bash
bun run build
```

The generated production files will be placed in:

```text
dist/
```

The resulting build can be deployed to a static hosting service such as GitHub Pages.

---

## 📁 Project Structure

The project uses a standard React/Vite structure:

```text
ollama-gpu-calculator/
│
├── public/          # Static assets
├── src/             # Application source code
├── package.json     # Dependencies and project scripts
├── vite.config.*    # Vite configuration
├── README.md        # Project documentation
└── LICENSE          # Project license
```

> The project structure may evolve as new features and improvements are added.

---

## 🤝 Contributing

Contributions are welcome!

If you find a bug, have an improvement idea, or want to add a useful feature, feel free to contribute.

### Contribution workflow

#### 1. Fork the repository

Create your own fork of the repository on GitHub.

#### 2. Clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/ollama-gpu-calculator.git
cd ollama-gpu-calculator
```

#### 3. Create a branch

```bash
git switch -c feature/your-feature
```

#### 4. Make your changes

Implement your feature, fix, or improvement.

#### 5. Run tests

```bash
bun run test
```

#### 6. Verify the production build

```bash
bun run build
```

#### 7. Commit your changes

```bash
git add .
git commit -m "feat: describe your change"
```

#### 8. Push your branch

```bash
git push -u origin feature/your-feature
```

#### 9. Open a Pull Request

Open a Pull Request from your branch to the project's `main` branch.

### Before submitting a Pull Request

Please make sure:

* The application works correctly
* Existing functionality is not broken
* Tests pass successfully
* The production build succeeds
* Changes are focused and clearly described
* Documentation is updated when necessary

---

## 💡 Future Improvements

Some potential areas for future improvements include:

* Support for additional Ollama models
* More accurate VRAM estimation
* Additional GPU information
* Improved model comparison
* UI and accessibility improvements
* Expanded automated test coverage
* Additional documentation

Have another idea? Feel free to open an issue and start a discussion.

---

## 🔗 Resources

### Ollama

* [Ollama](https://ollama.com/)
* [Ollama Documentation](https://docs.ollama.com/)

### Development

* [React Documentation](https://react.dev/)
* [Vite Documentation](https://vite.dev/)
* [Bun Documentation](https://bun.sh/docs)
* [Vitest Documentation](https://vitest.dev/)

### Community Discussion

You can also find the original discussion about the calculator on Reddit:

[Ollama GPU Compatibility Calculator – Reddit](https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⭐ Support the Project

If you find **Ollama GPU Calculator** useful, consider giving the repository a ⭐ on GitHub.

Bug reports, suggestions, and contributions are always welcome.
