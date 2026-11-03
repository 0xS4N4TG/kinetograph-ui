// The panel's styles. Studio's theme variables (--background, --foreground, --border, --primary, --muted-foreground,
// --input, --muted) keep it matching Studio; the knobs, the chunky motion keys and the segmented switches are after the
// caption tools' hardware-like panels.

export const CSS = `
.kg-kt { --kg-r: var(--radius, 0.5rem); font: 12px/1.4 system-ui, sans-serif; color: var(--foreground); display: flex; flex-direction: column; gap: 14px; }
.kg-kt * { box-sizing: border-box; }
.kg-kt button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
.kg-kt button:focus-visible, .kg-kt input:focus-visible, .kg-kt select:focus-visible, .kg-kt [role=slider]:focus-visible { outline: 2px solid var(--ring, var(--primary)); outline-offset: 1px; }
.kg-kt-sec { display: flex; flex-direction: column; gap: 7px; }
.kg-kt-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--muted-foreground); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.kg-kt-styles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.kg-kt .kg-kt-style { display: flex; flex-direction: column; gap: 4px; padding: 5px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); transition: border-color 0.12s, box-shadow 0.12s; }
.kg-kt .kg-kt-style:hover { border-color: color-mix(in srgb, var(--foreground) 30%, var(--border)); }
.kg-kt .kg-kt-style[aria-pressed="true"] { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kg-kt-tile { position: relative; height: 66px; border-radius: calc(var(--kg-r) - 3px); overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: 0 8px; background: linear-gradient(160deg, #3b3430, #1c1917 70%); color: #fff; line-height: 1; white-space: nowrap; }
.kg-kt-tile[data-wide] { justify-content: center; }
.kg-kt-tile .s { font-size: 8px; opacity: 0.95; }
.kg-kt-tile .b { font-size: 21px; margin: 1px 0; display: inline-block; align-self: var(--a, center); padding: 0 2px; }
.kg-kt-tile .s, .kg-kt-tile .b { align-self: var(--a, center); }
.kg-kt-tile .s.after { align-self: var(--after, flex-end); }
.kg-kt-tile[data-split]::before { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 45%; background: #e9e4dc; }
.kg-kt-name { font-weight: 600; padding: 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-kt-seg { display: inline-flex; padding: 2px; gap: 2px; border-radius: calc(var(--kg-r) - 1px); background: color-mix(in srgb, var(--foreground) 88%, var(--background)); }
.kg-kt .kg-kt-seg button { padding: 4px 10px; border-radius: calc(var(--kg-r) - 3px); color: color-mix(in srgb, var(--background) 70%, transparent); font-weight: 500; }
.kg-kt .kg-kt-seg button[aria-pressed="true"] { background: color-mix(in srgb, var(--background) 20%, var(--foreground)); color: var(--background); box-shadow: inset 0 -1px 0 rgb(0 0 0 / 0.3); }
.kg-kt-seg.full { display: flex; } .kg-kt-seg.full button { flex: 1; text-align: center; }
.kg-kt-keys { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; }
.kg-kt .kg-kt-key { padding: 8px 4px; text-align: center !important; border-radius: calc(var(--kg-r) - 1px); background: color-mix(in srgb, var(--foreground) 82%, var(--background)); color: var(--background) !important; font-weight: 600; font-size: 11.5px; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 -2px 0 rgb(0 0 0 / 0.35), 0 1px 2px rgb(0 0 0 / 0.25); transition: transform 0.06s; }
.kg-kt .kg-kt-key:active { transform: translateY(1px); }
.kg-kt .kg-kt-key[aria-pressed="true"] { background: color-mix(in srgb, var(--primary) 35%, #c9ccff); color: #1b1f5e !important; }
.kg-kt-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.kg-kt .kg-kt-card { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 5px 3px 4px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); color: var(--muted-foreground); }
.kg-kt .kg-kt-card:hover { color: var(--foreground); }
.kg-kt .kg-kt-card[aria-pressed="true"] { border-color: var(--primary); color: var(--foreground); background: color-mix(in srgb, var(--primary) 7%, var(--background)); }
.kg-kt .kg-kt-card svg { width: auto; height: 46px; max-width: 100%; border-radius: 3px; background: color-mix(in srgb, var(--muted) 70%, var(--background)); }
.kg-kt .kg-kt-card span { font-size: 10px; text-align: center; text-transform: capitalize; }
.kg-kt-row { display: grid; grid-template-columns: 78px minmax(0, 1fr) 46px; align-items: center; gap: 8px; }
.kg-kt-row label, .kg-kt-lab { color: var(--muted-foreground); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-kt-num { text-align: right; font-variant-numeric: tabular-nums; padding: 2px 5px; border-radius: 4px; background: color-mix(in srgb, var(--foreground) 88%, var(--background)); color: var(--background); font-size: 11px; font-weight: 600; }
.kg-kt input[type=range] { --fill: 50%; width: 100%; min-width: 0; height: 18px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.kg-kt input[type=range]::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: linear-gradient(to right, var(--primary) var(--fill), color-mix(in srgb, var(--foreground) 80%, var(--background)) var(--fill)); }
.kg-kt input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 18px; margin-top: -6px; border-radius: 3px; background: linear-gradient(#f4f4f4, #c9c9c9); border: 1px solid rgb(0 0 0 / 0.35); box-shadow: 0 1px 2px rgb(0 0 0 / 0.3); }
.kg-kt input[type=range]::-moz-range-track { height: 6px; border-radius: 3px; background: var(--input); }
.kg-kt input[type=range]::-moz-range-progress { height: 6px; border-radius: 3px; background: var(--primary); }
.kg-kt input[type=range]::-moz-range-thumb { width: 10px; height: 16px; border-radius: 3px; background: #e6e6e6; border: 1px solid rgb(0 0 0 / 0.35); }
.kg-kt-switches { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; }
.kg-kt .kg-kt-switch { display: inline-flex; align-items: center; gap: 7px; font-weight: 500; }
.kg-kt .kg-kt-switch i { position: relative; width: 34px; height: 20px; border-radius: 6px; background: color-mix(in srgb, var(--foreground) 85%, var(--background)); box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.5); flex: none; }
.kg-kt .kg-kt-switch i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 4px; background: color-mix(in srgb, var(--background) 35%, var(--foreground)); transition: left 0.12s, background-color 0.12s; }
.kg-kt .kg-kt-switch[aria-checked="true"] i::after { left: 17px; background: #8f95ff; box-shadow: 0 0 6px #8f95ff; }
.kg-kt-feel { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.kg-kt-knob { display: inline-flex; align-items: center; gap: 7px; cursor: ns-resize; user-select: none; -webkit-user-select: none; touch-action: none; font-weight: 500; font-variant-numeric: tabular-nums; }
.kg-kt-knob b { position: relative; width: 30px; height: 30px; border-radius: 50%; flex: none; background: radial-gradient(circle at 35% 30%, #8d94ff, #3a3fd6 55%, #1d2088); box-shadow: 0 0 0 2px color-mix(in srgb, var(--foreground) 85%, var(--background)), 0 2px 4px rgb(0 0 0 / 0.4); }
.kg-kt-knob b::after { content: ''; position: absolute; left: 50%; top: 4px; width: 2px; height: 9px; margin-left: -1px; border-radius: 1px; background: #fff; transform-origin: 1px 11px; transform: rotate(var(--turn, 0deg)); }
.kg-kt select { width: 100%; padding: 5px 6px; border: 1px solid var(--input); border-radius: calc(var(--kg-r) - 2px); background: var(--background); color: var(--foreground); font: inherit; }
.kg-kt-swatches { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.kg-kt .kg-kt-swatch { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid var(--border); border-radius: calc(var(--kg-r) - 2px); font-weight: 500; }
.kg-kt .kg-kt-swatch[aria-pressed="true"] { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kg-kt .kg-kt-swatch i { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25); }
.kg-kt .kg-kt-swatch input[type=color] { width: 18px; height: 18px; padding: 0; border: 0; background: none; cursor: pointer; }
.kg-kt-changing { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: var(--kg-r); background: color-mix(in srgb, var(--foreground) 90%, var(--background)); color: var(--background); }
.kg-kt-changing strong { font-weight: 700; }
.kg-kt-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6px; align-items: center; }
.kg-kt-hint { color: var(--muted-foreground); font-size: 11px; }
.kg-kt-pin { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed #8f95ff; pointer-events: none; }
.kg-kt-pin span { position: absolute; left: 12px; top: -15px; padding: 3px 10px; border-radius: 6px; background: #3a3fd6; color: #fff; font: 600 22px/1.2 system-ui, sans-serif; pointer-events: auto; cursor: ns-resize; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: 0 2px 6px rgb(0 0 0 / 0.35); }
`;
