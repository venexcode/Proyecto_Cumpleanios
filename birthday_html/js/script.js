// 1. URL de tu despliegue de Google Apps Script (Paso 2 de las instrucciones)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx51eUyk4D-oXilkL-Dd0pOaisA1r_CFhcfYRG9Hf1Lizk-y5YiCeaCD8h7RmsYcow_WA/exec";

// Límites de tamaño del lado del navegador (evita esperar al backend para descubrir
// que un archivo es demasiado grande; deben coincidir con los del backend)
const LIMITE_VIDEO_MB = 25;
const LIMITE_AUDIO_MB = 10;

// Obtener o asignar un ID único de usuario para este navegador/dispositivo
let userId = localStorage.getItem("user_device_id");
if (!userId) {
  userId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("user_device_id", userId);
}

let activeAudioSubTab = "mic";
let selectedColor = "#E8F1F9";

let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;
let recInterval;
let recSeconds = 0;

// -------------------------------------------------------------
// PESTAÑAS (CORREGIDO: ya no depende de recibir el "event" del click,
// que antes fallaba porque el HTML no lo pasaba como parámetro)
// -------------------------------------------------------------
function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));

  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  const tabEl = document.getElementById("tab-" + tab);
  if (tabEl) tabEl.classList.add("active");
}

function toggleAudioSubTab(sub) {
  activeAudioSubTab = sub;
  document.getElementById("btnOptMic").classList.toggle("active", sub === "mic");
  document.getElementById("btnOptFile").classList.toggle("active", sub === "file");
  document.getElementById("subtab-mic").style.display = sub === "mic" ? "block" : "none";
  document.getElementById("subtab-file").style.display = sub === "file" ? "block" : "none";
}

async function toggleRecording() {
  const btnMic = document.getElementById("btnMic");
  const btnMicText = document.getElementById("btnMicText");
  const recStatusText = document.getElementById("recStatusText");
  const recTimer = document.getElementById("recTimer");
  const audioPreview = document.getElementById("audioPreview");

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

      mediaRecorder.onstop = () => {
        recordedAudioBlob = new Blob(audioChunks, { type: "audio/webm" });
        audioPreview.src = URL.createObjectURL(recordedAudioBlob);
        audioPreview.style.display = "block";
      };

      mediaRecorder.start();
      isRecording = true;
      btnMic.classList.add("recording");
      btnMicText.textContent = "Detener Grabación";
      recStatusText.textContent = "Grabando tu saludo...";
      recTimer.style.display = "block";

      recSeconds = 0;
      recInterval = setInterval(() => {
        recSeconds++;
        const mins = String(Math.floor(recSeconds / 60)).padStart(2, "0");
        const secs = String(recSeconds % 60).padStart(2, "0");
        recTimer.textContent = `${mins}:${secs}`;
      }, 1000);
    } catch (err) {
      alert("No se pudo acceder al micrófono. Verifica los permisos de tu navegador.");
    }
  } else {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    isRecording = false;
    clearInterval(recInterval);
    btnMic.classList.remove("recording");
    btnMicText.textContent = "Volver a Grabar";
    recStatusText.textContent = "¡Grabación lista para publicar!";
  }
}

function selectColor(color, el) {
  selectedColor = color;
  document.querySelectorAll(".color-opt").forEach((opt) => opt.classList.remove("active"));
  el.classList.add("active");
}

function fireConfetti() {
  if (typeof confetti === "function") {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
}

window.addEventListener("load", () => {
  lanzarConfettiPantallaCompleta();
  cargarPublicacionesGuardadas();
});

// -------------------------------------------------------------
// Cargar publicaciones YA APROBADAS desde el backend (Drive/Sheets)
// CORREGIDO: Apps Script no permite leer su respuesta con fetch() desde
// otro origen (bloqueo de CORS sin solución oficial). Se usa JSONP en su
// lugar: una etiqueta <script> no está sujeta a esa restricción.
// -------------------------------------------------------------
function cargarPublicacionesGuardadas() {
  const nombreCallback = "jsonpMuro_" + Date.now();

  window[nombreCallback] = function (datos) {
    delete window[nombreCallback];
    scriptTag.remove();
    if (datos.result !== "success" || !datos.posts) return;
    pintarPublicaciones(datos.posts);
  };

  const scriptTag = document.createElement("script");
  scriptTag.src = SCRIPT_URL + "?callback=" + nombreCallback;
  scriptTag.onerror = function () {
    console.error("No se pudieron cargar las publicaciones guardadas (fallo de red o URL incorrecta).");
    delete window[nombreCallback];
  };
  document.body.appendChild(scriptTag);
}

function pintarPublicaciones(posts) {
  try {
    const wallGrid = document.getElementById("wallGrid");

    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "card-post";
      card.style.backgroundColor = post.color || "#E8F1F9";

      // El backend manda el contenido incrustado (data URI) para cualquier
      // publicación que tenga un archivo asociado: foto, video o audio.
      const esVideo = post.tipo === "video";
      const esAudio = post.tipo === "audio";
      const esFoto = post.tipo === "tarjeta" && !!post.mediaBase64;

      let mediaHTML = "";
      if (esVideo) {
        mediaHTML = post.mediaBase64
          ? `<div class="post-media"><video src="${post.mediaBase64}" controls></video></div>`
          : `<p style="font-size:0.8rem;color:#999;">(No se pudo cargar el video)</p>`;
      } else if (esAudio) {
        mediaHTML = post.mediaBase64
          ? `<audio controls style="width:100%;margin-top:8px;margin-bottom:12px;"><source src="${post.mediaBase64}"></audio>`
          : `<p style="font-size:0.8rem;color:#999;">(No se pudo cargar el audio)</p>`;
      } else if (esFoto) {
        mediaHTML = `<div class="post-media"><img src="${post.mediaBase64}" alt="Foto"></div>`;
      }

      card.innerHTML = `
        <div>
            <div class="post-header">
                <div class="post-author">
                    <h4>${escapeHTML(post.autor || "Anónimo")}</h4>
                </div>
                <span class="post-time">${formatearFecha(post.fecha)}</span>
            </div>
            <p class="post-content">${escapeHTML(post.mensaje || "")}</p>
            ${mediaHTML}
        </div>
        <div class="post-actions">
            <button class="react-btn">❤️ 0</button>
            <button class="react-btn">👏 0</button>
        </div>
      `;
      wallGrid.appendChild(card);
    });
  } catch (err) {
    console.error("No se pudieron cargar las publicaciones guardadas:", err);
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  const fecha = new Date(fechaStr);
  if (isNaN(fecha)) return "";
  return fecha.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function lanzarConfettiPantallaCompleta() {
  if (typeof confetti !== "function") return;
  const duracion = 3 * 1000;
  const fin = Date.now() + duracion;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 80, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 4, angle: 120, spread: 80, origin: { x: 1, y: 0.7 } });
    if (Date.now() < fin) requestAnimationFrame(frame);
  })();
}

function deletePost(button) {
  // NOTA: esto solo oculta la tarjeta en TU pantalla. No borra nada de Drive/Sheets.
  // Para borrar de verdad, hacelo desde la hoja de cálculo (o poné estado "rechazado").
  if (confirm("¿Ocultar esta publicación de tu pantalla? (no se borra de Drive)")) {
    const card = button.closest(".card-post");
    card.classList.add("deleting");
    setTimeout(() => card.remove(), 250);
  }
}

// -------------------------------------------------------------
// Convierte un File/Blob a base64 (para video/audio)
// -------------------------------------------------------------
function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// -------------------------------------------------------------
// Convierte la tarjeta (texto + foto + color) en una sola imagen PNG.
// Se usa SOLO como respaldo/diseño para guardar en Drive; la web nunca
// muestra esta imagen, siempre arma la tarjeta con texto real + foto real.
// -------------------------------------------------------------
async function capturarTarjetaComoPNG(cardElement) {
  const btnBorrar = cardElement.querySelector(".btn-delete");
  const postActions = cardElement.querySelector(".post-actions");
  if (btnBorrar) btnBorrar.style.visibility = "hidden";
  if (postActions) postActions.style.visibility = "hidden";

  try {
    const canvas = await html2canvas(cardElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: selectedColor || "#FFFFFF",
      ignoreElements: (el) => el.tagName === "CANVAS",
    });
    return canvas.toDataURL("image/png");
  } finally {
    if (btnBorrar) btnBorrar.style.visibility = "visible";
    if (postActions) postActions.style.visibility = "visible";
  }
}

// -------------------------------------------------------------
// Envía el payload al backend.
// NOTA: Apps Script no permite leer su respuesta desde otro origen
// (mismo problema de CORS que en cargarPublicacionesGuardadas), así que
// acá usamos mode:"no-cors": el envío SÍ llega y Apps Script SÍ guarda
// y valida todo del lado del servidor, pero el navegador no puede leer
// si fue aceptado o rechazado. Por eso el mensaje al usuario es
// "quedó pendiente de revisión" en vez de una confirmación exacta —
// revisá siempre la columna "estado" en tu Google Sheet para saber
// qué pasó realmente con cada publicación.
// -------------------------------------------------------------
async function enviarAlBackend(payload) {
  await fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  // Con no-cors no hay forma de leer la respuesta real; asumimos que
  // llegó y quedó pendiente de revisión en la hoja.
  return { result: "enviado" };
}

// -------------------------------------------------------------
// EVENTO SUBMIT DEL FORMULARIO
// CORREGIDO: ya no decide qué adjuntar según "la última pestaña que
// tocaste" (eso era lo que perdía la foto si volvías a leer el texto).
// Ahora revisa directamente qué contenido cargaste de verdad.
// -------------------------------------------------------------
document.getElementById("wishesForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("senderName").value.trim();
  const rel = document.getElementById("relationship").value;
  const message = document.getElementById("messageText").value.trim();

  const photoInput = document.getElementById("photoInput");
  const videoInput = document.getElementById("videoInput");
  const audioFileInput = document.getElementById("audioFileInput");

  const tieneFoto = photoInput && photoInput.files.length > 0;
  const tieneVideo = videoInput && videoInput.files.length > 0;
  const tieneAudioGrabado = !!recordedAudioBlob;
  const tieneAudioArchivo = audioFileInput && audioFileInput.files.length > 0;

  if (!name) {
    alert("Por favor, ingresa tu nombre.");
    return;
  }
  if (!message && !tieneFoto && !tieneVideo && !tieneAudioGrabado && !tieneAudioArchivo) {
    alert("Escribe un mensaje o adjunta una foto, un audio o un video.");
    return;
  }
  if (tieneVideo && videoInput.files[0].size > LIMITE_VIDEO_MB * 1024 * 1024) {
    alert(`El video supera los ${LIMITE_VIDEO_MB}MB permitidos.`);
    return;
  }
  if (tieneAudioArchivo && audioFileInput.files[0].size > LIMITE_AUDIO_MB * 1024 * 1024) {
    alert(`El audio supera los ${LIMITE_AUDIO_MB}MB permitidos.`);
    return;
  }

  const submitBtn = document.querySelector(".btn-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Publicando...";

  let mediaHTML = "";
  let payload = null;

  try {
    if (tieneVideo) {
      const file = videoInput.files[0];
      const base64 = await archivoABase64(file);
      mediaHTML = `<div class="post-media"><video src="${URL.createObjectURL(file)}" controls></video></div>`;
      payload = { tipo: "video", archivoBase64: base64, mimeType: file.type, extension: (file.name.split(".").pop() || "mp4") };
    } else if (tieneAudioGrabado || tieneAudioArchivo) {
      let file, mimeType, extension, audioUrl;
      if (tieneAudioGrabado) {
        file = recordedAudioBlob;
        mimeType = "audio/webm";
        extension = "webm";
      } else {
        file = audioFileInput.files[0];
        mimeType = file.type || "audio/mpeg";
        extension = file.name.split(".").pop() || "mp3";
      }
      audioUrl = URL.createObjectURL(file);
      const base64 = await archivoABase64(file);
      mediaHTML = `<audio controls style="width:100%;margin-top:8px;margin-bottom:12px;"><source src="${audioUrl}" type="${mimeType}"></audio>`;
      payload = { tipo: "audio", archivoBase64: base64, mimeType, extension };
    } else if (tieneFoto) {
      const file = photoInput.files[0];
      mediaHTML = `<div class="post-media"><img src="${URL.createObjectURL(file)}" alt="Foto"></div>`;
      const base64 = await archivoABase64(file);
      payload = {
        tipo: "tarjeta",
        archivoBase64: base64,
        mimeType: file.type || "image/png",
        extension: (file.name.split(".").pop() || "png"),
      };
    }

    const card = document.createElement("div");
    card.className = "card-post";
    card.style.backgroundColor = selectedColor;
    card.setAttribute("data-owner-id", userId);
    card.innerHTML = `
      <div>
          <div class="post-header">
              <div class="post-author">
                  <h4>${escapeHTML(name)}</h4>
                  <span>${escapeHTML(rel)}</span>
              </div>
              <button class="btn-delete" onclick="deletePost(this)">🗑️ Ocultar</button>
          </div>
          <p class="post-content">${escapeHTML(message)}</p>
          ${mediaHTML}
      </div>
      <div class="post-actions">
          <button class="react-btn">❤️ 1</button>
          <button class="react-btn">👏 1</button>
      </div>
    `;
    document.getElementById("wallGrid").prepend(card);
    fireConfetti();

    // Si no hay video, audio ni foto, la publicación es solo texto
    if (!payload) {
      payload = { tipo: "tarjeta" };
    }

    payload.autor = name;
    payload.relacion = rel;
    payload.mensaje = message;
    payload.color = selectedColor;

    // Además del contenido real (texto/foto) que se usa para mostrar la
    // tarjeta en la web, generamos una captura "estilo Canva" de toda la
    // tarjeta (texto + foto + color) SOLO para guardarla como respaldo en
    // Drive. Esta imagen nunca se vuelve a mostrar en la web.
    if (payload.tipo === "tarjeta") {
      try {
        payload.disenioBase64 = await capturarTarjetaComoPNG(card);
      } catch (err) {
        console.warn("No se pudo generar la imagen de respaldo para Drive:", err);
      }
    }

    await enviarAlBackend(payload);

    // No podemos leer si Apps Script aceptó o rechazó la publicación
    // (limitación de CORS explicada arriba), así que mostramos un aviso
    // honesto: se envió, y quedará pendiente de revisión en la hoja.
    const badge = document.createElement("div");
    badge.style.cssText = "font-size:0.7rem;margin-top:8px;padding:4px 10px;border-radius:10px;display:inline-block;background:#FFF3CD;color:#856404;";
    badge.textContent = "⏳ Enviado, pendiente de revisión";
    card.querySelector("div").appendChild(badge);
  } catch (err) {
    console.error("Error al publicar:", err);
    alert("No se pudo conectar con el servidor. Intenta de nuevo.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 Publicar Felicitación";

    document.getElementById("wishesForm").reset();
    recordedAudioBlob = null;
    switchTab("texto");

    const audioPreview = document.getElementById("audioPreview");
    if (audioPreview) audioPreview.style.display = "none";
    const recTimer = document.getElementById("recTimer");
    if (recTimer) recTimer.style.display = "none";
    const recStatusText = document.getElementById("recStatusText");
    if (recStatusText) recStatusText.textContent = "Haz clic para empezar a grabar tu mensaje de voz";
    const btnMicText = document.getElementById("btnMicText");
    if (btnMicText) btnMicText.textContent = "Iniciar Grabación";
  }
});

// Auxiliar para evitar inyección de HTML
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[tag] || tag));
}