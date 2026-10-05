const els = Object.fromEntries([
  "mode-badge", "assessment-title", "assessment-instructions", "rubric", "setup", "draft", "word-count", "char-count", "setup-error", "start",
  "chat-section", "draft-preview", "edit-draft", "criteria-mini", "turn-count", "messages", "chat-error", "chat-form", "chat-input", "send", "download", "new-chat"
].map((id) => [id, document.getElementById(id)]));

let config;
let draft = "";
let messages = [];
let downloadUrl;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const countWords = (value) => value.trim() ? value.trim().split(/\s+/).length : 0;

async function initialise() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error();
  config = await response.json();
  els["assessment-title"].textContent = config.assessment.title;
  els["assessment-instructions"].textContent = config.assessment.instructions;
  els.rubric.innerHTML = config.assessment.rubric.map((item) => `<article><div><strong>${escapeHtml(item.label)}</strong><span>${item.weight} %</span></div><p>${escapeHtml(item.description)}</p></article>`).join("");
  els["criteria-mini"].innerHTML = config.assessment.rubric.map((item) => `<li>${escapeHtml(item.label)}</li>`).join("");
  els["mode-badge"].textContent = config.provider === "mock" ? "Mode démonstration" : "IA activée";
  els["char-count"].textContent = `Minimum ${config.limits.minDraftChars} caractères`;
}

function updateDraftState() {
  const value = els.draft.value;
  const words = countWords(value);
  els["word-count"].textContent = `${words} mot${words > 1 ? "s" : ""}`;
  const trimmedLength = value.trim().length;
  els["char-count"].textContent = trimmedLength < config.limits.minDraftChars
    ? `${trimmedLength} / ${config.limits.minDraftChars} caractères minimum`
    : `${value.length.toLocaleString("fr-FR")} / ${config.limits.maxDraftChars.toLocaleString("fr-FR")} caractères`;
  els.start.disabled = trimmedLength < config.limits.minDraftChars || value.length > config.limits.maxDraftChars;
}

function updateComposerState() {
  const userTurns = messages.filter((item) => item.role === "user").length;
  const atLimit = userTurns >= config.limits.maxChatTurns;
  els["turn-count"].textContent = `${userTurns}/${config.limits.maxChatTurns} question${config.limits.maxChatTurns > 1 ? "s" : ""}`;
  els["chat-input"].disabled = atLimit;
  els["chat-input"].placeholder = atLimit ? "Nombre maximal de questions atteint" : "Posez une question sur le retour…";
  els.send.disabled = atLimit || !els["chat-input"].value.trim();
}

function addMessage(role, content, pending = false) {
  const article = document.createElement("article");
  article.className = `message ${role}${pending ? " pending" : ""}`;
  article.innerHTML = `<div class="avatar">${role === "assistant" ? "F" : "V"}</div><div><p class="speaker">${role === "assistant" ? "Coach" : "Vous"}</p><div class="bubble"></div></div>`;
  article.querySelector(".bubble").textContent = content;
  els.messages.appendChild(article);
  article.scrollIntoView({ behavior: "smooth", block: "end" });
  return article;
}

async function requestReply() {
  els["chat-error"].hidden = true;
  els.send.disabled = true;
  const pending = addMessage("assistant", "Analyse en cours…", true);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, messages })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible de générer le retour.");
    pending.remove();
    messages.push({ role: "assistant", content: result.message });
    addMessage("assistant", result.message);
    refreshDownload();
  } catch (error) {
    pending.remove();
    els["chat-error"].textContent = error.message;
    els["chat-error"].hidden = false;
  } finally {
    updateComposerState();
  }
}

function refreshDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  const conversation = messages.map((item) => `${item.role === "assistant" ? "COACH" : "VOUS"}\n${item.content}`).join("\n\n");
  const content = `${config.assessment.title}\n\nVOTRE TRAVAIL\n${draft}\n\nCONVERSATION FORMATIVE\n${conversation}\n\nCe retour est automatique et ne constitue pas une note.\n`;
  downloadUrl = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  els.download.href = downloadUrl;
}

function reset() {
  messages = [];
  draft = "";
  els.draft.value = "";
  els.messages.replaceChildren();
  els["chat-input"].value = "";
  els["chat-section"].hidden = true;
  els.setup.hidden = false;
  els["setup-error"].hidden = true;
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = undefined;
  updateDraftState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

els.draft.addEventListener("input", updateDraftState);
els.start.addEventListener("click", async () => {
  draft = els.draft.value.trim();
  els.start.disabled = true;
  els.start.innerHTML = '<span class="spinner"></span> Préparation du retour…';
  els["setup-error"].hidden = true;
  try {
    els["draft-preview"].textContent = draft;
    els.setup.hidden = true;
    els["chat-section"].hidden = false;
    await requestReply();
  } finally {
    els.start.innerHTML = 'Commencer l’échange <span>→</span>';
    updateDraftState();
  }
});
els["chat-input"].addEventListener("input", updateComposerState);
els["chat-input"].addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!els.send.disabled) els["chat-form"].requestSubmit();
  }
});
els["chat-form"].addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = els["chat-input"].value.trim();
  if (!content) return;
  if (content.length > config.limits.maxMessageChars) {
    els["chat-error"].textContent = `Votre question dépasse ${config.limits.maxMessageChars.toLocaleString("fr-FR")} caractères.`;
    els["chat-error"].hidden = false;
    return;
  }
  messages.push({ role: "user", content });
  addMessage("user", content);
  els["chat-input"].value = "";
  updateComposerState();
  await requestReply();
});
els["new-chat"].addEventListener("click", reset);
els["edit-draft"].addEventListener("click", reset);

if (window.self !== window.top) document.documentElement.classList.add("embedded");
initialise().then(updateDraftState).catch(() => {
  els["setup-error"].textContent = "La configuration n’a pas pu être chargée.";
  els["setup-error"].hidden = false;
});
