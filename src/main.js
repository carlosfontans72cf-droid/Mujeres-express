import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { mostrarPantallaLoginRegistro } from './auth/loginRegistro.js';
import { mostrarPanelCliente } from './cliente/panelCliente.js';
import { mostrarPanelComercio } from './comercio/panelComercio.js';
import { mostrarPanelRepartidor } from './repartidor/panelRepartidor.js';
import { mostrarPanelDueno } from './dueno/panelDueno.js';

let usuarioActivo = null;
let rolUsuario = null;

async function cargarPaginaSegunRol(rol) {
  const app = document.getElementById('app');
  
  if (!usuarioActivo) {
    mostrarPantallaLoginRegistro(app);
    return;
  }

  const refContador = doc(db, 'contadores', 'usuarios');
  const snapContador = await getDoc(refContador);
  if (!snapContador.exists()) {
    await setDoc(refContador, { total: 1 });
    await setDoc(doc(db, 'usuarios', usuarioActivo.uid), {
      rol: 'dueño',
      estado: 'aprobado',
      nombreCompleto: 'Dueño',
      correo: usuarioActivo.email,
      fechaRegistro: new Date()
    });
    rolUsuario = 'dueño';
  }

  switch(rol) {
    case 'cliente': await mostrarPanelCliente(app); break;
    case 'comercio': await mostrarPanelComercio(app, usuarioActivo.uid); break;
    case 'repartidor': await mostrarPanelRepartidor(app); break;
    case 'admin':
    case 'dueño': await mostrarPanelDueno(app); break;
    default: mostrarPantallaLoginRegistro(app);
  }
}

onAuthStateChanged(auth, async (user) => {
  usuarioActivo = user;
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) rolUsuario = snap.data().rol;
    } catch {}
  } else {
    rolUsuario = null;
  }
  cargarPaginaSegunRol(rolUsuario);
});