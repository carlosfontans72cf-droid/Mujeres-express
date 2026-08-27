import { db, auth } from './firebase.js';
import { collection, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

let datosRepartidor = {};
let pedidosSuscripcion = null;

export async function mostrarPanelRepartidor(usuario) {
  datosRepartidor = usuario;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <!-- ⚠️ AVISO ANTI-ESTAFA SIEMPRE ARRIBA -->
      <div style="background:#fff3cd; padding:10px; border-radius:6px; border:2px solid #ffc107; margin-bottom:12px; font-weight:bold;">
        ⚠️ MUJER EXPRESS NUNCA TE PIDE: dinero, claves, códigos ni datos de cuentas. Ni por correo, ni WhatsApp, ni llamada. ESAS PETICIONES SON ESTAFAS. NO RESPONDAS.
      </div>

      <!-- ⚠️ AVISO LEGAL -->
      <div style="background:#e3f2fd; padding:8px; border-radius:6px; margin-bottom:12px; font-size:13px;">
        ⚠️ <strong>AVISO:</strong> Los repartidores NO son empleados de la app. La app es solo un puente. Debés contar con tu propia empresa para facturar tus servicios.
      </div>

      <!-- PERFIL -->
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
        <div>
          <img src="${datosRepartidor.fotoPerfil || 'https://via.placeholder.com/70'}" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid #ccc;">
        </div>
        <div>
          <h1 style="margin:0;">🚚 ${datosRepartidor.nombreCompleto}</h1>
          <p style="margin:4px 0; font-size:14px;">⭐ Tu calificación: ${datosRepartidor.calificacion ? datosRepartidor.calificacion.toFixed(1) : 'Sin calificar'}</p>
        </div>
      </div>
      <hr>

      <!-- BOTONERA PRINCIPAL -->
      <div class="fila-botones">
        <button class="boton-principal" onclick="verPedidosDisponibles()">📋 Pedidos Disponibles</button>
        <button class="boton-principal" onclick="verMiPedidoActivo()">📍 Mi Pedido Actual</button>
        <button class="boton-principal" onclick="verHistorial()">💰 Historial y Ganancias</button>
        <button class="boton-alerta" onclick="cerrarSesion()">🚪 Salir</button>
      </div>
      <hr>

      <!-- ZONA DE TRABAJO -->
      <div id="zona-trabajo">
        <h3>📋 Pedidos Disponibles</h3>
        <p>Cargando pedidos...</p>
      </div>
    </div>
  `;

  window.verPedidosDisponibles = verPedidosDisponibles;
  window.verMiPedidoActivo = verMiPedidoActivo;
  window.verHistorial = verHistorial;
  window.aceptarPedido = aceptarPedido;
  window.marcarRetirado = marcarRetirado;
  window.marcarEntregado = marcarEntregado;
  window.cerrarSesion = () => location.reload();

  // Cargar pedidos disponibles al entrar
  verPedidosDisponibles();
}

// ==========================================
// PEDIDOS DISPONIBLES — EL PRIMERO QUE ACEPTA SE LO QUEDA
// ==========================================
function verPedidosDisponibles() {
  if (pedidosSuscripcion) pedidosSuscripcion();

  const q = query(
    collection(db, 'pedidos'),
    where('estado', '==', 'esperandoRepartidor'),
    orderBy('fecha', 'desc')
  );

  pedidosSuscripcion = onSnapshot(q, snap => {
    let html = '';
    if (snap.empty) {
      html = '<p style="color:green; font-weight:bold;">✅ No hay pedidos disponibles en este momento.<br>Quedate atento, apenas aparezcan te van a aparecer acá.</p>';
    } else {
      snap.forEach(d => {
        const p = d.data();
        html += `
          <div style="border:2px solid #2196f3; padding:12px; border-radius:8px; margin-bottom:10px; background:#f1f8ff;">
            <h4 style="margin:0 0 8px;">📦 Pedido disponible — ¡El primero que acepte se lo queda!</h4>
            <strong>🏪 Comercio:</strong> ${p.nombreComercio || 'Sin datos'}<br>
            <strong>📍 Entrega:</strong> ${p.direccionCliente || 'Sin dirección'}<br>
            <strong>🛒 Productos:</strong>
            <ul>${p.productos.map(i => `<li>${i.nombre} — $${i.precio}</li>`).join('')}</ul>
            <strong>💰 Total del pedido:</strong> $${p.total}<br><br>
            <button class="boton-confirmar" style="font-size:16px; padding:10px 20px; font-weight:bold;" onclick="aceptarPedido('${d.id}')">✅ ACEPTAR ESTE PEDIDO</button>
          </div>
        `;
      });
    }
    document.getElementById('zona-trabajo').innerHTML = html;
  });
}

// ==========================================
// ACEPTAR PEDIDO
// ==========================================
async function aceptarPedido(idPedido) {
  if (!confirm('¿ACEPTAR este pedido? Una vez aceptado, nadie más podrá tomarlo.')) return;

  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'enCamino',
    idRepartidor: auth.currentUser.uid,
    nombreRepartidor: datosRepartidor.nombreCompleto,
    fechaAceptacion: new Date()
  });

  alert('✅ Pedido ACEPTADO.\nDirigite al comercio a retirarlo.');
  verMiPedidoActivo(idPedido);
}

// ==========================================
// PEDIDO EN CAMINO — MAPA Y ACCIONES
// ==========================================
async function verMiPedidoActivo(idPedido = null) {
  if (pedidosSuscripcion) pedidosSuscripcion();

  let q;
  if (idPedido) {
    q = query(collection(db, 'pedidos'), where('__name__', '==', idPedido));
  } else {
    q = query(
      collection(db, 'pedidos'),
      where('idRepartidor', '==', auth.currentUser.uid),
      where('estado', 'in', ['enCamino', 'retirado']),
      orderBy('fecha', 'desc')
    );
  }

  pedidosSuscripcion = onSnapshot(q, snap => {
    if (snap.empty) {
      document.getElementById('zona-trabajo').innerHTML = '<p class="texto-centro">No tenés ningún pedido activo en este momento.</p>';
      return;
    }

    snap.forEach(d => {
      const p = d.data();
      let html = `
        <div style="border:3px solid #4caf50; padding:14px; border-radius:8px; background:#f9fff9;">
          <h3 style="margin-top:0;">🚚 TU PEDIDO ACTIVO</h3>
          <p><strong>🏪 Comercio:</strong> ${p.nombreComercio}</p>
          <p><strong>📍 Dirección de entrega:</strong> ${p.direccionCliente}</p>
          <p><strong>🛒 Productos:</strong></p>
          <ul>${p.productos.map(i => `<li>${i.nombre} — $${i.precio}</li>`).join('')}</ul>
          <p><strong💰 Total del pedido: $${p.total}</strong></p>
          <hr>
      `;

    if (p.estado === 'enCamino') {
      html += `<p style="font-size:15px;">📍 Dirigite al comercio y retirá el pedido.</p>
        <button class="boton-confirmar" style="font-size:15px; padding:8px 16px;" onclick="marcarRetirado('${d.id}')">✅ RETIRÉ EL PEDIDO DEL COMERCIO</button>`;
    } else if (p.estado === 'retirado') {
      html += `<p style="font-size:15px;">📍 Llevás el pedido hacia el cliente.</p>
        <button class="boton-confirmar" style="font-size:15px; padding:8px 16px; background:#ff9800;" onclick="marcarEntregado('${d.id}', ${p.total})">✅ MARCAR COMO ENTREGADO</button>`;
    } else if (p.estado === 'entregado') {
      html += `<p style="color:green; font-weight:bold;">✅ PEDIDO ENTREGADO</p>`;
    }

    document.getElementById('zona-trabajo').innerHTML = html + '</div>';
    });
  });
}

// ==========================================
// MARCAR RETIRADO
// ==========================================
async function marcarRetirado(idPedido) {
  if (!confirm('¿Confirmás que retiraste el pedido del comercio?')) return;
  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'retirado',
    fechaRetiro: new Date()
  });
  alert('✅ Ahora llevás el pedido al cliente.');
}

// ==========================================
// MARCAR ENTREGADO → ACÁ MUESTRA LO QUE GANÓ
// ==========================================
async function marcarEntregado(idPedido, totalVenta) {
  if (!confirm('¿Confirmás que entregaste el pedido al cliente?')) return;

  // ✅ La ganancia se calcula al entregar. El porcentaje lo DEFINE EL DUEÑO en configuraciones
  // Por ahora usamos el 7% acordado → después se cambia SOLO desde el panel Dueño
  const ganancia = Math.round(totalVenta * 0.07);

  await updateDoc(doc(db, 'pedidos', idPedido), {
    estado: 'entregado',
    gananciaRepartidor: ganancia,
    fechaEntrega: new Date()
  });

  // ⚡ ACÁ APARECE LO QUE GANÓ — SOLO EN PLATA, SIN PORCENTAJES A LA VISTA
  document.getElementById('zona-trabajo').innerHTML = `
    <div style="border:3px solid #4caf50; padding:20px; border-radius:10px; background:#e8f5e9; text-align:center;">
      <h2 style="color:green; margin-top:0;">✅ ¡PEDIDO ENTREGADO!</h2>
      <p style="font-size:22px; font-weight:bold; color:#2e7d32;">💰 EN ESTE PEDIDO GANASTE: $${ganancia}</p>
      <p style="font-size:14px; color:#555;">Ese monto se acreditará según las condiciones de pago acordadas.</p>
      <hr>
      <button class="boton-principal" onclick="verPedidosDisponibles()">🔄 Volver a buscar pedidos</button>
    </div>
  `;
}

// ==========================================
// HISTORIAL CON GANANCIAS POR PEDIDO
// ==========================================
async function verHistorial() {
  const q = query(
    collection(db, 'pedidos'),
    where('idRepartidor', '==', auth.currentUser.uid),
    where('estado', '==', 'entregado'),
    orderBy('fechaEntrega', 'desc')
  );

  const snap = await getDocs(q);
  let html = '<h2>💰 Historial — Tus Ganancias</h2>';
  let totalGanado = 0;

  if (snap.empty) {
    html += '<p class="texto-centro">Aún no entregaste ningún pedido.</p>';
  } else {
    html += '<div style="display:grid; gap:8px;">';
    snap.forEach(d => {
      const p = d.data();
      const fecha = p.fechaEntrega?.toDate().toLocaleDateString('es-UY') || 'Sin fecha';
      const ganancia = p.gananciaRepartidor || Math.round((p.total || 0) * 0.07);
      totalGanado += ganancia;

      html += `
        <div class="tarjeta" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${fecha}</strong><br>
            Pedido de: ${p.nombreComercio || 'Comercio'}<br>
            Venta: $${p.total}
          </div>
          <div style="font-size:18px; font-weight:bold; color:green;">
            Ganaste:<br>$${ganancia}
          </div>
        </div>
      `;
    });
    html += '</div>';
    html += `<hr><h3 style="text-align:right;">💰 TOTAL GANADO: $${totalGanado}</h3>`;
    html += `<button class="boton-confirmar" style="margin-top:10px;" onclick="copiarHistorial()">📋 Copiar Historial Completo</button>`;
  }

  document.getElementById('zona-trabajo').innerHTML = html;
}

// ==========================================
// COPIAR HISTORIAL AL PORTAPAPELES
// ==========================================
async function copiarHistorial() {
  const q = query(
    collection(db, 'pedidos'),
    where('idRepartidor', '==', auth.currentUser.uid),
    where('estado', '==', 'entregado'),
    orderBy('fechaEntrega', 'desc')
  );

  const snap = await getDocs(q);
  let texto = 'HISTORIAL DE GANANCIAS — Mujer Express\n';
  texto += '========================================\n\n';
  let total = 0;
  snap.forEach(d => {
    const p = d.data();
    const fecha = p.fechaEntrega?.toDate().toLocaleDateString('es-UY') || 'Sin fecha';
    const ganancia = p.gananciaRepartidor || Math.round((p.total || 0) * 0.07);
    total += ganancia;
    texto += `${fecha} | Venta: $${p.total} | Ganaste: $${ganancia}\n`;
  });
  texto += '\n========================================\n';
  texto += `TOTAL GANADO: $${total}\n`;

  navigator.clipboard.writeText(texto).then(() => {
    alert('✅ Historial copiado!\nPegalo en WhatsApp o Excel cuando quieras.');
  });
}