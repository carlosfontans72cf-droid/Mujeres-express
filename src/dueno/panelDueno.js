import { db, auth } from '../firebase.js';
import { signOut } from 'firebase/auth';
import { collection, getDocs, updateDoc, doc, setDoc, writeBatch, query, where, orderBy, getDoc } from 'firebase/firestore';
import { obtenerComisiones } from '../utils/calculos.js';

export async function mostrarPanelDueno(contenedor) {
  const comisiones = await obtenerComisiones();

  contenedor.innerHTML = `
    <div class="tarjeta">
      <h1>👑 Panel del Dueño</h1>
      <button id="btnCerrarSesion" class="peligro">Cerrar sesión</button>
      <hr style="margin:12px 0;">
      
      <h3>⚙️ Configuración de Comisiones</h3>
      <p>Comisión app: <input type="number" id="inpComisionApp" value="${comisiones.comisionApp}" style="width:60px;"> %</p>
      <p>Pago a repartidor: <input type="number" id="inpRepartidor" value="${comisiones.repartidor}" style="width:60px;"> %</p>
      <p>Ganancia neta app: ${comisiones.gananciaApp} %</p>
      <button id="btnGuardarComisiones" class="primario">💾 Guardar Cambios</button>
      
      <hr style="margin:20px 0;">
      <h3>👤 Usuarios Pendientes de Aprobación</h3>
      <div id="usuariosPendientes"></div>
      
      <hr>
      <h3>📊 Todos los Pedidos del Sistema</h3>
      <div id="todosLosPedidos"></div>
    </div>
  `;

  document.getElementById('btnCerrarSesion').onclick = () => signOut(auth);
  document.getElementById('btnGuardarComisiones').onclick = guardarComisiones;

  await cargarPendientes();
  await cargarTodosPedidos();
}

async function guardarComisiones() {
  const comisionApp = Number(document.getElementById('inpComisionApp').value);
  const repartidor = Number(document.getElementById('inpRepartidor').value);

  if (comisionApp < repartidor) return alert('La comisión de la app no puede ser menor que la del repartidor.');
  if (comisionApp > 100 || repartidor < 0) return alert('Valores inválidos.');

  await setDoc(doc(db, 'configuracionGlobal', 'parametros'), {
    porcentajeComisionApp: comisionApp,
    porcentajeRepartidor: repartidor,
    fechaUltimaModificacion: new Date(),
    modificadoPor: auth.currentUser.uid
  }, { merge: true });

  alert('✅ Comisiones actualizadas.');
  location.reload();
}

async function cargarPendientes() {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('estado', '==', 'pendiente')));
  const caja = document.getElementById('usuariosPendientes');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No hay usuarios pendientes.</p>'; return; }
  snap.forEach(async documento => {
    const u = documento.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p><strong>${u.nombreCompleto}</strong></p>
      <p>Correo: ${u.correo}</p>
      <p>Rol solicitado: ${u.rol}</p>
      <button data-uid="${documento.id}" class="btnAprobar exito">✅ Aprobar</button>
      <button data-uid="${documento.id}" class="btnRechazar peligro">❌ Rechazar</button>
    `;
    caja.appendChild(div);
  });

  document.querySelectorAll('.btnAprobar').forEach(btn => {
    btn.onclick = async e => {
      const uid = e.target.dataset.uid;
      const ref = doc(db, 'usuarios', uid);
      const datos = (await getDoc(ref)).data();
      await updateDoc(ref, { estado: 'aprobado' });

      if (datos.rol === 'comercio') {
        await setDoc(doc(collection(db, 'comercios').doc(), {
          uidPropietario: uid,
          nombreComercio: datos.nombreCompleto,
          correo: datos.correo,
          estado: 'aprobado',
          fechaCreacion: new Date()
        }));
      }

      alert('✅ Usuario aprobado.'); cargarPendientes();
    };
  });

  document.querySelectorAll('.btnRechazar').forEach(btn => {
    btn.onclick = async e => {
      if (!confirm('¿Rechazar este usuario?')) return;
      await updateDoc(doc(db, 'usuarios', e.target.dataset.uid), { estado: 'rechazado' });
      alert('❌ Usuario rechazado.'); cargarPendientes();
    };
  });
}

async function cargarTodosPedidos() {
  const snap = await getDocs(query(collection(db, 'pedidos'), orderBy('fechaCreacion', 'desc')));
  const caja = document.getElementById('todosLosPedidos');
  caja.innerHTML = '';

  if (snap.empty) { caja.innerHTML = '<p>No hay pedidos registrados.</p>'; return; }
  snap.forEach(p => {
    const d = p.data();
    const div = document.createElement('div');
    div.className = 'tarjeta';
    div.innerHTML = `
      <p>Total: $${d.totalBruto?.toFixed(2)} | Comercio: $${d.montos?.montoComercio?.toFixed(2)} | Repartidor: $${d.montos?.montoRepartidor?.toFixed(2)} | App: $${d.montos?.gananciaApp?.toFixed(2)}</p>
      <p>Estado: ${d.estado}</p>
    `;
    caja.appendChild(div);
  });
}