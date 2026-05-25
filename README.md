# CUALKI — Zapatillas Impares
**Tienda online minimalista para stock no convencional**

---

## Arquitectura del proyecto

```
cualki/
├── index.html              ← Homepage (branding + destacados)
├── pages/
│   ├── catalogo.html       ← Catálogo completo con filtros
│   └── checkout.html       ← Formulario de pedido
├── css/
│   └── style.css           ← Estilos (dark, editorial, mobile-first)
├── js/
│   ├── sheets.js           ← Conexión con Google Sheets (datos)
│   ├── home.js             ← Lógica homepage
│   ├── catalogo.js         ← Filtros + grid + modal
│   └── checkout.js         ← Formulario + envío a Apps Script
└── Code.gs                 ← Google Apps Script (backend serverless)
```

**Stack:**
- Frontend: HTML + CSS + JS vanilla (0 dependencias, carga instantánea)
- Backend: Google Apps Script (serverless, gratis)
- DB: Google Sheets (el mismo que ya tienes)
- Hosting: GitHub Pages / Netlify / Vercel (gratis)

---

## Modelo de Google Sheets

### Hoja: `productos` (ya tienes esta estructura)
| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| CODIGO | ID único del producto | `IREA43NU0001` |
| MARCA | Marca | `Reigo` |
| MODELO | Nombre del modelo | `Air Plus FUXIA` |
| TALLA | Número de talla | `43` |
| CM | Largo en centímetros | `26.5` |
| PIE | IZQUIERDA / DERECHA / PAR | `IZQUIERDA` |
| ESTADO | Nueva / USADO | `Nueva` |
| PRECIO | Precio en pesos (número) | `12990` |
| IMAGEN_DRIVE | URL thumbnail de Drive | `https://drive.google.com/thumbnail?id=...&sz=w1000` |
| TEXTO_SITES | Descripción del producto | Texto libre |

### Hoja: `pedidos` (se crea automáticamente al primer pedido)
| Columna | Descripción |
|---------|-------------|
| CODIGO_PEDIDO | ID único generado automáticamente |
| FECHA | Timestamp del pedido |
| ESTADO | PENDIENTE / CONFIRMADO / ENVIADO / CANCELADO |
| NOMBRE | Nombre del cliente |
| EMAIL | Email del cliente |
| TELEFONO | Teléfono/WhatsApp |
| CIUDAD | Ciudad de entrega |
| ENVIO | Tipo de envío |
| NOTAS | Notas del cliente |
| CODIGO_PRODUCTO | Código del producto pedido |
| MARCA / MODELO / TALLA / PIE | Datos del producto |
| PRECIO | Precio al momento del pedido |

---

## Setup completo en 15 minutos

### 1. Publicar Google Sheets
1. Abre tu Sheet
2. Archivo → Compartir → Publicar en la web
3. Seleccionar hoja `productos`, formato `Valores separados por comas (.csv)`
4. Publicar y confirmar

El código ya usa el ID de tu Sheet (`1y2xtevDnGPJ366d972jf1nLyVGONWG3BEQbHjv0k-OI`).

### 2. Configurar Google Apps Script
1. En tu Sheet: Extensiones → Apps Script
2. Borrar el contenido existente
3. Pegar el contenido de `Code.gs`
4. Cambiar `EMAIL_ADMIN` por tu email
5. Implementar → Nueva implementación → Aplicación web
   - Ejecutar como: **Tu cuenta**
   - Acceso: **Cualquier persona**
6. Autorizar permisos
7. Copiar la URL de implementación

### 3. Conectar el frontend con Apps Script
En `js/checkout.js`, línea 13:
```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_URL_AQUI/exec';
```
Reemplazar con tu URL.

### 4. Subir a GitHub Pages
```bash
# Crear repositorio en GitHub
git init
git add .
git commit -m "CUALKI MVP"
git remote add origin https://github.com/TU_USUARIO/cualki.git
git push -u origin main

# En GitHub: Settings → Pages → Source: main branch
```
Tu tienda quedará en: `https://TU_USUARIO.github.io/cualki`

### Alternativa: Netlify (drag & drop)
1. Ir a netlify.com
2. "Add new site" → "Deploy manually"
3. Arrastrar la carpeta `cualki/`
4. Listo — URL automática en segundos

---

## Flujo de una venta

```
Cliente ve catálogo
  → Filtra por talla/pie/precio
  → Abre ficha de producto
  → Hace clic en "Quiero este 👟"
  → Llena formulario de contacto
  → Apps Script guarda en hoja "pedidos"
  → Cliente recibe email de confirmación
  → Tú recibes email de notificación
  → Coordinas pago y envío manualmente
```

---

## Administración (100% desde Sheets)

**Agregar producto:** Agregar fila en hoja `productos`
**Sacar producto vendido:** Eliminar o mover la fila
**Ver pedidos:** Revisar hoja `pedidos`
**Cambiar estado de pedido:** Editar columna ESTADO en la hoja pedidos
**Cambiar precio:** Editar columna PRECIO en la fila del producto

No necesitas tocar ningún código.

---

## Tips de imágenes con Google Drive

Para que las imágenes carguen rápido y sean públicas:
1. Sube la foto a Drive
2. Clic derecho → "Compartir" → "Cualquier persona con el enlace puede ver"
3. En la columna `IMAGEN_DRIVE` usa este formato:
   ```
   https://drive.google.com/thumbnail?id=ID_DEL_ARCHIVO&sz=w1000
   ```
   El ID lo sacas de la URL de compartir: `drive.google.com/file/d/**ID**/view`

---

## Mejoras futuras (post-MVP)

Una vez valides el negocio, puedes agregar:

- **WhatsApp directo** en la ficha de producto (1 hora de trabajo)
- **Galería múltiple** de fotos por producto (agregar columnas IMAGEN_2, IMAGEN_3)
- **Búsqueda por texto** en el catálogo
- **Marcado como vendido** sin eliminar la fila (columna STOCK 0/1)
- **Instagram feed** integrado para social proof
- **Pasarela de pago** (Mercado Pago Checkout Pro — sin código complejo)
- **SEO básico** con meta tags por producto
- **Google Analytics** para entender de dónde vienen los clientes

---

## Páginas del MVP (lo indispensable)

| Página | Propósito |
|--------|-----------|
| `index.html` | Atrae y explica el concepto. Muestra destacados. |
| `catalogo.html` | El corazón — donde ocurre la venta. |
| `checkout.html` | Captura el pedido. Simple, sin fricción. |

No necesitas más páginas para empezar a vender.
