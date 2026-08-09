function onInvictoReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
    return;
  }

  fn();
}

onInvictoReady(() => {
  const invictoIcon = document.getElementById("invicto-icon");
  const popupInvicto = document.getElementById("popup-invicto");
  const closePopupInvicto = document.getElementById("close-popup-invicto");

  if (!invictoIcon || !popupInvicto) return;

  const openPopup = () => {
    popupInvicto.classList.add("show");
  };

  const closePopup = () => {
    popupInvicto.classList.remove("show");
  };

  invictoIcon.addEventListener("click", openPopup);
  closePopupInvicto?.addEventListener("click", closePopup);

  popupInvicto.addEventListener("click", (event) => {
    if (event.target === popupInvicto) {
      closePopup();
    }
  });
});
