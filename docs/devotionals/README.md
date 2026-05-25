# Daily devotionals channel

Served via GitHub Pages from this repo's `main` branch
(`Settings → Pages → Build from /docs folder`). Fetched on each app launch
by `src/services/devotional/DevotionalManager.ts`, validated against
`src/devotional/schema.ts`, and cached to AsyncStorage so the devotional
is fully offline after the first successful fetch.

**Do not edit `index.json` by hand without also adding the matching
`<YYYY-MM-DD>.json`.** The manager fetches the index first, then the
entry — a dangling `latest` (no matching file) makes the banner fall
back to `available` and, failing that, stay hidden.

## Layout

```
docs/devotionals/
  index.json            ← {"latest": "YYYY-MM-DD", "available": [...]}
  <YYYY-MM-DD>.json     ← one file per devotional, filename === date
```

The filename **must** match the `date` field — the app builds the URL
from the date string it picked out of the index.

## URLs

- Index: `https://arotiana137-51.github.io/e-Baiboly/devotionals/index.json`
- Entry: `https://arotiana137-51.github.io/e-Baiboly/devotionals/2026-05-24.json`

## Schema

See `src/devotional/schema.ts`. The eight block types currently supported:

| Type        | Required fields                  | Notes                                  |
|-------------|----------------------------------|----------------------------------------|
| `paragraph` | `text`                           | Body prose.                            |
| `heading`   | `level` (2 or 3), `text`         | Section break with accent underline.   |
| `verse`     | `ref`, `text`                    | Scripture quotation, italic body.      |
| `callout`   | `text`, optional `variant`       | `topic` (default) or `muted`.          |
| `quote`     | `text`, optional `attribution`   | Non-scripture quote, italic body.      |
| `prayer`    | `text`                           | "VAVAKA" eyebrow.                      |
| `list`      | `items` (non-empty), `ordered?`  | Ordered → `1. 2. 3.`, else `•`.        |
| `image`     | `url`, `alt`, optional ratio/cap | Defaults to 16:9.                      |

The top-level `Devotional` also requires `date`, `title`, `topic`,
`publishedAt`. `verseRef` and `author` are optional but appear in the
header card and reveal banner when present.

`topic` is one of the 12 enum values in `src/devotional/topics.ts`
(`grace`, `repentance`, `faith`, `love`, `hope`, `prayer`, `wisdom`,
`suffering`, `praise`, `judgement`, `comfort`, `service`). The chosen
topic resolves to an accent + tinted-surface palette that the header
card, the reveal banner, and the tinted blocks (verse, callout, prayer,
quote) all share.

## Publish flow

1. Author `docs/devotionals/<YYYY-MM-DD>.json`.
2. Add the date to `available` in `index.json` and bump `latest` to the
   newest published date.
3. `git add docs/devotionals/`, commit, push to `main`.
4. GitHub Pages publishes within ~1 minute. Next app launch (or pull-to-
   refresh on `DevotionalScreen`) picks it up. The daily throttle in
   `DevotionalManager` will block a *second* network attempt the same
   day; use the in-app pull-to-refresh to bypass.

## Validation

The app discards entries that fail `isDevotional`. To catch problems
before publish, you can paste the JSON through a Node REPL:

```js
const {isDevotional} = require('./src/devotional/schema');
const fs = require('fs');
console.log(isDevotional(JSON.parse(fs.readFileSync('docs/devotionals/2026-05-24.json'))));
// → true if the file is valid
```

A `scripts/validateDevotional.js` CLI is a nice-to-have once we publish
more than a couple of entries by hand.
