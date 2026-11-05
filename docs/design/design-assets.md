# Blueprint design files and what counts as current

I've spent quite a bit of time working through the interface with Claude Design, and I don't want that work to get lost when I move into the actual repo. At the same time, we've explored enough versions that **not every screenshot is current**. This file is here so an agent knows which artboards to follow without mixing old experiments into the implementation.

The design direction is **Blueprint**: ink blue, electric cyan, tangerine accents, light/dark themes, and some Material 3 Expressive influence without copying Material outright. Space Grotesk handles headings, Inter handles UI and replies, Literata handles longer posts and reviews, and IBM Plex Mono is used for course codes. The exact tokens and components are in [`blueprint-handoff.md`](blueprint-handoff.md), so don't try to recreate them from a screenshot.

## Claude canvas pages

| Page | What it covers | How to use it |
| --- | --- | --- |
| **Screens v1** | Sign-in, onboarding, Home, Explore, sheets/dialogs, profiles/history, settings, moderation/admin, tablet | Current reference |
| **Blueprint · Mobile & Desktop** | Course overview, threads, editor, combined desktop overview, split panes, Focus, command bar, mobile Search tab | Only the canonical artboards identified by the orange note are current |
| **Exploration** | Early layouts, channel experiments, palette comparison | Background material, **not** current implementation guidance |

The uploaded `Academic Discussion Platform — UX Sketches-png (9).zip` previously contained **62 PNG exports from Screens v1**, but not every canonical artboard from the Mobile & Desktop page. This documentation package contains the Markdown handoff, **not** those screenshots or the editable Claude canvas. We should export and add the remaining canonical screens separately instead of pretending the current assets are complete.

## Suggested location in the repository

```text
docs/design/
  blueprint-handoff.md
  design-assets.md
  screens/
    screens-v1/          # 62 previously exported PNGs, if added
    mobile-desktop/      # additional canonical artboards to export
```

These are static snapshots. They don't show every tweak state, interaction, or responsive variation, and they certainly don't prove a feature is implemented. When a screenshot and the written handoff disagree, check whether the screenshot was superseded.

## Things we already corrected during design

The **one-row mobile dock** is the version to build; the earlier two-row dock is gone. The dock needs to leave enough room for the last bit of content and disappear when the mobile editor/keyboard is active. We also need to test actual 360 × 640 layouts, because earlier experiments had clipped titles, toolbars, uploads, new-reply overlays, and even an `[object Object]` editor rendering mistake.

Academic history now has just **Private** (default) and **Visible on profile**, rather than the older confusing 'Members' option. Hiding online presence doesn't remove someone from the membership directory, and member rows must never reveal hidden course history. On desktop, Overview can use the combined About/Members panel, while thread browsing uses a split-pane layout and Focus hides the surrounding interface.

I don't want to spend the first implementation phase obsessing over ultrawide layouts or fancy morphing animations. Getting the real small-phone experience and core MongoDB workflows working matters a lot more.
