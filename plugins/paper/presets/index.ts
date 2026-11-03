// Made by tools/presets.mjs from the JSON files beside it; edit those, not this.

export const PRESETS: Record<string, Record<string, unknown>> = {
  "match-cut/broadsheet": {"layouts":["pull","italic","kicker","body","display"],"cutsPerSecond":10,"zoom":1.5,"blur":7,"smear":1,"streak":8,"crumple":0.4,"highlight":"#f6e04a"},
  "match-cut/clean": {"cutsPerSecond":8,"zoom":1.2,"blur":0,"streak":0,"crumple":0,"tint":"#f7f7f5","grain":0,"wander":0},
  "match-cut/crumpled": {"cutsPerSecond":12,"zoom":1.3,"blur":8,"smear":1.6,"streak":14,"crumple":1.6,"grain":0.08},
  "match-cut/web": {"layouts":["web","post","tweet","reddit","comments"],"cutsPerSecond":10,"zoom":1.15,"keySize":0.088,"anchorY":0.38,"blur":10,"smear":2.5,"streak":18,"crumple":0,"tint":"#fafaf8","highlight":"#e4ea4a","grain":0.05,"falloff":2.6,"screen":1,"pixel":6,"curve":0.05},
};
