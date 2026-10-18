import { html } from 'lit';
import { Box, Config } from './types';
import { styleMap } from 'lit/directives/style-map';
import { CHAR_WIDTH_RATIO, MIN_LABEL_HEIGHT, SIGENERGY_REF_BOX_WIDTH, SIGENERGY_REF_SECTION_HEIGHT } from './const';

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
    return renderSigenergyLabel(box, config, formattedState, name, vertical);
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
  vertical: boolean,
) {
  if (!vertical) {
    return renderSigenergyLabelHorizontal(box, config, formattedState, name);
  }
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

// Layout of a label in the Sigenergy app, in reference px (box width SIGENERGY_REF_BOX_WIDTH,
// section height SIGENERGY_REF_SECTION_HEIGHT). Positions are of the ink (visible glyphs),
// measured from the app screenshot with dev/harness/score.py.
const SIG = {
  numberInset: 17, // css left of the value; its ink starts at 20
  unitInset: 29, // the app indents the unit by a space
  pctInset: 19,
  bottomPad: 23, // ink kept clear of the box bottom
  badge: { left: 17, top: 17, width: 206, height: 65, radius: 12, capHeight: 26 },
  maxDigitHeight: 44, // value digits in a tall box
  minDigitHeight: 30, // below this the value goes inline with the unit
  unitHeight: 25,
  pctHeight: 31,
  pctMinBoxHeight: 320, // the percentage needs about this much height to clear the unit
  inlineTop: 103,
  inlineHeight: 28,
  inlineBoxHeight: 156, // height the inline layout was measured at; smaller boxes scale it down
};
// Poppins ink, as measured by the harness: ink height and ink top offset per font size
const INK = {
  number: { height: 0.732, top: 0.07 },
  unit: { height: 0.681, top: 0.06 },
  inline: { height: 0.735, top: 0.005 },
  pct: { height: 0.69, bottom: 0.803 },
  badge: { height: 0.673 },
};
const DIGIT_ADVANCE = 0.6; // average advance of a bold digit, for width fitting

function fitWidth(fontSize: number, text: string, width: number) {
  const needed = text.length * DIGIT_ADVANCE * fontSize;
  return needed > width ? (fontSize * width) / needed : fontSize;
}

function mixWithWhite(color: string | undefined, amount: number): string {
  const m = color?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) {
    return `rgba(255, 255, 255, ${1 - amount / 2})`;
  }
  const mix = (hex: string) => Math.round(255 - (255 - parseInt(hex, 16)) * amount);
  return `rgb(${mix(m[1])}, ${mix(m[2])}, ${mix(m[3])})`;
}

function formatPercentage(pct: number) {
  // the app trims trailing zeros: 48.8%, 43.03%
  return `${parseFloat(pct.toFixed(2))}%`;
}

function renderSigenergyLabelHorizontal(box: Box, config: Config, formattedState: string, name: string) {
  const { show_units, show_percentages, show_entity_labels } = config;
  // horizontal metrics follow the bar width, vertical metrics and text follow the chart height
  const ux = (config.bar_width || 70) / SIGENERGY_REF_BOX_WIDTH;
  const uy = config.height / SIGENERGY_REF_SECTION_HEIGHT;
  const px = (v: number) => `${v * ux}px`;
  const py = (v: number) => `${v * uy}px`;
  const h = box.size / uy;
  const unit = show_units ? box.unit_of_measurement : '';
  // room for the value, in reference px at text scale
  const valueWidth = ((SIGENERGY_REF_BOX_WIDTH - 2 * SIG.numberInset) * ux) / uy;

  const withPct = show_percentages && box.percentage !== undefined && h >= SIG.pctMinBoxHeight;
  // the app shrinks the value to keep the stack clear of the box bottom
  const digit = Math.min(SIG.maxDigitHeight, (h - 151) / 1.835);
  const tier = withPct ? 'full' : digit >= SIG.minDigitHeight ? 'stacked' : 'inline';
  // inline boxes smaller than the measured one scale everything down
  const s = tier === 'inline' ? Math.min(1, h / SIG.inlineBoxHeight) : 1;
  const showBadge = show_entity_labels && s >= 0.45;

  const b = SIG.badge;
  const badgeStyle = {
    left: px(b.left * s),
    top: py(b.top * s),
    width: px(b.width * s),
    height: py(b.height * s),
    // a taller line box drops the caps a touch below centre, as in the app
    lineHeight: py((b.height + 7) * s),
    borderRadius: py(b.radius * s),
    fontSize: py((b.capHeight / INK.badge.height) * s),
    letterSpacing: '0.034em',
    background: `linear-gradient(${mixWithWhite(box.badgeColor, 0.2)}, ${mixWithWhite(box.badgeColor, 0.4)})`,
    boxShadow: `0 ${py(3 * s)} ${py(10 * s)} rgba(0, 0, 0, 0.25)`,
  };
  const badge = showBadge
    ? html`<div class="entity-type" style=${styleMap(badgeStyle)}>${getEntityTypeLabel(box.entity_id, name)}</div>`
    : null;

  if (tier === 'inline') {
    const text = `${formattedState}${unit ? ' ' + unit : ''}`;
    let font = fitWidth((SIG.inlineHeight / INK.inline.height) * s, text, valueWidth);
    let inkTop = SIG.inlineTop * s;
    if (!showBadge) {
      font = fitWidth(Math.min(SIG.inlineHeight / INK.inline.height, h * 0.5), text, valueWidth);
      inkTop = (h - font * INK.inline.height) / 2;
    }
    return html`<div class="label sig" data-tier=${tier}>
      ${badge}
      <div
        class="value inline"
        style=${styleMap({ left: px(SIG.numberInset + 1), top: py(inkTop - INK.inline.top * font), fontSize: py(font) })}
      >
        <span class="state">${formattedState}</span>${unit ? html`<span class="unit">&nbsp;${unit}</span>` : null}
      </div>
    </div>`;
  }

  const numberFont = fitWidth(digit / INK.number.height, formattedState, valueWidth);
  const numberInkTop = 87 + 0.385 * digit;
  const numberInkBottom = numberInkTop + numberFont * INK.number.height;
  const unitFont = SIG.unitHeight / INK.unit.height;
  const unitInkTop = numberInkBottom + 17 + 0.45 * digit;
  const pctFont = SIG.pctHeight / INK.pct.height;
  const pctCssTop = h - SIG.bottomPad - INK.pct.bottom * pctFont;

  return html`<div class="label sig" data-tier=${tier}>
    ${badge}
    <div
      class="value"
      style=${styleMap({
        left: px(SIG.numberInset),
        top: py(numberInkTop - INK.number.top * numberFont),
        fontSize: py(numberFont),
      })}
    >
      <span class="state">${formattedState}</span>
    </div>
    ${unit
      ? html`<div
          class="unit"
          style=${styleMap({
            left: px(SIG.unitInset),
            top: py(unitInkTop - INK.unit.top * unitFont),
            fontSize: py(unitFont),
          })}
        >
          ${unit}
        </div>`
      : null}
    ${withPct
      ? html`<div
          class="percentage"
          style=${styleMap({ left: px(SIG.pctInset), top: py(pctCssTop), fontSize: py(pctFont) })}
        >
          ${formatPercentage(box.percentage!)}
        </div>`
      : null}
  </div>`;
}

/**
 * Extracts entity type label from entity_id or name
 * Priority: short uppercase name → entity_id pattern → parsed name
 * Returns uppercase single-word labels (SOLAR, BATTERY, LOAD, GRID, etc.)
 */
export function getEntityTypeLabel(entityId: string, name: string): string {
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