# Boxwheel Dashboard Design System

## Direction

**Operations Center with Industrial Signature**

This is a fleet management dashboard for leadership to scan utilization at a glance. The design draws from the trailer yard environment — asphalt surfaces, steel equipment, hi-vis safety colors.

## User

Grant / Boxwheel leadership. Checking in on fleet health weekly or for board prep. Needs to scan quickly, spot problems, understand portfolio state at a glance.

## Feel

Dense but not cluttered. Information-rich. Dark-framed like a control room. Utilization is the hero metric.

---

## Color Tokens

```css
/* Surfaces - from yard to office */
--asphalt: 220 13% 10%;        /* Sidebar, dark frames */
--asphalt-light: 220 10% 16%;  /* Elevated dark surfaces */
--steel: 220 10% 98%;          /* Content area background */
--steel-dim: 220 10% 95%;      /* Card backgrounds, insets */

/* Text hierarchy */
--ink: 220 13% 8%;             /* Primary text */
--ink-muted: 220 10% 40%;      /* Secondary text */
--ink-faint: 220 8% 56%;       /* Tertiary/disabled */
--ink-inverse: 220 10% 96%;    /* Text on dark surfaces */

/* Brand - Boxwheel lime green */
--lime: 72 61% 52%;            /* Primary brand accent */
--lime-dark: 72 55% 38%;       /* Text on light backgrounds */
--lime-muted: 72 40% 48%;      /* Softer accent */

/* Utilization heatmap gradient */
--util-empty → --util-full     /* Slate to lime green */
```

## Depth Strategy

**Subtle shadows only.** No harsh borders on cards.

```css
.surface-raised {
  background: white;
  box-shadow:
    0 1px 2px hsl(220 10% 50% / 0.04),
    0 1px 3px hsl(220 10% 50% / 0.06);
}
```

## Spacing

Base unit: `4px` (Tailwind's default)
- Page padding: `p-5` (20px)
- Card padding: `p-4` to `p-5`
- Section gaps: `space-y-5`

## Typography

- Headlines: `font-semibold`, tight tracking
- Body: `text-sm` (14px) default
- Data labels: `text-xs` (12px)
- Numbers: `tabular-nums` for alignment

## Key Patterns

### Hero Metric
Large number in `--highvis`, supporting context to the right, progress bar below.

### Utilization Badge
```css
.util-empty { background: slate/15%; color: slate; }
.util-low { background: gray/15%; color: gray; }
.util-mid { background: yellow-green/18%; color: olive; }
.util-high { background: lime/20%; color: lime-dark; }
.util-full { background: lime/22%; color: lime-darker; }
```

### Data Tables
- Header row: `background: var(--steel-dim)`
- Row hover: `bg-gray-50/50`
- Numbers right-aligned, `tabular-nums`

### Cards
- White background, subtle shadow
- Header with bottom border
- Content padding `p-4` to `p-5`

## Sidebar

Dark `--asphalt` background. Narrow (w-56). Nav items with subtle hover states. Active state uses `--asphalt-light`.

---

## Defaults Rejected

1. ~~Generic 4-card KPI grid~~ → Hero utilization with context
2. ~~Traffic light colors~~ → Brand heatmap gradient (slate → lime green)
3. ~~Light sidebar~~ → Dark frame (control room feel)
4. ~~Generic tokens~~ → Domain-specific naming (asphalt, steel, lime)
