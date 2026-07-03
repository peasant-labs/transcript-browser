import type { Preview } from "@storybook/react-vite";
import React from "react";
// Atkinson fonts are loaded via previewHead <link> tags in .storybook/main.ts
// (Option B — preconnect + stylesheet in the preview iframe <head>).
// Do NOT import fonts.css here — a bundled CSS @import adds an extra round-trip.
import "@peasant-labs/fairtrade/tokens.css";
import "@peasant-labs/fairtrade/base.css";
import "@peasant-labs/fairtrade/components.css";
import "@peasant-labs/transcript-browser/styles.css";
import "@peasant-labs/fairtrade/analytics.css";
import "@xyflow/react/dist/style.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }}>
        <div data-theme="dark" style={{ minWidth: 0 }}>
          <Story />
        </div>
        <div data-theme="light" style={{ minWidth: 0 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
