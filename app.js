/* paNeo · App PWA (SPA por hash) */
(function () {
  'use strict';

  /* ================================================================ */
  /* Utilidades                                                        */
  /* ================================================================ */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('paneo.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('paneo.' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('paneo.' + k); } catch (e) {} }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function precio(p) { return p > 0 ? p.toFixed(2).replace('.', ',') + '€' : 'Consultar precio'; }
  function img(src) {
    return src || 'assets/pan-n.png';
  }

  var toastT;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  /* ================================================================ */
  /* Iconos SVG de trazo (parecidos a los del Canva)                   */
  /* ================================================================ */
  var I = {
    lupa: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    tienda: '<path d="M3.5 9.5 5 4h14l1.5 5.5"/><path class="rell" d="M3.5 9.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.3 2.5 2.8 2.5s2.8-1 2.8-2.5c0 1.5 1.2 2.5 2.7 2.5s2.8-1 2.8-2.5z"/><path d="M5 12v8h14v-8"/><path d="M10 20v-4.5h4V20"/>',
    porcentaje: '<path class="rell" d="M12 2.8l2.2 1.6 2.7-.2.9 2.6 2.3 1.4-.6 2.7 1.1 2.5-2 1.8-.3 2.7-2.7.5-1.5 2.3-2.6-.9-2.5 1.1-1.8-2-2.7-.4-.4-2.7-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.4-2.7 2.7-.4 1.8-2z"/><path d="M9 15l6-6"/><circle cx="9.3" cy="9.3" r="1.1"/><circle cx="14.7" cy="14.7" r="1.1"/>',
    persona: '<circle class="rell" cx="12" cy="8" r="4"/><path class="rell" d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/>',
    cesta: '<path d="M8 10 11 4M16 10l-3-6"/><path class="rell" d="M3 10h18l-2 10H5z"/><path d="M9 13v4M12 13v4M15 13v4"/>',
    azucar: '<g transform="rotate(-35 12 12)"><rect x="7" y="2.5" width="10" height="19" rx="1.5"/><path d="M7 8.8h10M7 15.2h10M12 2.5v19"/></g><path d="M3.5 20.5 20.5 3.5"/>',
    vegano: '<circle cx="12" cy="12" r="9.5"/><path d="M12 18.5V8.5"/><path d="M12 18c-3.4-.4-5-3-4.6-6.4 3.1-.3 4.6 1.4 4.6 4.4"/><path d="M12 15c3.4-.4 5-3 4.6-6.4-3.1-.3-4.6 1.4-4.6 4.4"/><path d="M12 9.5c-1.2-1.5-1.2-3.2 0-4.5 1.2 1.3 1.2 3 0 4.5z"/>',
    gluten: '<circle cx="12" cy="12" r="9.5"/><path d="M12 20V7"/><path d="M12 10.5c-2.2 0-3.4-1.3-3.4-3.4 2.2 0 3.4 1.2 3.4 3.4zM12 10.5c2.2 0 3.4-1.3 3.4-3.4-2.2 0-3.4 1.2-3.4 3.4zM12 14.5c-2.2 0-3.4-1.3-3.4-3.4 2.2 0 3.4 1.2 3.4 3.4zM12 14.5c2.2 0 3.4-1.3 3.4-3.4-2.2 0-3.4 1.2-3.4 3.4zM12 7c-.9-1-.9-2.3 0-3.3.9 1 .9 2.3 0 3.3z"/><path d="M5.3 18.7 18.7 5.3"/>',
    camara: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h3l1.5-2h6l1.5 2h3A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><circle cx="12" cy="13" r="3.8"/><path d="M5.5 9.5h1.5"/>',
    ajustes: '<path class="rell" d="M12 1.8l1.7 2.6 3-.6.7 3 2.8 1.2-.9 2.9 1.9 2.4-2.3 2 .3 3.1-3.1.4-1.3 2.8L12 20.4l-2.8 1.2-1.3-2.8-3.1-.4.3-3.1-2.3-2 1.9-2.4-.9-2.9 2.8-1.2.7-3 3 .6z" stroke="none" fill="currentColor"/><circle cx="12" cy="11.6" r="3.6" fill="#4E2212" stroke="none"/>',
    info: '<circle class="rell" cx="12" cy="12" r="9.5"/><path d="M12 10.5v6.5" stroke-width="2.6"/><circle cx="12" cy="7.2" r=".6" stroke-width="2.4"/>',
    corazon: '<path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 6.1-8 11-8 11z"/>',
    corazonR: '<path class="rell" d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 6.1-8 11-8 11z"/>',
    play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
    horno: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><rect x="6.5" y="9" width="11" height="8" rx="1"/><path d="M7 6.5h1M10 6.5h1"/>',
    olla: '<path d="M5 10h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M3 10h18M9 7c0-1 .8-1.5 1.5-2.5M13.5 7c0-1 .8-1.5 1.5-2.5"/>',
    bolsa: '<path d="M5 8h14l-1 12H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function ico(n, extra) {
    return '<span class="ico ' + (extra || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (I[n] || '') + '</svg></span>';
  }
  function pintarIconos(root) {
    $$('[data-ico]', root).forEach(function (el) { el.outerHTML = ico(el.getAttribute('data-ico')); });
  }

  var FILTROS = [
    { id: 'za', campo: 'cero_azucar', label: '0 azúcar', ico: 'azucar' },
    { id: 'vg', campo: 'vegano', label: 'Vegano', ico: 'vegano' },
    { id: 'sg', campo: 'sin_gluten', label: 'Sin gluten', ico: 'gluten' }
  ];

  /* ================================================================ */
  /* Datos: API (Apps Script) o respaldo local                         */
  /* ================================================================ */
  var HAY_API = typeof API_URL === 'string' && /^https:\/\//.test(API_URL);
  var R = typeof PANEO_RESPALDO !== 'undefined' ? PANEO_RESPALDO : { productos: [], clientes: [], pedidos: [] };

  var E = {
    productos: LS.get('productos', null) || R.productos,
    sesion: LS.get('sesion', null),
    cliente: LS.get('cliente', null),
    pedidos: null,
    pedidoSel: 0,
    buscar: { q: '', f: [] }
  };

  function conTiempo(promesa, ms) {
    return Promise.race([promesa, new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, ms); })]);
  }
  function apiGet(params) {
    var qs = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return conTiempo(fetch(API_URL + (API_URL.indexOf('?') > -1 ? '&' : '?') + qs).then(function (r) { return r.json(); }), 15000);
  }
  // text/plain evita el preflight de CORS con Apps Script
  function apiPost(body) {
    return conTiempo(fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }), 15000);
  }

  /* ---- Modo demo (sin API) ---- */
  function demoCliente(c) {
    var dias = 0, fecha = '';
    if (c.sellos >= 10 && c.dias_completado != null) {
      var f = new Date(); f.setDate(f.getDate() - c.dias_completado);
      fecha = f.toLocaleDateString('es-ES');
      if (!c.canjeado) dias = Math.max(0, 30 - c.dias_completado);
    }
    return {
      id: c.id, nombre: c.nombre, apellidos: c.apellidos, sellos: c.sellos,
      fecha_completado: fecha, canjeado: c.canjeado,
      favoritos: LS.get('demo.fav.' + c.id, c.favoritos),
      dias_restantes: dias,
      encuesta: LS.get('demo.enc.' + c.id, null)
    };
  }
  var demo = {
    auth: function (id, pin) {
      return R.clientes.filter(function (c) { return c.id === id && String(c.pin) === String(pin); })[0];
    },
    post: function (b) {
      var c = demo.auth(b.id, b.pin);
      if (!c) return { ok: false, error: 'ID o PIN incorrectos' };
      if (b.action === 'login' || b.action === 'cliente') return { ok: true, cliente: demoCliente(c) };
      if (b.action === 'pedidos') return { ok: true, pedidos: R.pedidos.filter(function (p) { return p.id_cliente === c.id; }) };
      if (b.action === 'favorito') {
        var favs = LS.get('demo.fav.' + c.id, c.favoritos).slice();
        var i = favs.indexOf(b.producto);
        if (i === -1) favs.push(b.producto); else favs.splice(i, 1);
        LS.set('demo.fav.' + c.id, favs);
        return { ok: true, favoritos: favs };
      }
      if (b.action === 'encuesta') {
        LS.set('demo.enc.' + c.id, { alergias: b.alergias, dieta: b.dieta, gustos: b.gustos });
        return { ok: true, cliente: demoCliente(c) };
      }
      return { ok: false, error: 'Acción desconocida' };
    }
  };

  function post(body) {
    if (!HAY_API) return Promise.resolve(demo.post(body));
    return apiPost(body);
  }
  function conSesion(extra) {
    var b = { id: E.sesion.id, pin: E.sesion.pin };
    for (var k in extra) b[k] = extra[k];
    return b;
  }

  function cargarProductos() {
    if (!HAY_API) { E.productos = R.productos; return Promise.resolve(); }
    return apiGet({ action: 'productos' }).then(function (r) {
      if (r && r.ok && r.productos && r.productos.length) {
        E.productos = r.productos;
        LS.set('productos', r.productos);
      }
    }).catch(function () { /* nos quedamos con la caché o el respaldo */ });
  }
  function refrescarCliente() {
    if (!E.sesion) return Promise.resolve();
    return post(conSesion({ action: 'cliente' })).then(function (r) {
      if (r && r.ok) guardarCliente(r.cliente);
      else if (r && r.error && /incorrect/i.test(r.error)) cerrarSesion();
    }).catch(function () {});
  }
  function cargarPedidos() {
    return post(conSesion({ action: 'pedidos' })).then(function (r) {
      E.pedidos = r && r.ok ? r.pedidos : [];
    }).catch(function () { E.pedidos = E.pedidos || []; });
  }
  function guardarCliente(c) { E.cliente = c; LS.set('cliente', c); }

  function producto(id) { return E.productos.filter(function (p) { return p.id === id; })[0]; }
  function esFav(id) { return E.cliente && E.cliente.favoritos.indexOf(id) > -1; }

  function alternarFav(id, btn) {
    var favs = E.cliente.favoritos.slice();
    var i = favs.indexOf(id);
    var anadir = i === -1;
    if (anadir) favs.push(id); else favs.splice(i, 1);
    E.cliente.favoritos = favs;
    guardarCliente(E.cliente);
    if (btn) {
      btn.classList.toggle('on', anadir);
      btn.setAttribute('aria-pressed', anadir);
      btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    }
    toast(anadir ? 'Añadido a favoritos ♥' : 'Quitado de favoritos');
    post(conSesion({ action: 'favorito', producto: id })).then(function (r) {
      if (r && r.ok) { E.cliente.favoritos = r.favoritos; guardarCliente(E.cliente); }
    }).catch(function () { toast('Sin conexión: se guardará al volver'); });
  }

  /* ================================================================ */
  /* Recomendaciones a partir de la encuesta                           */
  /* ================================================================ */
  function recomendaciones() {
    var enc = E.cliente && E.cliente.encuesta;
    if (!enc) return [];
    var al = (enc.alergias || []).map(norm), di = (enc.dieta || []).map(norm), gu = (enc.gustos || []).map(norm);
    var tiene = function (arr, txt) { return arr.some(function (a) { return a.indexOf(txt) > -1; }); };
    var GUSTOS = {
      chocolate: ['chocolate', 'cookie', 'brownie'],
      frutas: ['arandano', 'fruta', 'zanahoria', 'fresa', 'limon', 'manzana', 'frutos rojos'],
      cremas: ['cheesecake', 'crema', 'cupcake', 'nata'],
      bolleria: ['croissant', 'muffin', 'bolleria'],
      tartas: ['tarta', 'cheesecake'],
      galletas: ['cookie', 'galleta']
    };
    return E.productos.filter(function (p) {
      if (tiene(al, 'gluten') && !p.sin_gluten) return false;
      if (tiene(al, 'lactosa') && !(p.sin_lactosa || p.vegano)) return false;
      if (tiene(al, 'huevo') && !p.vegano) return false;
      if (tiene(di, 'vegan') && !p.vegano) return false;
      if (tiene(di, 'azucar') && !p.cero_azucar) return false;
      return true;
    }).map(function (p) {
      var txt = norm(p.nombre + ' ' + p.categoria + ' ' + p.descripcion), s = 0;
      gu.forEach(function (g) {
        (GUSTOS[g] || [g]).forEach(function (k) { if (txt.indexOf(k) > -1) s += 2; });
      });
      if (esFav(p.id)) s += 1;
      return { p: p, s: s };
    }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.p; });
  }

  /* ================================================================ */
  /* Plantillas                                                        */
  /* ================================================================ */
  function btnFav(p) {
    var on = esFav(p.id);
    return '<button type="button" class="corazon' + (on ? ' on' : '') + '" data-fav="' + esc(p.id) + '" aria-pressed="' + on + '" aria-label="Favorito: ' + esc(p.nombre) + '">' + ico('corazon') + '</button>';
  }
  function tarjetaCrema(p, cls) {
    return '<article class="prod-crema ' + (cls || '') + '">' +
      '<img src="' + esc(img(p.imagen)) + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
      '<div><h3>' + esc(p.nombre) + '</h3><p class="precio">' + esc(precio(p.precio)) + '</p></div>' +
      btnFav(p) + '</article>';
  }
  function carrusel(lista, id) {
    if (!lista.length) return '<p class="nota-reco">Pronto habrá productos aquí.</p>';
    var puntos = lista.length > 1 ? '<div class="puntos" data-puntos="' + id + '">' + lista.map(function (_, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' : '';
    return '<div class="carrusel" data-carrusel="' + id + '">' + lista.map(function (p) { return tarjetaCrema(p); }).join('') + '</div>' + puntos;
  }
  function etiquetas(p) {
    var t = [];
    if (p.sin_gluten) t.push('Sin gluten');
    if (p.vegano) t.push('Vegano');
    if (p.cero_azucar) t.push('0 azúcar');
    if (p.sin_lactosa && !p.vegano) t.push('Sin lactosa');
    return t.join(' · ');
  }
  function filtrosHTML(activos, tostados) {
    return '<div class="filtros' + (tostados ? ' tostados' : '') + '" role="group" aria-label="Filtros">' +
      FILTROS.map(function (f) {
        var on = activos.indexOf(f.id) > -1;
        return '<button type="button" class="filtro' + (on ? ' on' : '') + '" data-filtro="' + f.id + '" aria-pressed="' + on + '">' + ico(f.ico) + '<span>' + f.label + '</span></button>';
      }).join('') + '</div>';
  }

  /* ---- Cabeceras ---- */
  function cabBuscar() {
    return '<form class="buscador" role="search" id="formBuscar">' +
      '<input type="search" id="q" placeholder="Busca tu producto…" aria-label="Busca tu producto" value="' + esc(E.buscar.q) + '" enterkeyhint="search" autocomplete="off">' +
      '<button class="btn-lupa" type="submit" aria-label="Buscar">' + ico('lupa') + '</button></form>';
  }
  function cabFicha(tipo) {
    var c = E.cliente;
    var foto = LS.get('foto.' + c.id, null);
    var abajo;
    if (tipo === 'pedido') {
      var p = pedidoActual();
      abajo = '<p class="ficha-linea">número de pedido: <b>' + esc(p ? p.numero : 'CD00000') + '</b></p>' +
        '<p class="ficha-linea">tu pedido se encuentra en: <b>' + esc(p ? p.estado : '—') + '</b></p>' +
        '<p class="ficha-linea">días de envío: <b>' + (p ? Number(p.dias_envio) || 0 : 0) + ' días</b></p>';
    } else {
      abajo = '<p class="ficha-nombre">' + esc((c.nombre + ' ' + c.apellidos).trim() || 'nombre y apellidos') + '</p>';
    }
    return '<div class="ficha-top">' +
      '<label class="foto" aria-label="Cambiar foto de perfil">' + (foto ? '<img src="' + foto + '" alt="">' : ico('camara')) +
      '<input type="file" accept="image/*" id="inputFoto"></label>' +
      '<div class="ficha-txt"><p class="ficha-id">' + esc(c.id) + '</p>' + abajo + '</div>' +
      '<button type="button" class="btn-ajustes" id="btnAjustes" aria-label="Ajustes" aria-expanded="false">' + ico('ajustes') + '</button>' +
      '</div>' +
      '<div class="menu-ajustes" id="menuAjustes" hidden>' +
      '<button type="button" id="btnRefrescar">Actualizar datos</button>' +
      '<button type="button" id="btnSalir">Cerrar sesión</button></div>';
  }

  /* ---- Vistas ---- */
  var V = {};

  V.inicio = function () {
    var esp = E.productos.filter(function (p) { return p.especial_hoy; })[0] || E.productos[0];
    var ofertas = E.productos.filter(function (p) { return p.oferta; });
    var novedades = E.productos.filter(function (p) { return p.novedad; });
    var reco = recomendaciones();
    return '' +
      '<section class="hero">' +
      '<h1>¿Qué te apetece hoy?</h1><p>Te ofrecemos muchas variedades</p>' +
      '<img class="hero-galletas" src="assets/productos/cookies.jpg" alt="">' +
      '</section>' +
      '<h2 class="etq">Filtros</h2>' + filtrosHTML([], false) +
      (esp ? '<h2 class="etq">Especial de hoy</h2>' + tarjetaCrema(esp, 'especial') : '') +
      '<h2 class="etq">Ofertas</h2>' + carrusel(ofertas, 'ofertas') + '<div class="raya"></div>' +
      '<h2 class="etq">Novedades</h2>' + carrusel(novedades, 'novedades') +
      '<h2 class="etq">Recomendaciones</h2>' +
      (E.cliente.encuesta
        ? (reco.length ? carrusel(reco, 'reco') + '<div style="height:14px"></div>' : '<p class="nota-reco">Ahora mismo no hay productos que cumplan todas tus preferencias. ¡Pronto habrá más!</p>')
        : '<p class="nota-reco">Cuéntanos qué puedes comer y qué te gusta, y te recomendamos productos.</p>') +
      '<a class="btn-encuesta" href="#encuesta">Encuesta de preferencias <span class="play">' + ico('play') + '</span></a>';
  };

  V.buscar = function () {
    var q = norm(E.buscar.q).trim(), f = E.buscar.f;
    var lista = E.productos.filter(function (p) {
      var okQ = !q || norm(p.nombre + ' ' + p.categoria + ' ' + p.descripcion).indexOf(q) > -1 ||
        q.split(/\s+/).every(function (w) { return norm(p.nombre).indexOf(w.replace(/s$/, '')) > -1; });
      var okF = f.every(function (id) { var fl = FILTROS.filter(function (x) { return x.id === id; })[0]; return p[fl.campo]; });
      return okQ && okF;
    });
    var desc = [];
    if (E.buscar.q) desc.push('«' + E.buscar.q + '»');
    f.forEach(function (id) { desc.push(FILTROS.filter(function (x) { return x.id === id; })[0].label); });
    var res = lista.map(function (p, i) {
      return '<article class="prod-marron' + (i % 2 ? ' dcha' : '') + '" style="animation-delay:' + (i * 0.06) + 's">' +
        '<img src="' + esc(img(p.imagen)) + '" alt="' + esc(p.nombre) + '" loading="lazy">' +
        '<div><h3>' + esc(p.nombre) + '</h3>' + (etiquetas(p) ? '<p class="meta">' + esc(etiquetas(p)) + '</p>' : '') + '<p class="precio">' + esc(precio(p.precio)) + '</p></div>' +
        btnFav(p) + '</article>';
    }).join('');
    return '<section class="resultados">' +
      '<div class="res-info"><span>' + lista.length + (lista.length === 1 ? ' producto' : ' productos') + (desc.length ? ' · ' + esc(desc.join(' + ')) : '') + '</span>' +
      (desc.length ? '<button type="button" id="limpiar">Ver todo</button>' : '') + '</div>' +
      (res || '<p class="vacio"><span class="serif">Vaya…</span>No hay productos con esa búsqueda. Prueba con otra palabra o quita algún filtro.</p>') +
      '</section>' +
      '<h2 class="etq">Filtros</h2>' + filtrosHTML(f, true);
  };

  var OPC = {
    alergias: ['Gluten', 'Lactosa', 'Huevo', 'Frutos secos', 'Soja', 'Cacahuete', 'Sésamo'],
    dieta: ['Vegana', 'Vegetariana', 'Sin azúcar'],
    gustos: ['Chocolate', 'Frutas', 'Cremas', 'Bollería', 'Tartas', 'Galletas']
  };
  V.encuesta = function () {
    var enc = E.cliente.encuesta || { alergias: [], dieta: [], gustos: [] };
    function grupo(clave, titulo) {
      var marc = (enc[clave] || []).map(norm);
      return '<fieldset><legend>' + titulo + '</legend><div class="chips">' +
        OPC[clave].map(function (o) {
          return '<label class="chip"><input type="checkbox" name="' + clave + '" value="' + esc(o) + '"' + (marc.indexOf(norm(o)) > -1 ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('') + '</div></fieldset>';
    }
    return '<form class="panel encuesta" id="formEncuesta">' +
      '<p class="sup">Recomendaciones</p><h2>Encuesta de preferencias</h2>' +
      grupo('alergias', 'Alergias e intolerancias') +
      grupo('dieta', 'Dieta') +
      grupo('gustos', 'Lo que más te gusta') +
      '<p class="aviso">Con esto te recomendamos productos en el inicio. En la tienda, avisa siempre de tus alergias: todo se prepara sin contaminación cruzada.</p>' +
      '<button class="btn-naranja" type="submit">Guardar</button>' +
      '</form>';
  };

  function pestanas(activa) {
    var t = [['perfil', 'info', 'Información'], ['favoritos', 'corazonR', 'Favoritos'], ['pedido', 'cesta', 'Pedido']];
    return '<nav class="pestanas" aria-label="Ficha">' + t.map(function (x) {
      return '<a href="#' + x[0] + '"' + (x[0] === activa ? ' class="on" aria-current="page"' : '') + ' aria-label="' + x[2] + '">' + ico(x[1]) + '</a>';
    }).join('') + '</nav>';
  }

  V.perfil = function () {
    var c = E.cliente;
    return '<h1 class="titulo-ficha">Ficha del cliente</h1>' +
      '<section class="panel ficha-panel">' + pestanas('perfil') +
      '<div class="tarjeta-tiempo"><p>tiempo<br>restante<br>cupones</p>' +
      '<div class="contador" aria-label="' + c.dias_restantes + ' días"><b>' + c.dias_restantes + '</b><small>DÍAS</small></div></div>' +
      '<a class="mini-sellos" href="#sellos"><span>Tarjeta de sellos</span><b>' + c.sellos + ' / 10</b></a>' +
      '<dl class="datos"><dt>Nombre</dt><dd>' + esc((c.nombre + ' ' + c.apellidos).trim() || '—') + '</dd>' +
      '<dt>ID de cliente</dt><dd>' + esc(c.id) + '</dd>' +
      (c.encuesta ? '<dt>Tus preferencias</dt><dd>' + esc(resumenEncuesta(c.encuesta)) + '</dd>' : '') +
      '</dl></section>';
  };

  function resumenEncuesta(enc) {
    var t = (enc.alergias || []).map(function (a) { return 'sin ' + a.toLowerCase(); })
      .concat((enc.dieta || []).map(function (d) { return d.toLowerCase(); }));
    return t.length ? t.join(', ') : 'Sin restricciones';
  }

  V.favoritos = function () {
    var favs = E.cliente.favoritos.map(producto).filter(Boolean);
    return '<h1 class="titulo-ficha">Ficha del cliente</h1>' +
      '<section class="panel ficha-panel">' + pestanas('favoritos') +
      (favs.length ? favs.map(function (p, i) {
        return '<article class="fav" style="animation-delay:' + (i * 0.07) + 's"><h3>' + esc(p.nombre) + '</h3>' +
          '<img src="' + esc(img(p.imagen)) + '" alt="" loading="lazy">' +
          '<button type="button" class="quitar" data-fav="' + esc(p.id) + '" aria-label="Quitar ' + esc(p.nombre) + ' de favoritos">' + ico('corazon') + '</button></article>';
      }).join('') : '<p class="vacio"><span class="serif">Aún no hay favoritos</span>Pulsa el corazón de cualquier producto para guardarlo aquí.</p>') +
      '</section>';
  };

  var ESTADOS = ['cocina', 'horno', 'listo para recoger', 'entregado'];
  var ICO_ESTADO = ['olla', 'horno', 'bolsa', 'check'];
  function pedidoActual() {
    if (!E.pedidos || !E.pedidos.length) return null;
    return E.pedidos[Math.min(E.pedidoSel, E.pedidos.length - 1)];
  }
  V.pedido = function () {
    var top = '<h1 class="titulo-ficha">Ficha del cliente</h1><section class="panel ficha-panel">' + pestanas('pedido');
    if (E.pedidos == null) return top + '<p class="cargando">Cargando tu pedido…</p></section>';
    var p = pedidoActual();
    if (!p) return top + '<p class="vacio"><span class="serif">Sin pedidos</span>Cuando hagas un encargo lo podrás seguir desde aquí.</p></section>';
    var idx = Math.max(0, ESTADOS.indexOf(norm(p.estado)));
    var hist = E.pedidos.length > 1 ? '<div class="historial"><h4>Tus pedidos</h4>' + E.pedidos.map(function (x, i) {
      return '<button type="button" data-pedido="' + i + '" class="' + (x === p ? 'on' : '') + '"><span>' + esc(x.numero) + '</span><span>' + esc(x.estado) + '</span></button>';
    }).join('') + '</div>' : '';
    return top + '<div class="pedido-estado"><p class="num">' + esc(p.numero) + '</p>' +
      '<p style="margin-top:4px;color:#F2D3A8">' + (p.fecha ? 'Pedido del ' + esc(p.fecha) : '') + '</p>' +
      '<ol class="pasos"><span class="barra" style="width:0" data-ancho="' + (idx / 3 * 75) + '%"></span>' + ESTADOS.map(function (s, i) {
        return '<li class="' + (i < idx || (i === idx && i === 3) ? 'hecho' : '') + (i === idx && i < 3 ? ' actual hecho' : '') + '"><i>' + ico(ICO_ESTADO[i]) + '</i>' + s + '</li>';
      }).join('') + '</ol></div>' + hist + '</section>';
  };

  V.sellos = function () {
    var c = E.cliente, n = c.sellos;
    var vistos = LS.get('sellosVistos.' + c.id, 0);
    if (vistos > n) vistos = 0; // tarjeta reiniciada
    var casillas = '';
    for (var i = 1; i <= 10; i++) {
      var llena = i <= n, nueva = llena && i > vistos;
      var premio = i === 4 || i === 8 ? '<span class="premio">-50 %</span>' : i === 10 ? '<span class="premio esp">Artículo especial</span>' : '';
      casillas += '<div class="casilla' + (llena ? ' llena' : '') + (nueva ? ' nueva' : '') + '"' +
        (nueva ? ' style="animation-delay:' + (0.35 + (i - vistos - 1) * 0.28) + 's"' : '') +
        ' aria-label="Casilla ' + i + (llena ? ', con sello' : ', vacía') + '">' + (llena ? '' : i) +
        '<span class="sello"' + (nueva ? ' style="animation-delay:' + (0.35 + (i - vistos - 1) * 0.28) + 's"' : '') + '><img src="assets/pan-n.png" alt=""></span>' + premio + '</div>';
    }
    LS.set('sellosVistos.' + c.id, n);

    var cupones = '';
    if (n >= 4) cupones += cupon('-50 %', 'Cupón de la casilla 4', 'Enséñalo en caja para tu descuento.', 0);
    if (n >= 8) cupones += cupon('-50 %', 'Cupón de la casilla 8', 'Otro descuento del 50 % en tu próxima compra.', 1);
    var completo = '';
    if (n >= 10) {
      if (c.canjeado) completo = '<div class="completo"><h3>¡Regalo canjeado!</h3><p>Ya disfrutaste tu artículo especial. Pide una tarjeta nueva en la tienda.</p></div>';
      else if (c.dias_restantes > 0) completo = '<div class="completo"><h3>¡Bono completo!</h3><p>Tienes <b>' + c.dias_restantes + (c.dias_restantes === 1 ? ' día' : ' días') + '</b> para canjear tu artículo especial.</p></div>';
      else completo = '<div class="completo"><h3>Bono completo</h3><p>El plazo de 30 días para canjear el artículo especial ha terminado.</p></div>';
    }
    var faltan = n < 4 ? 4 - n : n < 8 ? 8 - n : 10 - n;
    var siguiente = n < 10 ? '<p class="letra-pequena" style="font-size:15px;color:#F7F0E3;margin-top:16px">' +
      (faltan === 1 ? 'Te falta <b>1 sello</b>' : 'Te faltan <b>' + faltan + ' sellos</b>') + ' para ' + (n < 8 ? 'tu próximo -50 %' : 'el artículo especial') + '.</p>' : '';

    return '<section class="bono">' +
      '<div class="lineap"></div><h2>Bono canjeable</h2><div class="lineap"></div>' +
      '<div class="quien"><span>Cliente: <b>' + esc((c.nombre + ' ' + c.apellidos).trim()) + '</b></span><span>ID: <b>' + esc(c.id) + '</b></span></div>' +
      '<div class="casillas">' + casillas + '</div>' +
      '</section>' + siguiente + completo +
      (cupones ? '<div class="cupones">' + cupones + '</div>' : '') +
      '<p class="letra-pequena">El sello se pone por cada visita en la que compras, no por producto. Los sellos los pone el personal de paNeo en la tienda.</p>';
  };
  function cupon(big, titulo, txt, i) {
    return '<div class="cupon" style="animation-delay:' + (0.2 + i * 0.1) + 's"><span class="big">' + big + '</span><p><b>' + titulo + '</b>' + txt + '</p></div>';
  }

  /* ================================================================ */
  /* Router                                                            */
  /* ================================================================ */
  var TAB = { inicio: 'inicio', buscar: 'inicio', encuesta: 'inicio', sellos: 'sellos', perfil: 'perfil', favoritos: 'perfil', pedido: 'pedido' };
  var CAB_FICHA = { perfil: 1, favoritos: 1, pedido: 1 };

  function ruta() {
    var h = (location.hash || '#inicio').slice(1);
    var partes = h.split('?');
    return { nombre: V[partes[0]] ? partes[0] : 'inicio', params: new URLSearchParams(partes[1] || '') };
  }

  var rutaPrevia = null;
  function render() {
    if (!E.sesion || !E.cliente) return mostrarLogin();
    $('#login').hidden = true;
    $('#app').hidden = false;
    var r = ruta();
    if (r.nombre !== 'buscar') E.buscar = { q: '', f: [] };
    if (r.nombre === 'buscar') {
      E.buscar.q = r.params.get('q') || '';
      E.buscar.f = (r.params.get('f') || '').split(',').filter(function (x) { return FILTROS.some(function (f) { return f.id === x; }); });
    }
    if (r.nombre === 'pedido' && E.pedidos == null) cargarPedidos().then(function () { if (ruta().nombre === 'pedido') render(); });

    var cab = $('#cab');
    var esFicha = !!CAB_FICHA[r.nombre];
    cab.className = 'cab' + (esFicha ? ' ficha' : '');
    cab.innerHTML = esFicha ? cabFicha(r.nombre) : cabBuscar();

    var main = $('#main');
    var mismaVista = rutaPrevia === r.nombre;
    var scroll = main.scrollTop;
    main.innerHTML = V[r.nombre](r.params);
    main.scrollTop = mismaVista && r.nombre !== 'buscar' ? scroll : 0;
    rutaPrevia = r.nombre;

    $$('.tabbar a').forEach(function (a) {
      var on = a.getAttribute('data-tab') === TAB[r.nombre];
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    enlazar(r.nombre);
  }

  function irBuscar(q, f) {
    var p = [];
    if (q) p.push('q=' + encodeURIComponent(q));
    if (f && f.length) p.push('f=' + f.join(','));
    location.hash = '#buscar' + (p.length ? '?' + p.join('&') : '');
  }

  function enlazar(nombre) {
    var form = $('#formBuscar');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = $('#q').value.trim();
      $('#q').blur();
      irBuscar(q, nombre === 'buscar' ? E.buscar.f : []);
    });

    $$('[data-filtro]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-filtro');
        if (nombre !== 'buscar') return irBuscar('', [id]);
        var f = E.buscar.f.slice(), i = f.indexOf(id);
        if (i === -1) f.push(id); else f.splice(i, 1);
        irBuscar(E.buscar.q, f);
      });
    });
    var limpiar = $('#limpiar');
    if (limpiar) limpiar.addEventListener('click', function () { irBuscar('', []); });

    $$('[data-fav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        alternarFav(b.getAttribute('data-fav'), b.classList.contains('quitar') ? null : b);
        if (nombre === 'favoritos') render();
      });
    });

    $$('[data-carrusel]').forEach(function (c) {
      var puntos = $('[data-puntos="' + c.getAttribute('data-carrusel') + '"]');
      if (!puntos) return;
      c.addEventListener('scroll', function () {
        var w = c.firstElementChild ? c.firstElementChild.offsetWidth + 14 : 1;
        var i = Math.round(c.scrollLeft / w);
        $$('i', puntos).forEach(function (p, j) { p.classList.toggle('on', i === j); });
      }, { passive: true });
    });

    var fe = $('#formEncuesta');
    if (fe) fe.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (n) { return $$('input[name="' + n + '"]:checked', fe).map(function (i) { return i.value; }); };
      var datos = { alergias: val('alergias'), dieta: val('dieta'), gustos: val('gustos') };
      var btn = $('button[type="submit"]', fe);
      btn.disabled = true; btn.textContent = 'Guardando…';
      E.cliente.encuesta = datos;
      guardarCliente(E.cliente);
      post(conSesion({ action: 'encuesta', alergias: datos.alergias, dieta: datos.dieta, gustos: datos.gustos }))
        .then(function (r) { if (r && r.ok && r.cliente) guardarCliente(r.cliente); toast('¡Guardado! Mira tus recomendaciones'); })
        .catch(function () { toast('Guardado en este móvil (sin conexión)'); })
        .then(function () { location.hash = '#inicio'; setTimeout(function () { var m = $('#main'); m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }); }, 120); });
    });

    $$('[data-pedido]').forEach(function (b) {
      b.addEventListener('click', function () { E.pedidoSel = Number(b.getAttribute('data-pedido')); render(); });
    });
    var barra = $('.pasos .barra');
    if (barra) requestAnimationFrame(function () { requestAnimationFrame(function () { barra.style.width = barra.getAttribute('data-ancho'); }); });

    var aj = $('#btnAjustes');
    if (aj) {
      aj.addEventListener('click', function (e) {
        e.stopPropagation();
        var m = $('#menuAjustes');
        m.hidden = !m.hidden;
        aj.setAttribute('aria-expanded', String(!m.hidden));
      });
      $('#btnSalir').addEventListener('click', cerrarSesion);
      $('#btnRefrescar').addEventListener('click', function () {
        $('#menuAjustes').hidden = true;
        E.pedidos = null;
        Promise.all([refrescarCliente(), cargarProductos()]).then(function () { render(); toast('Datos actualizados'); });
      });
    }
    var inFoto = $('#inputFoto');
    if (inFoto) inFoto.addEventListener('change', function () {
      var f = inFoto.files && inFoto.files[0];
      if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        var im = new Image();
        im.onload = function () {
          var cv = document.createElement('canvas'), s = 200, lado = Math.min(im.width, im.height);
          cv.width = cv.height = s;
          cv.getContext('2d').drawImage(im, (im.width - lado) / 2, (im.height - lado) / 2, lado, lado, 0, 0, s, s);
          LS.set('foto.' + E.cliente.id, cv.toDataURL('image/jpeg', 0.8));
          render();
          toast('Foto guardada en este móvil');
        };
        im.src = lector.result;
      };
      lector.readAsDataURL(f);
    });
  }
  document.addEventListener('click', function () { var m = $('#menuAjustes'); if (m && !m.hidden) m.hidden = true; });

  /* ================================================================ */
  /* Login                                                             */
  /* ================================================================ */
  function mostrarLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#loginDemo').hidden = HAY_API;
  }
  function cerrarSesion() {
    E.sesion = null; E.cliente = null; E.pedidos = null;
    LS.del('sesion'); LS.del('cliente');
    location.hash = '#inicio';
    mostrarLogin();
  }

  $('#loginId').addEventListener('input', function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('#loginPin').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('#loginId').value.trim().toUpperCase(), pin = $('#loginPin').value.trim();
    var err = $('#loginError'), btn = $('#loginBtn'), form = $('#loginForm');
    err.textContent = '';
    form.classList.remove('error');
    if (!/^[A-Z]{2}\d{6}$/.test(id)) { err.textContent = 'El ID tiene 2 letras y 6 números (AA000000).'; void form.offsetWidth; form.classList.add('error'); return; }
    if (!/^\d{4}$/.test(pin)) { err.textContent = 'El PIN tiene 4 cifras.'; void form.offsetWidth; form.classList.add('error'); return; }
    btn.disabled = true; btn.textContent = 'Entrando…';
    post({ action: 'login', id: id, pin: pin }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || 'ID o PIN incorrectos');
      E.sesion = { id: id, pin: pin };
      LS.set('sesion', E.sesion);
      guardarCliente(r.cliente);
      E.pedidos = null;
      $('#loginPin').value = '';
      if (!location.hash || location.hash === '#') location.hash = '#inicio';
      render();
      toast('¡Hola, ' + (r.cliente.nombre || 'bienvenido') + '!');
    }).catch(function (x) {
      err.textContent = /fetch|network|timeout/i.test(x.message) ? 'No hay conexión. Inténtalo de nuevo.' : x.message;
      void form.offsetWidth; form.classList.add('error');
    }).then(function () { btn.disabled = false; btn.textContent = 'Entrar'; });
  });

  /* ================================================================ */
  /* Arranque                                                          */
  /* ================================================================ */
  pintarIconos(document);
  window.addEventListener('hashchange', render);
  render();
  // Refresca en segundo plano y solo repinta si algo ha cambiado (para no cortar animaciones)
  var firma = function () { return JSON.stringify([E.cliente, E.productos]); };
  var firma0 = firma();
  Promise.all([cargarProductos(), E.sesion ? refrescarCliente() : null]).then(function () {
    if (E.cliente && firma() !== firma0) render();
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
