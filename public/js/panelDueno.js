import { db } from './firebase.js';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

export async function mostrarPanelDueno(usuario) {
  const app = document.getElementById('app');
  const refConf = doc(db, 'configuracion', 'parametros');
  const snapConf = await getDoc(refConf);
  const conf = snapConf.exists() ? snapConf.data() : { comisionApp:10, comisionRepartidor:7 };

  app.innerHTML = `
    <div class="contenedor">
      <h1>👑 Panel Dueño</h1>
      <hr>
      <h3>⚙️ Comisiones Editables</h3>
      <label>Comisión App (%):</label>
      <input type="number" id="comisionApp" value="${conf.comisionApp}">
      <label>Comisión Repartidor (%):</label>
      <input type="number" id="comisionRepartidor" value="${conf.comisionRepartidor}">
      <button class="boton-confirmar" onclick="guardarComisiones()">✅ Guardar Comisiones</button>
      <hr>
      <h3>✅ Aprobar Comercios y Repartidores</h3>
      <div id="lista-pendientes">Cargando...</div>
      <hr>
      <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
    </div>
  `;

  window.guardarComisiones = async () => {
    const cA = parseFloat(document.getElementById('comisionApp').value);
    const cR = parseFloat(document.getElementById('comisionRepartidor').value);
    await updateDoc(refConf, { comisionApp:cA, comisionRepartidor:cR });
    alert('✅ Comisiones actualizadas. Se aplican automáticamente a todos los pedidos.');
  };

  window.aprobarUsuario = async (uid) => {
    await updateDoc(doc(db,'usuarios',uid), { estado:'aprobado' });
    alert('✅ Usuario aprobado. Ya puede ingresar.');
    cargarPendientes();
  };

  window.rechazarUsuario = async (uid) => {
    if(!confirm('¿Rechazar? No podrá ingresar.')) return;
    await updateDoc(doc(db,'usuarios',uid), { estado:'rechazado' });
    alert('❌ Usuario rechazado');
    cargarPendientes();
  };

  window.cerrarSesion = () => location.reload();

  window.cargarPendientes = async () => {
    const snap = await getDocs(collection(db,'usuarios'));
    let html='';
    snap.forEach(d=>{
      const u=d.data();
      if(u.estado==='pendiente') {
        html += `<div style="border:1px solid #ccc; padding:10px; margin:4px; border-radius:6px;">
          <strong>${u.nombreCompleto}</strong> — ${u.rol.toUpperCase()}<br>
          Correo: ${u.correo}<br>
          Fecha registro: ${u.fechaRegistro?.toDate().toLocaleDateString()||'Sin fecha'}<br>
          <button class="boton-confirmar" onclick="aprobarUsuario('${d.id}')">✅ Aprobar</button>
          <button class="boton-alerta" onclick="rechazarUsuario('${d.id}')">❌ Rechazar</button>
        </div>`;
      }
    });
    document.getElementById('lista-pendientes').innerHTML = html || '<p style="color:green;">✅ Sin solicitudes pendientes</p>';
  };

  await window.cargarPendientes();
}