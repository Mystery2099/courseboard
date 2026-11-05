# Blueprint design handoff

> Scope update, November 5, 2026: the [current product spec](../product/product-spec.md) and [decision register](../planning/decision-register.md) supersede older scope and open decisions below. General communities, Experience posts, grades, Home, presence, advanced desktop views, and MFA are deferred. Access requires admission and login, including images.

Nov 3, 2026 · @Mathew Kennedy-Brewer

## Overview

This is the detailed reference for the Blueprint designs I worked through with Claude for the academic discussion platform. I wanted a recognizable visual identity, both light and dark themes, and some Material 3 Expressive influence without making the app feel like a generic Material demo. The tables and numbers here are the actual handoff details, so they should be followed where the designs are canonical; the open questions are still open, regardless of what a particular artboard happens to show.

**Where the designs actually live** (in Claude Design):

| Canvas page | What it holds | Status |
| --- | --- | --- |
| Screens v1 | Sign-in, onboarding, home, explore, sheets and dialogs, long review, profiles, settings, moderation and admin, tablet | Canonical |
| Blueprint · Mobile & Desktop | Course space, thread, editor, combined desktop overview, split-pane discussion, Focus, command bar, Search tab | Canonical artboards listed on its orange note. Others there are superseded studies |
| Exploration | Early sketches, channel models, palette lab | Reference only |

**Reading the artboards:** Claude set them up with Tweaks for `theme` (light/dark), `device` (390 × 844 or 360 × 640), and their applicable `state`, `kind`, `mode`, and `step` values. That's useful because light, dark, and small-phone variants come from the same source rather than being entirely separate drawings. Play mode connects some of the screens, but any link using `#` is still a placeholder, not a functioning route.

## Consistency review

We found nine inconsistencies while reviewing the designs. Claude fixed eight of them on the canvas, while the last one is a rule for implementation rather than another round of redrawing. I'm leaving the details here because I don't want an agent copying an older screen and accidentally reintroducing something we already decided to change.

| Area | Problem found | Fix applied |
| --- | --- | --- |
| History visibility | Defaults were “Members”. Three options (Only me / Members / Public) overlapped, because “Members” and “Public” differ only if logged-out viewing exists | Two options now: **Private** (default) and **Visible on profile** (anyone signed in). Updated in onboarding, Add course, profiles and settings |
| Self-reported labels | Some lists showed “Took it · Fall ’25” with no qualifier | Every person-attached course status now reads “… · self-reported”, with no checkmark and no verified color |
| Course status on replies | Reply bylines repeated “took it Fall ’25” | Course status appears only on the author of the original post, on member lists and on profile cards, never on replies |
| Reply typography | Replies used Literata like posts | Posts and reviews use Literata. Replies and comments use Inter 15–17px |
| Presence vs. directory | A “Show me in member lists” toggle contradicted the rule that appearing offline keeps you in the directory | Toggle removed. Only “Show when I’m online” remains. Members always appear in member lists |
| Registration copy | Placeholders said `you@school.edu` and “School or personal email” | “Email”, `you@example.com`, plus helper text: “Any email works. You add schools to your profile later.” |
| Review disclosure | The review gate didn’t say a review reveals the course | Gate copy now says the review shows you took it even if the history entry stays private |
| Profile preview | “Preview as members” referred to the old option | “Preview as others” |
| Dock shapes | Older artboards used a two-row dock (pill above tabs) | **Build rule:** the one-row dock is canonical. Older artboards are marked superseded |

**Some smaller visual differences aren't worth another design pass:** older cards have 18–24px radii, chip heights range from 30–40px, and section labels use slightly different letter spacing. Use the token values below instead of blindly copying whatever pixel value happens to be in an older artboard.

## Design tokens

I kept the Material 3-style role names because they map cleanly onto shadcn-svelte variables, and that should make the actual Tailwind setup less annoying. Define the variables on `:root`, override them under `.dark`, then expose the colors through Tailwind 4's `@theme inline` (for example, `--color-primary: var(--primary)`). Don't invent a second palette just because the framework has its own defaults.

### Color roles

Claude's design review checked the color pairings against WCAG 2.1 AA, with dark `outline` on `surface` reported as the lowest contrast at 3.05:1; that's for borders, not body text. We still need to check the *implemented* interface rather than treating a design-token check as proof that every real component is accessible.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `background` | #F3F6FF | #0B1222 | Page |
| `surface` | #FFFFFF | #121C33 | Cards, sheets, inputs |
| `surface-container` | #E7ECFA | #1A2642 | Code blocks, reply bar, stat cards |
| `surface-sidebar` | #EAEFFC | #0F1830 | Desktop rail, side panels |
| `on-surface` | #0F1A33 | #E4EBFF | Primary text (15.7–16:1) |
| `on-surface-variant` | #44506B | #AAB6D3 | Secondary text (7.4–9.2:1) |
| `body` | #1F2A44 | #D2DBF2 | Long-form post text |
| `primary` | #1F4FD8 | #5EE1FF | Main buttons, links, active rail ring |
| `on-primary` | #FFFFFF | #002A35 | Text on primary (6.6 / 9.9:1) |
| `primary-container` | #BDEBFF | #26407A | Space chip, course icons, own avatar |
| `on-primary-container` | #00222E | #DCE5FF | Text on primary-container |
| `secondary-container` | #D5DEFA | #22305A | Selected chip, tab indicator, Joined button |
| `on-secondary-container` | #0F1A33 | #E4EBFF | Text on secondary-container |
| `tertiary-container` | #FFDCC2 | #FFA65C | Post-type chips (Review, Discussion), community icons |
| `on-tertiary-container` | #5A2400 | #3A1700 | Text on tertiary-container |
| `outline` | #7883A0 | #5B6888 | Input and button borders (3:1+) |
| `outline-variant` | #C9D2E8 | #26324F | Dividers, card borders |
| `error` / `on-error` | #B3261E / #FFFFFF | #FFB4AB / #690005 | Destructive actions |
| `error-container` / `on-error-container` | #FFDAD6 / #410E0B | #5C1A14 / #FFDAD6 | Error banners, report reasons |
| `warning-container` / `on-warning-container` | #FFE7B3 / #3D2A00 | #4A3800 / #FFE7B3 | Offline, duplicate warnings |
| `success-container` / `on-success-container` | #C9F2DA / #0B3D23 | #174A31 / #C9F2DA | “Took” status, All clear |
| `inverse-surface` / `inverse-on-surface` | #1F2A44 / #EEF2FF | #E4EBFF / #1A2238 | Snackbars |
| `presence-online` | #1E8E5A | #5EE19A | Online dot, always paired with a “Here now” label |
| `grid-line` | rgba(31,79,216,0.07) | rgba(94,225,255,0.06) | Blueprint grid behind headers |
| `scrim` | rgba(15,26,51,0.45) | rgba(0,0,0,0.6) | Behind sheets and dialogs |

### Typography

The type choices are pretty deliberate: **Space Grotesk** for headings, **Inter** for the interface and shorter replies, **Literata** for longer posts and reviews, and **IBM Plex Mono** for course codes and code. I especially want course codes to stay monospace; it's one of the little things that makes Blueprint feel consistent.

| Token | Family | Size / line height | Weight | Used for |
| --- | --- | --- | --- | --- |
| `display` | Space Grotesk | 34–52 / 1.05 | 700 | Desktop hero, auth panel |
| `headline` | Space Grotesk | 24–28 / 1.15 | 700 | Screen and thread titles (−10 at 360px) |
| `title` | Space Grotesk | 16–20 / 1.3 | 700 | Card titles, section headings |
| `body-long` | Literata | 16–18 / 1.65–1.7 | 400 | Post and review body (18 desktop, 17 mobile) |
| `body` | Inter | 15–16 / 1.55 | 400 | Replies, descriptions, form text |
| `label` | Inter | 13–14 | 600 | Buttons, chips, field labels |
| `caption` | Inter | 12 | 400–500 | Meta lines, timestamps |
| `overline` | Inter | 11–12, tracking 0.08em, uppercase | 700 | Section labels (“HERE NOW”) |
| `mono` | IBM Plex Mono | 11–14 | 500–600 | Course codes, inline code, code blocks |

Mobile form inputs should be at least 16px so iOS doesn't zoom the page every time someone taps into a field.

### Spacing, shape, elevation, motion

- **Spacing:** a 4px base, with 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 in use. Mobile side gutters are 16px (20 in reading views). Desktop pane padding is 24–32px.
- **Radius:** chip 8 (filter) or full (assist/status) · field 14 · card 20–22 · sheet 28 (top only) · dialog 28 · dock 30 (full) · icon tile 15 (course) or full (community).
- **Expressive shapes:** a scalloped “cookie” for the course hero icon, one squared-off corner on feature cards (`28 28 28 10`) and avatars (`14 50% 50% 50%`), and the create button tilted −6°. These are the only decorative shapes, so don’t add more.
- **Elevation:** flat by default. Use borders (`outline-variant`) for cards. Shadows only on floating elements: dock, snackbars and popovers `0 6px 20px` at 14% light / 50% dark, dialogs `0 24px 60px` at 35%.
- **Motion:** 150ms for state changes, 250ms for sheets and panels (M3 emphasized easing), and a spring scale for the create button. Respect `prefers-reduced-motion` and the in-app Reduce motion setting, which drops all slide and morph motion.
- **Size floors:** touch targets at least 44 × 44 (48 for dock items), desktop controls at least 36px tall.

## Component inventory

Most of the basic controls can come from shadcn-svelte/Bits UI with the Blueprint styling applied, while the more app-specific pieces—like the dock, space switcher, and post cards—need their own components. I'd build the reusable primitives first rather than hardcode a slightly different button, chip, or field into every screen.

### Primitives (shadcn-svelte / Bits UI)

| Component | Built on | Variants | States and rules |
| --- | --- | --- | --- |
| Button | `Button` | filled (primary) · tonal (secondary-container) · outlined · text · destructive · icon | hover, focus ring, pressed, disabled, loading (spinner, keeps width). Pill radius. Height 44 mobile / 40 desktop |
| Text field | `Input`, `Label` | default · search (pill, leading icon) | focus (2px primary), error (2px error border + red label + message below), helper text. Never placeholder-only labels |
| Textarea | `Textarea` | plain · Markdown body | autosize on desktop, fills the remaining height in the mobile editor |
| Filter chip | `ToggleGroup` (single) | 8px radius | selected = secondary-container with no checkmark icon. Height 32–36 |
| Segmented control | `ToggleGroup` | 2–5 segments, outlined | Year, Status, Notifications, Write/Preview |
| Status chip | `Badge` | course status (Taking / Took / Planning) · post type (Question / Discussion / Experience / Review) · role (Mod / Owner) · self-reported | full radius. Self-reported is outline-only, never filled or checked |
| Switch | `Switch` | — | 52 × 32. The whole row toggles it |
| Radio list | `RadioGroup` | card rows | selected = 2px primary border + secondary-container fill |
| Select | `Select` | — | term, school filter, sort |
| Tabs | `Tabs` | underline (profile) | 3px primary indicator |
| Bottom sheet | `Drawer` (vaul-svelte) | switcher · members · space menu · post menu · report · permission gate | drag handle, scrim, snap to content height, max 90% of the viewport, safe-area bottom padding |
| Dialog | `Dialog` / `AlertDialog` | report (desktop) · confirm delete · review gate | AlertDialog for destructive actions. The cancel button is focused first |
| Menu | `DropdownMenu` (desktop), Drawer (mobile) | post menu, space menu | moderator items in a separated group, shown only with permission |
| Popover | `Popover` | member preview card | opens on click/Enter, closes on Esc, returns focus |
| Command palette | `Command` inside `Dialog` | — | groups: Jump to · Posts · Actions. Arrow keys / Enter / Esc |
| Resizable panes | `Resizable` (paneforge) | list · reader | 3 snap widths per breakpoint, keyboard-resizable |
| Toast | `Sonner` | success · error · info (permission) | inverse surface. Above the dock on mobile. Undo where it applies |
| Skeleton | `Skeleton` | card | `aria-busy` on the list container |
| Avatar | `Avatar` | 28 · 32 · 40 · 60 · 80 · 88 | expressive corner shape. Initials fallback. Optional presence dot |
| Tooltip | `Tooltip` | — | desktop icon buttons only. Never the only label |

### App components

| Component | Composes | Variants | Notes |
| --- | --- | --- | --- |
| `FloatingDock` | Button, SpaceChip | browsing · reading (reply bar) · hidden (keyboard/editor) · tablet (labeled, max 560 wide) | see Key interactions |
| `SpaceChip` | Button | in a space (mono code + channel) · outside (“Spaces”) · compact (code only) | opens the switcher. Swipe changes channel |
| `SpaceRail` | Button, Tooltip | course tile (15px radius) · community tile (round) · past-courses folder · explore | 72px wide. The current space gets a 3px primary ring |
| `ChannelNav` | links | list (≥1100) · picker (<1100) | course channels fixed: Overview, Questions, Reviews, Discussion |
| `SpaceHeader` | Avatar, Button | course (stats, Join, Add to history) · community (owner, rules, Join) | blueprint grid background |
| `PostCard` | Status chip, Avatar | feed · list-pane row · compact search result | title in Space Grotesk, excerpt in Literata, meta in Inter |
| `PostBody` | Markdown renderer | post · review (adds facts grid) | renders Markdown: headings, lists, quote, code, images with caption. Shows “edited” in the meta line |
| `Reply` | Avatar | top level · nested (one level, 2px left rule) | Inter body. “Read more” past about 6 lines on mobile |
| `NewItemsNotice` | Button | dock button (“2 new ↓”) · list bar (“1 new post · show it”) · feed pill (“↑ 3 new posts”) | never moves the content |
| `MarkdownEditor` | Textarea, ToggleGroup, ImageTile | full screen (mobile) · inline (desktop reply, Focus) | toolbar: H, B, I, list, quote, code, image, Preview. Draft status line |
| `ImageTile` | — | uploaded (with ALT badge) · uploading (progress ring + %) · failed (Retry) · add | 76px mobile. Small screens collapse tiles into a summary chip |
| `MemberRow` | Avatar, Status chip | default · selected | shows academic status only if that entry is visible (see Privacy) |
| `MemberPreview` | Popover (desktop), Drawer (mobile) | full · private | membership date, visible academic info, recent posts in this space |
| `HistoryRow` | Status chip | own (with visibility label + edit) · others (no labels) | grouped by term and school |
| `ThreadMap` | links | — | ≥1920 only. Original post, replies, “You left off here”, new |
| `EmptyState` | illustration slot, Button | home · no results · all clear · private profile | one primary action at most |
| `StatusBanner` | — | offline (warning) · error (error) · duplicate (warning) | `role=status` or `role=alert` |

## Responsive layout

I'm treating 360px as the starting point, not as a tiny edge case to fix after desktop looks good. The design uses four main layout tiers, switching from mobile to desktop at 900px, so those should be custom Tailwind 4 breakpoints (`--breakpoint-*` in `@theme`) rather than whatever defaults happen to ship with Tailwind.

| Tier | Width | Navigation | Overview | Discussions | Side info (About / Members / People) |
| --- | --- | --- | --- | --- | --- |
| Phone | < 600 | One-row floating dock; space chip opens the switcher sheet | Single column, 16px gutters | List → full-screen thread with reading bar | Bottom sheets from the space header or switcher |
| Tablet portrait | 600–899 | Labeled floating dock, centered, max 560 | Column max 700, two-column card grid | Same as phone, wider column | Bottom sheets |
| Desktop compact | 900–1279 | Rail (72) + channel picker below 1100, channel list from 1100 | Feed column max 720 | Split pane: list 300–380 + reader | Overlay drawers from the right, closed by default |
| Desktop | ≥ 1280 | Rail + channel list (200–270) | Feed + right panel (280): About + Members, each collapsible | Split pane with resizable list. People panel is a toggle | Overview panel open by default. People closed by default |
| Wide (optional) | ≥ 1920 | same | same | Adds the thread map beside the text column (220–260) | People open by default from 2560 |

**Rules that hold at every size:**

- **Reading width:** the text column is capped at 680–760px. Extra width becomes margin or a pane, never longer lines.
- **Remembered state:** panel open/closed and list width are stored per screen type (all overviews share one setting; all discussions share another), not per space.
- **Collapse order** as width shrinks: People panel → thread map → channel list (becomes a picker) → mobile layout.
- **Phone-only behavior:** the dock floats 24px above the bottom on tall phones and 10px on 360 × 640. Content gets bottom padding equal to the dock height plus 16, so the last item is never hidden. Respect `env(safe-area-inset-*)`.
- **No horizontal page scroll at 360px.** Wide tables (admin) scroll inside their own box.

## Screens and flows

Claude organized the app into 18 screen groups. Home is the main jumping-off point, while the mobile dock or desktop rail/command bar should make the rest of the app easy to reach without burying everything in menus.

&#91;embedded content: main navigation flow · 9 screens\]

Most sheets and dialogs are overlays rather than separate routes; the mobile editor is the exception because it needs the whole screen.

| Screen | Canonical artboards | Reached from | States to build |
| --- | --- | --- | --- |
| Sign in / Create account | MAuth, DAuth | App start, sign out | default, error banner, field errors |
| Onboarding (school, profile, courses, spaces) | MOnboard (+Profile/Courses/Spaces), DAuthOnboard | After sign-up | per step, skip from step 2 |
| Home | MHome, DHome | Dock Home, rail Home | feed, loading, empty, offline, new posts |
| Explore / community preview | MExplore, DExplore | Switcher, empty Home | browse, preview (not joined), no results |
| Search | MSearch, DCommand, DExplore | Dock Search, Ctrl/Cmd+K | results, no results |
| Space overview | MOverview, DComboOverview | Switcher, rail, search | joined, not joined, panel open/closed, member preview |
| Channel list + thread | MThread, DComboDiscussion, DReviews | Overview, channel nav | reading, new replies, one-level nesting |
| Focus | DFocus | Thread header | reading, inline reply |
| Long review | MReviewRead, DReviews | Reviews channel | full Markdown, edited |
| Editor | MCompose (+Review/Small) | Create button, Reply | discussion, review, uploads, errors, preview |
| Sheets | MSheet (8 kinds) | Chip, member, post menu, report, gate | switcher, members, space menu, post menu, report, delete, review gate, toasts |
| Desktop dialogs | DDialog, DDialogReport, DReviewGate | Post menu, Write a review | report (with validation), review gate |
| Profile | MProfile, DProfile | Dock You, member preview | own, other, private |
| Add course to history | MAddCourse | Profile, onboarding, review gate | default, duplicate, required field |
| Settings | MSettings (+Appearance/Privacy), DSettings | Profile | main, appearance, privacy |
| Moderator reports | MModQueue | Space menu (moderators only) | queue, empty |
| Admin | DAdmin (reports, spaces, users, courses, denied) | Profile menu (admins only) | each tab, no permission |
| Tablet | TPortrait, TLandscape | — | portrait overview with draft banner, landscape split pane |

## Key interactions

### Floating dock (phone and tablet)

- **Layout:** one row, 60px tall: Home · space chip · Search · You · create (tilted −6°). Icon-only on phones, with `aria-label` on each. Labeled on tablets.
- **Inside a space:** the chip shows the mono code and the current channel, and counts as the Spaces tab (`aria-current`). Outside a space it reads “Spaces”.
- **Reading a thread:** the dock becomes the reading bar: compact chip · “Reply…” · new-replies button. Content never scrolls behind it without bottom padding.
- **Writing:** the dock is hidden whenever the editor or the keyboard is open.
- **Create button:** its target depends on context. In a channel it creates that channel’s post type. On Home it asks which space first.

### Space and channel switching

- **Phone:** tapping the chip opens the switcher sheet: pinned and recent tiles (★ = pinned), the current space’s channels with counts, Members, “Jump to a space…” and Explore.
- **Swipe:** swiping left or right on the chip moves to the next or previous channel. It’s a shortcut only: every swipe target is also reachable by tapping.
- **Desktop:** the rail and channel list do the same job, and Ctrl/Cmd+K reaches everything.

### Command bar and Search

- **Desktop:** the header search field *is* the command bar trigger (“Search or jump to… Ctrl K”). It opens a centered dialog with three groups: Jump to (spaces and channels), Posts, Actions (create here, Focus, toggle panel). The school filter defaults to the primary school. No command syntax or prefixes. With an empty query it lists recent spaces and threads.
- **Phone:** the Search tab offers the same groups, with the input pinned above the keyboard and filter chips (Everything / Courses / Posts / School).

### Post editor

- **Phone:** full screen, nothing floating. Header: close (keeps the draft) · title and “Draft saved” · Post. Then a space/channel picker, an optional type selector, title, body, image strip, and a toolbar riding the keyboard.
- **Reviews:** structured fields (status, workload, would retake, term) sit behind one summary chip that opens a sheet, so the writing area stays large.
- **Desktop:** inline reply box with toolbar. Ctrl+Enter sends. New posts open in a centered dialog or full page (see Open decisions).
- **Images:** a local preview appears immediately, then the progress ring, then done or failed (Retry). Posting waits on uploads that are still running, and failed ones must be retried or removed. ALT text is offered on every image.
- **Drafts:** saved per target (new post per channel, reply per thread) after typing stops and when leaving the screen. Coming back offers “You have an unsent reply · Resume / Discard.” A failed send keeps the text as a draft and shows an error toast with Retry.
- **Edit and delete:** editing reuses the editor and adds “edited” to the meta line. Deleting asks for confirmation. Replies stay under “original post deleted.”

### Split-pane discussions and Focus

- **Split pane:** the list pane (filters Active / New / Unanswered) and the reader sit side by side. Selecting a post updates the URL, so the thread can be shared.
- **Focus:** a full-page reading view with a progress line, Reply in the header and inline at the end, and Esc to exit. Entering and leaving Focus keeps the scroll position: store it per thread, along with “you left off here”.

### Real-time (WebSocket)

- **Never move content:** new posts and replies never insert above what someone is reading. They increment a counter on a NewItemsNotice, and choosing it loads and scrolls to them.
- **While writing:** incoming items stay queued until the post or reply is sent or cancelled.
- **Presence:** “Here now” counts members active in the last few minutes, excluding anyone with “Show when I’m online” off.
- **Live updates in place:** edits to posts already on screen update quietly. A deleted post shows “This post was removed” instead of vanishing.

## Accessibility

The accessibility target is WCAG 2.1 AA. The palette was checked during design, but that's only one part of it; focus handling, real controls, form errors, touch targets, and the small-screen layout still need to be verified in the actual app.

- **Contrast:** text at least 4.5:1, borders and UI parts at least 3:1, in both themes. Don’t put `on-surface-variant` on `secondary-container` below 13px. Course status and presence are never shown by color alone: each always has a word (“Taking”, “Here now”).
- **Focus:** a visible 2px `primary` ring with a 2px offset on every interactive element, using `:focus-visible`. Dialogs, sheets and popovers trap focus, close on Esc, and return focus to their trigger.
- **Keyboard (desktop):** Ctrl/Cmd+K opens the command bar · Esc closes it or leaves Focus · Ctrl+Enter sends · arrow keys move within the command list and tab lists · the pane divider resizes with arrow keys (it’s a slider with `aria-valuenow`). No single-letter shortcuts in version one.
- **Touch:** targets at least 44 × 44 (dock items 48). Swipe on the space chip always has a tap alternative. No hover-only actions.
- **Semantics:** real `button`, `a`, `input` and `label` elements. Labels on icon-only buttons. `nav` landmarks for the dock, rail and channel list. `aria-current` on the current space and channel. `role=status` for new-item counts and toasts, `role=alert` for errors.
- **Live regions:** new-item counts announce politely (“2 new replies”). Content updates in place don’t steal focus.
- **Text and motion:** support 200% zoom with no horizontal scroll at 360. The post-font setting switches Literata to Inter. Reduce motion removes slides, the shape morph and the spring.
- **Forms:** errors sit next to their field and are linked with `aria-describedby`. After a failed submit, focus moves to the first invalid field. Messages say how to fix the problem (“Needs at least 10 characters (5 more to go)”).
- **Images:** ALT text prompted on upload. Diagrams in posts need ALT, or they show an “image has no description” hint to the author.

## Privacy and permissions

I want to keep three things completely separate: **space membership**, **self-reported academic history**, and **published posts**. Following a course shouldn't change a private history entry, publishing something shouldn't silently change profile privacy, and the app absolutely shouldn't assume that joining a course means someone took it.

### What others can see

| Data | Default | Who can see it | Where it appears |
| --- | --- | --- | --- |
| History entry (course, status, term) | Private | Only you, or anyone signed in if set to Visible | Your profile, member rows, member preview card |
| Grade | Always private | Only you | Your own history only. Never in stats |
| Private note on an entry | Always private | Only you | Your own history only |
| Review author’s course status | Shown on the review | Anyone who can see the review | Review chip “Took it · Fall ’25 · self-reported”. Writing a review discloses that one course, even if the entry is private |
| Experience post status | Shown on the post | Anyone who can see the post | “Taking it · self-reported” |
| Space membership | Visible to signed-in users | Anyone signed in | Member lists. Joining reveals nothing about history |
| Online presence | On | Signed-in members of the space | “Here now” group and dots. Turning it off hides you from Here now only. You stay in member lists |
| Posts and replies | Visible | Anyone signed in | Unaffected by history privacy |
| Schools on profile | Primary school shown | Anyone signed in | Profile chips. Past schools follow their entries’ visibility (see Open decisions) |
| Course aggregate stats | — | Anyone signed in | Built from reviews only (workload, would retake, counts). Never from history entries or grades |

**UI rules:**

- **Others’ profiles:** never show visibility labels, and never show a hint of how many entries are hidden (“Some entries are private” is fine; “11 hidden” is not).
- **Preview as others:** your own profile always offers it.
- **Member rows:** show academic status only from a Visible entry, otherwise just the name.

### Roles and what they can do

There isn't much point showing a regular user a row of moderator controls they can never use, but the server still needs to enforce the rules regardless of what the UI hides. When somebody tries something reasonable but blocked—like reviewing a course before adding a qualifying history entry—give them an explanation instead of making it fail mysteriously.

| Action | User | Space moderator | Community owner | Platform admin |
| --- | --- | --- | --- | --- |
| Read spaces, join, follow | Yes | Yes | Yes | Yes |
| Ask, discuss, reply | Yes, no join needed | Yes | Yes | Yes |
| Write a review or experience | With a Taking/Took history entry for that course | Same | Same | Same |
| Edit or delete own posts | Yes | Yes | Yes | Yes |
| Report content | Yes | Yes | Yes | Yes |
| Pin, remove posts, dismiss reports in a space | No | In their spaces | In their community | Everywhere |
| Escalate to admins | No | Yes | Yes | — |
| Add community channels | No | In their community (open) | Yes | Yes |
| Assign moderators | No | No | Their community (open) | Yes, all spaces |
| Suspend accounts | No | No | No | Yes |
| Manage the course catalog, approve requests | No | No | No | Yes |
| Create communities | No (later) | No | — | Yes |

Course spaces have no owner. Their moderators are assigned by admins.

## Scope: first build vs. later

The first build needs to demonstrate MongoDB documents, meaningful queries and indexes, aggregation, and WebSocket-backed discussions. We've designed more than that, which is fine, but I don't want the implementation blocked by features marked Later just because they're already pretty in the canvas.

| Feature | Tier | What it demonstrates / note |
| --- | --- | --- |
| Email sign-up, sign-in, validation errors | v1 | Users collection, unique indexes on email and username |
| Onboarding: school + this term’s courses | v1 | The profile and spaces steps can be skipped or merged |
| Academic history (add, edit, visibility, status) | v1 | Embedded vs. referenced entries, per-entry visibility in queries |
| Profiles: own, others, private | v1 | Projection that respects visibility |
| Course and community spaces, join/leave, fixed course channels | v1 | Membership documents, compound indexes |
| Posts (question, discussion, experience, review) and one-level replies | v1 | Core documents. Reviews carry structured fields |
| Course stats (workload, would retake, counts) | v1 | Aggregation pipeline over reviews |
| Markdown editor with preview, image upload with states | v1 | Store Markdown, sanitize on render. Images in GridFS or object storage (open) |
| Search with school filter | v1 | Text index or Atlas Search (open) |
| Real-time new posts and replies, “Here now” count | v1 | WebSockets, ideally fed by change streams |
| Report, mod queue, remove post, admin report review | v1 | Reports collection, role checks |
| Light/dark theme, 360px layouts, all empty/loading/error states | v1 | — |
| Desktop split pane (fixed list width) and Focus mode | v1 if time | Layout only, no new data |
| Drafts in local storage + resume banner | v1 if time | Server-side drafts are Later |
| Command bar (Ctrl/Cmd+K) | v1 if time | Reuses the search endpoint. The mobile Search tab is v1 |
| Member list panel and member preview card | v1 if time | Needs the visibility projection that v1 already builds |
| Resizable panes, thread map, reading-position memory | Later | Pure frontend polish |
| Swipe on the space chip, tilted-button spring, shape morphs | Later | Tap paths already cover them |
| Admin users table and suspensions | Later (minimal: one flag) | A `suspended` field with an admin-only toggle is enough at first |
| Course requests from students | Later | Admins seed the catalog by hand at first |
| Community owners and owner-assigned moderators | Later | v1: admins create communities and assign moderators |
| Data export (JSON), post-font setting, text-size setting | Later | — |
| Notification levels per space (All / Highlights / Off) | Later | v1: in-app unread counts only |

**Explicitly not planned:** direct messages, voice, a notification center or email, custom roles, polls, SSO, verified enrollment.

## Open decisions

These questions still need an actual decision from me. They're not permission for an agent to pick whichever option seems convenient and quietly act like we've always planned it that way.

- [ ] **App name.** Every screen shows the placeholder ‹app name›.
- [ ] **Logged-out access.** Can anyone read spaces without signing in? The two-option visibility (Private / Visible to signed-in users) assumes no. If yes, decide whether “Visible” includes logged-out visitors.
- [ ] **Past schools on profiles.** Show them always, or only when that school has at least one Visible entry?
- [ ] **Review disclosure.** Confirm that writing a review publicly shows that one course even when its history entry is private (the current copy says so).
- [ ] **Course-space membership vs. posting.** Anyone signed in can post in any course space without joining (current design). Confirm this also holds for communities, or whether communities require joining first.
- [ ] **Community owners in v1.** Defer them entirely (admins create communities), or allow owners with no extra tools?
- [ ] **Desktop new-post surface.** A centered dialog or a full page? Mobile is full screen either way.
- [ ] **Image storage.** GridFS (shows off MongoDB) or object storage? Also the size limit and allowed types.
- [ ] **Search engine.** A MongoDB text index (simple, self-hosted) or Atlas Search (better ranking, needs Atlas)?
- [ ] **Deleted accounts.** Keep posts as “deleted user” (current copy) or delete them too?
- [ ] **Edit history.** Show only “edited”, or let moderators see previous versions?
- [ ] **“Here now” window.** How many minutes of inactivity before someone drops out (suggested 5)?
- [ ] **Moderator escalation.** Does “Escalate to admins” need its own UI in v1, or is reporting enough?
