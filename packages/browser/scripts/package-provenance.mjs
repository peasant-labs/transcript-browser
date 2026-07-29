export const CANONICAL_REPOSITORY = Object.freeze({
  type: 'git',
  url: 'https://github.com/peasant-labs/transcript-browser',
  directory: 'packages/browser',
})

export function normalizeRepositoryUrl(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/^git\+/, '').replace(/\.git$/, '')
}

export function assertPackageProvenanceMetadata(manifest) {
  const repository = manifest?.repository
  if (
    repository?.type === CANONICAL_REPOSITORY.type
    && normalizeRepositoryUrl(repository.url) === CANONICAL_REPOSITORY.url
    && repository.directory === CANONICAL_REPOSITORY.directory
  ) return

  throw new Error([
    'package provenance metadata check failed.',
    'What went wrong: packages/browser/package.json does not identify the canonical transcript-browser source location.',
    'Why it happened: the repository type, URL, or monorepo directory is missing or differs from the GitHub source used by npm Trusted Publishing.',
    'Where it failed: packages/browser/package.json repository metadata.',
    'When it failed: during the normal repository gate chain, before npm publication.',
    'What it means: npm cannot resolve this package to the GitHub repository that npm Trusted Publishing authenticates from, so no provenance attestation can be bound once the repository is public.',
    `How to fix: set the package repository to ${JSON.stringify(CANONICAL_REPOSITORY)} and rerun pnpm test:package-provenance.`,
  ].join('\n'))
}
