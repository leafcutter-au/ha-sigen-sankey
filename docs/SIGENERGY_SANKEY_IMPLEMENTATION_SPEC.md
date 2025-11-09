# Sigenergy-Style Sankey Chart Implementation Specification

## Document Version
**Version:** 1.0  
**Date:** November 7, 2025  
**Target Repository:** Fork of `MindFreeze/ha-sankey-chart`

---

## 1. Executive Summary

This specification details the modifications required to transform the existing Home Assistant Sankey Chart Card to match the Sigenergy application's visual design. The changes involve significant alterations to node bar width, label positioning, percentage displays, and overall visual styling.

### Key Objectives
1. Increase node bar width from 15px to ~70-80px
2. Move labels from beside bars to overlay on top of bars
3. Add entity type labels (SOLAR, BATTERY, LOAD, GRID) on node bars
4. Display percentage values on node bars
5. Maintain all existing functionality while adding new visual options

---

## 2. Visual Analysis

### 2.1 Current Implementation (Home Assistant Version - Image 2)
- **Node bars:** 15px wide, coloured blocks on the left edge
- **Labels:** Positioned to the right of bars horizontally
- **Content:** Shows value (kWh) and entity name (Solar, Battery, Load)
- **No percentages displayed**
- **Label background:** Transparent/card background

### 2.2 Target Implementation (Sigenergy - Image 1)
- **Node bars:** ~70-80px wide, dominant visual element
- **Labels:** Overlaid directly on coloured bars
- **Content:** 
  - Top: Entity type label (SOLAR, BATTERY, LOAD, GRID) - white text
  - Middle: Value with unit (23.03 kWh, 6.02 kWh, etc.) - white text
  - Bottom: Percentage (67.12%, 32.51%, etc.) - white text
- **Label styling:** White text, semi-transparent or no background, centred alignment
- **Typography:** Multi-line vertical stack

---

## 3. Technical Requirements

### 3.1 Configuration Schema Changes

**File:** `src/types.ts`

Add new configuration options to `SankeyChartConfig` and `Config` interfaces:

```typescript
export interface SankeyChartConfig extends LovelaceCardConfig {
  // ... existing properties
  
  // NEW: Visual style mode
  visual_style?: 'default' | 'sigenergy';
  
  // NEW: Node bar width (in pixels)
  bar_width?: number;
  
  // NEW: Show percentages on bars
  show_percentages?: boolean;
  
  // NEW: Show entity type labels on bars
  show_entity_labels?: boolean;
  
  // NEW: Label text color for on-bar labels
  label_text_color?: string;
  
  // NEW: Label background opacity (0-1)
  label_background_opacity?: number;
}
```

Update `DEFAULT_CONFIG`:

```typescript
export const DEFAULT_CONFIG: Config = {
  // ... existing defaults
  visual_style: 'default',
  bar_width: 15,
  show_percentages: false,
  show_entity_labels: false,
  label_text_color: '#ffffff',
  label_background_opacity: 0,
};
```

Update `Box` interface to include percentage:

```typescript
export interface Box {
  // ... existing properties
  percentage?: number; // NEW: Percentage of section total
}
```

---

### 3.2 Styling Changes

**File:** `src/styles.ts`

#### 3.2.1 Make Bar Width Dynamic

**Current code (line ~40):**
```css
.box div:first-child {
    width: 15px;
    height: 100%;
}
```

**Required change:**
```css
.box div:first-child {
    width: var(--sankey-bar-width, 15px);
    height: 100%;
}
.vertical .box div:first-child {
    width: 100%;
    height: var(--sankey-bar-width, 15px);
}
```

#### 3.2.2 Add Sigenergy Visual Style

**Add new CSS class** (after line ~45):

```css
/* Sigenergy-style label overlay */
.visual-style-sigenergy .box .label {
    position: absolute;
    left: 0;
    top: 0;
    right: auto;
    bottom: 0;
    width: var(--sankey-bar-width, 70px);
    height: 100%;
    padding: 8px 4px;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    white-space: normal;
    overflow: visible;
    z-index: 10;
    pointer-events: none;
}

.visual-style-sigenergy.vertical .box .label {
    width: 100%;
    height: var(--sankey-bar-width, 70px);
    left: 0;
    right: 0;
    top: 0;
    bottom: auto;
    padding: 4px 8px;
}

.visual-style-sigenergy .box .label .entity-type {
    font-size: 0.7em;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
    color: var(--sankey-label-text-color, #ffffff);
}

.visual-style-sigenergy .box .label .state {
    font-size: 1.1em;
    font-weight: bold;
    color: var(--sankey-label-text-color, #ffffff);
}

.visual-style-sigenergy .box .label .unit {
    font-size: 0.75em;
    color: var(--sankey-label-text-color, #ffffff);
    margin-left: 2px;
}

.visual-style-sigenergy .box .label .percentage {
    font-size: 0.75em;
    margin-top: 4px;
    color: var(--sankey-label-text-color, #ffffff);
}

.visual-style-sigenergy .box .label .name {
    display: none; /* Hide custom names in Sigenergy mode */
}

/* Adjust connector position for wider bars */
.visual-style-sigenergy .connectors {
    left: var(--sankey-bar-width, 70px);
}

.visual-style-sigenergy.vertical .connectors {
    left: 0;
    top: var(--sankey-bar-width, 70px);
}
```

#### 3.2.3 Update Passthrough Styling

**Current code (line ~54):**
```css
.box.type-passthrough div:first-child {
    opacity: 0.4;
}
```

**Keep as-is** but ensure it works with wider bars.

---

### 3.3 Percentage Calculation Logic

**File:** `src/chart.ts`

#### 3.3.1 Calculate Section Totals and Percentages

**Location:** In `_calcBoxes()` method, after boxes are created (around line 180)

**Add new code:**

```typescript
private _calcBoxes() {
    // ... existing code to create boxes ...

    const filteredConfig = filterConfigByZoomEntity(this.config, this.zoomEntity);
    const sectionsStates: SectionState[] = [];
    const sectionSize = this.vertical ? this.width - 32 : this.config.height;
    
    filteredConfig.sections.forEach(section => {
      let total = 0;
      const boxes: Box[] = section.entities
        .filter(entityConf => {
          const { min_state } = this.config;
          const { state } = this._getMemoizedState(entityConf);
          return state && state >= min_state;
        })
        .map(entityConf => {
          const { state, unit_of_measurement } = this._getMemoizedState(entityConf);
          total += state;
          
          // ... existing box creation code ...
          
          return {
            // ... existing box properties ...
            percentage: 0, // Will be calculated below
          };
        });

      // NEW: Calculate percentages after we know the total
      if (this.config.show_percentages && total > 0) {
        boxes.forEach(box => {
          box.percentage = (box.state / total) * 100;
        });
      }

      // ... rest of existing code ...
    });
}
```

---

### 3.4 Label Rendering Changes

**File:** `src/label.ts`

#### 3.4.1 Update renderLabel Function

**Current function signature (line ~7):**
```typescript
export function renderLabel(
  box: Box,
  config: Config,
  formattedState: string,
  name: string,
  spacerSize: number,
  vertical: boolean,
)
```

**Modify function to handle Sigenergy style:**

```typescript
export function renderLabel(
  box: Box,
  config: Config,
  formattedState: string,
  name: string,
  spacerSize: number,
  vertical: boolean,
) {
  const { show_names, show_states, show_units, show_percentages, show_entity_labels, visual_style } = config;
  const shouldShowLabel = box.config.type !== 'passthrough' && (show_names || show_states);
  
  if (!shouldShowLabel) return null;

  // NEW: Sigenergy-style rendering
  if (visual_style === 'sigenergy') {
    return renderSigenergyLabel(box, config, formattedState, name);
  }

  // ... existing default label rendering code ...
}

// NEW: Sigenergy-specific label renderer
function renderSigenergyLabel(
  box: Box,
  config: Config,
  formattedState: string,
  name: string,
) {
  const { show_units, show_percentages, show_entity_labels } = config;
  
  // Determine entity type label
  const entityType = getEntityTypeLabel(box.entity_id, name);
  
  return html`<div class="label">
    ${show_entity_labels ? html`<div class="entity-type">${entityType}</div>` : null}
    ${config.show_states
      ? html`<div>
          <span class="state">${formattedState}</span>${show_units
            ? html`<span class="unit">${box.unit_of_measurement}</span>`
            : null}
        </div>`
      : null}
    ${show_percentages && box.percentage !== undefined
      ? html`<div class="percentage">${box.percentage.toFixed(2)}%</div>`
      : null}
  </div>`;
}

// NEW: Helper function to extract entity type label
function getEntityTypeLabel(entityId: string, name: string): string {
  // Priority order:
  // 1. Use name if it's SHORT (single word, uppercase)
  // 2. Extract from entity_id
  // 3. Parse from name
  
  if (name && name.length <= 10 && name === name.toUpperCase()) {
    return name;
  }
  
  // Extract from entity_id pattern like "sensor.solar_production"
  const entityMatch = entityId.match(/\.([a-z_]+)/);
  if (entityMatch) {
    const extracted = entityMatch[1].replace(/_/g, ' ').toUpperCase();
    // Take first word if multi-word
    return extracted.split(' ')[0];
  }
  
  // Parse from name
  if (name) {
    return name.split(' ')[0].toUpperCase();
  }
  
  return 'ENTITY';
}
```

**Add import at top of file:**
```typescript
import { html } from 'lit';
```

---

### 3.5 Section Rendering Updates

**File:** `src/section.ts`

#### 3.5.1 Pass Visual Style to Label Renderer

**Location:** In `renderSection()` function (around line 135)

**Current code:**
```typescript
return html`
  ${renderLabel(box, props.config, formattedState, name, spacerSize, props.vertical)}
`;
```

**No changes needed** - the function already passes the full config object.

---

### 3.6 Main Chart Component Updates

**File:** `src/chart.ts`

#### 3.6.1 Add CSS Variables for Dynamic Styling

**Location:** In `render()` method (around line 420)

**Current code:**
```typescript
const containerClasses = classMap({
  container: true,
  wide: !!this.config.wide,
  'with-header': !!this.config.title,
  vertical: this.vertical,
});
```

**Update to:**
```typescript
const containerClasses = classMap({
  container: true,
  wide: !!this.config.wide,
  'with-header': !!this.config.title,
  vertical: this.vertical,
  'visual-style-sigenergy': this.config.visual_style === 'sigenergy',
});

// Set CSS custom properties
const barWidth = this.config.bar_width || (this.config.visual_style === 'sigenergy' ? 70 : 15);
const containerStyle = {
  height: this.vertical ? 'auto' : this.config.height + 'px',
  '--sankey-bar-width': `${barWidth}px`,
  '--sankey-label-text-color': this.config.label_text_color || '#ffffff',
};
```

**Update the container div:**
```typescript
return html`
  <ha-card label="Sankey Chart" .header=${this.config.title}>
    <div class=${containerClasses} style=${styleMap(containerStyle)}>
      ${this.sections.map((s, i) =>
        renderSection({
          // ... existing props
        }),
      )}
    </div>
  </ha-card>
`;
```

---

### 3.7 Configuration Normalization

**File:** `src/utils.ts`

#### 3.7.1 Update normalizeConfig Function

**Location:** Around line 280

**Add to the function:**

```typescript
export function normalizeConfig(conf: SankeyChartConfig, isMetric?: boolean): Config {
  let config = { sections: [], ...cloneObj(conf) };

  // ... existing autoconfig code ...

  // NEW: Apply Sigenergy defaults if visual_style is set
  if (config.visual_style === 'sigenergy') {
    config = {
      bar_width: 70,
      show_percentages: true,
      show_entity_labels: true,
      show_names: false, // Hide custom names in favor of entity labels
      label_text_color: '#ffffff',
      ...config, // User config overrides defaults
    };
  }

  // ... existing sections processing ...

  return {
    ...DEFAULT_CONFIG,
    gas_co2_intensity: isMetric ? default_co2_per_ft3 * FT3_PER_M3 : default_co2_per_ft3,
    ...config,
    min_state: config.min_state ? Math.abs(config.min_state) : 0,
    sections,
  };
}
```

---

### 3.8 Editor Updates

**File:** `src/editor/index.ts`

#### 3.8.1 Add New Configuration Fields to Schema

**Location:** In `_computeSchema()` method (around line 150)

**Add after the `title` field:**

```typescript
{
  name: 'visual_style',
  selector: {
    select: {
      mode: 'dropdown',
      options: [
        { value: 'default', label: localize('editor.visual_style.default') },
        { value: 'sigenergy', label: localize('editor.visual_style.sigenergy') },
      ],
    },
  },
},
{
  type: 'grid',
  name: '',
  schema: [
    { 
      name: 'bar_width', 
      selector: { 
        number: { 
          mode: 'box', 
          unit_of_measurement: 'px',
          min: 15,
          max: 150,
        } 
      } 
    },
    { name: 'show_percentages', selector: { boolean: {} } },
    { name: 'show_entity_labels', selector: { boolean: {} } },
    { name: 'label_text_color', selector: { text: {} } },
  ],
},
```

---

### 3.9 Localization Updates

**File:** `src/localize/languages/en.json`

#### 3.9.1 Add New Translation Keys

**Add to the `fields` object:**

```json
{
  "editor": {
    "fields": {
      "visual_style": "Visual Style",
      "bar_width": "Node Bar Width",
      "show_percentages": "Show Percentages",
      "show_entity_labels": "Show Entity Type Labels",
      "label_text_color": "Label Text Color"
    },
    "visual_style": {
      "default": "Default",
      "sigenergy": "Sigenergy"
    }
  }
}
```

**Apply similar changes to other language files** (`cz.json`, `sk.json`, `nl.json`, `pt-BR.json`, `ua.json`)

---

## 4. Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)
1. ✅ Update type definitions (`src/types.ts`)
2. ✅ Update default config (`src/types.ts`)
3. ✅ Add CSS custom properties support (`src/chart.ts`)
4. ✅ Update configuration normalization (`src/utils.ts`)

### Phase 2: Visual Styling (Day 2-3)
1. ✅ Add new CSS classes for Sigenergy style (`src/styles.ts`)
2. ✅ Make bar width dynamic
3. ✅ Style label overlays
4. ✅ Adjust connector positioning

### Phase 3: Label Rendering (Day 3-4)
1. ✅ Update `renderLabel()` function (`src/label.ts`)
2. ✅ Add `renderSigenergyLabel()` function
3. ✅ Add `getEntityTypeLabel()` helper
4. ✅ Calculate percentages in `_calcBoxes()` (`src/chart.ts`)

### Phase 4: Editor Integration (Day 4-5)
1. ✅ Add new fields to editor schema (`src/editor/index.ts`)
2. ✅ Update localization files
3. ✅ Test editor functionality

### Phase 5: Testing & Refinement (Day 5-6)
1. ✅ Test with various configurations
2. ✅ Test horizontal and vertical layouts
3. ✅ Test with different entity types
4. ✅ Adjust typography for readability
5. ✅ Test responsive behavior

### Phase 6: Documentation (Day 6-7)
1. ✅ Update README with new options
2. ✅ Add configuration examples
3. ✅ Create before/after screenshots
4. ✅ Document breaking changes

---

## 5. Testing Criteria

### 5.1 Visual Testing

#### Default Mode (visual_style: 'default')
- [ ] Node bars remain 15px wide
- [ ] Labels positioned beside bars (horizontal) or below (vertical)
- [ ] No percentages displayed unless explicitly enabled
- [ ] Existing configurations work without changes

#### Sigenergy Mode (visual_style: 'sigenergy')
- [ ] Node bars are 70px wide by default
- [ ] Labels overlaid on bars with white text
- [ ] Entity type labels displayed (SOLAR, BATTERY, LOAD, GRID)
- [ ] Values displayed with units (23.03 kWh)
- [ ] Percentages displayed (67.12%)
- [ ] Text is readable against all color backgrounds
- [ ] No label overflow or clipping

### 5.2 Layout Testing

- [ ] Horizontal layout works correctly
- [ ] Vertical layout works correctly
- [ ] Transitions between layouts are smooth
- [ ] Wide mode functions properly
- [ ] Connectors align correctly with wider bars

### 5.3 Configuration Testing

- [ ] `bar_width` setting changes bar width
- [ ] `show_percentages` toggles percentage display
- [ ] `show_entity_labels` toggles entity type labels
- [ ] `label_text_color` changes text color
- [ ] Settings persist after save
- [ ] Editor shows correct current values

### 5.4 Edge Cases

- [ ] Very long entity names don't break layout
- [ ] Very small percentage values display correctly
- [ ] Zero values handled gracefully
- [ ] Passthrough entities render correctly
- [ ] Remaining state entities display properly
- [ ] Multiple sections work correctly

### 5.5 Backward Compatibility

- [ ] Existing configs without `visual_style` default to 'default' mode
- [ ] All existing options continue to work
- [ ] No console errors with old configurations
- [ ] Migration path is smooth (no manual config changes required)

---

## 6. Configuration Examples

### 6.1 Basic Sigenergy Style Configuration

```yaml
type: custom:sankey-chart
visual_style: sigenergy
bar_width: 70
show_percentages: true
show_entity_labels: true
label_text_color: '#ffffff'
show_names: false
show_states: true
show_units: true
height: 400
sections:
  - entities:
      - entity_id: sensor.solar_production
        name: SOLAR
        color: '#7fb842'
        children:
          - sensor.battery_charging
          - sensor.grid_export
          - sensor.home_consumption
  - entities:
      - entity_id: sensor.battery_charging
        name: BATTERY
        color: '#4db8a8'
      - entity_id: sensor.grid_export
        name: GRID
        color: '#2e4057'
  - entities:
      - entity_id: sensor.home_consumption
        name: LOAD
        color: '#9b59b6'
```

### 6.2 Custom Bar Width

```yaml
type: custom:sankey-chart
visual_style: sigenergy
bar_width: 100  # Extra wide bars
show_percentages: true
# ... rest of config
```

### 6.3 Hybrid Configuration (Percentages without full Sigenergy style)

```yaml
type: custom:sankey-chart
visual_style: default
show_percentages: true  # Add percentages to default style
bar_width: 30  # Slightly wider bars
# ... rest of config
```

---

## 7. Code Quality Requirements

### 7.1 TypeScript Standards
- All new code must be properly typed
- No use of `any` type without justification
- Follow existing code style and conventions
- Add JSDoc comments for new functions

### 7.2 Testing
- Existing Jest tests must continue to pass
- Add new tests for percentage calculation logic
- Add snapshot tests for Sigenergy-style rendering
- Manual testing checklist must be completed

### 7.3 Performance
- No significant performance degradation
- Percentage calculations should be efficient
- CSS changes should not impact render performance
- Consider memoization for expensive calculations

### 7.4 Browser Compatibility
- Must work in all browsers supported by Home Assistant
- Test in Chrome, Firefox, Safari, Edge
- Ensure CSS custom properties are supported (fallbacks if needed)

---

## 8. Known Limitations & Future Enhancements

### Current Limitations
1. Entity type labels are auto-generated (not fully customizable)
2. Percentage calculation is basic (section total, not global)
3. Label background opacity not yet implemented
4. Font size adjustment for very narrow bars not implemented

### Potential Future Enhancements
1. Allow custom entity type labels per entity
2. Add option for global percentages instead of section-relative
3. Implement automatic text color contrast adjustment
4. Add label shadow/outline for better readability on light backgrounds
5. Support gradient backgrounds on bars
6. Add animation transitions when values change
7. Support custom label templates

---

## 9. Acceptance Criteria

The implementation will be considered complete when:

1. ✅ All code changes are committed to the forked repository
2. ✅ All visual tests pass (Section 5.1)
3. ✅ All layout tests pass (Section 5.2)
4. ✅ All configuration tests pass (Section 5.3)
5. ✅ All edge case tests pass (Section 5.4)
6. ✅ Backward compatibility is maintained (Section 5.5)
7. ✅ README is updated with new configuration options
8. ✅ Example configurations are documented
9. ✅ Code quality standards are met (Section 7)
10. ✅ Pull request is created with detailed description and screenshots

---

## 10. Developer Notes

### 10.1 Key Files to Modify
- `src/types.ts` - Type definitions and defaults
- `src/styles.ts` - CSS styling
- `src/label.ts` - Label rendering logic
- `src/chart.ts` - Main chart component
- `src/section.ts` - Section rendering
- `src/utils.ts` - Configuration normalization
- `src/editor/index.ts` - Visual editor
- `src/localize/languages/*.json` - Translations

### 10.2 Files That DON'T Need Changes
- `src/energy.ts` - Energy calculations unchanged
- `src/reconcile.ts` - Reconciliation logic unchanged
- `src/zoom.ts` - Zoom functionality unchanged
- `src/handle-actions.ts` - Action handling unchanged
- Test files - Update only if adding new test coverage

### 10.3 Development Workflow
1. Create feature branch: `git checkout -b feature/sigenergy-style`
2. Make changes according to this spec
3. Test locally: `npm start` (opens dev server on port 3000)
4. Build: `npm run build`
5. Run tests: `npm test`
6. Commit with descriptive messages
7. Create pull request with screenshots

### 10.4 Testing in Home Assistant
1. Copy `dist/ha-sankey-chart.js` to `/config/www/` in your HA installation
2. Add to Lovelace resources or update existing reference
3. Hard refresh browser (Ctrl+Shift+R)
4. Test with your actual energy entities
5. Iterate on styling as needed

---

## 11. Appendix: Visual Reference

### 11.1 Color Analysis from Sigenergy Image

- **Solar:** `#7fb842` (bright green)
- **Battery (charge):** `#4db8a8` (teal/cyan)
- **Battery (discharge):** `#4db8a8` (teal/cyan)
- **Load:** `#9b59b6` (purple/magenta)
- **Grid (import):** `#2e4057` (dark blue-grey)
- **Grid (export):** `#2e4057` (dark blue-grey)

### 11.2 Typography Analysis

- **Entity labels:** Bold, uppercase, small size (~0.7em)
- **Values:** Bold, larger size (~1.1em)
- **Units:** Regular weight, medium size (~0.75em)
- **Percentages:** Regular weight, small size (~0.75em)
- **Text color:** White (#ffffff) on all colored backgrounds

### 11.3 Spacing & Layout

- **Bar width:** ~70-80px (estimated from image)
- **Label padding:** ~8px top/bottom, ~4px left/right
- **Line spacing:** Minimal, compact vertical stack
- **Label alignment:** Center-aligned horizontally and vertically

---

## Document Control

**Author:** AI Assistant (Claude)  
**Reviewer:** [Your Name]  
**Approval:** [Stakeholder Name]  
**Last Updated:** November 7, 2025

**Change Log:**
- v1.0 (2025-11-07): Initial specification created based on visual analysis and code review

---

**END OF SPECIFICATION**
