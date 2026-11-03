// WGSL shared by the effect components (Kinetograph's `shader` effect: `fn effect(px) -> vec4<f32>`, linear premultiplied,
// `layer(px)` reads the layer). Everything is a pure function of px, the frame and the uniforms: the noise is a hash of
// the pixel, never a clock or a random number.

/** An sRGB hex colour as linear floats (for uniforms). */
export const linear = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
};

/** Uniform entries `${name}r`, `${name}g`, `${name}b` for a colour. */
export const colorUniforms = (name: string, hex: string): Record<string, number> => {
  const [r, g, b] = linear(hex);
  return { [`${name}r`]: r, [`${name}g`]: g, [`${name}b`]: b };
};

export const NOISE = /* wgsl */ `
fn hash21(p: vec2<f32>) -> f32 {
  var q = fract(p * vec2<f32>(0.1031, 0.1030));
  q = q + dot(q, q.yx + vec2<f32>(33.33, 33.33));
  return fract((q.x + q.y) * q.x);
}
fn vnoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (vec2<f32>(3.0, 3.0) - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}
fn fbm(p: vec2<f32>) -> f32 {
  var s = 0.0;
  var a = 0.5;
  var q = p;
  for (var i = 0; i < 5; i = i + 1) {
    s = s + a * vnoise(q);
    q = q * 2.03 + vec2<f32>(17.1, 9.2);
    a = a * 0.5;
  }
  return s;
}
fn luma(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}
`;
