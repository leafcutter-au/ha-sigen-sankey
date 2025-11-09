# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**This is a fork** of `MindFreeze/ha-sankey-chart` being transformed into an **energy-specific Sankey diagram card** for Home Assistant with Sigenergy-style visualizations. The card displays energy flow between entities (solar, battery, grid, loads) with wide node bars and on-bar labels showing entity types, values, and percentages.

**Key Differentiator**: Unlike the original card (thin 15px bars with side labels), this fork features:
- Wide node bars (70-80px) as the primary visual element
- Labels overlaid directly on colored bars with white text
- Entity type labels (SOLAR, BATTERY, LOAD, GRID)
- Percentage displays showing proportion of section totals
- Dual visual modes: `default` (original) and `sigenergy` (new energy-focused style)

**Important**: See `docs/SIGENERGY_SANKEY_IMPLEMENTATION_SPEC.md` for the complete implementation specification, visual requirements, and acceptance criteria.

## Development Commands

### Build & Development
- `npm start` - Start dev server with hot reload on http://127.0.0.1:3000/ha-sankey-chart.js
- `npm run build` - Lint + build production bundle to `dist/`
- `npm run rollup` - Build without linting
- `npm run lint` - Run ESLint on `src/*.ts`

### Testing
- `npm test` - Run all Jest tests
- `jest __tests__/specific.test.ts` - Run specific test file
- Tests use `ts-jest` with `jsdom` environment

### Local Testing with Home Assistant
1. Start dev server: `npm start`
2. Add to HA Lovelace resources:
```yaml
- url: 'http://127.0.0.1:3000/ha-sankey-chart.js'
  type: module
```
3. Hard refresh browser (Ctrl+Shift+R) after code changes

## Architecture

### Core Flow
```
User Config (YAML)
  ↓
ha-sankey-chart.ts (normalizes config, subscribes to HA state/statistics)
  ↓
chart.ts (calculates boxes, connections, percentages, layout)
  ↓
section.ts + label.ts (renders SVG + HTML with appropriate visual style)
```

### Key Components

**`src/ha-sankey-chart.ts`** - Main entry point
- Custom element `<sankey-chart>` registered with HA
- Handles config normalization via `normalizeConfig()`
- Manages HA WebSocket subscriptions (live state or historical statistics)
- Implements `energy_date_selection` integration and custom time periods
- Delegates rendering to `<sankey-chart-base>`

**`src/chart.ts`** - Core visualization engine
- `<sankey-chart-base>` component
- **`_calcBoxes()`**: Converts entity configs → Box objects with positions/sizes
- **Percentage calculation**: Computes `box.percentage = (box.state / sectionTotal) * 100`
- **Layout logic**: Determines vertical vs horizontal based on available width
- **State reconciliation**: Applies `children_sum`/`parents_sum` constraints
- **Zoom & highlighting**: Filters entities and highlights connections
- **CSS custom properties**: Sets `--sankey-bar-width`, `--sankey-label-text-color` for dynamic styling

**`src/section.ts`** - Section & connection rendering
- `renderSection()`: Renders boxes (nodes) and connectors (flows) as SVG
- `renderBranchConnectors()`: Creates gradient-filled paths between parent/child entities
- Handles both horizontal (left-to-right) and vertical (top-to-bottom) layouts
- Connection widths are proportional to flow values

**`src/label.ts`** - Label rendering (critical for Sigenergy style)
- `renderLabel()`: Routes to appropriate label renderer based on `visual_style`
- **`renderSigenergyLabel()`**: NEW - Renders on-bar labels with:
  - Entity type label (SOLAR, BATTERY, etc.) via `getEntityTypeLabel()`
  - State value + unit (23.03 kWh)
  - Percentage (67.12%)
  - All in white text, vertically stacked, center-aligned
- **`getEntityTypeLabel()`**: Extracts entity type from entity_id or name

**`src/styles.ts`** - CSS styling
- **Dynamic bar width**: `width: var(--sankey-bar-width, 15px)`
- **`.visual-style-sigenergy`**: CSS class for Sigenergy mode
  - Positions labels absolutely over bars
  - Styles multi-line label layout with `.entity-type`, `.state`, `.unit`, `.percentage` classes
  - Adjusts connector positions for wider bars
- Responsive layout classes for vertical/horizontal modes

**`src/energy.ts`** - Home Assistant Energy Dashboard integration
- Fetches historical statistics via `getStatistics()`
- Handles `energy_date_selection` card integration
- Supports custom time periods (`time_period_from`/`time_period_to`)
- Unit conversions: kWh → MJ, cost (monetary), CO2 (gCO2)

**`src/reconcile.ts`** - Parent/child state reconciliation
- `reconcileEntity()`: Ensures parent state matches sum of children (or vice versa)
- Strategies: `min`, `max`, `mean`, `latest`
- Used when measurement discrepancies exist (e.g., whole house ≠ sum of rooms)

**`src/utils.ts`** - Core utilities
- **`normalizeConfig()`**: Converts user YAML → internal Config object
  - Creates automatic passthroughs for entities spanning multiple sections
  - Applies Sigenergy defaults when `visual_style: 'sigenergy'`
  - Validates and normalizes entity configs
- **`formatState()`**: Formats numbers with locale and currency support
- **`normalizeStateValue()`**: Applies unit prefixes (m, k, M, G, T, auto)
- **`calculateTimePeriod()`**: Parses time period strings (now-1d, now/d, etc.)

**`src/types.ts`** - TypeScript definitions
- `SankeyChartConfig`: User-facing YAML config interface
- `Config`: Internal normalized config (extends with computed fields)
- `Box`: Represents a node with state, size, position, **percentage**
- `EntityConfigInternal`: Internal entity representation with children, accountedState
- `ConnectionState`: Represents a flow between parent and child

### Entity Types

- **`entity`**: Normal HA entity (default)
- **`passthrough`**: Invisible connector that passes entity across sections
- **`remaining_parent_state`**: Shows unaccounted parent state (like "Other")
- **`remaining_child_state`**: Shows excess child state (discrepancies)

### Visual Modes

**Default Mode** (`visual_style: 'default'`):
- 15px node bars on left/top edge
- Labels positioned beside bars (horizontal) or below (vertical)
- Original card behavior, backward compatible

**Sigenergy Mode** (`visual_style: 'sigenergy'`):
- 70px node bars (configurable via `bar_width`)
- Labels overlaid on bars with white text
- Shows entity type labels (if `show_entity_labels: true`)
- Shows percentages (if `show_percentages: true`)
- Designed for energy entities (solar, battery, grid, loads)

## Configuration

### Sigenergy Style Config Example
```yaml
type: custom:sankey-chart
visual_style: sigenergy
bar_width: 70
show_percentages: true
show_entity_labels: true
label_text_color: '#ffffff'
show_states: true
show_units: true
sections:
  - entities:
      - entity_id: sensor.solar_production
        name: SOLAR
        color: '#7fb842'
        children:
          - sensor.battery_charging
          - sensor.home_consumption
  - entities:
      - entity_id: sensor.battery_charging
        name: BATTERY
        color: '#4db8a8'
      - entity_id: sensor.home_consumption
        name: LOAD
        color: '#9b59b6'
```

### Key Config Options (Sigenergy-specific)
- `visual_style`: `'default'` | `'sigenergy'` - Visual rendering mode
- `bar_width`: number (px) - Width of node bars (default: 15 for default, 70 for sigenergy)
- `show_percentages`: boolean - Display percentage on each box
- `show_entity_labels`: boolean - Display entity type labels (SOLAR, BATTERY, etc.)
- `label_text_color`: string - Color for on-bar labels (default: '#ffffff')

## Implementation Notes

### Adding/Modifying Config Options

1. **Add to type definitions** (`src/types.ts`):
   - Add field to `SankeyChartConfig` interface
   - Add field to `Config` interface (if different)
   - Update `DEFAULT_CONFIG` constant

2. **Handle in normalization** (`src/utils.ts`):
   - Update `normalizeConfig()` to process new field
   - Apply Sigenergy-specific defaults if needed

3. **Use in rendering** (`src/chart.ts`, `src/label.ts`, etc.):
   - Access via `this.config.yourField` or `config.yourField`
   - Pass to child render functions as needed

4. **Update editor** (`src/editor/index.ts`):
   - Add field to schema in `_computeSchema()`
   - Add translations to `src/localize/languages/en.json`

### Percentage Calculation

Percentages are **section-relative**, not global:
```typescript
// In _calcBoxes() method (chart.ts)
let sectionTotal = 0;
boxes.forEach(box => { sectionTotal += box.state; });
boxes.forEach(box => {
  box.percentage = (box.state / sectionTotal) * 100;
});
```

To change to global percentages, calculate total across ALL sections first.

### CSS Custom Properties

Set in `chart.ts` render method:
```typescript
const containerStyle = {
  '--sankey-bar-width': `${barWidth}px`,
  '--sankey-label-text-color': config.label_text_color,
};
```

Used in `styles.ts`:
```css
.box div:first-child {
  width: var(--sankey-bar-width, 15px);
}
.visual-style-sigenergy .label {
  color: var(--sankey-label-text-color, #ffffff);
}
```

### State Sources

**Live state** (default):
- Reads current `hass.states[entity_id].state`
- Updates in real-time as entities change

**Historical statistics** (when `energy_date_selection` or `time_period_*` used):
- Fetches from HA statistics API
- Shows accumulated values over time period
- Requires `state_class: total` on entities

### Testing Checklist

When making changes:
- [ ] Run `npm test` - All Jest tests pass
- [ ] Test both `visual_style: 'default'` and `'sigenergy'`
- [ ] Test horizontal and vertical layouts
- [ ] Test with passthrough entities
- [ ] Test with `remaining_parent_state` / `remaining_child_state`
- [ ] Test zoom functionality (tap entity)
- [ ] Test with live state and historical statistics
- [ ] Verify no console errors
- [ ] Test in actual Home Assistant instance

## Common Tasks

### Running a Single Test
```bash
jest __tests__/zoom.test.ts
```

### Debugging in Browser
1. Start dev server: `npm start`
2. Add `debugger;` statement in TypeScript code
3. Open browser DevTools
4. Reload card in HA

### Adding a New Entity Type Label
Edit `getEntityTypeLabel()` in `src/label.ts`:
```typescript
// Add custom mapping
if (entityId.includes('inverter')) {
  return 'INVERTER';
}
```

### Changing Default Colors
Update `getEnergySourceColor()` in `src/energy.ts` or set in config:
```yaml
entities:
  - entity_id: sensor.solar
    color: '#your-color'
```

### Modifying Bar Width Calculation
In `chart.ts` render method:
```typescript
const barWidth = this.config.bar_width ||
  (this.config.visual_style === 'sigenergy' ? 70 : 15);
```

## File Structure Reference

```
src/
  ha-sankey-chart.ts      # Entry point, HA integration, config handling
  chart.ts                # Main rendering engine, box/connection calculations
  section.ts              # SVG section rendering
  label.ts                # Label rendering (default + Sigenergy styles)
  layout.ts               # Vertical/horizontal layout logic
  styles.ts               # CSS (includes .visual-style-sigenergy)
  energy.ts               # Energy Dashboard integration, statistics
  reconcile.ts            # Parent/child state reconciliation
  zoom.ts                 # Zoom filtering
  utils.ts                # normalizeConfig(), formatting, helpers
  types.ts                # TypeScript interfaces and types
  const.ts                # Constants (UNIT_PREFIXES, defaults)
  handle-actions.ts       # Tap/hold/double-tap actions
  subscribe-mixin.ts      # HA WebSocket subscription mixin
  print-config.ts         # Debug config printer
  hass.ts                 # HA registry utilities
  editor/                 # Visual card editor
    index.ts              # Main editor component
    entity.ts             # Entity config editor
    section.ts            # Section config editor
  localize/               # i18n translations
    localize.ts
    languages/*.json

__tests__/                # Jest tests
  *.test.ts
  __mocks__/              # Mock HA data
```

## Important Constraints

- **Bar width must be ≥ 15px** for readability
- **State values are clamped to ≥ 0** (negative values become 0)
- **Connections with state = 0 are not rendered**
- **Entity IDs must be unique within the config**
- **Passthroughs are auto-created** when entities skip sections
- **Sigenergy mode assumes colored bars** - ensure entities have `color` set
- **White text on light colors** may have readability issues - consider text shadows (future enhancement)

## Resources

- **Implementation Spec**: `docs/SIGENERGY_SANKEY_IMPLEMENTATION_SPEC.md`
- **Original Repo**: https://github.com/MindFreeze/ha-sankey-chart
- **HA Custom Cards**: https://github.com/custom-cards
- **Lit Documentation**: https://lit.dev
- **Home Assistant Frontend**: https://developers.home-assistant.io/docs/frontend/
