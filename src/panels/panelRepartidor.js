import { db, auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const uidRepartidor = () => auth.currentUser?.uid;

export async function mostrarPanelRepartidor(contenedor) {
  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>🛵 Panel Repartidor</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      
      <h3>📋 Pedidos Disponibles</h3>
      <p><em>El primero que acepta, se lo queda.</em></p>
      <div id="pedidosDisponibles"></div>
      
      <hr>
      <h3>🚚 Mis Pedidos Aceptados</h3>
      <div id="misPedidosRepartidor"></div>
      
      <hr>
      <h3>💰 Mis Ganancias</h3>
      <div id="gananciasRepartidor"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);

  await cargarDisponibles();
  await cargarMisPedidos();
  await cargarGanancias();
}

async function cargarDisponibles() {
  const snap = await getDocs(query(
    collection(db, 'pedidos'),
    where('estado', '==', 'aprobadoEsperaRepartidor'),
    orderBy('fechaCreacion', 'asc')
  ));
  const caja = document.getElementById('pedidosDisponibles');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No hay pedidos disponibles por ahora.</p>'; return; }
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p><strong>Total del pedido:</strong> $${p.totalBruto?.toFixed(2)}</p>
      <p>Su ganancia: $${p.montos?.montoRepartidor?.toFixed(2) || '—'}</p>
      <p>Items: ${p.items?.length || 0}</p>
      <button data-id="${doc.id}" class="btnAceptarPedido exito">✅ Aceptar Entrega</button>
    `;
    caja.appendChild(div);
  });

  document.querySelectorAll('.btnAceptarPedido').forEach(btn => {
    btn.onclick = async e => {
      await updateDoc(doc(db, 'pedidos', e.target.dataset.id), {
        estado: 'aceptadoPorRepartidor',
        idRepartidor: uidRepartidor(),
        fechaAceptacion: serverTimestamp()
      });
      alert('✅ Pedido aceptado. Diríjase al comercio.');
      cargarDisponibles();
      cargarMisPedidos();
    };
  });
}

async function cargarMisPedidos() {
  const snap = await getDocs(query(
    collection(db, 'pedidos'),
    where('idRepartidor', '==', uidRepartidor()),
    orderBy('fechaCreacion', 'desc')
  ));
  const caja = document.getElementById('misPedidosRepartidor');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No tiene pedidos aceptados.</p>"; return; }
  snap.forEach(doc => {
    const p = doc.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p>Total: $${p.totalBruto?.toFixed(2)} | Su parte: $${p.montos?.montoRepartidor?.toFixed(2) || '—'}</p>
      <p>Estado: ${p.estado}</p>
      ${p.estado === 'aceptadoPorRepartidor' ? `
        <button data-id="${doc.id}" class="btnEntregado exito">✅ Marcar Entregado</button>
      ` : ''}
    `;
    caja.appendChild(div);
  });

  document.querySelectorAll('.btnEntregado').forEach(btn => {
    btn.onclick = async e => {
      await updateDoc(doc(db, 'pedidos', e.target.dataset.id), { estado: 'entregado' });
      alert('✅ Entrega confirmada.');
      cargarMisPedidos();
      cargarDisponibles();
    };
  });
}

async function cargarGanancias() {
  const snap = await getDocs(query(
    collection(db, 'pedidos'),
    where('idRepartidor', '==', uidRepartidor()),
    where('estado', '==', 'entregado')
  ));
  let total = 0, cantidad = 0;
  snap.forEach(p => {
    cantidad++;
    total += p.data().montos?.montoRepartidor || 0;
  });
  document.getElementById('gananciasRepartidor').innerHTML = `
    <p>Pedidos completados: ${cantidad}</p>
    <p><strong>Total ganado: $${total.toFixed(2)}</strong></p>
  `;
}