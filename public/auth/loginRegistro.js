import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

export function mostrarPantallaLoginRegistro() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="contenedor">
      <h1>👋 Bienvenido — Mujer Express</h1>
      <div class="fila-botones">
        <button class="boton-principal" onclick="mostrarLogin()">🔑 Iniciar Sesión</button>
        <button class="boton-confirmar" onclick="mostrarRegistro()">📝 Registrarse</button>
      </div>
      <div id="caja-formulario"></div>
    </div>
  `;
  window.mostrarLogin = mostrarLogin;
  window.mostrarRegistro = mostrarRegistro;
  mostrarLogin();
}

// ==========================================
// INICIAR SESIÓN
// ==========================================
function mostrarLogin() {
  document.getElementById('caja-formulario').innerHTML = `
    <h2>🔑 Ingresar a tu cuenta</h2>
    <label class="etiqueta">Correo Electrónico:</label>
    <input type="email" id="ing_correo" placeholder="tu@correo.com">
    
    <label class="etiqueta">Contraseña:</label>
    <input type="password" id="ing_pass" placeholder="Tu contraseña">
    
    <div class="fila-botones">
      <button class="boton-confirmar" onclick="iniciarSesion()">✅ Ingresar</button>
    </div>
    <p class="texto-centro">¿No tenés cuenta? Tocá arriba en "Registrarse"</p>
  `;
  window.iniciarSesion = async () => {
    const correo = document.getElementById('ing_correo').value.trim();
    const pass = document.getElementById('ing_pass').value;
    if (!correo || pass.length < 6) return alert('⚠️ Completá todos los campos. Contraseña mínimo 6 caracteres.');
    try {
      await signInWithEmailAndPassword(auth, correo, pass);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };
}

// ==========================================
// REGISTRO — ELEGIR ROL
// ==========================================
function mostrarRegistro() {
  document.getElementById('caja-formulario').innerHTML = `
    <h2>📝 Crear Cuenta Nueva</h2>
    <label class="etiqueta">¿Qué tipo de cuenta querés crear?</label>
    <select id="reg_rol" onchange="cambiarFormularioPorRol()">
      <option value="">Seleccioná una opción...</option>
      <option value="cliente">🛒 Cliente</option>
      <option value="comercio">🏪 Comerciante</option>
      <option value="repartidor">🚚 Repartidor</option>
    </select>
    <div id="formulario-dinamico"></div>
  `;
  window.cambiarFormularioPorRol = cambiarFormularioPorRol;
}

// ==========================================
// CAMBIA EL FORMULARIO SEGÚN EL ROL ELEGIDO
// ==========================================
function cambiarFormularioPorRol() {
  const rol = document.getElementById('reg_rol').value;
  const caja = document.getElementById('formulario-dinamico');

  // ===== CLIENTE =====
  if (rol === 'cliente') {
    caja.innerHTML = `
      <hr>
      <label class="etiqueta">Nombre:</label>
      <input type="text" id="reg_nombre">
      <label class="etiqueta">Apellido:</label>
      <input type="text" id="reg_apellido">
      <label class="etiqueta">Correo Electrónico:</label>
      <input type="email" id="reg_correo">
      <label class="etiqueta">Contraseña (mínimo 6 caracteres):</label>
      <input type="password" id="reg_pass">
      
      <label class="etiqueta">📍 Dirección de entrega:</label>
      <input type="text" id="reg_direccion" placeholder="Calle, Número, Apartamento...">
      <label class="etiqueta">Referencias (color de puerta, esquina, etc.):</label>
      <input type="text" id="reg_referencias" placeholder="Ayuda al repartidor a encontrar tu casa">
      
      <label class="etiqueta">📌 Tu ubicación en el mapa:</label>
      <button class="boton-principal" type="button" onclick="obtenerUbicacion()">📍 Usar mi ubicación actual</button>
      <p id="texto-ubicacion" style="color:#5a005a; font-size:14px;"></p>
      <input type="hidden" id="reg_latitud">
      <input type="hidden" id="reg_longitud">
      
      <label class="etiqueta">📞 Número de WhatsApp:</label>
      <input type="tel" id="reg_whatsapp" placeholder="+598 99 123 456">
      
      <label style="display:flex; gap:8px; align-items:flex-start; margin:16px 0;">
        <input type="checkbox" id="reg_terminos">
        <span>Acepto los <a href="legales/terminos-generales.html" target="_blank" style="color:#2196f3; text-decoration:underline;">Términos y Condiciones Generales</a>.</span>
      </label>
      
      <div class="fila-botones">
        <button class="boton-confirmar" onclick="registrarse()">✅ Crear Cuenta</button>
      </div>
    `;
    // Obtener GPS del cliente
    window.obtenerUbicacion = function() {
      if (!navigator.geolocation) {
        return alert('❌ Tu navegador no soporta ubicación. Escribí la dirección manualmente.');
      }
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          document.getElementById('reg_latitud').value = pos.coords.latitude;
          document.getElementById('reg_longitud').value = pos.coords.longitude;
          document.getElementById('texto-ubicacion').innerHTML = '✅ Ubicación guardada correctamente';
        },
        function(err) {
          alert('❌ No se pudo obtener la ubicación. Asegurate de permitir el acceso.');
        }
      );
    };
  }

  // ===== COMERCIANTE =====
  if (rol === 'comercio') {
    caja.innerHTML = `
      <hr>
      <div style="background:#fff3e0; padding:12px; border-radius:8px; margin-bottom:16px;">
        ⚠️ <strong>AVISO IMPORTANTE:</strong> Los datos bancarios que ingresás son <strong>ÚNICAMENTE para recibir tus pagos y comisiones</strong>. La app <strong>NUNCA</strong> podrá extraer dinero de tus cuentas, ni te pedirá que envíes dinero ni códigos por WhatsApp.
      </div>
      
      <label class="etiqueta">Nombre:</label>
      <input type="text" id="reg_nombre">
      <label class="etiqueta">Apellido:</label>
      <input type="text" id="reg_apellido">
      <label class="etiqueta">Correo Electrónico:</label>
      <input type="email" id="reg_correo">
      <label class="etiqueta">Contraseña (mínimo 6 caracteres):</label>
      <input type="password" id="reg_pass">
      
      <label class="etiqueta">País de la cuenta:</label>
      <select id="reg_pais" onchange="cambiarTipoDocumento()">
        <option value="">Seleccioná tu país...</option>
        <option value="Uruguay">🇺🇾 Uruguay</option>
        <option value="Brasil">🇧🇷 Brasil</option>
      </select>
      <div id="campo-documento"></div>
      <label class="etiqueta">RUT (opcional):</label>
      <input type="text" id="reg_rut" placeholder="Solo si contás con él">
      
      <label class="etiqueta">Número de WhatsApp:</label>
      <input type="tel" id="reg_whatsapp" placeholder="+598 99 123 456">
      
      <h3>🏦 Datos Bancarios para recibir tus pagos:</h3>
      <label class="etiqueta">Nombre del Banco:</label>
      <input type="text" id="reg_banco">
      <label class="etiqueta">Número de Cuenta:</label>
      <input type="text" id="reg_cuenta">
      <label class="etiqueta">Tipo de Cuenta:</label>
      <select id="reg_tipoCuenta">
        <option>Cuenta Corriente</option>
        <option>Cuenta de Ahorros</option>
        <option>Cuenta Simple</option>
      </select>
      <label class="etiqueta">Moneda:</label>
      <select id="reg_moneda">
        <option>UYU — Peso Uruguayo</option>
        <option>BRL — Real Brasileño</option>
        <option>USD — Dólares</option>
      </select>
      
      <label style="display:flex; gap:8px; align-items:flex-start; margin:16px 0;">
        <input type="checkbox" id="reg_terminos">
        <span>Declaro que los datos bancarios son correctos y acepto los <a href="legales/terminos-comerciantes.html" target="_blank" style="color:#2196f3; text-decoration:underline;">Términos y Condiciones para Comerciantes</a>.</span>
      </label>
      
      <div class="fila-botones">
        <button class="boton-confirmar" onclick="registrarse()">✅ Crear Cuenta — Queda pendiente de aprobación</button>
      </div>
    `;
    window.cambiarTipoDocumento = cambiarTipoDocumento;
  }

  // ===== REPARTIDOR =====
  if (rol === 'repartidor') {
    caja.innerHTML = `
      <hr>
      <div style="background:#fff3e0; padding:12px; border-radius:8px; margin-bottom:16px;">
        ⚠️ <strong>AVISO IMPORTANTE:</strong> Los datos bancarios que ingresás son <strong>ÚNICAMENTE para recibir el pago de tus entregas y comisiones</strong>. La app <strong>NUNCA</strong> podrá extraer dinero de tus cuentas, ni te pedirá que envíes dinero ni códigos por WhatsApp.
      </div>
      
      <label class="etiqueta">Nombre:</label>
      <input type="text" id="reg_nombre">
      <label class="etiqueta">Apellido:</label>
      <input type="text" id="reg_apellido">
      <label class="etiqueta">Correo Electrónico:</label>
      <input type="email" id="reg_correo">
      <label class="etiqueta">Contraseña (mínimo 6 caracteres):</label>
      <input type="password" id="reg_pass">
      
      <label class="etiqueta">País de la cuenta:</label>
      <select id="reg_pais" onchange="cambiarTipoDocumento()">
        <option value="">Seleccioná tu país...</option>
        <option value="Uruguay">🇺🇾 Uruguay</option>
        <option value="Brasil">🇧🇷 Brasil</option>
      </select>
      <div id="campo-documento"></div>
      
      <label class="etiqueta">Número de WhatsApp:</label>
      <input type="tel" id="reg_whatsapp" placeholder="+598 99 123 456">
      
      <h3>🚚 Datos del Vehículo:</h3>
      <label class="etiqueta">Marca y Modelo:</label>
      <input type="text" id="reg_vehiculo" placeholder="Ej: Chevrolet Prisma">
      <label class="etiqueta">Patente / Placa:</label>
      <input type="text" id="reg_patente">
      <label class="etiqueta">Número de Licencia de Conducir:</label>
      <input type="text" id="reg_licencia">
      
      <h3>🏦 Datos Bancarios — Aquí recibirás tus pagos automáticamente:</h3>
      <label class="etiqueta">Nombre del Banco:</label>
      <input type="text" id="reg_banco">
      <label class="etiqueta">Número de Cuenta:</label>
      <input type="text" id="reg_cuenta">
      <label class="etiqueta">Tipo de Cuenta:</label>
      <select id="reg_tipoCuenta">
        <option>Cuenta Corriente</option>
        <option>Cuenta de Ahorros</option>
        <option>Cuenta Simple</option>
      </select>
      <label class="etiqueta">Moneda:</label>
      <select id="reg_moneda">
        <option>UYU — Peso Uruguayo</option>
        <option>BRL — Real Brasileño</option>
        <option>USD — Dólares</option>
      </select>
      
      <label style="display:flex; gap:8px; align-items:flex-start; margin:16px 0;">
        <input type="checkbox" id="reg_terminos">
        <span>Declaro que los datos bancarios son correctos y acepto los <a href="legales/terminos-repartidores.html" target="_blank" style="color:#2196f3; text-decoration:underline;">Términos y Condiciones para Repartidores</a>.</span>
      </label>
      
      <div class="fila-botones">
        <button class="boton-confirmar" onclick="registrarse()">✅ Crear Cuenta — Queda pendiente de aprobación</button>
      </div>
    `;
    window.cambiarTipoDocumento = cambiarTipoDocumento;
  }
}

// ==========================================
// CAMBIA EL DOCUMENTO SEGÚN EL PAÍS
// ==========================================
function cambiarTipoDocumento() {
  const pais = document.getElementById('reg_pais').value;
  const caja = document.getElementById('campo-documento');
  
  if (pais === 'Uruguay') {
    caja.innerHTML = `<label class="etiqueta">Cédula de Identidad:</label><input type="text" id="reg_documento" placeholder="Ej: 1.234.567-8">`;
  } else if (pais === 'Brasil') {
    caja.innerHTML = `<label class="etiqueta">CPF / CNPJ:</label><input type="text" id="reg_documento" placeholder="Ej: 123.456.789-00">`;
  } else {
    caja.innerHTML = '';
  }
}

// ==========================================
// FUNCIÓN DE REGISTRO — GUARDA TODO EN FIREBASE
// ==========================================
window.registrarse = async () => {
  const rol = document.getElementById('reg_rol').value;
  const nombre = document.getElementById('reg_nombre').value.trim();
  const apellido = document.getElementById('reg_apellido').value.trim();
  const correo = document.getElementById('reg_correo').value.trim();
  const pass = document.getElementById('reg_pass').value;
  const aceptoTerminos = document.getElementById('reg_terminos').checked;

  if (!nombre || !apellido || !correo || pass.length < 6) {
    return alert('⚠️ Completá todos los campos obligatorios. Contraseña mínimo 6 caracteres.');
  }
  if (!aceptoTerminos) {
    return alert('⚠️ Debés aceptar los Términos y Condiciones para continuar.');
  }

  const nombreCompleto = `${nombre} ${apellido}`;
  let datosUsuario = {
    nombreCompleto, correo, rol,
    fechaRegistro: new Date(),
    estado: rol === 'cliente' ? 'aprobado' : 'pendiente'
  };

  // Datos del CLIENTE
  if (rol === 'cliente') {
    datosUsuario = {
      ...datosUsuario,
      direccion: document.getElementById('reg_direccion').value.trim(),
      referencias: document.getElementById('reg_referencias').value.trim(),
      whatsapp: document.getElementById('reg_whatsapp').value.trim(),
      latitud: document.getElementById('reg_latitud').value || null,
      longitud: document.getElementById('reg_longitud').value || null
    };
  }

  // Datos COMERCIANTE y REPARTIDOR
  if (rol !== 'cliente') {
    datosUsuario = {
      ...datosUsuario,
      pais: document.getElementById('reg_pais').value,
      documento: document.getElementById('reg_documento').value.trim(),
      whatsapp: document.getElementById('reg_whatsapp').value.trim(),
      banco: document.getElementById('reg_banco').value.trim(),
      cuenta: document.getElementById('reg_cuenta').value.trim(),
      tipoCuenta: document.getElementById('reg_tipoCuenta').value,
      moneda: document.getElementById('reg_moneda').value,
      aceptoTerminos: true
    };
  }

  if (rol === 'comercio') {
    datosUsuario.rut = document.getElementById('reg_rut')?.value.trim() || '';
  }

  if (rol === 'repartidor') {
    datosUsuario.vehiculo = document.getElementById('reg_vehiculo').value.trim();
    datosUsuario.patente = document.getElementById('reg_patente').value.trim();
    datosUsuario.licencia = document.getElementById('reg_licencia').value.trim();
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, pass);
    await setDoc(doc(db, 'usuarios', cred.user.uid), datosUsuario);
    
    if (rol === 'cliente') {
      alert('✅ Cuenta creada con éxito. ¡Bienvenido!');
    } else {
      alert('✅ Registro enviado. Tu cuenta queda en estado PENDIENTE hasta que el Dueño la apruebe. Te avisaremos cuando esté activa.');
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
};