// 1. URL de tu despliegue de Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwoiC2vropMCe7jmKPfbPv4e8lQmx4gy2ChYPjkIBIws2ddmFk1hai9b0BnkdGZWrxq/exec";

// Obtener o asignar un ID único de usuario para este navegador/dispositivo
let userId = localStorage.getItem("user_device_id");
if (!userId) {
  userId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("user_device_id", userId);
}

let activeTab = "none";
let activeAudioSubTab = "mic";
let selectedColor = "#E8F1F9";

let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;
let isRecording = false;
let recInterval;
let recSeconds = 0;

function switchTab(tab, evt) {
  activeTab = tab;
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // CORREGIDO: ahora recibe el evento como parámetro explícito (evt) en vez de
  // depender de la variable global "event", que no existe en todos los navegadores
  // ni en modo estricto ("use strict").
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  }
  const tabEl = document.getElementById("tab-" + tab);
  if (tabEl) tabEl.classList.add("active");
}

function toggleAudioSubTab(sub) {
  activeAudioSubTab = sub;
  document
    .getElementById("btnOptMic")
    .classList.toggle("active", sub === "mic");
  document
    .getElementById("btnOptFile")
    .classList.toggle("active", sub === "file");

  document.getElementById("subtab-mic").style.display =
    sub === "mic" ? "block" : "none";
  document.getElementById("subtab-file").style.display =
    sub === "file" ? "block" : "none";
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

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

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
      alert(
        "No se pudo acceder al micrófono. Verifica los permisos de tu navegador.",
      );
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
  document
    .querySelectorAll(".color-opt")
    .forEach((opt) => opt.classList.remove("active"));
  el.classList.add("active");
}

function fireConfetti() {
  if (typeof confetti === "function") {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
}

// Lanzar confeti en toda la pantalla al cargar o recargar la página
window.addEventListener("load", () => {
  lanzarConfettiPantallaCompleta();
  cargarPublicacionesGuardadas();
});

// -------------------------------------------------------------
// NUEVO: cargar las publicaciones ya guardadas en Google Sheets
// al abrir la página, para que no se "borren" al recargar.
// -------------------------------------------------------------
async function cargarPublicacionesGuardadas() {
  try {
    const respuesta = await fetch(SCRIPT_URL);
    const datos = await respuesta.json();

    if (datos.result !== "success" || !datos.posts) return;

    const wallGrid = document.getElementById("wallGrid");

    datos.posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "card-post";

      const tieneImagen =
        post.imagenUrl && post.imagenUrl !== "Sin imagen";

      card.innerHTML = `
        <div>
            <div class="post-header">
                <div class="post-author">
                    <h4>${escapeHTML(post.autor || "Anónimo")}</h4>
                </div>
                <span class="post-time">${formatearFecha(post.fecha)}</span>
            </div>
            <p class="post-content">${escapeHTML(post.mensaje || "")}</p>
            ${tieneImagen ? `<div class="post-media"><img src="${post.imagenUrl}" alt="Nota guardada"></div>` : ""}
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
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lanzarConfettiPantallaCompleta() {
  if (typeof confetti !== "function") return;
  const duracion = 3 * 1000; // Duración de 3 segundos
  const fin = Date.now() + duracion;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.7 },
    });

    confetti({
      particleCount: 4,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.7 },
    });

    if (Date.now() < fin) {
      requestAnimationFrame(frame);
    }
  })();
}

function deletePost(button) {
  if (
    confirm(
      "¿Quieres eliminar esta publicación? Solo tú puedes ver esta opción porque la creaste desde este dispositivo.",
    )
  ) {
    const card = button.closest(".card-post");
    card.classList.add("deleting");
    setTimeout(() => {
      card.remove();
    }, 250);
  }
}

// -------------------------------------------------------------
// FUNCIÓN PARA CAPTURAR LA TARJETA COMO PNG Y ENVIARLA A DRIVE
// -------------------------------------------------------------
async function respaldarTarjetaEnDrive(cardElement, autor, mensaje) {
  // Ocultar temporalmente los botones de interacción para la captura limpia
  const btnBorrar = cardElement.querySelector(".btn-delete");
  const postActions = cardElement.querySelector(".post-actions");

  if (btnBorrar) btnBorrar.style.visibility = "hidden";
  if (postActions) postActions.style.visibility = "hidden";

  try {
    // Renderizar la tarjeta como imagen PNG mediante html2canvas
    const canvas = await html2canvas(cardElement, {
      scale: 2,           // Alta calidad
      useCORS: true,      // Permite cargar recursos externos sin bloqueos
      backgroundColor: selectedColor || "#FFFFFF",
    });

    const tarjetaBase64 = canvas.toDataURL("image/png");

    // Enviar el payload a Google Apps Script
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autor: autor,
        mensaje: mensaje,
        tarjetaBase64: tarjetaBase64,
      }),
    });

    console.log("✅ Tarjeta guardada como PNG en Google Drive correctamente.");
  } catch (err) {
    console.error("Error al capturar la tarjeta:", err);
  } finally {
    // Restaurar visibilidad de los botones para el usuario
    if (btnBorrar) btnBorrar.style.visibility = "visible";
    if (postActions) postActions.style.visibility = "visible";
  }
}

// -------------------------------------------------------------
// EVENTO SUBMIT DEL FORMULARIO
// -------------------------------------------------------------
document.getElementById("wishesForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("senderName").value;
  const rel = document.getElementById("relationship").value;
  const message = document.getElementById("messageText").value;

  let mediaHTML = "";

  if (activeTab === "foto") {
    const photoInput = document.getElementById("photoInput");
    if (photoInput && photoInput.files.length > 0) {
      const imgUrl = URL.createObjectURL(photoInput.files[0]);
      mediaHTML = `<div class="post-media"><img src="${imgUrl}" alt="Foto"></div>`;
    }
  } else if (activeTab === "video") {
    const videoInput = document.getElementById("videoInput");
    if (videoInput && videoInput.files.length > 0) {
      const vidUrl = URL.createObjectURL(videoInput.files[0]);
      mediaHTML = `<div class="post-media"><video src="${vidUrl}" controls></video></div>`;
    }
  } else if (activeTab === "audio") {
    if (activeAudioSubTab === "mic" && recordedAudioBlob) {
      const audioUrl = URL.createObjectURL(recordedAudioBlob);
      mediaHTML = `<audio controls style="width: 100%; margin-top: 8px; margin-bottom: 12px;"><source src="${audioUrl}" type="audio/webm"></audio>`;
    } else {
      const audioFileInput = document.getElementById("audioFileInput");
      if (audioFileInput && audioFileInput.files.length > 0) {
        const fileUrl = URL.createObjectURL(audioFileInput.files[0]);
        mediaHTML = `<audio controls style="width: 100%; margin-top: 8px; margin-bottom: 12px;"><source src="${fileUrl}"></audio>`;
      }
    }
  }

  const card = document.createElement("div");
  card.className = "card-post";
  card.style.backgroundColor = selectedColor;
  card.setAttribute("data-owner-id", userId);

  // Construcción del contenido de la tarjeta
  card.innerHTML = `
    <div>
        <div class="post-header">
            <div class="post-author">
                <h4>${escapeHTML(name)}</h4>
                <span>${escapeHTML(rel)}</span>
            </div>
            <button class="btn-delete" onclick="deletePost(this)">🗑️ Eliminar</button>
        </div>
        <p class="post-content">${escapeHTML(message)}</p>
        ${mediaHTML}
    </div>
    <div class="post-actions">
        <button class="react-btn">❤️ 1</button>
        <button class="react-btn">👏 1</button>
    </div>
  `;

  // Renderizar la tarjeta en el muro
  document.getElementById("wallGrid").prepend(card);
  fireConfetti();

  // Convertir la tarjeta recién creada a PNG y enviarla a Drive
  respaldarTarjetaEnDrive(card, name, message);

  // Limpiar formulario e interfaz
  document.getElementById("wishesForm").reset();
  recordedAudioBlob = null;
  switchTab("none");
  
  const audioPreview = document.getElementById("audioPreview");
  if (audioPreview) audioPreview.style.display = "none";
  
  const recTimer = document.getElementById("recTimer");
  if (recTimer) recTimer.style.display = "none";

  const recStatusText = document.getElementById("recStatusText");
  if (recStatusText) recStatusText.textContent = "Haz clic para empezar a grabar tu mensaje de voz";

  const btnMicText = document.getElementById("btnMicText");
  if (btnMicText) btnMicText.textContent = "Iniciar Grabación";

  alert("¡Tu mensaje ha sido publicado!");
});

// Auxiliar para evitar inyección de HTML
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[tag] || tag)
  );
}

/* // -------------------------------------------------------------
// LÓGICA DEL PANEL DE ADMINISTRACIÓN
// -------------------------------------------------------------
let windowAdminPin = "";

function abrirModalAdmin() {
  document.getElementById("adminModal").style.display = "flex";
}

function cerrarModalAdmin() {
  document.getElementById("adminModal").style.display = "none";
  document.getElementById("adminPinInput").value = "";
}

function activarModoAdmin() {
  const pin = document.getElementById("adminPinInput").value;
  if (!pin) {
    alert("Por favor ingresa un PIN");
    return;
  }

  windowAdminPin = pin;

  // Activar y mostrar el botón de borrado de administrador en todas las tarjetas
  const cards = document.querySelectorAll(".card-post");
  cards.forEach((card) => {
    let btnDel = card.querySelector(".btn-admin-delete");
    if (!btnDel) {
      btnDel = document.createElement("button");
      btnDel.className = "btn-delete btn-admin-delete";
      btnDel.style.backgroundColor = "#dc3545";
      btnDel.style.color = "#ffffff";
      btnDel.style.marginLeft = "8px";
      btnDel.innerHTML = "🗑️ Borrar (Admin)";
      btnDel.onclick = () => eliminarComoAdmin(card);
      
      const header = card.querySelector(".post-header");
      if (header) header.appendChild(btnDel);
    }
    btnDel.style.display = "inline-block";
  });

  alert("🔓 Modo Administrador activado. Puedes borrar cualquier tarjeta del muro.");
  cerrarModalAdmin();
}

async function eliminarComoAdmin(cardElement) {
  if (!confirm("¿Seguro que deseas eliminar esta publicación permanentemente de la web, Sheets y Google Drive?")) {
    return;
  }

  const mensajeText = cardElement.querySelector(".post-content") ? cardElement.querySelector(".post-content").innerText : "";
  const imageUrl = cardElement.getAttribute("data-drive-url") || "";

  // Ocultar la tarjeta visualmente de inmediato
  cardElement.style.opacity = "0.3";

  try {
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        pin: windowAdminPin,
        mensaje: mensajeText,
        imageUrl: imageUrl
      })
    });

    // Eliminar la tarjeta del navegador
    setTimeout(() => {
      cardElement.remove();
      alert("✅ Publicación eliminada con éxito.");
    }, 500);

  } catch (err) {
    console.error("Error al borrar:", err);
    cardElement.style.opacity = "1";
    alert("Hubo un problema al intentar eliminar la nota.");
  }
} */