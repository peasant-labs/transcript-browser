#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import YAML from 'yaml'
import { assertPackageProvenanceMetadata } from './package-provenance.mjs'

const fixture = YAML.parse(readFileSync(new URL('../src/testdata/package-provenance.yaml', import.meta.url), 'utf8'))
assert.deepEqual(Object.keys(fixture), ['cases'])
assert.equal(fixture.cases.length, 10, 'package provenance fixture must retain all ten URL, identity, and monorepo boundaries')
assert.equal(new Set(fixture.cases.map((testCase) => testCase.name)).size, fixture.cases.length, 'package provenance fixture case names must be unique')
assert.equal(fixture.cases.filter((testCase) => testCase.valid).length, 2, 'package provenance fixture must retain both accepted URL spellings')
assert.equal(fixture.cases.filter((testCase) => !testCase.valid).length, 8, 'package provenance fixture must retain all eight rejected identity mutations')

for (const testCase of fixture.cases) {
  assert.deepEqual(Object.keys(testCase).sort(), ['manifest', 'name', 'valid'])
  if (testCase.valid) {
    assert.doesNotThrow(() => assertPackageProvenanceMetadata(testCase.manifest), `${testCase.name}: canonical repository metadata must pass`)
  } else {
    assert.throws(
      () => assertPackageProvenanceMetadata(testCase.manifest),
      /package provenance metadata check failed/,
      `${testCase.name}: repository metadata mutation must fail`,
    )
  }
}

console.log(`Package provenance metadata mutations: ${fixture.cases.length} fixture cases passed.`)
