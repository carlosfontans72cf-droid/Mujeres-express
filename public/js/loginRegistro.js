import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { avisoAntiEstafaHTML } from './avisoAntiEstafa.js';

export function mostrarLogin() {
  document.getElementById('app').innerHTML = `
    <div class="contenedor">
      <h1>🚚 Mujer Express</h1>
      <h2>Iniciar Sesión</h2>
      ${avisoAntiEstafaHTML()}
      <div id="login-normal">
        <input type="email" id="correo" placeholder="Correo">
        <input type="password" id="clave" placeholder="Contraseña">
        <button onclick="entrar()">Entrar</button>
      </div>
      <div id="login-admin" style="display:none;">
        <input type="text" id="admin-usuario" placeholder="Usuario (te lo enviaron por WhatsApp)">
        <input type="password" id="admin-clave-login" placeholder="Contraseña">
        <button onclick="entrarAdmin()">Entrar como administrador</button>
      </div>
      <button onclick="alternarLoginAdmin()" style="margin-top:6px;font-size:0.85em;">¿Sos administrador? Entrar con usuario</button>
      <hr>
      <button onclick="mostrarReg()">Crear cuenta nueva</button>
      <div id="reg" style="display:none;margin-top:1rem;">
        <h3>Registrarse</h3>
        <select id="rol" onchange="alRolCambiar()">
          <option value="">— Elegir tipo —</option>
          <option value="dueno">Dueño</option>
          <option value="cliente">Cliente</option>
          <option value="comercio">Comercio</option>
          <option value="repartidor">Repartidor</option>
        </select>
        <input type="text" id="nombre" placeholder="Nombre completo">
        <input type="email" id="cor" placeholder="Correo">
        <input type="password" id="cla" placeholder="Contraseña (6+ caracteres)">
        <div id="zona-ciudad-registro" style="display:none;">
          <label>¿En qué ciudad vas a usar la app?</label>
          <select id="ciudad-registro"><option value="">Cargando ciudades...</option></select>
        </div>
        <button onclick="registrar()">Crear cuenta</button>
      </div>
    </div>
  `;
}

window.alRolCambiar = async () => {
  const rol = document.getElementById('rol').value;
  const necesitaCiudad = rol === 'cliente' || rol === 'comercio' || rol === 'repartidor';
  document.getElementById('zona-ciudad-registro').style.display = necesitaCiudad ? 'block' : 'none';
  if (!necesitaCiudad) return;
  const snap = await getDocs(query(collection(db, 'ciudades'), where('activa', '==', true)));
  const sel = document.getElementById('ciudad-registro');
  let opciones = '<option value="">— Elegir ciudad —</option>';
  snap.forEach(d => { opciones += `<option value="${d.id}">${d.data().nombre}</option>`; });
  sel.innerHTML = opciones || '<option value="">Todavía no hay ciudades habilitadas</option>';
};

let modoAdminLogin = false;
window.alternarLoginAdmin = () => {
  modoAdminLogin = !modoAdminLogin;
  document.getElementById('login-normal').style.display = modoAdminLogin ? 'none' : 'block';
  document.getElementById('login-admin').style.display = modoAdminLogin ? 'block' : 'none';
};

window.entrarAdmin = async () => {
  const usuario = document.getElementById('admin-usuario').value.trim().toLowerCase();
  const clave = document.getElementById('admin-clave-login').value;
  if (!usuario || !clave) return alert('Completá usuario y contraseña');
  const correoInterno = `${usuario}@admin.mujeresexpress.local`;
  try { await signInWithEmailAndPassword(auth, correoInterno, clave); }
  catch(e) { alert('Usuario o contraseña incorrectos'); }
};

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
  const necesitaCiudad = rol === 'cliente' || rol === 'comercio' || rol === 'repartidor';
  const ciudadId = necesitaCiudad ? document.getElementById('ciudad-registro').value : null;
  const ciudadNombre = necesitaCiudad ? (document.getElementById('ciudad-registro').selectedOptions[0]?.textContent || '') : null;
  if (!rol || !nombre || !correo || clave.length<6) return alert('Completá todos los datos (mínimo 6 caracteres)');
  if (necesitaCiudad && !ciudadId) return alert('⚠️ Elegí en qué ciudad vas a usar la app. Si no aparece ninguna, todavía no hay ciudades habilitadas ahí.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, clave);
    const aprobadoInicial = rol === 'cliente' || rol === 'dueno';
    await setDoc(doc(db,'usuarios',cred.user.uid), {
      nombre, nombreCompleto: nombre, correo, rol,
      ciudadId, ciudadNombre,
      aprobado: aprobadoInicial,
      estado: aprobadoInicial ? 'aprobado' : 'pendiente',
      fechaRegistro: new Date()
    });
    alert('✅ Cuenta creada. Si sos Dueño o Cliente ya podés entrar. Comercio y Repartidor esperan aprobación.');
  } catch(e) { alert('Error: '+e.message); }
};