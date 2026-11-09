# Design audit

Static review (grep and reading the pages), 2026-11-09. Not checked in a browser: mobile layouts,
the light theme and long Russian or Kazakh strings still need a manual pass.

## Already in line with the design system

- No hex or rgb values in `.module.css`; durations only through `--dur-*`.
- `prefers-reduced-motion` and `prefers-contrast` are handled; `lang` follows the locale; `theme-color` is synced.
- Skip link, Tonight chip, Offline pill, toasts above the tab bar.
- Every route from the page map exists, with loading, empty and error states where they apply.
- `rating-*` colours are used only by RatingBadge and the heatmap.

## Done

- Plan (calendar) hover action on catalog cards, with an icon-only `ButtonLink`.

## Open

P1
1. Hover actions on cards. The design puts Add and Plan on every PosterCard. Only the catalog has
   them (List and Plan). Missing in Trending, Library, list items and recommendations. The catalog
   has no Add to library. Needs a decision: what Add means per card, and whether movies get Plan
   before the planner supports them.
2. Touch targets under 44px: the Toast action (36), inline buttons in Field (32), SelectField (40),
   Chip (32; only `a.link` grows on `pointer: coarse`). Fix with `@media (pointer: coarse)`.

P2
3. Heatmap best/worst mark uses `font-size: 9px`; the minimum is 11px.
4. `SelectField.module.css` uses `--surface-2`, which is not a token (use `--surface-sunken` or
   `--surface-raised`), and a hex colour inside the arrow data URL (use a mask with `currentColor`).
5. Spacing off the 4/8 scale: `10px 0` in Field and Select, `gap: 10px` in Logo,
   `margin-top: 26px` in ShareDialog, `7px` in Notifications, `0 5px` in CounterBadge.
6. `text-transform: uppercase` outside `overline`: SelectField, CalendarMonth weekday heads,
   WhereToWatch, TitleHero. Check whether each is a kicker; remove it where it is not.

## Left as is

- Radii of 3px, 2px and 50% (tab underline, dialog handle, markers, round elements): decoration
  outside the radius scale, not worth the risk.
- "About Avleron" instead of Movietime: deliberate rebrand.
- SharedWithYou and ContinueWatching hide themselves when empty or failed, with no skeleton. Home is
  a summary, so this differs from the per-section ErrorState in the page map on purpose.
