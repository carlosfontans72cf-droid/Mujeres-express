// Aviso anti-estafa reutilizable — debe mostrarse en TODAS las pantallas
// de la app (login, registro, y los 5 paneles), según lo pedido.

export function avisoAntiEstafaHTML() {
  return `
    <div style="background:#fff3cd; border:2px solid #f0b429; border-radius:8px; padding:10px; margin:10px 0; font-size:0.9em;">
      ⚠️ <strong>Mujer Express nunca te va a pedir dinero, contraseñas ni datos de tu cuenta bancaria</strong>,
      ni por la app, ni por WhatsApp, ni por mail, ni por ningún otro medio. Si alguien te lo pide
      haciéndose pasar por la app o por un repartidor/comercio/administrador de Mujer Express,
      <strong>es una estafa</strong>: no respondas y denuncialo en la comisaría más cercana.
    </div>
  `;
}
