/** Single source of truth for the ForkHub update feed. Resolution order:
 * persisted publisher override → DSH_UPDATE_OWNER env → baked
 * extraMetadata default (stamped at package time) → hardcoded default.
 * The with-fh build ships unstamped so its default is with-fh/.forkhub.
 */

export type ForkHubFeed = { owner: string; repo: string }

export const FORKHUB_DEFAULT_OWNER = 'with-fh'
export const FORKHUB_DEFAULT_REPO = '.forkhub'
export const FORKHUB_PUBLISHER_FILE = 'forkhub-updater.json'

const OWNER_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/

/** Normalize a GitHub owner login (1–39 chars, alphanumerics + hyphens, no leading/trailing hyphen). */
export function normalizeUpdateOwner(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const owner = value.trim()
  if (!OWNER_PATTERN.test(owner)) return null
  return owner
}

type BakedConfig = {
  extraMetadata?: { forkhubUpdateOwner?: unknown; forkhubUpdateRepo?: unknown }
}

/** Baked package-time default from electron-builder extraMetadata (unstamped in with-fh builds). */
export function bakedUpdateDefault(processArgv: readonly string[] = []): ForkHubFeed | null {
  void processArgv
  try {
    const pkg = (globalThis as { __forkhubBaked?: unknown }).__forkhubBaked as
      | BakedConfig['extraMetadata']
      | undefined
    const owner = normalizeUpdateOwner(pkg?.forkhubUpdateOwner)
    if (owner === null) return null
    const repo = typeof pkg?.forkhubUpdateRepo === 'string' && pkg.forkhubUpdateRepo.trim() !== ''
      ? pkg.forkhubUpdateRepo.trim()
      : FORKHUB_DEFAULT_REPO
    return { owner, repo }
  } catch {
    return null
  }
}

/** Read the baked default from a packaged manifest object (package.json as shipped). */
export function bakedUpdateDefaultFromManifest(manifest: unknown): ForkHubFeed | null {
  if (typeof manifest !== 'object' || manifest === null) return null
  const extra = (manifest as { build?: { extraMetadata?: unknown } }).build?.extraMetadata
  if (typeof extra !== 'object' || extra === null) return null
  const owner = normalizeUpdateOwner(
    (extra as { forkhubUpdateOwner?: unknown }).forkhubUpdateOwner,
  )
  if (owner === null) return null
  const repoRaw = (extra as { forkhubUpdateRepo?: unknown }).forkhubUpdateRepo
  const repo = typeof repoRaw === 'string' && repoRaw.trim() !== '' ? repoRaw.trim() : FORKHUB_DEFAULT_REPO
  return { owner, repo }
}

export type FeedReader = {
  persistedOwner(): string | null
  envOwner(): string | null
  bakedDefault(): ForkHubFeed | null
}

/** Resolve the live update feed. Persisted override wins; default chain otherwise. */
export function getUpdateFeed(reader?: Partial<FeedReader>): ForkHubFeed {
  const persisted = reader?.persistedOwner?.() ?? null
  if (persisted !== null) return { owner: persisted, repo: FORKHUB_DEFAULT_REPO }
  const env = reader?.envOwner?.() ?? normalizeUpdateOwner(process.env.DSH_UPDATE_OWNER)
  if (env !== null) return { owner: env, repo: FORKHUB_DEFAULT_REPO }
  const baked = reader?.bakedDefault?.() ?? bakedUpdateDefault()
  if (baked !== null) return baked
  return { owner: FORKHUB_DEFAULT_OWNER, repo: FORKHUB_DEFAULT_REPO }
}

export type CatalogCheckResult =
  | { ok: true; owner: string; repo: string; releases: number; message: string }
  | { ok: false; owner: string; message: string }

/**
 * Validate a publisher catalog: the public {owner}/.forkhub repo must exist
 * AND carry at least one published, non-draft release. Upstream has no
 * .forkhub repo so it can never validate as a publisher. Unauthenticated —
 * private catalogs are unsupported.
 */
export async function checkPublisherCatalog(
  owner: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogCheckResult> {
  const clean = normalizeUpdateOwner(owner)
  if (clean === null) return { ok: false, owner, message: `invalid owner '${owner}'` }
  let response: Response
  try {
    response = await fetchImpl(`https://api.github.com/repos/${clean}/.forkhub/releases?per_page=100`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-desktop' },
    })
  } catch (error) {
    return { ok: false, owner: clean, message: `catalog unreachable: ${error instanceof Error ? error.message : String(error)}` }
  }
  if (response.status === 404) {
    return { ok: false, owner: clean, message: `${clean}/.forkhub does not exist (private catalogs unsupported)` }
  }
  if (!response.ok) {
    return { ok: false, owner: clean, message: `catalog check failed (HTTP ${response.status})` }
  }
  let releases: Array<{ draft?: unknown; tag_name?: unknown }>
  try {
    releases = (await response.json()) as Array<{ draft?: unknown; tag_name?: unknown }>
  } catch {
    return { ok: false, owner: clean, message: 'catalog releases unreadable' }
  }
  const published = releases.filter(r => typeof r.tag_name === 'string' && r.draft !== true)
  if (published.length === 0) {
    return { ok: false, owner: clean, message: `${clean}/.forkhub has no published releases yet` }
  }
  return {
    ok: true,
    owner: clean,
    repo: FORKHUB_DEFAULT_REPO,
    releases: published.length,
    message: `${clean}/.forkhub serves ${published.length} release(s)`,
  }
}
