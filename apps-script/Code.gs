/**
 * paNeo · Backend gratis con Google Sheets + Apps Script
 *
 * 1. Crea una Google Sheet llamada "paNeo BD".
 * 2. Extensiones → Apps Script → pega este archivo entero.
 * 3. Ejecuta setup() una vez (acepta los permisos).
 * 4. Implementar → Nueva implementación → Aplicación web
 *    · Ejecutar como: yo   · Acceso: cualquier usuario
 * 5. Copia la URL que acaba en /exec y pégala en app/config.js
 *
 * ¿Hoja creada con una versión anterior? Ejecuta actualizar() (no borra datos) y luego
 * Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión.
 */

var DIAS_CANJE = 30;
var MAX_SELLOS = 10;

var CABECERAS = {
  Clientes: ['id', 'pin', 'nombre', 'apellidos', 'sellos', 'fecha_completado', 'canjeado', 'favoritos',
             'cupon4_canjeado', 'cupon8_canjeado'],
  Productos: ['id', 'nombre', 'categoria', 'precio', 'sin_gluten', 'vegano', 'cero_azucar', 'sin_lactosa',
              'imagen', 'especial_hoy', 'oferta', 'novedad', 'descripcion'],
  Pedidos: ['numero', 'id_cliente', 'estado', 'dias_envio', 'fecha'],
  Encuesta: ['fecha', 'id_cliente', 'alergias', 'dieta', 'gustos'],
  Canjes: ['fecha', 'id_cliente', 'cupon', 'codigo']
};

var NOMBRE_CUPON = { c4: '-50 % (casilla 4)', c8: '-50 % (casilla 8)', especial: 'Artículo especial', caducado: 'Tarjeta caducada (nueva tarjeta)', tienda: 'Artículo especial (marcado en la hoja)' };

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case 'productos':
        return json({ ok: true, productos: leerProductos() });
      case 'login':
      case 'cliente':
        var c = autenticar(p.id, p.pin);
        if (!c) return json({ ok: false, error: 'Usuario o PIN incorrectos' });
        return json({ ok: true, cliente: clientePublico(c) });
      case 'pedidos':
        var cli = autenticar(p.id, p.pin);
        if (!cli) return json({ ok: false, error: 'Usuario o PIN incorrectos' });
        return json({ ok: true, pedidos: leerPedidos(cli.datos.id) });
      default:
        return json({ ok: true, app: 'paNeo', acciones: ['productos', 'login', 'cliente', 'pedidos'] });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

// El cliente envía el JSON con Content-Type: text/plain para evitar el preflight de CORS.
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var c = autenticar(body.id, body.pin);
    if (!c) return json({ ok: false, error: 'Usuario o PIN incorrectos' });

    // Igual que en doGet, pero así el PIN no viaja en la URL (la app usa esta vía).
    if (body.action === 'login' || body.action === 'cliente') {
      return json({ ok: true, cliente: clientePublico(c) });
    }
    if (body.action === 'pedidos') {
      return json({ ok: true, pedidos: leerPedidos(c.datos.id) });
    }

    if (body.action === 'encuesta') {
      hoja('Encuesta').appendRow([
        new Date(),
        c.datos.id,
        lista(body.alergias).join(', '),
        lista(body.dieta).join(', '),
        lista(body.gustos).join(', ')
      ]);
      return json({ ok: true, cliente: clientePublico(autenticar(body.id, body.pin)) });
    }

    if (body.action === 'canjear') {
      var r = canjear(c, String(body.cupon || ''), String(body.codigo || ''));
      if (!r.ok) return json(r);
      return json({ ok: true, nuevaTarjeta: r.nuevaTarjeta, cliente: clientePublico(autenticar(body.id, body.pin)) });
    }

    if (body.action === 'favorito') {
      var prod = String(body.producto || '').trim();
      if (!prod) return json({ ok: false, error: 'Falta el producto' });
      var favs = lista(c.datos.favoritos);
      var i = favs.indexOf(prod);
      if (i === -1) favs.push(prod); else favs.splice(i, 1);
      var col = colDe('Clientes', 'favoritos');
      hoja('Clientes').getRange(c.fila, col).setValue(favs.join(','));
      return json({ ok: true, favoritos: favs });
    }

    return json({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ------------------------------------------------------------------ */
/* Trigger: fecha al llegar a 10 sellos y tarjeta nueva al marcar      */
/* «canjeado» desde la hoja                                            */
/* ------------------------------------------------------------------ */

function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== 'Clientes') return;
  var colSellos = colDe('Clientes', 'sellos');
  var colFecha = colDe('Clientes', 'fecha_completado');
  var colCanjeado = colDe('Clientes', 'canjeado');
  var r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
  var c0 = e.range.getColumn(), c1 = e.range.getLastColumn();
  for (var r = r0; r <= r1; r++) {
    if (colSellos >= c0 && colSellos <= c1) {
      var sellos = Number(sh.getRange(r, colSellos).getValue());
      var fecha = sh.getRange(r, colFecha);
      if (sellos >= MAX_SELLOS && !fecha.getValue()) fecha.setValue(hoyFecha());
    }
    // El personal marca «canjeado» al entregar el regalo → tarjeta nueva y queda apuntado en Canjes
    if (colCanjeado >= c0 && colCanjeado <= c1 && bool(sh.getRange(r, colCanjeado).getValue())) {
      var id = String(sh.getRange(r, colDe('Clientes', 'id')).getValue()).trim();
      if (id) reiniciarTarjeta(r, id, 'tienda', '');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Cupones                                                             */
/* ------------------------------------------------------------------ */

// c4 y c8: -50 % de las casillas 4 y 8. especial: artículo de la casilla 10 (reinicia la tarjeta).
// caducado: pasaron los 30 días sin canjear → el cliente empieza una tarjeta nueva.
function canjear(c, cupon, codigo) {
  var d = c.datos, sh = hoja('Clientes');
  var info = clientePublico(c);
  var n = info.sellos;
  if (cupon === 'c4' || cupon === 'c8') {
    var minimo = cupon === 'c4' ? 4 : 8;
    var campo = cupon === 'c4' ? 'cupon4_canjeado' : 'cupon8_canjeado';
    if (n < minimo) return { ok: false, error: 'Aún no tienes este cupón' };
    if (bool(d[campo])) return { ok: false, error: 'Este cupón ya está canjeado' };
    sh.getRange(c.fila, colDe('Clientes', campo)).setValue(true);
    apuntarCanje(d.id, cupon, codigo);
    return { ok: true, nuevaTarjeta: false };
  }
  if (cupon === 'especial' || cupon === 'caducado') {
    if (n < MAX_SELLOS) return { ok: false, error: 'La tarjeta aún no está completa' };
    if (cupon === 'especial' && info.dias_restantes <= 0) return { ok: false, error: 'El plazo de 30 días ha terminado' };
    if (cupon === 'caducado' && info.dias_restantes > 0) return { ok: false, error: 'Aún puedes canjear tu artículo especial' };
    reiniciarTarjeta(c.fila, d.id, cupon, codigo);
    return { ok: true, nuevaTarjeta: true };
  }
  return { ok: false, error: 'Cupón desconocido' };
}

function reiniciarTarjeta(fila, id, motivo, codigo) {
  var sh = hoja('Clientes');
  sh.getRange(fila, colDe('Clientes', 'sellos')).setValue(0);
  sh.getRange(fila, colDe('Clientes', 'fecha_completado')).clearContent();
  sh.getRange(fila, colDe('Clientes', 'canjeado')).setValue(false);
  sh.getRange(fila, colDe('Clientes', 'cupon4_canjeado')).setValue(false);
  sh.getRange(fila, colDe('Clientes', 'cupon8_canjeado')).setValue(false);
  apuntarCanje(id, motivo, codigo);
}

function apuntarCanje(id, cupon, codigo) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Canjes');
  if (!sh) return;
  sh.appendRow([new Date(), id, NOMBRE_CUPON[cupon] || cupon, codigo || '']);
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

function leerTabla(nombre) {
  var sh = hoja(nombre);
  var datos = sh.getDataRange().getValues();
  var cab = datos.shift().map(function (h) { return String(h).trim(); });
  return datos.map(function (fila, i) {
    var o = {};
    cab.forEach(function (h, j) { o[h] = fila[j]; });
    return { fila: i + 2, datos: o };
  }).filter(function (r) { return String(r.datos[cab[0]]).trim() !== ''; });
}

function leerProductos() {
  return leerTabla('Productos').map(function (r) {
    var p = r.datos;
    return {
      id: String(p.id).trim(),
      nombre: String(p.nombre),
      categoria: String(p.categoria || ''),
      precio: Number(String(p.precio).replace(',', '.')) || 0,
      sin_gluten: bool(p.sin_gluten),
      vegano: bool(p.vegano),
      cero_azucar: bool(p.cero_azucar),
      sin_lactosa: bool(p.sin_lactosa),
      imagen: String(p.imagen || ''),
      especial_hoy: bool(p.especial_hoy),
      oferta: bool(p.oferta),
      novedad: bool(p.novedad),
      descripcion: String(p.descripcion || '')
    };
  });
}

function leerPedidos(idCliente) {
  return leerTabla('Pedidos')
    .map(function (r) { return r.datos; })
    .filter(function (p) { return normId(p.id_cliente) === normId(idCliente); })
    .map(function (p) {
      return {
        numero: String(p.numero),
        estado: String(p.estado || ''),
        dias_envio: Number(p.dias_envio) || 0,
        fecha: fechaTexto(p.fecha)
      };
    });
}

function ultimaEncuesta(idCliente) {
  var filas = leerTabla('Encuesta').map(function (r) { return r.datos; })
    .filter(function (r) { return normId(r.id_cliente) === normId(idCliente); });
  if (!filas.length) return null;
  var u = filas[filas.length - 1];
  return { alergias: lista(u.alergias), dieta: lista(u.dieta), gustos: lista(u.gustos) };
}

/* ------------------------------------------------------------------ */
/* Autenticación                                                       */
/* ------------------------------------------------------------------ */

function autenticar(id, pin) {
  id = normId(id);
  pin = normPin(pin);
  if (id.length < 3 || !/^\d{4}$/.test(pin)) return null;
  var filas = leerTabla('Clientes');
  for (var i = 0; i < filas.length; i++) {
    var d = filas[i].datos;
    if (normId(d.id) === id && normPin(d.pin) === pin) {
      d.id = String(d.id).trim(); // se devuelve tal y como está escrito en la Sheet
      return filas[i];
    }
  }
  return null;
}

// Nunca devuelve el PIN.
function clientePublico(c) {
  var d = c.datos;
  var sellos = Math.max(0, Math.min(MAX_SELLOS, Number(d.sellos) || 0));
  var fecha = d.fecha_completado;
  if (sellos >= MAX_SELLOS && !fecha) {
    fecha = hoyFecha();
    hoja('Clientes').getRange(c.fila, colDe('Clientes', 'fecha_completado')).setValue(fecha);
  }
  var canjeado = bool(d.canjeado);
  var dias = 0;
  if (sellos >= MAX_SELLOS && fecha && !canjeado) {
    var f = fecha instanceof Date ? fecha : parseFecha(fecha);
    if (f) {
      var pasados = Math.floor((hoyFecha().getTime() - soloDia(f).getTime()) / 86400000);
      dias = Math.max(0, DIAS_CANJE - pasados);
    }
  }
  return {
    id: d.id,
    nombre: String(d.nombre || ''),
    apellidos: String(d.apellidos || ''),
    sellos: sellos,
    fecha_completado: fecha ? fechaTexto(fecha) : '',
    canjeado: canjeado,
    favoritos: lista(d.favoritos),
    cupon4_canjeado: bool(d.cupon4_canjeado),
    cupon8_canjeado: bool(d.cupon8_canjeado),
    dias_restantes: dias,
    encuesta: ultimaEncuesta(d.id)
  };
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Columna (1, 2, 3…) de una cabecera, leyendo la fila 1 real de la hoja (por si alguien mueve columnas)
function colDe(nombre, cabecera) {
  var sh = hoja(nombre);
  var cab = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var i = cab.indexOf(cabecera);
  if (i === -1) throw new Error('Falta la columna "' + cabecera + '" en ' + nombre + '. Ejecuta actualizar().');
  return i + 1;
}

function hoja(nombre) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la pestaña "' + nombre + '". Ejecuta setup().');
  return sh;
}

// Nombre de usuario sin distinguir mayúsculas, tildes ni espacios ("Lucía Baró" = "luciabaro")
function normId(v) {
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}
function normPin(v) {
  var s = String(v == null ? '' : v).trim();
  return /^\d{1,4}$/.test(s) ? ('0000' + s).slice(-4) : s;
}

function bool(v) {
  if (v === true) return true;
  var s = String(v || '').trim().toLowerCase();
  return ['true', 'verdadero', 'si', 'sí', 'x', '1', 'yes'].indexOf(s) !== -1;
}

function lista(v) {
  if (Array.isArray(v)) return v.map(function (x) { return String(x).trim(); }).filter(String);
  return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

function soloDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function hoyFecha() { return soloDia(new Date()); }

function parseFecha(v) {
  var m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var d = new Date(v);
  return isNaN(d) ? null : d;
}

function fechaTexto(v) {
  if (!v) return '';
  var d = v instanceof Date ? v : parseFecha(v);
  if (!d) return String(v);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/* ------------------------------------------------------------------ */
/* setup(): crea las pestañas con datos de ejemplo (ejecutar una vez)  */
/* ------------------------------------------------------------------ */

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(CABECERAS).forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    if (sh.getLastRow() > 0) return; // no machaca datos existentes
    var cab = CABECERAS[nombre];
    sh.getRange(1, 1, 1, cab.length).setValues([cab])
      .setFontWeight('bold').setBackground('#3E1A0E').setFontColor('#F7F0E3');
    sh.setFrozenRows(1);
  });

  // PIN como texto para que "0123" no pierda el cero
  ss.getSheetByName('Clientes').getRange('B:B').setNumberFormat('@');

  var hace5 = new Date(); hace5.setDate(hace5.getDate() - 5);
  rellenar('Clientes', [
    ['LuciaBaro', '2504', 'Lucía', 'Baró', 3, '', false, 'P01,P05', false, false],
    ['HernanDeLorenzo', '2504', 'Hernán', 'de Lorenzo', 8, '', false, 'P06,P07', false, false],
    ['AlbaNavarro', '2504', 'Alba', 'Navarro', 10, soloDia(hace5), false, 'P05,P06,P07', false, false]
  ]);

  var img = 'assets/productos/';
  rellenar('Productos', [
    ['P01', 'Tarta de zanahoria vegana', 'Tartas', 34.99, false, true, false, true, img + 'tarta-zanahoria.jpg', true, true, false, 'Bizcocho de zanahoria y nueces con crema vegana.'],
    ['P02', 'Muffins de arándanos', 'Bollería', 0, true, false, false, false, img + 'muffins-arandanos.jpg', false, true, false, 'Esponjosos y con arándanos enteros.'],
    ['P03', 'Muffins con chocolate', 'Bollería', 0, false, true, false, true, img + 'muffins-chocolate.jpg', false, false, true, 'Doble de chocolate, sin nada de origen animal.'],
    ['P04', 'Cupcakes decorativos', 'Cupcakes', 0, false, false, true, false, img + 'cupcakes.jpg', false, false, true, 'Para celebrar, decorados a mano.'],
    ['P05', 'Cookies', 'Galletas', 0, true, true, false, true, img + 'cookies.jpg', false, true, false, 'Crujientes por fuera, blanditas por dentro.'],
    ['P06', 'Croissant', 'Bollería', 0, true, false, false, false, img + 'croissant.jpg', false, false, true, 'Hojaldrado y dorado, recién horneado.'],
    ['P07', 'Cheesecake', 'Tartas', 0, true, false, true, false, img + 'cheesecake.jpg', false, false, true, 'Cremosa, con base crujiente.']
  ]);

  rellenar('Pedidos', [
    ['CD00001', 'LuciaBaro', 'cocina', 2, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy')]
  ]);
  ss.getSheetByName('Pedidos').getRange('E:E').setNumberFormat('@');

  // Desplegable de estados para que el personal no se equivoque
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['cocina', 'horno', 'listo para recoger', 'entregado'], true).build();
  ss.getSheetByName('Pedidos').getRange('C2:C1000').setDataValidation(regla);

  // Si queda la "Hoja 1" vacía por defecto, la borramos
  var h1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (h1 && h1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h1);

  formato();
  SpreadsheetApp.getActive().toast('paNeo BD lista ✔', 'setup()');
}

// Para una hoja ya creada: añade las columnas y pestañas nuevas sin tocar los datos, y rehace el formato.
function actualizar() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(CABECERAS).forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    var cab = CABECERAS[nombre];
    var ancho = Math.max(1, sh.getLastColumn());
    var actuales = sh.getRange(1, 1, 1, ancho).getValues()[0].map(function (h) { return String(h).trim(); });
    cab.forEach(function (h) {
      if (actuales.indexOf(h) === -1) {
        var col = actuales.filter(String).length + 1;
        sh.getRange(1, col).setValue(h);
        actuales[col - 1] = h;
      }
    });
  });
  formato();
  ss.toast('paNeo BD actualizada ✔', 'actualizar()');
}

// Formato pensado para el equipo de la tienda. Se puede volver a ejecutar sin perder datos.
function formato() {
  var ss = SpreadsheetApp.getActive();
  var FILAS = 300;
  var NOTAS = {
    Clientes: {
      id: 'Nombre de usuario con el que entra en la app (p. ej. LuciaBaro). No distingue mayúsculas ni tildes.',
      pin: '4 cifras. Se lo dais en la tienda.',
      sellos: 'De 0 a 10. Suma 1 por cada visita con compra (no por producto). En 4 y 8 hay -50 %; en 10, artículo especial.',
      fecha_completado: 'Se rellena sola al llegar a 10 sellos. Desde ese día hay 30 días para canjear.',
      canjeado: 'Márcalo al entregar el artículo especial: la tarjeta se reinicia sola (sellos a 0) y queda apuntado en Canjes.',
      cupon4_canjeado: 'Se marca solo cuando el cliente canjea en la app el -50 % de la casilla 4.',
      cupon8_canjeado: 'Se marca solo cuando el cliente canjea en la app el -50 % de la casilla 8.',
      favoritos: 'Lo rellena la app (ids de producto separados por comas).'
    },
    Productos: {
      id: 'P01, P02… No lo cambies si ya hay clientes con ese favorito.',
      precio: 'En euros. 0 = la app muestra «Consultar precio».',
      imagen: 'assets/productos/archivo.jpg o una URL de imagen.',
      especial_hoy: 'Solo uno marcado: sale grande en el inicio de la app.'
    },
    Pedidos: {
      id_cliente: 'El nombre de usuario del cliente (columna id de Clientes).',
      estado: 'cocina → horno → listo para recoger → entregado',
      dias_envio: 'Días que faltan para que esté listo.'
    },
    Encuesta: { fecha: 'La rellena la app cuando el cliente guarda su encuesta de preferencias.' },
    Canjes: { fecha: 'Historial: se apunta solo cada vez que se canjea un cupón o se reinicia una tarjeta.', codigo: 'Código del QR que enseñó el cliente.' }
  };

  Object.keys(CABECERAS).forEach(function (nombre) {
    var sh = ss.getSheetByName(nombre);
    if (!sh) return;
    var cab = CABECERAS[nombre];
    sh.getRange(1, 1, 1, cab.length)
      .setFontWeight('bold').setBackground('#3E1A0E').setFontColor('#F7F0E3')
      .setVerticalAlignment('middle');
    sh.setRowHeight(1, 32);
    sh.setFrozenRows(1);
    cab.forEach(function (h, j) {
      var nota = (NOTAS[nombre] || {})[h];
      if (nota) sh.getRange(1, j + 1).setNote(nota);
    });
    sh.autoResizeColumns(1, cab.length);
    for (var j = 1; j <= cab.length; j++) sh.setColumnWidth(j, Math.max(sh.getColumnWidth(j) + 16, 90));
    sh.setTabColor({ Clientes: '#E8761E', Productos: '#F2B33D', Pedidos: '#8A4420', Encuesta: '#E6B37C', Canjes: '#3E1A0E' }[nombre]);
    sh.getBandings().forEach(function (b) { b.remove(); });
    sh.getRange(1, 1, FILAS, cab.length).applyRowBanding(SpreadsheetApp.BandingTheme.BROWN, true, false);
    sh.getRange(1, 1, 1, cab.length).setBackground('#3E1A0E').setFontColor('#F7F0E3');
  });

  function col(nombre, h) { return colDe(nombre, h); }
  function columna(nombre, h) { return ss.getSheetByName(nombre).getRange(2, col(nombre, h), FILAS - 1, 1); }

  // Casillas de verificación en los campos sí/no
  ['canjeado', 'cupon4_canjeado', 'cupon8_canjeado'].forEach(function (h) { columna('Clientes', h).insertCheckboxes(); });
  ['sin_gluten', 'vegano', 'cero_azucar', 'sin_lactosa', 'especial_hoy', 'oferta', 'novedad'].forEach(function (h) {
    columna('Productos', h).insertCheckboxes();
  });

  // Sellos: solo números del 0 al 10
  columna('Clientes', 'sellos').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, MAX_SELLOS).setAllowInvalid(false)
    .setHelpText('Entre 0 y 10 sellos').build()).setHorizontalAlignment('center');
  // Resalta las tarjetas completas
  var clientes = ss.getSheetByName('Clientes');
  var rSellos = columna('Clientes', 'sellos');
  clientes.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(MAX_SELLOS)
      .setBackground('#F2B33D').setBold(true).setRanges([rSellos]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(4, 9)
      .setBackground('#F7E1C2').setRanges([rSellos]).build()
  ]);
  columna('Clientes', 'fecha_completado').setNumberFormat('dd/mm/yyyy');
  columna('Productos', 'precio').setNumberFormat('#,##0.00 "€"');
  columna('Encuesta', 'fecha').setNumberFormat('dd/mm/yyyy hh:mm');
  columna('Canjes', 'fecha').setNumberFormat('dd/mm/yyyy hh:mm');
  columna('Pedidos', 'estado').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['cocina', 'horno', 'listo para recoger', 'entregado'], true).build());
}

function rellenar(nombre, filas) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (sh.getLastRow() > 1 || !filas.length) return;
  sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
}
