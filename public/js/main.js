import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';
import { mostrarPantallaLoginRegistro } from './loginRegistro.js';
import { mostrarPanelCliente } from './panelCliente.js';
import { mostrarPanelComercio } from './panelComercio.js';
import { mostrarPanelRepartidor } from './panelRepartidor.js';
import { mostrarPanelDueno } from './panelDueno.js';

let usuarioActivo = null;
let rolUsuario = null;

export function obtenerUsuarioActivo() {
  return { usuarioActivo, rolUsuario };
}

export function cerrarSesion() {
  signOut(auth).then(() => {
    usuarioActivo = null;
    rolUsuario = null;
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (snap.exists()) {
      usuarioActivo = { uid: user.uid, ...snap.data() };
      rolUsuario = usuarioActivo.rol;
      cargarSegunRol();
    }
  } else {
    mostrarPantallaLoginRegistro();
  }
});

function cargarSegunRol() {
  switch(rolUsuario) {
    case 'cliente': mostrarPanelCliente(usuarioActivo); break;
    case 'comercio': mostrarPanelComercio(usuarioActivo); break;
    case 'repartidor': mostrarPanelRepartidor(usuarioActivo); break;
    case 'dueno': mostrarPanelDueno(usuarioActivo); break;
    default: mostrarPantallaLoginRegistro();
  }
}