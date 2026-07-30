// The full-trace graph requires its data transform to emit every connector even
// when presentation-layer layout makes those connectors invisible. A collapsing
// container can hide correctly computed edges, but it must not be confused with
// a topology failure in `turnsToFlow`.
//
// This test exercises `turnsToFlow`, the pure data transform that decides which
// edges exist, directly, with no DOM, no CSS, no @xyflow rendering, and therefore
// no container/width dependency whatsoever. If a future change to
// `turnsToFlow` ever drops an edge (sequential, turn-to-tool, spawn, or return),
// this fails here regardless of how any consumer's container is sized.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { TurnDetail } from "@peasant-labs/schema";
import { turnsToFlow } from "./turnsToFlow.js";
import {
  parseStrictYamlObject,
  requireExactFields,
  requireNonEmptyString,
  requireSafeNonnegativeInteger,
  requireUniqueStringSet,
} from "../strict-yaml-fixture.test-helper.js";

interface ToolCallFixture {
  id: string;
  name: string;
  arguments: string;
  result: string;
}

interface TurnFixture {
  index: number;
  depth: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCallFixture[];
}

interface EdgeCase {
  name: string;
  description: string;
  turns: TurnFixture[];
  expectedNodeCount: number;
  expectedEdgeCount: number;
  expectedSequentialEdgeCount: number;
  expectedToolEdgeCount: number;
  expectedEdgeIds: string[];
  expectedEdgeTypes?: Record<string, string>;
}

const fixturePath = resolve(process.cwd(), "src/graph/testdata/turnsToFlow-edges.yaml");
const manifestPath = resolve(process.cwd(), "src/graph/testdata/turnsToFlow-edges.manifest.yaml");

function requireRecord(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  requireExactFields(record, fields, label);
  return record;
}

function loadCases(): EdgeCase[] {
  const root = parseStrictYamlObject(readFileSync(fixturePath, "utf8"), "turnsToFlow edges fixture");
  const manifest = parseStrictYamlObject(readFileSync(manifestPath, "utf8"), "turnsToFlow edges manifest");
  requireExactFields(root, ["cases"], "turnsToFlow edges fixture root");
  requireExactFields(manifest, ["expectedCaseCount", "requiredNames"], "turnsToFlow edges manifest root");
  requireSafeNonnegativeInteger(manifest.expectedCaseCount, "turnsToFlow edges manifest expectedCaseCount");
  const requiredNames = requireUniqueStringSet(manifest.requiredNames, "turnsToFlow edges manifest requiredNames");

  if (!Array.isArray(root.cases)) throw new Error("turnsToFlow edges fixture cases must be an array");
  if (root.cases.length !== manifest.expectedCaseCount) {
    throw new Error(
      `turnsToFlow edges fixture has ${root.cases.length} cases, manifest expects exactly ${manifest.expectedCaseCount}`,
    );
  }

  const cases = root.cases.map((row, index): EdgeCase => {
    const optionalFields = row && typeof row === "object" && "expectedEdgeTypes" in (row as Record<string, unknown>)
      ? (["name", "description", "turns", "expectedNodeCount", "expectedEdgeCount", "expectedSequentialEdgeCount", "expectedToolEdgeCount", "expectedEdgeIds", "expectedEdgeTypes"] as const)
      : (["name", "description", "turns", "expectedNodeCount", "expectedEdgeCount", "expectedSequentialEdgeCount", "expectedToolEdgeCount", "expectedEdgeIds"] as const);
    const record = requireRecord(row, optionalFields, `turnsToFlow edges fixture cases[${index}]`);
    requireNonEmptyString(record.name, `turnsToFlow edges fixture cases[${index}].name`);
    requireNonEmptyString(record.description, `turnsToFlow edges fixture cases[${index}].description`);
    requireSafeNonnegativeInteger(record.expectedNodeCount, `turnsToFlow edges fixture cases[${index}].expectedNodeCount`);
    requireSafeNonnegativeInteger(record.expectedEdgeCount, `turnsToFlow edges fixture cases[${index}].expectedEdgeCount`);
    requireSafeNonnegativeInteger(record.expectedSequentialEdgeCount, `turnsToFlow edges fixture cases[${index}].expectedSequentialEdgeCount`);
    requireSafeNonnegativeInteger(record.expectedToolEdgeCount, `turnsToFlow edges fixture cases[${index}].expectedToolEdgeCount`);
    if (!Array.isArray(record.turns) || record.turns.length === 0) {
      throw new Error(`turnsToFlow edges fixture cases[${index}].turns must be a non-empty array`);
    }
    if (!Array.isArray(record.expectedEdgeIds)) {
      throw new Error(`turnsToFlow edges fixture cases[${index}].expectedEdgeIds must be an array`);
    }
    const turns = record.turns as TurnFixture[];
    for (const [ti, turn] of turns.entries()) {
      requireSafeNonnegativeInteger(turn.index, `turnsToFlow edges fixture cases[${index}].turns[${ti}].index`);
      requireSafeNonnegativeInteger(turn.depth, `turnsToFlow edges fixture cases[${index}].turns[${ti}].depth`);
      requireNonEmptyString(turn.content, `turnsToFlow edges fixture cases[${index}].turns[${ti}].content`);
      if (!["user", "assistant", "system", "tool"].includes(turn.role)) {
        throw new Error(`turnsToFlow edges fixture cases[${index}].turns[${ti}].role must be canonical`);
      }
    }
    return {
      name: record.name as string,
      description: record.description as string,
      turns,
      expectedNodeCount: record.expectedNodeCount as number,
      expectedEdgeCount: record.expectedEdgeCount as number,
      expectedSequentialEdgeCount: record.expectedSequentialEdgeCount as number,
      expectedToolEdgeCount: record.expectedToolEdgeCount as number,
      expectedEdgeIds: record.expectedEdgeIds as string[],
      expectedEdgeTypes: record.expectedEdgeTypes as Record<string, string> | undefined,
    };
  });

  const actualNames = cases.map((c) => c.name);
  if (new Set(actualNames).size !== actualNames.length) throw new Error("turnsToFlow edges fixture case names must be unique");
  for (const required of requiredNames) {
    if (!actualNames.includes(required)) throw new Error(`turnsToFlow edges fixture is missing required case "${required}"`);
  }

  return cases;
}

function toTurnDetail(fixture: TurnFixture): TurnDetail {
  return {
    index: fixture.index,
    depth: fixture.depth,
    role: fixture.role,
    content: fixture.content,
    timestamp: "2024-01-01T00:00:00.000Z",
    toolCalls: fixture.toolCalls?.map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
      result: tc.result,
    })),
  };
}

describe("turnsToFlow emits complete graph topology from data alone (no DOM, CSS, or React Flow)", () => {
  const cases = loadCases();

  // Non-vacuity floor: this suite must never silently shrink to fewer scenarios.
  it("fixture carries every required scenario", () => {
    expect(cases.length).toBeGreaterThanOrEqual(4);
    const names = cases.map((c) => c.name);
    expect(names).toContain("sequential_turns_produce_n_minus_1_edges");
    expect(names).toContain("turn_with_tool_calls_adds_tool_edge");
    expect(names).toContain("single_turn_has_no_edges");
    expect(names).toContain("subagent_depth_change_produces_spawn_and_return_edges");
  });

  for (const testCase of cases) {
    it(testCase.name, () => {
      const turns = testCase.turns.map(toTurnDetail);
      const { nodes, edges } = turnsToFlow({
        turns,
        phases: [],
        annotations: [],
        searchMatches: [],
        filteredIndices: new Set<number>(),
      });

      expect(nodes.length).toBe(testCase.expectedNodeCount);
      expect(edges.length).toBe(testCase.expectedEdgeCount);

      const edgeIds = edges.map((e) => e.id).sort();
      expect(edgeIds).toEqual([...testCase.expectedEdgeIds].sort());

      const sequentialEdges = edges.filter((e) => (e.data as { edgeType?: string } | undefined)?.edgeType === "sequential");
      const toolEdges = edges.filter((e) => e.sourceHandle === "tool-source");
      expect(sequentialEdges.length).toBe(testCase.expectedSequentialEdgeCount);
      expect(toolEdges.length).toBe(testCase.expectedToolEdgeCount);

      if (testCase.expectedEdgeTypes) {
        for (const [edgeId, expectedType] of Object.entries(testCase.expectedEdgeTypes)) {
          const edge = edges.find((e) => e.id === edgeId);
          expect(edge, `edge "${edgeId}" must exist`).toBeDefined();
          expect((edge!.data as { edgeType?: string }).edgeType).toBe(expectedType);
        }
      }

      // Every edge must reference a node that actually exists — a real
      // node-link graph, not a dangling/disconnected reference (which would
      // render as an invisible or broken connector regardless of container
      // width, the same class of "renders but isn't a real graph" defect).
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const edge of edges) {
        expect(nodeIds.has(edge.source), `edge "${edge.id}" source "${edge.source}" must be a real node`).toBe(true);
        expect(nodeIds.has(edge.target), `edge "${edge.id}" target "${edge.target}" must be a real node`).toBe(true);
      }
    });
  }
});
