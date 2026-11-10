/** Type-only Electron update declarations shared by the settings UI and Desktop compatibility checks. */

/** Classified failure copy selected by the Web locale without exposing raw updater diagnostics. */
export type DesktopUpdateFailureKind =
  | 'check'
  | 'check-network'
  | 'download'
  | 'download-network'
  | 'install'
  | 'install-network'
  | 'stop-failed'
  | 'tasks-changed'
  | 'tasks-unavailable'
  | 'fullscreen-timeout'

/** Public semantic preload fields consumed by the settings row. */
export interface DesktopUpdatePresentation {
  readonly phase: 'idle' | 'checking' | 'available' | 'downloading' | 'verifying' | 'installing' | 'ready' | 'error'
  readonly version?: string
  readonly percent?: number
  readonly failure?: DesktopUpdateFailureKind
}

/** Optional carrier API; it cannot select artifacts or authorize installation. */
export interface DesktopUpdateBridge {
  status(): Promise<DesktopUpdatePresentation>
  open(): Promise<void>
  subscribe(listener: (state: DesktopUpdatePresentation) => void): () => void
}

/** ForkHub publisher feed exposed through the isolated preload. */
export interface DesktopFeedState {
  readonly owner: string
  readonly repo: string
  readonly releases?: number
}

/** Outcome of one publisher Check; failures persist nothing. */
export type DesktopFeedChangeResult =
  | { readonly kind: 'applied'; readonly state: DesktopFeedState; readonly releases: number; readonly message: string }
  | { readonly kind: 'failed'; readonly state: DesktopFeedState; readonly message: string }

/** Shell-owned publisher catalog behind the Settings → Version row. */
export interface DesktopFeedBridge {
  /** @returns Current feed owner; resolved from the same single source as the updater. */
  get(): Promise<DesktopFeedState>
  /**
   * @param owner - Publisher to validate (public {owner}/.forkhub with ≥1 published release).
   * @returns Validation success persists the owner, repoints the live feed, and checks immediately.
   */
  set(owner: string): Promise<DesktopFeedChangeResult>
}

/** Optional carrier API; it cannot select artifacts or authorize installation. */
export interface DesktopUpdateBridgeWithFeed extends DesktopUpdateBridge {
  readonly feed: DesktopFeedBridge
}

/** Shared carrier status for the account row and collapsed sidebar badge. */
export interface DesktopUpdateView {
  readonly presentation?: DesktopUpdatePresentation
  readonly failed: boolean
  readonly opening: boolean
}
