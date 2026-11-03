// Shared bits for the backgrounds: colour parsing for shader uniforms, the loop phase, and the GLSL noise every shader uses.

/** "#rrggbb" or "#rgb" to [r, g, b] in 0..1 for a vec3 uniform. */
export const rgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Phase in radians that completes a whole turn over `loop` frames, scaled by speed. A whole number of turns per loop
 *  (speed 1, 2, 3 ...) makes the clip loop without a seam; other speeds drift without looping. */
export const phase = (frame: number, loop: number, speed: number) => (2 * Math.PI * frame * speed) / loop;

export const NOISE_GLSL = `
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0; float a=0.5;
  for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.02+17.1; a*=0.5; }
  return v;
}
`;
