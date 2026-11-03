// The panel's styles, shared by its views. Studio's theme variables (--background, --foreground, --border, --primary,
// --muted-foreground, --input) keep it matching Studio.

export const CSS = `
.kg-paper { --kg-r: var(--radius, 0.5rem); font: 12px/1.4 system-ui, sans-serif; color: var(--foreground); display: flex; flex-direction: column; gap: 14px; }
.kg-paper * { box-sizing: border-box; }
.kg-paper button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
.kg-paper button:focus-visible, .kg-paper input:focus-visible { outline: 2px solid var(--ring, var(--primary)); outline-offset: 1px; }
.kg-paper-sec { display: flex; flex-direction: column; gap: 6px; }
.kg-paper-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--muted-foreground); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
.kg-paper-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.kg-paper-card { display: flex; flex-direction: column; gap: 6px; padding: 6px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); transition: border-color 0.12s, box-shadow 0.12s; }
.kg-paper-card:hover { border-color: color-mix(in srgb, var(--foreground) 30%, var(--border)); }
.kg-paper-card[aria-pressed="true"] { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.kg-paper-name { font-weight: 600; text-transform: capitalize; padding: 0 2px; }
.kg-paper-meta { color: var(--muted-foreground); font-size: 11px; padding: 0 2px; font-variant-numeric: tabular-nums; }
.kg-paper-swatch { position: relative; height: 54px; border-radius: calc(var(--kg-r) - 3px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--foreground) 12%, transparent); }
.kg-paper-swatch i { position: absolute; left: 10%; height: 3px; border-radius: 2px; background: #2b2b2b; opacity: 0.65; }
.kg-paper-swatch b { position: absolute; left: 22%; right: 22%; top: 50%; height: 12px; margin-top: -6px; border-radius: 1px; }
.kg-paper-swatch b::after { content: ''; position: absolute; left: 12%; right: 12%; top: 4px; height: 4px; border-radius: 1px; background: #1a1a1a; }
.kg-paper-swatch u { position: absolute; inset: 0; pointer-events: none; }
.kg-paper-layouts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.kg-paper-lay { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 5px 3px 4px; border: 1px solid var(--border); border-radius: var(--kg-r); background: var(--background); color: var(--muted-foreground); transition: border-color 0.12s, color 0.12s, background-color 0.12s; }
.kg-paper-lay:hover { color: var(--foreground); }
.kg-paper-lay[aria-pressed="true"] { border-color: var(--primary); color: var(--foreground); background: color-mix(in srgb, var(--primary) 7%, var(--background)); }
.kg-paper-lay svg { width: 100%; height: auto; aspect-ratio: 40 / 52; border-radius: 3px; background: color-mix(in srgb, var(--muted) 70%, var(--background)); }
.kg-paper-lay span { font-size: 10px; text-align: center; }
.kg-paper-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) 40px; align-items: center; gap: 8px; }
.kg-paper-row label { color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kg-paper-num { text-align: right; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.kg-paper input[type=range] { --fill: 50%; width: 100%; min-width: 0; height: 16px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.kg-paper input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--primary) var(--fill), var(--input) var(--fill)); }
.kg-paper input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }
.kg-paper input[type=range]::-moz-range-track { height: 4px; border-radius: 2px; background: var(--input); }
.kg-paper input[type=range]::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--primary); }
.kg-paper input[type=range]::-moz-range-thumb { width: 8px; height: 8px; border-radius: 50%; background: var(--background); border: 2px solid var(--primary); }
.kg-paper-colors { display: flex; gap: 8px; }
.kg-paper-color { flex: 1; display: flex; align-items: center; gap: 8px; padding: 4px 6px; border: 1px solid var(--input); border-radius: calc(var(--kg-r) - 2px); background: var(--background); color: var(--muted-foreground); }
.kg-paper-color input { width: 20px; height: 20px; padding: 0; border: 0; border-radius: 4px; background: none; cursor: pointer; }
.kg-paper-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; text-transform: none; letter-spacing: 0; font-weight: 500; }
.kg-paper-track { position: relative; width: 26px; height: 15px; border-radius: 8px; background: var(--input); transition: background-color 0.12s; flex: none; }
.kg-paper-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: var(--background); box-shadow: 0 1px 2px rgb(0 0 0 / 0.25); transition: transform 0.12s; }
.kg-paper-switch[aria-checked="true"] .kg-paper-track { background: var(--primary); }
.kg-paper-switch[aria-checked="true"] .kg-paper-track::after { transform: translateX(11px); }
.kg-paper-hint { color: var(--muted-foreground); font-size: 11px; }
`;
