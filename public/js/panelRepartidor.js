import { db, auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

export async function mostrarPanelRepartidor(contenedor) {
  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>🛵 Panel Repartidor</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      <h3>📋 Pedidos Disponibles — El primero que acepta se lo queda</h3>
      <div id="listaPedidos"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  await cargarPedidos();

  async function cargarPedidos() {
    const snap = await getDocs(query(collection(db, 'pedidos'), where('estado', '==', 'aprobadoEsperaRepartidor'), orderBy('fechaCreacion','asc')));
    const caja = document.getElementById('listaPedidos'); caja.innerHTML = '';
    if(snap.empty){caja.innerHTML='<p>Sin pedidos disponibles por ahora.</p>';return;}
    snap.forEach(async d=>{
      const p=d.data();
      const div=document.createElement('div'); div.className='tarjeta';
      div.innerHTML=`
        <p><strong>Total del pedido:</strong> $${(p.totalBruto||0).toFixed(2)}</p>
        <p><strong>Su comisión (7%):</strong> $${(p.montos?.comisionRepartidor||0).toFixed(2)}</p>
        <p>Items: ${(p.items||[]).map(i=>i.nombre).join(', ')}</p>
        <button data-id="${d.id}" class="btnAceptar primario">✅ Aceptar Pedido</button>
      `;
      caja.appendChild(div);
    });
    setTimeout(()=>{
      document.querySelectorAll('.btnAceptar').forEach(b=>{
        b.onclick=async e=>{
          const pid=e.target.dataset.id;
          const ref=doc(db,'pedidos',pid);
          await updateDoc(ref,{estado:'aceptadoPorRepartidor',idRepartidor:auth.currentUser.uid,fechaAceptado:serverTimestamp()});
          alert('✅ Pedido aceptado. Entregalo y marca como finalizado.');
          e.target.textContent='🛵 En camino'; e.target.disabled=true;
          cargarPedidos();
        };
      });
    },300);
  }
}