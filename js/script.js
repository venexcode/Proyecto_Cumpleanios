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

function switchTab(tab) {
  activeTab = tab;
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
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
});

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