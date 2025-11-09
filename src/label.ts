import { html } from 'lit';
import { Box, Config } from './types';
import { styleMap } from 'lit/directives/style-map';
import { CHAR_WIDTH_RATIO, MIN_LABEL_HEIGHT } from './const';

export function renderLabel(
  box: Box,
  config: Config,
  formattedState: string,
  name: string,
  spacerSize: number,
  vertical: boolean,
) {
  const { show_names, show_states, show_units } = config;
  const shouldShowLabel = box.config.type !== 'passthrough' && (show_names || show_states);
  if (!shouldShowLabel) return null;

  // Route to Sigenergy-style rendering if configured
  if (config.visual_style === 'sigenergy') {
    return renderSigenergyLabel(box, config, formattedState, name);
  }

  const maxLabelSize = box.size + spacerSize - 1;

  // reduce label size if it doesn't fit
  const labelStyle: Record<string, string> = { lineHeight: MIN_LABEL_HEIGHT + 'px' };
  const nameStyle: Record<string, string> = {};
  if (vertical) {
    // count chars in the name and reduce font size if it doesn't fit maxLabelSize
    labelStyle.width = maxLabelSize + 'px';
    const stateChars = (formattedState + (show_units ? box.unit_of_measurement : '')).length;
    const desiredWidth = stateChars * CHAR_WIDTH_RATIO;
    if (desiredWidth > maxLabelSize) {
      const fontSize = maxLabelSize / desiredWidth;
      labelStyle.fontSize = `${fontSize}em`;
      labelStyle.lineHeight = `${fontSize}em`;
    }
    if (show_names) {
      const nameChars = Math.max(...name.split(/[\s]+/).map(l => l.length));
      const desiredNameWidth = nameChars * CHAR_WIDTH_RATIO;
      if (desiredNameWidth > maxLabelSize) {
        const fontSize = maxLabelSize / desiredNameWidth;
        nameStyle.fontSize = `${fontSize}rem`;
        nameStyle.lineHeight = `${fontSize}rem`;
      }
    }
  } else {
    if (maxLabelSize < MIN_LABEL_HEIGHT) {
      const fontSize = maxLabelSize / MIN_LABEL_HEIGHT;
      // labelStyle.maxHeight = maxLabelSize + 'px';
      labelStyle.fontSize = `${fontSize}em`;
      labelStyle.lineHeight = `${fontSize}em`;
    }
    const numLines = name.split('\n').filter(v => v).length;
    if (numLines > 1) {
      nameStyle.whiteSpace = 'pre';
      if (labelStyle.fontSize) {
        nameStyle.fontSize = `${1 / numLines + 0.1}rem`;
        nameStyle.lineHeight = `${1 / numLines + 0.1}rem`;
      } else if (maxLabelSize < MIN_LABEL_HEIGHT * numLines) {
        nameStyle.fontSize = `${(maxLabelSize / MIN_LABEL_HEIGHT / numLines) * 1.1}em`;
        nameStyle.lineHeight = `${(maxLabelSize / MIN_LABEL_HEIGHT / numLines) * 1.1}em`;
      }
    }
  }
  return html`<div class="label" style=${styleMap(labelStyle)}>
    ${show_states
      ? html`<span>
          <span class="state">${formattedState}</span>${show_units
            ? html`<span class="unit">${box.unit_of_measurement}</span>`
            : null}
        </span>`
      : null}
    ${show_names
      ? html`${!vertical ? html`&nbsp;` : null}<span class="name" style=${styleMap(nameStyle)}>${!box.config.url ? html`${name}` : html`<a href="${box.config.url}" target="_blank">${name}</a>`}</span>`
      : null}
  </div>`;
}

/**
 * Renders a Sigenergy-style label with entity type, value, and percentage overlaid on the bar
 */
function renderSigenergyLabel(
  box: Box,
  config: Config,
  formattedState: string,
  name: string,
) {
  const { show_units, show_percentages, show_entity_labels, min_box_size } = config;

  // Determine entity type label
  const entityType = getEntityTypeLabel(box.entity_id, name);

  // Determine if the percentage should be shown.
  const isAtMinSize = box.size === min_box_size;
  const shouldShowPercentage = show_percentages && box.percentage !== undefined && !isAtMinSize;

  // Conditionally render the unit as a <div> (new line) or <span> (same line)
  const unitTemplate = show_units
    ? isAtMinSize
      ? html`<span class="unit">${box.unit_of_measurement}</span>`
      : html`<div class="unit">${box.unit_of_measurement}</div>`
    : null;

  return html`<div class="label">
    ${show_entity_labels ? html`<div class="entity-type">${entityType}</div>` : null}
    <div class="values">
      ${config.show_states
        ? html`
            <span class="state">${formattedState}</span>${unitTemplate}
          `
        : null}
      ${shouldShowPercentage
        ? html`<div class="percentage">${box.percentage!.toFixed(2)}%</div>`
        : null}
    </div>
  </div>`;
}

/**
 * Extracts entity type label from entity_id or name
 * Priority: short uppercase name → entity_id pattern → parsed name
 * Returns uppercase single-word labels (SOLAR, BATTERY, LOAD, GRID, etc.)
 */
function getEntityTypeLabel(entityId: string, name: string): string {
  // Priority 1: Use name if it's SHORT (single word, uppercase)
  if (name && name.length <= 10 && name === name.toUpperCase()) {
    return name;
  }

  // Priority 2: Extract from entity_id pattern like "sensor.solar_production"
  const entityMatch = entityId.match(/\.([a-z_]+)/);
  if (entityMatch) {
    const extracted = entityMatch[1].replace(/_/g, ' ').toUpperCase();
    // Take first word if multi-word
    return extracted.split(' ')[0];
  }

  // Priority 3: Parse from name
  if (name) {
    return name.split(' ')[0].toUpperCase();
  }

  return 'ENTITY';
}