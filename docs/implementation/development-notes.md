# Development notes

Problems that cost real time, what I tried, and what stuck. The [decision register](../planning/decision-register.md) records the outcome; this records how I got there, for the development reflections. Newest topic first.

## Matching the designs with shadcn-svelte (November 16, 2026)

The screens had drifted from the exports in `docs/design/`, and buttons and chips came from a hand-written file of class lists. I moved the controls to shadcn-svelte components, which keep Bits UI underneath, and then went through the built screens against the designs.

### Setting it up

`shadcn-svelte init` only asks for a design preset interactively, so I wrote `components.json` by hand and used `add`. The generated components assume shadcn's palette (`foreground`, `muted`, `accent`), Tailwind's default breakpoints, `dark:` overrides, and their own focus rings. I aliased shadcn's color names to the Blueprint roles in `layout.css`, mapped `sm:` and `md:` to the app's tiers, and removed the `dark:` classes and focus rings so the roles and the one global `:focus-visible` ring stay in charge. A future theme, such as high contrast, only has to redefine the role variables.

`tailwind-merge` doesn't know the Blueprint theme names, so `cn()` was quietly dropping `text-overline` next to a text color. `cn()` now extends it with the app's fonts, radii, shadows, and breakpoints.

### Things that broke

- A Bits UI trigger inside a form renders a plain `<button>`, so the history editor's Delete trigger submitted the form and closed the editor. Triggers inside forms need `type="button"`.
- Search filters live outside the search form (linked with the `form` attribute), so their change events never reach the form. The handler sits on each select.
- `@tailwindcss/forms` draws its own arrow on every `select`, which doubled the chevron on the filter chips.

### Reviews from other models

After each larger change, Codex (GPT-6.1 Sol) and OpenCode (GLM-5.3 Flash) reviewed the diff and the running app. Most findings held up: the profile edit form overflowing the new sidebar, a 40px search button, a 2.7:1 switch thumb in dark, a white ring offset showing as a halo in dark, and settings living on the profile instead of their own screen. Some didn't: one reported that filter changes lost focus, but SvelteKit 3 replaced `keepFocus` with `reset: false`, and the browser check showed focus staying put. Every finding got checked before anything changed.

The third round scored the branch 7.5/10 (Codex) and 7/10 (GLM) and found a real layering bug: every field carried a `border-outline` utility, which outranks the base layer, so the error border never showed, and a new focus rule removed the red inset exactly when a failed submit moved focus to the field. Fields now leave border color to the base rules. Dialogs opened from ordinary buttons also dropped focus on close, because Bits UI only restores focus to its own trigger; `EditorDialog` remembers what had focus and returns there.

Rounds 4 to 6 found smaller misses (byline links 20px tall, a reply error not linked to its field, review fields at 42px) and one more color bug: `transition-colors` animates outline-color, so focus rings started from currentColor and could look near-white in dark. Outlines now default to primary. When the preview browser stopped producing screenshots, a 40-image Playwright pack (design comparisons, focus rings, 200% zoom) let both reviewers finish the visual check. Round 6 ended at 10/10 (Codex) and 9.5/10 (GLM), both satisfied. Review-specific filters for the Reviews channel were left as future work rather than added to this pass.

Neither the reviews nor my own checks looked at hover. Hovers were 8% tints, a step to `surface-container` that barely shows in dark, or missing, buttons had Tailwind 4's default arrow cursor, and the start page's Clerk buttons had no styling at all. Hover and press now come from one state-layer utility that mixes a control's content color over its background at 14% and 24% (`--state-hover`, `--state-pressed`), so a high-contrast theme can turn them up in one place.

A seventh round, now with Gemini (Antigravity), DeepSeek, and Beam beside GLM, found that the state layer lowered contrast where it mattered: mixing white into a blue button under white text dropped pressed states to 3.84:1. Filled and destructive buttons now tint with `on-surface`, which darkens them in light and lightens them in dark, so pressing raises contrast. Controls tinted with their own text color use a lighter 10% / 14% step. For the high-contrast theme, raising these percentages isn't enough on its own; hover and press there should lean on borders or full inversion.

Round 8 caught a focus problem older than this pass: full-width rows inside rounded `overflow-hidden` cards had their 2px offset ring clipped to hairlines. Those rows now use a `list-row` utility that draws the ring inside. The shadcn Switch, Select, Tabs, Radio Group, Skeleton, and Separator components were removed because nothing rendered them; they can be added again with `shadcn-svelte add` when a screen needs them.

Clerk's own account dialog has 24 to 40px controls and no accessible name on its `role="dialog"`. That's Clerk's interface, reachable before this branch through its account menu, so it's recorded here rather than patched element by element.

### Left as designed differences

Some parts of the designs need data or features that aren't built: member counts and "you're taking it" on course rows, the subject filter on Explore (a client-side filter would only see one page), the profile's Reviews and Posts tabs and statistics, result counts on search, counts in the switcher sheet, the dock's create button and reading bar, and the review list's split-pane reader. Dark mode still follows the system setting; the high-contrast theme can be its own block of role values without changing that.

## Localization (November 15, 2026)

I added English and Spanish with Paraglide JS before the app was feature complete. The [architecture](../technical/architecture.md#languages) describes how it works now.

### Starting before the app was finished

Waiting until the end looked cheaper, but there were already 45 components, and every new screen would have added more English to pull out later. Moving roughly 300 messages out took most of a day. Doing it once and then writing new screens with messages from the start was the better trade.

### Setting up Paraglide

- **The official installer was out of date.** `sv add paraglide` still installs Paraglide 2, and its examples use the `$lib` alias that SvelteKit 3 replaced with `#lib`. I set up Paraglide 3 by hand instead.
- **I dropped language prefixes in URLs** (`/es/...`). They only help search engines, and nothing in the app is public. A cookie, then the browser's language, then English is enough.
- **SvelteKit 3 changed `error()`.** Passing an object as the second argument is deprecated; the message comes second and extra fields such as the error code come third. The dev server warned about it; type checking didn't.
- **Generated files caused small breakages.** Paraglide's output and inlang's `project.inlang/.meta.json` are generated. Git ignored them, but Prettier didn't, so `pnpm lint` failed until I added them to `.prettierignore`. The template's `prepare` script ended in `|| echo ''`, which also hid a failed message compile during `pnpm install`; it now covers only `svelte-kit sync`.

### Moving the text out

- **Labels stored as constants were a hidden bug.** Tables such as the course channel names were evaluated once when the server loaded the module, so every request would have used the first request's language. They became message functions that are called while rendering.
- **Joined sentences don't translate.** "Added 1 institutions" was built from pieces and was already wrong in English. I reworded it as "Institutions added: 1". Reply counts became a plural message, and terms like "Fall 2026" became a message too, since other languages order the season and year differently.
- **Formatting had a hard-coded language.** Relative times used `'en'`, and some dates used the browser default, which can differ from the page's language. Everything now passes the current locale to `Intl`.

### Text sent by the server

The server sent English in four places: API errors, form-action errors, error pages, and the validation messages in the shared Zod contracts. Translating on the server would have mixed presentation into the services, so the server now sends codes and the client translates them.

- The client's table of messages is a complete record over every code, so adding a code without a translation fails type checking.
- Zod's `flattenError` keeps only message strings, which lost the limit in "Use 150 characters or fewer." The forms now read the issues themselves.
- SvelteKit's default error page shows the server's English message, so I added a translated one.

### Clerk

Clerk translates its own components when given a localization from `@clerk/localizations`, but `svelte-clerk`'s sign-in, sign-up, and sign-out buttons hard-code their English labels unless given content. Clerk's hosted Account Portal, where those buttons send people, isn't translated at all.

### Machine translation

The constraint was the same as for hosting: free, with no card on file. I tried several tools on the same messages, chosen because they're easy to get wrong: a privacy warning with placeholders, a button, a length limit, and text that starts with a space.

| Tool | What happened |
| --- | --- |
| inlang's free service | Kept placeholders, but wrote "{status} estado" and "término", turned an instruction into a label, and dropped the leading space |
| translatex (keyless Google and Edge endpoints) | Translated "Publishing shares…" as "En Editorial comparte…" and "Save changes" as "Cambios de guardado". Those endpoints also aren't an official API |
| Argos Translate (offline) | Used formal *su*, "término", and "historia", dropped the leading space, and turned "only you ever see this" into "sólo se ve esto", which weakens a privacy promise |
| Google Cloud Translation, DeepL | Both need a card on file, even for their free allowances |
| Gemini through the Antigravity CLI (`agy`) | Followed the [translation guide](../../messages/translation-guide.md), kept placeholders and spaces, and used the glossary. Covered by a subscription I already have |

The sentence-by-sentence tools have no idea which text is a button, an error, or a privacy statement, and they can't be given a glossary. That, more than raw quality, is why they failed.

### Making Gemini usable

- **I first installed the wrong package.** `gemini` on npm is an old screenshot-testing tool. The CLI I actually signed in with was Antigravity's `agy`.
- **Flag order mattered.** `agy -p --output-format json "…"` took the next flag as the prompt. `--print="…"` avoids that.
- **Structured output changed object keys.** Gemini's JSON mode drops `=` and `*` from keys, so the plural case `countPlural=*` came back as `countPluralstar`. The script now sends plural cases by category (`one`, `other`) and rebuilds inlang's structure itself.
- **Calls were slow and uneven.** The same small request took 12 seconds once and almost three minutes another time. The script saves after each batch so a timeout doesn't lose earlier work.
- **Good output still needs guards.** The script rejects any translation that changes placeholders, leading or trailing spaces, or plural structure. A code review then found that my first version pooled placeholders across plural cases, so a Spanish case missing `{count}` could still pass.
- **Machine review helped, but it isn't a fluent speaker.** Gemini reviewed my own Spanish draft against the guide and found seven real problems, including a heading in the wrong verb form, *temporada* for a calendar season, and "stays private" weakened to "es privado". A person who speaks Spanish still needs to read it.

### Code review limits

CodeRabbit's free plan for public repositories ran out partway through the pull request. Each push uses a review, so small follow-up commits used up the allowance, and the stale "changes requested" review couldn't clear until it reset. Batching review fixes into one push would have saved reviews.

### What I'd do differently

- Put user-facing text in messages from the first screen, and have the server return codes instead of sentences from the start.
- Write the translation guide and glossary before translating anything, so people and tools follow the same rules.
- Test the awkward cases early: plurals, placeholders, text joined to other text, and privacy wording.
