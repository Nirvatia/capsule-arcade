/**
 * The arcade shift, one full-screen pass over two rendered pictures (`uFrom`, `uTo`).
 *
 * Enter: the world (`uFrom`) flashes from the egg, then breaks into a mosaic of growing
 * blocks with fewer and fewer colours and dims to black; a bright line opens in the middle of
 * the dark, spreads sideways and then upward, and the arcade (`uTo`) switches on in it with
 * the tube's overdrive fading to normal.
 * Leave: the arcade squashes into a line, the line shrinks to a dot, the dot glows on and
 * fades, and from it the next world (`uTo`) unfolds in a ring of light.
 */
export const ARCADE_SHIFT_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uSizePx;
uniform vec2 uScenePx;   // css px
uniform vec2 uOrigin;    // css px: the egg (enter), the dot (leave)
uniform float uMode;     // 0 enter, 1 leave
uniform float uPhase;    // enter: 0 world, 1 arcade switching on
uniform float uFlash;
uniform float uBlock;    // css px at an 800 px short side
uniform float uLevels;
uniform float uDim;
uniform vec2 uOpen;      // aperture: share of mid width, mid height
uniform float uBoost;
uniform float uGlow;
uniform float uGrow;
uniform float uTime;
uniform vec3 uAccent;
out vec4 outColor;

const vec3 PHOSPHOR = vec3(0.86, 1.0, 0.92);

float sq(float x) { return x * x; }

vec3 posterize(vec3 c, float levels) {
  float n = max(levels - 1.0, 1.0);
  return floor(c * n + 0.5) / n;
}

// The picture squeezed into the aperture round the screen centre, with the tube's glow.
vec3 crt(sampler2D tex, vec2 css) {
  vec2 mid = uScenePx * 0.5;
  vec2 d = abs(css - mid) / mid;
  vec2 ap = vec2(max(uOpen.x, 0.0005), max(uOpen.y, 2.0 / uScenePx.y));
  vec2 out2 = max(d - ap, 0.0) * mid;
  float dist = length(out2);
  float inside = 1.0 - smoothstep(0.0, 1.5, dist);
  vec2 src = (css - mid) / ap + mid;
  vec3 pic = texture(tex, clamp(src, vec2(0.0), uScenePx) / uScenePx).rgb;
  // squashed, the picture turns to white-green light
  float squashed = 1.0 - ap.y * min(1.0, ap.x * 1.2);
  pic = mix(pic, PHOSPHOR, clamp(squashed * squashed, 0.0, 1.0));
  vec3 col = pic * uBoost * inside;
  float edge = exp(-dist / (3.0 + 10.0 * squashed));
  col += PHOSPHOR * edge * (0.35 + 0.65 * squashed) * (1.0 - inside * 0.6);
  return col;
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, uSizePx.y - gl_FragCoord.y) / uSizePx * uScenePx;
  vec2 uv = css / uScenePx;
  float U = min(uScenePx.x, uScenePx.y);
  vec3 col = vec3(0.0);
  if (uMode < 0.5) {
    if (uPhase < 0.5) {
      float block = max(1.0, uBlock * U / 800.0);
      vec2 q = (floor(css / block) + 0.5) * block;
      vec3 w = texture(uFrom, clamp(q, vec2(0.0), uScenePx) / uScenePx).rgb;
      if (uLevels < 255.0) {
        w = posterize(w, uLevels);
      }
      col = w * uDim;
      float r = length(css - uOrigin) / U;
      col += mix(uAccent, vec3(1.0), 0.6) * uFlash * exp(-r / (0.04 + 0.2 * (1.0 - uFlash))) * 1.1;
      float ring = abs(r - (1.0 - uFlash) * 0.7);
      col += uAccent * uFlash * exp(-sq(ring / 0.015)) * 0.8;
    } else {
      col = crt(uTo, css);
    }
  } else {
    vec2 mid = uScenePx * 0.5;
    if (uGrow <= 0.0) {
      col = crt(uFrom, css);
      float r = length(css - mid) / U;
      col += PHOSPHOR * uGlow * exp(-r / 0.012) * step(uOpen.x, 0.02) * 1.2;
    } else {
      float reach = length(uScenePx) * 0.5 * 1.05;
      float R = uGrow * reach;
      float r = length(css - uOrigin);
      float inside = 1.0 - smoothstep(R - 6.0, R, r);
      vec3 w = texture(uTo, uv).rgb;
      col = w * inside;
      float rim = exp(-sq((r - R) / (5.0 + 16.0 * (1.0 - uGrow))));
      col += mix(uAccent, vec3(1.0), 0.5) * rim * (1.0 - 0.6 * uGrow) * 0.9;
      col += PHOSPHOR * uGlow * exp(-length(css - uOrigin) / (U * 0.012)) * 1.2;
    }
  }
  outColor = vec4(min(col, vec3(1.6)), 1.0);
}`;
