import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { avisoAntiEstafaHTML } from './avisoAntiEstafa.js';
import { abrirChat, listarTodasLasConversaciones, abrirChatObservador } from './chat.js';

export async function mostrar(usuario) {
  const nom = usuario.nombreCompleto || usuario.nombre || 'Dueño';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="contenedor">
      <h1>👑 Panel del Dueño — ${nom}</h1>
      ${avisoAntiEstafaHTML()}
      <hr>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button onclick="cambiarSeccion('comisiones')">⚙️ Comisiones</button>
        <button onclick="cambiarSeccion('ciudades')">🏙️ Ciudades / Empresas</button>
        <button onclick="cambiarSeccion('usuarios')">👥 Usuarios</button>
        <button onclick="cambiarSeccion('pedidos')">📊 Todos los Pedidos</button>
        <button onclick="cambiarSeccion('admins')">👤 Crear Administradores</button>
        <button onclick="cambiarSeccion('chats')">👁️ Ver Conversaciones</button>
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

      <div id="zona-ciudades" style="display:none;">
        <h3>🏙️ Ciudades / Empresas</h3>
        <p>Cada ciudad es una operación independiente: sus propios comercios, repartidores, clientes y pedidos. Podés alquilar cada ciudad a una empresa distinta.</p>
        <input type="text" id="ciudad-nombre" placeholder="Nombre de la ciudad (ej: Chuí)">
        <input type="text" id="ciudad-empresa" placeholder="Empresa/operador a cargo (opcional)">
        <button onclick="crearCiudad()">✅ Crear Ciudad</button>
        <h4>Ciudades existentes</h4>
        <div id="lista-ciudades">Cargando...</div>
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
        <p>Permisos limitados: aprueban usuarios y ven pedidos, NO modifican comisiones. La contraseña se genera automáticamente para que se la envíes por WhatsApp.</p>
        <input type="text" id="admin-nombre" placeholder="Nombre">
        <input type="text" id="admin-apellido" placeholder="Apellido">
        <label>Ciudad que va a administrar:</label>
        <select id="admin-ciudad"><option value="">— Elegir ciudad —</option></select>
        <button onclick="crearAdministrador()">✅ Crear Administrador</button>
        <h4>Lista de Administradores</h4>
        <div id="lista-admins">Cargando...</div>
      </div>

      <div id="zona-chats" style="display:none;">
        <h3>👁️ Conversaciones del Sistema</h3>
        <p>Podés ver cualquier chat (cliente-comercio, comercio-repartidor, etc.) si surge un problema.</p>
        <div id="lista-chats">Cargando...</div>
      </div>
    </div>
  `;

  window.cambiarSeccion = cambiarSeccion;
  window.crearCiudad = crearCiudad;
  window.activarDesactivarCiudad = activarDesactivarCiudad;
  window.guardarComisiones = guardarComisiones;
  window.cargarUsuarios = cargarUsuarios;
  window.aprobarUsuario = aprobarUsuario;
  window.rechazarUsuario = rechazarUsuario;
  window.bloquearUsuario = bloquearUsuario;
  window.eliminarUsuario = eliminarUsuario;
  window.verChatConUsuario = (uid, nombre) => { if (uid) abrirChat(uid, nombre); };
  window.verConversacion = (convId, nombres) => abrirChatObservador(convId, nombres);
  window.crearAdministrador = crearAdministrador;
  window.exportarReportes = () => alert('📲 Reporte compartido por WhatsApp');
  window.exportarTodoExcel = exportarTodoExcel;
  window.cerrarSesion = async () => {
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('./firebase.js');
  await signOut(auth);
  location.reload();
};

  await cargarComisiones();
  await cargarUsuarios();
}

function cambiarSeccion(nombre) {
  document.getElementById('zona-comisiones').style.display = nombre === 'comisiones' ? 'block' : 'none';
  document.getElementById('zona-ciudades').style.display = nombre === 'ciudades' ? 'block' : 'none';
  document.getElementById('zona-usuarios').style.display = nombre === 'usuarios' ? 'block' : 'none';
  document.getElementById('zona-pedidos').style.display = nombre === 'pedidos' ? 'block' : 'none';
  document.getElementById('zona-admins').style.display = nombre === 'admins' ? 'block' : 'none';
  document.getElementById('zona-chats').style.display = nombre === 'chats' ? 'block' : 'none';
  if (nombre === 'ciudades') cargarCiudades();
  if (nombre === 'usuarios') cargarUsuarios();
  if (nombre === 'pedidos') cargarPedidosTodos();
  if (nombre === 'admins') { cargarCiudadesEnSelectAdmin(); cargarAdmins(); }
  if (nombre === 'chats') cargarConversaciones();
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

async function crearCiudad() {
  const nombre = document.getElementById('ciudad-nombre').value.trim();
  const empresa = document.getElementById('ciudad-empresa').value.trim();
  if (!nombre) return alert('⚠️ Escribí el nombre de la ciudad');
  await setDoc(doc(collection(db, 'ciudades')), {
    nombre, empresa: empresa || null, activa: true, fechaCreacion: new Date()
  });
  alert(`✅ Ciudad "${nombre}" creada. Ya va a aparecer como opción al registrarse los comercios, repartidores y clientes de esa zona.`);
  document.getElementById('ciudad-nombre').value = '';
  document.getElementById('ciudad-empresa').value = '';
  cargarCiudades();
}

async function cargarCiudades() {
  const snap = await getDocs(collection(db, 'ciudades'));
  let html = '';
  snap.forEach(d => {
    const c = d.data();
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${c.nombre}</strong> ${c.empresa ? `— ${c.empresa}` : ''} ${c.activa ? '✅ Activa' : '🚫 Inactiva'}<br>
      <button onclick="activarDesactivarCiudad('${d.id}', ${c.activa})">${c.activa ? '🚫 Desactivar' : '✅ Activar'}</button>
    </div>`;
  });
  document.getElementById('lista-ciudades').innerHTML = html || '<p>Todavía no creaste ninguna ciudad. Creá al menos una para poder dar de alta comercios, repartidores y clientes.</p>';
}

async function activarDesactivarCiudad(id, estabaActiva) {
  await updateDoc(doc(db, 'ciudades', id), { activa: !estabaActiva });
  cargarCiudades();
}

async function cargarCiudadesEnSelectAdmin() {
  const snap = await getDocs(query(collection(db, 'ciudades'), where('activa', '==', true)));
  const sel = document.getElementById('admin-ciudad');
  if (!sel) return;
  let opciones = '<option value="">— Elegir ciudad —</option>';
  snap.forEach(d => { opciones += `<option value="${d.id}">${d.data().nombre}</option>`; });
  sel.innerHTML = opciones;
}

async function cargarUsuarios() {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', 'in', ['comercio', 'repartidor'])));
  let html = '';
  snap.forEach(d => {
    const u = d.data();
    const estado = u.aprobado ? (u.bloqueado ? '🚫 Bloqueado' : '✅ Activo') : '⏳ Pendiente';
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${u.nombreCompleto || u.correo || 'Sin nombre'}</strong> — ${u.rol}<br>
      Ciudad: ${u.ciudadNombre || 'Sin asignar'}<br>
      Correo: ${u.correo || 'Sin correo'}<br>
      Estado: ${estado}<br>
      Términos aceptados: ${u.terminosAceptados ? '✅ Sí' : '❌ No'}<br>
      ${!u.aprobado ? `<button onclick="aprobarUsuario('${d.id}')">✅ Aprobar</button> <button onclick="rechazarUsuario('${d.id}')">❌ Rechazar</button>` : ''}
      ${u.aprobado && !u.bloqueado ? `<button onclick="bloquearUsuario('${d.id}')">🚫 Bloquear</button>` : ''}
      ${u.bloqueado ? `<button onclick="bloquearUsuario('${d.id}')">✅ Desbloquear</button>` : ''}
      <button onclick="eliminarUsuario('${d.id}')">🗑️ Borrar</button>
      <button onclick="verChatConUsuario('${d.id}','${(u.nombreCompleto||u.correo||'').replace(/'/g,"\\'")}')">💬 Chat</button>
    </div>`;
  });
  document.getElementById('lista-usuarios').innerHTML = html || '<p>Sin usuarios registrados fuera de clientes.</p>';
}

async function aprobarUsuario(uid) {
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: true, estado: 'aprobado', fechaAprobacion: new Date(), aprobadoPor: auth.currentUser.email });
  alert('✅ Usuario aprobado. Ya puede ingresar.');
  cargarUsuarios();
}

async function rechazarUsuario(uid) {
  if (!confirm('¿Rechazar este usuario? No podrá ingresar.')) return;
  await updateDoc(doc(db, 'usuarios', uid), { aprobado: false, estado: 'rechazado', rechazado: true });
  alert('❌ Usuario rechazado.');
  cargarUsuarios();
}

async function bloquearUsuario(uid) {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', uid)));
  const actual = snap.docs[0].data();
  const nuevoEstado = !actual.bloqueado;
  await updateDoc(doc(db, 'usuarios', uid), { bloqueado: nuevoEstado, estado: nuevoEstado ? 'bloqueado' : 'aprobado' });
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
  const cfgSnap = await getDocs(query(collection(db, 'configuracion'), where('tipo', '==', 'comisiones')));
  const porcentajeApp = !cfgSnap.empty ? (cfgSnap.docs[0].data().porcentajeApp || 10) : 10;
  const snap = await getDocs(query(collection(db, 'pedidos')));
  let totalGeneral = 0, comisionAppTotal = 0;
  let html = '<p>Lista de todos los pedidos del sistema:</p>';
  snap.forEach(d => {
    const p = d.data();
    const t = p.total || 0;
    totalGeneral += t;
    comisionAppTotal += Math.round(t * (porcentajeApp / 100));
    html += `<div style="border:1px solid #ddd; padding:8px; margin:4px;">
      Fecha: ${p.fecha?.toDate().toLocaleDateString() || 'Sin fecha'} | Total: $${t} | Estado: ${p.estado}
    </div>`;
  });
  html += `<hr><strong>💰 Total vendido: $${totalGeneral} | Comisión App ganada (${porcentajeApp}%): $${comisionAppTotal}</strong>`;
  document.getElementById('lista-pedidos-dueno').innerHTML = html || '<p>Sin pedidos registrados.</p>';
}

async function cargarConversaciones() {
  const conversaciones = await listarTodasLasConversaciones();
  let html = '';
  conversaciones.forEach(c => {
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${c.nombres.join(' ↔ ')}</strong>
      <button onclick="verConversacion('${c.convId}', ${JSON.stringify(c.nombres).replace(/"/g,'&quot;')})">👁️ Ver</button>
    </div>`;
  });
  document.getElementById('lista-chats').innerHTML = html || '<p>Todavía no hay conversaciones en el sistema.</p>';
}

async function exportarTodoExcel() {
  const snap = await getDocs(query(collection(db, 'pedidos')));
  const cfgSnap = await getDocs(query(collection(db, 'configuracion'), where('tipo', '==', 'comisiones')));
  const porcentajeApp = !cfgSnap.empty ? (cfgSnap.docs[0].data().porcentajeApp || 10) : 10;
  const filas = [];
  snap.forEach(d => {
    const p = d.data();
    const t = p.total || 0;
    filas.push({
      Fecha: p.fecha?.toDate().toLocaleDateString() || 'Sin fecha',
      Comercio: p.nombreComercio || p.idComercio || '',
      Cliente: p.nombreCliente || '',
      Total: t,
      Estado: p.estado || '',
      [`Comisión App (${porcentajeApp}%)`]: Math.round(t * (porcentajeApp / 100))
    });
  });
  const XLSX = await import('xlsx');
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Todos los pedidos');
  XLSX.writeFile(libro, `pedidos-mujeres-express-${new Date().toISOString().slice(0,10)}.xlsx`);
}

async function crearAdministrador() {
  const nombre = document.getElementById('admin-nombre').value.trim();
  const apellido = document.getElementById('admin-apellido').value.trim();
  const ciudadId = document.getElementById('admin-ciudad').value;
  const ciudadNombre = document.getElementById('admin-ciudad').selectedOptions[0]?.textContent || '';
  if (!nombre || !apellido) return alert('⚠️ Completá nombre y apellido');
  if (!ciudadId) return alert('⚠️ Elegí qué ciudad va a administrar. Si todavía no creaste ninguna, hacelo primero en "🏙️ Ciudades / Empresas".');

  // Genera un usuario interno (no es un email real) y una contraseña temporal
  const usuario = (nombre + '.' + apellido).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const correoInterno = `${usuario}@admin.mujeresexpress.local`;
  const clave = Math.random().toString(36).slice(-8) + Math.floor(Math.random()*10);

  try {
    // Se crea con una instancia SECUNDARIA de Firebase Auth para no cerrar
    // la sesión actual del dueño (createUserWithEmailAndPassword inicia
    // sesión automáticamente con el usuario recién creado).
    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth: getAuthSecundario, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
    const { firebaseConfig } = await import('./firebase.js');

    const appSecundaria = initializeApp(firebaseConfig, 'admin-creator-' + Date.now());
    const authSecundaria = getAuthSecundario(appSecundaria);
    const cred = await createUserWithEmailAndPassword(authSecundaria, correoInterno, clave);

    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      nombre, apellido, nombreCompleto: `${nombre} ${apellido}`,
      usuario, correo: correoInterno,
      rol: 'admin', aprobado: true, estado: 'aprobado',
      permisosLimitados: true,
      ciudadId, ciudadNombre,
      creadoPor: auth.currentUser.email,
      fechaRegistro: new Date()
    });

    await signOut(authSecundaria);
    await deleteApp(appSecundaria);

    alert(`✅ Administrador creado.\n\nEnviale esto por WhatsApp:\n\nUsuario: ${usuario}\nContraseña: ${clave}\n\n(Con esto entra en la pantalla de login, eligiendo "Soy administrador")`);
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-apellido').value = '';
    cargarAdmins();
  } catch (e) {
    alert('Error al crear administrador: ' + e.message);
  }
}

async function cargarAdmins() {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'admin')));
  let html = '';
  snap.forEach(d => {
    const u = d.data();
    const estado = u.bloqueado ? '🚫 Bloqueado' : '✅ Activo';
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${u.nombreCompleto}</strong> — usuario: ${u.usuario}<br>
      Ciudad: ${u.ciudadNombre || 'Sin asignar'}<br>
      Estado: ${estado}<br>
      ${!u.bloqueado ? `<button onclick="bloquearUsuario('${d.id}')">🚫 Bloquear</button>` : `<button onclick="bloquearUsuario('${d.id}')">✅ Desbloquear</button>`}
      <button onclick="eliminarUsuario('${d.id}')">🗑️ Borrar</button>
    </div>`;
  });
  document.getElementById('lista-admins').innerHTML = html || '<p>Todavía no creaste ningún administrador.</p>';
}