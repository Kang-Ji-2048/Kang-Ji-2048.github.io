# Portfolio site

Static site. Three files, no build step, no dependencies. Open `index.html` in a
browser and it works.

```
index.html   all content lives here
styles.css   design tokens at the top, sections below
main.js      spring engine, project sheet, scroll behaviour
.nojekyll    tells GitHub Pages not to run Jekyll over the files
```

## Publishing

The repository is already initialised and committed here, with the remote set. Two
things are left, and both need your GitHub login, so they have to happen on your machine.

**1. Create the repository on GitHub.** Name it exactly `Kang-Ji-2048.github.io`.
The name has to match the username or Pages will serve it from a subpath instead of
the root. Do not add a README, licence or gitignore on the creation screen; the repo
here already has a commit and GitHub will refuse to merge the two histories.

**2. Push.** From this folder:

```bash
git push -u origin main
```

If Git asks for a password, use a personal access token rather than your account
password. GitHub stopped accepting passwords over HTTPS in 2021.

**3. Turn Pages on.** Repository, then Settings, then Pages. Source is
*Deploy from a branch*, branch `main`, folder `/ (root)`. The site appears at
`https://kang-ji-2048.github.io` within a minute or two.

### Custom domain, optional

Add a file named `CNAME`, no extension, containing only the domain. At your registrar
point the apex at four A records: `185.199.108.153`, `185.199.109.153`,
`185.199.110.153`, `185.199.111.153`. Add a CNAME for `www` pointing at
`kang-ji-2048.github.io`. Then set the domain under Settings, Pages, and tick
**Enforce HTTPS**.

## Things to check before you send the link to anyone

**The graduation year.** The site states Sept 2024 to Jun 2027, matching the master CV.
`Grad Route.md` records that the 2027 versus 2028 decision is still open. If you switch
to the integrated masters, this page needs updating along with everything else.

**Your phone number is deliberately absent.** It is on the CV, which goes to named
recipients. On a public page it gets scraped. Add it back only if you want that trade.

**The F1 repository backs every claim on the page.** The Docker, AWS, CI and model
claims were verified against the git tree on 2026-08-09. Anything added to that write-up
in future has to stay true of the public repo, because the link invites people to check.

## Adding a project

Copy any `<li>` block inside `<ul class="grid">`. Two things matter:

- `data-project="your-slug"` on the `<article>` is the deep link. `yoursite.com/#your-slug`
  opens that project directly, so you can send someone to one piece of work.
- The card is the summary. The `<div class="detail" hidden>` inside it is the full
  write-up that appears in the sheet. Both live in the HTML, so both are indexable by
  search engines and readable with JavaScript off.

## Writing conventions applied here

Taken from the `kang-application-writer` voice profile, so the site and your applications
sound like the same person:

- UK English throughout.
- No dashes anywhere, including date ranges. "Jun to Aug 2026", not a hyphen or an en dash.
  This covers headings and labels, not only body text.
- Evidence-led rather than adjective-led. "I led backend and ML development for the
  four-person team that won" beats "passionate and driven engineer".
- No two consecutive sentences opening the same way, and no engineered triads.
- Nothing on the page that is not in the master CV or the story bank. The two motivation
  sentences are your own words, taken from the Capital One application logged in the
  story bank.

## Design decisions, so you can defend them in an interview

- **System font, no webfont.** It already ships optical sizing, tracking tables and
  legibility tuning, and it costs zero bytes.
- **Tracking is size-specific.** Large display type gets negative letter-spacing, body
  sits near zero, small uppercase labels get a positive bump. One fixed `letter-spacing`
  value is always wrong somewhere.
- **Spacing is in `rem`.** If a visitor enlarges their text, the layout scales with it
  instead of breaking.
- **The nav is a translucent material**, not an opaque bar, so content scrolls beneath it.
- **The project sheet uses a spring, not a CSS transition.** A spring can be grabbed
  mid-flight and reversed, it inherits the finger's release velocity, and it projects
  momentum forward to decide whether a flick dismisses. A fixed-duration transition
  cannot do any of that.
- **`prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`** are
  all handled. Reduced motion cross-fades rather than removing feedback entirely.
- **Only `transform` and `opacity` animate**, the two properties the compositor handles
  without a repaint.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
