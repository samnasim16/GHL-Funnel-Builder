// Photo upload + cropper. Drag to position, zoom, rotate, pick a shape, and
// adjust brightness / contrast / saturation. Output is compressed (max 1600px)
// so pictures stay small enough to save in the browser and paste into GHL.

const SHAPES = [
  { id: 'original', label: 'Original' },
  { id: '16:9', label: 'Wide 16:9', r: 16 / 9 },
  { id: '4:3', label: '4:3', r: 4 / 3 },
  { id: '1:1', label: 'Square', r: 1 },
  { id: '3:4', label: 'Portrait', r: 3 / 4 },
  { id: 'circle', label: 'Circle', r: 1, round: true },
];
const MAX_OUT = 1600;

/** Reads a File into a data URL. */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not a picture we can open (try JPG, PNG or WebP).'));
    img.src = src;
  });
}

/** Shrinks and re-encodes a picture without cropping (gallery uploads). */
export async function compressImage(src, keepPng = false) {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_OUT / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return encode(c, keepPng);
}

function encode(canvas, keepPng) {
  if (keepPng) return canvas.toDataURL('image/png');
  const webp = canvas.toDataURL('image/webp', 0.84);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

/** Small RGBA sample of a picture, for pulling brand colors out of a logo. */
export async function samplePixels(src, size = 64) {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size).data;
}

/**
 * Opens the cropper. Resolves with a data URL, or null if cancelled.
 * @param {string} src  data URL or same-origin image URL
 * @param {{shape?: string}} opts  starting shape id
 */
export async function openCropper(src, { shape = 'original' } = {}) {
  const img = await loadImage(src);
  const isPng = /^data:image\/png/.test(src);
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'wide cropper';
    dlg.innerHTML = `<div class="dlg-head"><div><div class="kicker">Picture</div><h2>Crop and adjust</h2></div><button class="x" data-c="cancel" aria-label="Close">✕</button></div>
      <p class="muted small">Drag the picture to position it. Use the slider to zoom.</p>
      <div class="crop-body">
        <div class="crop-stage-wrap"><div class="crop-stage"><canvas></canvas></div></div>
        <div class="crop-side">
          <div class="label">Shape</div><div class="crop-shapes">${SHAPES.map((s) => `<button type="button" data-shape="${s.id}">${s.label}</button>`).join('')}</div>
          <label class="crop-range"><span>Zoom</span><input type="range" data-k="zoom" min="1" max="4" step="0.01" value="1"></label>
          <label class="crop-range"><span>Brightness</span><input type="range" data-k="brightness" min="50" max="150" value="100"></label>
          <label class="crop-range"><span>Contrast</span><input type="range" data-k="contrast" min="50" max="150" value="100"></label>
          <label class="crop-range"><span>Color</span><input type="range" data-k="saturate" min="0" max="200" value="100"></label>
          <div class="crop-row"><button type="button" class="btn sec sm" data-c="rotate">↻ Rotate</button><button type="button" class="btn sec sm" data-c="reset">Reset</button></div>
        </div>
      </div>
      <div class="brief-actions"><button type="button" class="btn" data-c="done">Use this picture</button><button type="button" class="btn sec" data-c="cancel">Cancel</button></div>`;
    document.body.appendChild(dlg);
    const canvas = dlg.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const st = { shape, zoom: 1, x: 0, y: 0, rot: 0, brightness: 100, contrast: 100, saturate: 100 };

    // Image size after rotation.
    const dims = () => (st.rot % 180 ? [img.naturalHeight, img.naturalWidth] : [img.naturalWidth, img.naturalHeight]);
    const ratio = () => {
      const s = SHAPES.find((x) => x.id === st.shape);
      if (s?.r) return s.r;
      const [w, h] = dims();
      return w / h;
    };
    // Stage (the crop frame) fits the available box at the chosen ratio.
    function frame() {
      const maxW = Math.min(560, window.innerWidth - 80);
      const maxH = Math.min(420, window.innerHeight - 320);
      const r = ratio();
      let w = maxW;
      let h = w / r;
      if (h > maxH) (h = maxH), (w = h * r);
      return [Math.round(w), Math.round(h)];
    }
    // Scale at zoom 1 = picture just covers the frame.
    const cover = (fw, fh) => {
      const [w, h] = dims();
      return Math.max(fw / w, fh / h);
    };
    function clampPan(fw, fh) {
      const [w, h] = dims();
      const sc = cover(fw, fh) * st.zoom;
      const mx = Math.max(0, (w * sc - fw) / 2);
      const my = Math.max(0, (h * sc - fh) / 2);
      st.x = Math.max(-mx, Math.min(mx, st.x));
      st.y = Math.max(-my, Math.min(my, st.y));
    }
    function draw(target, fw, fh, outScale = 1) {
      const c = target.getContext('2d');
      const sc = cover(fw, fh) * st.zoom * outScale;
      c.save();
      c.clearRect(0, 0, target.width, target.height);
      c.filter = `brightness(${st.brightness}%) contrast(${st.contrast}%) saturate(${st.saturate}%)`;
      c.translate(target.width / 2 + st.x * outScale, target.height / 2 + st.y * outScale);
      c.rotate((st.rot * Math.PI) / 180);
      c.drawImage(img, (-img.naturalWidth * sc) / 2, (-img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc);
      c.restore();
    }
    function render() {
      const [fw, fh] = frame();
      canvas.width = fw;
      canvas.height = fh;
      clampPan(fw, fh);
      draw(canvas, fw, fh);
      dlg.querySelector('.crop-stage').classList.toggle('round', Boolean(SHAPES.find((s) => s.id === st.shape)?.round));
      dlg.querySelectorAll('[data-shape]').forEach((b) => b.classList.toggle('on', b.dataset.shape === st.shape));
      void ctx;
    }
    function finish(ok) {
      if (!ok) return close(null);
      const [fw, fh] = frame();
      const [w, h] = dims();
      // Output at the picture's real resolution (capped), not screen size.
      const real = Math.min(MAX_OUT / Math.max(fw, fh), (cover(fw, fh) * st.zoom) ** -1);
      const outScale = Math.max(1, real);
      const out = document.createElement('canvas');
      out.width = Math.round(fw * outScale);
      out.height = Math.round(fh * outScale);
      draw(out, fw, fh, outScale);
      void w;
      void h;
      close(encode(out, isPng && st.shape === 'original'));
    }
    function close(v) {
      dlg.close();
      dlg.remove();
      resolve(v);
    }

    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX - st.x, y: e.clientY - st.y };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      st.x = e.clientX - drag.x;
      st.y = e.clientY - drag.y;
      render();
    });
    canvas.addEventListener('pointerup', () => (drag = null));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      st.zoom = Math.max(1, Math.min(4, st.zoom - e.deltaY * 0.002));
      dlg.querySelector('[data-k="zoom"]').value = st.zoom;
      render();
    }, { passive: false });
    dlg.addEventListener('input', (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      st[k] = Number(e.target.value);
      render();
    });
    dlg.addEventListener('click', (e) => {
      const sh = e.target.closest('[data-shape]')?.dataset.shape;
      if (sh) (st.shape = sh), (st.x = st.y = 0), render();
      const c = e.target.closest('[data-c]')?.dataset.c;
      if (c === 'rotate') (st.rot = (st.rot + 90) % 360), (st.x = st.y = 0), render();
      if (c === 'reset') {
        Object.assign(st, { zoom: 1, x: 0, y: 0, rot: 0, brightness: 100, contrast: 100, saturate: 100 });
        dlg.querySelectorAll('input[type=range]').forEach((r) => (r.value = st[r.dataset.k]));
        render();
      }
      if (c === 'done') finish(true);
      if (c === 'cancel') finish(false);
    });
    dlg.addEventListener('cancel', (e) => (e.preventDefault(), finish(false)));
    dlg.showModal();
    render();
  });
}
