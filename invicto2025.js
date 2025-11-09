// === Popup da camisa Invicto ===
function popupInvicto() {
  const popup = document.getElementById("popup-invicto");
  popup.classList.add("show");
}

document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.getElementById("close-popup-invicto");
  const invictoIcon = document.getElementById("invicto-icon");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("popup-invicto").classList.remove("show");
    });
  }

  if (invictoIcon) {
    invictoIcon.addEventListener("click", popupInvicto);
  }
});

