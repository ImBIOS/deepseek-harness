/** ForkHub rebuild identity: fork versions extend the product prerelease in
 * DSH's native `<base>.<date>.<n>` form, with the ForkHub owner folded into
 * a dedicated owner field as `<base>.<owner>.<date8>.<n>` (e.g.
 * `0.2.2-rc.1.with-fh.20261110.1`, which the DSH build validator accepts
 * because it still extends the product prerelease before the owner field).
 * Pure-numeric date/counter fields keep semver precedence exact
 * (numeric < alphanumeric, so a stock date-build never outranks a fork
 * build by accident); same-owner rebuilds order by the trailing counter
 * within one date, stock<->fork and cross-owner pairs refuse. The updater
 * allows prereleases on a feed that contains ONLY fork builds. Upstream has
 * no `.forkhub` repo, so stock builds never see fork builds and vice versa.
 */

const FORK_PATTERN = /^(.+?)\.((?=[a-zA-Z0-9-]{1,39}\.)(?:[a-zA-Z0-9-]*[a-zA-Z][a-zA-Z0-9-]*))\.(\d{8})\.(\d+)$/

export type ForkIdentity = { base: string; owner: string; date: string; counter: number } | null

/**
 * Split `<base>.<owner>.<date8>.<n>` into its parts; anything else (stock,
 * upstream `dsh-v*` tags, date-builds without an owner field) yields null.
 * The owner field is what distinguishes a fork build from a stock
 * date-build, so same-shape comparisons stay exact.
 */
export function parseForkVersion(version: string): ForkIdentity {
  const match = FORK_PATTERN.exec(version.trim())
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined || match[4] === undefined) {
    return null
  }
  const counter = Number.parseInt(match[4], 10)
  if (!Number.isSafeInteger(counter)) return null
  return { base: match[1], owner: match[2].toLowerCase(), date: match[3], counter }
}

/**
 * Whether a fork build may install over the current install. Same-owner,
 * same-date rebuilds order by counter; stock↔fork and cross-owner pairs
 * refuse. Stock→stock stays governed by the caller's semver compare.
 */
export function isForkCounterUpgrade(current: string, candidate: string): boolean {
  const from = parseForkVersion(current)
  const to = parseForkVersion(candidate)
  if (from === null || to === null) return false
  if (from.owner !== to.owner || from.base !== to.base || from.date !== to.date) return false
  return to.counter > from.counter
}

/** True when both versions are stock (no fork suffix on either side). */
export function isStockPair(current: string, candidate: string): boolean {
  return parseForkVersion(current) === null && parseForkVersion(candidate) === null
}

/**
 * The `channel: 'latest'` gate refuses prereleases; a fork feed serves
 * owner-stamped prereleases by design, so the check must accept a
 * same-owner counter upgrade on the ForkHub feed.
 */
export function isVersionAllowedOnForkFeed(current: string, candidate: string): boolean {
  if (isStockPair(current, candidate)) return true
  return isForkCounterUpgrade(current, candidate)
}
