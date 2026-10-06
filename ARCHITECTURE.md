# Alternating.ai — Architecture

> A static **"coming soon"** website for **Alternating.ai** (AI solutions for business & education).
> Built with **Astro** + **Tailwind CSS v4**. No JS framework — pages are plain HTML enhanced by a
> few tiny scripts (dark-mode toggle, keyword search, and `mailto:` "forms").

---

## 1. Tech stack

| Layer      | Choice                        | Notes                                                                                                     |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Framework  | **Astro 7**                   | Static-site builder; renders pages to plain HTML at build time.                                           |
| Styling    | **Tailwind CSS v4**           | Wired via the `@tailwindcss/vite` plugin (`astro.config.mjs`). No `tailwind.config.js` — v4 is CSS-first. |
| Components | **Astro `.astro` files**      | Server-rendered; no client JS by default.                                                                 |
| Content    | **Astro Content Collections** | Markdown posts in `src/content/blog/`, schema in `src/content.config.ts`.                                 |
| Output     | **Static HTML** in `dist/`    | Hostable anywhere (see §10).                                                                              |

There is no database, no API, and no server runtime. "Forms" open the visitor's own mail client
via `mailto:` links (see §8).

---

## 2. Pages & routing

| URL            | File                        | Purpose                                                                                                              |
| -------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/`            | `src/pages/index.astro`     | Home — animated "coming soon" hero, feature cards, tech chips, blog previews, FAQ, CTA.                              |
| `/business`    | `src/pages/business.astro`  | Business/education page — how-it-works steps, "Questions we can help you answer", CTA card with email + notify form. |
| `/blog`        | `src/pages/blog.astro`      | Blog listing — all posts sorted by date, keyword search, tag filter (`?tag=`), topic stats.                          |
| `/blog/<slug>` | `src/pages/blog/[id].astro` | Individual post — renders the Markdown, read-time, tags, author note, prev/next.                                     |

Routing notes:

- A file in `src/pages/` maps to a route: `index.astro` → `/`, `business.astro` → `/business`.
- `blog/[id].astro` is a **dynamic route** — `getStaticPaths()` generates one page per Markdown file
  (`/blog/what-is-ai`, …). Unknown slugs redirect to `/blog`.
- Each page is **self-contained**: it imports `Header`, `Footer`, `Newsletter` and `global.css`
  directly. No shared layout is wired in yet (the layouts in `src/layouts/` are unused — see §9).

---

## 3. Directory structure

```
ClineProject/
├── astro.config.mjs          # Astro + Tailwind v4 (Vite plugin) config
├── package.json              # scripts: dev / build / preview
├── tsconfig.json
├── README.md
├── AGENTS.md · CLAUDE.md     # agent instructions
├── ARCHITECTURE.md           # ← this file
├── scripts/
│   └── generate-icons.mjs    # `npm run icons` → renders favicon.svg to PNG sizes + .ico
├── public/
│   ├── favicon.svg           # AC sine-wave brand mark (primary icon, referenced in <head>)
│   ├── favicon.ico           # generated multi-size (16/32/48)
│   ├── favicon-16/32/48/512.png
│   └── apple-touch-icon.png  # 180×180 for iOS home screen
└── src/
    ├── content.config.ts     # Content Collection schema (blog)
    ├── content/
    │   ├── blog/             # Markdown posts = the live blog collection
    │   │   ├── what-is-ai.md
    │   │   ├── ai-business-education.md
    │   │   └── ai-ethics.md
    │   └── test.md           # stray sample — NOT part of the blog collection
    ├── pages/
    │   ├── index.astro       # /
    │   ├── business.astro    # /business
    │   ├── blog.astro        # /blog
    │   └── blog/[id].astro   # /blog/<slug>
    ├── components/
    │   ├── Logo.astro        # brand lockup: sine-wave mark + "alternating.ai" wordmark
    │   ├── Header.astro      # fixed nav + dark-mode toggle
    │   ├── Footer.astro      # links + email + social
    │   └── Newsletter.astro  # "join the list" CTA + form
    ├── layouts/              # present but not used by any page yet
    │   ├── BaseLayout.astro
    │   └── BlogLayout.astro
    └── styles/
        └── global.css        # Tailwind import + design system + dark variant
```

---

## 4. Design system (`src/styles/global.css`)

- `@import "tailwindcss";` pulls in Tailwind.
- **Light/dark theming** is driven by CSS variables on `:root` (light) and `.dark` (dark):
  `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--text-dim`, `--accent`.
  Components reference them via `bg-[var(--bg)]`, `text-[var(--text)]`, etc.
- **Custom variant** `@custom-variant dark (&:where(.dark, .dark *));` — tells Tailwind v4 that
  `dark:` utilities activate when a `.dark` class sits on `<html>`, instead of the default
  `prefers-color-scheme` media query. This is what makes class-based dark mode work.
- Reusable component classes:
  - `.btn-primary` / `.btn-secondary` — gradient / outline buttons.
  - `.feature-card` — glass panel with hover lift.
  - `.glass` — frosted-glass surface.
  - `.hero-glow` — radial gradient glow behind the hero.
  - `.section-divider` — gradient hairline between sections.
  - `.tag-pill` (+ `.tag-purple`/`-blue`/`-amber`/`-emerald`) — category chips.
  - `.content-blur` — "coming soon" placeholder blur (see §6).
  - `.animate-fade-in` (+ `.delay-*`) — entrance animation.
  - `.post-content` — typography for rendered blog Markdown.
- Accent palette: **violet → indigo → fuchsia** gradient.

---

## 5. Dark mode (how it works)

1. **Per-page inline script** (in each page's `<head>`, runs before paint) reads
   `localStorage.theme`; **dark is the default** when the visitor hasn't chosen yet. It sets the
   `.dark` class on `<html>` _before_ first paint → no flash-of-wrong-theme (FOUC).
2. **Header toggle** (`Header.astro`) — the sun/moon button flips `.dark` on `<html>`,
   persists the choice in `localStorage.theme`, swaps the icon, and adds a subtle shadow on scroll.
3. **Tailwind** — because of the `@custom-variant dark` rule, every `dark:` utility only applies
   while `.dark` is on an ancestor.

Net effect: **dark by default**; the visitor's toggle choice (light or dark) persists across pages
and reloads, and there's never a theme flash.

---

## 6. "Coming soon" placeholder blur

Some copy is intentionally not legible yet — it should _look_ like there's content without being
readable (unpublished blog previews, answers that aren't final). That's the `.content-blur` class:

```css
.content-blur {
  filter: blur(4px);
  user-select: none;
  pointer-events: none;
}
```

Applied to:

- **Home → "Latest Articles"** cards: title, description, and date are blurred; the tags and the
  "Read" affordance stay sharp.
- **Business → "Questions we can help you answer"**: each question title stays sharp; the answer
  paragraph is blurred.
- **Blog → article cards**: date, title, and description are blurred; tags and the working "Read"
  link stay sharp.

To un-blur later: remove the `content-blur` class from the element (and add the real content/links).

---

## 7. The blog content pipeline

- **Schema** (`src/content.config.ts`): each post is a Markdown file with frontmatter
  `title`, `date` (required), `category`, `tags[]`, `summary`.
- **Posts** live in `src/content/blog/*.md`.
- **`/blog`** (`blog.astro`):
  - Loads all posts via `getCollection('blog')`, sorts newest-first.
  - Computes tag counts → clickable tag chips with counts; clicking sets `?tag=` to filter.
  - **Client-side keyword search** filters cards by title/tags/summary (no backend).
  - Shows topic stats (article count, etc.).
- **`/blog/<slug>`** (`[id].astro`):
  - `getStaticPaths()` emits one route per post.
  - Renders Markdown via `render()`.
  - Computes **read time** (`words / 200`), shows **tags** (linking to `/blog?tag=`), an author
    note, and **prev/next** navigation by date.

Adding a post = create a new `.md` file in `src/content/blog/` (§11). It then appears on `/blog`,
in search, and gets its own `/blog/<slug>` URL automatically.

---

## 8. Email / contact (all → `psbd225@gmail.com`)

The site has no backend. Every "send us your email" path uses a `mailto:` link to
**psbd225@gmail.com**, which opens the visitor's own mail client:

- **Business CTA card** — the "Reach out" button, a clickable `psbd225@gmail.com` link, and the
  "Get notified" email form (subject + pre-filled body).
- **Footer** — the "Reach Out" email link.
- **Newsletter** banner — the "Get notified" form.
- **Home CTA** — "Notified you before we launch" form.

To change the address later: search for `psbd225@gmail.com` and replace. (Optionally, swap
`mailto:` for a real form backend so submissions land in an inbox — see §12.)

---

## 9. Components

- **`Logo.astro`** — the brand lockup. The mark is an **alternating-current (sine-wave)** — a nod
  to the brand idea: just as AC (alternating current) let electricity reach everyone,
  Alternating.ai aims to bring AI to every small business and education sector. It sits in a
  violet→indigo→fuchsia tile, paired with the **`alternating.ai`** wordmark (lowercase, bold,
  `.ai` in the brand gradient). Used as `<Logo size="sm|md|lg" />` in the header and footer. The
  favicon (`public/favicon.svg`) is the same mark as a standalone icon.
- **`Header.astro`** — fixed top nav (logo, Home/Blog/Business, "Get Started" CTA, dark-mode
  toggle). Props: `title`, `description` (used for meta). Adds a scroll shadow.
- **`Footer.astro`** — logo + tagline, nav columns, contact (email, location "Nepal"), social links
  (X / GitHub / LinkedIn), copyright.
- **`Newsletter.astro`** — reusable "join the list" banner + `mailto:` form.

Leftover / not wired in (safe to ignore or delete): `src/components/ThemeToggle.astro`,
`src/layouts/BaseLayout.astro`, `src/layouts/BlogLayout.astro`, and `src/content/test.md`
(outside `blog/`, so it isn't part of the collection).

---

## 10. Building & deploying

- **Dev:** `npm run dev`
- **Build:** `npm run build` → static files in `dist/`
- **Preview:** `npm run preview`
- **Regenerate icons:** `npm run icons` → renders `public/favicon.svg` into the PNG sizes and a
  multi-size `favicon.ico` (the SVG is the single source of truth for the brand mark).
- **Deploy:** because it's static, `dist/` can be hosted on any static host — Cloudflare Pages,
  Netlify, Vercel, GitHub Pages, etc. No server config, environment variables, or database needed.

---

## 11. Maintenance quick-reference

**Add a blog post**

1. Create `src/content/blog/<slug>.md`.
2. Add frontmatter:
   ```
   ---
   title: My New Article
   date: 2026-10-05
   category: ai
   tags: [AI, Tools]
   summary: One-line teaser shown on the blog cards.
   ---
   ```
3. Write Markdown below. That's it — it shows on `/blog`, in search, and at `/blog/<slug>`.

**Un-blur the home page previews**

- The "Latest Articles" cards in `index.astro` are hard-coded placeholders. Once real posts exist,
  link them to `/blog/<slug>` and remove `content-blur` from the title/description/date.

**Change the contact email**

- Replace `psbd225@gmail.com` (Business, Footer, Newsletter, Home).

---

## 12. Ideas / next steps

- **Receive real emails:** replace `mailto:` forms with a form backend (Formspree, Resend, or a
  small serverless function) so submissions land in an inbox.
- **Wire the home "Latest Articles"** to `getCollection('blog')` so the previews reflect real,
  latest posts instead of placeholders.
- **SEO:** add `sitemap.xml`, `robots.txt`, Open Graph meta, and canonical URLs.
- **Clean up:** remove the unused layouts/components and `test.md` if they won't be used.
- **Domain / CI:** connect a custom domain and a build pipeline on the chosen host.

**How to add a new blog post to the Alternating.ai site**
The blog is powered by Astro’s **Content Collection** feature. All posts live as Markdown files under `src/content/blog/`. When you add (or edit) a file there and rebuild the site, Astro automatically picks it up and generates the corresponding page at `/blog/<slug>` (where the slug is the filename without the `.md` extension).

---

### 1. File location & naming

```
src/content/blog/
   ├── what-is-ai.md
   ├── ai-business-education.md
   ├── ai-ethics.md
   └── YOUR-NEW-POST.md   ← add your file here
```

- Use a **kebab‑case** filename (e.g., `my-first-ai-post.md`).
- The filename becomes part of the URL: `/blog/my-first-ai-post`.

### 2. Required front‑matter (YAML block at the top of the file)

Each file must start and end with triple dashes (`---`) and contain fields that match the schema defined in `src/content.config.ts`:

```yaml
---
title: "Your Post Title"
date: 2026-10-05 # ISO‑8601 date (YYYY-MM-DD); time is optional
category: "AI" # optional – appears as a tag pill
tags: ["AI", "Tutorial", "For Beginners"] # array of strings
summary: "A short blurb that appears in lists (optional)."
---
```

- `title` – required, used in the `<title>` tag and post header.
- `date` – required; determines sort order (newest first).
- `category` – optional string; if present, it shows as a tag pill.
- `tags` – optional array of strings; each tag becomes a clickable filter on the blog index.
- `summary` – optional plain‑text description; if omitted, Astro falls back to the first lines of the body.

### 3. Markdown body

After the closing `---`, write your article in standard Markdown. You can use headings, lists, code blocks, images (place images in `src/content/blog/` or `public/` and reference them relatively), etc.

**Example stub:**

```markdown
---
title: "Getting Started with LLMs"
date: 2026-10-05
category: "AI"
tags: ["LLM", "Prompt Engineering", "Guide"]
summary: "A practical introduction to large language models for beginners."
---

# Getting Started with LLMs

Large language models (LLMs) are transforming how we interact with AI...

## Why LLMs matter

- They enable natural‑language interfaces…
- …

## How to begin

1. Pick a model (e.g., Llama 3, Mistral)…
2. …
```

### 4. Test locally (optional but recommended)

```bash
# Install deps if you haven’t already
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:4321/blog/your-new-post` to see the post. The blog index (`/blog`) will automatically list it.

### 5. Build for production (to verify before deploying)

```bash
npm run build   # outputs to ./dist/
npm run preview # serve the built site locally
```

### 6. Deploy

- **If you’re using GitHub integration (recommended)**: commit the new Markdown file and push to your repo. Cloudflare Pages will detect the push, run `npm run build`, and deploy the updated site automatically.
- **If you’re using Direct Upload**: rebuild locally (`npm run build`) and upload the entire `dist/` folder again via the Cloudflare dashboard (or `wrangler pages deploy dist --project-name=alternating-ai`).

---

### Quick checklist

- [ ] File placed in `src/content/blog/` with `.md` extension.
- [ ] Front‑matter includes `title` and `date` (others optional).
- [ ] Markdown body written after the front‑matter.
- [ ] (Local) `npm run dev` shows the new post.
- [ ] (Local) `npm run build` completes without errors.
- [ ] Commit & push (or rebuild & upload) → Cloudflare redeploys.

That’s it—your new article will be live at `https://alternating.ai/blog/your-new-post` (or `https://www.alternating.ai/blog/...` if you prefer the www subdomain). Happy writing! 🚀
