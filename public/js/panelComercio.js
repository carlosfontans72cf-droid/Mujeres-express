import { db, auth } from './firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { calcularMontos } from './calculos.js';

export async function mostrarPanelComercio(contenedor, uidComercio) {
  contenedor.innerHTML = `
    <div class="tarjeta">
      <h2>🏪 Panel Comerciante</h2>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      <h3>📦 Cargar Producto</h3>
      <input type="text" id="prodNombre" placeholder="Nombre del producto">
      <input type="number" step="0.01" id="prodPrecio" placeholder="Precio">
      <input type="text" id="prodDesc" placeholder="Descripción (opcional)">
      <label style="display:flex; gap:8px;"><input type="checkbox" id="prodOferta"> En oferta del día anterior</label>
      <button id="btnGuardarProd" class="primario">Guardar Producto</button>
      <hr style="margin:16px 0;">
      <h3>📋 Pedidos Pendientes</h3>
      <div id="listaPedidos"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  document.getElementById('btnGuardarProd').onclick = guardarProducto;

  async function guardarProducto() {
    const nombre = document.getElementById('prodNombre').value.trim();
    const precio = Number(document.getElementById('prodPrecio').value);
    const descripcion = document.getElementById('prodDesc').value.trim();
    const oferta = document.getElementById('prodOferta').checked;
    if (!nombre || !precio) return alert('Complete nombre y precio.');
    await addDoc(collection(db, 'productos'), {
      idComercio: uidComercio, nombre, precio, descripcion, oferta, disponible: true, fecha: serverTimestamp()
    });
    alert('✅ Producto guardado');
    document.getElementById('prodNombre').value = '';
    document.getElementById('prodPrecio').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodOferta').checked = false;
  }

  await cargarPedidos();
  async function cargarPedidos() {
    const snap = await getDocs(query(collection(db, 'pedidos'), where('idComercio', '==', uidComercio), where('estado', 'in', ['pendienteAprobacionComercio','aprobadoEsperaRepartidor','aceptadoPorRepartidor'])), orderBy('fechaCreacion','desc'));
    const caja = document.getElementById('listaPedidos'); caja.innerHTML = '';
    if(snap.empty){caja.innerHTML='<p>Sin pedidos pendientes.</p>';return;}
    const est = {pendienteAprobacionComercio:'⏳ Pendiente',aprobadoEsperaRepartidor:'✅ Aprobado',aceptadoPorRepartidor:'🛵 En camino',entregado:'✅ Entregado'};
    snap.forEach(async d => {
      const p = d.data();
      const m = p.montos || await calcularMontos(p.totalBruto||0);
      const div = document.createElement('div'); div.className='tarjeta';
      div.innerHTML = `
        <p><strong>Total:</strong> $${(p.totalBruto||0).toFixed(2)}</p>
        <p><strong>Le queda a comercio:</strong> $${m.netoComercio.toFixed(2)}</p>
        <p><strong>Estado:</strong> ${est[p.estado]||p.estado}</p>
        <p>Comprobante: ${p.comprobantePago||'—'}</p>
        ${p.estado==='pendienteAprobacionComercio'?`<button data-id="${d.id}" class="btnAprobar exito">✅ Aprobar Pedido</button>`:''}
      `;
      caja.appendChild(div);
    });
    setTimeout(()=>{
      document.querySelectorAll('.btnAprobar').forEach(b=>{
        b.onclick=async e=>{
          const ref=doc(db,'pedidos',e.target.dataset.id);
          await updateDoc(ref,{estado:'aprobadoEsperaRepartidor'});
          alert('✅ Pedido aprobado. Visible para repartidores.');
          cargarPedidos();
        };
      });
    },300);
  }
}