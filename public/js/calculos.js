import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';

let porcentajeApp = 10;
let porcentajeRepartidor = 7;

export async function cargarPorcentajes() {
  try {
    const snap = await getDoc(doc(db, 'configuracion', 'comisiones'));
    if (snap.exists()) {
      const c = snap.data();
      porcentajeApp = c.porcentajeApp || 10;
      porcentajeRepartidor = c.porcentajeRepartidor || 7;
    }
  } catch {}
}

export async function calcularMontos(totalBruto) {
  await cargarPorcentajes();
  const comisionApp = totalBruto * porcentajeApp / 100;
  const comisionRepartidor = totalBruto * porcentajeRepartidor / 100;
  const netoComercio = totalBruto - comisionApp - comisionRepartidor;
  return { totalBruto, porcentajeApp, comisionApp, porcentajeRepartidor, comisionRepartidor, netoComercio };
}