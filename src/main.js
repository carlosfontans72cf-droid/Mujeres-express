import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { mostrarPantallaLoginRegistro, cerrarSesion } from './auth/loginRegistro.js';
import { mostrarPanelCliente } from './cliente/panelCliente.js';
import { mostrarPanelComercio } from './comercio/panelComercio.js';
import { mostrarPanelRepartidor } from './repartidor/panelRepartidor.js';
import { mostrarPanelDueno } from './dueno/panelDueno.js';

let usuarioActivo = null;
let rolUsuario = null;
let uidComercio = null;

export function obtenerUsuarioActivo() {
  return { usuarioActivo, rolUsuario };
}

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
    case 'cliente':
      await mostrarPanelCliente(app);
      break;
    case 'comercio':
      await mostrarPanelComercio(app, usuarioActivo.uid);
      break;
    case 'repartidor':
      await mostrarPanelRepartidor(app);
      break;
    case 'admin':
    case 'dueño':
      await mostrarPanelDueno(app);
      break;
    default:
      mostrarPantallaLoginRegistro(app);
  }
}

onAuthStateChanged(auth, async (user) => {
  usuarioActivo = user;
  
  if (user) {
    try {
      const refUsuario = doc(db, 'usuarios', user.uid);
      const snapshot = await getDoc(refUsuario);
      if (snapshot.exists()) {
        rolUsuario = snapshot.data().rol;
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  } else {
    rolUsuario = null;
  }

  cargarPaginaSegunRol(rolUsuario);
});