// Test scenarios for the Sigenergy visual style. Values are daily kWh.
// Left: SOLAR (pv), BATTERY (discharge), GRID (import).
// Right: BATTERY (charge), LOAD (consumed), GRID (export).
export const ENTITIES = {
  pv: 'sensor.sigen_0_total_daily_pv_energy',
  dis: 'sensor.sigen_0_daily_discharge_energy',
  imp: 'sensor.sigen_0_grid_sensor_daily_import_energy',
  chg: 'sensor.sigen_0_daily_charge_energy',
  exp: 'sensor.sigen_0_grid_sensor_daily_export_energy',
  load: 'sensor.sigen_0_daily_consumed_energy',
};

export const SCENARIOS = {
  // Values from the Sigenergy app screenshot (the visual target)
  ref: { pv: 9.21, dis: 1.75, imp: 10.44, chg: 2.09, exp: 0.07, load: 19.24 },
  // Values from Mitch's tablet screenshot (baseline fidelity check)
  tablet: { pv: 9.22, dis: 1.76, imp: 10.44, chg: 2.09, exp: 0.07, load: 19.26 },
  sunny: { pv: 38.5, dis: 8.2, imp: 0.6, chg: 14.3, exp: 12.1, load: 20.9 },
  winter: { pv: 3.1, dis: 12.4, imp: 26.8, chg: 10.9, exp: 0, load: 31.4 },
  midnight: { pv: 0, dis: 0.42, imp: 0.05, chg: 0, exp: 0, load: 0.47 },
  gridcharge: { pv: 0.8, dis: 0.3, imp: 16.2, chg: 12.6, exp: 0, load: 4.7 },
  big: { pv: 112.45, dis: 23.4, imp: 4.1, chg: 30.2, exp: 68.4, load: 41.35 },
  even: { pv: 7, dis: 7, imp: 7, chg: 7, exp: 7, load: 7 },
  tiny: { pv: 0.12, dis: 0.08, imp: 24.6, chg: 0.11, exp: 0.02, load: 24.67 },
  allsmall: { pv: 1.2, dis: 0.9, imp: 0.4, chg: 0.6, exp: 0.3, load: 1.6 },
  // real days don't balance: inverter and battery losses make out ~4% lower than in
  lossy: { pv: 18.4, dis: 6.1, imp: 9.7, chg: 7.9, exp: 4.2, load: 20.6 },
  // evening battery export (solar too small to cover it)
  batexport: { pv: 2, dis: 10, imp: 5, chg: 0.5, exp: 6, load: 10.5 },
};

// Mitch's live card config (views/power.yaml, ~2026-09-26)
export function mitchConfig() {
  const e = ENTITIES;
  return {
    type: 'custom:sigen-sankey',
    visual_style: 'sigenergy',
    bar_width: 80,
    min_box_size: 70,
    show_percentages: true,
    show_entity_labels: true,
    label_text_color: '#273356',
    show_names: false,
    show_states: true,
    show_units: true,
    unit_prefix: 'k',
    round: 2,
    height: 350,
    wide: true,
    min_box_distance: 5,
    layout: 'horizontal',
    sections: [
      {
        entities: [
          { entity_id: e.pv, name: 'SOLAR', color: '#9acb66', children: [e.chg, e.exp, e.load] },
          { entity_id: e.dis, name: 'BATTERY', color: '#54e5e0', children: [e.load] },
          { entity_id: e.imp, name: 'GRID', color: '#808af3', children: [e.load] },
        ],
      },
      {
        entities: [
          { entity_id: e.chg, name: 'BATTERY', color: '#469193' },
          { entity_id: e.exp, name: 'GRID', color: '#4d51bc' },
          { entity_id: e.load, name: 'LOAD', color: '#9853ee' },
        ],
      },
    ],
  };
}

// Proposed config: app order on the right, every physically possible flow
export function proposedConfig() {
  const e = ENTITIES;
  const c = mitchConfig();
  delete c.min_box_size;
  c.label_text_color = '#252d46';
  c.sections = [
    {
      entities: [
        { entity_id: e.pv, name: 'SOLAR', color: '#a4c971', children: [e.chg, e.exp, e.load] },
        { entity_id: e.dis, name: 'BATTERY', color: '#7fe2df', children: [e.load, e.exp] },
        { entity_id: e.imp, name: 'GRID', color: '#868ef4', children: [e.load, e.chg] },
      ],
    },
    {
      entities: [
        { entity_id: e.chg, name: 'BATTERY', color: '#5a8f92' },
        { entity_id: e.load, name: 'LOAD', color: '#8e56e5' },
        { entity_id: e.exp, name: 'GRID', color: '#4e51b6' },
      ],
    },
  ];
  return c;
}

export function mockHass(values) {
  const states = {};
  for (const [key, id] of Object.entries(ENTITIES)) {
    states[id] = {
      entity_id: id,
      state: String(values[key] ?? 0),
      attributes: { unit_of_measurement: 'kWh', friendly_name: key },
      last_updated: new Date().toISOString(),
    };
  }
  return {
    states,
    locale: { language: 'en', number_format: 'language', time_format: 'language' },
    language: 'en',
    config: { unit_system: { length: 'km' } },
    themes: { darkMode: true },
    callWS: () => Promise.reject(new Error('no ws in harness')),
    connection: {},
  };
}
