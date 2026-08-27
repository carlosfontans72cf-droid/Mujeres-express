import { db, auth } from './firebase.js';
import { collection, getDocs, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';

let datosCliente = {};
let carrito = [];
let mapa = null;
let marcadorRepartidor = null;
let idPedidoActivo = null;
let favoritos = [];

// 📋 CATEGORÍAS CON ÍCONOS PARA MOSTRAR AL CLIENTE
const CATEGORIAS_CON_ICONO = [
  { nombre: 'Todas', icono: '🏠' },
  { nombre: 'Panadería', icono: '🥖' },
  { nombre: 'Carnicería', icono: '🥩' },
  { nombre: 'Fiambrería', icono: '🧀' },
  { nombre: 'Verdulería', icono: '🥦' },
  { nombre: 'Rotisería', icono: '🍗' },
  { nombre: 'Lácteos y Huevos', icono: '🥛' },
  { nombre: 'Bebidas', icono: '🍺' },
  { nombre: 'Comida Casera', icono: '🍲' },
  { nombre: 'Ofertas', icono: '🔥' }
];

export async function mostrarPanelCliente(usuario) {
  datosCliente = usuario;
  carrito = [];
  favoritos = usuario.favoritos || [];

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <!-- ⚠️ AVISO ANTI-ESTAFA SIEMPRE ARRIBA -->
      <div style="background:#fff3cd; padding:10px; border-radius:6px; border:2px solid #ffc107; margin-bottom:12px; font-weight:bold;">
        ⚠️ MUJER EXPRESS NUNCA TE PIDE: dinero, claves, códigos ni datos de cuentas. Ni por correo, ni WhatsApp, ni llamada. ESAS PETICIONES SON ESTAFAS. NO RESPONDAS.
      </div>

      <h1>🛒 Panel Cliente — ${datosCliente.nombreCompleto || 'Cliente'}</h1>
      <p style="margin:4px 0;">📍 Entrega: ${datosCliente.direccion || 'Sin dirección'}</p>

      <!-- BUSCADOR PRINCIPAL -->
      <div style="margin:12px 0;">
        <input type="text" id="buscador_general" placeholder="🔍 Buscar producto, comercio o categoría..." style="width:100%; padding:10px; font-size:16px; border-radius:6px; border:1px solid #ccc;" oninput="buscarTodo(this.value)">
      </div>

      <!-- CATEGORÍAS CON BOTONES -->
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
        ${CATEGORIAS_CON_ICONO.map(c => `<button class="boton-principal" style="font-size:13px; padding:6px 10px;" onclick="filtrarPorCategoria('${c.nombre}')">${c.icono} ${c.nombre}</button>`).join('')}
      </div>
      <hr>

      <!-- SECCIONES PRINCIPALES -->
      <div class="fila-botones">
        <button class="boton-principal" onclick="verFavoritos()">⭐ Favoritos</button>
        <button class="boton-principal" onclick="verComercios()">🏪 Comercios</button>
        <button class="boton-principal" onclick="verCarrito()">🛒 Carrito (<span id="contador-carrito">0</span>)</button>
        <button class="boton-principal" onclick="verMisPedidos()">📋 Mis Pedidos</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <hr>

      <!-- ZONA DONDE SE CARGA TODO -->
      <div id="zona-trabajo"></div>
    </div>
  `;

  window.verComercios = verComercios;
  window.verFavoritos = verFavoritos;
  window.verCarrito = verCarrito;
  window.verMisPedidos = verMisPedidos;
  window.filtrarPorCategoria = filtrarPorCategoria;
  window.buscarTodo = buscarTodo;
  window.agregarAlCarrito = agregarAlCarrito;
  window.agregarQuitarFavorito = agregarQuitarFavorito;
  window.confirmarPedido = confirmarPedido;
  window.pagarPedido = pagarPedido;
  window.calificar = calificar;
  window.cerrarSesion = () => { window.location.reload(); };

  verComercios();
}

// ==========================================
// VER COMERCIOS CON OPCION DE FAVORITOS
// ==========================================
async function verComercios(soloFavoritos = false) {
  document.getElementById('zona-trabajo').innerHTML = '<p>Cargando comercios...</p>';
  const q = query(collection(db, 'usuarios'), where('rol', '==', 'comercio'), where('estado', '==', 'aprobado'), orderBy('calificacion', 'desc'));
  const snap = await getDocs(q);

  let html = soloFavoritos ? `<h2>⭐ Mis Comercios Favoritos</h2>` : `<h2>🏪 Comercios Disponibles</h2>`;
  html += '<div style="display:grid; gap:10px;">';
  let hayFavoritos = false;

  snap.forEach(d => {
    const c = d.data();
    const esFavorito = favoritos.includes(d.id);
    if (soloFavoritos && !esFavorito) return;
    hayFavoritos = true;

    html += `
      <div class="tarjeta" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <div onclick="verProductosComercio('${d.id}', '${c.nombreCompleto}')">
          <strong>${c.nombreCompleto}</strong> ⭐ ${c.calificacion ? c.calificacion.toFixed(1) : 'Sin calificar'}
        </div>
        <button style="background:transparent; border:none; font-size:22px; cursor:pointer;" onclick="event.stopPropagation(); agregarQuitarFavorito('${d.id}')">${esFavorito ? '⭐' : '☆'}</button>
      </div>
    `;
  });
  html += '</div>';

  if (soloFavoritos && !hayFavoritos) {
    html = '<h2>⭐ Mis Comercios Favoritos</h2><p class="texto-centro">Todavía no marcaste ningún comercio como favorito. Tocá la estrella ☆ al lado del comercio que te guste para agregarlo acá.</p>';
  }

  document.getElementById('zona-trabajo').innerHTML = html;
  window.verProductosComercio = verProductosComercio;
}

function verFavoritos() {
  verComercios(true);
}

async function agregarQuitarFavorito(idComercio) {
  const refUsuario = doc(db, 'usuarios', auth.currentUser.uid);
  if (favoritos.includes(idComercio)) {
    favoritos = favoritos.filter(id => id !== idComercio);
  } else {
    favoritos.push(idComercio);
  }
  await updateDoc(refUsuario, { favoritos });
  verComercios();
}

// ==========================================
// VER PRODUCTOS DE UN COMERCIO + FILTRO POR CATEGORÍA
// ==========================================
async function verProductosComercio(idComercio, nombreComercio) {
  document.getElementById('zona-trabajo').innerHTML = `<h2>🏪 ${nombreComercio}</h2><p>Cargando productos...</p>`;
  
  const q = query(collection(db, 'productos'), where('idComercio', '==', idComercio), where('activo', '==', true), orderBy('esOferta', 'desc'));
  onSnapshot(q, snap => {
    let html = `<h3>Productos</h3><div style="display:grid; gap:8px;">`;
    snap.forEach(d => {
      const p = d.data();
      const precioFinal = p.precioRebajado || p.precio;
      html += `
        <div class="tarjeta" data-nombre="${p.nombre.toLowerCase()}" data-categoria="${(p.categoria||'').toLowerCase()}">
          <strong>${p.nombre}</strong> ${p.esOferta ? '<span style="color:red;">🔥 OFERTA</span>' : ''}
          ${p.categoria ? `<small style="color:#666;">(${p.categoria})</small>` : ''}<br>
          ${p.descripcion || ''}<br>
          ${p.precioRebajado ? `<del>$${p.precio}</del> → ` : ''}<strong style="font-size:18px;">$${precioFinal}</strong>
          <div class="fila-botones" style="margin-top:8px;">
            <button class="boton-confirmar" onclick="agregarAlCarrito('${d.id}','${p.nombre}',${precioFinal})">➕ Agregar</button>
          </div>
        </div>
      `;
    });
    html += '</div><br><button class="boton-principal" onclick="verComercios()">← Volver a Comercios</button>';
    document.getElementById('zona-trabajo').innerHTML = html;
  });
}

// ==========================================
// FILTRAR POR CATEGORÍA DESDE LOS BOTONES
// ==========================================
function filtrarPorCategoria(nombreCat) {
  const todos = document.querySelectorAll('[data-nombre]');
  todos.forEach(tarjeta => {
    const cat = tarjeta.getAttribute('data-categoria') || '';
    const esOferta = tarjeta.innerHTML.includes('🔥 OFERTA');
    if (nombreCat === 'Todas') { tarjeta.style.display = ''; }
    else if (nombreCat === 'Ofertas') { tarjeta.style.display = esOferta ? '' : 'none'; }
    else { tarjeta.style.display = cat.includes(nombreCat.toLowerCase()) ? '' : 'none'; }
  });
}

// ==========================================
// BUSCADOR GENERAL
// ==========================================
function buscarTodo(texto) {
  const filtro = texto.toLowerCase().trim();
  const todos = document.querySelectorAll('[data-nombre]');
  if (!filtro) { todos.forEach(t => t.style.display = ''); return; }
  todos.forEach(tarjeta => {
    const nombre = tarjeta.getAttribute('data-nombre') || '';
    const cat = tarjeta.getAttribute('data-categoria') || '';
    tarjeta.style.display = (nombre.includes(filtro) || cat.includes(filtro)) ? '' : 'none';
  });
}

// ==========================================
// CARRITO Y PEDIDO
// ==========================================
function agregarAlCarrito(id, nombre, precio) {
  carrito.push({ id, nombre, precio, cantidad: 1 });
  document.getElementById('contador-carrito').textContent = carrito.length;
  alert(`✅ "${nombre}" agregado al carrito`);
}

function verCarrito() {
  if (carrito.length === 0) {
    document.getElementById('zona-trabajo').innerHTML = '<h2>🛒 Tu Carrito</h2><p class="texto-centro">El carrito está vacío. Agregá productos desde los comercios.</p>';
    return;
  }
  let total = carrito.reduce((s, i) => s + i.precio, 0);
  let html = `<h2>🛒 Tu Carrito</h2><div style="display:grid;gap:8px;">`;
  carrito.forEach(i => { html += `<div class="tarjeta">${i.nombre} — $${i.precio}</div>`; });
  html += `</div><hr><h3>Total: $${total}</h3>
    <div class="fila-botones">
      <button class="boton-confirmar" onclick="confirmarPedido()">✅ Confirmar Pedido</button>
      <button class="boton-alerta" onclick="carrito=[];document.getElementById('contador-carrito').textContent='0';verCarrito()">🗑️ Vaciar</button>
    </div>`;
  document.getElementById('zona-trabajo').innerHTML = html;
}

async function confirmarPedido() {
  if (carrito.length === 0) return alert('⚠️ El carrito está vacío.');
  const total = carrito.reduce((s, i) => s + i.precio, 0);

  const pedido = {
    idCliente: auth.currentUser.uid,
    nombreCliente: datosCliente.nombreCompleto,
    direccionCliente: datosCliente.direccion,
    latCliente: datosCliente.latitud,
    lngCliente: datosCliente.longitud,
    productos: carrito,
    total: total,
    estado: 'pendientePago',
    fecha: new Date()
  };

  const ref = await addDoc(collection(db, 'pedidos'), pedido);
  idPedidoActivo = ref.id;
  carrito = [];
  document.getElementById('contador-carrito').textContent = '0';

  document.getElementById('zona-trabajo').innerHTML = `
    <div class="tarjeta" style="background:#e8f5e9;">
      <h3>✅ Pedido Confirmado</h3>
      <p>Total a pagar: <strong>$${total}</strong></p>
      <p>Estado: ⏳ Esperando pago seguro...</p>
      <div class="fila-botones">
        <button class="boton-confirmar" onclick="pagarPedido('${ref.id}', ${total})">💳 IR A PAGAR</button>
      </div>
      <p style="font-size:13px; color:#555;">🔒 Pago seguro — La app NUNCA ve ni guarda tu número de tarjeta</p>
    </div>
  `;
}

async function pagarPedido(idPedido, total) {
  if (!confirm('Serás redirigido a una página segura para pagar.\n\n✅ La app NUNCA ve ni guarda tu número de tarjeta.\n¿Continuar?')) return;

  // Aquí se conectará la pasarela de pago real
  await updateDoc(doc(db, 'pedidos', idPedido), { estado: 'confirmadoPago', fechaPago: new Date() });
  alert('✅ PAGO CONFIRMADO.\nEl comercio recibirá tu pedido y lo aprobará pronto.');
  idPedidoActivo = idPedido;
}

// ==========================================
// HISTORIAL DE PEDIDOS
// ==========================================
async function verMisPedidos() {
  document.getElementById('zona-trabajo').innerHTML = '<p>Cargando historial...</p>';
  const q = query(collection(db, 'pedidos'), where('idCliente', '==', auth.currentUser.uid), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);

  let html = '<h2>📋 Mis Pedidos</h2>';
  if (snap.empty) { html += '<p class="texto-centro">Aún no hiciste ningún pedido.</p>'; }
  else {
    snap.forEach(d => {
      const p = d.data();
      html += `
        <div class="tarjeta">
          <strong>Pedido — ${p.fecha?.toDate().toLocaleDateString('es-UY')}</strong><br>
          Estado: ${p.estado.toUpperCase()} — Total: $${p.total}<br>
          Comercio: ${p.nombreComercio || 'Pendiente de aprobación'}
        </div>
      `;
    });
  }
  document.getElementById('zona-trabajo').innerHTML = html;
}

async function calificar(idPedido) {
  const puntos = parseInt(document.getElementById('puntos').value);
  const comentario = document.getElementById('comentarioCalif').value.trim();
  await updateDoc(doc(db, 'pedidos', idPedido), { calificacionCliente: puntos, comentarioCalif: comentario, calificadoPorCliente: true });
  alert('✅ ¡Gracias por tu calificación!');
  verMisPedidos();
}