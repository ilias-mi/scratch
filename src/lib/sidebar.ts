/** Default sidebar width in pixels when no override is set (16rem, the former `w-64`). */
export const SIDEBAR_DEFAULT_PX = 256;
/** Minimum allowed sidebar width in pixels. */
export const SIDEBAR_MIN_PX = 180;
/** Maximum allowed sidebar width in pixels. */
export const SIDEBAR_MAX_PX = 800;
/** How long the pointer must rest near the left edge before the sidebar is revealed. */
export const SIDEBAR_PEEK_SHOW_DELAY_MS = 150;
/** Delay before a hover-revealed sidebar hides after the pointer leaves it. */
export const SIDEBAR_PEEK_HIDE_DELAY_MS = 150;
/** Distance from the note editor's left edge within which the pointer reveals a hidden sidebar. */
export const SIDEBAR_PEEK_TRIGGER_PX = 48;
/** How far past the revealed sidebar's right edge the pointer may travel before it hides. */
export const SIDEBAR_PEEK_TOLERANCE_PX = 32;
