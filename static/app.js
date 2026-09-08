"use strict";
const $ = (id) => document.getElementById(id);
const input = $("selfie-input");
const preview = $("preview");
const modal = $("photo-modal");
let selfie = null;
let previewUrl = null;

async function checkAvailability() {
  try {
    const response = await fetch('/api/health', {cache:'no-store'});
    if (!response.ok) throw new Error('unavailable');
    const status = await response.json();
    $('capture-button').disabled = !status.ready;
    $('availability').hidden = Boolean(status.ready);
    $('availability').textContent = status.ready ? '' : 'A busca ainda não está disponível. Tente novamente mais tarde.';
  } catch {
    $('capture-button').disabled = true;
    $('availability').hidden = false;
    $('availability').textContent = 'Não foi possível conectar ao serviço. Recarregue a página para tentar novamente.';
  }
}
checkAvailability();

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = false;
}

function clearSelfie() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  selfie = null;
  input.value = "";
  preview.removeAttribute("src");
  preview.hidden = true;
}

function reset() {
  clearSelfie();
  $("gallery").replaceChildren();
  $("results").hidden = true;
  $("capture-section").hidden = false;
  $("camera-icon").hidden = false;
  $("capture-button").hidden = false;
  $("search-button").hidden = true;
  $("change-button").hidden = true;
  $("error").hidden = true;
  $("capture-button").focus();
}

$("capture-button").addEventListener("click", () => input.click());
$("change-button").addEventListener("click", () => input.click());
input.addEventListener("change", () => {
  const file = input.files[0];
  if (!file) return;
  $("error").hidden = true;
  if (file.size > 8 * 1024 * 1024) {
    showError("A selfie deve ter até 8 MB.");
    input.value = "";
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  selfie = file;
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  $("camera-icon").hidden = true;
  $("capture-button").hidden = true;
  $("search-button").hidden = false;
  $("change-button").hidden = false;
});
preview.addEventListener("error", () => {
  // Remover src ao descartar a selfie pode disparar error; não apague resultados.
  if (!previewUrl || preview.hidden) return;
  reset();
  showError("Não foi possível abrir a selfie. Use JPG, PNG ou WebP; converta HEIC para JPG.");
});

function showResults(result) {
  $("gallery").replaceChildren();
  $("results-title").textContent = result.count === 0
    ? "Não encontramos nenhuma foto com confiança suficiente."
    : result.count === 1 ? "Encontramos 1 foto sua" : `Encontramos ${result.count} fotos suas`;
  $("empty-message").hidden = result.count !== 0;
  for (const [index, match] of result.matches.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Ampliar foto ${index + 1}`);
    const image = document.createElement("img");
    image.src = match.photo;
    image.alt = `Foto ${index + 1} do evento`;
    image.loading = "lazy";
    image.decoding = "async";
    button.append(image);
    button.addEventListener("click", () => {
      $("modal-image").src = match.photo;
      modal.showModal();
      document.body.classList.add("modal-open");
    });
    $("gallery").append(button);
  }
  clearSelfie();
  $("capture-section").hidden = true;
  $("results").hidden = false;
  $("results-title").focus();
}

$("search-button").addEventListener("click", async () => {
  if (!selfie) return;
  $("error").hidden = true;
  $("search-button").disabled = true;
  $("change-button").disabled = true;
  $("loading").hidden = false;
  $("capture-section").setAttribute("aria-busy", "true");
  const form = new FormData();
  form.append("file", selfie);
  try {
    const response = await fetch("/api/search", { method: "POST", body: form, cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "Não foi possível buscar suas fotos. Tente novamente.");
    if (!result || !Array.isArray(result.matches)) throw new Error("Resposta inválida. Tente novamente.");
    showResults(result);
  } catch (error) {
    showError(error instanceof TypeError ? "Falha de conexão. Verifique sua rede e tente novamente." : error.message);
  } finally {
    $("search-button").disabled = false;
    $("change-button").disabled = false;
    $("loading").hidden = true;
    $("capture-section").removeAttribute("aria-busy");
  }
});
$("reset-button").addEventListener("click", reset);
$("close-modal").addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  $("modal-image").removeAttribute("src");
});
