import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Keep a SINGLE instance of React + the graph engine. fairtrade declares
    // react as a dependency (not a peer), so the resolver can otherwise pull a
    // second React copy and any lifted component that uses hooks throws "invalid
    // hook call". Harmless with the published dep; protective if versions skew.
    dedupe: ["react", "react-dom", "@xyflow/react"],
  },
  // NOTE: no `optimizeDeps.exclude` for @peasant-labs/fairtrade. An earlier
  // exclude was needed only while fairtrade was a `link:` symlink (Vite's dep
  // optimizer mishandled a deep re-export — `GraphLegend` — through the link,
  // blanking `pnpm dev`). Now that fairtrade is a normal published dependency,
  // the optimizer handles it correctly, and EXCLUDING it would instead skip
  // pre-bundling its transitive CJS deps (e.g. `use-sync-external-store` via the
  // redux chain), breaking named-export interop ("does not provide an export
  // named 'useSyncExternalStoreWithSelector'"). So we let Vite optimize it.
});
