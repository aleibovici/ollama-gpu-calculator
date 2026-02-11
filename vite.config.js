import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	base: "/ollama-gpu-calculator/",
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/setupTests.js",
		css: true,
	},
});
