/**
 * CualKiera(e) CHOP — catalogo.js
 * Filtros: TODAS / IZQUIERDA / DERECHA + Talla + Estado
 */

let todosLosProductos = [];
let filtros = { pie: 'todos', talla: '', estado: '' };

async function initCatalogo() {
  todosLosProductos = await cargarProductos();
  poblarTallas();
  renderProductos();
  const params = new URLSearchParams(window.location.search);
  const cod = params.get('producto');
  if (cod) {
    const p = todosLosProductos.find(p => p.codigo === cod);
    if (p) abrirModal(p);
  }
}

function poblarTallas() {
  const sel = document.getElementById('selTalla');
  if (!sel) return;
  const tallas = [...new Set(todosLosProductos.map(p => p.talla).filter(Boolean))]
    .sort((a, b) => parseFloat(a) - parseFloat(b));
  tallas.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
}

function setPie(val, btn) {
  filtros.pie = val;
  document.querySelectorAll('.btn-pie').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  renderProductos();
}

function setTalla() {
  filtros.talla = document.getElementById('selTalla').value;
  const sel = document.getElementById('selTalla');
  sel.style.color = filtros.talla ? '#7FD422' : '#aaa';
  renderProductos();
}

function setEstado() {
  filtros.estado = document.getElementById('selEstado').value;
  const sel = document.getElementById('selEstado');
  sel.style.color = filtros.estado ? '#7FD422' : '#aaa';
  renderProductos();
}

function limpiarFiltros() {
  filtros = { pie: 'todos', talla: '', estado: '' };
  document.querySelectorAll('.btn-pie').forEach((b, i) => b.classList.toggle('activo', i === 0));
  ['selTalla','selEstado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.color = '#aaa'; }
  });
  renderProductos();
}

function filtrarProductos() {
  return todosLosProductos.filter(p => {
    if (filtros.pie === 'izq' && !p.pie.includes('IZQ')) return false;
    if (filtros.pie === 'der' && !p.pie.includes('DER')) return false;
    if (filtros.talla && p.talla !== filtros.talla) return false;
    if (filtros.estado && !p.estado.toLowerCase().includes(filtros.estado.toLowerCase())) return false;
    return true;
  });
}

function renderProductos() {
  const grid = document.getElementById('productosGrid');
  const emptyState = document.getElementById('emptyState');
  const totalEl = document.getElementById('totalProductos');
  if (!grid) return;
  const filtrados = filtrarProductos();
  if (totalEl) totalEl.textContent = `${filtrados.length} producto${filtrados.length !== 1 ? 's' : ''}`;
  if (filtrados.length === 0) { grid.innerHTML = ''; emptyState?.classList.remove('hidden'); return; }
  emptyState?.classList.add('hidden');
  grid.innerHTML = '';
  filtrados.forEach(p => grid.appendChild(crearCard(p)));
}

function crearCard(p) {
  const div = document.createElement('div');
  div.className = 'producto-card';
  div.onclick = () => abrirModal(p);
  const esNueva = p.estado.toLowerCase().includes('nueva');
  div.innerHTML = `
    <div class="producto-img-wrap">
      ${p.imagen
        ? `<img src="${p.imagen}" alt="${p.modelo}" loading="lazy" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:3rem;">👟</div>`}
      <span class="producto-pie-badge">${labelPie(p.pie)}</span>
      <span class="producto-estado-badge ${esNueva ? 'badge-nueva' : 'badge-usado'}">${esNueva ? 'Nueva' : 'Usada'}</span>
    </div>
    <div class="producto-info">
      <div class="producto-marca">${p.marca}</div>
      <div class="producto-nombre">${p.modelo || '—'}</div>
      <div class="producto-meta">
        <span class="producto-talla">T${p.talla}</span>
        <span class="producto-precio">${formatPrecio(p.precio)}</span>
      </div>
    </div>`;
  return div;
}

function abrirModal(p) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;
  history.pushState({}, '', `?producto=${p.codigo}`);
  const todasFotos = [p.imagen, ...(p.imagenes_extra || [])].filter(Boolean);
  const thumbsHTML = todasFotos.length > 1
    ? `<div class="modal-thumbs">${todasFotos.map((img, i) =>
        `<img src="${img}" class="modal-thumb ${i===0?'active':''}" onclick="cambiarFoto(this,'${img}')" />`
      ).join('')}</div>`
    : '';
  const productoJSON = JSON.stringify(p).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  content.innerHTML = `
    <div class="modal-inner">
      <div class="modal-galeria">
        <div class="modal-img-principal">
          <img id="modalImgPrincipal" src="${todasFotos[0] || ''}" alt="${p.modelo}" />
        </div>
        ${thumbsHTML}
      </div>
      <div class="modal-info">
        <div class="modal-codigo">Código: ${p.codigo}</div>
        <div class="modal-marca">${p.marca}</div>
        <div class="modal-nombre">${p.modelo}</div>
        <div class="modal-specs">
          <div class="spec-item"><span class="spec-label">Talla</span><span class="spec-value">${p.talla}</span></div>
          <div class="spec-item"><span class="spec-label">Pie</span><span class="spec-value" style="font-size:0.95rem">${labelPie(p.pie)}</span></div>
          <div class="spec-item"><span class="spec-label">Largo</span><span class="spec-value">${p.cm ? p.cm+' cm' : '—'}</span></div>
          <div class="spec-item"><span class="spec-label">Estado</span><span class="spec-value" style="font-size:0.9rem">${p.estado}</span></div>
        </div>
        ${p.descripcion ? `<div class="modal-descripcion">${p.descripcion}</div>` : ''}
        <div class="modal-precio">${formatPrecio(p.precio)}</div>
        <div class="modal-btns">
          <button class="btn-primary btn-full" onclick='agregarACanasta(${JSON.stringify(p)});cerrarModal()'>
            🛒 Agregar a canasta
          </button>
          <button class="btn-primary btn-wa btn-full" onclick='abrirWhatsApp(${JSON.stringify(p)})'>
            💬 Pedir por WhatsApp
          </button>
        </div>
        <p class="modal-aviso">Unidad única · Sin reposición</p>
      </div>
    </div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cambiarFoto(thumb, src) {
  document.getElementById('modalImgPrincipal').src = src;
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
  history.pushState({}, '', window.location.pathname);
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) cerrarModal();
}

function irACheckout(codigo) {
  const producto = todosLosProductos.find(p => p.codigo === codigo);
  if (producto) {
    sessionStorage.setItem('checkoutProducto', JSON.stringify(producto));
    window.location.href = 'checkout.html';
  }
}

initCatalogo();
