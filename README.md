# Portfolio site

Static site. Three files and a preview image, no build step, no dependencies.
Open `index.html` in a browser and it works.

```
index.html   all content lives here
styles.css   design tokens at the top, sections below
main.js      spring engine, project sheet, theme toggle, scroll behaviour
og.png       the social preview card, generated (see below)
.nojekyll    tells GitHub Pages not to run Jekyll over the files

tools/make-og-image.py   regenerates og.png. NOT a build step: the site
                         never runs it, and nothing here is required to
                         serve the page. It exists so the preview card
                         can be rebuilt from the same palette values as
                         styles.css instead of drifting away from the
                         design. Needs Pillow and numpy:
                         `python tools/make-og-image.py og.png`
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

**Three cards link out to public repositories, so three write-ups are checkable.**
F1 (Docker, AWS, CI and model claims verified against the git tree on 2026-08-09),
Carbon Signal Research, and Manifest. Anything added to those write-ups has to stay
true of the public repo, because the link invites people to check. The NVIDIA card
deliberately has no link: that repository is private.

**The social preview card is a separate artefact.** `og.png` carries the name, the
lede and the three headline facts. Change any of those on the page and the card is
silently out of date until you rerun `tools/make-og-image.py`. The `og:image` URL is
absolute, so it also needs editing if the site moves to a custom domain.

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
- **Glass is a material, not a colour.** Every raised surface is translucent over a
  fixed colour field, which is what the `.backdrop` div exists for. Delete it and the
  whole design collapses into grey boxes, because a blur with nothing behind it is
  just a grey box. The bright inset top edge, the `--specular` token, is the part
  that reads as light catching a bevel rather than as a blur.
- **The blur stops at the surface.** `backdrop-filter` is on chrome and card
  surfaces only, never on anything inside them. Nesting filters multiplies
  compositing cost and buys nothing visible.
- **The primary button is the one opaque control.** A call to action you can see
  through is a weak one.
- **Text colours were solved against the worst-case surface, not the average.**
  Small text sits over a colour field, so `--text-secondary` and `--text-tertiary`
  were set by computing contrast against the darkest gradient blob seen through card
  glass. Both clear 4.5:1 there, and the pair keeps a visible luminance step so
  three levels of hierarchy survive. The flat design's lighter greys failed this;
  tertiary was at 2.5:1.
- **Three colour states, not two.** Light, dark and system. Dark is declared twice
  in the CSS on purpose: guarded inside the media query so an explicit light choice
  beats a dark-preferring OS, and again on `[data-theme="dark"]` so the reverse
  holds. Removing either breaks the toggle in one direction. The choice is stamped
  on `<html>` by a blocking inline script before first paint, because deferring it
  is what causes the flash of the wrong theme.
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
  Reduced transparency is not a nicety on this design, it is load-bearing: every
  raised surface is translucent, so without a solid fallback the site is unusable
  for anyone whose system asks for one. Higher contrast drops the backdrop back to
  22% and makes the surfaces fully opaque.
- **Only `transform` and `opacity` animate**, the two properties the compositor handles
  without a repaint.

## Local preview

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
