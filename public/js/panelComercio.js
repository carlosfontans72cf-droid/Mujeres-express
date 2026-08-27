import { db, auth } from './firebase.js';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';

const CATEGORIAS = [
  "Panadería", "Carnicería", "Verdulería", "Frutería", "Rotisería",
  "Lácteos y huevos", "Bebidas", "Limpieza", "Alimentos", "Electrónica",
  "Ropa", "Hogar y cocina", "Deportes", "Farmacias", "Mascotas",
  "Bazar", "Confitería", "Pastelería", "Comida casera", "Otros"
];

let todosLosProductos = [];

export async function mostrarPanelComercio(usuario) {
  const nom = usuario.nombreCompleto || usuario.nombre || 'Comercio';
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <div style="background:#fff3cd; padding:10px; border-radius:6px; border:2px solid #ffc107; margin-bottom:12px; font-weight:bold;">
        ⚠️ MUJER EXPRESS NUNCA te pide dinero, claves ni códigos por WhatsApp. Es estafa.
      </div>
      <h1>🏪 ${nom}</h1>
      <hr>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button class="boton-principal" onclick="cambiarSeccion('agregar')">➕ Agregar Producto</button>
        <button class="boton-principal" onclick="cambiarSeccion('pedidos')">📋 Pedidos Pendientes</button>
        <button class="boton-principal" onclick="exportarHistorial()">📊 Exportar Historial</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <div id="zona-agregar">
        <h3>➕ Agregar Producto</h3>
        <input type="text" id="prod_nombre" placeholder="Nombre del producto">
        <select id="prod_categoria">
          <option value="">— Elegir Categoría —</option>
          ${CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="text" id="prod_descripcion" placeholder="Descripción (opcional)">
        <input type="number" id="prod_precio" placeholder="Precio">
        <button class="boton-confirmar" onclick="guardarProducto()">✅ Guardar Producto</button>
      </div>
      <div id="zona-pedidos" style="display:none;">
        <h3>📋 Pedidos Pendientes de Aprobación</h3>
        <div id="lista-pedidos">Cargando pedidos...</div>
      </div>
      <hr>
      <h3>📦 Mis Productos</h3>
      <div id="lista-productos"></div>
    </div>
  `;

  window.cambiarSeccion = cambiarSeccion;
  window.guardarProducto = guardarProducto;
  window.aprobarPedido = aprobarPedido;
  window.marcarOferta = marcarOferta;
  window.duplicarProducto = duplicarProducto;
  window.suspenderProducto = suspenderProducto;
  window.exportarHistorial = exportarHistorial;
  window.cerrarSesion = () => location.reload();

  cargarPedidosPendientes();
  await cargarMisProductos();
}

function cambiarSeccion(nombre) {
  document.getElementById('zona-agregar').style.display = nombre==='agregar'?'block':'none';
  document.getElementById('zona-pedidos').style.display = nombre==='pedidos'?'block':'none';
}

async function guardarProducto() {
  const nombre = document.getElementById('prod_nombre').value.trim();
  const categoria = document.getElementById('prod_categoria').value;
  const descripcion = document.getElementById('prod_descripcion').value.trim();
  const precio = parseFloat(document.getElementById('prod_precio').value);
  if (!nombre || !precio || !categoria) return alert('Completá nombre, precio y categoría');

  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid, nombre, descripcion, categoria, precio,
    precioRebajado: null, esOferta: false, activo: true, fechaCreacion: new Date()
  });
  alert('✅ Producto guardado');
  document.getElementById('prod_nombre').value='';
  document.getElementById('prod_precio').value='';
  cargarMisProductos();
}

function cargarPedidosPendientes() {
  const q = query(collection(db, 'pedidos'), where('idComercio','==',auth.currentUser.uid), where('estado','in',['pendienteAprobacion']), orderBy('fecha','desc'));
  onSnapshot(q, snap => {
    let html='';
    if (snap.empty) { html='<p style="color:green;">✅ Sin pedidos pendientes</p>'; }
    else { snap.forEach(d=>{
      const p=d.data();
      html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
        <strong>Cliente:</strong> ${p.nombreCliente}<br>
        <strong>Dirección:</strong> ${p.direccionCliente}<br>
        <strong>Total:</strong> $${p.total}<br>
        <strong>Productos:</strong> ${p.productos.map(x=>x.nombre).join(', ')}<br>
        <button class="boton-confirmar" onclick="aprobarPedido('${d.id}')">✅ APROBAR PEDIDO</button>
      </div>`;
    });}
    document.getElementById('lista-pedidos').innerHTML=html;
  });
}

async function aprobarPedido(idPedido) {
  if(!confirm('¿Aprobás este pedido? Al aprobarlo queda disponible para repartidores.')) return;
  await updateDoc(doc(db,'pedidos',idPedido), { estado:'esperandoRepartidor', fechaAprobacionComercio:new Date() });
  alert('✅ Pedido aprobado → disponible para repartidores');
}

async function cargarMisProductos() {
  const q = query(collection(db,'productos'), where('idComercio','==',auth.currentUser.uid));
  const snap=await getDocs(q);
  todosLosProductos=[];
  snap.forEach(d=>{ todosLosProductos.push({id:d.id,...d.data()}); });
  mostrarListaProductos(todosLosProductos);
}

function mostrarListaProductos(lista) {
  let html='';
  lista.filter(p=>p.activo!==false).forEach(p=>{
    const precioMostrar = p.esOferta ? `<s>$${p.precio}</s> 🔥 $${p.precioRebajado}` : `$${p.precio}`;
    html += `<div style="border:1px solid #ddd; padding:8px; margin:4px; border-radius:4px;">
      <strong>${p.nombre}</strong> — ${precioMostrar}<br>
      ${p.descripcion||''} — ${p.categoria}<br>
      <small>Agregado: ${p.fechaCreacion?.toDate().toLocaleDateString()||''}</small><br>
      <button onclick="marcarOferta('${p.id}',${p.precio})">🔥 Oferta</button>
      <button onclick="duplicarProducto('${p.id}')">📋 Copiar</button>
      <button onclick="suspenderProducto('${p.id}')">⏸️ Suspender</button>
    </div>`;
  });
  document.getElementById('lista-productos').innerHTML = html || '<p>Sin productos cargados</p>';
}

async function marcarOferta(idProd, precioOriginal) {
  const reb=prompt(`Precio rebajado (menor a $${precioOriginal}):`);
  if(!reb) return;
  const rebajado=parseFloat(reb.replace(',','.'));
  if(isNaN(rebajado)||rebajado>=precioOriginal) return alert('El precio debe ser menor al original');
  await updateDoc(doc(db,'productos',idProd),{esOferta:true,precioRebajado:rebajado});
  alert('✅ Marcado como oferta');
  cargarMisProductos();
}

async function duplicarProducto(idProd) {
  const orig=todosLosProductos.find(p=>p.id===idProd);
  if(!orig) return;
  await addDoc(collection(db,'productos'),{idComercio:auth.currentUser.uid,nombre:orig.nombre+' (copia)',descripcion:orig.descripcion,categoria:orig.categoria,precio:orig.precio,activo:true,fechaCreacion:new Date()});
  alert('✅ Duplicado');
  cargarMisProductos();
}

async function suspenderProducto(idProd) {
  if(!confirm('¿Suspender este producto? Deja de verse en la lista.')) return;
  await updateDoc(doc(db,'productos',idProd),{activo:false});
  alert('✅ Suspendido');
  cargarMisProductos();
}

async function exportarHistorial() {
  const q=query(collection(db,'pedidos'),where('idComercio','==',auth.currentUser.uid),orderBy('fecha','desc'));
  const snap=await getDocs(q);
  let texto='HISTORIAL DE PEDIDOS — Mujer Express\n========================================\n\n';
  let total=0;
  snap.forEach(d=>{
    const p=d.data();
    texto += `Fecha: ${p.fecha?.toDate().toLocaleDateString()||'Sin fecha'} | Cliente: ${p.nombreCliente} | Total: $${p.total} | Estado: ${p.estado}\n`;
    total += p.total||0;
  });
  texto += `\n========================================\nTOTAL VENDIDO: $${total}\nCOMISIÓN APP (10%): $${(total*0.10).toFixed(2)}\nTU PARTE (90%): $${(total*0.90).toFixed(2)}\n`;
  await navigator.clipboard.writeText(texto);
  alert('✅ Historial copiado al portapapeles. Pegalo en Excel o WhatsApp.');
}