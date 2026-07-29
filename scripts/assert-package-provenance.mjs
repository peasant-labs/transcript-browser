#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { assertPackageProvenanceMetadata } from '../packages/browser/scripts/package-provenance.mjs'

const manifestUrl = new URL('../packages/browser/package.json', import.meta.url)
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'))
assertPackageProvenanceMetadata(manifest)

console.log('Package provenance metadata check passed for peasant-labs/transcript-browser/packages/browser.')
