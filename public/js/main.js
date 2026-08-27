import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { mostrarPantallaLoginRegistro } from './loginRegistro.js';
import { mostrarPanelCliente } from './panelCliente.js';
import { mostrarPanelComercio } from './panelComercio.js';
import { mostrarPanelRepartidor } from './panelRepartidor.js';
import { mostrarPanelDueno } from './panelDueno.js';

let datosConfiguracion = null;

// ==========================================
// PANTALLA DE BIENVENIDA — LO PRIMERO QUE SE VE
// ==========================================
async function mostrarPantallaBienvenida() {
  const app = document.getElementById('app');

  // Traer enlaces y configuración desde Firebase
  const snap = await getDoc(doc(db, 'configuracion', 'general'));
  
  // Valores por defecto si no existen aún
  datosConfiguracion = snap.exists() ? snap.data() : {
    whatsappEnlace: 'https://wa.me/59895205598',
    appRecomendada1Nombre: 'CF Apps Developer',
    appRecomendada1Enlace: '',
    appRecomendada2Nombre: '',
    appRecomendada2Enlace: ''
  };

  // Asegurar que TODO sea texto (evita error "cadena no está")
  datosConfiguracion.whatsappEnlace = String(datosConfiguracion.whatsappEnlace || '');
  datosConfiguracion.appRecomendada1Nombre = String(datosConfiguracion.appRecomendada1Nombre || '');
  datosConfiguracion.appRecomendada1Enlace = String(datosConfiguracion.appRecomendada1Enlace || '');
  datosConfiguracion.appRecomendada2Nombre = String(datosConfiguracion.appRecomendada2Nombre || '');
  datosConfiguracion.appRecomendada2Enlace = String(datosConfiguracion.appRecomendada2Enlace || '');

  // PANTALLA COMPLETA
  app.innerHTML = `
    <div class="contenedor" style="text-align:center; padding-top:40px; padding-bottom:40px;">
      
      <!-- LOGO GRANDE -->
      <img src="/img/logo.png" alt="Mujer Express Delivery" style="max-width:280px; margin-bottom:30px;">
      
      <!-- MENSAJE PUBLICITARIO -->
      <h2 style="color:#5a005a; margin-bottom:8px;">¿Tenés una idea?</h2>
      <p style="font-size:18px; color:#5a005a; margin-bottom:30px;">La convertimos en app.<br>Desarrollo a medida para comercios, servicios y más.</p>
      
      <!-- BOTÓN WHATSAPP -->
      <a href="${datosConfiguracion.whatsappEnlace}" target="_blank" style="text-decoration:none;">
        <button class="boton-confirmar" style="font-size:18px; padding:14px 32px; margin-bottom:30px;">💬 Contactanos por WhatsApp</button>
      </a>
      
      <!-- BOTÓN CONTINUAR A LA APP -->
      <br>
      <button class="boton-principal" onclick="ingresarApp()" style="font-size:18px; padding:14px 32px; margin-bottom:40px;">➡️ Continuar a la App</button>
      
      <hr>
      
      <!-- APPS RECOMENDADAS — EDITABLES DESDE PANEL DUEÑO -->
      <h3 style="margin-top:30px;">✨ Nuestras Apps Recomendadas</h3>
      <p style="color:#666; font-size:14px;">Tocá para visitar</p>
      
      <div style="margin-top:20px;">
        ${datosConfiguracion.appRecomendada1Enlace ? `
          <a href="${datosConfiguracion.appRecomendada1Enlace}" target="_blank" style="text-decoration:none;">
            <div class="tarjeta" style="cursor:pointer;">
              <strong>${datosConfiguracion.appRecomendada1Nombre}</strong>
            </div>
          </a>` : ''}
        
        ${datosConfiguracion.appRecomendada2Enlace ? `
          <a href="${datosConfiguracion.appRecomendada2Enlace}" target="_blank" style="text-decoration:none;">
            <div class="tarjeta" style="cursor:pointer;">
              <strong>${datosConfiguracion.appRecomendada2Nombre}</strong>
            </div>
          </a>` : ''}
      </div>
      
    </div>
  `;

  // Función al tocar "Continuar"
  window.ingresarApp = function() {
    mostrarPantallaLoginRegistro();
    verificarSesion();
  };
}

// ==========================================
// VERIFICAR SI YA HAY SESIÓN INICIADA
// ==========================================
function verificarSesion() {
  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) return; // Si no hay nadie, se queda en pantalla de ingreso

    const snap = await getDoc(doc(db, 'usuarios', usuario.uid));
    if (!snap.exists()) return;

    const datos = snap.data();

    // Redirigir al panel que corresponde
    if (datos.rol === 'dueño') return mostrarPanelDueno(datos);
    if (datos.rol === 'comercio') return mostrarPanelComercio(datos);
    if (datos.rol === 'repartidor') return mostrarPanelRepartidor(datos);
    if (datos.rol === 'cliente') return mostrarPanelCliente(datos);
  });
}

// ==========================================
// INICIAR TODO — APARECE LA BIENVENIDA
// ==========================================
mostrarPantallaBienvenida();