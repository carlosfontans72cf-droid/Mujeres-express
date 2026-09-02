import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { avisoAntiEstafaHTML } from './avisoAntiEstafa.js';
import { listarTodasLasConversaciones, abrirChatObservador } from './chat.js';

// Panel del Administrador: mismo trabajo diario que el Dueño en cuanto a
// aprobar/bloquear usuarios y ver pedidos, pero SIN acceso a comisiones
// ni a la creación de otros administradores (eso es exclusivo del Dueño).

let miCiudadId = null;

export async function mostrar(usuario) {
  miCiudadId = usuario.ciudadId || null;
  const nom = usuario.nombreCompleto || usuario.nombre || 'Administrador';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="contenedor">
      <h1>🛡️ Panel de Administrador — ${nom}</h1>
      <p>🏙️ Ciudad: <strong>${usuario.ciudadNombre || 'Sin asignar'}</strong></p>
      ${avisoAntiEstafaHTML()}
      <hr>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button onclick="cambiarSeccionAdmin('usuarios')">👥 Usuarios</button>
        <button onclick="cambiarSeccionAdmin('pedidos')">📊 Pedidos</button>
        <button onclick="cambiarSeccionAdmin('chats')">👁️ Ver Conversaciones</button>
        <button onclick="cerrarSesion()">🚪 Salir</button>
      </div>

      <div id="admin-zona-usuarios">
        <h3>👥 Comercios y Repartidores</h3>
        <p>Pendientes de aprobación, activos y bloqueados.</p>
        <div id="admin-lista-usuarios">Cargando...</div>
      </div>

      <div id="admin-zona-pedidos" style="display:none;">
        <h3>📊 Pedidos del Sistema</h3>
        <div id="admin-lista-pedidos">Cargando...</div>
      </div>

      <div id="admin-zona-chats" style="display:none;">
        <h3>👁️ Conversaciones del Sistema</h3>
        <div id="admin-lista-chats">Cargando...</div>
      </div>
    </div>
  `;

  window.cambiarSeccionAdmin = cambiarSeccionAdmin;
  window.aprobarUsuarioAdmin = aprobarUsuarioAdmin;
  window.rechazarUsuarioAdmin = rechazarUsuarioAdmin;
  window.bloquearUsuarioAdmin = bloquearUsuarioAdmin;
  window.verConversacionAdmin = (convId, nombres) => abrirChatObservador(convId, nombres);
  window.cerrarSesion = async () => {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    location.reload();
  };

  await cargarUsuariosAdmin();
}

function cambiarSeccionAdmin(nombre) {
  document.getElementById('admin-zona-usuarios').style.display = nombre === 'usuarios' ? 'block' : 'none';
  document.getElementById('admin-zona-pedidos').style.display = nombre === 'pedidos' ? 'block' : 'none';
  document.getElementById('admin-zona-chats').style.display = nombre === 'chats' ? 'block' : 'none';
  if (nombre === 'usuarios') cargarUsuariosAdmin();
  if (nombre === 'pedidos') cargarPedidosAdmin();
  if (nombre === 'chats') cargarConversacionesAdmin();
}

async function cargarConversacionesAdmin() {
  const conversaciones = await listarTodasLasConversaciones();
  let html = '';
  conversaciones.forEach(c => {
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${c.nombres.join(' ↔ ')}</strong>
      <button onclick="verConversacionAdmin('${c.convId}', ${JSON.stringify(c.nombres).replace(/"/g,'&quot;')})">👁️ Ver</button>
    </div>`;
  });
  document.getElementById('admin-lista-chats').innerHTML = html || '<p>Todavía no hay conversaciones en el sistema.</p>';
}

async function cargarUsuariosAdmin() {
  if (!miCiudadId) {
    document.getElementById('admin-lista-usuarios').innerHTML = '<p>⚠️ Tu cuenta de administrador no tiene una ciudad asignada. Contactá al Dueño.</p>';
    return;
  }
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', 'in', ['comercio', 'repartidor']), where('ciudadId', '==', miCiudadId)));
  let html = '';
  snap.forEach(d => {
    const u = d.data();
    const estado = u.aprobado ? (u.bloqueado ? '🚫 Bloqueado' : '✅ Activo') : '⏳ Pendiente';
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${u.nombreCompleto || u.correo || 'Sin nombre'}</strong> — ${u.rol}<br>
      Correo: ${u.correo || 'Sin correo'}<br>
      Estado: ${estado}<br>
      ${!u.aprobado ? `<button onclick="aprobarUsuarioAdmin('${d.id}')">✅ Aprobar</button> <button onclick="rechazarUsuarioAdmin('${d.id}')">❌ Rechazar</button>` : ''}
      ${u.aprobado && !u.bloqueado ? `<button onclick="bloquearUsuarioAdmin('${d.id}')">🚫 Bloquear</button>` : ''}
      ${u.bloqueado ? `<button onclick="bloquearUsuarioAdmin('${d.id}')">✅ Desbloquear</button>` : ''}
    </div>`;
  });
  document.getElementById('admin-lista-usuarios').innerHTML = html || '<p>Sin usuarios registrados.</p>';
}

async function aprobarUsuarioAdmin(uid) {
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: true, estado: 'aprobado', fechaAprobacion: new Date(), aprobadoPor: auth.currentUser.email });
  cargarUsuariosAdmin();
}

async function rechazarUsuarioAdmin(uid) {
  if (!confirm('¿Rechazar este usuario?')) return;
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: false, estado: 'rechazado', rechazado: true });
  cargarUsuariosAdmin();
}

async function bloquearUsuarioAdmin(uid) {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', uid)));
  const actual = snap.docs[0].data();
  const nuevoEstado = !actual.bloqueado;
  await updateDoc(doc(db, 'usuarios', uid), { bloqueado: nuevoEstado, estado: nuevoEstado ? 'bloqueado' : 'aprobado' });
  cargarUsuariosAdmin();
}

async function cargarPedidosAdmin() {
  if (!miCiudadId) {
    document.getElementById('admin-lista-pedidos').innerHTML = '<p>⚠️ Tu cuenta de administrador no tiene una ciudad asignada.</p>';
    return;
  }
  const snap = await getDocs(query(collection(db, 'pedidos'), where('ciudadId', '==', miCiudadId)));
  let html = '<p>Pedidos del sistema (solo lectura):</p>';
  snap.forEach(d => {
    const p = d.data();
    html += `<div style="border:1px solid #ddd; padding:8px; margin:4px;">
      Fecha: ${p.fecha?.toDate().toLocaleDateString() || 'Sin fecha'} | Total: $${p.total || 0} | Estado: ${p.estado}
    </div>`;
  });
  document.getElementById('admin-lista-pedidos').innerHTML = html || '<p>Sin pedidos registrados.</p>';
}
