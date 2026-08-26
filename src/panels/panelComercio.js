import { db, auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { calcularMontos } from '../utils/calculos.js';

let idComercio = null;

export async function mostrarPanelComercio(contenedor, uidComercio) {
  idComercio = uidComercio;

  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>🏪 Panel Comerciante</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      
      <h3>📋 Pedidos Recibidos</h3>
      <div id="listaPedidosComercio"></div>
      
      <hr style="margin:16px 0;">
      <h3>📦 Mis Productos</h3>
      <button id="btnNuevoProducto" class="primario">+ Agregar Producto</button>
      <div id="listaProductos"></div>
      
      <hr style="margin:16px 0;">
      <h3>💰 Mis Cuentas / Resumen</h3>
      <div id="resumenComercio"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  document.getElementById('btnNuevoProducto').onclick = formularioProducto;

  await cargarPedidos();
  await cargarProductos();
  await cargarResumen();
}

async function cargarPedidos() {
  const snap = await getDocs(query(collection(db, 'pedidos'), where('idComercio', '==', idComercio), orderBy('fechaCreacion', 'desc')));
  const caja = document.getElementById('listaPedidosComercio');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No tiene pedidos.</p>'; return; }
  snap.forEach(async documento => {
    const p = documento.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p><strong>Total:</strong> $${p.totalBruto?.toFixed(2) || '0.00'}</p>
      <p>Comprobante: ${p.comprobantePago || 'No informado'}</p>
      <p>Su parte: $${p.montos?.montoComercio?.toFixed(2) || '—'}</p>
      <p><strong>Estado:</strong> ${p.estado}</p>
      ${p.estado === 'pendienteAprobacionComercio' ? `
        <button data-id="${documento.id}" class="btnAprobar exito">✅ Aprobar Pedido</button>
        <button data-id="${documento.id}" class="btnRechazar peligro">❌ Rechazar</button>
      ` : ''}
      ${p.estado === 'aceptadoPorRepartidor' ? `
        <button data-id="${documento.id}" class="btnEntregado exito">✅ Marcar Entregado</button>
      ` : ''}
    `;
    caja.appendChild(div);
  });

  document.querySelectorAll('.btnAprobar').forEach(btn => {
    btn.onclick = async e => {
      await updateDoc(doc(db, 'pedidos', e.target.dataset.id), { estado: 'aprobadoEsperaRepartidor' });
      alert('✅ Pedido aprobado.'); cargarPedidos();
    };
  });
  document.querySelectorAll('.btnRechazar').forEach(btn => {
    btn.onclick = async e => {
      if (!confirm('¿Seguro de rechazar?')) return;
      await updateDoc(doc(db, 'pedidos', e.target.dataset.id), { estado: 'cancelado' });
      alert('❌ Pedido rechazado.'); cargarPedidos();
    };
  });
  document.querySelectorAll('.btnEntregado').forEach(btn => {
    btn.onclick = async e => {
      await updateDoc(doc(db, 'pedidos', e.target.dataset.id), { estado: 'entregado' });
      alert('✅ Pedido marcado como entregado.'); cargarPedidos();
    };
  });
}

function formularioProducto() {
  const nombre = prompt('Nombre del producto:');
  if (!nombre) return;
  const precio = Number(prompt('Precio:'));
  if (!precio || precio <= 0) return alert('Precio inválido.');
  const descripcion = prompt('Descripción (opcional):') || '';

  addDoc(collection(db, 'productos'), {
    idComercio, nombre, precio, descripcion, disponible: true,
    fechaCreacion: serverTimestamp(), oferta: false, vencimientoOferta: null
  }).then(() => { alert('✅ Producto agregado.'); cargarProductos(); });
}

async function cargarProductos() {
  const snap = await getDocs(query(collection(db, 'productos'), where('idComercio', '==', idComercio)));
  const caja = document.getElementById('listaProductos');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No tiene productos.</p>'; return; }
  snap.forEach(p => {
    const datos = p.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p><strong>${datos.nombre}</strong> — $${datos.precio.toFixed(2)}</p>
      <p>${datos.descripcion || ''}</p>
      <label><input type="checkbox" ${datos.oferta ? 'checked' : ''} onchange="alert('Edición desde próxima versión')"> En oferta</label>
    `;
    caja.appendChild(div);
  });
}

async function cargarResumen() {
  const snap = await getDocs(query(collection(db, 'pedidos'), where('idComercio', '==', idComercio), where('estado', '==', 'entregado')));
  let total = 0, cantidad = 0;
  snap.forEach(p => {
    cantidad++;
    total += p.data().montos?.montoComercio || 0;
  });
  document.getElementById('resumenComercio').innerHTML = `
    <p>Pedidos completados: ${cantidad}</p>
    <p><strong>Total a favor del comercio: $${total.toFixed(2)}</strong></p>
  `;
}