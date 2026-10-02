// Guided tour: a spotlight on one part of the screen at a time, with a short
// explanation card. Keyboard: → / Enter next, ← back, Esc closes.

export function startTour(steps, { onDone = () => {} } = {}) {
  const live = steps.filter((s) => !s.target || document.querySelector(s.target));
  if (!live.length) return;
  let i = 0;

  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = `<div class="tour-spot"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div class="tour-top"><span class="tour-count"></span><button class="tour-x" type="button" aria-label="Close tour">✕</button></div>
      <h3 id="tourTitle"></h3><p class="tour-text"></p>
      <div class="tour-actions"><div class="tour-dots"></div><span class="tour-btns"><button type="button" class="tour-back">Back</button><button type="button" class="tour-next">Next</button></span></div>
    </div>`;
  document.body.appendChild(root);
  const spot = root.querySelector('.tour-spot');
  const card = root.querySelector('.tour-card');

  function place() {
    const s = live[i];
    const el = s.target && document.querySelector(s.target);
    root.querySelector('#tourTitle').textContent = s.title;
    root.querySelector('.tour-text').innerHTML = s.text;
    root.querySelector('.tour-count').textContent = `${i + 1} of ${live.length}`;
    root.querySelector('.tour-dots').innerHTML = live.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    root.querySelector('.tour-back').hidden = i === 0;
    root.querySelector('.tour-next').textContent = i === live.length - 1 ? 'Start building' : 'Next';
    s.before?.();

    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!el) {
      spot.style.cssText = `left:50%;top:50%;width:0;height:0`;
      card.style.cssText = `left:${Math.max(16, vw / 2 - 180)}px;top:${Math.max(16, vh / 2 - 120)}px`;
      return;
    }
    const r = el.getBoundingClientRect();
    const box = {
      left: Math.max(4, r.left - pad),
      top: Math.max(4, r.top - pad),
      width: Math.min(vw - 8, r.width + pad * 2),
      height: Math.min(vh - 8, r.height + pad * 2),
    };
    spot.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;

    // Card: beside the target if there is room, else below, else above, else inside.
    const cw = Math.min(360, vw - 32);
    card.style.width = cw + 'px';
    const ch = card.offsetHeight || 200;
    let left;
    let top;
    if (box.left + box.width + cw + 24 < vw) (left = box.left + box.width + 16), (top = box.top);
    else if (box.left - cw - 24 > 0) (left = box.left - cw - 16), (top = box.top);
    else if (box.top + box.height + ch + 24 < vh) (left = box.left), (top = box.top + box.height + 16);
    else if (box.top - ch - 24 > 0) (left = box.left), (top = box.top - ch - 16);
    else (left = box.left + 16), (top = box.top + 16);
    card.style.left = Math.max(16, Math.min(left, vw - cw - 16)) + 'px';
    card.style.top = Math.max(16, Math.min(top, vh - ch - 16)) + 'px';
  }

  function go(n) {
    if (n >= live.length) return close(true);
    i = Math.max(0, n);
    place();
    root.querySelector('.tour-next').focus();
  }
  function close(finished) {
    window.removeEventListener('resize', place);
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    onDone(Boolean(finished));
  }
  function onKey(e) {
    if (e.key === 'Escape') e.preventDefault(), close(false);
    if (e.key === 'ArrowRight' || e.key === 'Enter') e.preventDefault(), go(i + 1);
    if (e.key === 'ArrowLeft') e.preventDefault(), go(i - 1);
  }
  root.querySelector('.tour-next').addEventListener('click', () => go(i + 1));
  root.querySelector('.tour-back').addEventListener('click', () => go(i - 1));
  root.querySelector('.tour-x').addEventListener('click', () => close(false));
  window.addEventListener('resize', place);
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => go(0));
}
