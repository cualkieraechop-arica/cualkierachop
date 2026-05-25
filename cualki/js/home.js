/**
 * CUALKI — home.js
 * Lógica de la página principal: productos destacados
 */

async function initHome() {
  const grid = document.getElementById('productosDestacados');
  if (!grid) return;

  const productos = await cargarProductos();

  // Mostrar primeros 4 productos como destacados
  const destacados = productos.slice(0, 4);

  grid.innerHTML = '';

  if (destacados.length === 0) {
    grid.innerHTML = '<p style="padding:2rem;color:var(--text-muted)">No hay productos disponibles en este momento.</p>';
    return;
  }

  destacados.forEach(p => {
    const card = crearCardProducto(p);
    grid.appendChild(card);
  });
}

function crearCardProducto(p) {
  const div = document.createElement('div');
  div.className = 'producto-card';
  div.onclick = () => abrirProducto(p);

  const estadoBadge = p.estado.toLowerCase().includes('nueva')
    ? `<span class="producto-estado-badge badge-nueva">Nueva</span>`
    : `<span class="producto-estado-badge badge-usado">Usada</span>`;

  div.innerHTML = `
    <div class="producto-img-wrap">
      ${p.imagen
        ? `<img src="${p.imagen}" alt="${p.modelo}" loading="lazy" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:2rem;">👟</div>`}
      <span class="producto-pie-badge">${labelPie(p.pie)}</span>
      ${estadoBadge}
    </div>
    <div class="producto-info">
      <div class="producto-marca">${p.marca}</div>
      <div class="producto-nombre">${p.modelo}</div>
      <div class="producto-meta">
        <span class="producto-talla">T${p.talla}</span>
        <span class="producto-precio">${formatPrecio(p.precio)}</span>
      </div>
    </div>
  `;

  return div;
}

function abrirProducto(p) {
  // Guardar en sessionStorage y redirigir al catálogo con modal abierto
  sessionStorage.setItem('productoActivo', JSON.stringify(p));
  window.location.href = `pages/catalogo.html?producto=${p.codigo}`;
}

// Init
initHome();
