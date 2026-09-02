import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { avisoAntiEstafaHTML } from './avisoAntiEstafa.js';
import { abrirChat } from './chat.js';

let comerciosLista = [];
let carrito = [];
let comercioSeleccionado = null;
let comercioSeleccionadoNombre = null;
let ciudadIdActual = null;
let ciudadNombreActual = null;

export async function mostrar(usuario) {
  const app = document.getElementById('app');
  const nom = usuario.nombreCompleto || usuario.nombre || 'Usuario';
  favoritosUid = usuario.favoritos || [];
  ciudadIdActual = usuario.ciudadId || null;
  ciudadNombreActual = usuario.ciudadNombre || null;
  
  app.innerHTML = `
    <div class="contenedor">
      <h1>👤 Bienvenido, ${nom}</h1>
      ${avisoAntiEstafaHTML()}
      <hr>
      <input type="text" id="buscar-comercio" placeholder="🔍 Buscar comercio..." oninput="filtrarComercios()">
      <input type="text" id="buscar-producto" placeholder="🔍 Buscar producto en todos los comercios..." oninput="filtrarProductos()">
      <div id="resultados-busqueda-producto"></div>
      <hr>
      <h3>⭐ Mis Comercios Favoritos</h3>
      <div id="lista-favoritos"></div>
      <h3>🏪 Todos los Comercios</h3>
      <div id="lista-comercios">Cargando comercios...</div>
      <hr>
      <div id="zona-comercio" style="display:none;">
        <h3 id="nombre-comercio"></h3>
        <div id="mapa-comercio" style="width:100%;height:200px;background:#eee;display:flex;align-items:center;justify-content:center;">📍 Mapa del comercio</div>
        <br>
        <input type="text" id="buscar-prod-comercio" placeholder="🔍 Buscar producto en este comercio..." oninput="filtrarProdComercio()">
        <h4>Filtrar por categoría:</h4>
        <select id="filtro-cat" onchange="filtrarProdComercio()">
          <option value="">Todas las categorías</option>
        </select>
        <div id="lista-productos-comercio"></div>
        <hr>
        <h3>🛒 Tu Pedido</h3>
        <div id="carrito-vacio">Carrito vacío</div>
        <div id="lista-carrito"></div>
        <strong>Total: $<span id="total-carrito">0</span></strong>
        <br><br>
        <label>Dirección de entrega:</label>
        <input type="text" id="direccion-entrega" placeholder="Calle, número, barrio">
        <br><br>
        <button onclick="confirmarPedido()">✅ Confirmar Pedido</button>
        <button onclick="abrirChatComercio()">💬 Chatear con Comercio</button>
        <button onclick="cerrarComercio()">← Volver</button>
      </div>
      <hr>
      <button onclick="verMapaRecorrido()">📍 Ver recorrido del repartidor</button>
      <button onclick="cerrarSesion()">🚪 Salir</button>
    </div>
  `;

  window.filtrarComercios = filtrarComercios;
  window.filtrarProductos = filtrarProductos;
  window.filtrarProdComercio = filtrarProdComercio;
  window.elegirComercio = elegirComercio;
  window.marcarFavorito = marcarFavorito;
  window.agregarAlCarrito = agregarAlCarrito;
  window.quitarDelCarrito = quitarDelCarrito;
  window.confirmarPedido = confirmarPedido;
  window.abrirChatComercio = () => {
    if (!comercioSeleccionado) return;
    abrirChat(comercioSeleccionado, comercioSeleccionadoNombre);
  };
  window.verMapaRecorrido = () => alert('📍 Mapa con recorrido del repartidor');
  window.cerrarComercio = () => {
    comercioSeleccionado = null;
    carrito = [];
    document.getElementById('zona-comercio').style.display = 'none';
    document.getElementById('lista-comercios').style.display = 'block';
  };
  window.cerrarSesion = async () => {
  const { signOut } = await import('firebase/auth');
  const { auth } = await import('./firebase.js');
  await signOut(auth);
  location.reload();
};

  await cargarComercios();
  cargarFavoritos();
}

async function cargarComercios() {
  if (!ciudadIdActual) {
    document.getElementById('lista-comercios').innerHTML = '<p>⚠️ Tu cuenta no tiene una ciudad asignada. Contactá a soporte.</p>';
    return;
  }
  const q = query(collection(db, 'usuarios'), where('rol', '==', 'comercio'), where('aprobado', '==', true), where('ciudadId', '==', ciudadIdActual));
  const snap = await getDocs(q);
  comerciosLista = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.bloqueado) return; // no mostrar comercios bloqueados
    comerciosLista.push({ uid: d.id, ...data, esFavorito: favoritosUid.includes(d.id) });
  });
  mostrarListaComercios(comerciosLista);
}

function mostrarListaComercios(lista) {
  let html = '';
  if (lista.length === 0) {
    html = '<p>No hay comercios disponibles.</p>';
  } else {
    lista.forEach(c => {
      const nomCom = c.nombreCompleto || c.nombre || 'Comercio';
      const fav = c.esFavorito ? '⭐' : '☆';
      html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
        <strong>${nomCom}</strong> ${fav}
        <br>📍 ${c.direccion || 'Sin dirección'}
        <br>⭐ Calificación: ${c.calificacion ? c.calificacion.toFixed(1) : 'Sin calificar'}
        <br>
        <button onclick="marcarFavorito('${c.uid}')">${c.esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}</button>
        <button onclick="elegirComercio('${c.uid}','${nomCom}')">🔍 Ver Productos</button>
      </div>`;
    });
  }
  document.getElementById('lista-comercios').innerHTML = html;
}

function filtrarComercios() {
  const busqueda = document.getElementById('buscar-comercio').value.toLowerCase();
  const filtrados = comerciosLista.filter(c => {
    const nom = (c.nombreCompleto || c.nombre || '').toLowerCase();
    return nom.includes(busqueda);
  });
  mostrarListaComercios(filtrados);
}

let temporizadorBusqueda = null;
function filtrarProductos() {
  const busqueda = document.getElementById('buscar-producto').value.trim().toLowerCase();
  const cont = document.getElementById('resultados-busqueda-producto');
  clearTimeout(temporizadorBusqueda);
  if (!busqueda) { cont.innerHTML = ''; return; }
  // Pequeño debounce para no disparar una consulta por cada letra tecleada muy rápido
  temporizadorBusqueda = setTimeout(async () => {
    const q = query(
      collection(db, 'productos'),
      where('ciudadId', '==', ciudadIdActual),
      where('nombreLower', '>=', busqueda),
      where('nombreLower', '<=', busqueda + '\uf8ff')
    );
    const snap = await getDocs(q);
    let html = '';
    snap.forEach(d => {
      const p = d.data();
      if (p.activo === false) return;
      const comercio = comerciosLista.find(c => c.uid === p.idComercio);
      const nomCom = comercio ? (comercio.nombreCompleto || comercio.nombre) : 'Comercio';
      const precioValor = p.esOferta ? p.precioRebajado : p.precio;
      html += `<div style="border:1px solid #ddd; padding:8px; margin:4px;">
        <strong>${p.nombre}</strong> — $${precioValor} ${p.esOferta ? '🔥 OFERTA' : ''}
        <br><small>🏪 ${nomCom}</small>
        <br><button onclick="elegirComercio('${p.idComercio}','${nomCom.replace(/'/g,"\\'")}')">Ver comercio</button>
      </div>`;
    });
    cont.innerHTML = html || '<p>No se encontraron productos con ese nombre.</p>';
  }, 200);
}

let favoritosUid = [];

function cargarFavoritos() {
  const favs = comerciosLista.filter(c => favoritosUid.includes(c.uid));
  if (favs.length === 0) {
    document.getElementById('lista-favoritos').innerHTML = '<p>⭐ Aquí aparecerán tus comercios favoritos</p>';
    return;
  }
  let html = '';
  favs.forEach(c => {
    const nomCom = c.nombreCompleto || c.nombre || 'Comercio';
    html += `<div style="border:1px solid #ccc; padding:10px; margin:4px;">
      <strong>${nomCom}</strong> ⭐
      <button onclick="elegirComercio('${c.uid}','${nomCom.replace(/'/g,"\\'")}')">🔍 Ver Productos</button>
    </div>`;
  });
  document.getElementById('lista-favoritos').innerHTML = html;
}

async function marcarFavorito(uidComercio) {
  const { arrayUnion, arrayRemove } = await import('firebase/firestore');
  const yaEsFavorito = favoritosUid.includes(uidComercio);
  await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), {
    favoritos: yaEsFavorito ? arrayRemove(uidComercio) : arrayUnion(uidComercio)
  });
  if (yaEsFavorito) favoritosUid = favoritosUid.filter(id => id !== uidComercio);
  else favoritosUid.push(uidComercio);
  comerciosLista.forEach(c => { if (c.uid === uidComercio) c.esFavorito = !yaEsFavorito; });
  mostrarListaComercios(comerciosLista);
  cargarFavoritos();
}

async function elegirComercio(uid, nombre) {
  comercioSeleccionado = uid;
  comercioSeleccionadoNombre = nombre;
  carrito = [];
  document.getElementById('lista-comercios').style.display = 'none';
  document.getElementById('zona-comercio').style.display = 'block';
  document.getElementById('nombre-comercio').textContent = '🏪 ' + nombre;
  const q = query(collection(db, 'productos'), where('idComercio', '==', uid));
  const snap = await getDocs(q);
  let html = '';
  let categorias = new Set();
  snap.forEach(d => {
    const p = d.data();
    if (p.activo !== false) {
      categorias.add(p.categoria || 'Sin categoría');
      const precioValor = p.esOferta ? p.precioRebajado : p.precio;
      html += `<div data-cat="${p.categoria || 'Sin categoría'}" style="border:1px solid #ddd; padding:8px; margin:4px;">
        <strong>${p.nombre}</strong> — $${precioValor}
        ${p.esOferta ? '🔥 OFERTA' : ''}
        <br><small>${p.categoria || ''}</small>
        <button onclick="agregarAlCarrito('${d.id}', '${p.nombre.replace(/'/g,"\\'")}', ${precioValor})">➕ Agregar</button>
      </div>`;
    }
  });
  document.getElementById('lista-productos-comercio').innerHTML = html;
  document.getElementById('filtro-cat').innerHTML = '<option value="">Todas las categorías</option>' + [...categorias].map(c=>`<option value="${c}">${c}</option>`).join('');
  actualizarCarrito();
}

function filtrarProdComercio() {
  const catSel = document.getElementById('filtro-cat').value;
  const busq = document.getElementById('buscar-prod-comercio').value.toLowerCase();
  const items = document.querySelectorAll('#lista-productos-comercio > div');
  items.forEach(it => {
    const cat = it.dataset.cat || '';
    const texto = it.textContent.toLowerCase();
    const okCat = !catSel || cat === catSel;
    const okBus = !busq || texto.includes(busq);
    it.style.display = okCat && okBus ? '' : 'none';
  });
}

function agregarAlCarrito(id, nombre, precio) {
  carrito.push({ id, nombre, precio });
  actualizarCarrito();
}

function quitarDelCarrito(indice) {
  carrito.splice(indice, 1);
  actualizarCarrito();
}

function actualizarCarrito() {
  let total = 0;
  let html = '';
  carrito.forEach((item, i) => {
    total += item.precio;
    html += `<div style="display:flex; justify-content:space-between; padding:4px 0;">
      <span>${item.nombre}</span>
      <span>$${item.precio} <button style="color:red; border:none; background:none; cursor:pointer;" onclick="quitarDelCarrito(${i})">✕</button></span>
    </div>`;
  });
  document.getElementById('lista-carrito').innerHTML = html;
  document.getElementById('total-carrito').textContent = total;
  document.getElementById('carrito-vacio').style.display = carrito.length === 0 ? 'block' : 'none';
}

async function confirmarPedido() {
  if (carrito.length === 0) return alert('⚠️ El carrito está vacío.');
  const direccion = document.getElementById('direccion-entrega').value.trim();
  if (!direccion) return alert('⚠️ Escribí tu dirección de entrega.');
  const total = carrito.reduce((s, i) => s + i.precio, 0);
  await addDoc(collection(db, 'pedidos'), {
    idCliente: auth.currentUser.uid,
    idComercio: comercioSeleccionado,
    ciudadId: ciudadIdActual,
    nombreComercio: comercioSeleccionadoNombre,
    nombreCliente: auth.currentUser.email,
    direccionCliente: direccion,
    productos: carrito,
    total: total,
    estado: 'pendienteAprobacion',
    fecha: new Date()
  });
  alert('✅ Pedido confirmado. El comercio lo aprobará. Recibirás notificaciones del estado y podrás ver el mapa del recorrido cuando sea aceptado.');
  carrito = [];
  actualizarCarrito();
}