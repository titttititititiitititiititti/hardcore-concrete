// Shared site script: Facebook links, gallery + lightbox, quote form.
// Per-site settings live in window.SITE (set in index.html):
//   fb            Facebook page URL
//   fallbackPhone shown if the form can't send
//   email         where quote requests go when no form service is set
//   formEndpoint  optional URL of the form-sending service (Resend). Empty = opens the visitor's email app instead.
const SITE = window.SITE || {};

// Facebook links
document.querySelectorAll('[data-fb]').forEach(a => { if (SITE.fb) { a.href = SITE.fb; a.target = '_blank'; a.rel = 'noopener'; } });

// Reels link + review link + video player (Facebook embed)
document.querySelectorAll('[data-fb-reels]').forEach(a => { a.href = SITE.reels || SITE.fb; a.target = '_blank'; a.rel = 'noopener'; });
document.querySelectorAll('[data-fb-reviews]').forEach(a => { a.href = (SITE.fb || '') + '&sk=reviews'; a.target = '_blank'; a.rel = 'noopener'; });
(() => {
  const box = document.getElementById('reelbox');
  if (!box) return;
  const frame = box.querySelector('.reel-frame');
  document.querySelectorAll('[data-reel]').forEach(b => b.addEventListener('click', () => {
    const href = encodeURIComponent('https://www.facebook.com/reel/' + b.dataset.reel);
    frame.innerHTML = `<iframe src="https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=true" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Hardcore Concrete video"></iframe>`;
    box.showModal();
  }));
  const close = () => { box.close(); };
  box.querySelector('.close').onclick = close;
  box.addEventListener('click', e => { if (e.target === box) close(); });
  box.addEventListener('close', () => { frame.innerHTML = ''; });
})();

// Gallery: list comes from /gallery/index.json (static hosting) or /api/gallery (server)
(async () => {
  const box = document.getElementById('gallery');
  if (!box) return;
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  let photos = [];
  for (const url of ['/gallery/index.json', '/api/gallery']) {
    try {
      const r = await fetch(url);
      if (r.ok) { const list = await r.json(); photos = list.map(p => p.startsWith('/') ? p : '/gallery/' + p); break; }
    } catch (e) {}
  }
  if (!photos.length) {
    box.innerHTML = '<p class="gallery-empty">Job photos are on their way. See our latest work on Facebook in the meantime.</p>';
    return;
  }
  const SHOW = SITE.galleryShow || 9;
  photos.forEach((src, i) => {
    const b = document.createElement('button');
    if (i >= SHOW) b.hidden = true;
    b.type = 'button';
    b.setAttribute('aria-label', `Open job photo ${i + 1}`);
    b.innerHTML = `<img src="${src}" alt="Job photo ${i + 1}" loading="lazy">`;
    b.onclick = () => { lbImg.src = src; lb.showModal(); };
    box.appendChild(b);
  });
  if (photos.length > SHOW) {
    const more = document.createElement('button');
    more.type = 'button'; more.className = 'gallery-more btn';
    more.textContent = `Show all ${photos.length} photos`;
    more.onclick = () => { box.querySelectorAll('button[hidden]').forEach(x => x.hidden = false); more.remove(); };
    box.after(more);
  }
  lb.querySelector('.close').onclick = () => lb.close();
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
})();

// Quote form
const form = document.getElementById('quote-form');
if (form) {
  const status = document.getElementById('status');
  const btn = form.querySelector('button[type=submit]');
  const label = btn.textContent;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return;
    if (!data.name.trim() || (!data.phone.trim() && !data.email.trim())) {
      status.className = 'status err';
      status.textContent = 'Add your name and a phone number or email so we can get back to you.';
      return;
    }

    // No form service yet: open the visitor's email app with the details filled in
    if (!SITE.formEndpoint) {
      const lines = [['Name', data.name], ['Phone', data.phone], ['Email', data.email], ['Suburb', data.suburb], ['Job', data.service], ['Details', data.message]]
        .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Quote request: ' + data.name)}&body=${encodeURIComponent(lines)}`;
      status.className = 'status ok';
      status.textContent = `Your email app should open with the details filled in. Just hit send. Or call ${SITE.fallbackPhone}.`;
      return;
    }

    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, site: SITE.id }) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error);
      form.reset();
      status.className = 'status ok';
      status.textContent = "Quote request sent. We'll be in touch soon.";
    } catch (err) {
      status.className = 'status err';
      status.textContent = `That didn't send. Please call ${SITE.fallbackPhone || 'us'}.`;
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
}
