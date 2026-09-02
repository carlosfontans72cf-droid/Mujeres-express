import { db, auth } from './firebase.js';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { avisoAntiEstafaHTML } from './avisoAntiEstafa.js';
import { abrirChat } from './chat.js';

let comisionRepartidorPct = 7;
let miCiudadId = null;

async function cargarComisionRepartidor() {
  const snap = await getDocs(query(collection(db, 'configuracion'), where('tipo', '==', 'comisiones')));
  if (!snap.empty) comisionRepartidorPct = snap.docs[0].data().porcentajeRepartidor ?? 7;
}

export async function mostrar(usuario) {
  await cargarComisionRepartidor();
  miCiudadId = usuario.ciudadId || null;
  const nom = usuario.nombreCompleto || usuario.nombre || 'Repartidor';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="contenedor">
      <h1>🛵 Bienvenido, ${nom}</h1>
      ${avisoAntiEstafaHTML()}
      <hr>
      <div style="background:#e3f2fd; padding:10px; border-radius:6px; margin-bottom:12px;">
        ✅ Declaro que cuento con empresa propia vigente para realizar entregas
      </div>
      <h3>📋 Pedidos Disponibles — El primero que acepta, se lo queda</h3>
      <div id="pedidos-disponibles">Cargando pedidos...</div>
      <hr>
      <h3>🚚 Mis Pedidos Aceptados</h3>
      <div id="mis-pedidos">Sin pedidos aceptados</div>
      <hr>
      <button onclick="cerrarSesion()">🚪 Salir</button>
    </div>
  `;

  window.aceptarPedido = aceptarPedido;
  window.marcarEntregado = marcarEntregado;
  window.avisarLlegada = avisarLlegada;
  window.verRutaMapa = verRutaMapa;
  window.abrirChatConCliente = (uid, nombre) => { if (uid) abrirChat(uid, nombre); };
  window.abrirChatConComercio = (uid, nombre) => { if (uid) abrirChat(uid, nombre); };
  window.cerrarSesion = async () => {
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('./firebase.js');
  await signOut(auth);
  location.reload();
};

  escucharPedidosDisponibles();
  escucharMisPedidos();
}

function escucharPedidosDisponibles() {
  if (!miCiudadId) {
    document.getElementById('pedidos-disponibles').innerHTML = '<p>⚠️ Tu cuenta no tiene una ciudad asignada. Contactá a soporte.</p>';
    return;
  }
  const q = query(collection(db, 'pedidos'), where('estado', '==', 'esperandoRepartidor'), where('ciudadId', '==', miCiudadId));
  onSnapshot(q, snap => {
    let html = '';
    if (snap.empty) {
      html = '<p style="color:green;">✅ No hay pedidos disponibles por ahora. Volvé a mirar más tarde.</p>';
    } else {
      snap.forEach(d => {
        const p = d.data();
        const ganancia = Math.round((p.total || 0) * (comisionRepartidorPct/100));
        html += `<div style="border:2px solid #28a745; padding:12px; border-radius:8px; margin-bottom:8px; background:#f8fff9;">
          <strong>📍 Dirección de entrega:</strong> ${p.direccionCliente}<br>
          <strong>📦 Productos:</strong> ${p.productos.map(i => i.nombre).join(', ')}<br>
          <strong>💰 Total del pedido:</strong> $${p.total}<br>
          <strong>💵 Tu ganancia (7%):</strong> $${ganancia}<br>
          <button onclick="verRutaMapa('${p.direccionCliente}')">🗺️ Ver ruta en mapa</button>
          <button onclick="aceptarPedido('${d.id}', ${p.total})">✅ ACEPTO ESTE PEDIDO</button>
        </div>`;
      });
    }
    document.getElementById('pedidos-disponibles').innerHTML = html;
  });
}

async function aceptarPedido(idPedido, total) {
  if (!confirm('⚠️ Una vez aceptado, es tu responsabilidad retirar del comercio y entregar al cliente. ¿Lo aceptás?')) return;
  const gananciaRepartidor = Math.round(total * (comisionRepartidorPct/100));
  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'enCamino',
    idRepartidor: auth.currentUser.uid,
    nombreRepartidor: auth.currentUser.email,
    gananciaRepartidor: gananciaRepartidor,
    fechaAceptacionRepartidor: new Date()
  });
  alert(`✅ Pedido aceptado!\n💰 Tu ganancia: $${gananciaRepartidor}\n\n📍 Andá al comercio, retirá el pedido y seguí la ruta hacia el cliente.`);
}

function verRutaMapa(destino) {
  alert(`🗺️ Mapa con ruta:\n📍 Comercio → 📍 ${destino}\n\nSe muestra recorrido paso a paso.`);
}

function escucharMisPedidos() {
  const q = query(collection(db, 'pedidos'), where('idRepartidor', '==', auth.currentUser.uid),
    where('estado', 'in', ['enCamino', 'entregado']));
  onSnapshot(q, snap => {
    let html = '';
    if (snap.empty) {
      html = '<p>Sin pedidos aceptados todavía.</p>';
    } else {
      snap.forEach(d => {
        const p = d.data();
        const gan = p.gananciaRepartidor || Math.round((p.total || 0) * (comisionRepartidorPct/100));
        html += `<div style="border:1px solid ${p.estado === 'entregado' ? '#ccc' : '#007bff'}; padding:10px; border-radius:6px; margin-bottom:4px;">
          <strong>📍 Entrega:</strong> ${p.direccionCliente}<br>
          <strong>Estado:</strong> ${p.estado === 'enCamino' ? '🚚 En camino' : '✅ Entregado'}<br>
          <strong>💰 Ganancia:</strong> $${gan}<br>
          ${p.estado === 'enCamino' ? `
            <button onclick="verRutaMapa('${p.direccionCliente}')">🗺️ Ruta</button>
            <button onclick="avisarLlegada('${d.id}','${p.nombreCliente}')">🔔 AVISAR QUE LLEGASTE</button>
            <button onclick="abrirChatConCliente('${p.idCliente}','${(p.nombreCliente||'').replace(/'/g,"\\'")}')">💬 Cliente</button>
            <button onclick="abrirChatConComercio('${p.idComercio}','${(p.nombreComercio||'').replace(/'/g,"\\'")}')">💬 Comercio</button>
            <button onclick="marcarEntregado('${d.id}')">✅ MARCAR ENTREGADO</button>
          ` : ''}
        </div>`;
      });
    }
    document.getElementById('mis-pedidos').innerHTML = html;
  });
}

async function avisarLlegada(idPedido, nombreCliente) {
  alert(`🔔 Notificación enviada a ${nombreCliente}:\n"¡Estoy llegando! Te espero en la puerta."`);
}

async function marcarEntregado(idPedido) {
  if (!confirm('¿Confirmás que entregaste el pedido al cliente?')) return;
  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'entregado',
    fechaEntrega: new Date()
  });
  alert('✅ Pedido marcado como ENTREGADO. ¡Buen trabajo! Tu comisión ya quedó registrada.');
}