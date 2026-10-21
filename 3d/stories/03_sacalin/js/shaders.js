// Dinamica Sacalinului — GLSL (three.js ShaderMaterial, WebGL2)

const FOG = /* glsl */`
uniform float uFogD; uniform vec3 uFogC;
vec3 fogit(vec3 c, vec3 w){
  float f = 1.0-exp(-pow(length(w - cameraPosition)*uFogD, 2.0));
  return mix(c, uFogC, clamp(f, 0.0, 0.85));
}`;

// the ground: historical base map (mainland only + a drawn sea) cross-fading into the yearly satellite medians
export const groundVS = /* glsl */`
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix*vec4(position,1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
export const groundFS = /* glsl */`
${FOG}
uniform sampler2D tHist, tA, tB, tBathy;
uniform float uAB, uSat, uWave, uTime, uEdge;
uniform float uBathy, uBathyOp;          // 1898 mouth platform: visibility, peek-through (0) → opaque (1)
uniform vec4 uRect;                       // x0, z north, width, height (km)
varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 uv = vec2((vWorld.x - uRect.x)/uRect.z, (vWorld.z - uRect.y)/uRect.w);   // v = 0 at the north edge
  vec2 tuv = vec2(uv.x, 1.0 - uv.y);                                           // images: row 0 = north (flipY)
  // historical map: muted land, drawn sea with north-easterly swell
  vec4 h = texture2D(tHist, tuv);
  float lum = dot(h.rgb, vec3(0.3, 0.55, 0.15));
  vec3 land = mix(vec3(0.08, 0.11, 0.10), vec3(0.34, 0.38, 0.30), smoothstep(0.10, 0.70, lum));
  land = mix(land, h.rgb*0.55, 0.22);
  vec2 xz = vWorld.xz;
  vec3 sea = mix(vec3(0.035, 0.10, 0.18), vec3(0.06, 0.17, 0.27), noise(xz*0.18 + uTime*0.01));
  vec2 dir = normalize(vec2(-0.62, 0.78));                                      // swell travelling from the NE
  float ph = dot(xz, dir)*16.0 - uTime*1.6 + noise(xz*0.8)*4.0;
  float crest = pow(0.5 + 0.5*sin(ph), 22.0)*smoothstep(0.35, 0.85, noise(xz*1.3 + vec2(uTime*0.06, 0.0)));
  // the 1898 mouth platform under the water: first glimpsed through the swell (wobbling, faint), then fully shown
  if(uBathy > 0.001){
    vec2 wob = vec2(sin(ph*0.5 + xz.y*3.0), cos(ph*0.5 + xz.x*3.0))*0.0012*(1.0 - uBathyOp);
    vec4 b = texture2D(tBathy, tuv + wob);
    float k = b.a*uBathy*mix(0.42, 1.0, uBathyOp);
    sea = mix(sea, b.rgb, k);
    crest *= 1.0 - 0.6*k*uBathyOp;
  }
  sea += crest*vec3(0.10, 0.17, 0.22)*uWave;
  vec3 hist = mix(sea, land, h.a);
  // satellite medians (two years cross-fading)
  vec3 s = mix(texture2D(tA, tuv).rgb, texture2D(tB, tuv).rgb, uAB);
  vec3 col = mix(hist, s, uSat);
  float e = min(min(uv.x, 1.0-uv.x)*uRect.z, min(uv.y, 1.0-uv.y)*uRect.w);  // km to the edge of the image
  float a = smoothstep(0.0, uEdge, e);
  col *= mix(0.3, 1.0, a);
  gl_FragColor = vec4(fogit(col, vWorld), a);
}`;

// ribbons (shorelines, barrier band, breach outline): position on the line, offset across in the vertex shader
export const ribbonVS = /* glsl */`
uniform float uWidth;
attribute vec2 aNrm; attribute float aSide; attribute float aS;
varying float vSide; varying float vS; varying vec3 vWorld;
void main(){
  vec3 p = position; p.xz += aNrm*aSide*uWidth; p.y = 0.004;
  vSide = aSide; vS = aS;
  vec4 wp = modelMatrix*vec4(p,1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
export const lineFS = /* glsl */`
uniform vec3 uCol; uniform float uAlpha, uGlow, uDash, uTime;
varying float vSide; varying float vS; varying vec3 vWorld;
void main(){
  float d = abs(vSide);
  float core = 1.0 - smoothstep(0.30, 0.55, d);
  float glow = (1.0 - smoothstep(0.0, 1.0, d))*uGlow;
  float a = max(core, glow*0.45);
  if(uDash > 0.0) a *= step(0.45, fract(vS*uDash - uTime*0.25));
  vec3 c = mix(uCol, vec3(1.0), core*uGlow*0.55);
  if(a*uAlpha < 0.004) discard;
  gl_FragColor = vec4(c, a*uAlpha);
}`;
// the schematic sand barrier of the map years: aSide 0 = sea edge … 1 = lagoon edge (geometry built on the CPU)
export const bandVS = /* glsl */`
attribute float aV; attribute float aT;
varying float vV; varying float vT; varying vec3 vWorld;
void main(){
  vV = aV; vT = aT;
  vec4 wp = modelMatrix*vec4(position.x, 0.002, position.z, 1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
export const bandFS = /* glsl */`
uniform float uAlpha;
varying float vV; varying float vT; varying vec3 vWorld;
void main(){
  vec3 sand = vec3(0.93, 0.84, 0.62), wet = vec3(0.70, 0.66, 0.52);
  vec3 c = mix(sand, wet, smoothstep(0.35, 1.0, vV));
  float a = (1.0 - smoothstep(0.55, 1.0, vV))*0.9 + 0.1;
  a *= smoothstep(0.0, 1.0, vT);                     // taper at both tips
  gl_FragColor = vec4(c, a*uAlpha);
}`;

// longshore drift: sand streaks (instanced quads) travelling along the shoreline
export const driftVS = /* glsl */`
uniform float uLen, uWid;
attribute vec4 iP;                       // x, z (km), alpha, size
attribute vec2 iD;                       // unit direction of travel
varying vec2 vC; varying float vA;
void main(){
  vec2 corner = position.xy;
  vec2 d = iD, n = vec2(-d.y, d.x);
  vec2 xz = iP.xy + d*(corner.x-0.6)*uLen*iP.w*0.5 + n*corner.y*uWid*iP.w*0.5;
  vC = corner; vA = iP.z;
  gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(xz.x, 0.006, xz.y, 1.0);
}`;
export const driftFS = /* glsl */`
varying vec2 vC; varying float vA;
void main(){
  float u = vC.x*0.5+0.5;
  float w = mix(0.2, 1.0, smoothstep(0.0, 0.85, u));
  float across = 1.0 - smoothstep(w*0.45, w, abs(vC.y));
  float along = smoothstep(0.0, 0.75, u)*(1.0 - smoothstep(0.88, 1.0, u));
  float a = vA*across*along;
  if(a < 0.004) discard;
  vec3 c = mix(vec3(0.95,0.76,0.40), vec3(1.0,0.96,0.82), smoothstep(0.65, 0.95, u));
  gl_FragColor = vec4(c, a);
}`;

// rollover: curved arrows across the island (storm waves pushing sand over it, toward the lagoon)
export const rollVS = /* glsl */`
attribute float aS; attribute float aPh; attribute float aEnv;
varying float vS; varying float vPh; varying float vEnv;
void main(){
  vS = aS; vPh = aPh; vEnv = aEnv;
  gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position.x, 0.008, position.z, 1.0);
}`;
export const rollFS = /* glsl */`
uniform float uAlpha, uTime;
varying float vS; varying float vPh; varying float vEnv;
void main(){
  float pulse = 0.55 + 0.45*smoothstep(0.75, 1.0, 1.0 - abs(fract(vS*0.9 - uTime*0.55 + vPh) - 0.5)*2.0);
  float a = smoothstep(0.0, 0.25, vS)*vEnv*pulse*uAlpha;
  if(a < 0.004) discard;
  vec3 c = mix(vec3(0.80, 0.93, 1.0), vec3(1.0, 0.86, 0.55), smoothstep(0.35, 0.95, vS));
  gl_FragColor = vec4(c, a);
}`;
