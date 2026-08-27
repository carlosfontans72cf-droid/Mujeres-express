import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';
import { mostrarPantallaLoginRegistro } from './loginRegistro.js';

let usuarioActivo = null;
let rolUsuario = null;

export function cerrarSesion() {
  signOut(auth).then(() => {
    usuarioActivo = null;
    rolUsuario = null;
  });
}

function cargarSegunRol() {
  try {
    switch(rolUsuario) {
      case 'cliente':
        import('./panelCliente.js').then(mod => mod.mostrarPanelCliente(usuarioActivo));
        break;
      case 'comercio':
        import('./panelComercio.js').then(mod => mod.mostrarPanelComercio(usuarioActivo));
        break;
      case 'repartidor':
        import('./panelRepartidor.js').then(mod => mod.mostrarPanelRepartidor(usuarioActivo));
        break;
      case 'dueno':
        import('./panelDueno.js').then(mod => mod.mostrarPanelDueno(usuarioActivo));
        break;
      default:
        mostrarPantallaLoginRegistro();
    }
  } catch(err) {
    console.error('Error al cargar panel:', err);
    mostrarPantallaLoginRegistro();
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      if (snap.exists()) {
        usuarioActivo = { uid: user.uid, ...snap.data() };
        rolUsuario = usuarioActivo.rol;
        cargarSegunRol();
      } else {
        await signOut(auth);
        mostrarPantallaLoginRegistro();
      }
    } catch (err) {
      console.error('Error al cargar usuario:', err);
      mostrarPantallaLoginRegistro();
    }
  } else {
    mostrarPantallaLoginRegistro();
  }
});