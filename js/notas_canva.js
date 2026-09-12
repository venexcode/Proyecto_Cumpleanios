// Función para convertir una tarjeta/nota de felicitación en una imagen PNG
function guardarNotaComoImagen(cardElementOrId) {
    // 1. Obtener la tarjeta DOM
    const card = typeof cardElementOrId === 'string' 
        ? document.getElementById(cardElementOrId) 
        : cardElementOrId;

    if (!card) return;

    // 2. Usar html2canvas para renderizar el recuadro con sus estilos
    html2canvas(card, {
        scale: 2, // Mayor resolución para la foto/nota
        useCORS: true, // Permite cargar fotos externas si las hay
        backgroundColor: null // Mantiene los bordes redondeados y fondos transparentes/estilizados
    }).then(canvas => {
        // 3. Convertir a imagen PNG
        const imageData = canvas.toDataURL("image/png");

        // 4. Crear un enlace de descarga automática
        const downloadLink = document.createElement("a");
        downloadLink.href = imageData;
        downloadLink.download = `Nota_Felicitacion_${Date.now()}.png`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
}

// Ejemplo de cuando se crea la tarjeta en el Muro:
function agregarNuevaTarjeta(autor, mensaje, fotoUrl = null) {
    const card = document.createElement("div");
    card.className = "card-post";
    card.style.background = "#FFFFFF"; // Garantizar fondo para el recuadro

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <h4>${autor}</h4>
                <span>Invitado</span>
            </div>
            <button class="btn-save-note" onclick="guardarNotaComoImagen(this.closest('.card-post'))">
                📷 Guardar Foto
            </button>
        </div>
        <div class="post-content">
            <p>${mensaje}</p>
        </div>
        ${fotoUrl ? `<div class="post-media"><img src="${fotoUrl}" alt="Adjunto"></div>` : ''}
    `;

    document.getElementById("masonryGrid").prepend(card);

    // Opcional: Convertir y descargar automáticamente justo al enviar
    guardarNotaComoImagen(card);
}