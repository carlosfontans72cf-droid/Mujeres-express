import { db, auth } from './firebase.js';
import { collection, addDoc, doc, setDoc, query, orderBy, onSnapshot, getDocs, getDoc } from 'firebase/firestore';

// Chat genérico entre dos usuarios (cliente-comercio, comercio-repartidor,
// o el dueño/admin viendo cualquier conversación). El id de la conversación
// es siempre la combinación ordenada de los dos UID, así dos personas
// que ya se escribieron siempre caen en el mismo hilo.

let cancelarEscucha = null;

export function idConversacion(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export async function abrirChat(otroUid, otroNombre, { soloLectura = false } = {}) {
  const miUid = auth.currentUser.uid;
  const convId = idConversacion(miUid, otroUid);

  const overlay = document.createElement('div');
  overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:16px;width:90%;max-width:420px;max-height:80vh;display:flex;flex-direction:column;">
      <h3>💬 ${otroNombre || 'Chat'}</h3>
      <div id="chat-mensajes" style="flex:1;overflow-y:auto;border:1px solid #eee;padding:8px;margin-bottom:8px;min-height:200px;max-height:50vh;"></div>
      ${soloLectura ? '<p style="font-size:0.8em;color:#888;">Estás viendo esta conversación como administrador.</p>' : `
        <div style="display:flex;gap:6px;">
          <input type="text" id="chat-input" placeholder="Escribí un mensaje..." style="flex:1;">
          <button id="chat-enviar">Enviar</button>
        </div>
      `}
      <button id="chat-cerrar" style="margin-top:8px;">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const cont = overlay.querySelector('#chat-mensajes');
  const q = query(collection(db, 'chats', convId, 'mensajes'), orderBy('fecha', 'asc'));
  cancelarEscucha = onSnapshot(q, snap => {
    let html = '';
    snap.forEach(d => {
      const m = d.data();
      const esMio = m.de === miUid;
      html += `<div style="text-align:${esMio ? 'right' : 'left'};margin:4px 0;">
        <span style="display:inline-block;background:${esMio ? '#dcf8c6' : '#f1f1f1'};padding:6px 10px;border-radius:12px;max-width:80%;">${(m.texto || '').replace(/</g,'&lt;')}</span>
      </div>`;
    });
    cont.innerHTML = html || '<p style="color:#999;">Todavía no hay mensajes.</p>';
    cont.scrollTop = cont.scrollHeight;
  });

  const cerrar = () => {
    if (cancelarEscucha) cancelarEscucha();
    overlay.remove();
  };
  overlay.querySelector('#chat-cerrar').onclick = cerrar;

  if (!soloLectura) {
    const enviar = async () => {
      const input = overlay.querySelector('#chat-input');
      const texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      // Aseguramos que exista el documento padre de la conversación,
      // con los participantes, para que el dueño/admin pueda listarlas.
      await setDoc(doc(db, 'chats', convId), {
        participantes: [miUid, otroUid],
        ultimaActualizacion: new Date()
      }, { merge: true });
      await addDoc(collection(db, 'chats', convId, 'mensajes'), {
        de: miUid, texto, fecha: new Date()
      });
    };
    overlay.querySelector('#chat-enviar').onclick = enviar;
    overlay.querySelector('#chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') enviar();
    });
  }
}

// Lista todas las conversaciones del sistema, con el nombre de sus dos
// participantes ya resuelto, para que el dueño/admin elijan cuál mirar.
export async function listarTodasLasConversaciones() {
  const snap = await getDocs(collection(db, 'chats'));
  const conversaciones = [];
  for (const d of snap.docs) {
    const data = d.data();
    const participantes = data.participantes || [];
    const nombres = await Promise.all(participantes.map(async uid => {
      try {
        const uSnap = await getDoc(doc(db, 'usuarios', uid));
        return uSnap.exists() ? (uSnap.data().nombreCompleto || uSnap.data().correo || uid) : uid;
      } catch { return uid; }
    }));
    conversaciones.push({ convId: d.id, participantes, nombres });
  }
  return conversaciones;
}

// Abre una conversación existente en modo solo-lectura, identificando cada
// mensaje por el nombre de quien lo escribió (no asume que "yo" sea parte
// de la charla, porque quien observa es el dueño/admin).
export async function abrirChatObservador(convId, nombres) {
  const overlay = document.createElement('div');
  overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:16px;width:90%;max-width:420px;max-height:80vh;display:flex;flex-direction:column;">
      <h3>👁️ Conversación: ${nombres.join(' ↔ ')}</h3>
      <p style="font-size:0.8em;color:#888;">Estás viendo esta conversación como administrador.</p>
      <div id="chat-obs-mensajes" style="flex:1;overflow-y:auto;border:1px solid #eee;padding:8px;margin-bottom:8px;min-height:200px;max-height:50vh;"></div>
      <button id="chat-obs-cerrar">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const cont = overlay.querySelector('#chat-obs-mensajes');
  const q = query(collection(db, 'chats', convId, 'mensajes'), orderBy('fecha', 'asc'));
  const cancelar = onSnapshot(q, async snap => {
    let html = '';
    for (const d of snap.docs) {
      const m = d.data();
      let nombreDe = m.de;
      try {
        const uSnap = await getDoc(doc(db, 'usuarios', m.de));
        if (uSnap.exists()) nombreDe = uSnap.data().nombreCompleto || uSnap.data().correo || m.de;
      } catch {}
      html += `<div style="margin:4px 0;"><strong>${nombreDe}:</strong> ${(m.texto||'').replace(/</g,'&lt;')}</div>`;
    }
    cont.innerHTML = html || '<p style="color:#999;">Todavía no hay mensajes.</p>';
    cont.scrollTop = cont.scrollHeight;
  });

  overlay.querySelector('#chat-obs-cerrar').onclick = () => { cancelar(); overlay.remove(); };
}
