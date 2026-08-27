import { db, auth, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';

let datosComercio = {};
let ubicacionComercio = { lat: null, lng: null };
let todosLosProductos = [];

// 📋 LISTA GRANDE DE CATEGORÍAS PREDEFINIDAS
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
      <!-- ⚠️ AVISO ANTI-ESTAFA SIEMPRE ARRIBA -->
      <div style="background:#fff3cd; padding:10px; border-radius:6px; border:2px solid #ffc107; margin-bottom:12px; font-weight:bold;">
        ⚠️ MUJER EXPRESS NUNCA te pide dinero, claves ni códigos por WhatsApp. Es estafa.
      </div>

      <!-- FOTO DE PERFIL -->
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
        <div>
          <img id="foto-perfil" src="${datosComercio.fotoPerfil || 'https://via.placeholder.com/80'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid #ccc;">
          <input type="file" id="subir-foto-perfil" accept="image/*" style="display:none;">
          <button class="boton-principal" style="font-size:12px; padding:4px 8px;" onclick="document.getElementById('subir-foto-perfil').click()">📷 Cambiar Foto</button>
        </div>
        <div>
          <h1 style="margin:0;">🏪 ${datosComercio.nombreCompleto}</h1>
          <p style="margin:4px 0; font-size:14px;">⭐ Calificación: ${datosComercio.calificacion ? datosComercio.calificacion.toFixed(1) : 'Sin calificar'}</p>
        </div>
      </div>
      <hr>

      <!-- SELECCIONAR SECCIÓN -->
      <h3>🛠️ Sección</h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <button class="boton-principal" onclick="cambiarSeccion('agregar')">➕ Agregar Producto</button>
        <button class="boton-principal" onclick="cambiarSeccion('lista-precios')">📋 Subir Lista de Precios</button>
        <button class="boton-principal" onclick="cambiarSeccion('ofertas')">🔥 Ofertas del día</button>
        <button class="boton-principal" onclick="cambiarSeccion('categorias')">🏷️ Mis Categorías</button>
        <button class="boton-principal" onclick="exportarHistorial()">📊 Exportar Historial</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <hr>

      <!-- ZONA: AGREGAR PRODUCTO -->
      <div id="zona-agregar" style="display:block;">
        <h3>➕ Agregar Producto Nuevo</h3>
        <div style="display:grid; gap:6px; margin-bottom:16px;">
          <label class="etiqueta">Nombre del producto:</label>
          <input type="text" id="prod_nombre" placeholder="Ej: Pan fresco">
          
          <label class="etiqueta">Categoría:</label>
          <select id="prod_categoria">
            <option value="">— Elegir Categoría —</option>
            ${CATEGORIAS.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            <option value="PERSONALIZADA">✏️ Agregar categoría propia...</option>
          </select>
          <input type="text" id="cat_personalizada" placeholder="Tu categoría propia" style="display:none; margin-top:4px;">
          
          <label class="etiqueta">Descripción:</label>
          <input type="text" id="prod_descripcion" placeholder="Ej: Pan recién horneado">
          
          <label class="etiqueta">Precio:</label>
          <input type="number" id="prod_precio" placeholder="Ej: 150">
          
          <label class="etiqueta">Foto del producto:</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <img id="foto-prod-vista" src="https://via.placeholder.com/60" style="width:60px; height:60px; border-radius:4px; object-fit:cover;">
            <input type="file" id="foto-prod-archivo" accept="image/*" style="display:none;">
            <button class="boton-principal" onclick="document.getElementById('foto-prod-archivo').click()">📷 Elegir Foto</button>
          </div>
          
          <button class="boton-confirmar" onclick="guardarProducto()">✅ Guardar Producto</button>
        </div>
      </div>

      <!-- ZONA: OFERTAS DEL DÍA -->
      <div id="zona-ofertas" style="display:none;">
        <h3>🔥 Ofertas — Productos rebajados</h3>
        <p style="font-size:14px;">Marcá productos para ofrecerlos con descuento del día anterior.</p>
        <div id="lista-productos-oferta"></div>
      </div>

      <!-- ZONA: LISTA DE PRECIOS -->
      <div id="zona-lista-precios" style="display:none;">
        <h3>📋 Subir Lista de Precios</h3>
        <p style="font-size:14px;">Copiá tu lista y pegala acá: Nombre - Precio</p>
        <textarea id="texto-lista" rows="10" placeholder="Pan - 100&#10;Leche - 150&#10;..." style="width:100%; padding:8px;"></textarea>
        <div class="fila-botones">
          <button class="boton-confirmar" onclick="convertirLista()">🔄 Crear Productos</button>
          <button class="boton-principal" onclick="cambiarSeccion('agregar')">← Volver</button>
        </div>
      </div>

      <!-- ZONA: MIS CATEGORÍAS -->
      <div id="zona-categorias" style="display:none;">
        <h3>🏷️ Mis Categorías Personalizadas</h3>
        <p style="font-size:14px;">Las categorías que agregues aparecerán en el menú.</p>
        <input type="text" id="nueva_categoria" placeholder="Escribí categoría nueva">
        <button class="boton-confirmar" onclick="agregarCategoria()">➕ Agregar</button>
        <div id="lista-categorias-propias" style="margin-top:12px;"></div>
      </div>

      <!-- PEDIDOS PENDIENTES -->
      <hr>
      <h3>⏳ Pedidos Pendientes de Aprobación</h3>
      <div id="lista-pedidos">Cargando pedidos...</div>

      <!-- MIS PRODUCTOS -->
      <hr>
      <h3>📦 Mis Productos</h3>
      <div style="margin-bottom:8px;">
        <input type="text" id="buscar-producto" placeholder="🔍 Buscar producto..." oninput="filtrarProductos(this.value)" style="padding:6px; width:250px;">
      </div>
      <div id="lista-productos">Cargando productos...</div>
    </div>
  `;

  // Asignar funciones globales
  window.cambiarSeccion = cambiarSeccion;
  window.guardarProducto = guardarProducto;
  window.convertirLista = convertirLista;
  window.aprobarPedido = aprobarPedido;
  window.marcarOferta = marcarOferta;
  window.eliminarProducto = eliminarProducto;
  window.suspenderProducto = suspenderProducto;
  window.activarProducto = activarProducto;
  window.duplicarProducto = duplicarProducto;
  window.filtrarProductos = filtrarProductos;
  window.exportarHistorial = exportarHistorial;
  window.agregarCategoria = agregarCategoria;
  window.cerrarSesion = () => { window.location.reload(); };

  // Cambiar categoría personalizada
  setTimeout(() => {
    document.getElementById('prod_categoria')?.addEventListener('change', function(e) {
      const campo = document.getElementById('cat_personalizada');
      campo.style.display = e.target.value === 'PERSONALIZADA' ? 'block' : 'none';
    });
    document.getElementById('foto-prod-archivo')?.addEventListener('change', function(e) {
      if (e.target.files?.[0]) {
        const lector = new FileReader();
        lector.onload = ev => { document.getElementById('foto-prod-vista').src = ev.target.result; };
        lector.readAsDataURL(e.target.files[0]);
      }
    });
  }, 100);

  cargarPedidosPendientes();
  cargarMisProductos();
}

// CAMBIAR SECCIÓN
function cambiarSeccion(nombre) {
  document.getElementById('zona-agregar').style.display = nombre === 'agregar' ? 'block' : 'none';
  document.getElementById('zona-lista-precios').style.display = nombre === 'lista-precios' ? 'block' : 'none';
  document.getElementById('zona-ofertas').style.display = nombre === 'ofertas' ? 'block' : 'none';
  document.getElementById('zona-categorias').style.display = nombre === 'categorias' ? 'block' : 'none';
}

// GUARDAR PRODUCTO
async function guardarProducto() {
  let categoria = document.getElementById('prod_categoria').value;
  if (categoria === 'PERSONALIZADA') {
    categoria = document.getElementById('cat_personalizada').value.trim();
  }
  const nombre = document.getElementById('prod_nombre').value.trim();
  const descripcion = document.getElementById('prod_descripcion').value.trim();
  const precio = parseFloat(document.getElementById('prod_precio').value);
  const archivo = document.getElementById('foto-prod-archivo')?.files?.[0];

  if (!nombre || !precio || !categoria) {
    return alert('⚠️ Completá nombre, precio y categoría.');
  }

  let urlFoto = null;
  if (archivo) {
    const refArchivo = ref(storage, `productos/${auth.currentUser.uid}/${Date.now()}.jpg`);
    await uploadBytes(refArchivo, archivo);
    urlFoto = await getDownloadURL(refArchivo);
  }

  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid,
    nombre, descripcion, categoria, precio,
    precioRebajado: null, esOferta: false, activo: true,
    foto: urlFoto, fechaCreacion: new Date()
  });

  document.getElementById('prod_nombre').value = '';
  document.getElementById('prod_categoria').value = '';
  document.getElementById('cat_personalizada').value = '';
  document.getElementById('prod_descripcion').value = '';
  document.getElementById('prod_precio').value = '';
  document.getElementById('foto-prod-vista').src = 'https://via.placeholder.com/60';
  
  alert('✅ Producto guardado');
  cargarMisProductos();
}

// CONVERTIR LISTA A PRODUCTOS
async function convertirLista() {
  const texto = document.getElementById('texto-lista').value.trim();
  if (!texto) return alert('⚠️ Escribí o pegá tu lista primero.');
  
  const lineas = texto.split('\n').filter(l => l.trim());
  let contador = 0;

  for (const linea of lineas) {
    const partes = linea.split(/[-—:]/);
    if (partes.length >= 2) {
      const nombre = partes[0].trim();
      const precio = parseFloat(partes[1].trim().replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (nombre && !isNaN(precio)) {
        await addDoc(collection(db, 'productos'), {
          idComercio: auth.currentUser.uid,
          nombre, descripcion: '', categoria: 'Sin categoría',
          precio, precioRebajado: null, esOferta: false, activo: true,
          foto: null, fechaCreacion: new Date()
        });
        contador++;
      }
    }
  }

  alert(`✅ Se crearon ${contador} productos`);
  document.getElementById('texto-lista').value = '';
  cambiarSeccion('agregar');
  cargarMisProductos();
}

// CARGAR PEDIDOS PENDIENTES
function cargarPedidosPendientes() {
  const q = query(
    collection(db, 'pedidos'),
    where('idComercio', '==', auth.currentUser.uid),
    where('estado', 'in', ['confirmadoPago', 'pendienteAprobacion']),
    orderBy('fecha', 'desc')
  );
  
  onSnapshot(q, snap => {
    let html = '';
    if (snap.empty) {
      html = '<p style="color:green;">✅ No hay pedidos pendientes</p>';
    } else {
      snap.forEach(doc => {
        const p = doc.data();
        html += `
          <div style="border:1px solid #ccc; padding:10px; border-radius:6px; margin-bottom:8px;">
            <strong>Cliente:</strong> ${p.nombreCliente || 'Sin nombre'}<br>
            <strong>Dirección:</strong> ${p.direccionCliente || ''}<br>
            <strong>Total:</strong> $${p.total || 0} — ✅ PAGO CONFIRMADO<br>
            <strong>Productos:</strong>
            <ul>${(p.productos || []).map(i => `<li>${i.nombre} — $${i.precio}</li>`).join('')}</ul>
            <button class="boton-confirmar" onclick="aprobarPedido('${doc.id}')">✅ APROBAR PEDIDO</button>
          </div>
        `;
      });
    }
    document.getElementById('lista-pedidos').innerHTML = html;
  });
}

// APROBAR PEDIDO
async function aprobarPedido(idPedido) {
  if (!confirm('¿Aprobás este pedido? Queda disponible para repartidores.')) return;
  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'esperandoRepartidor',
    nombreComercio: datosComercio.nombreCompleto,
    latComercio: ubicacionComercio.lat,
    lngComercio: ubicacionComercio.lng,
    fechaAprobacionComercio: new Date()
  });
  alert('✅ Pedido aprobado');
}

// CARGAR MIS PRODUCTOS
async function cargarMisProductos() {
  const q = query(collection(db, 'productos'), where('idComercio', '==', auth.currentUser.uid));
  const snap = await getDocs(q);
  todosLosProductos = [];
  snap.forEach(d => { todosLosProductos.push({ id: d.id, ...d.data() }); });
  mostrarListaProductos(todosLosProductos);
}

// MOSTRAR LISTA DE PRODUCTOS
function mostrarListaProductos(lista) {
  let html = '<div style="display:grid; gap:8px;">';
  if (lista.length === 0) {
    html += '<p>Aún no tenés productos cargados</p>';
  } else {
    const porCat = {};
    lista.filter(p => p.activo !== false).forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      if (!porCat[cat]) porCat[cat] = [];
      porCat[cat].push(p);
    });
    for (const cat in porCat) {
      html += `<h4 style="margin:12px 0 4px; color:#5a005a;">📂 ${cat}</h4>`;
      porCat[cat].forEach(p => {
        html += `
          <div style="border:1px solid #ddd; padding:8px; border-radius:4px; display:flex; align-items:center; gap:10px;">
            <img src="${p.foto || 'https://via.placeholder.com/50'}" style="width:50px; height:50px; border-radius:4px; object-fit:cover;">
            <div style="flex:1;">
              <strong>${p.nombre}</strong> — $${p.precio}
              ${p.esOferta ? `<span style="color:red; font-weight:bold;"> 🔥 OFERTA $${p.precioRebajado}</span>` : ''}
              <br><small style="color:#666;">${p.descripcion || ''}</small>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px; font-size:11px;">
              ${!p.esOferta ? `<button onclick="marcarOferta('${p.id}', ${p.precio})">🔥 Oferta</button>` : ''}
              <button onclick="duplicarProducto('${p.id}')">📋 Copiar</button>
              <button onclick="suspenderProducto('${p.id}')">⏸️ Suspender</button>
              <button onclick="eliminarProducto('${p.id}')" style="color:red;">🗑️ Borrar</button>
            </div>
          </div>
        `;
      });
    }
  }
  html += '</div>';
  document.getElementById('lista-productos').innerHTML = html;
}

// BUSCAR PRODUCTOS
function filtrarProductos(texto) {
  const filtro = texto.toLowerCase().trim();
  if (!filtro) return mostrarListaProductos(todosLosProductos);
  const filtrados = todosLosProductos.filter(p =>
    (p.nombre + ' ' + (p.descripcion || '')).toLowerCase().includes(filtro)
  );
  mostrarListaProductos(filtrados);
}

// MARCAR COMO OFERTA
async function marcarOferta(idProd, precioOriginal) {
  const descuento = prompt(`Precio rebajado (menor a $${precioOriginal}):`);
  if (!descuento) return;
  const rebajado = parseFloat(descuento.replace(',', '.'));
  if (isNaN(rebajado) || rebajado >= precioOriginal) {
    return alert('⚠️ El precio debe ser menor al original.');
  }
  await updateDoc(doc(db, 'productos', idProd), {
    esOferta: true, precioRebajado: rebajado
  });
  alert('✅ ¡Producto en oferta!');
  cargarMisProductos();
}

// DUPLICAR PRODUCTO
async function duplicarProducto(idProd) {
  const original = todosLosProductos.find(p => p.id === idProd);
  if (!original) return;
  await addDoc(collection(db, 'productos'), {
    idComercio: auth.currentUser.uid,
    nombre: original.nombre + ' (copia)',
    descripcion: original.descripcion,
    categoria: original.categoria,
    precio: original.precio,
    precioRebajado: null,
    esOferta: false,
    activo: true,
    foto: original.foto,
    fechaCreacion: new Date()
  });
  alert('✅ Producto duplicado');
  cargarMisProductos();
}

// SUSPENDER PRODUCTO
async function suspenderProducto(idProd) {
  if (!confirm('¿Suspender este producto? Deja de verse.')) return;
  await updateDoc(doc(db, 'productos', idProd), { activo: false });
  alert('✅ Producto suspendido');
  cargarMisProductos();
}

// ACTIVAR PRODUCTO — FALTABA ESTA FUNCIÓN
async function activarProducto(idProd) {
  await updateDoc(doc(db, 'productos', idProd), { activo: true });
  alert('✅ Producto activado');
  cargarMisProductos();
}

// ELIMINAR PRODUCTO
async function eliminarProducto(idProd) {
  if (!confirm('¿ELIMINAR para siempre? No se puede deshacer.')) return;
  await updateDoc(doc(db, 'productos', idProd), { eliminado: true, activo: false });
  alert('✅ Producto eliminado');
  cargarMisProductos();
}

// AGREGAR CATEGORÍA
async function agregarCategoria() {
  const cat = document.getElementById('nueva_categoria').value.trim();
  if (!cat) return alert('⚠️ Escribí una categoría.');
  CATEGORIAS.push(cat);
  alert(`✅ "${cat}" agregada`);
  document.getElementById('nueva_categoria').value = '';
}

// EXPORTAR HISTORIAL
async function exportarHistorial() {
  const q = query(
    collection(db, 'pedidos'),
    where('idComercio', '==', auth.currentUser.uid),
    orderBy('fecha', 'desc')
  );
  const snap = await getDocs(q);
  let texto = 'HISTORIAL DE PEDIDOS — Mujer Express\n';
  texto += '========================================\n\n';
  let total = 0;
  snap.forEach(d => {
    const p = d.data();
    const fecha = p.fecha?.toDate ? p.fecha.toDate().toLocaleDateString() : 'Sin fecha';
    texto += `Fecha: ${fecha} | Cliente: ${p.nombreCliente || ''} | Total: $${p.total || 0} | Estado: ${p.estado}\n`;
    total += p.total || 0;
  });
  texto += '\n========================================\n';
  texto += `TOTAL VENDIDO: $${total}\nCOMISIÓN APP (10%): $${(total * 0.10).toFixed(2)}\nTU PARTE (90%): $${(total * 0.90).toFixed(2)}\n`;
  
  await navigator.clipboard.writeText(texto);
  alert('✅ Historial copiado. Pegalo en Excel o WhatsApp.');
}