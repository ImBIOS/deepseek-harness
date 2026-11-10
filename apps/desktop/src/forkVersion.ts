/** ForkHub rebuild identity: fork versions carry `-fh.<owner>.<n>`; the updater
 * allows prereleases on a feed that contains ONLY fork builds; stock↔fork
 * and cross-owner pairs stay refused. Upstream has no `.forkhub` repo, so
 * stock builds never see fork builds and vice versa.
 */

const FORK_PATTERN = /^(.+?)-fh\.([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)\.(\d+)$/

export type ForkIdentity = { base: string; owner: string; counter: number } | null

/** Split `<base>-fh.<owner>.<n>` into its parts; stock versions yield null. */
export function parseForkVersion(version: string): ForkIdentity {
  const match = FORK_PATTERN.exec(version.trim())
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return null
  const counter = Number.parseInt(match[3], 10)
  if (!Number.isSafeInteger(counter)) return null
  return { base: match[1], owner: match[2].toLowerCase(), counter }
}

/**
 * Whether a fork build may install over the current install. Same-owner
 * rebuilds order by counter; stock↔fork and cross-owner pairs refuse.
 * Stock→stock stays governed by the caller's semver compare.
 */
export function isForkCounterUpgrade(current: string, candidate: string): boolean {
  const from = parseForkVersion(current)
  const to = parseForkVersion(candidate)
  if (from === null || to === null) return false
  if (from.owner !== to.owner || from.base !== to.base) return false
  return to.counter > from.counter
}

/** True when both versions are stock (no fork suffix on either side). */
export function isStockPair(current: string, candidate: string): boolean {
  return parseForkVersion(current) === null && parseForkVersion(candidate) === null
}

/**
 * The `channel: 'latest'` gate refuses prereleases; a fork feed serves
 * `-fh.<owner>.<n>` prereleases by design, so the check must accept a
 * same-owner counter upgrade on the ForkHub feed.
 */
export function isVersionAllowedOnForkFeed(current: string, candidate: string): boolean {
  if (isStockPair(current, candidate)) return true
  return isForkCounterUpgrade(current, candidate)
}
