/**
 * CualKiera(e) CHOP — canasta.js
 * Canasta liviana con total y WhatsApp
 */

let canasta = JSON.parse(sessionStorage.getItem('canasta') || '[]');
const DESCUENTO_MAYO = 0.25; // 25% sobre $20.000
const DESCUENTO_MIN_MAYO = 20000;

function guardarCanasta() {
  sessionStorage.setItem('canasta', JSON.stringify(canasta));
  actualizarContador();
}

function actualizarContador() {
  const total = canasta.length;
  document.querySelectorAll('.canasta-contador').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
  // Botón flotante
  const flotante = document.getElementById('canastaFlotante');
  const badge = document.getElementById('canastaBadge');
  if (flotante) flotante.style.display = total > 0 ? 'flex' : 'none';
  if (badge) badge.textContent = total;
}

function agregarACanasta(producto) {
  // Evitar duplicados
  if (canasta.find(p => p.codigo === producto.codigo)) {
    mostrarToast('Ya está en tu canasta 👟');
    return;
  }
  canasta.push(producto);
  guardarCanasta();
  mostrarToast('¡Agregado a la canasta! 🛒');
}

function quitarDeCanasta(codigo) {
  canasta = canasta.filter(p => p.codigo !== codigo);
  guardarCanasta();
  renderCanasta();
}

function limpiarCanasta() {
  canasta = [];
  guardarCanasta();
  renderCanasta();
}

function totalCanasta() {
  return canasta.reduce((sum, p) => sum + (p.precio || 0), 0);
}

function totalConDescuento() {
  const subtotal = totalCanasta();
  const descuento = subtotal >= DESCUENTO_MIN_MAYO ? Math.round(subtotal * DESCUENTO_MAYO) : 0;
  return { subtotal, descuento, total: subtotal - descuento };
}

function abrirCanasta() {
  const panel = document.getElementById('canastaPanel');
  if (panel) {
    panel.classList.add('open');
    renderCanasta();
    document.body.style.overflow = 'hidden';
  }
}

function cerrarCanasta() {
  const panel = document.getElementById('canastaPanel');
  if (panel) {
    panel.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function renderCanasta() {
  const lista = document.getElementById('canastaLista');
  const totalEl = document.getElementById('canastaTotal');
  if (!lista) return;

  if (canasta.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:1rem;">🛒</div>
        <p>Tu canasta está vacía</p>
        <button onclick="cerrarCanasta()" class="btn-primary" style="margin-top:1.5rem;">Ver catálogo</button>
      </div>`;
    if (totalEl) totalEl.innerHTML = '$0';
    const descRow = document.getElementById('canastaDescuentoRow');
    if (descRow) descRow.style.display = 'none';
    const msgDesc = document.getElementById('mensajeDescuento');
    if (msgDesc) msgDesc.style.display = 'none';
    return;
  }

  // Mensaje descuento
  const subtotalActual = totalCanasta();
  const msgDesc = document.getElementById('mensajeDescuento');
  if (msgDesc) {
    if (subtotalActual >= DESCUENTO_MIN_MAYO) {
      msgDesc.innerHTML = `<span style="color:var(--accent)">🔥 ¡Tienes 25% de descuento aplicado!</span>`;
      msgDesc.style.display = 'block';
    } else {
      const faltan = DESCUENTO_MIN_MAYO - subtotalActual;
      msgDesc.innerHTML = `<span style="color:var(--text-muted)">Agrega <strong style="color:var(--accent)">${formatPrecio(faltan)}</strong> más para obtener <strong style="color:var(--accent)">25% OFF</strong> 🔥</span>`;
      msgDesc.style.display = 'block';
    }
  }

  lista.innerHTML = canasta.map(p => `
    <div style="display:flex;gap:1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--border);">
      ${p.imagen
        ? `<img src="${p.imagen}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;" />`
        : `<div style="width:60px;height:60px;background:var(--surface2);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">👟</div>`}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent2);">${p.marca}</div>
        <div style="font-size:0.88rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.modelo}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">T${p.talla} · ${labelPie(p.pie)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent);">${formatPrecio(p.precio)}</div>
        <button onclick="quitarDeCanasta('${p.codigo}')" style="background:none;border:none;color:var(--text-dim);font-size:0.72rem;cursor:pointer;margin-top:0.3rem;text-decoration:underline;">Quitar</button>
      </div>
    </div>
  `).join('');

  const { subtotal, descuento, total } = totalConDescuento();
  if (totalEl) {
    if (descuento > 0) {
      totalEl.innerHTML = `<span style="text-decoration:line-through;color:var(--text-dim);font-size:0.8em;margin-right:0.3rem;">${formatPrecio(subtotal)}</span>${formatPrecio(total)}`;
    } else {
      totalEl.textContent = formatPrecio(total);
    }
  }
  // Mostrar fila descuento solo si hay descuento real
  const descRow = document.getElementById('canastaDescuentoRow');
  if (descRow) {
    descRow.style.display = descuento > 0 ? 'flex' : 'none';
    const dv = descRow.querySelector('.descuento-valor');
    if (dv) dv.textContent = '- ' + formatPrecio(descuento);
  }
}

function consultarPorWhatsApp() {
  if (canasta.length === 0) return;
  let msg = `Hola! Me interesan estos productos de CualKiera(e) CHOP:\n\n`;
  canasta.forEach((p, i) => {
    msg += `*${i+1}. ${p.marca} ${p.modelo}*\n`;
    msg += `   Talla: ${p.talla} | Pie: ${labelPie(p.pie)} | Estado: ${p.estado}\n`;
    msg += `   Precio: ${formatPrecio(p.precio)}\n\n`;
  });
  const { subtotal, descuento, total } = totalConDescuento();
  msg += `Subtotal: ${formatPrecio(subtotal)}\n`;
  msg += `*Descuento Mayo 10%: - ${formatPrecio(descuento)}*\n`;
  msg += `*TOTAL: ${formatPrecio(total)}*\n\n¿Están disponibles?`;
  window.open(`https://wa.me/56994712263?text=${encodeURIComponent(msg)}`, '_blank');
}

function mostrarToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
    background:var(--accent);color:var(--bg);padding:0.7rem 1.5rem;
    border-radius:100px;font-size:0.85rem;font-weight:600;
    z-index:9999;animation:fadeInUp 0.3s ease;white-space:nowrap;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Init
document.addEventListener('DOMContentLoaded', actualizarContador);

function irACheckout() {
  if (canasta.length === 0) return;
  sessionStorage.setItem('canasta', JSON.stringify(canasta));
  window.location.href = 'checkout.html';
}
