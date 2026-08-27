import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

export function mostrarLogin() {
  document.getElementById('app').innerHTML = `
    <div class="contenedor">
      <h1>🚚 Mujer Express</h1>
      <h2>Iniciar Sesión</h2>
      <input type="email" id="correo" placeholder="Correo">
      <input type="password" id="clave" placeholder="Contraseña">
      <button onclick="entrar()">Entrar</button>
      <hr>
      <button onclick="mostrarReg()">Crear cuenta nueva</button>
      <div id="reg" style="display:none;margin-top:1rem;">
        <h3>Registrarse</h3>
        <select id="rol">
          <option value="">— Elegir tipo —</option>
          <option value="dueno">Dueño</option>
          <option value="cliente">Cliente</option>
          <option value="comercio">Comercio</option>
          <option value="repartidor">Repartidor</option>
        </select>
        <input type="text" id="nombre" placeholder="Nombre completo">
        <input type="email" id="cor" placeholder="Correo">
        <input type="password" id="cla" placeholder="Contraseña (6+ caracteres)">
        <button onclick="registrar()">Crear cuenta</button>
      </div>
    </div>
  `;
}

window.mostrarReg = () => { document.getElementById('reg').style.display='block'; };

window.entrar = async () => {
  const correo = document.getElementById('correo').value.trim();
  const clave = document.getElementById('clave').value;
  if (!correo || clave.length<6) return alert('Completá todos los datos');
  try { await signInWithEmailAndPassword(auth, correo, clave); }
  catch(e) { alert('Error: '+e.message); }
};

window.registrar = async () => {
  const rol = document.getElementById('rol').value;
  const nombre = document.getElementById('nombre').value.trim();
  const correo = document.getElementById('cor').value.trim();
  const clave = document.getElementById('cla').value;
  if (!rol || !nombre || !correo || clave.length<6) return alert('Completá todos los datos (mínimo 6 caracteres)');
  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, clave);
    await setDoc(doc(db,'usuarios',cred.user.uid), {
      nombre, nombreCompleto: nombre, correo, rol,
      estado: rol==='cliente' || rol==='dueno' ? 'aprobado' : 'pendiente',
      fechaRegistro: new Date()
    });
    alert('✅ Cuenta creada. Si sos Dueño o Cliente ya podés entrar. Comercio y Repartidor esperan aprobación.');
  } catch(e) { alert('Error: '+e.message); }
};