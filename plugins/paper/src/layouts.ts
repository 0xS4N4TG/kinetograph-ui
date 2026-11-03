// The page layouts, apart from the code that draws them, so Studio's panel can list them without pulling in the
// engine. pages.ts re-exports both.

export type Layout = 'pull' | 'italic' | 'kicker' | 'body' | 'web' | 'post' | 'display' | 'tweet' | 'reddit' | 'comments';
export const LAYOUTS: readonly Layout[] = ['pull', 'italic', 'kicker', 'body', 'web', 'post', 'display', 'tweet', 'reddit', 'comments'];
/** Printed and article pages: what a look uses when it names no layouts. The social pages (`tweet`, `reddit`,
 *  `comments`) are screens, so a look picks them on purpose (the `web` preset does). */
export const PAGE_LAYOUTS: readonly Layout[] = ['pull', 'italic', 'kicker', 'body', 'web', 'post', 'display'];
/** Layouts that are app screens: they keep their own background (light or dark mode), whatever the look's tint. */
export const SCREEN_LAYOUTS: readonly Layout[] = ['tweet', 'reddit', 'comments'];
