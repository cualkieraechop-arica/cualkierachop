// component-loader.js
// Loads an HTML fragment from /components and injects it into the page.
async function loadComponent(path, selector) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
  } catch (e) {
    console.warn('No se pudo cargar componente', path, e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // load promotions into #promotions
  loadComponent('/components/promotions.html', '#promotions');
});
