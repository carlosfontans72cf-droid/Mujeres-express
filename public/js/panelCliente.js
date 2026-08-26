import { db, auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, doc, setDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { calcularMontos } from './calculos.js';

let carrito = [];
let comercioSeleccionado = null;

export async function mostrarPanelCliente(contenedor) {
  carrito = []; comercioSeleccionado = null;
  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>🏠 Panel Cliente</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      <div id="listaComercios"></div>
      <div id="seccionCarrito" class="oculto">
        <h3>🛒 Tu Pedido</h3>
        <div id="itemsCarrito"></div>
        <p><strong>Total:</strong> $<span id="totalPedido">0</span></p>
        <input type="text" id="comprobante" placeholder="N° de comprobante / referencia de pago">
        <button id="btnConfirmarPedido" class="exito">Confirmar Pedido</button>
        <button id="btnVaciarCarrito" class="alerta">Cancelar</button>
      </div>
      <hr style="margin:16px 0;">
      <h3>📋 Mis Pedidos</h3>
      <div id="listaPedidos"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  document.getElementById('btnConfirmarPedido').onclick = confirmarPedido;
  document.getElementById('btnVaciarCarrito').onclick = () => { carrito = []; comercioSeleccionado = null; cargarCarrito(); };

  await cargarComercios();
  await cargarMisPedidos();
}

async function cargarComercios() {
  const lista = document.getElementById('listaComercios');
  lista.innerHTML = '<p>Cargando comercios...</p>';
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'comercio'), where('estado', '==', 'aprobado')));
  lista.innerHTML = '';
  if (snap.empty) { lista.innerHTML = '<p>No hay comercios disponibles por ahora.</p>'; return; }
  snap.forEach(doc => {
    const c = doc.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `<h4>${c.nombreCompleto || 'Comercio sin nombre'}</h4><p>${c.direccion || ''}</p><button data-id="${doc.id}" class="btnVerProductos primario">Ver Productos</button>`;
    lista.appendChild(div);
  });
  document.querySelectorAll('.btnVerProductos').forEach(btn => {
    btn.onclick = async e => { comercioSeleccionado = e.target.dataset.id; await cargarProductosDelComercio(comercioSeleccionado); };
  });
}

async function cargarProductosDelComercio(idComercio) {
  carrito = [];
  const snap = await getDocs(query(collection(db, 'productos'), where('idComercio', '==', idComercio), where('disponible', '==', true)));
  const lista = document.getElementById('listaComercios');
  lista.innerHTML = '<h3>Productos disponibles</h3><div id="listaProds"></div><button id="btnVolverComercios">← Volver a comercios</button>';
  const caja = document.getElementById('listaProds');
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `<p><strong>${p.nombre}</strong> — $${p.precio.toFixed(2)}</p><p>${p.descripcion || ''}</p><button data-id="${doc.id}" data-nombre="${p.nombre}" data-precio="${p.precio}" class="btnAgregar">+ Agregar al carrito</button>`;
    caja.appendChild(div);
  });
  document.getElementById('btnVolverComercios').onclick = cargarComercios;
  document.querySelectorAll('.btnAgregar').forEach(btn => {
    btn.onclick = e => { const {id, nombre, precio} = e.target.dataset; carrito.push({id, nombre, precio: Number(precio)}); cargarCarrito(); };
  });
}

function cargarCarrito() {
  const seccion = document.getElementById('seccionCarrito');
  const items = document.getElementById('itemsCarrito');
  const total = document.getElementById('totalPedido');
  if (carrito.length === 0) { seccion.classList.add('oculto'); return; }
  seccion.classList.remove('oculto');
  let suma = 0; items.innerHTML = '';
  carrito.forEach((it, n) => { suma += it.precio; const p = document.createElement('p'); p.textContent = `${n+1}. ${it.nombre} — $${it.precio.toFixed(2)}`; items.appendChild(p); });
  total.textContent = suma.toFixed(2);
}

async function confirmarPedido() {
  const comprobante = document.getElementById('comprobante').value.trim();
  if (!comprobante) return alert('Ingrese el comprobante de pago.');
  const suma = carrito.reduce((a, b) => a + b.precio, 0);
  const montos = await calcularMontos(suma);
  await addDoc(collection(db, 'pedidos'), {
    idCliente: auth.currentUser.uid, idComercio: comercioSeleccionado, items: carrito, totalBruto: suma, montos,
    estado: 'pendienteAprobacionComercio', comprobantePago: comprobante, fechaCreacion: serverTimestamp(),
    calificacionComercio: null, calificacionRepartidor: null
  });
  alert('✅ Pedido confirmado. Esperando aprobación del comercio.');
  carrito = []; comercioSeleccionado = null; cargarCarrito(); await cargarComercios(); await cargarMisPedidos();
}

async function cargarMisPedidos() {
  const snap = await getDocs(query(collection(db, 'pedidos'), where('idCliente', '==', auth.currentUser.uid), orderBy('fechaCreacion', 'desc')));
  const caja = document.getElementById('listaPedidos'); caja.innerHTML = '';
  if (snap.empty) { caja.innerHTML = '<p>No tienes pedidos aún.</p>'; return; }
  const estilos = { pendienteAprobacionComercio:'⏳ Pendiente de aprobación', aprobadoEsperaRepartidor:'✅ Aprobado — esperando repartidor', aceptadoPorRepartidor:'🛵 En camino', entregado:'✅ Entregado', cancelado:'❌ Cancelado' };
  snap.forEach(doc => {
    const p = doc.data();
    let calif = '';
    if (p.estado === 'entregado' && !p.calificacionComercio) calif = `<div><p>⭐ Calificar:</p><select data-pedido="${doc.id}" class="selCalif"><option value="">Seleccione</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></div>`;
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `<p><strong>Total:</strong> $${p.totalBruto ? p.totalBruto.toFixed(2):'0.00'}</p><p><strong>Estado:</strong> ${estilos[p.estado]||p.estado}</p>${calif}`;
    caja.appendChild(div);
  });
  document.querySelectorAll('.selCalif').forEach(sel => {
    sel.onchange = async e => { const v = Number(e.target.value); if(!v)return; await setDoc(doc(db,'pedidos',e.target.dataset.pedido),{calificacionComercio:v},{merge:true}); alert('✅ Calificado'); cargarMisPedidos(); };
  });
}