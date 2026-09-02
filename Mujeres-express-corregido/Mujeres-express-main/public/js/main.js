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
  if (!user) {
    mostrarLogin();
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!snap.exists()) {
      mostrarLogin();
      return;
    }

    const u = { uid: user.uid, ...snap.data() };
    const nombre = u.nombreCompleto || u.nombre || 'Sin nombre';
    const { rol, aprobado, bloqueado } = u;

    // Si el dueño lo bloqueó, no entra aunque esté aprobado
    if (bloqueado) {
      document.getElementById('app').innerHTML = `
        <div class="contenedor">
          <h2>🚫 Tu cuenta está bloqueada</h2>
          <p>Hola <strong>${nombre}</strong>, tu cuenta fue bloqueada temporalmente. Contactate con el administrador para más información.</p>
          <br>
          <button onclick="cerrarSesion()">Cerrar sesión</button>
        </div>
      `;
      return;
    }

    // Si NO es cliente ni dueño y NO está aprobado → queda pendiente
    if (rol !== 'cliente' && rol !== 'dueno' && !aprobado) {
      document.getElementById('app').innerHTML = `
        <div class="contenedor">
          <h2>⏳ Tu cuenta está pendiente de aprobación</h2>
          <p>Hola <strong>${nombre}</strong>, tu solicitud está siendo revisada por el administrador.</p>
          <p>Te avisaremos por correo cuando te aprueben. Gracias por esperar.</p>
          <br>
          <button onclick="cerrarSesion()">Cerrar sesión</button>
        </div>
      `;
      return;
    }

    // Cargar el panel que corresponda → busca función .mostrar()
    if (rol === 'cliente') {
      const { mostrar } = await import('./panelCliente.js');
      mostrar(u);
    } else if (rol === 'comercio') {
      const { mostrar } = await import('./panelComercio.js');
      mostrar(u);
    } else if (rol === 'repartidor') {
      const { mostrar } = await import('./panelRepartidor.js');
      mostrar(u);
    } else if (rol === 'dueno') {
      const { mostrar } = await import('./panelDueno.js');
      mostrar(u);
    } else if (rol === 'admin') {
      const { mostrar } = await import('./panelAdmin.js');
      mostrar(u);
    } else {
      mostrarLogin();
    }

  } catch (error) {
    console.error(error);
    mostrarLogin();
  }
});