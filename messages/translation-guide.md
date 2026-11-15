# Translation guide

`pnpm i18n:translate` sends this guide with every batch of missing messages, and reviewers use it too. English in `en.json` is the source; never edit a translation to change what the English means.

## The app

A private discussion and review platform for college courses. Students follow courses, ask questions, start discussions, review courses they took, and keep a self-reported academic history that is private unless they choose otherwise. Readers are students, so the tone is plain, friendly, and direct.

## Rules for every language

- Keep every `{placeholder}` exactly as written. Move it wherever the grammar needs it, but don't translate, rename, add, or drop one.
- Keep leading and trailing spaces exactly. Some messages are joined to other text, such as `" · note"`, which starts with a space.
- Plural messages are JSON arrays with `match` cases. Keep the same `declarations` and `selectors`; give each case a translation, and add the plural categories the language needs (such as `few` or `many`) before the final `*` case.
- Buttons and labels stay short. Instructions and errors are full sentences.
- Address the reader directly and informally. Use gender-neutral wording where the language allows it without sounding forced.
- Privacy wording must stay exact. If a message says something is private, visible, shared, or self-reported, the translation must say the same thing, no stronger and no weaker.
- Don't translate product data: school names, course codes, and the demo school "Alfred State College".

## Spanish (`es`)

- Use _tú_, not _usted_. Neutral Latin American Spanish; prefer _añadir_ over _agregar_ for consistency.
- Buttons, menu items, and headings that name an action use the infinitive (_Guardar cambios_, _Escribir una reseña_). Instructions and errors use the imperative (_Elige un curso._).
- Prefer neutral forms such as _persona administradora_ or _estudiantes_ over choosing a gender.

| English                  | Spanish                        |
| ------------------------ | ------------------------------ |
| course                   | curso                          |
| term (Fall 2026)         | período                        |
| Planning / Taking / Took | Planeando / Cursando / Cursado |
| review (noun)            | reseña                         |
| post (noun)              | publicación                    |
| thread                   | hilo                           |
| question / discussion    | pregunta / debate              |
| reply                    | respuesta                      |
| follow / following       | seguir / siguiendo             |
| history (academic)       | historial                      |
| self-reported            | autodeclarado                  |
| display name             | nombre visible                 |
| username                 | nombre de usuario              |
| school                   | escuela                        |
| invitation               | invitación                     |
| locked (thread)          | cerrado                        |
