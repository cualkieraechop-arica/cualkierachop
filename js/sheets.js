/**
 * CualKiera(e) CHOP — sheets.js
 * Lee productos E imágenes secundarias directo desde Google Sheets
 */

const SHEET_ID = '1Dr9HDcUmzw8MMbNOlPmG_obhD3Btx4UJHr1lq15-c5g';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxa3E_egHlzdGrq9c3l2q4rdGYRt8RlXdMVWz4wq9OEnMln5geRsukrXXKts2y6gw4ZCg/exec';

const CONFIG = {
  nombre: 'CualKiera(e) CHOP',
  whatsapp: '56994712263',
  email: 'cualkiera.e.chop@gmail.com',
  slogan: 'No todos caminamos igual.',
};

/**
 * Convierte cualquier URL de Drive al formato thumbnail correcto
 */
function convertirUrlDrive(url) {
  if (!url || !url.startsWith('http')) return null;
  if (url.includes('thumbnail?id=')) return url;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  return null;
}

/**
 * Carga imágenes secundarias desde hoja "imagenes" del Sheet
 */
async function cargarImagenesExtra() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=imagenes`;
    const resp = await fetch(url);
    const text = await resp.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) return {};
    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;

    const imagenes = {};
    rows.forEach(row => {
      if (!row.c) return;
      const codigo = row.c[0]?.v ? String(row.c[0].v).trim() : null;
      // columna D = índice 3 = IMAGEN_FINAL
      const urlRaw = row.c[3]?.v ? String(row.c[3].v).trim() : null;
      if (!codigo || !urlRaw) return;
      const urlOk = convertirUrlDrive(urlRaw);
      if (!urlOk) return;
      if (!imagenes[codigo]) imagenes[codigo] = [];
      if (!imagenes[codigo].includes(urlOk)) {
        imagenes[codigo].push(urlOk);
      }
    });
    return imagenes;
  } catch (err) {
    console.warn('No se pudieron cargar imágenes extra:', err);
    return {};
  }
}

/**
 * Carga todos los productos desde hoja "productos"
 */
async function cargarProductos() {
  try {
    // Cargar productos e imágenes en paralelo
    const [prodResp, imagenesExtra] = await Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=productos`),
      cargarImagenesExtra()
    ]);

    const text = await prodResp.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) throw new Error('Formato inesperado');
    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;
    const cols = json.table.cols;

    const colMap = {};
    cols.forEach((c, i) => { colMap[c.label.trim().toUpperCase()] = i; });

    return rows
      .filter(row => row.c && row.c[colMap['CODIGO']]?.v)
      .map(row => {
        const get = (key) => {
          const idx = colMap[key];
          if (idx === undefined) return '';
          const cell = row.c[idx];
          return cell?.v ?? cell?.f ?? '';
        };
        const codigo = String(get('CODIGO')).trim();

        // Talla: convertir número a string limpio (45.5 no 45,5)
        let talla = get('TALLA');
        if (typeof talla === 'number') {
          talla = talla % 1 === 0 ? String(talla) : talla.toFixed(1);
        } else {
          talla = String(talla).trim().replace(',', '.');
        }

        return {
          codigo,
          marca:          String(get('MARCA')).trim(),
          modelo:         String(get('MODELO')).trim(),
          talla,
          cm:             String(get('CM')).trim(),
          pie:            String(get('PIE')).trim().toUpperCase(),
          estado:         String(get('ESTADO')).trim(),
          precio:         parseInt(String(get('PRECIO')).replace(/\D/g,'')) || 0,
          imagen:         convertirUrlDrive(String(get('IMAGEN_DRIVE')).trim()) || String(get('IMAGEN_DRIVE')).trim(),
          descripcion:    String(get('TEXTO_SITES') || '').trim(),
          imagenes_extra: imagenesExtra[codigo] || [],
        };
      });
  } catch (err) {
    console.error('Error cargando productos:', err);
    return [];
  }
}

function formatPrecio(precio) {
  return '$' + precio.toLocaleString('es-CL');
}

function labelPie(pie) {
  if (!pie) return '—';
  const p = pie.toUpperCase();
  if (p.includes('IZQ')) return '👈 Izquierdo';
  if (p.includes('DER')) return '👉 Derecho';
  if (p.includes('PAR')) return '👟 Par';
  return pie;
}

function abrirWhatsApp(producto) {
  const msg = `Hola! Me interesa:\n\n*${producto.marca} ${producto.modelo}*\nTalla: ${producto.talla} | Pie: ${labelPie(producto.pie)}\nEstado: ${producto.estado}\nPrecio: ${formatPrecio(producto.precio)}\nCódigo: ${producto.codigo}\n\n¿Está disponible?`;
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function toggleMenu() {
  document.getElementById('navMobile')?.classList.toggle('open');
}

/**
 * Carga comentarios aprobados desde hoja "comentarios"
 */
async function cargarComentarios() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=comentarios`;
    const resp = await fetch(url);
    const text = await resp.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) return [];
    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;
    const cols = json.table.cols;
    const colMap = {};
    cols.forEach((c, i) => { colMap[c.label.trim().toUpperCase()] = i; });

    return rows
      .filter(row => {
        if (!row.c) return false;
        const aprobado = row.c[colMap['APROBADO']]?.v;
        return String(aprobado).toUpperCase() === 'SI';
      })
      .map(row => {
        const get = (key) => {
          const idx = colMap[key];
          if (idx === undefined) return '';
          return row.c[idx]?.v ?? '';
        };
        return {
          fecha:       String(get('FECHA')).trim(),
          nombre:      String(get('NOMBRE')).trim(),
          ciudad:      String(get('CIUDAD')).trim(),
          comentario:  String(get('COMENTARIO')).trim(),
          estrellas:   parseInt(get('ESTRELLAS')) || 5,
          foto:        String(get('FOTO')).trim(),
        };
      });
  } catch (err) {
    console.warn('Error cargando comentarios:', err);
    return [];
  }
}

/**
 * Envía comentario nuevo al Apps Script
 */
async function enviarComentario(datos) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'nuevo_comentario', ...datos }),
    });
    return true;
  } catch (err) {
    console.warn('Error enviando comentario:', err);
    return false;
  }
}

/**
 * Carga textos configurables desde hoja "config_textos"
 */
async function cargarConfigTextos() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=config_textos`;
    const resp = await fetch(url);
    const text = await resp.text();
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1];
    if (!jsonStr) return {};
    
    const json = JSON.parse(jsonStr);
    const rows = json.table.rows;
    const cols = json.table.cols;
    
    const colMap = {};
    cols.forEach((c, i) => { colMap[c.label.trim().toUpperCase()] = i; });

    const config = {};
    rows.forEach(row => {
      if (!row.c) return;
      const seccion = String(row.c[colMap['SECCION']]?.v ?? '').trim();
      const texto = String(row.c[colMap['TEXTO']]?.v ?? '').trim();
      if (seccion) config[seccion] = texto;
    });
    
    return config;
  } catch (err) {
    console.warn('Error cargando config_textos:', err);
    return {};
  }
}

/**
 * Aplica textos del Sheet a elementos HTML
 */
async function aplicarTextos() {
  const config = await cargarConfigTextos();
  
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle && config.HERO_TITULO) heroTitle.textContent = config.HERO_TITULO;
  
  const faqTitle = document.getElementById('faqTitle');
  if (faqTitle && config.FAQ_TITULO) faqTitle.textContent = config.FAQ_TITULO;
  
  const quienesIntro = document.getElementById('quienesIntro');
  if (quienesIntro && config.QUIENES_SOMOS_INTRO) quienesIntro.textContent = config.QUIENES_SOMOS_INTRO;
}

document.addEventListener('DOMContentLoaded', aplicarTextos);
