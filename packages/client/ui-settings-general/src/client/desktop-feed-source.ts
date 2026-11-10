/** One shell-owned ForkHub publisher subscription for the Settings Version row. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { DesktopFeedBridge, DesktopFeedState } from '../types.ts'

/** Shell state, typed owner input, and transient validation feedback. */
export interface DesktopFeedSnapshot {
  state?: DesktopFeedState
  failed: boolean
  input: string
  checking: boolean
  notice?: { sequence: number; tone: 'success' | 'error'; text: string }
}

/** Client observation; no catalog fetch happens here — the shell validates. */
export class DesktopFeedSource {
  /** Stable observation shared by the Version row. */
  readonly store = createSnapshotStore<DesktopFeedSnapshot>({ failed: false, input: '', checking: false })
  private live = true
  private sequence = 0

  /** @param bridge - Isolated shell API, present only in Desktop. */
  constructor(private readonly bridge: DesktopFeedBridge) {
    void bridge.get().then((state) => {
      if (!this.live) return
      this.store.set({ ...this.store.getSnapshot(), state, failed: false, input: state.owner })
    }, () => {
      if (!this.live) return
      this.store.set({ ...this.store.getSnapshot(), failed: true })
    })
  }

  /** Edit the owner input without validating yet. */
  edit(input: string): void {
    if (!this.live) return
    this.store.set({ ...this.store.getSnapshot(), input })
  }

  /**
   * Validate the typed owner: the shell checks the catalog, persists the
   * owner on success, repoints the live updater feed, and checks
   * immediately. Nothing persists on failure.
   */
  async check(): Promise<void> {
    if (!this.live || this.store.getSnapshot().checking) return
    const input = this.store.getSnapshot().input.trim()
    if (input === '') return
    this.store.set({ ...this.store.getSnapshot(), checking: true })
    let message: string | undefined
    let releases = 0
    let applied = false
    try {
      const result = await this.bridge.set(input)
      applied = result.kind === 'applied'
      message = result.message
      releases = result.kind === 'applied' ? result.releases : 0
      if (this.live) {
        this.store.set({ ...this.store.getSnapshot(), state: result.state, failed: false,
          notice: { sequence: ++this.sequence, tone: applied ? 'success' as const : 'error' as const, text: message } })
      }
    } catch {
      if (this.live) {
        this.store.set({ ...this.store.getSnapshot(), failed: true,
          notice: { sequence: ++this.sequence, tone: 'error' as const, text: 'Catalog check failed' } })
      }
    } finally {
      if (this.live) this.store.set({ ...this.store.getSnapshot(), checking: false })
    }
    void releases
    void applied
  }

  /** Retire only the toast whose animation completed. */
  dismissNotice(sequence: number): void {
    const current = this.store.getSnapshot()
    if (current.notice?.sequence !== sequence) return
    const { notice: _notice, ...next } = current
    this.store.set(next)
  }

  /** Detach and ignore late IPC responses. */
  dispose(): void { this.live = false }
}
