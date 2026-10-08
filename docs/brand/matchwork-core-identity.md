# MatchWork core identity

MatchWork is a problem-first marketplace. Companies describe needs, professionals propose solutions, and the platform helps both sides find the right fit.

The brand should feel reliable, technological, clean, connective, agile, human, modern, and efficient.

## Wordmark and mark

- Official logo variants supplied by the user are stored unchanged in `apps/web/public/brand/`: horizontal wordmark, reversed wordmark for dark backgrounds, compact mark, and stacked lockup.
- Use the reversed wordmark on dark backgrounds and the standard horizontal wordmark on light backgrounds. Use the compact mark for small standalone placements and the browser icon. The stacked lockup remains available for vertical compositions.
- Do not recolor, trace, or reconstruct the supplied artwork in CSS or inline SVG. The wordmark images have transparent padding; their display may clip that empty padding to fit a horizontal logo area.
- Do not add a second text-based recreation beside a logo image that already contains the wordmark.

## Color system

| Token | Hex | Use |
| --- | --- | --- |
| MatchWork Night Blue | `#0B2A5B` | Brand mark and trust-oriented elements |
| MatchWork Purple | `#8A4DFF` | Primary actions and Match moments |
| Soft Lavender | `#D8C4FF` | Supporting highlights and selected states |
| Slate Gray | `#687280` | Muted text, borders, and secondary surfaces |
| Mist | `#F5F7FB` | Light surfaces and pages outside the public landing |
| Soft White | `#F8FAFC` | Primary text on dark, fields, and occasional light surfaces |
| GitHub Night | `#0D1117` | Public landing background |
| Night Surface | `#161B22` | Base for dark cards, subtly tinted with Slate Gray |
| Night Surface Raised | `#21262D` | Base for prominent dark surfaces, subtly tinted with Slate Gray |

The public landing uses GitHub Night as its background, Slate Gray for borders and as an input to its dark surface colors, and Soft White text. Other routes may keep their light surfaces. Purple should draw attention to meaningful Match states and primary actions, not decorate every surface.

## Typography

- Sora Semibold or Bold for display headings.
- Inter Regular or Medium for interface text.
- JetBrains Mono for compact technical labels and data markers.

## Geometry and interaction

Use connected nodes, modular blocks, rounded corners, intersecting lines, and the interlocking ribbon shape. Preserve clear alignment, readable contrast, and generous space. Match badges signal mutual interest in continuing a conversation.

The core service family is Match, Proposals, Projects, and Talent. Localize interface labels while preserving these concepts.

In product copy, a Match happens when a proposal fits a problem and both participants want to continue. A Match does not mean that a contract, payment, or hiring agreement exists.
