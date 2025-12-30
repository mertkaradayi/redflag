# Dashboard Redesign Plan

Align the dashboard page (`app/dashboard/page.tsx`) with the deployments page (`app/deployments/page.tsx`) design language for consistent branding.

---

## Step 1: Restructure Hero Section Layout

**Current state**: Dashboard hero is minimal with just a title and subtitle inside the main container.

**Target state**: Match deployments page hero with larger typography, descriptive subtitle, and inline CTA button.

**Changes**:
- Increase `h1` font size to match deployments (`text-3xl sm:text-5xl`)
- Expand subtitle copy to be more descriptive and actionable
- Add primary CTA button ("Start Analysis") inline with the hero section, positioned left
- Move network filter, time filter, and view mode toggle inline to the right of the CTA (matching deployments control bar pattern)

---

## Step 2: Extract Controls from Card into Inline Toolbar

**Current state**: Search, filters, sort, and view toggle are wrapped inside a `<Card>` component with `CardContent`.

**Target state**: Controls sit directly below the hero as a horizontal toolbar with pill-style buttons (no card wrapper).

**Changes**:
- Remove the outer `<Card>` and `<CardContent>` wrapper around controls
- Style controls as a `flex flex-wrap items-center gap-3` row
- Add vertical dividers (`h-4 w-px bg-border dark:bg-white/15`) between control groups
- Apply pill styling to all toggle groups: `rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-1`

---

## Step 3: Add Auto-Refresh Toggle with Status Indicator

**Current state**: Dashboard has auto-refresh logic but no visible toggle in the UI (it's hidden/removed).

**Target state**: Match deployments page auto-refresh toggle with pause/play icon, ON/OFF label, and 30s countdown.

**Changes**:
- Add auto-refresh toggle button to the controls toolbar
- Use `PauseCircle` / `PlayCircle` icons from lucide-react
- Show ON/OFF state with red accent color when active: `border-[#D12226]/40 bg-[#D12226]/10 text-[#D12226]`
- Display countdown timer when active (`30s`)

---

## Step 4: Unify Search Input Styling

**Current state**: Search input uses slightly different border/background styling and is inside the card.

**Target state**: Match deployments search input styling exactly.

**Changes**:
- Move search input to the inline toolbar
- Apply consistent styling: `rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 py-2 pl-11 pr-10`
- Ensure focus state uses `focus:border-[#D12226] focus:ring-2 focus:ring-[#D12226]/40`
- Position search icon and clear button consistently

---

## Step 5: Redesign QuickStatsBar as KPI Tiles

**Current state**: QuickStatsBar displays risk counts in a 5-column grid with filter toggle behavior.

**Target state**: Make KPI tiles match deployments page stat tiles (Total, Last 24h, Latest Checkpoint) in visual style.

**Changes**:
- Increase padding in tiles to `p-3.5` (match deployments)
- Add percentage delta indicators with `TrendingUp` / `TrendingDown` icons for time-based comparisons
- Use consistent label styling: `text-[10px] font-semibold uppercase tracking-[0.2em]`
- Add "vs previous period" subtitle text under values
- Ensure active filter state uses: `border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/20`

---

## Step 6: Add Legend Card Section

**Current state**: Dashboard has no legend explaining risk level colors.

**Target state**: Add a legend card (similar to deployments "Legend" section) explaining risk level indicators.

**Changes**:
- Create a new section below QuickStatsBar with a legend card
- Use the deployments legend pattern: icon + "Legend" label, description, color swatches with labels
- Map risk levels to color swatches:
  - Critical: `bg-[#D12226]`
  - High: `bg-orange-500`
  - Moderate: `bg-yellow-500`
  - Low: `bg-emerald-500`
- Include network monitoring status indicator at the bottom

---

## Step 7: Improve Compact Table Header Styling

**Current state**: Compact view table header uses `text-[10px]` uppercase labels but styling could be more refined.

**Target state**: Match deployments card header styling with consistent typography and spacing.

**Changes**:
- Update header to use: `text-[10px] font-semibold uppercase tracking-[0.3em]` (increase tracking)
- Apply background: `bg-[hsl(var(--surface-muted))]/30 dark:bg-black/20`
- Ensure border uses: `border-b border-border/50 dark:border-white/5`
- Adjust column padding to `pl-6 pr-4 py-3`

---

## Step 8: Standardize Pagination Controls

**Current state**: Pagination uses mixed border styles (`border-zinc-200/50 dark:border-zinc-800/50` vs `border-border dark:border-white/10`).

**Target state**: Unify all pagination buttons to use the same border/background pattern as deployments.

**Changes**:
- Replace all `border-zinc-200/50 dark:border-zinc-800/50` with `border-border dark:border-white/10`
- Replace `bg-black/40` in pagination with `bg-[hsl(var(--surface-muted))] dark:bg-black/40` for consistency
- Ensure hover states use: `hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10`
- Active page button: `bg-[#D12226] text-white border border-[#D12226] hover:bg-[#a8181b]`

---

## Step 9: Add Gradient CTA Section at Bottom

**Current state**: Dashboard ends with pagination controls, no closing CTA.

**Target state**: Add a full-width gradient CTA section (matching deployments "Close the loop" section).

**Changes**:
- Add section after pagination with: `bg-linear-to-br from-[#D12226]/60 via-[#D12226]/30 to-background dark:to-black`
- Include pill label: `border border-white/20 bg-white/10 text-white/80` with contextual text
- Add headline: "Analyze any package" (or similar call to action)
- Add descriptive paragraph
- Include two buttons: "View Deployments" (outline) and "Start Analysis" (solid white)

---

## Step 10: Add Highlight Feature Cards

**Current state**: Dashboard focuses purely on contract list with no feature explanation.

**Target state**: Add 2-4 highlight cards below the contract list explaining dashboard capabilities.

**Changes**:
- Create a grid section: `lg:grid-cols-[1fr_2fr]` matching deployments layout
- Add 4 highlight cards with:
  - Icon (from lucide-react) in `text-[#D12226]`
  - Label: `text-xs font-semibold uppercase tracking-[0.3em] text-[#D12226]`
  - Title: `text-lg font-semibold text-foreground dark:text-white`
  - Description: `text-muted-foreground dark:text-white/80`
- Add hover effect: `hover:border-[#D12226]/40 hover:bg-[#D12226]/10`

**Suggested cards**:
1. "AI Analysis" - Multi-agent security audit pipeline
2. "Risk Scoring" - Quantitative risk assessment 0-100
3. "Real-time Updates" - Auto-refresh with 30s cadence
4. "Code Patterns" - Pattern detection for rug pull indicators

---

## Step 11: Apply Consistent Transition Animations

**Current state**: Dashboard has transitions but they're not consistently applied.

**Target state**: Ensure all interactive elements have consistent `transition-colors duration-200`.

**Changes**:
- Add `transition-colors duration-200` to all cards, buttons, and interactive elements
- Ensure loading states use consistent spinner styling: `h-11 w-11 animate-spin rounded-full border-2 border-border dark:border-white/20 border-t-transparent`
- Apply `transition-all` to elements that change size/layout

---

## Step 12: Clean Up CSS Variable Usage

**Current state**: Mix of hardcoded colors and CSS variables.

**Target state**: Consistent use of CSS variables with dark mode overrides.

**Changes**:
- Replace all `bg-white/5` with `bg-[hsl(var(--surface-elevated))] dark:bg-white/5`
- Replace all `bg-black/40` with `bg-[hsl(var(--surface-muted))] dark:bg-black/40`
- Ensure text colors use: `text-foreground dark:text-white` for primary text
- Ensure muted text uses: `text-muted-foreground dark:text-zinc-400`
- Remove any inconsistent border colors (use `border-border dark:border-white/10` everywhere)

---

## Summary of Key Design Tokens

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Surface Elevated | `bg-[hsl(var(--surface-elevated))]` | `dark:bg-white/5` |
| Surface Muted | `bg-[hsl(var(--surface-muted))]` | `dark:bg-black/40` |
| Border | `border-border` | `dark:border-white/10` |
| Border Subtle | `border-border/50` | `dark:border-white/5` |
| Text Primary | `text-foreground` | `dark:text-white` |
| Text Muted | `text-muted-foreground` | `dark:text-zinc-400` |
| Accent | `#D12226` | `#D12226` |
| Accent Hover | `#a8181b` | `#a8181b` |
| Active State BG | `bg-[#D12226]/10` | `dark:bg-[#D12226]/20` |
| Active State Border | `border-[#D12226]/60` | `dark:border-[#D12226]/60` |
| Shadow | `shadow-sm shadow-black/5` | `dark:shadow-white/5` |

---

## Files to Modify

1. `app/dashboard/page.tsx` - Main restructuring
2. `app/components/QuickStatsBar.tsx` - Enhanced KPI tiles
3. `app/components/CompactContractCard.tsx` - Table styling alignment (if needed)
4. `app/components/ViewModeToggle.tsx` - Ensure pill styling consistency

## New Components to Consider

1. `app/components/DashboardLegend.tsx` - Risk level legend card
2. `app/components/DashboardHighlights.tsx` - Feature highlight cards
3. `app/components/DashboardCTA.tsx` - Bottom CTA section

---

## Implementation Priority

1. Steps 1-4 (Hero + Controls): High impact, establishes the new layout
2. Steps 5-6 (Stats + Legend): Medium impact, improves information hierarchy
3. Steps 7-8 (Table + Pagination): Polish, consistency fixes
4. Steps 9-10 (CTA + Highlights): Low priority, marketing/polish
5. Steps 11-12 (Animations + CSS): Final polish pass
