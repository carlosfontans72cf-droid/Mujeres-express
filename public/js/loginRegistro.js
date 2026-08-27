import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { obtenerUsuarioActivo } from './main.js';

export function mostrarPantallaLoginRegistro() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor" style="max-width:400px; margin:2rem auto; padding:1rem;">
      <h1 style="text-align:center;">🚚 Mujer Express</h1>
      <div id="caja-login">
        <h2>Iniciar Sesión</h2>
        <input type="email" id="correo" placeholder="Tu correo" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
        <input type="password" id="clave" placeholder="Contraseña" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
        <button class="boton-confirmar" onclick="iniciarSesion()" style="width:100%; margin-top:0.5rem;">Entrar</button>
        <p style="text-align:center; margin-top:1rem;">¿No tenés cuenta? <a href="#" onclick="mostrarRegistro()">Registrarme</a></p>
      </div>
      <div id="caja-registro" style="display:none;">
        <h2>Registrarse</h2>
        <select id="rol" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
          <option value="">— Elegir tipo de cuenta —</option>
          <option value="cliente">Cliente</option>
          <option value="comercio">Comercio</option>
          <option value="repartidor">Repartidor</option>
        </select>
        <input type="text" id="nombreCompleto" placeholder="Nombre completo" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
        <input type="email" id="correoReg" placeholder="Correo" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
        <input type="password" id="claveReg" placeholder="Contraseña" style="width:100%; padding:0.5rem; margin:0.3rem 0;">
        <div id="terminos-comercio" style="display:none; margin:0.5rem 0;">
          <label><input type="checkbox" id="aceptaTerminosComercio"> Acepto los <a href="./legales/terminos-comerciantes.html" target="_blank">términos y condiciones</a></label>
        </div>
        <div id="terminos-repartidor" style="display:none; margin:0.5rem 0;">
          <label><input type="checkbox" id="aceptaTerminosRepartidor"> Acepto los <a href="./legales/terminos-repartidores.html" target="_blank">términos y condiciones</a></label>
        </div>
        <button class="boton-confirmar" onclick="registrarse()" style="width:100%; margin-top:0.5rem;">Crear Cuenta</button>
        <p style="text-align:center; margin-top:1rem;">¿Ya tenés cuenta? <a href="#" onclick="mostrarLogin()">Volver a entrar</a></p>
      </div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('rol')?.addEventListener('change', e => {
      document.getElementById('terminos-comercio').style.display = e.target.value === 'comercio' ? 'block' : 'none';
      document.getElementById('terminos-repartidor').style.display = e.target.value === 'repartidor' ? 'block' : 'none';
    });
  }, 50);

  window.iniciarSesion = async () => {
    const correo = document.getElementById('correo').value.trim();
    const clave = document.getElementById('clave').value;
    if (!correo || !clave) return alert('Completá todos los datos');
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
    } catch(err) { alert('Error: ' + err.message); }
  };

  window.mostrarRegistro = () => {
    document.getElementById('caja-login').style.display = 'none';
    document.getElementById('caja-registro').style.display = 'block';
  };

  window.mostrarLogin = () => {
    document.getElementById('caja-login').style.display = 'block';
    document.getElementById('caja-registro').style.display = 'none';
  };

  window.registrarse = async () => {
    const rol = document.getElementById('rol').value;
    const nombre = document.getElementById('nombreCompleto').value.trim();
    const correo = document.getElementById('correoReg').value.trim();
    const clave = document.getElementById('claveReg').value;
    if (!rol || !nombre || !correo || clave.length < 6) return alert('Completá todos los datos (mínimo 6 caracteres)');

    if (rol === 'comercio' && !document.getElementById('aceptaTerminosComercio').checked) {
      return alert('Debés aceptar los términos y condiciones');
    }
    if (rol === 'repartidor' && !document.getElementById('aceptaTerminosRepartidor').checked) {
      return alert('Debés aceptar los términos y condiciones');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, correo, clave);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nombreCompleto, correo, rol,
        estado: rol === 'cliente' ? 'aprobado' : 'pendiente',
        fechaRegistro: new Date()
      });
      alert('✅ Cuenta creada. Si sos comercio o repartidor, esperá aprobación del administrador.');
    } catch(err) { alert('Error: ' + err.message); }
  };
}