# Security Policy

## Supported versions

This is a static web app. Only the latest version on the `main` branch, deployed to <https://aleibovici.github.io/ollama-gpu-calculator/>, receives fixes.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report it privately through GitHub instead:

1. Go to the [Security tab](https://github.com/aleibovici/ollama-gpu-calculator/security).
2. Click **Report a vulnerability** ([direct link](https://github.com/aleibovici/ollama-gpu-calculator/security/advisories/new)).
3. Describe the issue, how to reproduce it, and its impact.

You can expect an acknowledgement within 7 days. If the report is confirmed, we'll work on a fix, credit you in the advisory (unless you'd rather stay anonymous), and publish the advisory once the fix is live.

## Scope

In scope:

- Code in this repository, such as cross-site scripting through calculator inputs
- The build and deploy workflows in `.github/workflows/`
- Vulnerable dependencies that affect the shipped site

Out of scope:

- Wrong VRAM or performance estimates. Please open a [bug report](https://github.com/aleibovici/ollama-gpu-calculator/issues/new?template=bug_report.yml) instead.
- Issues in Ollama itself. Report those to the [Ollama project](https://github.com/ollama/ollama/security).
- GitHub Pages or Google Analytics infrastructure
