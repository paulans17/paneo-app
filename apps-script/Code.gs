/**
 * paNeo · Backend gratis con Google Sheets + Apps Script
 *
 * 1. Crea una Google Sheet llamada "paNeo BD".
 * 2. Extensiones → Apps Script → pega este archivo entero.
 * 3. Ejecuta setup() una vez (acepta los permisos).
 * 4. Implementar → Nueva implementación → Aplicación web
 *    · Ejecutar como: yo   · Acceso: cualquier usuario
 * 5. Copia la URL que acaba en /exec y pégala en app/config.js
 */

var DIAS_CANJE = 30;
var MAX_SELLOS = 10;

var CABECERAS = {
  Clientes: ['id', 'pin', 'nombre', 'apellidos', 'sellos', 'fecha_completado', 'canjeado', 'favoritos'],
  Productos: ['id', 'nombre', 'categoria', 'precio', 'sin_gluten', 'vegano', 'cero_azucar', 'sin_lactosa',
              'imagen', 'especial_hoy', 'oferta', 'novedad', 'descripcion'],
  Pedidos: ['numero', 'id_cliente', 'estado', 'dias_envio', 'fecha'],
  Encuesta: ['fecha', 'id_cliente', 'alergias', 'dieta', 'gustos']
};

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
        if (!c) return json({ ok: false, error: 'ID o PIN incorrectos' });
        return json({ ok: true, cliente: clientePublico(c) });
      case 'pedidos':
        var cli = autenticar(p.id, p.pin);
        if (!cli) return json({ ok: false, error: 'ID o PIN incorrectos' });
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
    if (!c) return json({ ok: false, error: 'ID o PIN incorrectos' });

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

    if (body.action === 'favorito') {
      var prod = String(body.producto || '').trim();
      if (!prod) return json({ ok: false, error: 'Falta el producto' });
      var favs = lista(c.datos.favoritos);
      var i = favs.indexOf(prod);
      if (i === -1) favs.push(prod); else favs.splice(i, 1);
      var col = CABECERAS.Clientes.indexOf('favoritos') + 1;
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
/* Trigger: pone la fecha cuando la tarjeta llega a 10 sellos          */
/* ------------------------------------------------------------------ */

function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== 'Clientes') return;
  var colSellos = CABECERAS.Clientes.indexOf('sellos') + 1;
  var colFecha = CABECERAS.Clientes.indexOf('fecha_completado') + 1;
  var r0 = e.range.getRow(), r1 = e.range.getLastRow();
  var c0 = e.range.getColumn(), c1 = e.range.getLastColumn();
  if (colSellos < c0 || colSellos > c1) return;
  for (var r = Math.max(2, r0); r <= r1; r++) {
    var sellos = Number(sh.getRange(r, colSellos).getValue());
    var fecha = sh.getRange(r, colFecha);
    if (sellos >= MAX_SELLOS && !fecha.getValue()) fecha.setValue(hoyFecha());
  }
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
    .filter(function (p) { return normId(p.id_cliente) === idCliente; })
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
    .filter(function (r) { return normId(r.id_cliente) === idCliente; });
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
  if (!/^[A-Z]{2}\d{6}$/.test(id) || !/^\d{4}$/.test(pin)) return null;
  var filas = leerTabla('Clientes');
  for (var i = 0; i < filas.length; i++) {
    var d = filas[i].datos;
    if (normId(d.id) === id && normPin(d.pin) === pin) {
      d.id = id;
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
    hoja('Clientes').getRange(c.fila, CABECERAS.Clientes.indexOf('fecha_completado') + 1).setValue(fecha);
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

function hoja(nombre) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la pestaña "' + nombre + '". Ejecuta setup().');
  return sh;
}

function normId(v) { return String(v || '').trim().toUpperCase(); }
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
    ['AA000001', '1234', 'Lucía', 'Baró', 3, '', false, 'P01,P05'],
    ['AA000002', '2345', 'Hernán', 'de Lorenzo', 8, '', false, 'P06,P07'],
    ['AA000003', '3456', 'Alba', 'Navarro', 10, soloDia(hace5), false, 'P05,P06,P07']
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
    ['CD00001', 'AA000001', 'cocina', 2, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy')]
  ]);
  ss.getSheetByName('Pedidos').getRange('E:E').setNumberFormat('@');

  // Desplegable de estados para que el personal no se equivoque
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['cocina', 'horno', 'listo para recoger', 'entregado'], true).build();
  ss.getSheetByName('Pedidos').getRange('C2:C1000').setDataValidation(regla);

  // Si queda la "Hoja 1" vacía por defecto, la borramos
  var h1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (h1 && h1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h1);

  SpreadsheetApp.getActive().toast('paNeo BD lista ✔', 'setup()');
}

function rellenar(nombre, filas) {
  var sh = SpreadsheetApp.getActive().getSheetByName(nombre);
  if (sh.getLastRow() > 1 || !filas.length) return;
  sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
}
