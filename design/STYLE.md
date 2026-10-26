# Vantorflow Design System — Cyber Serif (adapted)

## Application to Vantorflow

Application to Vantorflow: landing page = hero/navbar/benchmark table/CTA sections; app UI = glass opportunity cards, emerald readiness scores, serif section headings, spotlight pipeline cards, pulsing CTA buttons.

The landing page takes the hero, navbar, benchmark table and CTA treatment from this spec. The app dashboard reuses the same palette and components: glass cards for opportunities, emerald accents for readiness scores and CTAs, serif headings, spotlight cards, shimmer borders, morphing background glows and count-up stats.

## Summary

The 'Cyber Serif' style creates a premium, avant-garde digital experience by pairing the elegance of serif display fonts with the high-tech utility of monospace labels and emerald-glow accents. It emphasizes depth through blurred background shapes and motion through shimmer borders and spotlight interaction patterns.

## Style

Classical-tech hybrid style.

- Typography: 'Newsreader' (Serif) for headings (stark, tracking-tighter), 'Inter' (Sans) for readability, and 'Space Grotesk' for technical labels (all-caps, high-tracking).
- Colors: Primary black (#050505), Accent Emerald (#10b981), Text White (#EBEBEB).
- Effects: Glassmorphism (blur: 12px), Shimmer borders, and radial-gradient spotlights.

## Spec

Create a design with a background of #050505 and primary text of #EBEBEB.

- Use 'Newsreader' for display headings (font-weight: 200-800, italic support).
- Use 'Space Grotesk' for technical metadata (uppercase, tracking: 0.2em, font-size: 10px).
- Accent color is #10B981 (Emerald).
- Implement glassmorphism using background: rgba(255, 255, 255, 0.02) and backdrop-filter: blur(12px).
- Use a subtle border of rgba(255, 255, 255, 0.1) for cards.
- Animation curves should follow cubic-bezier(0.16, 1, 0.3, 1).
- Link hover: 1px emerald underline, animating 0 to 100%.

## Layout

- Container: max-w-7xl, 24px padding.
- Navbar: fixed, transparent at top; transitions to bg-black/80 backdrop-blur on scroll.
- Logo: command icon in a white rounded square, rotating 360 degrees on hover.
- Pill CTA: pulse-glow.

### Hero (100vh, split layout)

- Uppercase label with an emerald pulse dot.
- Headline: 100px Newsreader, tracking-tighter, leading-0.9, with one italic emerald word.
- Body text: text-white/50.
- Dual CTA: solid white pill with emerald glow, plus a ghost pill.
- Right side: floating glass UI mockup with parallax.

### Feature grid

- 3-column spotlight cards.
- 40px padding, rounded-3xl, shimmer border.
- Icon in a rounded-2xl container, rotating on hover.
- Title in serif; description in text-white/40.
- Staggered scroll reveal.

### Benchmark table

- Header: Space Grotesk, 10px.
- Row borders: 1px rgba(255,255,255,0.05).
- Alternating muted/emerald columns.
- Count-up numbers.
- Pulsing checks.

### CTA

- Massive serif headline with gradient text (white-emerald horizontal shift).
- Centered.
- Large pill button with a continuous emerald pulse shadow.

## Components

### Shimmer border

Implemented with ::after, inset -1px, a 3-color gradient (transparent, rgba(16,185,129,0.3), transparent) at 200% size, animating background-position from 200% to -200% over 4s linear.

### Spotlight

Implemented with ::before, a radial-gradient(600px at var(--mouse-x) var(--mouse-y), rgba(16,185,129,0.15), transparent 40%). Opacity goes from 0 to 1 on hover. JS mousemove updates the --mouse-x and --mouse-y variables.

### Morphing glow

A fixed 384px div with bg-emerald-500/10 and blur-100px. Its border-radius morphs from '40% 60% 60% 40% / 70% 30% 70% 30%' to '60% 40% 40% 60% / 30% 70% 30% 70%' over 8s, alternating.

## Rules

- MUST use Newsreader for all headlines.
- MUST use emerald sparingly, never as large blocks.
- MUST use the cubic-bezier(0.16, 1, 0.3, 1) curve for scroll reveals.
- DO NOT use standard rounded corners. Use rounded-3xl or pill shapes only.
- DO NOT oversaturate emerald. #050505 stays dominant.
