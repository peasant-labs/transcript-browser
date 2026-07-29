import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Harness as SchemaHarness, isHarness, type Harness, type TurnDetail } from "@peasant-labs/schema";
import { TurnRow, type TurnRowProps } from "./canvas/TurnRow.js";
import { providerLabel } from "./lib/provider.js";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireUniqueStringSet,
} from "./strict-yaml-fixture.test-helper.js";

vi.mock("lucide-react", async () => {
  const React = await import("react");
  return new Proxy({}, {
    get: (_target, name) => name === "then" ? undefined : (props: Record<string, unknown>) =>
      React.createElement("span", { ...props, "data-icon": String(name) }),
  });
});

vi.mock("@peasant-labs/fairtrade/icons", async () => {
  const React = await import("react");
  const Icon = (props: Record<string, unknown>) => React.createElement("span", props);
  return { AlertTriangle: Icon, Check: Icon, Coins: Icon, CornerDownRight: Icon, Link: Icon, User: Icon, Wrench: Icon };
});

type ValidCase = { name: string; harness: Harness; expected: string; expectedAccent: string };
type InvalidCase = { name: string; value: unknown; expectedError: string; mountedName: string; expectedMountedError: string };
type AbsentCase = { name: string; expectedAccent: string; expectedLabel: string };
type MutationCase = { name: string; target: string; find: string; replace: string; expectedTestName: string; expectedFailurePattern: string };
type ProviderFixture = { valid: ValidCase[]; invalid: InvalidCase[]; absent: AbsentCase; turn: TurnDetail };

const fixturePath = resolve(process.cwd(), "src/testdata/provider-policy.yaml");
const manifestPath = resolve(process.cwd(), "src/testdata/provider-policy.manifest.yaml");

function loadProviderCases(): ProviderFixture {
  const root = parseStrictYamlObject(readFileSync(fixturePath, "utf8"), "provider fixture");
  const manifest = parseStrictYamlObject(readFileSync(manifestPath, "utf8"), "provider manifest");
  requireExactFields(root, ["expectedValidCount", "expectedInvalidCount", "expectedMountedCount", "turn", "absent", "valid", "invalid"], "provider fixture root");
  requireExactFields(manifest, ["absentTestName", "expectedMutationCount", "mutations"], "provider manifest root");
  for (const field of ["expectedValidCount", "expectedInvalidCount", "expectedMountedCount"] as const) requireSafeNonnegativeInteger(root[field], `provider fixture ${field}`);
  requireSafeNonnegativeInteger(manifest.expectedMutationCount, "provider manifest expectedMutationCount");

  const turn = requireRecord(root.turn, ["index", "role", "content", "depth", "timestamp"], "provider fixture turn");
  requireSafeNonnegativeInteger(turn.index, "provider fixture turn.index");
  requireSafeNonnegativeInteger(turn.depth, "provider fixture turn.depth");
  requireNonEmptyString(turn.content, "provider fixture turn.content");
  requireNonEmptyString(turn.timestamp, "provider fixture turn.timestamp");
  if (turn.role !== "assistant") throw new Error("provider fixture turn.role must be assistant");
  if (!Number.isFinite(Date.parse(turn.timestamp))) throw new Error("provider fixture turn.timestamp must be RFC3339-compatible");

  const absent = requireRecord(root.absent, ["name", "expectedAccent", "expectedLabel"], "provider fixture absent");
  for (const field of ["name", "expectedAccent", "expectedLabel"] as const) requireNonEmptyString(absent[field], `provider fixture absent.${field}`);

  if (!Array.isArray(root.valid) || !Array.isArray(root.invalid)) throw new Error("provider fixture requires case arrays");
  const valid = root.valid.map((row, index) => {
    const record = requireRecord(row, ["name", "harness", "expected", "expectedAccent"], `provider fixture valid[${index}]`);
    for (const field of ["name", "expected", "expectedAccent"] as const) requireNonEmptyString(record[field], `provider fixture valid[${index}].${field}`);
    if (!isHarness(record.harness)) throw new Error(`provider fixture valid[${index}].harness must be canonical`);
    return record as unknown as ValidCase;
  });
  const invalid = root.invalid.map((row, index) => {
    const record = requireRecord(row, ["name", "value", "expectedError", "mountedName", "expectedMountedError"], `provider fixture invalid[${index}]`);
    for (const field of ["name", "expectedError", "mountedName", "expectedMountedError"] as const) requireNonEmptyString(record[field], `provider fixture invalid[${index}].${field}`);
    if (isHarness(record.value)) throw new Error(`provider fixture invalid[${index}].value must remain invalid`);
    return record as unknown as InvalidCase;
  });

  requireNonEmptyString(manifest.absentTestName, "provider manifest absentTestName");
  if (!Array.isArray(manifest.mutations)) throw new Error("provider manifest mutations must be an array");
  const mutations = manifest.mutations.map((row, index) => requireStringRecord(row, ["name", "target", "find", "replace", "expectedTestName", "expectedFailurePattern"], `provider manifest mutations[${index}]`) as unknown as MutationCase);

  if (valid.length !== root.expectedValidCount || invalid.length !== root.expectedInvalidCount) throw new Error("provider fixture case counts do not match their declarations");
  if (valid.length + invalid.length + 1 !== root.expectedMountedCount) throw new Error("provider mounted case count does not match the behavior corpus declaration");
  if (mutations.length !== manifest.expectedMutationCount) throw new Error("provider manifest mutation count does not match its inventory");
  const harnesses = valid.map(({ harness }) => harness);
  const schemaHarnesses = Object.values(SchemaHarness);
  if (harnesses.length !== schemaHarnesses.length || harnesses.some((harness) => !schemaHarnesses.includes(harness)) || schemaHarnesses.some((harness) => !harnesses.includes(harness))) throw new Error("provider behavior corpus must exactly cover the canonical schema Harness set");
  const absentCase = absent as unknown as AbsentCase;
  if (manifest.absentTestName !== absentCase.name) throw new Error("provider fixture and manifest absent test names differ");
  const mountedNames = [absentCase.name, ...invalid.map(({ mountedName }) => mountedName)];
  if (mutations.some(({ expectedTestName }) => !mountedNames.includes(expectedTestName))) throw new Error("provider manifest mutations must target declared mounted boundary tests");
  requireUniqueStringSet([...valid, ...invalid].map(({ name }) => name), "provider fixture names");
  requireUniqueStringSet(valid.map(({ harness }) => harness), "provider fixture valid harnesses");
  requireUniqueStringSet(mutations.map(({ name }) => name), "provider manifest mutation names");
  return { valid, invalid, absent: absentCase, turn: turn as unknown as TurnDetail };
}

function requireRecord(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  requireExactFields(record, fields, label);
  return record;
}

function requireStringRecord(value: unknown, fields: readonly string[], label: string): Record<string, string> {
  const record = requireRecord(value, fields, label);
  for (const field of fields) requireNonEmptyString(record[field], `${label}.${field}`);
  return record as Record<string, string>;
}

function renderTurn(provider?: unknown): string {
  const props: Omit<TurnRowProps, "provider"> & { provider?: unknown } = { turn: fixture.turn, turnNumber: 1 };
  if (arguments.length > 0) props.provider = provider;
  return renderToStaticMarkup(createElement(TurnRow, props as TurnRowProps));
}

const fixture = loadProviderCases();

describe("canonical provider display policy", () => {
  for (const row of fixture.valid) {
    it(row.name, () => expect(providerLabel(row.harness)).toBe(row.expected));
    it(`mounted TurnRow renders ${row.harness}`, () => {
      const html = renderTurn(row.harness);
      expect(html).toContain(`style="color:var(--${row.expectedAccent})"`);
      expect(html).toContain(row.expected);
      expect(html).toContain('class="brand"');
    });
  }

  it(fixture.absent.name, () => {
    const html = renderTurn();
    expect(html).toContain(`style="color:var(--${fixture.absent.expectedAccent})"`);
    expect(html).toContain(fixture.absent.expectedLabel);
  });

  for (const row of fixture.invalid) {
    it(row.name, () => {
      const callUncheckedBoundary = providerLabel as (value: unknown) => string;
      expect(() => callUncheckedBoundary(row.value)).toThrow(row.expectedError);
    });
    it(row.mountedName, () => expect(() => renderTurn(row.value)).toThrow(row.expectedMountedError));
  }
});
