/**
 * CualKiera(e) CHOP — Google Apps Script
 * Maneja pedidos, pagos MP, comentarios y productos
 */

const SPREADSHEET_ID = '1Dr9HDcUmzw8MMbNOlPmG_obhD3Btx4UJHr1lq15-c5g';
const EMAIL_ADMIN = 'cualkiera.e.chop@gmail.com';
const MP_ACCESS_TOKEN = 'APP_USR-5492691710749471-081904-3223bc4c6c910183c1a1ed06fd7a67d0-31688252';

function doGet(e) {
  const accion = e.parameter.accion;
  
  // Notificación de pago de Mercado Pago
  if (accion === 'mp_notificacion') {
    return procesarPagoMP(e.parameter);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', app: 'CualKiera(e) CHOP' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    
    if (datos.accion === 'nuevo_pedido') {
      return responder(guardarPedido(datos));
    }
    if (datos.accion === 'crear_preferencia_mp') {
      return responder(crearPreferenciaMP(datos));
    }
    if (datos.accion === 'nuevo_comentario') {
      return responder(guardarComentario(datos));
    }
    if (datos.accion === 'nuevo_producto') {
      return responder(guardarProductoAdmin(datos));
    }

    return responder({ status: 'error', mensaje: 'Acción no reconocida' });
  } catch (err) {
    Logger.log('Error doPost: ' + err.toString());
    return responder({ status: 'error', mensaje: err.toString() });
  }
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== MERCADO PAGO =====

function crearPreferenciaMP(datos) {
  try {
    const items = datos.productos.map(p => ({
      title: `${p.marca} ${p.modelo} - T${p.talla} ${p.pie}`,
      quantity: 1,
      currency_id: 'CLP',
      unit_price: p.precioFinal,
    }));

    const preference = {
      items,
      external_reference: datos.numero_orden,
      notification_url: ScriptApp.getService().getUrl() + '?accion=mp_notificacion',
      back_urls: {
        success: datos.url_base + '/pages/orden-exitosa.html?orden=' + datos.numero_orden,
        failure: datos.url_base + '/pages/catalogo.html',
        pending: datos.url_base + '/pages/orden-exitosa.html?orden=' + datos.numero_orden,
      },
      auto_return: 'approved',
      metadata: {
        numero_orden: datos.numero_orden,
        cliente_email: datos.email,
        cliente_nombre: datos.nombre,
      }
    };

    const response = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + MP_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(preference),
    });

    const result = JSON.parse(response.getContentText());
    return { status: 'ok', init_point: result.init_point, preference_id: result.id };

  } catch (err) {
    Logger.log('Error MP: ' + err.toString());
    return { status: 'error', mensaje: err.toString() };
  }
}

function procesarPagoMP(params) {
  try {
    const paymentId = params.payment_id;
    const status = params.status;
    const externalRef = params.external_reference;

    if (status === 'approved' && externalRef) {
      actualizarEstadoPedido(externalRef, 'PAGADO', paymentId);
      notificarAdminPago(externalRef, paymentId);
    }

    return ContentService.createTextOutput('OK');
  } catch (err) {
    Logger.log('Error notificacion MP: ' + err.toString());
    return ContentService.createTextOutput('ERROR');
  }
}

function actualizarEstadoPedido(numeroOrden, estado, paymentId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName('pedidos');
  if (!hoja) return;

  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(numeroOrden)) {
      hoja.getRange(i + 1, 3).setValue(estado); // columna ESTADO
      hoja.getRange(i + 1, 4).setValue(paymentId); // columna PAYMENT_ID
      hoja.getRange(i + 1, 5).setValue(new Date().toLocaleString('es-CL'));
      break;
    }
  }
}

// ===== PEDIDOS =====

function guardarPedido(datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = ss.getSheetByName('pedidos');

  if (!hoja) {
    hoja = ss.insertSheet('pedidos');
    hoja.appendRow([
      'NUMERO_ORDEN','FECHA','ESTADO','PAYMENT_ID','FECHA_PAGO',
      'NOMBRE','EMAIL','TELEFONO','CIUDAD','ENVIO','TALLA_ENVIO','COSTO_ENVIO','NOTAS',
      'PRODUCTOS','SUBTOTAL','DESCUENTO','TOTAL',
      'NUMERO_DESPACHO'
    ]);
    hoja.getRange(1,1,1,18).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }

  hoja.appendRow([
    datos.numero_orden,
    datos.fecha,
    'PENDIENTE',
    '', '', // payment_id, fecha_pago
    datos.nombre,
    datos.email,
    datos.telefono,
    datos.ciudad,
    datos.envio,
    datos.talla_envio,
    datos.costo_envio,
    datos.notas || '—',
    datos.productos_resumen,
    datos.subtotal,
    datos.descuento,
    datos.total,
    '', // numero_despacho (lo llenas tú)
  ]);

  // Registrar cliente
  registrarCliente(datos);

  // Email al cliente
  enviarEmailCliente(datos);

  return { status: 'ok', numero_orden: datos.numero_orden };
}

function registrarCliente(datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = ss.getSheetByName('clientes');

  if (!hoja) {
    hoja = ss.insertSheet('clientes');
    hoja.appendRow(['FECHA','NOMBRE','EMAIL','TELEFONO','CIUDAD','TOTAL_COMPRAS','ULTIMA_COMPRA','PEDIDOS']);
    hoja.getRange(1,1,1,8).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }

  // Buscar si ya existe
  const data = hoja.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === datos.email) {
      // Actualizar cliente existente
      const totalActual = parseFloat(data[i][5]) || 0;
      const pedidosActual = data[i][7] ? data[i][7] + ', ' + datos.numero_orden : datos.numero_orden;
      hoja.getRange(i+1, 6).setValue(totalActual + datos.total);
      hoja.getRange(i+1, 7).setValue(datos.fecha);
      hoja.getRange(i+1, 8).setValue(pedidosActual);
      return;
    }
  }

  // Cliente nuevo
  hoja.appendRow([
    datos.fecha,
    datos.nombre,
    datos.email,
    datos.telefono,
    datos.ciudad,
    datos.total,
    datos.fecha,
    datos.numero_orden,
  ]);
}

function enviarEmailCliente(datos) {
  try {
    MailApp.sendEmail(datos.email,
      `Tu pedido CualKiera(e) CHOP — ${datos.numero_orden}`,
      `Hola ${datos.nombre}!\n\nRecibimos tu pedido. Aquí están los detalles:\n\nNúmero de orden: ${datos.numero_orden}\nProductos: ${datos.productos_resumen}\nTotal: $${Number(datos.total).toLocaleString('es-CL')}\nEnvío: ${datos.envio} (${datos.talla_envio} — Por Pagar)\n\nTe contactaremos pronto para coordinar el envío.\n\nGracias!\nCualKiera(e) CHOP\ncualkiera.e.chop@gmail.com`
    );
  } catch(e) { Logger.log('Error email cliente: ' + e); }
}

function notificarAdminPago(numeroOrden, paymentId) {
  try {
    MailApp.sendEmail(EMAIL_ADMIN,
      `✅ PAGO CONFIRMADO — ${numeroOrden}`,
      `Se confirmó el pago del pedido ${numeroOrden}.\nPayment ID: ${paymentId}\n\nRevisa el Sheet para coordinar el despacho.`
    );
  } catch(e) { Logger.log('Error email admin: ' + e); }
}

// ===== COMENTARIOS =====

function guardarComentario(datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = ss.getSheetByName('comentarios');
  if (!hoja) return { status: 'error', mensaje: 'Hoja comentarios no existe' };

  hoja.appendRow([
    datos.fecha, datos.nombre, datos.ciudad,
    datos.comentario, datos.estrellas, 'NO', ''
  ]);
  return { status: 'ok' };
}

// ===== ADMIN PRODUCTOS =====

function guardarProductoAdmin(datos) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = ss.getSheetByName('productos');
  if (!hoja) return { status: 'error' };

  // Agregar producto (codigo se genera por formula del sheet)
  hoja.appendRow([
    '', datos.marca, datos.modelo, datos.talla, datos.cm,
    datos.pie, datos.estado, datos.precio, datos.imagen || '', datos.descripcion || ''
  ]);

  // Agregar fotos secundarias a hoja imagenes
  if (datos.fotos_extra && datos.fotos_extra.length > 0) {
    let hojaImg = ss.getSheetByName('imagenes');
    if (hojaImg) {
      // Obtener el codigo generado (ultima fila de productos)
      const lastRow = hoja.getLastRow();
      const codigo = hoja.getRange(lastRow, 1).getValue();
      datos.fotos_extra.forEach((url, i) => {
        if (url) hojaImg.appendRow([codigo, datos.marca, datos.modelo, url]);
      });
    }
  }

  return { status: 'ok' };
}
