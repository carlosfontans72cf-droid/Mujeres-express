import { auth, db } from '../firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { terminosGenerales, terminosComerciante, terminosRepartidor } from './terminos.js';

export function mostrarPantallaLoginRegistro(contenedor) {
  contenedor.innerHTML = `
    <div class="tarjeta texto-centro">
      <h1>Mujer Express</h1>
      
      <div style="margin-bottom: 20px;">
        <button id="btnIngresar" class="primario">Ingresar</button>
        <button id="btnRegistrarse">Registrarse</button>
      </div>

      <div id="formularioAuth">
        <h2 id="tituloForm">Ingresar</h2>
        
        <input type="email" id="correo" placeholder="Correo electrónico" required>
        <input type="password" id="contrasena" placeholder="Contraseña" required>
        
        <div id="camposRegistro" class="oculto">
          <select id="tipoUsuario">
            <option value="">Seleccione su tipo</option>
            <option value="cliente">Cliente</option>
            <option value="comercio">Comerciante</option>
            <option value="repartidor">Repartidor</option>
          </select>
          <input type="text" id="nombreCompleto" placeholder="Nombre completo o Razón Social">
          
          <label style="display:flex; align-items:center; gap:8px; margin:10px 0;">
            <input type="checkbox" id="aceptaTerminos">
            <span>Acepto los <a href="#" id="linkTerminos" style="color:var(--color-primario);">Términos y Condiciones</a></span>
          </label>
        </div>
        
        <button id="btnAccionAuth" class="primario">Ingresar</button>
        <p id="mensajeError" style="color:var(--color-peligro); margin-top:10px;"></p>
      </div>
    </div>
  `;

  const btnIngresar = document.getElementById('btnIngresar');
  const btnRegistrarse = document.getElementById('btnRegistrarse');
  const tituloForm = document.getElementById('tituloForm');
  const camposRegistro = document.getElementById('camposRegistro');
  const btnAccion = document.getElementById('btnAccionAuth');
  const mensajeError = document.getElementById('mensajeError');
  const linkTerminos = document.getElementById('linkTerminos');
  let modoRegistro = false;

  linkTerminos.addEventListener('click', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipoUsuario')?.value;
    let texto = terminosGenerales;
    if (tipo === 'comercio') texto = terminosComerciante;
    if (tipo === 'repartidor') texto = terminosRepartidor;
    alert(texto);
  });

  btnIngresar.addEventListener('click', () => {
    modoRegistro = false;
    tituloForm.textContent = 'Ingresar';
    camposRegistro.classList.add('oculto');
    btnAccion.textContent = 'Ingresar';
    mensajeError.textContent = '';
  });

  btnRegistrarse.addEventListener('click', () => {
    modoRegistro = true;
    tituloForm.textContent = 'Crear cuenta nueva';
    camposRegistro.classList.remove('oculto');
    btnAccion.textContent = 'Registrarse';
    mensajeError.textContent = '';
  });

  btnAccion.addEventListener('click', async () => {
    const correo = document.getElementById('correo').value.trim();
    const contrasena = document.getElementById('contrasena').value;
    const tipoUsuario = document.getElementById('tipoUsuario')?.value;
    const nombreCompleto = document.getElementById('nombreCompleto')?.value.trim();
    const aceptaTerminos = document.getElementById('aceptaTerminos')?.checked;

    mensajeError.textContent = '';

    try {
      if (modoRegistro) {
        if (!correo || !contrasena || !tipoUsuario || !nombreCompleto) {
          throw new Error('Complete todos los campos.');
        }
        if (!aceptaTerminos) {
          throw new Error('Debe aceptar los Términos y Condiciones.');
        }
        if (contrasena.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const credenciales = await createUserWithEmailAndPassword(auth, correo, contrasena);
        const uid = credenciales.user.uid;

        let rol, estado;
        if (tipoUsuario === 'cliente') {
          rol = 'cliente';
          estado = 'aprobado';
        } else {
          rol = tipoUsuario;
          estado = 'pendiente';
        }

        await setDoc(doc(db, 'usuarios', uid), {
          correo: correo,
          nombreCompleto: nombreCompleto,
          rol: rol,
          estado: estado,
          fechaRegistro: new Date()
        });

        alert('¡Cuenta creada con éxito!');
        if (estado === 'pendiente') {
          alert('⚠️ Su cuenta quedará activa una vez que el Dueño la apruebe.');
          await signOut(auth);
        }

      } else {
        if (!correo || !contrasena) {
          throw new Error('Ingrese correo y contraseña.');
        }

        const credenciales = await signInWithEmailAndPassword(auth, correo, contrasena);
        const uid = credenciales.user.uid;
        const refUsuario = doc(db, 'usuarios', uid);
        const datos = await getDoc(refUsuario);

        if (!datos.exists()) throw new Error('Usuario no encontrado.');
        const usuario = datos.data();

        if (usuario.estado === 'pendiente') {
          await signOut(auth);
          throw new Error('⏳ Su cuenta aún no ha sido aprobada. Espere la aprobación.');
        }
        if (usuario.estado === 'rechazado' || usuario.estado === 'suspendido') {
          await signOut(auth);
          throw new Error('❌ No puede ingresar. Consulte con el administrador.');
        }
      }

    } catch (error) {
      mensajeError.textContent = '❌ ' + error.message;
    }
  });
}

export async function cerrarSesion() {
  await signOut(auth);
}