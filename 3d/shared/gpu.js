// DELTA-Hub 3D Experience — which GPU draws the page (probed once per page, cached).
// weak: integrated / mobile GPUs (and no GPU at all) → the pages draw 1:1 pixels and lighter effects.
// soft: no GPU, the browser draws WebGL on the CPU (graphics acceleration off or a missing driver).
// none: no WebGL at all. ?q=hi | ?q=lo forces weak off / on.
let info = null;
export function gpuInfo(gl) {
  if (info) return info;
  let name = '', probe = false;
  try {
    if (!gl) { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); probe = true; }
    if (gl) {
      const e = gl.getExtension('WEBGL_debug_renderer_info');
      name = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (probe) { const lc = gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); }   // the probe's context is not kept
    }
  } catch (e) { }
  const none = !gl;
  const soft = /SwiftShader|llvmpipe|softpipe|Basic Render|Software Rasterizer|Software Adapter/i.test(name);
  const integrated = /Intel|Radeon\(TM\)|Radeon Graphics|Vega \d|Mali|Adreno|PowerVR|Apple GPU/i.test(name) &&
    !/RTX|GTX|Quadro|Radeon RX|Radeon Pro|Arc\(TM\) A/i.test(name);
  const q = new URLSearchParams(location.search).get('q');
  info = { name, none, soft, weak: q === 'lo' || (q !== 'hi' && (none || soft || integrated)) };
  return info;
}
