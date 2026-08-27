import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';

let comerciosLista = [];
let carrito = [];
let comercioSeleccionado = null;

export async function mostrarPanelCliente(usuario) {
  const app = document.getElementById('app');
  const nom = usuario.nombreCompleto || usuario.nombre || 'Usuario';
  
  app.innerHTML = `
    <div class="contenedor">
      <h1>👤 Bienvenido, ${nom}</h1>
      <hr>
      <h3>🏪 Elegí un Comercio</h3>
      <div id="lista-comercios">Cargando comercios...</div>
      <hr>
      <div id="zona-comercio" style="display:none;">
        <h3 id="nombre-comercio"></h3>
        <div id="lista-productos-comercio"></div>
        <hr>
        <h3>🛒 Tu Pedido</h3>
        <div id="carrito-vacio">Carrito vacío</div>
        <div id="lista-carrito"></div>
        <strong>Total: $<span id="total-carrito">0</span></strong>
        <br><br>
        <label>Tu dirección de entrega:</label>
        <input type="text" id="direccion-entrega" placeholder="Calle, número, barrio">
        <br><br>
        <button class="boton-confirmar" onclick="confirmarPedido()">✅ Confirmar Pedido</button>
        <button class="boton-principal" onclick="cerrarComercio()">← Volver a comercios</button>
      </div>
      <hr>
      <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
    </div>
  `;

  window.elegirComercio = elegirComercio;
  window.agregarAlCarrito = agregarAlCarrito;
  window.quitarDelCarrito = quitarDelCarrito;
  window.confirmarPedido = confirmarPedido;
  window.cerrarComercio = () => {
    comercioSeleccionado = null;
    carrito = [];
    document.getElementById('zona-comercio').style.display = 'none';
    document.getElementById('lista-comercios').style.display = 'block';
  };
  window.cerrarSesion = () => location.reload();

  await cargarComercios();
}

async function cargarComercios() {
  const q = query(collection(db, 'usuarios'), where('rol', '==', 'comercio'), where('estado', '==', 'aprobado'));
  const snap = await getDocs(q);
  comerciosLista = [];
  snap.forEach(d => { comerciosLista.push({ uid: d.id, ...d.data() }); });

  let html = '';
  if (comerciosLista.length === 0) {
    html = '<p>No hay comercios disponibles por el momento.</p>';
  } else {
    comerciosLista.forEach(c => {
      const nomCom = c.nombreCompleto || c.nombre || 'Comercio';
      html += `<div style="border:1px solid #ccc; padding:10px; margin:4px; border-radius:6px;">
        <strong>${nomCom}</strong><br>
        ⭐ Calificación: ${c.calificacion ? c.calificacion.toFixed(1) : 'Sin calificar'}
        <br>
        <button class="boton-confirmar" onclick="elegirComercio('${c.uid}','${nomCom}')">🔍 Ver Productos</button>
      </div>`;
    });
  }
  document.getElementById('lista-comercios').innerHTML = html;
}

async function elegirComercio(uid, nombre) {
  comercioSeleccionado = uid;
  carrito = [];
  document.getElementById('lista-comercios').style.display = 'none';
  document.getElementById('zona-comercio').style.display = 'block';
  document.getElementById('nombre-comercio').textContent = '🏪 ' + nombre;
  await cargarProductosComercio(uid);
  actualizarCarrito();
}

async function cargarProductosComercio(idComercio) {
  const q = query(collection(db, 'productos'), where('idComercio', '==', idComercio));
  const snap = await getDocs(q);
  let html = '';
  snap.forEach(d => {
    const p = d.data();
    if (p.activo !== false) {
      const precioMostrar = p.esOferta ? `<s>$${p.precio}</s> <span style="color:red; font-weight:bold;">$${p.precioRebajado}</span>` : `$${p.precio}`;
      const precioValor = p.esOferta ? p.precioRebajado : p.precio;
      html += `<div style="border:1px solid #ddd; padding:8px; margin:4px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${p.nombre}</strong> — ${precioMostrar}
          <br><small>${p.categoria || ''}</small>
        </div>
        <button class="boton-confirmar" onclick="agregarAlCarrito('${d.id}', '${p.nombre.replace(/'/g,"\\'")}', ${precioValor})">➕ Agregar</button>
      </div>`;
    }
  });
  document.getElementById('lista-productos-comercio').innerHTML = html || '<p>Este comercio no tiene productos cargados.</p>';
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
      <span>$${item.precio} <button style="color:red; padding:0 4px; border:none; background:none; cursor:pointer;" onclick="quitarDelCarrito(${i})">✕</button></span>
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
  if (!confirm('¿Confirmás este pedido? El pago se realiza directamente al comercio al recibirlo.')) return;

  const total = carrito.reduce((s, i) => s + i.precio, 0);
  await addDoc(collection(db, 'pedidos'), {
    idCliente: auth.currentUser.uid,
    idComercio: comercioSeleccionado,
    nombreCliente: auth.currentUser.email,
    direccionCliente: direccion,
    productos: carrito,
    total: total,
    estado: 'pendienteAprobacion',
    fecha: new Date()
  });

  alert('✅ Pedido enviado. El comercio lo aprobará y quedará disponible para un repartidor.');
  carrito = [];
  actualizarCarrito();
  document.getElementById('direccion-entrega').value = '';
}