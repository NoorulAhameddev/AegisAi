# Aegis AI — Design System (Art Bible)

Source of truth for all UI in `apps/web`. Feed this into every AI session.
Any code that violates this file is wrong. No exceptions.

## Positioning

Aegis is an **enterprise AI workspace** built on worker-backed async architecture.
The name means *shield* — the product language should read as armor: precise,
machined, trustworthy. We sell control and security, not vibes. The interface
must feel like an instrument panel, not a consumer toy.

## Palette

Warm graphite base (never cold zinc/slate). Amber = brass = the armored accent.

| Token | Value | Use |
|---|---|---|
| `--ink-950` | `#080705` | Page base (deepest) |
| `--ink-900` | `#0a0906` | Primary surface |
| `--ink-850` | `#14120e` | Raised surface / sidebar |
| `--ink-800` | `#1c1914` | Panels, inputs |
| `--ink-700` | `#2a251e` | Borders on dark surfaces |
| `--ink-500` | `#6b6560` | Muted text |
| `--ink-300` | `#b8b0a6` | Secondary text |
| `--ink-100` | `#f0ebe4` | Primary text — cream, never #fff |
| `--brand` | `#c8965a` | Amber accent (brass) |
| `--brand-dim` | `#a3753f` | Accent, muted / hover |
| `--hair` | `rgba(240,235,228,0.08)` | Hairline dividers |
| `--hair-strong` | `rgba(240,235,228,0.16)` | Emphasis hairlines |

**FORBIDDEN:** purple, indigo, blue, cyan, pink, emerald accents. Gradients only
for intentional text treatment. No `#09090b`/`#18181b` zinc defaults, no pure
`#ffffff` on dark, no `#fafafa`.

## Typography Trinity

| Role | Family | Notes |
|---|---|---|
| Display | Space Grotesk | Headings, hero, numbers. `letter-spacing: -0.03em` |
| Body | IBM Plex Sans | UI, paragraphs. Weight 300–400, `line-height: 1.65` |
| Mono | IBM Plex Mono | Eyebrows, code, labels, stats, terminal frames |

Rules:
- Headings: `letter-spacing: -0.03em`, `line-height: 1.05–1.15`
- Eyebrow labels: mono, `letter-spacing: 0.12em`, `text-transform: uppercase`, `font-size: 0.62rem`, color `var(--brand)`
- Body copy: weight 300, `line-height: 1.7`
- Never use Inter or Geist. `font-sans` maps to IBM Plex Sans.

## Buttons

Bracket style with clip-path corner cut. No rounded pill buttons.

```css
.btn-bracket {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}
```

Primary: brand amber fill, ink-950 text. Secondary: transparent, hairline border.
Tertiary/ghost: text only, mono uppercase.

## Hierarchy Without Cards

- Use **left-border insets** (`border-left: 2px solid var(--brand)`) instead of boxed cards for insights/stats.
- Use **stat rows** with 1px vertical dividers instead of stat cards.
- Use **hairdlines** (`--hair`) for section separation, not full borders everywhere.
- Panels are flat (`--ink-850`), no drop shadows, no glassmorphism, no glow.

## Layout

- Single-page editorial scroll. Sections with `id`, eyebrow label, headline, body.
- Nav highlights active section via IntersectionObserver.
- Max content width ~`72rem`. Generous vertical rhythm (`clamp` spacings, multiples of 8px).
- Background texture: architectural grid (1px hairlines every 64px), not glow blobs.

## Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) everywhere.
- Scroll reveal: fade + 24px rise, 0.7s, staggered `+0.1s` classes.
- Numbers count up when scrolled into view (IntersectionObserver).
- Scroll progress bar: 2px, amber, fixed top.
- Never: `animate-bounce`, `animate-spin` on UI elements, `transition: all 0.3s ease`.

## Micro-Details (apply surgically)

- Terminal frames (3 window dots) for code blocks.
- Eyebrow mono labels above every section heading.
- Copy-on-click with "Copied!" state.
- Monumental background type — oversized text as structure.
- 2px scroll progress bar in brand color.
