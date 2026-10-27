Vantorflow design system v2 (Cyber Serif, emerald on black)

Built from 10 saved Dribbble dark-SaaS references (design_research/refs/ref_1 to ref_10). Lavender and solid-black directions were rejected; the brand stays emerald on #050505 with Newsreader headings and Inter body.

1. Spacing grid (4px base)
- Scale: 4, 8, 12, 16, 24, 32, 40, 48, 64. Use only these values.
- Card padding: 24px mobile, 32px desktop. Section gap: 32px. Stack gap inside cards: 16px. Control gap: 8px.
- Page container: max-width 1280px, 24px side padding (16px under 640px).
- Alignment: one 12-column grid for dashboard content. Sidebar 256px fixed on desktop. Every page title sits on the same baseline and the same 32px top margin.

2. Type scale (Inter body, Newsreader headings, 4px rhythm)
- Display: Newsreader 500, 48/52, tracking -0.02em (landing hero 72/76).
- H1: Newsreader 500, 32/40. H2: Newsreader 500, 24/32. H3: Newsreader 500, 18/26.
- Body: Inter 400, 15/24 (16/24 on landing). Small: 13/20. Meta: 12/16.
- Eyebrow label: Inter 600, 11px, uppercase, tracking 0.12em, color #949494.
- Numbers: Inter 600 with tabular-nums. Large stats: Newsreader 500, 40/44.

3. Colour tokens
- Background #050505, surface #0B0B0B, raised #171717, hover #1F1F1F, border #262626, glass border rgba(255,255,255,0.1).
- Text #EBEBEB, muted #949494, faint #6B6B6B.
- Accent emerald #10B981, hover #34D399, glow rgba(16,185,129,0.18).
- Status: success emerald, warning amber #F59E0B, danger #EF4444.

4. Motion
- Easing (standard): cubic-bezier(0.16, 1, 0.3, 1). Use for every transition and entrance.
- Durations: micro 150ms (hover, focus, color), control 200ms (buttons press, row highlight), panel 320ms (drawers, modals), entrance 520ms (page and card reveal with 40ms stagger).
- What animates: colour, border, shadow, transform (translateY up to -1px on hover, scale 0.98 on press), opacity on enter.
- Breathing: aurora background 14s ease-in-out; emerald status dot 2.4s pulse; primary CTA glow 3s.
- Reduced motion: all animations drop to 0.01ms (already in globals).

5. Cards and glass
- Glass card: background rgba(255,255,255,0.02), backdrop-filter blur(12px), border 1px rgba(255,255,255,0.1), radius 12px.
- Hover (interactive cards): border becomes rgba(16,185,129,0.35), background rgba(255,255,255,0.035), translateY(-1px), 200ms.
- Shimmer border: a 1px emerald gradient sweep on focus and on the active card only.
- Radius: 12px cards and controls, 999px pills, 6px tags.

6. Buttons
- Primary: emerald #10B981 background, #050505 text, 40px tall, 13px 600. Hover #34D399 plus 0 0 0 4px emerald glow ring at 12%. Press scale 0.98. Disabled 50% opacity.
- Secondary: #171717 background, 10% white border. Hover #1F1F1F.
- Ghost link: 1px emerald underline that grows 0 to 100% on hover.

7. Rows, lists and tables
- Row hover: background rgba(255,255,255,0.03), left 2px emerald rule fading in, 150ms.
- Table headers: 11px uppercase muted. Row borders 1px #262626.

8. Charts and numbers
- Readiness and score values: emerald for 70 and above, amber for 40 to 69, red below 40. Bars 4px tall, rounded, animate width 0 to value over 520ms.
- Count-up on first render for KPI numbers (capped at 600ms).

9. Loading states
- Skeleton: #171717 to #262626 shimmer, 1.4s linear, matching the real element height so nothing jumps.
- Breathing loader: emerald dot cluster, 1.2s staggered pulse, with an sr-only label.
- Never a blank page: show skeletons of the same layout.

10. Empty states
- Centred glass card, 48px padding, a 40px emerald-outlined icon ring that breathes, a serif headline, one sentence of help, one primary action. Used for no opportunities, no drafts, no approvals, no share links.

11. Focus and accessibility
- Focus ring: 2px emerald outline, 2px offset. Minimum 40px hit targets. Text contrast at least 4.5:1 on #050505.
