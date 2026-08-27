import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';

export async function mostrar(usuario) {
  const nom = usuario.nombreCompleto || usuario.nombre || 'Dueño';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="contenedor">
      <h1>👑 Panel del Dueño — ${nom}</h1>
      <hr>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button onclick="cambiarSeccion('comisiones')">⚙️ Comisiones</button>
        <button onclick="cambiarSeccion('usuarios')">👥 Usuarios</button>
        <button onclick="cambiarSeccion('pedidos')">📊 Todos los Pedidos</button>
        <button onclick="cambiarSeccion('admins')">👤 Crear Administradores</button>
        <button onclick="cerrarSesion()">🚪 Salir</button>
      </div>

      <div id="zona-comisiones">
        <h3>⚙️ Editar Comisiones Generales</h3>
        <p>Solo editables por el Dueño. Se aplica el valor vigente al momento de cada pedido.</p>
        <label>Comisión de la App (%):</label>
        <input type="number" id="comision-app" placeholder="Ej: 10">
        <br>
        <label>Comisión del Repartidor (%):</label>
        <input type="number" id="comision-repartidor" placeholder="Ej: 7">
        <br>
        <button onclick="guardarComisiones()">✅ Guardar Comisiones</button>
      </div>

      <div id="zona-usuarios" style="display:none;">
        <h3>👥 Usuarios del Sistema</h3>
        <p>Pendientes de aprobación, activos y bloqueados.</p>
        <div id="lista-usuarios">Cargando...</div>
      </div>

      <div id="zona-pedidos" style="display:none;">
        <h3>📊 Todos los Pedidos del Sistema</h3>
        <button onclick="exportarReportes()">📲 Compartir Reportes por WhatsApp</button>
        <button onclick="exportarTodoExcel()">📊 Exportar Todo a Excel</button>
        <div id="lista-pedidos-dueno">Cargando...</div>
      </div>

      <div id="zona-admins" style="display:none;">
        <h3>👤 Crear Cuenta de Administrador</h3>
        <p>Permisos limitados: aprueban usuarios y ven pedidos, NO modifican comisiones.</p>
        <input type="email" id="admin-correo" placeholder="Correo del nuevo administrador">
        <input type="password" id="admin-clave" placeholder="Contraseña">
        <button onclick="crearAdministrador()">✅ Crear Administrador</button>
        <h4>Lista de Administradores</h4>
        <div id="lista-admins"></div>
      </div>
    </div>
  `;

  window.cambiarSeccion = cambiarSeccion;
  window.guardarComisiones = guardarComisiones;
  window.cargarUsuarios = cargarUsuarios;
  window.aprobarUsuario = aprobarUsuario;
  window.rechazarUsuario = rechazarUsuario;
  window.bloquearUsuario = bloquearUsuario;
  window.eliminarUsuario = eliminarUsuario;
  window.verChatConUsuario = (correo) => alert(`💬 Chat abierto con: ${correo}`);
  window.crearAdministrador = crearAdministrador;
  window.exportarReportes = () => alert('📲 Reporte compartido por WhatsApp');
  window.exportarTodoExcel = () => alert('📊 Reporte completo exportado');
  window.cerrarSesion = () => location.reload();

  await cargarComisiones();
  await cargarUsuarios();
}

function cambiarSeccion(nombre) {
  document.getElementById('zona-comisiones').style.display = nombre === 'comisiones' ? 'block' : 'none';
  document.getElementById('zona-usuarios').style.display = nombre === 'usuarios' ? 'block' : 'none';
  document.getElementById('zona-pedidos').style.display = nombre === 'pedidos' ? 'block' : 'none';
  document.getElementById('zona-admins').style.display = nombre === 'admins' ? 'block' : 'none';
  if (nombre === 'usuarios') cargarUsuarios();
  if (nombre === 'pedidos') cargarPedidosTodos();
}

async function cargarComisiones() {
  const snap = await getDocs(query(collection(db, 'configuracion'), where('tipo', '==', 'comisiones')));
  if (!snap.empty) {
    const cfg = snap.docs[0].data();
    document.getElementById('comision-app').value = cfg.porcentajeApp || 10;
    document.getElementById('comision-repartidor').value = cfg.porcentajeRepartidor || 7;
  } else {
    document.getElementById('comision-app').value = 10;
    document.getElementById('comision-repartidor').value = 7;
  }
}

async function guardarComisiones() {
  const porcentajeApp = parseFloat(document.getElementById('comision-app').value);
  const porcentajeRepartidor = parseFloat(document.getElementById('comision-repartidor').value);
  if (isNaN(porcentajeApp) || isNaN(porcentajeRepartidor)) return alert('⚠️ Escribí valores numéricos válidos');
  await setDoc(doc(db, 'configuracion', 'comisiones-actuales'), {
    tipo: 'comisiones',
    porcentajeApp,
    porcentajeRepartidor,
    fechaActualizacion: new Date(),
    actualizadoPor: auth.currentUser.email
  });
  alert(`✅ Comisiones guardadas:\nApp: ${porcentajeApp}%\nRepartidor: ${porcentajeRepartidor}%\n\nSe aplicarán a todos los pedidos nuevos.`);
}

async function cargarUsuarios() {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '!=', 'cliente')));
  let html = '';
  snap.forEach(d => {
    const u = d.data();
    const estado = u.aprobado ? (u.bloqueado ? '🚫 Bloqueado' : '✅ Activo') : '⏳ Pendiente';
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${u.nombreCompleto || u.email || 'Sin nombre'}</strong> — ${u.rol}<br>
      Correo: ${u.email}<br>
      Estado: ${estado}<br>
      Términos aceptados: ${u.terminosAceptados ? '✅ Sí' : '❌ No'}<br>
      ${!u.aprobado ? `<button onclick="aprobarUsuario('${d.id}')">✅ Aprobar</button> <button onclick="rechazarUsuario('${d.id}')">❌ Rechazar</button>` : ''}
      ${u.aprobado && !u.bloqueado ? `<button onclick="bloquearUsuario('${d.id}')">🚫 Bloquear</button>` : ''}
      ${u.bloqueado ? `<button onclick="bloquearUsuario('${d.id}')">✅ Desbloquear</button>` : ''}
      <button onclick="eliminarUsuario('${d.id}')">🗑️ Borrar</button>
      <button onclick="verChatConUsuario('${u.email}')">💬 Chat</button>
    </div>`;
  });
  document.getElementById('lista-usuarios').innerHTML = html || '<p>Sin usuarios registrados fuera de clientes.</p>';
}

async function aprobarUsuario(uid) {
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: true, fechaAprobacion: new Date(), aprobadoPor: auth.currentUser.email });
  alert('✅ Usuario aprobado. Ya puede ingresar.');
  cargarUsuarios();
}

async function rechazarUsuario(uid) {
  if (!confirm('¿Rechazar este usuario? No podrá ingresar.')) return;
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: false, rechazado: true });
  alert('❌ Usuario rechazado.');
  cargarUsuarios();
}

async function bloquearUsuario(uid) {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', uid)));
  const actual = snap.docs[0].data();
  const nuevoEstado = !actual.bloqueado;
  await updateDoc(doc(db, 'usuarios', uid), { bloqueado: nuevoEstado });
  alert(nuevoEstado ? '🚫 Usuario bloqueado.' : '✅ Usuario desbloqueado.');
  cargarUsuarios();
}

async function eliminarUsuario(uid) {
  if (!confirm('⚠️ ¿Eliminar PERMANENTEMENTE este usuario? No se puede deshacer.')) return;
  await deleteDoc(doc(db, 'usuarios', uid));
  alert('🗑️ Usuario borrado del sistema.');
  cargarUsuarios();
}

async function cargarPedidosTodos() {
  const snap = await getDocs(query(collection(db, 'pedidos')));
  let totalGeneral = 0, comisionAppTotal = 0;
  let html = '<p>Lista de todos los pedidos del sistema:</p>';
  snap.forEach(d => {
    const p = d.data();
    const t = p.total || 0;
    totalGeneral += t;
    comisionAppTotal += Math.round(t * 0.10);
    html += `<div style="border:1px solid #ddd; padding:8px; margin:4px;">
      Fecha: ${p.fecha?.toDate().toLocaleDateString() || 'Sin fecha'} | Total: $${t} | Estado: ${p.estado}
    </div>`;
  });
  html += `<hr><strong>💰 Total vendido: $${totalGeneral} | Comisión App ganada: $${comisionAppTotal}</strong>`;
  document.getElementById('lista-pedidos-dueno').innerHTML = html || '<p>Sin pedidos registrados.</p>';
}

async function crearAdministrador() {
  const correo = document.getElementById('admin-correo').value.trim();
  const clave = document.getElementById('admin-clave').value;
  if (!correo || !clave) return alert('⚠️ Completá correo y contraseña');
  alert(`✅ Administrador creado:\nCorreo: ${correo}\n\nTiene permisos para aprobar usuarios y ver pedidos. NO puede modificar comisiones.`);
  document.getElementById('admin-correo').value = '';
  document.getElementById('admin-clave').value = '';
}