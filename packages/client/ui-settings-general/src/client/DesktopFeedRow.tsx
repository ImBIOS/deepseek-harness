/** Settings → Version → ForkHub publisher row: validate a catalog owner, persist it, repoint the live feed. */
import { useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { DesktopFeedSource } from './desktop-feed-source.ts'
import css from './DesktopChannelRow.module.css'

/** Framework-bound shell state and explicit Check action. */
export interface DesktopFeedRowInjected {
  hooks: { feed: DesktopFeedSource['store'] }
  edit(input: string): void
  check(): Promise<void>
  dismiss(sequence: number): void
}

/**
 * Render the ForkHub publisher input above the update check: typing an
 * owner and pressing Check validates the catalog, persists the owner,
 * repoints the live updater feed, and checks immediately. Nothing
 * persists on failure; upstream has no `.forkhub` repo so it can never
 * validate as a publisher.
 */
export function DesktopFeedRow({ useFeed, edit, check, dismiss, t }:
  PropsRuntime<'settings.general.item'> & PropsLocale<'settings'> & InjectFace<DesktopFeedRowInjected>) {
  const { state, failed, input, checking, notice } = useFeed(value => value)
  const [focused, setFocused] = useState(false)
  void focused
  const busy = checking
  return <div className={css.row} role="group" aria-label={t('desktop.feed.title')}>
    <div className={css.rowText}>
      <div className={css.title}>{t('desktop.feed.title')}</div>
      <div className={css.description}>{t('desktop.feed.description')}</div>
      {(failed || state === undefined) && <div role="alert">{t('desktop.feed.unavailable')}</div>}
      {notice !== undefined && <div role={notice.tone === 'error' ? 'alert' : 'status'}>
        {notice.text}
        <button type="button" onClick={() => { dismiss(notice.sequence) }} aria-label={t('desktop.feed.dismiss')}>
          {t('desktop.feed.dismiss')}
        </button>
      </div>}
    </div>
    <div>
      <input type="text" value={input} disabled={busy || state === undefined}
        aria-label={t('desktop.feed.title')}
        placeholder="with-fh"
        onChange={(event) => { edit(event.currentTarget.value) }}
        onFocus={() => { setFocused(true) }}
        onBlur={() => { setFocused(false) }} />
      <button type="button" disabled={busy || state === undefined || input.trim() === ''}
        aria-busy={busy} aria-label={t('desktop.feed.check')}
        onClick={() => { void check() }}>
        {t('desktop.feed.check')}
      </button>
      {state !== undefined && <div>{t('desktop.feed.current', { owner: state.owner })}</div>}
    </div>
  </div>
}
