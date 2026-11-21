/* =========================================================
   ROCKOLA PERRO NEGRO · configuración
   Este es el único archivo que hay que editar (ver LEEME.txt).
   ========================================================= */

/* 1) Datos del proyecto de Firebase (LEEME.txt, paso 2) */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyANH64KDDCfbRnZ4VTefTi8kQ9XAJ_-4y8",
  authDomain: "rockola-perro.firebaseapp.com",
  projectId: "rockola-perro",
  storageBucket: "rockola-perro.firebasestorage.app",
  messagingSenderId: "394364471977",
  appId: "1:394364471977:web:966c36497b9f2fe55777b8"
};

/* 2) Única cuenta que administra la rockola */
const CORREO_ADMIN = "restobarperronegro.tarija@gmail.com";

/* 3) Clave de YouTube (opcional, LEEME.txt, paso 5).
      Vacía = los clientes pueden pedir pegando el enlace de YouTube, pero no buscar por nombre. */
const YOUTUBE_KEY = "AIzaSyAEFpWPA5gXrOV5xpu-TTH7XkVatMgrH6w";

/* 4) Dirección de la página del cliente (aparece en la pantalla de la TV) */
const URL_CLIENTE = "https://arieluntigre.github.io/perro-negro-links/rockola/";

/* Valores por defecto. Se cambian en el panel del administrador, pestaña Ajustes. */
const AJUSTES_POR_DEFECTO = { cadaN: 3, minutosProp: 10, segImg: 10, limitePedidos: 3, ventanaMinutos: 10 };

/* ---------- utilidades compartidas por las tres páginas ---------- */
let db = null, auth = null;

function iniciarFirebase() {
  if (typeof firebase === "undefined" || FIREBASE_CONFIG.projectId === "PEGAR_AQUI") return false;
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
  return true;
}

/* Código de 11 letras de un enlace de YouTube, o "" si el texto no es un enlace */
function idDeYouTube(texto) {
  const m = (texto || "").match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

/* Milisegundos de una marca de tiempo de Firestore (si aún no existe, la hora actual) */
function ms(t) {
  if (!t) return Date.now();
  if (typeof t === "number") return t;
  return t.toMillis ? t.toMillis() : Date.now();
}

/* Busca por nombre en YouTube. Usa la caché de Firestore (colección busquedas) para no gastar cuota.
   Devuelve [{id, titulo}]. Lanza error si no hay clave o si el buscador no responde. */
async function buscarEnYouTube(texto) {
  const consulta = texto.trim().toLowerCase().slice(0, 100);
  const cacheId = consulta.replace(/[^a-z0-9áéíóúñü]+/g, "_").slice(0, 120) || "vacio";
  try {
    const c = await db.collection("busquedas").doc(cacheId).get();
    if (c.exists && Array.isArray(c.data().resultados)) return c.data().resultados;
  } catch (e) {}
  if (!YOUTUBE_KEY) throw new Error("sin-clave");
  const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q="
    + encodeURIComponent(texto) + "&key=" + encodeURIComponent(YOUTUBE_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error("busqueda-" + res.status);
  const data = await res.json();
  const resultados = (data.items || [])
    .filter(i => i.id && i.id.videoId)
    .map(i => ({ id: i.id.videoId, titulo: ((i.snippet && i.snippet.title) || "Video de YouTube").slice(0, 120) }));
  try {
    await db.collection("busquedas").doc(cacheId).set({
      consulta: consulta,
      resultados: resultados,
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
  return resultados;
}
