import YAML from "yaml";

export function parseStrictYamlObject(source: string, label: string): Record<string, unknown> {
  const documents = YAML.parseAllDocuments(source, { strict: true, uniqueKeys: true });
  if (documents.length !== 1) throw new Error(`${label} must contain exactly one YAML document`);
  const document = documents[0]!;
  if (document.errors.length) throw new Error(`${label} YAML is invalid: ${document.errors.map((error) => error.message).join("; ")}`);
  const value: unknown = document.toJS();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} root must be an object`);
  return value as Record<string, unknown>;
}

export function requireExactFields(value: Record<string, unknown>, fields: readonly string[], label: string): void {
  const unknown = Object.keys(value).filter((field) => !fields.includes(field));
  const missing = fields.filter((field) => !(field in value));
  if (unknown.length || missing.length) throw new Error(`${label} fields are invalid; unknown=${unknown.join(",")} missing=${missing.join(",")}`);
}

export function requireNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
}

export function requireSafeNonnegativeInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer`);
}

export function requireFiniteNonnegativeNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
}

export function requireUniqueStringSet(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  value.forEach((entry, index) => requireNonEmptyString(entry, `${label}[${index}]`));
  if (new Set(value).size !== value.length) throw new Error(`${label} must contain unique strings`);
  return value as string[];
}

export function requireSingleOccurrence(source: string, stimulus: string, label: string): void {
  requireNonEmptyString(stimulus, `${label} stimulus`);
  const occurrences = source.split(stimulus).length - 1;
  if (occurrences !== 1) throw new Error(`${label} stimulus must occur exactly once, received ${occurrences}`);
}
