import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  FORKHUB_DEFAULT_OWNER,
  FORKHUB_DEFAULT_REPO,
  bakedUpdateDefaultFromManifest,
  checkPublisherCatalog,
  getUpdateFeed,
  normalizeUpdateOwner,
} from '../src/updateFeed.ts'

describe('forkhub update feed', () => {
  it('normalizes owner logins, rejecting bad input', () => {
    expect(normalizeUpdateOwner('with-fh')).toBe('with-fh')
    expect(normalizeUpdateOwner('  ImBIOS  ')).toBe('ImBIOS')
    expect(normalizeUpdateOwner('')).toBeNull()
    expect(normalizeUpdateOwner('-lead')).toBeNull()
    expect(normalizeUpdateOwner('trail-')).toBeNull()
    expect(normalizeUpdateOwner('has space')).toBeNull()
    expect(normalizeUpdateOwner('a'.repeat(40))).toBeNull()
    expect(normalizeUpdateOwner(42)).toBeNull()
  })

  it('defaults to with-fh/.forkhub with no configuration', () => {
    expect(getUpdateFeed({ persistedOwner: () => null, envOwner: () => null, bakedDefault: () => null }))
      .toEqual({ owner: FORKHUB_DEFAULT_OWNER, repo: FORKHUB_DEFAULT_REPO })
  })

  it('orders persisted override above env above baked default', () => {
    const baked = { owner: 'baked-owner', repo: '.forkhub' as const }
    expect(getUpdateFeed({ persistedOwner: () => 'picked', envOwner: () => 'env-owner', bakedDefault: () => baked }).owner)
      .toBe('picked')
    expect(getUpdateFeed({ persistedOwner: () => null, envOwner: () => 'env-owner', bakedDefault: () => baked }).owner)
      .toBe('env-owner')
    expect(getUpdateFeed({ persistedOwner: () => null, envOwner: () => null, bakedDefault: () => baked }).owner)
      .toBe('baked-owner')
  })

  it('reads the baked default from packaged manifest extraMetadata', () => {
    expect(bakedUpdateDefaultFromManifest({ build: { extraMetadata: { forkhubUpdateOwner: 'ImBIOS' } } }))
      .toEqual({ owner: 'ImBIOS', repo: '.forkhub' })
    expect(bakedUpdateDefaultFromManifest({})).toBeNull()
    expect(bakedUpdateDefaultFromManifest({ build: { extraMetadata: {} } })).toBeNull()
  })
})

describe('forkhub publisher validation', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('passes when the catalog repo has published releases', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      { tag_name: 'v0.2.2-fh.with-fh.1', draft: false },
      { tag_name: 'draft-tag', draft: true },
    ]), { status: 200 })) as unknown as typeof fetch
    const result = await checkPublisherCatalog('with-fh', fetchImpl)
    expect(result).toEqual({ ok: true, owner: 'with-fh', repo: '.forkhub', releases: 1, message: 'with-fh/.forkhub serves 1 release(s)' })
  })

  it('fails distinctly for missing repo, empty catalog, and bad input', async () => {
    const notFound = vi.fn(async () => new Response('{}', { status: 404 })) as unknown as typeof fetch
    expect((await checkPublisherCatalog('nobody-there', notFound)).ok).toBe(false)
    const empty = vi.fn(async () => new Response(JSON.stringify([{ tag_name: 'x', draft: true }]), { status: 200 })) as unknown as typeof fetch
    const emptyResult = await checkPublisherCatalog('some-owner', empty)
    expect(emptyResult.ok).toBe(false)
    expect(emptyResult.message).toMatch(/no published releases/)
    const bad = await checkPublisherCatalog('not an owner!')
    expect(bad.ok).toBe(false)
  })
})
