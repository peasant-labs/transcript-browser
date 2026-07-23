import { defineConfig } from "vitest/config";

const mutation = process.env.TRANSCRIPT_BROWSER_MUTATION_JSON
  ? JSON.parse(process.env.TRANSCRIPT_BROWSER_MUTATION_JSON) as { name: string; target?: string; find: string; replace: string }
  : null;

const isolatedMutationPlugin = {
  name: "transcript-browser-isolated-mutation",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!mutation || !id.split("?")[0].endsWith(`/${mutation.target ?? "src/SessionDetail.tsx"}`)) return null;
    const count = code.split(mutation.find).length - 1;
    if (count !== 1) throw new Error(`${mutation.name}: isolated mutation anchor must occur exactly once, received ${count}`);
    return { code: code.replace(mutation.find, mutation.replace), map: null };
  },
};

export default defineConfig({
  plugins: [isolatedMutationPlugin],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
