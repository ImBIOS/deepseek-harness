import { describe, expect, it } from 'vitest'
import { isForkCounterUpgrade, isStockPair, isVersionAllowedOnForkFeed, parseForkVersion } from '../src/forkVersion.ts'

describe('forkhub rebuild identity', () => {
  it('parses -fh.<owner>.<n> versions, yields null for stock', () => {
    expect(parseForkVersion('0.2.2-fh.with-fh.1')).toEqual({ base: '0.2.2', owner: 'with-fh', counter: 1 })
    expect(parseForkVersion('0.2.2')).toBeNull()
    expect(parseForkVersion('0.2.2-rc.1')).toBeNull()
    expect(parseForkVersion('dsh-v0.2.2-rc.1')).toBeNull()
  })

  it('orders same-owner rebuilds by counter, refuses stock/fork and cross-owner pairs', () => {
    expect(isForkCounterUpgrade('0.2.2-fh.with-fh.1', '0.2.2-fh.with-fh.2')).toBe(true)
    expect(isForkCounterUpgrade('0.2.2-fh.with-fh.2', '0.2.2-fh.with-fh.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2', '0.2.2-fh.with-fh.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-fh.with-fh.1', '0.2.2')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-fh.with-fh.1', '0.2.2-fh.imbios.1')).toBe(false)
    expect(isForkCounterUpgrade('0.2.2-fh.with-fh.1', '0.2.3-fh.with-fh.1')).toBe(false)
  })

  it('stock pairs stay governed by semver; fork feed accepts same-owner counter upgrades', () => {
    expect(isStockPair('0.2.2', '0.2.3')).toBe(true)
    expect(isStockPair('0.2.2', '0.2.2-fh.with-fh.1')).toBe(false)
    expect(isVersionAllowedOnForkFeed('0.2.2', '0.2.3')).toBe(true)
    expect(isVersionAllowedOnForkFeed('0.2.2-fh.with-fh.1', '0.2.2-fh.with-fh.2')).toBe(true)
    expect(isVersionAllowedOnForkFeed('0.2.2', '0.2.2-fh.with-fh.1')).toBe(false)
  })
})
