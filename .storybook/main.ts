import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Canonical Atkinson font links injected into every story preview iframe <head>.
// This mirrors the Option B approach used in examples/minimal/index.html:
// preconnect warms the connection so the font wins the race against first paint
// rather than silently falling back to ui-sans-serif.
const FONT_HEAD = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Atkinson+Hyperlegible+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
`;

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  previewHead: (head) => `${head}${FONT_HEAD}`,
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...(Array.isArray(viteConfig.resolve?.alias) ? {} : viteConfig.resolve?.alias),
        react: resolve(root, "node_modules/react"),
        "react/jsx-runtime": resolve(root, "node_modules/react/jsx-runtime.js"),
        "react/jsx-dev-runtime": resolve(root, "node_modules/react/jsx-dev-runtime.js"),
        "react-dom": resolve(root, "node_modules/react-dom"),
        "react-dom/client": resolve(root, "node_modules/react-dom/client.js"),
      },
    },
  }),
};

export default config;
