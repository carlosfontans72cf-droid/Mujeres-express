import { db } from '../firebase.js';
import { getDoc, doc } from 'firebase/firestore';

let configCache = null;
let fechaCache = null;

// Trae comisiones desde la base de datos (editables desde el panel)
export async function obtenerComisiones() {
  const hoy = new Date().toDateString();
  if (configCache && fechaCache === hoy) {
    return configCache;
  }

  const ref = doc(db, 'configuracionGlobal', 'parametros');
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return { comisionApp: 10, repartidor: 7, comercio: 90, gananciaApp: 3 };
  }

  const datos = snap.data();
  const comisionApp = datos.porcentajeComisionApp ?? 10;
  const repartidor = datos.porcentajeRepartidor ?? 7;
  const comercio = 100 - comisionApp;
  const gananciaApp = comisionApp - repartidor;

  configCache = { comisionApp, repartidor, comercio, gananciaApp };
  fechaCache = hoy;
  return configCache;
}

// Calcula los montos de un pedido
export async function calcularMontos(totalBruto) {
  const { comisionApp, repartidor, gananciaApp } = await obtenerComisiones();

  return {
    totalBruto,
    montoComisionApp: Number((totalBruto * comisionApp / 100).toFixed(2)),
    montoRepartidor: Number((totalBruto * repartidor / 100).toFixed(2)),
    montoComercio: Number((totalBruto * (100 - comisionApp) / 100).toFixed(2)),
    gananciaApp: Number((totalBruto * gananciaApp / 100).toFixed(2)),
    porcentajeComisionApp: comisionApp,
    porcentajeRepartidor: repartidor
  };
}