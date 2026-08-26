import { db, auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';

export async function mostrarPanelDueno(contenedor) {
  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>👑 Panel Dueño</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      <h3>⚙️ Configurar Comisiones</h3>
      <label>Comisión App (%): <input type="number" id="porcApp" value="10"></label>
      <label>Comisión Repartidor (%): <input type="number" id="porcRepartidor" value="7"></label>
      <button id="btnGuardarComisiones" class="exito">Guardar Porcentajes</button>
      <hr style="margin:16px 0;">
      <h3>👤 Usuarios Pendientes de Aprobación</h3>
      <div id="listaUsuarios"></div>
      <hr style="margin:16px 0;">
      <h3>📊 Todos los Pedidos del Sistema</h3>
      <div id="todosPedidos"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  document.getElementById('btnGuardarComisiones').onclick = async () => {
    const porcApp = Number(document.getElementById('porcApp').value);
    const porcRep = Number(document.getElementById('porcRepartidor').value);
    await setDoc(doc(db, 'configuracion', 'comisiones'), { porcentajeApp: porcApp, porcentajeRepartidor: porcRep });
    alert('✅ Comisiones actualizadas');
  };

  await cargarUsuariosPendientes();
  await cargarTodosPedidos();

  async function cargarUsuariosPendientes() {
    const snap = await getDocs(collection(db, 'usuarios'));
    const caja = document.getElementById('listaUsuarios'); caja.innerHTML = '';
    snap.forEach(async d=>{
      const u=d.data();
      if(u.estado!=='pendiente')return;
      const div=document.createElement('div'); div.className='tarjeta';
      div.innerHTML=`
        <p><strong>${u.nombreCompleto}</strong> — ${u.rol}</p>
        <p>${u.correo}</p>
        <button data-id="${d.id}" data-estado="aprobado" class="btnEstado exito">✅ Aprobar</button>
        <button data-id="${d.id}" data-estado="rechazado" class="btnEstado peligro">❌ Rechazar</button>
      `;
      caja.appendChild(div);
    });
    setTimeout(()=>{
      document.querySelectorAll('.btnEstado').forEach(b=>{
        b.onclick=async e=>{
          const ref=doc(db,'usuarios',e.target.dataset.id);
          await updateDoc(ref,{estado:e.target.dataset.estado});
          alert('✅ Usuario actualizado'); cargarUsuariosPendientes();
        };
      });
    },300);
  }

  async function cargarTodosPedidos() {
    const snap = await getDocs(collection(db, 'pedidos'));
    const caja = document.getElementById('todosPedidos'); caja.innerHTML = '';
    if(snap.empty){caja.innerHTML='<p>Sin pedidos registrados.</p>';return;}
    snap.forEach(d=>{
      const p=d.data();
      const div=document.createElement('div'); div.className='tarjeta';
      div.innerHTML=`<p>Total: $${(p.totalBruto||0).toFixed(2)} — Estado: ${p.estado}</p>`;
      caja.appendChild(div);
    });
  }
}