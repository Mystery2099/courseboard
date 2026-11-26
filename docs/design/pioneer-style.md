# Pioneer style

Nov 26, 2026 · @Mathew Kennedy-Brewer

## Overview

Pioneer replaces Blueprint's colors, type, and shapes. The demo centers on Alfred State College, so the palette comes from its [brand guide](https://www.alfredstate.edu/sites/default/files/documents/MarCom/PDF/Branding-Style-Guide_web.pdf): navy `#003C71`, light blue `#0085CA`, and gold `#FFCD00`. The structure takes more from Discord, Stoat, Teams, and Element: a navy space rail, a course banner over the channel list, channel icons, conversation cards, and replies that read as a chat timeline. It uses the school's colors but not its logo or wordmark, since this isn't an official college product.

Blueprint's [handoff](blueprint-handoff.md) still sets components, layout, interactions, and accessibility rules. Where the two disagree about how something looks, this file wins.

## Color roles

Roles keep their names in [`layout.css`](../../src/routes/layout.css), so components didn't change how they ask for color. A new theme, such as high contrast, only redefines these variables.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` | #F4F6F9 | #121519 | Page |
| `surface` | #FFFFFF | #1A1E24 | Cards, sheets, inputs, headers |
| `surface-container` | #ECF0F5 | #232831 | Code, stat cells, placeholders |
| `surface-sidebar` | #F7F9FB | #161A1F | Desktop channel list |
| `on-surface` / `on-surface-variant` / `body` | #141A22 / #4F5A68 / #222A35 | #EAEEF3 / #AEB7C3 / #D7DDE5 | Text |
| `primary` / `on-primary` | #003C71 / #FFFFFF | #66C2F2 / #00243F | Main buttons, links, focus ring, dock chip |
| `primary-container` / `on-…` | #D6E9F7 / #002849 | #12406A / #D6E9F7 | Question chips, mentions, course tiles |
| `secondary-container` / `on-…` | #DBE6F1 / #0F2236 | #263A52 / #EAEEF3 | Current channel, tonal buttons |
| `tertiary-container` / `on-…` | #FFF0C2 / #3D3000 | #4A3D00 / #FFF0B3 | Review and discussion chips |
| `outline` / `outline-variant` | #7A8594 / #D5DCE5 | #7F8A99 / #323843 | Control borders / dividers and card edges |
| `success-container` / `on-…` | #D7F0E1 / #0B4D2E | #1C4732 / #D3F1E0 | Answered, the accepted answer |
| `selected-chip` / `on-selected-chip` | #141A22 / #FFFFFF | #EAEEF3 / #1A1E24 | Selected filter chips, inverted so selection doesn't rest on a faint tint |
| `rail` / `on-rail` | #003C71 / #FFFFFF | #0A2A4A / #FFFFFF | Desktop space rail |
| `gold` / `on-gold` | #FFCD00 / #002849 | same | Where you are on the rail, the accepted answer's star |
| `indicator` | #0085CA | #FFCD00 | Current phone channel tab underline |
| `banner` | navy → #005A96 | #0A2A4A → #0F3A63 | Course banner, profile header |

Error, warning, scrim, and the state-layer percentages are unchanged from Blueprint.

**Gold is rationed.** It marks the current space on the rail (tile and pill), the rail's focus ring, and the accepted answer's star. It never sits on white as a surface or text color, since gold on white is only 1.5:1. Light blue is 4.0:1 on white, so it's used for the tab underline and other non-text parts, never small text.

## Type

| Role | Family | Notes |
| --- | --- | --- |
| Headings | Roboto Condensed | Alfred State's own typeface. Bold, for titles and card headings |
| Interface and replies | Atkinson Hyperlegible Next | Designed for legibility at small sizes |
| Posts and reviews | Literata | Unchanged |
| Course codes and code | IBM Plex Mono | Unchanged |

Section labels (`text-overline`) are sentence case now, not tracked capitals.

## Shape

- **Radius:** chip 8 · field 10 · card 12 · tile 14 · sheet and dialog 28 (unchanged) · buttons and the dock stay pills.
- **Avatars** are plain circles. Blueprint's squared-off corner, scalloped hero, and tilted create button are gone.
- **No grid backgrounds.** Headers are plain surfaces; the desktop course banner and profile header use the `banner` gradient.

## Components

- **Space rail:** navy in both themes. The current space gets a gold tile and a gold pill on the rail's edge, as in Discord, instead of a ring.
- **Course sidebar (desktop):** a banner with the code, title, and school, then the channels with icons (grid, question, star, #).
- **Channel tabs (phone):** four equal tabs with an underline replace the scrolling chip strip, so every channel shows without scrolling.
- **Post lists:** separate conversation cards with the author, badges, title, and a reply count row, as in Teams. The Questions channel doesn't repeat the Question badge. Cards don't show an excerpt yet, since the list API doesn't send post text.
- **Replies:** no bubble; they read as a chat timeline. Only the accepted answer gets a tinted panel, with a gold star beside "Accepted answer".
- **Dock:** the space chip is filled with `primary`.

## Accessibility

Every text pair above passes WCAG 2.1 AA for normal text in both themes, and borders on controls are at least 3:1. Signals never rely on color alone: the current channel is bold with a fill or underline, the current space has a pill and a gold tile, and the accepted answer and mentions keep their words.
