/**
 * CUALKI — checkout.js
 * Formulario de pedido + envío a Google Apps Script
 */

let productoCheckout = null;

function initCheckout() {
  const productoStr = sessionStorage.getItem('checkoutProducto');
  const resumenEl = document.getElementById('checkoutResumen');

  if (productoStr) {
    productoCheckout = JSON.parse(productoStr);
    mostrarResumen(productoCheckout);
  } else {
    // No hay producto, mostrar mensaje
    if (resumenEl) {
      resumenEl.innerHTML = `
        <div style="padding:2rem">
          <p style="color:var(--text-muted);margin-bottom:1.5rem">No hay producto seleccionado.</p>
          <a href="catalogo.html" class="btn-primary">Ver catálogo</a>
        </div>
      `;
    }
  }
}

function mostrarResumen(p) {
  const resumenEl = document.getElementById('checkoutResumen');
  if (!resumenEl) return;

  resumenEl.innerHTML = `
    <div class="checkout-resumen-title">Tu selección</div>
    <div class="checkout-producto-preview">
      ${p.imagen
        ? `<img src="${p.imagen}" alt="${p.modelo}" />`
        : `<div style="width:80px;height:80px;background:var(--surface2);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:2rem;">👟</div>`}
      <div class="preview-info">
        <div class="preview-marca">${p.marca}</div>
        <div class="preview-nombre">${p.modelo}</div>
        <div class="preview-precio">${formatPrecio(p.precio)}</div>
        <div class="preview-meta">T${p.talla} · ${labelPie(p.pie)} · ${p.estado}</div>
        <div class="preview-meta" style="margin-top:0.2rem;font-size:0.72rem;color:var(--text-dim)">${p.codigo}</div>
      </div>
    </div>

    <div style="margin-top:2rem;padding:1.2rem;background:var(--surface2);border-radius:var(--radius-lg);border:1px solid var(--border)">
      <div style="font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.8rem">Resumen</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem">
        <span style="color:var(--text-muted);font-size:0.88rem">Producto</span>
        <span style="font-family:var(--font-display);font-size:1.3rem;color:var(--accent)">${formatPrecio(p.precio)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-dim)">Envío a coordinar</div>
    </div>

    <div style="margin-top:1.5rem;font-size:0.78rem;color:var(--text-dim);line-height:1.6">
      <strong style="color:var(--text-muted)">Medios de pago:</strong><br/>
      Transferencia bancaria · Mercado Pago<br/>(se confirman al contactarte)
    </div>
  `;
}

async function enviarPedido() {
  const nombre = document.getElementById('nombre')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const telefono = document.getElementById('telefono')?.value.trim();
  const ciudad = document.getElementById('ciudad')?.value.trim();
  const envio = document.getElementById('envio')?.value;
  const notas = document.getElementById('notas')?.value.trim();

  // Validación básica
  if (!nombre || !email || !telefono || !ciudad) {
    mostrarError('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (!emailValido(email)) {
    mostrarError('Ingresa un email válido.');
    return;
  }

  const btn = document.getElementById('btnEnviar');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const codigo = generarCodigo();
  const ahora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

  const datos = {
    accion: 'nuevo_pedido',
    codigo_pedido: codigo,
    fecha: ahora,
    // Cliente
    nombre,
    email,
    telefono,
    ciudad,
    envio,
    notas: notas || '—',
    // Producto
    codigo_producto: productoCheckout?.codigo || '—',
    marca: productoCheckout?.marca || '—',
    modelo: productoCheckout?.modelo || '—',
    talla: productoCheckout?.talla || '—',
    pie: productoCheckout?.pie || '—',
    estado: productoCheckout?.estado || '—',
    precio: productoCheckout?.precio || 0,
  };

  try {
    // Intentar enviar al Apps Script
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // necesario para Apps Script
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    // Con no-cors no podemos leer la respuesta, asumimos éxito
    mostrarExito(email, codigo);
    sessionStorage.removeItem('checkoutProducto');

  } catch (err) {
    // Si falla el Apps Script, fallback: abrir WhatsApp
    console.warn('Apps Script no disponible, fallback WhatsApp:', err);
    const msg = formatMensajeWhatsApp(datos);
    const waUrl = `https://wa.me/56999999999?text=${encodeURIComponent(msg)}`; // reemplazar número
    window.open(waUrl, '_blank');
    mostrarExito(email, codigo);
  }

  btn.textContent = 'Enviar pedido →';
  btn.disabled = false;
}

function formatMensajeWhatsApp(d) {
  return `*Pedido CUALKI* 🛒
Código: ${d.codigo_pedido}

*Producto:* ${d.marca} ${d.modelo}
*Talla:* ${d.talla} | *Pie:* ${d.pie}
*Estado:* ${d.estado}
*Precio:* $${Number(d.precio).toLocaleString('es-CL')}

*Nombre:* ${d.nombre}
*Email:* ${d.email}
*Teléfono:* ${d.telefono}
*Ciudad:* ${d.ciudad}
*Envío:* ${d.envio}
${d.notas !== '—' ? `*Notas:* ${d.notas}` : ''}`;
}

function mostrarExito(email, codigo) {
  document.getElementById('formContainer')?.classList.add('hidden');
  const successEl = document.getElementById('successState');
  successEl?.classList.remove('hidden');
  document.getElementById('successEmail').textContent = email;
  document.getElementById('successCodigo').textContent = codigo;
}

function mostrarError(msg) {
  // Eliminar error anterior
  document.querySelector('.form-error')?.remove();
  const div = document.createElement('div');
  div.className = 'form-error';
  div.style.cssText = 'background:rgba(255,71,71,0.1);border:1px solid rgba(255,71,71,0.3);padding:0.8rem 1rem;border-radius:4px;font-size:0.85rem;color:#ff7070;margin-bottom:1rem';
  div.textContent = msg;
  document.getElementById('btnEnviar')?.before(div);
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generarCodigo() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PED-${ts}-${rand}`;
}

// Init
initCheckout();
