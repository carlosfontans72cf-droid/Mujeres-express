// Pantalla de presentación de CF Apps Developer — se muestra antes que
// cualquier otra cosa (antes del login), con un botón "Continuar" para
// seguir a la app, y los botones de contacto por WhatsApp.

export function mostrarSplashDesarrollador(alContinuar) {
  document.getElementById('app').innerHTML = `
    <div class="contenedor" style="text-align:center; background:#0b1e3d; color:#fff; border-radius:12px; padding:24px;">
      <h1 style="color:#2ecc71;">&lt;/&gt; <span style="color:#f1c40f;">CF</span></h1>
      <h3 style="letter-spacing:2px; color:#ccc;">DESARROLLADOR DE APPS</h3>
      <hr style="border-color:#f1c40f; width:60px; margin:16px auto;">
      <p>¿Tenés una idea? Te la convertimos en app.<br>Desarrollo a medida para comercios, restaurantes y servicios.</p>
      <p style="margin-top:12px;">🇺🇾 +598 95 205598 &nbsp; &nbsp; 🇧🇷 +55 53 99926-5575</p>
      <div style="display:flex; flex-direction:column; gap:10px; max-width:320px; margin:16px auto;">
        <a href="https://wa.me/59895205598" target="_blank" style="text-decoration:none;">
          <button style="width:100%; background:#25D366; color:#fff; border:none; padding:10px; border-radius:20px; font-weight:bold;">🇺🇾 WhatsApp Uruguay</button>
        </a>
        <a href="https://wa.me/5553999265575" target="_blank" style="text-decoration:none;">
          <button style="width:100%; background:#25D366; color:#fff; border:none; padding:10px; border-radius:20px; font-weight:bold;">🇧🇷 WhatsApp Brasil</button>
        </a>
      </div>
      <p style="font-size:0.75em; color:#888; margin-top:8px;">POWERED BY CF APPS DEVELOPER</p>
      <button id="btn-continuar-splash" style="margin-top:16px; padding:10px 24px;">Continuar →</button>
    </div>
  `;
  document.getElementById('btn-continuar-splash').onclick = alContinuar;
}
