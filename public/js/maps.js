// Integración de Google Maps: carga del SDK, geolocalización del navegador,
// y ventanas de mapa que trazan la ruta entre dos puntos (Directions API).
// Los puntos de origen/destino pueden ser {lat,lng} o una dirección en texto
// (Directions API geocodifica direcciones de texto automáticamente).

const API_KEY = 'AIzaSyC3i81G85kzCt8SbQ1EM5rlYL_R72R0YiM';
let promesaCarga = null;

export function cargarGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve();
  if (promesaCarga) return promesaCarga;
  promesaCarga = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps. Revisá tu conexión o la clave de API.'));
    document.head.appendChild(script);
  });
  return promesaCarga;
}

export function obtenerUbicacionActual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Tu navegador no soporta geolocalización'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Sigue la ubicación del dispositivo y llama a callback({lat,lng}) cada vez
// que cambia. Devuelve un id para poder detenerlo con detenerSeguimiento().
export function iniciarSeguimientoUbicacion(callback) {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    err => console.error('Error de geolocalización:', err),
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
}

export function detenerSeguimientoUbicacion(watchId) {
  if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
}

function crearOverlayMapa(titulo) {
  const overlay = document.createElement('div');
  overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:12px;width:95%;max-width:600px;">
      <h3>🗺️ ${titulo}</h3>
      <div class="mapa-contenedor" style="width:100%;height:400px;border-radius:6px;background:#eee;"></div>
      <button class="mapa-cerrar" style="margin-top:8px;">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Mapa de una sola vez: traza la ruta y listo.
export async function abrirMapaRuta(origen, destino, titulo = 'Ruta') {
  try {
    await cargarGoogleMaps();
  } catch (e) {
    return alert('⚠️ ' + e.message);
  }
  const overlay = crearOverlayMapa(titulo);
  overlay.querySelector('.mapa-cerrar').onclick = () => overlay.remove();
  dibujarRuta(overlay.querySelector('.mapa-contenedor'), origen, destino);
}

// Mapa en vivo: expone actualizar(nuevoOrigen) para redibujar la ruta cuando
// cambia la posición (por ejemplo, la ubicación del repartidor en Firestore).
export async function abrirMapaRutaEnVivo(origenInicial, destino, titulo = 'Ruta en vivo', alCerrar) {
  try {
    await cargarGoogleMaps();
  } catch (e) {
    alert('⚠️ ' + e.message);
    return { actualizar: () => {} };
  }
  const overlay = crearOverlayMapa(titulo);
  overlay.querySelector('.mapa-cerrar').onclick = () => { if (alCerrar) alCerrar(); overlay.remove(); };
  const { renderer } = dibujarRuta(overlay.querySelector('.mapa-contenedor'), origenInicial, destino);
  return {
    actualizar(nuevoOrigen) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        { origin: nuevoOrigen, destination: destino, travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => { if (status === 'OK') renderer.setDirections(result); }
      );
    }
  };
}

function dibujarRuta(contenedor, origen, destino) {
  const mapa = new google.maps.Map(contenedor, {
    zoom: 13,
    center: typeof origen === 'object' ? origen : { lat: -34.9, lng: -56.16 }
  });
  const directionsService = new google.maps.DirectionsService();
  const renderer = new google.maps.DirectionsRenderer({ map: mapa });
  directionsService.route(
    { origin: origen, destination: destino, travelMode: google.maps.TravelMode.DRIVING },
    (result, status) => {
      if (status === 'OK') renderer.setDirections(result);
      else contenedor.innerHTML = '<p style="padding:12px;">No se pudo calcular la ruta (revisá que la dirección esté completa y correcta).</p>';
    }
  );
  return { mapa, renderer };
}

// Mapa con varios marcadores sueltos (sin ruta) — para la vista global del Dueño.
export async function abrirMapaMultiple(puntos, titulo = 'Mapa en vivo') {
  try {
    await cargarGoogleMaps();
  } catch (e) {
    return alert('⚠️ ' + e.message);
  }
  const overlay = crearOverlayMapa(titulo);
  overlay.querySelector('.mapa-cerrar').onclick = () => overlay.remove();
  const contenedor = overlay.querySelector('.mapa-contenedor');
  const centro = puntos[0]?.posicion || { lat: -34.9, lng: -56.16 };
  const mapa = new google.maps.Map(contenedor, { zoom: 12, center: centro });
  puntos.forEach(p => {
    new google.maps.Marker({ position: p.posicion, map: mapa, title: p.etiqueta, label: p.icono || undefined });
  });
}
