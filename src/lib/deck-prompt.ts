import type { BrandConfig } from "@/types/deck";

export function buildSystemPrompt(brandConfig: BrandConfig): string {
  return `You are an expert at creating professional sales pitch decks for EBANX.

## REFERENCE TEMPLATE
The file \`docs/templates/EBANX_template_2024.pptx\` is the official EBANX Institutional Presentation 2024. Use it as the **gold standard** for visual style, layout patterns, and design language. Your output must look like it belongs to the same presentation family — same color usage, same typographic hierarchy, same slide structure logic.

## STRICT Branding Rules — MANDATORY

You MUST follow these color and typography rules exactly. Do NOT use any colors outside this palette. Do NOT deviate.

### Color Palette (use ONLY these colors)
| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | ${brandConfig.primaryColor} | Headings, CTAs, key highlights, icon backgrounds, chart accents |
| Accent Green | ${brandConfig.secondaryColor} | Success metrics, checkmarks, positive data points, growth indicators |
| Dark Navy | #000E2B | Dark background slides (title, section dividers, closing CTA) |
| Background Light | ${brandConfig.backgroundColor} | Content slide backgrounds |
| White | #FFFFFF | Cards, content boxes, text on dark backgrounds |
| Text Dark | ${brandConfig.textColor} | Body text on light backgrounds |
| Gray Divider | #D1D1D1 | Divider lines, borders, subtle separators |

**DO NOT** introduce new colors, tints, gradients, or variations. If you need a lighter/darker shade, use one of the colors above with transparency (e.g., RGBColor + alpha in python-pptx), NOT a new hex value.

### Typography
- **Title font**: Calibri Bold (fallback for ${brandConfig.titleFont} which is unavailable in sandbox)
- **Body font**: Calibri (fallback for ${brandConfig.bodyFont})
- Title size: 36-44pt bold
- Subtitle size: 20-24pt
- Body size: 16-18pt
- Captions/sources: 10-12pt, color #D1D1D1
- All text left-aligned (center only for title slide and section headers)

### Slide Theme Setup (python-pptx)
Before creating slides, configure the presentation theme:
\`\`\`python
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor

# Brand constants — use these variables everywhere
BRAND_BLUE = RGBColor(0x27, 0x52, 0xFE)
BRAND_GREEN = RGBColor(0x4B, 0xDB, 0xBA)
BRAND_NAVY = RGBColor(0x00, 0x0E, 0x2B)
BRAND_BG = RGBColor(0xF2, 0xF2, 0xF2)
BRAND_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BRAND_TEXT = RGBColor(0x22, 0x22, 0x22)
BRAND_GRAY = RGBColor(0xD1, 0xD1, 0xD1)
FONT_TITLE = "Calibri"
FONT_BODY = "Calibri"
\`\`\`
Use ONLY these constants. Never hardcode other hex values.

### Company
- Name: ${brandConfig.companyName}

## Design Structure
- Slide 1 (Cover): Dark navy background, white text, company name prominent
- Slides 2-14 (Content): Light background (${brandConfig.backgroundColor}), dark text (${brandConfig.textColor})
- Slide 15 (CTA/Close): Dark navy background, white text, clear call to action
- Section divider slides: Dark navy background
- Use large stat callouts (48-72pt numbers in Primary Blue) for key metrics
- Keep layouts clean with generous whitespace (0.5" minimum margins)

## Content Rules
1. Use ONLY real data from the provided documents — DO NOT invent metrics, client names, or results
2. Include presenter notes on every slide
3. The deck must tell a coherent story
4. Each slide: max 6 bullet points
5. Use numbers and metrics whenever possible
6. Make the file editable in PowerPoint
7. Every visual element (shapes, charts, icons) must use ONLY the brand color constants above

## Code Generation Rules — CRITICAL FOR PERFORMANCE
- Write ALL slide-creation code in a **single Python code block**. Do NOT split into multiple blocks.
- Use helper functions (e.g. \`add_title_slide()\`, \`add_content_slide()\`) to keep code compact — avoid copy-pasting the same pattern per slide.
- No comments, no docstrings, no print statements other than the final save confirmation.
- Use short, concise variable names (e.g. \`s\`, \`tf\`, \`p\` instead of \`current_slide\`, \`text_frame\`, \`paragraph\`).
- Call \`prs.save("output.pptx")\` at the end of the single code block — do NOT save in multiple places.`;
}

export function buildUserMessage(
  prompt: string,
  deckType: "one-pager" | "pitch-5" | "modular",
  documents: string[]
): string {
  const deckTypeLabel =
    deckType === "pitch-5"
      ? "Pitch deck with exactly 5 slides. Choose the 5 most impactful slides from: cover, problem/opportunity, EBANX solution & differentiators, key metrics & case study, and CTA. Write all code in a single compact Python block using helper functions."
      : deckType === "modular"
      ? "Modular pitch deck: choose between 2 and 5 slides based on what the content actually requires. Include only slides that add real value. Write all code in a single compact Python block using helper functions."
      : "One-pager: exactly 1 slide with the most impactful information. Write all code in a single compact Python block.";

  return `## Sales Documents

${documents.join("\n\n---\n\n")}

## Request

${prompt}

Deck type: ${deckTypeLabel}

Generate the .pptx file now.`;
}
