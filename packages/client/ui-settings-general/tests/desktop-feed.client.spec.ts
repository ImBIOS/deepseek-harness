import { expect, it, vi } from 'vitest'
import { DesktopFeedSource } from '../src/client/desktop-feed-source.ts'
import type { DesktopFeedChangeResult, DesktopFeedState } from '../src/types.ts'

const withFh: DesktopFeedState = { owner: 'with-fh', repo: '.forkhub' }

function fixture() {
  const get = Promise.withResolvers<DesktopFeedState>()
  const set = Promise.withResolvers<DesktopFeedChangeResult>()
  const apply = vi.fn(() => set.promise)
  const source = new DesktopFeedSource({ get: () => get.promise, set: apply })
  return { source, get, set, apply }
}

it('seeds the input from the shell feed and applies a validated owner', async () => {
  const f = fixture()
  f.get.resolve(withFh)
  await f.get.promise
  expect(f.source.store.getSnapshot().input).toBe('with-fh')
  f.source.edit('ImBIOS')
  const pending = f.source.check()
  expect(f.source.store.getSnapshot().checking).toBe(true)
  const applied: DesktopFeedState = { owner: 'ImBIOS', repo: '.forkhub', releases: 3 }
  f.set.resolve({ kind: 'applied', state: applied, releases: 3, message: 'ImBIOS/.forkhub serves 3 release(s)' })
  await pending
  const snapshot = f.source.store.getSnapshot()
  expect(snapshot.state).toEqual(applied)
  expect(snapshot.checking).toBe(false)
  expect(snapshot.notice?.tone).toBe('success')
  f.source.dispose()
})

it('surfaces validation failure without changing the feed', async () => {
  const f = fixture()
  f.get.resolve(withFh)
  await f.get.promise
  f.source.edit('nobody-there')
  const pending = f.source.check()
  const failed: DesktopFeedState = { owner: 'with-fh', repo: '.forkhub' }
  f.set.resolve({ kind: 'failed', state: failed, message: 'nobody-there/.forkhub does not exist (private catalogs unsupported)' })
  await pending
  const snapshot = f.source.store.getSnapshot()
  expect(snapshot.state).toEqual(failed)
  expect(snapshot.notice?.tone).toBe('error')
  expect(snapshot.notice?.text).toMatch(/does not exist/)
  f.source.dispose()
})

it('ignores empty input and dismisses notices by sequence', async () => {
  const f = fixture()
  f.get.resolve(withFh)
  await f.get.promise
  f.source.edit('   ')
  await f.source.check()
  expect(f.apply).not.toHaveBeenCalled()
  f.source.edit('with-fh')
  const pending = f.source.check()
  f.set.resolve({ kind: 'applied', state: withFh, releases: 1, message: 'ok' })
  await pending
  expect(f.source.store.getSnapshot().notice?.sequence).toBe(1)
  f.source.dismissNotice(1)
  expect(f.source.store.getSnapshot().notice).toBeUndefined()
  f.source.dispose()
})
