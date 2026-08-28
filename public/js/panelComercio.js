import { db, auth } from './firebase.js';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';

const CATEGORIAS = [
  "Panadería", "Carnicería", "Verdulería", "Frutería", "Rotisería",
  "Lácteos y huevos", "Bebidas", "Alimentos", "Otros"
];

let todosLosProductos = [];

export async function mostrar(usuario) {
  const nom = usuario.nombreCompleto || usuario.nombre || 'Comercio';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="contenedor">
      <h1>🏪 ${nom}</h1>
      <hr>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button onclick="cambiarSeccion('agregar')">➕ Agregar Producto</button>
        <button onclick="cambiarSeccion('pedidos')">📋 Pedidos Pendientes</button>
        <button onclick="cambiarSeccion('perfil')">👤 Mi Perfil / Mapa</button>
        <button onclick="subirListaPrecios()">📄 Subir lista Excel</button>
        <button onclick="compartirPorWhatsApp()">📲 Compartir por WhatsApp</button>
        <button onclick="exportarHistorial()">📊 Exportar Historial</button>
        <button onclick="cerrarSesion()">🚪 Salir</button>
      </div>

      <div id="zona-perfil" style="display:none;">
        <h3>📍 Ubicación en el Mapa</h3>
        <input type="text" id="comercio-direccion" placeholder="Tu dirección completa">
        <input type="text" id="comercio-whatsapp" placeholder="Tu número de WhatsApp">
        <input type="text" id="comercio-horarios" placeholder="Horarios de atención">
        <div style="width:100%;height:200px;background:#eee;display:flex;align-items:center;justify-content:center;margin:8px 0;">📍 Mapa: marcá tu ubicación</div>
        <button onclick="guardarPerfil()">✅ Guardar Datos del Comercio</button>
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
        <button onclick="guardarProducto()">✅ Guardar Producto</button>
      </div>

      <div id="zona-pedidos" style="display:none;">
        <h3>📋 Pedidos Pendientes</h3>
        <div id="lista-pedidos">Cargando pedidos...</div>
      </div>

      <hr>
      <h3>📦 Mis Productos</h3>
      <input type="text" id="buscar-prod" placeholder="🔍 Buscar producto..." oninput="filtrarMisProductos()">
      <select id="filtro-cat-prod" onchange="filtrarMisProductos()">
        <option value="">Todas las categorías</option>
        ${CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <div id="lista-productos"></div>
    </div>
  `;

  window.cambiarSeccion = cambiarSeccion;
  window.guardarProducto = guardarProducto;
  window.aprobarPedido = aprobarPedido;
  window.marcarOferta = marcarOferta;
  window.duplicarProducto = duplicarProducto;
  window.suspenderProducto = suspenderProducto;
  window.filtrarMisProductos = filtrarMisProductos;
  window.guardarPerfil = guardarPerfil;
  window.subirListaPrecios = () => alert('📄 Seleccioná tu archivo Excel con la lista de precios');
  window.compartirPorWhatsApp = compartirPorWhatsApp;
  window.exportarHistorial = exportarHistorial;
  window.abrirChatConCliente = (nombre) => alert(`💬 Chat abierto con: ${nombre}`);
  window.cerrarSesion = async () => {
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('./firebase.js');
  await signOut(auth);
  location.reload();
};

  cargarPedidosPendientes();
  await cargarMisProductos();
}

function cambiarSeccion(nombre) {
  document.getElementById('zona-agregar').style.display = nombre === 'agregar' ? 'block' : 'none';
  document.getElementById('zona-pedidos').style.display = nombre === 'pedidos' ? 'block' : 'none';
  document.getElementById('zona-perfil').style.display = nombre === 'perfil' ? 'block' : 'none';
}

async function guardarPerfil() {
  const direccion = document.getElementById('comercio-direccion').value.trim();
  const whatsapp = document.getElementById('comercio-whatsapp').value.trim();
  const horarios = document.getElementById('comercio-horarios').value.trim();
  await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { direccion, whatsapp, horarios });
  alert('✅ Perfil y ubicación guardados. Aparecerá en el mapa para los clientes.');
}

async function guardarProducto() {
  const nombre = document.getElementById('prod_nombre').value.trim();
  const categoria = document.getElementById('prod_categoria').value;
  const descripcion = document.getElementById('prod_descripcion').value.trim();
  const precio = parseFloat(document.getElementById('prod_precio').value);
  if (!nombre || !precio || !categoria) return alert('⚠️ Completá nombre, precio y categoría');

  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid, nombre, descripcion, categoria, precio,
    precioRebajado: null, esOferta: false, activo: true, fechaCreacion: new Date()
  });
  alert('✅ Producto guardado');
  document.getElementById('prod_nombre').value = '';
  document.getElementById('prod_precio').value = '';
  cargarMisProductos();
}

function cargarPedidosPendientes() {
  const q = query(collection(db, 'pedidos'), where('idComercio', '==', auth.currentUser.uid),
    where('estado', 'in', ['pendienteAprobacion']), orderBy('fecha', 'desc'));
  onSnapshot(q, snap => {
    let html = '';
    if (snap.empty) {
      html = '<p style="color:green;">✅ Sin pedidos pendientes</p>';
    } else {
      snap.forEach(d => {
        const p = d.data();
        const totalComercio = Math.round((p.total || 0) * 0.83);
        html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
          <strong>Cliente:</strong> ${p.nombreCliente}
          <button onclick="abrirChatConCliente('${p.nombreCliente}')" style="margin-left:8px;">💬 Chat</button><br>
          <strong>Dirección:</strong> ${p.direccionCliente}<br>
          <strong>Total del pedido:</strong> $${p.total}<br>
          <strong>Tu parte (83%):</strong> $${totalComercio}<br>
          <strong>Productos:</strong> ${p.productos.map(x => x.nombre).join(', ')}<br>
          <button onclick="aprobarPedido('${d.id}')">✅ APROBAR</button>
        </div>`;
      });
    }
    document.getElementById('lista-pedidos').innerHTML = html;
  });
}

async function aprobarPedido(idPedido) {
  if (!confirm('¿Aprobás este pedido? Queda disponible para repartidores.')) return;
  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'esperandoRepartidor', fechaAprobacionComercio: new Date()
  });
  alert('✅ Pedido aprobado → disponible para repartidores');
}

async function cargarMisProductos() {
  const q = query(collection(db, 'productos'), where('idComercio', '==', auth.currentUser.uid));
  const snap = await getDocs(q);
  todosLosProductos = [];
  snap.forEach(d => { todosLosProductos.push({ id: d.id, ...d.data() }); });
  mostrarListaProductos(todosLosProductos);
}

function mostrarListaProductos(lista) {
  let html = '';
  lista.filter(p => p.activo !== false).forEach(p => {
    const precioMostrar = p.esOferta ? `<s>$${p.precio}</s> 🔥 $${p.precioRebajado}` : `$${p.precio}`;
    html += `<div data-cat="${p.categoria || ''}" style="border:1px solid #ddd; padding:8px; margin:4px;">
      <strong>${p.nombre}</strong> — ${precioMostrar}<br>
      ${p.descripcion || ''} — ${p.categoria || 'Sin categoría'}<br>
      <button onclick="marcarOferta('${p.id}',${p.precio})">🔥 Oferta</button>
      <button onclick="duplicarProducto('${p.id}')">📋 Copiar</button>
      <button onclick="suspenderProducto('${p.id}')">⏸️ Suspender</button>
    </div>`;
  });
  document.getElementById('lista-productos').innerHTML = html || '<p>Sin productos cargados</p>';
}

function filtrarMisProductos() {
  const busq = document.getElementById('buscar-prod').value.toLowerCase();
  const catSel = document.getElementById('filtro-cat-prod').value;
  const filtrados = todosLosProductos.filter(p => {
    const coincideBusq = !busq || p.nombre.toLowerCase().includes(busq);
    const coincideCat = !catSel || p.categoria === catSel;
    return coincideBusq && coincideCat && p.activo !== false;
  });
  mostrarListaProductos(filtrados);
}

async function marcarOferta(idProd, precioOriginal) {
  const reb = prompt(`Precio rebajado (menor a $${precioOriginal}):`);
  if (!reb) return;
  const rebajado = parseFloat(reb.replace(',', '.'));
  if (isNaN(rebajado) || rebajado >= precioOriginal) return alert('⚠️ El precio debe ser menor al original');
  await updateDoc(doc(db, 'productos', idProd), { esOferta: true, precioRebajado: rebajado });
  alert('✅ Marcado como oferta');
  cargarMisProductos();
}

async function duplicarProducto(idProd) {
  const orig = todosLosProductos.find(p => p.id === idProd);
  if (!orig) return;
  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid, nombre: orig.nombre + ' (copia)',
    descripcion: orig.descripcion, categoria: orig.categoria, precio: orig.precio,
    activo: true, fechaCreacion: new Date()
  });
  alert('✅ Duplicado');
  cargarMisProductos();
}

async function suspenderProducto(idProd) {
  if (!confirm('¿Suspender este producto? Deja de verse.')) return;
  await updateDoc(doc(db, 'productos', idProd), { activo: false });
  alert('✅ Suspendido');
  cargarMisProductos();
}

async function compartirPorWhatsApp() {
  const texto = `🏪 Mi Comercio — Lista de Productos\n\n${todosLosProductos.filter(p=>p.activo!==false).map(p=>`${p.nombre} — $${p.esOferta?p.precioRebajado:p.precio}`).join('\n')}`;
  const enlace = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(enlace, '_blank');
  alert('✅ Se abrió WhatsApp con tu lista de productos');
}

async function exportarHistorial() {
  const q = query(collection(db, 'pedidos'), where('idComercio', '==', auth.currentUser.uid), orderBy('fecha', 'desc'));
  const snap = await getDocs(q);
  let texto = 'HISTORIAL DE PEDIDOS — Mujer Express\n========================================\n\n';
  let total = 0, comisionApp = 0, comisionRepartidor = 0, netoComercio = 0;
  snap.forEach(d => {
    const p = d.data();
    const t = p.total || 0;
    texto += `Fecha: ${p.fecha?.toDate().toLocaleDateString()||'Sin fecha'} | Cliente: ${p.nombreCliente} | Total: $${t} | Estado: ${p.estado}\n`;
    total += t; comisionApp += Math.round(t * 0.10); comisionRepartidor += Math.round(t * 0.07); netoComercio += Math.round(t * 0.83);
  });
  texto += `\n========================================\nTOTAL VENDIDO: $${total}\nComisión App (10%): $${comisionApp}\nComisión Repartidor (7%): $${comisionRepartidor}\nTU PARTE (83%): $${netoComercio}`;
  await navigator.clipboard.writeText(texto);
  alert('✅ Historial copiado al portapapeles. Pegalo en Excel o compártelo por WhatsApp.');
}