import { db, auth, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';

let datosComercio = {};
let ubicacionComercio = { lat: null, lng: null };
let todosLosProductos = [];

const CATEGORIAS = [
  "Panadería", "Carnicería", "Verdulería", "Frutería", "Rotisería",
  "Lácteos y huevos", "Bebidas", "Limpieza", "Alimentos", "Electrónica",
  "Ropa", "Hogar y cocina", "Deportes", "Farmacias", "Mascotas",
  "Bazar", "Confitería", "Pastelería", "Comida casera", "Otros"
];

export async function mostrarPanelComercio(usuario) {
  datosComercio = usuario;
  ubicacionComercio.lat = Number(usuario.latitud) || null;
  ubicacionComercio.lng = Number(usuario.longitud) || null;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <div style="background:#fff3cd; padding:10px; border-radius:6px; border:2px solid #ffc107; margin-bottom:12px; font-weight:bold;">
        ⚠️ MUJER EXPRESS NUNCA te pide dinero, claves ni códigos por WhatsApp. Es estafa.
      </div>
      <h1>🏪 ${datosComercio.nombreCompleto}</h1>
      <hr>
      <h3>🛠️ Sección</h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button class="boton-principal" onclick="cambiarSeccion('agregar')">➕ Agregar Producto</button>
        <button class="boton-principal" onclick="cambiarSeccion('pedidos')">📋 Pedidos Pendientes</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <div id="zona-agregar">
        <h3>➕ Agregar Producto</h3>
        <input type="text" id="prod_nombre" placeholder="Nombre">
        <select id="prod_categoria">
          <option value="">— Categoría —</option>
          ${CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="number" id="prod_precio" placeholder="Precio">
        <button class="boton-confirmar" onclick="guardarProducto()">✅ Guardar</button>
      </div>
      <div id="zona-pedidos" style="display:none;">
        <h3>📋 Pedidos Pendientes</h3>
        <div id="lista-pedidos">Cargando...</div>
      </div>
      <hr>
      <h3>📦 Mis Productos</h3>
      <div id="lista-productos"></div>
    </div>
  `;

  window.cambiarSeccion = n => {
    document.getElementById('zona-agregar').style.display = n==='agregar'?'block':'none';
    document.getElementById('zona-pedidos').style.display = n==='pedidos'?'block':'none';
  };
  window.guardarProducto = guardarProducto;
  window.cerrarSesion = () => location.reload();

  await cargarMisProductos();
  cargarPedidosPendientes();
}

async function guardarProducto() {
  const nombre = document.getElementById('prod_nombre').value.trim();
  const categoria = document.getElementById('prod_categoria').value;
  const precio = parseFloat(document.getElementById('prod_precio').value);
  if (!nombre || !categoria || !precio) return alert('Completá todos los datos');
  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid, nombre, categoria, precio,
    activo: true, fechaCreacion: new Date()
  });
  alert('✅ Guardado');
  document.getElementById('prod_nombre').value='';
  document.getElementById('prod_precio').value='';
  cargarMisProductos();
}

async function cargarMisProductos() {
  const q = query(collection(db, 'productos'), where('idComercio','==',auth.currentUser.uid));
  const snap = await getDocs(q);
  let html='';
  snap.forEach(d=>{const p=d.data(); html+=`<p><strong>${p.nombre}</strong> — $${p.precio} — ${p.categoria}</p>`;});
  document.getElementById('lista-productos').innerHTML = html || '<p>Sin productos</p>';
}

function cargarPedidosPendientes() {
  const q = query(collection(db, 'pedidos'), where('idComercio','==',auth.currentUser.uid), where('estado','==','pendiente'));
  onSnapshot(q, snap=>{
    let html='';
    snap.forEach(d=>{const p=d.data(); html+=`<p>Pedido: ${p.nombreCliente} — $${p.total}</p>`;});
    document.getElementById('lista-pedidos').innerHTML = html || '<p>Sin pedidos pendientes</p>';
  });
}