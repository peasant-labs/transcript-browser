import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function fairtradeTokenFile(name) {
  try {
    return require.resolve(`@peasant-labs/fairtrade/${name}`);
  } catch (error) {
    throw new Error(
      `Cannot resolve @peasant-labs/fairtrade/${name}: install @peasant-labs/fairtrade@0.0.0 before running the fairtrade adoption gates. This failed while resolving ${name} from scripts/fairtrade-token-paths.mjs, so TB cannot verify against the frozen published package. Original error: ${error.message}`,
    );
  }
}
