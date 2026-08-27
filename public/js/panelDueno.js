import { db, auth } from './firebase.js';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, addDoc, getDoc } from 'firebase/firestore';

let datosDueno = {};
let configuracion = { comisionApp: 10, comisionRepartidor: 7 };

export async function mostrarPanelDueno(usuario) {
  datosDueno = usuario;
  await cargarConfiguracion();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <!-- 🔒 TITULO DE ADMINISTRADOR -->
      <div style="background:#e8f5e9; padding:12px; border-radius:8px; border:2px solid:#2e7d32; margin-bottom:16px; text-align:center;">
        <h1 style="margin:0;">🔒 PANEL DE ADMINISTRACIÓN</h1>
        <p style="margin:4px 0;">Bienvenido, ${datosDueno.nombreCompleto} — Control Total del Sistema</p>
      </div>
      <hr>

      <!-- BOTONERA PRINCIPAL -->
      <div class="fila-botones">
        <button class="boton-confirmar" onclick="cambiarSeccion('comisiones')">💰 Comisiones</button>
        <button class="boton-principal" onclick="cambiarSeccion('usuarios')">👥 Gestionar Usuarios</button>
        <button class="boton-principal" onclick="cambiarSeccion('aprobaciones')">✅ Aprobar Comercios</button>
        <button class="boton-principal" onclick="cambiarSeccion('resumen')">📊 Resumen General</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <hr>

      <!-- ZONA DE TRABAJO -->
      <div id="zona-trabajo"></div>
    </div>
  `;

  window.cambiarSeccion = cambiarSeccion;
  window.guardarComisiones = guardarComisiones;
  window.enviarPorWhatsApp = enviarPorWhatsApp;
  window.aprobarComercio = aprobarComercio;
  window.rechazarComercio = rechazarComercio;
  window.bloquearUsuario = bloquearUsuario;
  window.desbloquearUsuario = desbloquearUsuario;
  window.eliminarUsuario = eliminarUsuario;
  window.crearAdministrador = crearAdministrador;
  window.cerrarSesion = () => location.reload();

  // Cargar sección comisiones al entrar
  cambiarSeccion('comisiones');
}

// ==========================================
// CARGAR COMISIONES DESDE LA BASE
// ==========================================
async function cargarConfiguracion() {
  try {
    const refConf = doc(db, 'configuracion', 'parametros');
    const snap = await getDoc(refConf);
    if (snap.exists()) {
      configuracion = snap.data();
    }
  } catch (e) {
    // Si no existe todavía, usa los valores por defecto
  }
}

// ==========================================
// SECCIÓN: COMISIONES EDITABLES
// ==========================================
async function cambiarSeccion(nombre) {
  const zona = document.getElementById('zona-trabajo');

  if (nombre === 'comisiones') {
    zona.innerHTML = `
      <h2>💰 Configuración de Comisiones</h2>
      <p style="color:#555;">Los cambios rigen desde ahora hacia adelante. No se modifican pedidos anteriores.</p>
      <div style="display:grid; gap:12px; max-width:400px; margin:16px 0;">
        <label>Comisión que cobra la app al comercio (%):</label>
        <input type="number" id="comision_app" value="${configuracion.comisionApp}" style="padding:10px; font-size:18px; border-radius:6px; border:1px solid #ccc;">
        
        <label>Comisión que recibe el repartidor (%):</label>
        <input type="number" id="comision_repartidor" value="${configuracion.comisionRepartidor}" style="padding:10px; font-size:18px; border-radius:6px; border:1px solid #ccc;">
      </div>
      <button class="boton-confirmar" style="font-size:16px; padding:10px 20px;" onclick="guardarComisiones()">✅ GUARDAR CAMBIOS</button>
    `;
  }

  else if (nombre === 'usuarios') {
    zona.innerHTML = `
      <h2>👥 Gestión de Usuarios del Sistema</h2>
      <div style="margin-bottom:16px; padding:10px; background:#f5f5f5; border-radius:6px;">
        <h3 style="margin-top:0;">➕ Crear Nuevo Administrador</h3>
        <input type="text" id="admin_nombre" placeholder="Nombre completo" style="padding:8px; margin:4px;">
        <input type="email" id="admin_correo" placeholder="correo@email.com" style="padding:8px; margin:4px;">
        <input type="text" id="admin_whatsapp" placeholder="WhatsApp con código de país" style="padding:8px; margin:4px;">
        <button class="boton-confirmar" onclick="crearAdministrador()">✅ Crear y Enviar Datos por WhatsApp</button>
      </div>
      <div id="lista-usuarios"><p>Cargando usuarios...</p></div>
    `;
    listarUsuarios();
  }

  else if (nombre === 'aprobaciones') {
    zona.innerHTML = `<h2>✅ Comercios Pendientes de Aprobación</h2><div id="lista-aprobaciones"><p>Cargando...</p></div>`;
    listarComerciosPendientes();
  }

  else if (nombre === 'resumen') {
    zona.innerHTML = `<h2>📊 Resumen General del Sistema</h2><div id="datos-resumen"><p>Calculando...</p></div>`;
    cargarResumenGeneral();
  }
}

// ==========================================
// GUARDAR COMISIONES → SE ACTUALIZA TODO
// ==========================================
async function guardarComisiones() {
  const comApp = parseFloat(document.getElementById('comision_app').value);
  const comRep = parseFloat(document.getElementById('comision_repartidor').value);

  if (isNaN(comApp) || isNaN(comRep) || comApp < 0 || comRep < 0) {
    return alert('⚠️ Escribí valores numéricos válidos y mayores a cero.');
  }

  configuracion.comisionApp = comApp;
  configuracion.comisionRepartidor = comRep;

  await setDoc(doc(db, 'configuracion', 'parametros'), configuracion);
  alert(`✅ COMISIONES ACTUALIZADAS:\n\nApp al comercio: ${comApp}%\nRepartidor: ${comRep}%\n\nSe aplica automáticamente a todos los nuevos pedidos.`);
}

// ==========================================
// CREAR ADMINISTRADOR + ENVÍO POR WHATSAPP
// ==========================================
async function crearAdministrador() {
  const nombre = document.getElementById('admin_nombre').value.trim();
  const correo = document.getElementById('admin_correo').value.trim();
  const whatsapp = document.getElementById('admin_whatsapp').value.trim();
  const claveTemporal = Math.random().toString(36).substring(2, 10).toUpperCase();

  if (!nombre || !correo) return alert('⚠️ Nombre y correo son obligatorios.');

  const nuevoAdmin = {
    nombreCompleto: nombre,
    correo: correo,
    rol: 'dueno',
    estado: 'aprobado',
    claveTemporal: claveTemporal,
    fechaCreacion: new Date()
  };

  await addDoc(collection(db, 'usuarios'), nuevoAdmin);

  const mensaje = `🔑 NUEVO ACCESO AL SISTEMA MUJER EXPRESS\n\nHola ${nombre}!\nSe te creó una cuenta de Administrador.\n\n📧 Correo de ingreso: ${correo}\n🔑 Clave temporal: ${claveTemporal}\n⚠️ Cambiá tu clave en el primer ingreso.\n\n— Mujer Express`;

  if (whatsapp) {
    enviarPorWhatsApp(whatsapp, mensaje);
  } else {
    alert(`✅ Administrador creado.\n\nCorreo: ${correo}\nClave temporal: ${claveTemporal}`);
  }

  listarUsuarios();
}

// ==========================================
// LISTAR USUARIOS CON ACCIONES
// ==========================================
async function listarUsuarios() {
  const q = query(collection(db, 'usuarios'), orderBy('nombreCompleto'));
  const snap = await getDocs(q);
  let html = '<div style="display:grid; gap:8px;">';

  snap.forEach(d => {
    const u = d.data();
    const rolTexto = { 'dueno': '🔒 Admin', 'comercio': '🏪 Comercio', 'repartidor': '🚚 Repartidor', 'cliente': '👤 Cliente' }[u.rol] || u.rol;
    const colorEstado = u.estado === 'aprobado' ? 'color:green;' : u.estado === 'bloqueado' ? 'color:red;' : 'color:orange;';

    html += `
      <div class="tarjeta" style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px;">
        <div>
          <strong>${u.nombreCompleto}</strong> — ${rolTexto}<br>
          ${u.correo}<br>
          <span style="${colorEstado} font-weight:bold;">Estado: ${u.estado || 'Pendiente'}</span>
        </div>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          ${u.estado !== 'bloqueado' ? `<button onclick="bloquearUsuario('${d.id}')" style="background:#ffc107; color:#000;">🔒 Bloquear</button>` : `<button onclick="desbloquearUsuario('${d.id}')" style="background:#4caf50; color:#fff;">🔓 Desbloquear</button>`}
          <button onclick="eliminarUsuario('${d.id}')" style="background:#f44336; color:#fff;">🗑️ Eliminar</button>
          ${u.whatsapp ? `<button onclick="enviarPorWhatsApp('${u.whatsapp}', 'Hola ${u.nombreCompleto}, tu estado en Mujer Express es: ${u.estado || 'Pendiente'}')">📱 WhatsApp</button>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
  document.getElementById('lista-usuarios').innerHTML = html;
}

// ==========================================
// ACCIONES DE USUARIOS
// ==========================================
async function bloquearUsuario(id) {
  if (!confirm('⚠️ ¿BLOQUEAR este usuario? Quedará sin acceso al sistema.')) return;
  await updateDoc(doc(db, 'usuarios', id), { estado: 'bloqueado' });
  alert('✅ Usuario BLOQUEADO. No podrá ingresar.');
  listarUsuarios();
}

async function desbloquearUsuario(id) {
  if (!confirm('¿DESBLOQUEAR? Vuelve a tener acceso normal.')) return;
  await updateDoc(doc(db, 'usuarios', id), { estado: 'aprobado' });
  alert('✅ Usuario DESBLOQUEADO. Acceso restaurado.');
  listarUsuarios();
}

async function eliminarUsuario(id) {
  if (!confirm('⚠️ ¿ELIMINAR DEFINITIVAMENTE? No se puede deshacer.')) return;
  await deleteDoc(doc(db, 'usuarios', id));
  alert('✅ Usuario ELIMINADO.');
  listarUsuarios();
}

// ==========================================
// APROBAR COMERCIANTES
// ==========================================
async function listarComerciosPendientes() {
  const q = query(collection(db, 'usuarios'), where('rol', '==', 'comercio'), where('estado', '==', 'pendiente'), orderBy('nombreCompleto'));
  const snap = await getDocs(q);
  let html = '';

  if (snap.empty) {
    html = '<p style="color:green; font-weight:bold;">✅ No hay comercios pendientes de aprobación.</p>';
  } else {
    snap.forEach(d => {
      const c = d.data();
      html += `
        <div class="tarjeta">
          <strong>🏪 ${c.nombreCompleto}</strong><br>
          📧 ${c.correo}<br>
          📱 ${c.whatsapp || 'Sin WhatsApp'}<br>
          📝 Fecha de inscripción: ${c.fechaCreacion?.toDate().toLocaleDateString('es-UY') || 'Sin fecha'}
          <hr>
          <div class="fila-botones">
            <button class="boton-confirmar" onclick="aprobarComercio('${d.id}', '${c.whatsapp||''}', '${c.correo}')">✅ APROBAR</button>
            <button class="boton-alerta" onclick="rechazarComercio('${d.id}', '${c.whatsapp||''}', '${c.nombreCompleto}')">❌ RECHAZAR</button>
          </div>
        </div>
      `;
    });
  }
  document.getElementById('lista-aprobaciones').innerHTML = html;
}

async function aprobarComercio(id, whatsapp, correo) {
  if (!confirm('¿APROBAR este comercio? Quedará activo en la app.')) return;
  await updateDoc(doc(db, 'usuarios', id), { estado: 'aprobado', fechaAprobacion: new Date() });

  const mensaje = `✅ ¡TU COMERCIO FUE APROBADO!\nBienvenido a Mujer Express 🎉\n\nYa podés ingresar con tu correo: ${correo}\n— Mujer Express`;
  if (whatsapp) enviarPorWhatsApp(whatsapp, mensaje);
  alert('✅ Comercio APROBADO y notificado.');
  listarComerciosPendientes();
}

async function rechazarComercio(id, whatsapp, nombre) {
  if (!confirm('¿RECHAZAR este comercio? No podrá ingresar.')) return;
  await updateDoc(doc(db, 'usuarios', id), { estado: 'rechazado' });

  if (whatsapp) {
    enviarPorWhatsApp(whatsapp, `Hola ${nombre}. Lamentablemente tu inscripción en Mujer Express no fue aprobada en esta instancia. Gracias por tu interés.`);
  }
  alert('✅ Comercio RECHAZADO.');
  listarComerciosPendientes();
}

// ==========================================
// RESUMEN GENERAL
// ==========================================
async function cargarResumenGeneral() {
  const snapUsuarios = await getDocs(collection(db, 'usuarios'));
  const snapPedidos = await getDocs(collection(db, 'pedidos'));

  let comercios = 0, repartidores = 0, clientes = 0, admins = 0;
  let totalVentas = 0, totalComisionApp = 0;

  snapUsuarios.forEach(u => {
    const d = u.data();
    if (d.rol === 'comercio' && d.estado === 'aprobado') comercios++;
    if (d.rol === 'repartidor') repartidores++;
    if (d.rol === 'cliente') clientes++;
    if (d.rol === 'dueno') admins++;
  });

  snapPedidos.forEach(p => {
    const d = p.data();
    if (d.total && d.estado !== 'pendientePago') {
      totalVentas += d.total;
      totalComisionApp += d.total * (configuracion.comisionApp / 100);
    }
  });

  document.getElementById('datos-resumen').innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
      <div class="tarjeta" style="text-align:center;"><h3>🏪 Comercios Activos</h3><p style="font-size:24px; font-weight:bold; margin:0;">${comercios}</p></div>
      <div class="tarjeta" style="text-align:center;"><h3>🚚 Repartidores</h3><p style="font-size:24px; font-weight:bold; margin:0;">${repartidores}</p></div>
      <div class="tarjeta" style="text-align:center;"><h3>👤 Clientes</h3><p style="font-size:24px; font-weight:bold; margin:0;">${clientes}</p></div>
      <div class="tarjeta" style="text-align:center;"><h3>🔒 Administradores</h3><p style="font-size:24px; font-weight:bold; margin:0;">${admins}</p></div>
    </div>
    <hr>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-top:12px;">
      <div class="tarjeta" style="text-align:center; background:#e3f2fd;"><h3>💰 Total Vendido</h3><p style="font-size:24px; font-weight:bold; margin:0;">$${totalVentas.toFixed(2)}</p></div>
      <div class="tarjeta" style="text-align:center; background:#e8f5e9;"><h3>📈 Recaudación App (${configuracion.comisionApp}%)</h3><p style="font-size:24px; font-weight:bold; margin:0; color:green;">$${totalComisionApp.toFixed(2)}</p></div>
    </div>
    <hr>
    <p style="font-size:13px; color:#666;">Comisiones vigentes: App ${configuracion.comisionApp}% — Repartidor ${configuracion.comisionRepartidor}%</p>
  `;
}

// ==========================================
// ENVIAR MENSAJE POR WHATSAPP
// ==========================================
function enviarPorWhatsApp(numero, texto) {
  let tel = numero.replace(/\D/g, '');
  if (!tel.startsWith('+')) tel = '+' + tel;
  const url = `https://wa.me/${tel.slice(1)}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}