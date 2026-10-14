// URL de la aplicación web de Google Apps Script (acaba en /exec).
// Mientras no la pegues, la app y la web funcionan con los datos de respaldo de abajo.
const API_URL = "PEGAR_AQUI_URL_APPS_SCRIPT";

// ---------------------------------------------------------------------------
// Datos de respaldo (modo demo). Solo se usan si API_URL no está puesta o si
// la API no responde. Son los mismos que crea setup() en la Google Sheet.
// ---------------------------------------------------------------------------
const PANEO_RESPALDO = {
  productos: [
    { id: "P01", nombre: "Tarta de zanahoria vegana", categoria: "Tartas", precio: 34.99, sin_gluten: false, vegano: true, cero_azucar: false, sin_lactosa: true, imagen: "assets/productos/tarta-zanahoria.jpg", especial_hoy: true, oferta: true, novedad: false, descripcion: "Bizcocho de zanahoria y nueces con crema vegana." },
    { id: "P02", nombre: "Muffins de arándanos", categoria: "Bollería", precio: 0, sin_gluten: true, vegano: false, cero_azucar: false, sin_lactosa: false, imagen: "assets/productos/muffins-arandanos.jpg", especial_hoy: false, oferta: true, novedad: false, descripcion: "Esponjosos y con arándanos enteros." },
    { id: "P03", nombre: "Muffins con chocolate", categoria: "Bollería", precio: 0, sin_gluten: false, vegano: true, cero_azucar: false, sin_lactosa: true, imagen: "assets/productos/muffins-chocolate.jpg", especial_hoy: false, oferta: false, novedad: true, descripcion: "Doble de chocolate, sin nada de origen animal." },
    { id: "P04", nombre: "Cupcakes decorativos", categoria: "Cupcakes", precio: 0, sin_gluten: false, vegano: false, cero_azucar: true, sin_lactosa: false, imagen: "assets/productos/cupcakes.jpg", especial_hoy: false, oferta: false, novedad: true, descripcion: "Para celebrar, decorados a mano." },
    { id: "P05", nombre: "Cookies", categoria: "Galletas", precio: 0, sin_gluten: true, vegano: true, cero_azucar: false, sin_lactosa: true, imagen: "assets/productos/cookies.jpg", especial_hoy: false, oferta: true, novedad: false, descripcion: "Crujientes por fuera, blanditas por dentro." },
    { id: "P06", nombre: "Croissant", categoria: "Bollería", precio: 0, sin_gluten: true, vegano: false, cero_azucar: false, sin_lactosa: false, imagen: "assets/productos/croissant.jpg", especial_hoy: false, oferta: false, novedad: true, descripcion: "Hojaldrado y dorado, recién horneado." },
    { id: "P07", nombre: "Cheesecake", categoria: "Tartas", precio: 0, sin_gluten: true, vegano: false, cero_azucar: true, sin_lactosa: false, imagen: "assets/productos/cheesecake.jpg", especial_hoy: false, oferta: false, novedad: true, descripcion: "Cremosa, con base crujiente." }
  ],
  // Solo para el modo demo: en cuanto hay API_URL, estos clientes se ignoran.
  clientes: [
    { id: "AA000001", pin: "1234", nombre: "Lucía", apellidos: "Baró", sellos: 3, dias_completado: null, canjeado: false, favoritos: ["P01", "P05"] },
    { id: "AA000002", pin: "2345", nombre: "Hernán", apellidos: "de Lorenzo", sellos: 8, dias_completado: null, canjeado: false, favoritos: ["P06", "P07"] },
    { id: "AA000003", pin: "3456", nombre: "Alba", apellidos: "Navarro", sellos: 10, dias_completado: 5, canjeado: false, favoritos: ["P05", "P06", "P07"] }
  ],
  pedidos: [
    { numero: "CD00001", id_cliente: "AA000001", estado: "cocina", dias_envio: 2, fecha: "14/10/2026" }
  ]
};
