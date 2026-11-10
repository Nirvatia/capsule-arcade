import { COLOR_BAND, DRAIN_BAND } from './decayTimeline';
import { DECAY_OUTSIDE_RATE } from './decayField';

/**
 * The death transition, one full-screen pass over the rendered level: a black hole.
 *
 * 1. Drain: the colour leaves the world in a wave along the corridors (the geodesic death
 *    field, ragged with a little noise), a bright edge on the front.
 * 2. Collapse: the world is squeezed into a disc around the death point, twisted harder
 *    towards the middle and pulled in until it is a point. The disc's rim burns in the
 *    world's own colour, arms of light wind round it, and the picture splits into a faint
 *    chromatic fringe.
 * 3. Flash: the singularity flares and a shock wave goes out; the void is a dark gradient
 *    with a few stars.
 * 4. Rebirth: the same fold run backwards round the respawn point shows the next picture
 *    (the level again), grey at first; its colour returns in a wave along the corridors
 *    from the respawn point (the geodesic respawn field).
 */
export const DECAY_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uDist;
uniform vec2 uSizePx;
uniform vec2 uScenePx;
uniform vec4 uWorld;      // board origin (css px), world scale, tile size in world units
uniform vec2 uDistSize;
uniform float uMargin;
uniform vec2 uDMax;       // death field max, respawn field max
uniform float uFront;     // drain front (death field), < -50: off
uniform float uRebuild;   // colour front (respawn field), < -50: off
uniform float uTime;
uniform float uShock;     // 0..1, < 0: off
uniform vec2 uEpic;       // death tile centre, tile coords
uniform vec2 uSpawn;      // respawn tile centre, tile coords
uniform vec2 uCollapse;   // collapse of the dying world, bloom of the reborn one (1 .. 0)
uniform vec2 uReach;      // radius that holds the whole picture round each point, css px
uniform float uPhase;     // 0 dying world, 1 void, 2 reborn world
uniform float uFlash;
uniform vec3 uDeep;       // void
uniform vec3 uMid;
uniform vec3 uWisp;       // arms of light
uniform vec3 uIce;        // stars
uniform vec3 uRim;        // drain front, the hole's rim
uniform vec3 uWarm;       // colour front
out vec4 outColor;

const float DB = ${DRAIN_BAND.toFixed(2)};
const float CB = ${COLOR_BAND.toFixed(2)};
const float OUTSIDE = ${DECAY_OUTSIDE_RATE.toFixed(2)};
// the disc the world is squeezed into, in short-side units
const float DISC = 0.58;

float U;  // the view's short side, css px

float sq(float x) { return x * x; }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
  return s;
}
vec2 texel(ivec2 c) {
  vec4 v = texelFetch(uDist, c, 0);
  return vec2(floor(v.r * 255.0 + 0.5) + v.g, floor(v.b * 255.0 + 0.5) + v.a) / 255.0 * uDMax;
}
// x: death field, y: respawn field
vec2 geo(vec2 t) {
  vec2 g = t + uMargin - 0.5, mx = uDistSize - 1.0, gc = clamp(g, vec2(0.0), mx);
  float extra = length(g - gc) * OUTSIDE;
  vec2 i = min(floor(gc), mx - 1.0), f = gc - i;
  ivec2 a = ivec2(i);
  vec2 d00 = texel(a), d10 = texel(a + ivec2(1, 0)), d01 = texel(a + ivec2(0, 1)), d11 = texel(a + ivec2(1, 1));
  return mix(mix(d00, d10, f.x), mix(d01, d11, f.x), f.y) + extra;
}
vec2 field(vec2 t) {
  return geo(t) + 1.8 * (fbm(t * 0.38 + vec2(3.1, 7.7)) - 0.5) + 0.5 * (noise(t * 1.7) - 0.5);
}
vec3 desat(vec3 c, float a) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(l) * 0.82, a);
}
vec3 voidBg(vec2 css, vec2 c) {
  float r = length(css - c) / U;
  vec3 col = mix(uDeep, uMid, 0.2 + 0.3 * (1.0 - clamp(r, 0.0, 1.0)));
  vec2 g = css / U * 120.0;
  vec2 id = floor(g);
  float h = h21(id);
  float star = step(0.982, h) * smoothstep(0.3, 0.0, length(fract(g) - 0.5));
  return col + uIce * star * (0.4 + 0.5 * sin(uTime * 3.0 + h * 40.0));
}
// The world squeezed into a disc round c: k = 0 intact, k -> 1 swallowed. Returns the
// picture (rgb) and its coverage (a); Rd is the disc's radius in short-side units.
vec4 worldAt(vec2 css, vec2 c, float k, float reach, out float Rd) {
  float kk = clamp(k, 0.0, 0.998);
  float sigma = pow(1.0 - kk, 1.6);
  Rd = mix(reach / U, DISC, smoothstep(0.0, 0.3, kk)) * sigma;
  vec2 d = (css - c) / U;
  float r = length(d);
  float rho = r / max(Rd, 1e-4);
  float ang = 6.0 * kk * pow(max(1.0 - rho, 0.0), 1.2);
  float cs = cos(ang), sn = sin(ang);
  vec2 d2 = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y) / sigma;
  float ab = 0.012 * kk;
  vec3 col;
  col.r = texture(uScene, (c + d2 * (1.0 + ab) * U) / uScenePx).r;
  col.g = texture(uScene, (c + d2 * U) / uScenePx).g;
  col.b = texture(uScene, (c + d2 * (1.0 - ab) * U) / uScenePx).b;
  vec2 src = c + d2 * U;
  float inside = step(0.0, src.x) * step(src.x, uScenePx.x) * step(0.0, src.y) * step(src.y, uScenePx.y);
  float m = (1.0 - smoothstep(0.96, 1.0, rho)) * inside;
  col *= 1.0 - 0.35 * kk * smoothstep(0.5, 1.0, rho);
  return vec4(col, m);
}
// The burning rim of the disc and the arms of light winding round it.
vec3 accretion(vec2 css, vec2 c, float kk, float Rd, float dir) {
  vec2 d = (css - c) / U;
  float r = length(d);
  float edge = r - Rd;
  float on = smoothstep(0.0, 0.12, kk);
  float ring = exp(-sq(edge / (0.010 + 0.02 * kk))) * on;
  float core = exp(-sq(edge / 0.004)) * on;
  float halo = step(0.0, edge) * exp(-max(edge, 0.0) / 0.06) * smoothstep(0.0, 0.2, kk);
  float arms = pow(0.5 + 0.5 * sin(3.0 * atan(d.y, d.x) - 22.0 * r + dir * uTime * 5.0), 5.0)
    * exp(-r / (Rd * 0.9 + 0.05)) * smoothstep(0.05, 0.3, kk) * step(0.0, edge);
  return uRim * (ring * 1.2 + halo * 0.45) + uWisp * arms * 0.7 + vec3(1.0) * core * 0.9;
}
void main() {
  vec2 css = vec2(gl_FragCoord.x, uSizePx.y - gl_FragCoord.y) / uSizePx * uScenePx;
  U = min(uScenePx.x, uScenePx.y);
  float tilePx = uWorld.z * uWorld.w;
  vec2 t = (css - uWorld.xy) / tilePx;
  vec2 cE = uWorld.xy + uEpic * tilePx;
  vec2 cS = uWorld.xy + uSpawn * tilePx;
  vec2 f = field(t);
  float Rd;
  vec3 col;
  if (uPhase < 0.5) {
    vec4 w = worldAt(css, cE, uCollapse.x, uReach.x, Rd);
    float drained = uFront > -50.0 ? smoothstep(uFront, uFront - DB, f.x) : 0.0;
    vec3 wc = desat(w.rgb, drained) * (1.0 - 0.25 * drained);
    wc += uRim * exp(-sq((f.x - uFront) / 0.9)) * (uFront > -50.0 ? 1.0 : 0.0) * 0.6 * (1.0 - uCollapse.x);
    col = mix(voidBg(css, cE), wc, w.a);
    col += accretion(css, cE, uCollapse.x, Rd, 1.0);
  } else if (uPhase < 1.5) {
    col = voidBg(css, cE);
  } else {
    vec4 w = worldAt(css, cS, uCollapse.y, uReach.y, Rd);
    float colored = uRebuild > -50.0 ? smoothstep(uRebuild, uRebuild - CB, f.y) : 0.0;
    vec3 wc = desat(w.rgb, 1.0 - colored) * (1.0 - 0.25 * (1.0 - colored));
    float fg = uRebuild > -50.0 ? exp(-sq((f.y - uRebuild) / 0.9)) : 0.0;
    wc += mix(uWarm, vec3(1.0), 0.5) * fg * 0.7;
    col = mix(voidBg(css, cS), wc, w.a);
    col += accretion(css, cS, uCollapse.y, Rd, -1.0);
  }
  float rE = length(css - cE) / U;
  col += vec3(1.0) * uFlash * exp(-rE / (0.015 + 0.13 * uFlash)) * 1.3;
  if (uShock >= 0.0 && uShock < 1.0) {
    float e = abs(rE - uShock * 1.5);
    col += mix(uRim, vec3(1.0), 0.5) * exp(-sq(e / 0.014)) * (1.0 - uShock) * 0.9;
  }
  outColor = vec4(col, 1.0);
}`;
