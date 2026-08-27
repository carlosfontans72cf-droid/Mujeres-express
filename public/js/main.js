import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';
import { mostrarLogin } from './loginRegistro.js';

window.cerrarSesion = () => {
  signOut(auth);
  location.reload();
};

onAuthStateChanged(auth, async (user) => {
  if (!user) { mostrarLogin(); return; }
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!snap.exists()) { signOut(auth); mostrarLogin(); return; }
    const u = { uid: user.uid, ...snap.data() };
    if (u.estado !== 'aprobado' && u.rol !== 'cliente') {
      document.getElementById('app').innerHTML = `<div class="contenedor"><h2>⏳ Aprobación pendiente</h2><p>Tu cuenta está esperando aprobación del dueño.</p><button onclick="cerrarSesion()">Salir</button></div>`;
      return;
    }
    cargarPanel(u);
  } catch { mostrarLogin(); }
});

async function cargarPanel(u) {
  const { uid, rol, nombreCompleto, nombre } = u;
  const nom = nombreCompleto || nombre || 'Usuario';
  switch(rol) {
    case 'cliente': (await import('./panelCliente.js')).mostrar(uid, nom); break;
    case 'comercio': (await import('./panelComercio.js')).mostrar(uid, nom); break;
    case 'repartidor': (await import('./panelRepartidor.js')).mostrar(uid, nom); break;
    case 'dueno': (await import('./panelDueno.js')).mostrar(); break;
    default: mostrarLogin();
  }
}