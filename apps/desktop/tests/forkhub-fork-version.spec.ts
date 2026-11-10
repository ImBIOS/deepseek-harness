import { describe, expect, it } from 'vitest'
import { isForkCounterUpgrade, isStockPair, isVersionAllowedOnForkFeed, parseForkVersion } from '../src/forkVersion.ts'

describe('forkhub rebuild identity', () => {
  it('parses owner-stamped versions, yields null for stock', () => {
    // Fork versions extend the product prerelease in DSH's native
    // `<base>.<date>.<n>` form with the owner folded in:
    // `0.2.2-rc.1.with-fh.20261110.1` — accepted by the build validator.
    expect(parseForkVersion('0.2.2-rc.1.with-fh.20261110.1')).toEqual(
      { base: '0.2.2-rc.1', owner: 'with-fh', date: '20261110', counter: 1 })
    expect(parseForkVersion('0.2.2')).toBeNull()
    expect(parseForkVersion('0.2.2-rc.1')).toBeNull()
    expect(parseForkVersion('0.2.2-rc.1.20261110.1')).toBeNull()
    expect(parseForkVersion('dsh-v0.2.2-rc.1')).toBeNull()
  })

  it('orders same-owner rebuilds by counter, refuses stock/fork and cross-owner pairs', () => {
    expect(isForkCounterUpgrade('0.2.2-rc.1.with-fh.20261110.1', '0.2.2-rc.1.with-fh.20261110.2')).toBe(true)
    expect(isForkCounterUpgrade('0.2.2-rc.1.with-fh.20261110.2', '0.2.2-rc.1.with-fh.20261110.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-rc.1', '0.2.2-rc.1.with-fh.20261110.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-rc.1.with-fh.20261110.1', '0.2.2-rc.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-rc.1.with-fh.20261110.1', '0.2.2-rc.1.imbios.20261110.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-rc.1.with-fh.20261110.1', '0.2.3-rc.1.with-fh.20261110.1')).toBe(false)
  })

  it('stock pairs stay governed by semver; fork feed accepts same-owner counter upgrades', () => {
    expect(isStockPair('0.2.2-rc.1', '0.2.2-rc.2')).toBe(true)
    expect(isStockPair('0.2.2-rc.1', '0.2.2-rc.1.with-fh.20261110.1')).toBe(false)
    expect(isVersionAllowedOnForkFeed('0.2.2-rc.1', '0.2.2-rc.2')).toBe(true)
    expect(isVersionAllowedOnForkFeed('0.2.2-rc.1.with-fh.20261110.1', '0.2.2-rc.1.with-fh.20261110.2')).toBe(true)
    expect(isVersionAllowedOnForkFeed('0.2.2-rc.1', '0.2.2-rc.1.with-fh.20261110.1')).toBe(false)
  })
})
