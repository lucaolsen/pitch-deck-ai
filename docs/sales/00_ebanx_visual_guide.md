# EBANX Visual Identity & Presentation Design Guide

> Source: EBANX-Institutional-Presentation-2024.pptx (official theme file)
> Use this as the **mandatory visual reference** for all generated presentations.

---

## Color Palette (MANDATORY — use ONLY these colors)

| Token | Hex | Usage |
|-------|-----|-------|
| Navy Dark | `#000E2B` | Title slides bg, section dividers, closing CTA slide, dark backgrounds |
| EBANX Blue | `#2752FE` | Primary CTAs, headings on light slides, key highlights, links |
| Teal / Mint | `#4BDBBA` | Success metrics, growth indicators, checkmarks, positive data, accent highlights |
| Light Background | `#F2F2F2` | Content slide backgrounds |
| White | `#FFFFFF` | Text on dark slides, cards on dark backgrounds |
| Dark Text | `#222222` | Body text on light backgrounds |
| Purple | `#9C50FF` | Special callouts, innovation highlights |
| Light Blue | `#40B3FF` | Supporting data, secondary highlights |
| Orange | `#FF8200` | Warnings, urgency, standout stats |
| Warm Gray | `#BEB9AF` | Dividers, captions, secondary labels |

**Strict rules:**
- NEVER invent new colors or use gradients outside these
- For tints/shades, use python-pptx transparency on these base colors
- Dark slides: `#000E2B` background + `#FFFFFF` text
- Light slides: `#F2F2F2` background + `#222222` text
- "Sandwich" structure: dark title → light content slides → dark closing CTA

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Slide title | Arial | 36–44pt | Bold |
| Section header | Arial | 20–24pt | Bold |
| Body text | Arial | 14–16pt | Regular |
| Captions / sources | Arial | 10–12pt | Regular, color #BEB9AF |
| Key stat callout | Arial | 48–72pt | Bold, color #2752FE or #4BDBBA |

- Title alignment: centered on dark slides, left-aligned on light slides
- Body alignment: always left-aligned
- Never underline titles — use whitespace instead

---

## Slide Structure (15-slide deck template)

1. **Cover** — Dark navy bg (`#000E2B`), EBANX logo top-left, large white title, teal subtitle
2. **Agenda / Overview** — Light bg, blue section header, numbered items
3. **Market Context / Problem** — Light bg with blue accent box, key stat callout in teal
4. **LATAM Opportunity** — Dark navy bg, white text, large numbers in teal
5. **EBANX Solution** — Light bg, 2-column layout (problem left, solution right)
6. **Product Overview** — Light bg, icon grid (icons in blue circles)
7. **Key Differentiators** — Light bg, 3-column cards with blue top borders
8. **Market Data** — Dark bg, large stat callouts (teal numbers, white labels)
9. **Case Studies** — Light bg, client logo + results in teal
10. **Business Model** — Light bg, flow diagram in blue
11. **Technology & Security** — Dark bg, light blue accent
12. **Roadmap** — Light bg, timeline in blue/teal
13. **Team** — Light bg, 2x3 grid with photos
14. **Partnerships** — Light bg, logo grid
15. **CTA / Next Steps** — Dark navy bg, white text, teal CTA button outline

---

## Layout Patterns

### Title / Dark Slides
- Full `#000E2B` background
- EBANX logo: top-left, white version
- Title: centered, white, 40–44pt bold Arial
- Subtitle: centered, teal (`#4BDBBA`), 20pt
- Optional: subtle teal horizontal line below title

### Content / Light Slides
- `#F2F2F2` background
- Slide number: bottom-right, 10pt, `#BEB9AF`
- Title: top-left, `#2752FE`, 32–36pt bold
- Content area: generous 0.5" margins
- Max 6 bullet points per slide

### Data / Stat Slides
- Large number: 60–72pt bold, `#2752FE` or `#4BDBBA`
- Label below: 14pt, `#222222` or `#FFFFFF`
- Source: 10pt, `#BEB9AF`, bottom of slide

### Card / Grid Layout
- Cards: white bg, 8px border-radius, subtle shadow
- Card header accent: 4px top border in `#2752FE`
- Icon containers: `#2752FE` circles, white icon inside

---

## Design Principles

1. **Navy dominates** — 60–70% of visual weight on dark slides
2. **Blue = action** — CTAs, headlines, primary emphasis always in `#2752FE`
3. **Teal = success** — Metrics, growth, positive outcomes always in `#4BDBBA`
4. **Every slide needs a visual** — chart, stat callout, icon, image, or shape
5. **No text-only slides** — always add at least one visual element
6. **Presenter notes required** — every slide must have detailed presenter notes
7. **Use real data only** — no invented metrics, client names, or results
8. **Consistent margins** — 0.5" minimum on all sides

---

## python-pptx Constants (use in all generated code)

```python
from pptx.dml.color import RGBColor
from pptx.util import Pt, Inches

# EBANX Brand Colors — MANDATORY
NAVY   = RGBColor(0x00, 0x0E, 0x2B)   # #000E2B
BLUE   = RGBColor(0x27, 0x52, 0xFE)   # #2752FE
TEAL   = RGBColor(0x4B, 0xDB, 0xBA)   # #4BDBBA
PURPLE = RGBColor(0x9C, 0x50, 0xFF)   # #9C50FF
LBLUE  = RGBColor(0x40, 0xB3, 0xFF)   # #40B3FF
ORANGE = RGBColor(0xFF, 0x82, 0x00)   # #FF8200
LGRAY  = RGBColor(0xF2, 0xF2, 0xF2)   # #F2F2F2
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)   # #FFFFFF
DGRAY  = RGBColor(0x22, 0x22, 0x22)   # #222222
WGRAY  = RGBColor(0xBE, 0xB9, 0xAF)   # #BEB9AF

FONT = "Arial"

# Slide dimensions (standard widescreen)
SLIDE_W = Inches(13.33)
SLIDE_H = Inches(7.5)
```
