// Povestea Deltei — GLSL (three.js ShaderMaterial, WebGL2)

export const COMMON = /* glsl */`
uniform float uRSL, uVX, uFogD, uClipR; uniform vec3 uFogC, uLight, uClipC;
float yd(float h){                       // metres -> display km (60x in the 0-3 m delta world, log-compressed above/below)
  float y;
  if(h>=0.0){ y = h<=3.0 ? 60.0*h : 180.0+1000.0*log(1.0+(h-3.0)/16.667); }
  else { float d=-h; y = d<=3.0 ? -60.0*d : -(180.0+400.0*log(1.0+(d-3.0)/6.6667)); }
  return y*0.001*uVX;
}
vec3 waterCol(float hr){                 // colour of the bed seen through water (hr < 0, metres)
  float d=-hr;
  vec3 c = mix(vec3(0.46,0.72,0.72), vec3(0.12,0.36,0.54), clamp(log(1.0+d)/log(15.0),0.0,1.0));
  c = mix(c, vec3(0.04,0.14,0.30), clamp(log(1.0+max(d-14.0,0.0))/log(120.0),0.0,1.0));
  return mix(c, vec3(0.02,0.06,0.16), clamp((d-150.0)/1800.0,0.0,1.0));
}
vec3 reliefCol(float h){                  // hills / uplands above water (h metres above water)
  vec3 c = mix(vec3(0.50,0.58,0.32), vec3(0.70,0.66,0.45), smoothstep(3.0,60.0,h));
  c = mix(c, vec3(0.52,0.55,0.35), smoothstep(60.0,260.0,h));
  c = mix(c, vec3(0.40,0.44,0.30), smoothstep(260.0,900.0,h));
  c = mix(c, vec3(0.56,0.52,0.45), smoothstep(900.0,2000.0,h));
  return mix(c, vec3(0.95,0.96,0.98), smoothstep(2300.0,3200.0,h));
}
`;
// spotlight on the delta: tSpot = 0..1 lit mask over the delta grid (built in app.js from all stages); 0 outside the grid
export const SPOT = /* glsl */`
uniform sampler2D tSpot; uniform vec4 uSpotR;            // x0, z of the south edge, width, height (km)
float spotLit(vec2 xz){
  vec2 uv = vec2((xz.x-uSpotR.x)/uSpotR.z, (uSpotR.y-xz.y)/uSpotR.w), uc = clamp(uv, 0.0, 1.0);
  vec2 o = (uv-uc)*uSpotR.zw;                               // km outside the grid: the edge value fades out (slowly only
  float fo = (1.0 - smoothstep(0.0, 18.0, max(o.x, 0.0))) * (1.0 - smoothstep(0.0, 2.0, length(vec2(min(o.x, 0.0), o.y))));   // seaward, east)
  return textureLod(tSpot, uc, 0.0).r * fo;
}
`;
const SPOT_SHADE = /* glsl */`
uniform float uSpotK;
vec3 spotShade(vec3 c, float lit){                         // in the shade: darker, a little desaturated
  float s = uSpotK*(1.0-lit), g = dot(c, vec3(0.30,0.59,0.11));
  return mix(c, mix(c, vec3(g), 0.35)*0.46, s);
}
`;
export const FRAG_COMMON = /* glsl */`
uniform float uFogD, uClipR; uniform vec3 uFogC, uLight, uClipC;
${SPOT_SHADE}
varying vec3 vWorld; varying vec3 vCol; varying float vHr;
vec3 geomN(){ vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld))); return N.y<0.0 ? -N : N; }
vec3 shadeN(vec3 col, vec3 N){
  float dif = max(dot(N, normalize(uLight)),0.0);
  float lit = vHr<0.0 ? 0.85+0.15*dif : 0.48+0.64*dif;
  return col*lit;
}
vec3 fogit(vec3 c){
  float dist = length(vWorld - cameraPosition);
  float f = 1.0-exp(-pow(dist*uFogD,2.0));
  return mix(c, uFogC, clamp(f,0.0,0.85));
}
void clip(){ if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard; }
`;

// class / timing lookups shared by the delta terrain and the water surface
export const STAGE = /* glsl */`
uniform sampler2D tCA, tCB, tFA, tFB, tDA, tDB;
uniform int uK; uniform float uFrac, uSpitP, uSacP;
uniform vec2 uC0; uniform float uCD; uniform vec2 uGrid;
float clsAt(int s, ivec2 c){
  vec4 a = texelFetch(tCA,c,0)*255.0, b = texelFetch(tCB,c,0)*255.0;
  float v = s==0?a.x : s==1?a.y : s==2?a.z : s==3?a.w : s==4?b.x : s==5?b.y : b.z;
  return floor(v+0.5);
}
float flipAt(int k, ivec2 c){
  vec4 a = texelFetch(tFA,c,0), b = texelFetch(tFB,c,0);
  return k==0?a.x : k==1?a.y : k==2?a.z : k==3?a.w : k==4?b.x : b.y;
}
float sdAt(int s, ivec2 c){                 // signed km to the open-sea coastline at stage s (>0 sea, <0 land/lagoon)
  vec4 a = texelFetch(tDA,c,0), b = texelFetch(tDB,c,0);
  float v = s==0?a.x : s==1?a.y : s==2?a.z : s==3?a.w : s==4?b.x : s==5?b.y : b.z;
  float sd = (v*255.0 - 128.0)*0.1;
  if(s==2 && texelFetch(tFB,c,0).z <= uSpitP + 0.003) sd = min(sd, b.w*25.5 - 0.06);   // the initial spit, revealed down to its tip
  if(s==6 && uSacP > 0.5) sd = min(sd, texelFetch(tFB,c,0).w*25.5 - 0.06);           // Sacalin, after 1897
  return sd;
}
float sdOpen(ivec2 c){                      // coast of the moment (terrain, waves, drift)
  int k = max(uK, 0);
  float f = uFrac;
  if(uK==5){                                 // the Chilia lobe grows after ~1750: same time warp as its class flips (bits 2-7 of cls_b.w)
    float wc = floor(texelFetch(tCB,c,0).w*255.0/4.0 + 0.01)/63.0;
    f = clamp((f - 0.815*wc)/(1.0 - 0.815*wc), 0.0, 1.0);
  }
  return uK<0 ? sdAt(0,c) : mix(sdAt(k,c), sdAt(k+1,c), f);
}
float sdNow(ivec2 c){ return sdOpen(c); }   // coast of the moment as waves / drift see it
// the lee of the initial spit, 0..1 (bit 1 of cls_b.w = lagoon cell; fb.z = spit progress that puts it in the wave shadow).
// Waves and drift fade out there; it no longer bends the coast field, which swept fake surf lines across the lagoon.
float shelterAt(ivec2 c){
  if(uK<1 || uK>2 || mod(floor(texelFetch(tCB,c,0).w*255.0/2.0 + 0.01), 2.0) < 0.5) return 0.0;
  if(uK==2) return 1.0;
  return smoothstep(0.0, 0.08, uSpitP + 0.003 - texelFetch(tFB,c,0).z);
}
ivec2 cellOf(vec2 xz){ return ivec2(int(floor((xz.x-uC0.x)/uCD+0.5)), int(floor((uC0.y-xz.y)/uCD+0.5))); }
bool inGrid(ivec2 c){ return c.x>=0 && c.y>=0 && float(c.x)<uGrid.x && float(c.y)<uGrid.y; }
`;

export const innerVS = /* glsl */`
${COMMON}
${STAGE}
${SPOT}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uReal, uSeaClamp, uFlood;
attribute vec3 aH;                        // htoday, hland, zsea (m)
attribute vec2 aGrad;                     // smoothed slope of the static relief (display km per km), for soft hill shading
varying vec3 vWorld; varying vec3 vCol; varying float vHr; varying vec2 vSat; varying vec2 vLocal; varying float vLand;
varying vec2 vGrad; varying float vRelief; varying float vSpot;
uniform vec4 uSat;
// regional grid (h, hpre) for a seamless hand-over at the edges of the delta grid
uniform sampler2D tOut; uniform vec3 uOut; uniform vec4 uInR;   // uOut: x0, z of row 0 (south edge), cell (km); uInR: x0, x1, z0, z1
float outerRel(vec2 xz){
  vec2 g = vec2((xz.x-uOut.x)/uOut.z, (uOut.y-xz.y)/uOut.z);
  ivec2 sz = textureSize(tOut,0); ivec2 i0 = clamp(ivec2(floor(g)), ivec2(0), sz-2); vec2 f = clamp(g - vec2(i0), 0.0, 1.0);
  vec2 a = texelFetch(tOut,i0,0).xy, b = texelFetch(tOut,i0+ivec2(1,0),0).xy, c = texelFetch(tOut,i0+ivec2(0,1),0).xy, d = texelFetch(tOut,i0+ivec2(1,1),0).xy;
  vec2 v = mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  return mix(v.y, v.x, uReal) - uRSL;
}
float relH(float cls, float staticLake, float d){
  float bed = aH.z - uRSL;
  float fl = max(uSeaClamp, smoothstep(0.8, -0.8, aH.z - uFlood));     // the bay floods from its deepest part inwards
  if(cls<0.5){ float shore = -(0.25 + 11.4*(1.0-exp(-d/2.5)));         // shoreface / prodelta around the paleo coast
               float top = -mix(0.25, 0.6, smoothstep(0.0, 0.5, d));             // shallow right at the shore: no wall at the waterline
               float prof = mix(min(max(bed, shore), top), min(bed, -0.6), smoothstep(5.0, 11.0, d));   // open shelf further out
               return mix(bed, prof, fl); }
  if(cls<1.5) return mix(bed - 1.0, -1.1, fl);
  if(cls<2.5) return mix(max(aH.y, bed + aH.y), aH.y, fl);
  if(cls<3.5) return max(aH.y, 1.3);
  if(cls<4.5) return mix(bed - 2.0, -1.4, fl);
  return staticLake>0.5 ? mix(aH.x - uRSL, -1.4, fl) : aH.x - uRSL;
}
vec3 colFor(float cls, float hr){
  if(hr<0.0) return cls<0.5 ? waterCol(hr) : (cls<1.5 ? vec3(0.38,0.64,0.78) : (cls<4.5 && cls>3.5 ? vec3(0.32,0.57,0.72) : waterCol(hr)));
  if(cls<0.5) return reliefCol(hr);
  if(cls<2.5){ vec3 c = mix(vec3(0.30,0.52,0.20), vec3(0.50,0.64,0.28), smoothstep(0.3,2.5,hr));
               return mix(c, vec3(0.82,0.74,0.48), smoothstep(4.0,9.0,hr)); }
  if(cls<3.5) return mix(vec3(0.88,0.70,0.34), vec3(0.95,0.86,0.60), smoothstep(1.3,8.0,hr));
  return reliefCol(hr);
}
float isLand(float c){ return (c>1.5 && c<3.5) ? 1.0 : 0.0; }
float wetAt(int s, ivec2 q){               // lake, river or static lake at cell q (stage s)
  q = clamp(q, ivec2(0), ivec2(uGrid)-1);
  float k = clsAt(s, q), lk = mod(floor(texelFetch(tCB,q,0).w*255.0+0.5), 2.0);
  return max(lk, (k>0.5 && k<1.5) || (k>3.5 && k<4.5) ? 1.0 : 0.0);
}
void main(){
  ivec2 c = cellOf(position.xz);
  float sl = mod(floor(texelFetch(tCB,c,0).w*255.0+0.5), 2.0);          // bit 0: static lake
  float cA, cB, w, d;
  if(uK<0){ cA = clsAt(0,c); cB = cA; w = 0.0; d = max(sdAt(0,c), 0.0); }
  else {
    cA = clsAt(uK,c); cB = clsAt(uK+1,c);
    float f = flipAt(uK,c);
    w = f>0.995 ? 0.0 : smoothstep(f-0.035, f+0.035, uFrac);
    if((uK==1 || uK==2) && texelFetch(tDB,c,0).w < 0.002){          // the initial spit's own cells: the smooth ribbon draws it;
      if(uK==1) cB = 0.0;                                          // in 5.5 -> 3.5 ka the ribbon sinks while the 3.5 ka map rises
      else { cA = 0.0; w = max(w, smoothstep(0.05, 0.35, uFrac)); }
    }
    d = max(sdOpen(c), 0.0);             // the lagoon keeps its bay floor; only waves / drift see the spit's lee
  }
  float hA = relH(cA, sl, d), hB = relH(cB, sl, d);
  // static relief slopes down to the open-sea shore over ~0.5 km instead of standing as a 110 m-stepped wall
  float sdl = uK<0 ? sdAt(0,c) : sdOpen(c), ramp = smoothstep(0.05, 0.55, -sdl);
  if(sl<0.5 && (cA>4.5 || cB>4.5) && ramp>0.0){                     // ... and to lakes / rivers within two cells
    int s0 = uK<0 ? 0 : uK;
    float n1 = max(max(wetAt(s0, c+ivec2(1,0)), wetAt(s0, c-ivec2(1,0))), max(wetAt(s0, c+ivec2(0,1)), wetAt(s0, c-ivec2(0,1))));
    float n2 = n1>0.5 ? 1.0 : max(max(wetAt(s0, c+ivec2(2,0)), wetAt(s0, c-ivec2(2,0))), max(wetAt(s0, c+ivec2(0,2)), wetAt(s0, c-ivec2(0,2))));
    ramp = min(ramp, n1>0.5 ? 0.0 : (n2>0.5 ? 0.3 : 1.0));
  }
  if(cA>4.5 && sl<0.5) hA = mix(min(hA, 0.12), hA, ramp);
  if(cB>4.5 && sl<0.5) hB = mix(min(hB, 0.12), hB, ramp);
  float hr = mix(hA, hB, w);
  vec3 col = mix(colFor(cA, hA), colFor(cB, hB), w);
  vLand = mix(isLand(cA), isLand(cB), w);
  if(uK<0 && cA>0.5 && cA<4.5){            // before 8 ka the valley's delta cells are drowned valley floor until the water reaches them
    float fb = max(uSeaClamp, smoothstep(0.8, -0.8, aH.z - uFlood)), h0 = relH(0.0, sl, d);
    hr = mix(h0, hr, fb); col = mix(colFor(0.0, h0), col, fb); vLand *= fb;
  }
  vRelief = mix(step(4.5, cA), step(4.5, cB), w) * (1.0 - sl);
  float hReal = aH.x;
  hr = mix(hr, hReal, uReal);
  col = mix(col, hReal<0.0 ? waterCol(hReal) : colFor(2.0, hReal), uReal*0.6);
  vLand = mix(vLand, hReal>0.0 ? 1.0 : 0.0, uReal);
  // within ~5 km of the grid edge, hand over to the regional grid (same heights, same colours, no detail normals)
  float e = min(min(position.x-uInR.x, uInR.y-position.x), min(position.z-uInR.z, uInR.w-position.z));
  float fade = smoothstep(0.4, 5.5, e);
  // delta cells (lagoons, land, ridges, rivers) stay to the very edge: the initial spit's root and the Chilia lobe sit there
  float body = mix(step(0.5, cA)*step(cA, 4.5), step(0.5, cB)*step(cB, 4.5), w) * (1.0 - uReal);
  fade = max(fade, body*smoothstep(0.0, 0.5, e)*step(6.0, position.x-uInR.x));   // (not on the west edge: the valley hands over there)
  if(fade<1.0){ float ho = outerRel(position.xz); vec3 co = ho<0.0 ? waterCol(ho) : reliefCol(ho);
                hr = mix(ho, hr, fade); col = mix(co, col, fade); vLand *= fade; vRelief = mix(step(0.0, ho), vRelief, fade); }
  vRelief *= step(0.0, hr);
  vHr = hr; vCol = col; vLocal = position.xz; vGrad = aGrad*uVX; vSpot = spotLit(position.xz);
  vec3 p = vec3(position.x, yd(hr), position.z);
  vec4 wp = modelMatrix*vec4(p,1.0); vWorld = wp.xyz;
  vSat = vec2((position.x-uSat.x)/uSat.z, 1.0-(position.z-uSat.y)/uSat.w);
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const innerFS = /* glsl */`
${FRAG_COMMON}
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tSat, tNrm, tAnth, tAnthC, tBr; uniform float uReal, uSatOn, uNrmOn, uAnth, uCanal, uPolder, uTime; uniform vec4 uNrm;   // x0, z(north edge), w, h (km)
varying vec2 vSat; varying vec2 vLocal; varying float vLand; varying vec2 vGrad; varying float vRelief; varying float vSpot;
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash2(i), hash2(i+vec2(1.0,0.0)), u.x), mix(hash2(i+vec2(0.0,1.0)), hash2(i+vec2(1.0,1.0)), u.x), u.y); }
float fbm3(vec2 p){ return 0.55*vnoise(p) + 0.30*vnoise(p*2.13+7.1) + 0.15*vnoise(p*4.37+3.3); }
void main(){
  #include <logdepthbuf_fragment>
  clip();
  vec3 col = vCol;
  vec3 N = geomN();
  if(vRelief>0.01){                        // hills: smooth slopes (no GEBCO / 110 m facets) + fine procedural relief, faded out
    vec3 Ns = normalize(vec3(-vGrad.x, 1.0, -vGrad.y));                       // when it would alias
    float px = length(fwidth(vLocal)), amp = (1.0 - smoothstep(0.06, 0.22, px)) * clamp(length(vGrad)*6.0 + 0.25, 0.0, 1.0);
    if(amp>0.0){ vec2 q = vLocal/0.45; float e = 0.05;
      vec2 g = vec2(fbm3(q+vec2(e,0.0)) - fbm3(q-vec2(e,0.0)), fbm3(q+vec2(0.0,e)) - fbm3(q-vec2(0.0,e)))/(2.0*e);
      Ns = normalize(Ns + vec3(-g.x, 0.0, -g.y)*0.16*amp); }
    N = normalize(mix(N, Ns, vRelief));
  }
  if(uNrmOn>0.5 && vLand>0.01 && vHr>0.0){
    vec2 uv = vec2((vLocal.x-uNrm.x)/uNrm.z, (vLocal.y-uNrm.y)/uNrm.w);
    vec4 t = texture2D(tNrm, uv);
    vec2 e = t.xy*2.0 - 1.0; e = clamp(e, -0.97, 0.97);
    vec2 gr = 0.03*e/(1.0-abs(e));                 // m/m
    N = normalize(N + vec3(-gr.x, 0.0, -gr.y)*14.0*vLand*t.z);
  }
  if(uSatOn>0.5 && uReal>0.0){ vec4 s = texture2D(tSat, vSat); col = mix(col, s.rgb*1.08, s.a*uReal*0.92); }
  vec3 c = shadeN(col, N);
  if(uAnth>0.0){                           // the Anthropocene (same grid as tNrm): R canals, G canal halo, B polders; dikes = own mesh
    vec2 ua = vec2((vLocal.x-uNrm.x)/uNrm.z, (vLocal.y-uNrm.y)/uNrm.w);
    vec3 m = texture2D(tAnth, ua).rgb * uAnth, f = texture2D(tAnthC, ua).rgb;   // f: distance from the canal ends (0..1), cos, sin of the pulse phase
    float far = smoothstep(0.04, 0.2, length(fwidth(vLocal)));
    m.r = min(m.r * (1.0 + 2.5*far), 1.0);                                     // seen from afar the thin lines still read
    float grown = 1.0 - smoothstep(uCanal - 0.012, uCanal + 0.004, f.r);         // dug from both ends towards the middle
    float head = exp(-pow((f.r - uCanal)/0.012, 2.0)) * step(uCanal, 1.0);      // the digging front glows
    vec2 cs = f.gb*2.0 - 1.0; cs /= max(length(cs), 1e-3);
    float w = 3.0*uTime, pulse = cs.x*cos(w) + cs.y*sin(w);                      // "electrons": downstream (model water level)
    float elec = smoothstep(0.86, 0.995, pulse) * m.g * grown;
    if(m.b > 0.003 && uPolder > 0.0){                // polders = farmland: parcels of crops, ploughed soil and drains
      vec2 q = mat2(0.966, -0.259, 0.259, 0.966) * vLocal, fs = vec2(0.42, 0.16);   // km, fields slightly turned
      vec2 cell = floor(q/fs), fq = fract(q/fs);
      float h = hash2(cell), h2 = hash2(cell + 17.3);
      vec3 crop = h < 0.30 ? vec3(0.80,0.71,0.33) : h < 0.55 ? vec3(0.40,0.57,0.21) : h < 0.80 ? vec3(0.58,0.67,0.29) : vec3(0.50,0.38,0.24);
      crop *= 0.9 + 0.2*h2;
      float rows = 0.92 + 0.08*sin((h > 0.5 ? fq.x*60.0 : fq.y*24.0));          // furrows
      float edge = smoothstep(0.0, 0.05, fq.x)*smoothstep(1.0, 0.95, fq.x)*smoothstep(0.0, 0.12, fq.y)*smoothstep(1.0, 0.88, fq.y);
      float px = length(fwidth(vLocal)), near = 1.0 - smoothstep(0.03, 0.10, px);   // fine parcels fade out where they would alias
      vec2 bq = q/vec2(1.3, 0.55), bc = floor(bq), bf = fract(bq);                // ... into a coarse patchwork of farm blocks seen from afar
      float bh = hash2(bc + 3.7);
      vec3 blockC = bh < 0.35 ? vec3(0.82,0.72,0.34) : bh < 0.62 ? vec3(0.42,0.60,0.22) : bh < 0.85 ? vec3(0.62,0.70,0.30) : vec3(0.55,0.42,0.26);
      float bedge = smoothstep(0.0, 0.04, bf.x)*smoothstep(1.0, 0.96, bf.x)*smoothstep(0.0, 0.08, bf.y)*smoothstep(1.0, 0.92, bf.y);
      blockC *= mix(1.0, mix(0.8, 1.0, bedge), 1.0 - smoothstep(0.12, 0.35, px));
      vec3 fc = mix(mix(blockC, vec3(0.64,0.62,0.32), smoothstep(0.35, 0.9, px)), crop*rows*mix(0.72, 1.0, edge), near);
      c = mix(c, shadeN(fc, N), min(m.b*1.4, 1.0)*0.85*uPolder);
    }
    float bm = texture2D(tBr, ua).r * uAnth;            // main branches, subtle: a faint glow with a slow shimmer
    c = mix(c, vec3(0.80,0.92,1.0), min(bm*(1.0 + 1.5*far), 1.0)*(0.40 + 0.10*sin(uTime*1.3 + vLocal.x*0.8 - vLocal.y*0.5)));
    c = mix(c, vec3(0.45,0.95,1.0), m.r*0.95*grown);
    c += (vec3(0.9,1.0,1.0)*elec*2.0 + vec3(1.0,0.95,0.7)*head*m.g*1.2) * uAnth;
  }
  gl_FragColor = vec4(fogit(spotShade(c, vSpot)),1.0);
}`;

// regional GEBCO context (pre-deltaic shelf until the present-day reveal)
export const outerVS = /* glsl */`
${COMMON}
${SPOT}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uReal;
attribute float aH; attribute float aHpre; attribute float aDrop; attribute vec2 aGrad;
varying vec3 vWorld; varying vec3 vCol; varying float vHr; varying vec2 vGrad; varying float vSpot;
void main(){
  float hr = mix(aHpre, aH, uReal) - uRSL; vSpot = spotLit(position.xz);
  vHr = hr; vCol = hr<0.0 ? waterCol(hr) : reliefCol(hr); vGrad = aGrad*uVX;
  vec4 wp = modelMatrix*vec4(position.x, yd(hr) - aDrop, position.z, 1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const staticFS = /* glsl */`
${FRAG_COMMON}
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity;
void main(){
  #include <logdepthbuf_fragment>
  clip();
  gl_FragColor = vec4(fogit(shadeN(vCol, geomN())), uOpacity);
}`;

export const outerFS = /* glsl */`
${FRAG_COMMON}
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOpacity;
varying vec2 vGrad; varying float vSpot;
void main(){
  #include <logdepthbuf_fragment>
  clip();
  vec3 N = normalize(vec3(-vGrad.x, 1.0, -vGrad.y));          // smooth vertex slopes, no GEBCO cell facets
  gl_FragColor = vec4(fogit(spotShade(shadeN(vCol, N), vSpot)), uOpacity);
}`;

// Europe (prologue): schematic ice sheets + mountain glaciers + Danube basin highlight
export const europeVS = /* glsl */`
${COMMON}
${SPOT}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uIce;                      // Fennoscandian R (km), British-Irish R (km), glacier depression 0..1
uniform float uBasin, uTime;
attribute float aH; attribute float aBasin; attribute vec2 aLL; attribute float aDrop; attribute vec3 aNrm;
varying vec3 vWorld; varying vec3 vCol; varying float vHr; varying float vIce; varying float vBasin; varying vec3 vNrm; varying float vSpot;
vec2 elaOf(vec2 ll){                     // (today, LGM) equilibrium-line altitude, m
  if(ll.x>5.5 && ll.x<16.5 && ll.y>43.5 && ll.y<48.5) return vec2(2950.0,1250.0);   // Alps
  if(ll.x>-2.5 && ll.x<3.5 && ll.y>41.8 && ll.y<43.6) return vec2(2900.0,1750.0);   // Pyrenees
  if(ll.x>17.0 && ll.x<27.5 && ll.y>44.3 && ll.y<50.0) return vec2(2750.0,1650.0);  // Carpathians
  if(ll.x>13.0 && ll.x<25.0 && ll.y>39.0 && ll.y<44.3) return vec2(2800.0,1800.0);  // Dinarides, Balkans
  if(ll.x>37.0 && ll.y>40.0 && ll.y<44.5) return vec2(3500.0,2400.0);               // Caucasus
  if(ll.y>58.0 && ll.x<32.0) return vec2(1700.0,700.0);                             // Scandes
  return vec2(3300.0,2400.0);
}
float sheet(vec2 ll, vec2 c, float R, float Rlgm, float Hmax){
  if(R<1.0) return 0.0;
  float dx=(ll.x-c.x)*111.32*cos(radians(0.5*(ll.y+c.y))), dy=(ll.y-c.y)*110.6;
  float r=length(vec2(dx,dy)), th=atan(dy,dx);
  float Re=R*(1.0+0.09*sin(3.0*th+1.3)+0.05*sin(7.0*th+0.4)+0.025*sin(15.0*th+2.0));
  float q=r/Re; if(q>=1.0) return 0.0;
  return Hmax*sqrt(R/Rlgm)*sqrt(1.0-q*q);
}
void main(){
  vec2 e = elaOf(aLL);
  float ela = mix(e.x, e.y, uIce.z);
  float hg = aH>0.0 ? 450.0*smoothstep(ela-650.0, ela+250.0, aH) : 0.0;
  float hs = max(sheet(aLL, vec2(17.0,63.5), uIce.x, 1150.0, 3000.0), sheet(aLL, vec2(-4.5,55.5), uIce.y, 470.0, 1600.0));
  float H = max(hg, hs);
  float surf = aH + H;
  float hr = surf - uRSL;
  vIce = smoothstep(15.0, 120.0, H);
  vec3 col = hr<0.0 ? waterCol(hr) : reliefCol(hr);
  vCol = mix(col, vec3(0.90,0.95,1.0), vIce);
  vHr = hr; vBasin = aBasin; vNrm = aNrm; vSpot = spotLit(position.xz);
  vec4 wp = modelMatrix*vec4(position.x, yd(hr) - aDrop, position.z, 1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const europeFS = /* glsl */`
${FRAG_COMMON}
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uBasin, uTime;
varying float vIce; varying float vBasin; varying vec3 vNrm; varying float vSpot;
void main(){
  #include <logdepthbuf_fragment>
  clip();
  vec3 col = shadeN(vCol, normalize(mix(normalize(vNrm), geomN(), smoothstep(0.2, 0.8, vIce))));   // smooth relief; ice keeps its facets
  if(uBasin>0.0){                       // schematic basin: muted land outside, a crisp golden outline
    float b = smoothstep(0.42, 0.58, vBasin);
    float landOut = (1.0-b) * step(0.0, vHr) * (1.0 - vIce);
    vec3 grey = vec3(dot(col, vec3(0.30,0.59,0.11)));
    col = mix(col, mix(col, grey, 0.6)*0.55, landOut*uBasin);
    col = mix(col, col*1.07 + vec3(0.015,0.025,0.0), b*uBasin);
    float w = max(fwidth(vBasin), 1e-4);
    float edge = 1.0 - smoothstep(w*0.9, w*2.4, abs(vBasin-0.5));
    float glow = 1.0 - smoothstep(w*2.0, w*9.0, abs(vBasin-0.5));
    col += glow*uBasin*vec3(0.9,0.65,0.25)*0.18;
    col = mix(col, vec3(1.0,0.85,0.48), edge*uBasin*0.95);
  }
  gl_FragColor = vec4(fogit(spotShade(col, vSpot)),1.0);
}`;

// water: reflective sheet + wave crests (only on the open sea of the current stage)
// coast-distance field: one fragment per delta cell (render target NC × NR, row 0 = south, like the data grids)
export const sdFieldVS = /* glsl */`
void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const sdFieldFS = /* glsl */`
${STAGE}
uniform float uReal;
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float sh = 0.0;                            // shelter, averaged over ±3 cells (no 110 m steps at the mask edges)
  if(uReal<0.5 && uK>=1 && uK<=2) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++) sh += shelterAt(clamp(c+ivec2(i,j)*3, ivec2(0), ivec2(uGrid)-1));
  gl_FragColor = vec4(uReal>0.5 ? sdAt(6,c) : sdNow(c), sh/9.0, 0.0, 1.0);
}`;

export const waterVS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vWorld; varying vec2 vLocal;
void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vWorld = wp.xyz; vLocal = position.xz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const waterFS = /* glsl */`
${STAGE}
${SPOT}
${SPOT_SHADE}
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uFogD, uClipR, uTime, uWave, uReal, uViewKm, uSpitZ; uniform vec3 uFogC, uLight, uClipC;
varying vec3 vWorld; varying vec2 vLocal;
#ifdef SD_TEX
uniform sampler2D tSD;                     // coast-distance field of the moment (rendered by sdFieldFS when the stage changes)
float sdBil(vec2 xz){
  vec2 g = vec2((xz.x-uC0.x)/uCD, (uC0.y-xz.y)/uCD);
  if(g.x<0.0 || g.y<0.0 || g.x>=uGrid.x-1.0 || g.y>=uGrid.y-1.0) return 99.0;
  return texture2D(tSD, (g+0.5)/uGrid).r;
}
float shelterBil(vec2 xz){
  vec2 g = vec2((xz.x-uC0.x)/uCD, (uC0.y-xz.y)/uCD);
  if(g.x<0.0 || g.y<0.0 || g.x>=uGrid.x-1.0 || g.y>=uGrid.y-1.0) return 0.0;
  return texture2D(tSD, (g+0.5)/uGrid).g;
}
#else
float sdv(ivec2 c){ return uReal>0.5 ? sdAt(6,c) : sdNow(c); }
float sdBil(vec2 xz){                      // bilinear signed distance to the coast at the current time (km)
  vec2 g = vec2((xz.x-uC0.x)/uCD, (uC0.y-xz.y)/uCD);
  ivec2 i0 = ivec2(floor(g)); vec2 f = g - vec2(i0);
  if(i0.x<0 || i0.y<0 || float(i0.x)>=uGrid.x-1.0 || float(i0.y)>=uGrid.y-1.0) return 99.0;
  float a = sdv(i0), b = sdv(i0+ivec2(1,0)), c = sdv(i0+ivec2(0,1)), d = sdv(i0+ivec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float shelterBil(vec2 xz){
  if(uReal>0.5) return 0.0;
  vec2 g = vec2((xz.x-uC0.x)/uCD, (uC0.y-xz.y)/uCD);
  ivec2 i0 = ivec2(floor(g)); vec2 f = g - vec2(i0);
  if(i0.x<0 || i0.y<0 || float(i0.x)>=uGrid.x-1.0 || float(i0.y)>=uGrid.y-1.0) return 0.0;
  return mix(mix(shelterAt(i0), shelterAt(i0+ivec2(1,0)), f.x), mix(shelterAt(i0+ivec2(0,1)), shelterAt(i0+ivec2(1,1)), f.x), f.y);
}
#endif
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0-max(V.y,0.0), 3.0);
  vec3 H = normalize(normalize(uLight)+V);
  float spec = pow(max(H.y,0.0), 180.0)*0.35;
  vec3 c = mix(vec3(0.10,0.30,0.44), vec3(0.55,0.70,0.80), fres*0.7) + spec;
  float a = 0.30 + 0.45*fres;
  if(uK>=1 && uK<=2 && uReal<0.5){                            // shallows around the initial spit (only where it has grown)
    vec2 g = vec2((vLocal.x-uC0.x)/uCD, (uC0.y-vLocal.y)/uCD); ivec2 i0 = ivec2(floor(g)); vec2 f = g - vec2(i0);
    if(i0.x>=0 && i0.y>=0 && float(i0.x)<uGrid.x-1.0 && float(i0.y)<uGrid.y-1.0){
      float d00 = texelFetch(tDB,i0,0).w, d10 = texelFetch(tDB,i0+ivec2(1,0),0).w, d01 = texelFetch(tDB,i0+ivec2(0,1),0).w, d11 = texelFetch(tDB,i0+ivec2(1,1),0).w;
      float dsp = mix(mix(d00,d10,f.x), mix(d01,d11,f.x), f.y)*25.5;            // km to the spit
      float rev = uK==2 ? 1.0 - smoothstep(0.05, 0.35, uFrac) : smoothstep(uSpitZ + 0.6, uSpitZ - 0.3, vLocal.y) * step(0.0005, uSpitP);   // north of the growing tip
      float sh = rev * (1.0 - smoothstep(0.15, 1.4, dsp));
      c = mix(c, vec3(0.42,0.74,0.76), sh*0.75); a = mix(a, 0.9, sh*0.7);
      float rim = rev * (1.0 - smoothstep(0.0, 0.35, abs(dsp - 0.32)));        // surf on the barrier's edge
      c = mix(c, vec3(0.95,0.97,0.94), rim*0.55*(0.75+0.25*sin(uTime*2.5 + vLocal.y*1.3)));
    }
  }
  if(uWave>0.0){
    float sd = sdBil(vLocal), open = 1.0 - shelterBil(vLocal);
    if(sd>0.0 && sd<12.0 && open>0.002){
      float hstep = clamp(uViewKm*0.012, 0.6, 3.0);           // smooth coast normal from a wide stencil
      vec2 gr = vec2(sdBil(vLocal+vec2(hstep,0.0)) - sdBil(vLocal-vec2(hstep,0.0)), sdBil(vLocal+vec2(0.0,hstep)) - sdBil(vLocal-vec2(0.0,hstep)));
      vec2 n = length(gr)>1e-3 ? normalize(gr) : vec2(0.62,-0.78);  // points offshore
      vec2 T = vec2(-n.y, n.x); if(T.y<0.0) T = -T;                 // along the coast, southward
      if(uWave>0.0){
        float lam = clamp(uViewKm*0.028, 1.0, 6.0);
        float ph = -sd/lam - uTime*0.40;                               // shore-parallel crests travelling to the coast
        float crest = smoothstep(0.80, 0.97, 0.5+0.5*sin(ph*6.2831853));
        float brk = 0.4 + 0.6*smoothstep(0.2, 0.8, 0.5+0.5*sin(dot(vLocal, T)/(lam*1.7) + 2.0*sin(dot(vLocal,T)/(lam*5.3))));
        float env = smoothstep(0.1, 0.6, sd) * (1.0 - smoothstep(lam*2.0, lam*3.6, sd));
        float surf = (1.0 - smoothstep(0.0, clamp(uViewKm*0.005, 0.2, 0.8), sd)) * (0.7 + 0.3*sin(uTime*3.0 + dot(vLocal,T)*2.0));
        vec2 dirSW = normalize(vec2(-0.62, 0.78));
        float expo = mix(0.06, 1.0, smoothstep(-0.25, 0.55, dot(n, -dirSW)));   // coasts facing the NE swell get the full surf
        vec2 gq = vec2((vLocal.x-uC0.x)/uCD, (uC0.y-vLocal.y)/uCD);
        float edge = smoothstep(0.0, 4.0/uCD, min(min(gq.x, uGrid.x-1.0-gq.x), min(gq.y, uGrid.y-1.0-gq.y)));   // fade before the grid edge
        float w = uWave*open*edge*(crest*brk*env*0.7*expo + surf*0.8*expo);
        c = mix(c, vec3(0.95,0.98,1.0), w); a = mix(a, 0.95, w*0.8);
      }
    }
  }
  c = spotShade(c, spotLit(vLocal));
  float dist = length(vWorld - cameraPosition);
  float f = 1.0-exp(-pow(dist*uFogD,2.0));
  gl_FragColor = vec4(mix(c, uFogC, clamp(f,0.0,0.85)), mix(a, 1.0, clamp(f,0.0,1.0)));
}`;

// ribbons: Danube + tributaries (glow)
export const ribbonVS = /* glsl */`
${COMMON}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uWidth, uLift, uUseH;
attribute float aH; attribute float aSide; attribute vec2 aNrm; attribute float aS; attribute float aLen;
varying float vS; varying float vSide; varying float vLen; varying vec3 vWorld; varying float vWet;
void main(){
  vec3 p = position; p.xz += aNrm*aSide*uWidth;
  p.y = uUseH>0.5 ? yd(aH - uRSL) + uLift : uLift; vWet = uUseH>0.5 ? aH - uRSL : 1.0;
  vS = aS; vSide = aSide; vLen = aLen;
  vec4 wp = modelMatrix*vec4(p,1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const riverFS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uReveal, uAlpha, uTime, uClipR; uniform vec3 uClipC;
varying float vS; varying float vSide; varying float vLen; varying vec3 vWorld; varying float vWet;
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  if(vS>uReveal || vWet<-1.0) discard;                     // ends at the coast of the moment
  float core = 1.0 - smoothstep(0.15, 1.0, abs(vSide));
  float flow = 0.5+0.5*sin(vLen*0.05 - uTime*4.0);
  float head = uReveal<0.999 ? smoothstep(uReveal-0.02, uReveal, vS) : 0.0;
  vec3 col = mix(vec3(0.25,0.70,1.0), vec3(0.85,0.97,1.0), core*0.6 + flow*0.25) + head*vec3(1.0,0.9,0.5);
  gl_FragColor = vec4(col, uAlpha*(0.35+0.65*core)*(0.8+0.2*flow)*smoothstep(-1.0, 1.0, vWet));
}`;
// longshore drift: sand streaks (instanced quads, one per grain) travelling along the coast
export const driftVS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uLen, uWid;
attribute vec4 iP;                       // x, z (km), alpha, size
attribute vec2 iD;                       // unit direction of travel
varying vec2 vC; varying float vA; varying vec3 vWorld;
void main(){
  vec2 corner = position.xy;              // x: -1 tail … +1 head, y: -1…+1 across
  vec2 d = iD, n = vec2(-d.y, d.x);
  vec2 xz = iP.xy + d*(corner.x-0.6)*uLen*iP.w*0.5 + n*corner.y*uWid*iP.w*0.5;   // the head sits on the grain
  vec4 wp = modelMatrix*vec4(xz.x, 0.03, xz.y, 1.0); vWorld = wp.xyz;
  vC = corner; vA = iP.z;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const driftFS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uClipR; uniform vec3 uClipC;
varying vec2 vC; varying float vA; varying vec3 vWorld;
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  float u = vC.x*0.5+0.5;                                  // 0 tail … 1 head
  float w = mix(0.35, 1.0, smoothstep(0.0, 0.8, u));      // a soft, thin streak (no hard comet head)
  float across = exp(-4.0*(vC.y*vC.y)/(w*w));
  float along = smoothstep(0.0, 0.7, u) * (1.0 - smoothstep(0.82, 1.0, u));
  float a = vA*across*along;
  if(a<0.003) discard;
  vec3 c = mix(vec3(0.94,0.83,0.60), vec3(1.0,0.96,0.86), smoothstep(0.55, 0.95, u));
  gl_FragColor = vec4(c, a);
}`;

// soft sediment particles: river plumes (mud) 
export const plumeVS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uScale, uPix;
attribute float aA; attribute float aSize;
varying float vA; varying vec3 vWorld;
void main(){
  vA = aA;
  vec4 wp = modelMatrix*vec4(position,1.0); vWorld = wp.xyz;
  vec4 mv = viewMatrix*wp;
  gl_Position = projectionMatrix*mv;
  gl_PointSize = aSize*uScale*uPix/max(-mv.z, 0.001);
  #include <logdepthbuf_vertex>
}`;
export const plumeFS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uClipR; uniform vec3 uClipC, uCol;
varying float vA; varying vec3 vWorld;
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  vec2 p = gl_PointCoord*2.0-1.0; float r = dot(p,p); if(r>1.0) discard;
  gl_FragColor = vec4(uCol, vA*(1.0-r)*(1.0-r));
}`;

// sand barriers drawn as smooth ribbons along their centreline (the 110 m class cells gave stepped edges):
// the initial spit (grows to its tip: aT = growth progress, uGrow = progress now) and Sacalin (1897)
export const sacVS = /* glsl */`
${COMMON}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uGrow, uAmp;
attribute float aH;                      // height above the sea (m) once fully emerged
attribute float aT;
varying vec3 vWorld; varying vec3 vCol; varying float vHr; varying float vE;
void main(){
  vE = smoothstep(0.0, 0.015, uGrow - aT) * uAmp;                  // rounded growing tip
  float h = mix(-1.5, aH, vE);
  vHr = h; vCol = mix(vec3(0.86,0.70,0.40), vec3(0.96,0.88,0.64), smoothstep(0.3, 1.8, h));
  vec4 wp = modelMatrix*vec4(position.x, yd(h), position.z, 1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const sacFS = /* glsl */`
${FRAG_COMMON}
#include <common>
#include <logdepthbuf_pars_fragment>
varying float vE;
void main(){
  #include <logdepthbuf_fragment>
  clip();
  if(vE<0.3) discard;                     // the not-yet-emerged part (the waterline makes the tip round)
  gl_FragColor = vec4(fogit(shadeN(vCol, geomN())), 1.0);
}`;

// dikes (Anthropocene): thick red ribbons draped on today's relief, built piece by piece (aT = build time of the piece)
export const dikeVS = /* glsl */`
${COMMON}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uWidth, uLift, uDike;
attribute float aH; attribute float aSide; attribute vec2 aNrm; attribute float aT;
varying float vSide; varying float vE; varying float vNew; varying vec3 vWorld;
void main(){
  vE = smoothstep(aT, aT + 0.015, uDike);                       // this piece is built
  vNew = vE * (1.0 - smoothstep(aT + 0.015, aT + 0.08, uDike));  // ... just now: it flashes
  vec3 p = position; p.xz += aNrm*aSide*uWidth*(0.4 + 0.6*vE);
  p.y = yd(max(aH, 0.3)) + uLift*(0.3 + 0.7*vE); vSide = aSide;
  vec4 wp = modelMatrix*vec4(p,1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const dikeFS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uAlpha, uClipR; uniform vec3 uClipC;
varying float vSide; varying float vE; varying float vNew; varying vec3 vWorld;
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  if(vE<0.01) discard;
  float s = abs(vSide), core = 1.0 - smoothstep(0.55, 0.75, s);
  vec3 c = mix(vec3(0.38,0.08,0.05), vec3(1.0,0.36,0.24), core);              // dark rim, bright crest
  c = mix(c, vec3(1.0,0.93,0.75), vNew*0.8);
  gl_FragColor = vec4(c, uAlpha*vE*(1.0 - smoothstep(0.85, 1.0, s)));
}`;

// the Danube upstream of the delta grid (Galați – Isaccea) on the regional relief: GEBCO has no channel there
export const danVS = /* glsl */`
${COMMON}
${SPOT}
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uWidth, uLift, uReal;
attribute float aH; attribute float aHpre; attribute float aSide; attribute vec2 aNrm; attribute float aS; attribute float aLen;
varying float vSide; varying float vLen; varying vec3 vWorld; varying float vX; varying float vSpot; varying float vWet;
void main(){
  vec3 p = position; p.xz += aNrm*aSide*uWidth; vSpot = spotLit(position.xz);
  vWet = mix(aHpre, aH, uReal) - uRSL;
  p.y = yd(max(vWet, 0.0)) + uLift;
  vSide = aSide; vLen = aLen; vX = position.x;
  vec4 wp = modelMatrix*vec4(p,1.0); vWorld = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
export const danFS = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uAlpha, uTime, uClipR, uFogD, uXEnd, uPre; uniform vec3 uClipC, uFogC;
varying float vSide; varying float vLen; varying vec3 vWorld; varying float vX; varying float vSpot; varying float vWet;
${SPOT_SHADE}
void main(){
  #include <logdepthbuf_fragment>
  if(uClipR>0.0 && length(vWorld.xz-uClipC.xz)>uClipR) discard;
  float a = uAlpha * (1.0 - smoothstep(0.55, 1.0, abs(vSide))) * mix(1.0, uPre, smoothstep(uXEnd - 5.0, uXEnd, vX))   // below the apex: before the delta only
          * smoothstep(-0.3, 0.3, vWet);                                                                              // ends at the coast of the moment
  if(a<0.004) discard;
  vec3 c = mix(vec3(0.24,0.47,0.62), vec3(0.34,0.58,0.72), 0.5 + 0.5*sin(vLen*0.9 - uTime*1.5)) ;
  c = spotShade(c, vSpot);
  float dist = length(vWorld - cameraPosition), f = 1.0-exp(-pow(dist*uFogD,2.0));
  gl_FragColor = vec4(mix(c, uFogC, clamp(f,0.0,0.85)), a);
}`;
