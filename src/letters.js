const letterReactionOptions = [
  ["❤️", "Me encanta"],
  ["🥹", "Me emocionó"],
  ["😍", "Me enamora"],
  ["🥰", "Me dio ternura"],
  ["🤗", "Un abrazo"],
  ["🙏", "Gracias"],
  ["😘", "Un beso"],
  ["💘", "Me conquistó"],
  ["😭", "Me hizo llorar"],
  ["❤️‍🔥", "Me apasiona"],
  ["💓", "Me aceleró el corazón"],
];

function renderLetterReactions(letterId) {
  const reactions = advCache.letterReactions.filter(
    (item) => item.letter_id === letterId && item.emoji,
  );
  const mine = reactions.find((item) => item.user_id === user.id)?.emoji;
  return (
    `<details class="letterReactionPicker"><summary class="btn">${esc(mine || "☺")} Reacciones${reactions.length ? ` · ${reactions.length}` : ""}</summary>` +
    '<div class="advActions letterReactions" role="group" aria-label="Reacciones a la carta">' +
    letterReactionOptions
      .map(([emoji, label], index) => {
        const count = reactions.filter((item) => item.emoji === emoji).length;
        return `<button type="button" class="btn${mine === emoji ? " primary" : ""}" aria-pressed="${mine === emoji}" aria-label="${label} · ${count}" onclick="saveLetterReaction('${letterId}', ${index}, this)">${emoji} ${count || ""}</button>`;
      })
      .join("") +
    "</div></details>"
  );
}

async function saveLetterReaction(letterId, index, button) {
  const letter = advCache.letters.find((item) => item.id === letterId);
  const emoji = letterReactionOptions[index]?.[0];
  if (
    !letter ||
    !emoji ||
    (letter.unlock_at && new Date(letter.unlock_at) > new Date())
  )
    return;
  const mine = advCache.letterReactions.find(
    (item) => item.letter_id === letterId && item.user_id === user.id,
  );
  const group = button.closest(".letterReactions");
  const buttons = [...group.querySelectorAll("button")];
  buttons.forEach((item) => {
    item.disabled = true;
  });
  try {
    const { error } = await sb.rpc("set_letter_reaction", {
      p_letter_id: letterId,
      p_emoji: mine?.emoji === emoji ? null : emoji,
    });
    if (error) throw error;
    await advLoadAll(["letterReactions"]);
  } catch {
    appAlert("No pudimos guardar la reacción. Inténtalo de nuevo.");
  } finally {
    buttons.forEach((item) => {
      item.disabled = false;
    });
  }
}

function letterCountdown(date) {
  const minutes = Math.ceil((new Date(date) - Date.now()) / 60000);
  if (minutes <= 0) return "Disponible";
  if (minutes >= 1440)
    return (
      "Faltan " +
      Math.floor(minutes / 1440) +
      " d " +
      Math.floor((minutes % 1440) / 60) +
      " h"
    );
  if (minutes >= 60)
    return (
      "Faltan " + Math.floor(minutes / 60) + " h " + (minutes % 60) + " min"
    );
  return "Faltan " + minutes + " min";
}

function renderAdvLetters() {
  return (
    advHeader(
      "Cartas para nosotros",
      "Escribe hoy algo que quizá quieras que el otro lea mañana.",
      "💌 Nueva carta",
      "openLetterForm()",
    ) +
    '<div class="advCard"><h3>⏳ Cápsulas del tiempo</h3><p>Guarden un mensaje para abrir juntos en una fecha especial.</p><button class="btn" onclick="showAdvancedTab(\'capsulas\')">Ver cápsulas</button></div>' +
    `<div class="advList">${
      advCache.letters.length
        ? advCache.letters
            .map((x) => {
              const scheduled =
                x.unlock_at && new Date(x.unlock_at) > new Date();
              const locked = !!x.is_locked;
              const pendingForRecipient = scheduled && x.created_by !== user.id;
              return `<div class="advItem letterItem" data-advanced-id="${x.id}"><div class="letterContent"><div class="advItemTitle">${locked ? "🔒 " : scheduled ? "🕒 " : "💌 "}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""} · ${scheduled ? "Se desbloquea " + new Date(x.unlock_at).toLocaleString("es-CO") + " · " + letterCountdown(x.unlock_at) : "Disponible"} · ${locked ? "Carta protegida" : "Sin bloqueo"}</div>${scheduled ? "<p>Esta carta está guardada para el futuro. ❤️</p>" : `<div class="letterPaper letterPaper-${letterPaperName(x.paper)}">${x.content_html ? cleanLetterMarkup(x.content_html) : esc(x.content).replace(/\r?\n/g, "<br>")}</div>${x.audio_path ? `<button type="button" class="btn letterAudioButton" onclick="playLetterAudio('${x.id}',this)">♫ Escuchar audio</button>` : ""}`}${scheduled ? "" : renderLetterReactions(x.id)}</div><div class="advActions letterActions">${pendingForRecipient ? "<span>Disponible en la fecha indicada ❤️</span>" : `${!scheduled && x.opened_at ? "✓ Leída" : ""}<button type="button" class="btn" ${locked ? 'disabled title="Desbloquea la carta para editarla"' : ""} onclick="openAdvancedEdit('letters','${x.id}')">✏️ Editar</button><button type="button" class="btn" onclick="toggleLetterLock('${x.id}')">${locked ? "🔓 Desbloquear" : "🔒 Bloquear"}</button><button type="button" class="btn danger" ${locked ? 'disabled title="Desbloquea la carta para poder eliminarla" aria-label="Eliminar carta bloqueada"' : ""} onclick="deleteAdvanced('letters','${x.id}')">🗑️ Eliminar</button>`}</div></div>`;
            })
            .join("")
        : `<div class="advEmpty">💌 Escriban su primera carta. Puede ser para hoy, para un aniversario o para un día difícil.</div>`
    }</div>`
  );
}

function openLetterForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva carta 💌",
    formShell(
      input("title", "Título") +
        select("category", "Tipo", [
          ["libre", "Para cualquier día"],
          ["triste", "Para cuando estés triste"],
          ["extraño", "Para cuando me extrañes"],
          ["feliz", "Para cuando estés feliz"],
          ["aniversario", "Para nuestro aniversario"],
          ["futuro", "Para el futuro"],
        ]) +
        letterEditorHtml() +
        input("unlock_at", "Desbloquear el", "datetime-local") +
        '<label><input id="adv_notify_on_unlock" type="checkbox"> Avisar a mi pareja al abrirse la carta</label>',
      `saveLetter()`,
    ),
  );
  bindLetterEditor(
    isEdit
      ? advCache.letters.find((letter) => letter.id === advancedEditState.id)
      : null,
  );
}

async function saveLetter() {
  if (advancedEditState.key === "letters" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim(),
    draft = letterDraft();
  if (!title || !draft.content)
    return appAlert("Completa el título y la carta ❤️");
  let audio;
  try {
    audio = await uploadLetterAudio();
  } catch (error) {
    return appAlert(error.message);
  }
  const unlock = $("adv_unlock_at").value;
  const { data: created, error } = await sb
    .from("love_letters")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      ...draft,
      audio_path: audio.audio_path,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      notify_on_unlock: !!unlock && $("adv_notify_on_unlock").checked,
      unlock_at: unlock ? new Date(unlock).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) {
    await removeLetterAudio(audio.uploaded);
    return appAlert(error.message);
  }
  await createPartnerNotification({
    event_type: "letter_created",
    title: "Nueva carta 💌",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " escribió la carta «" +
      title +
      "».",
    target_tab: "letters",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

async function toggleLetterLock(id) {
  const letter = advCache.letters.find((x) => x.id === id);
  if (!letter) return appAlert("No encontramos esta carta.");
  const nextLocked = !letter.is_locked;
  const prompt = nextLocked
    ? "¿Bloquear esta carta para evitar que se elimine por accidente?"
    : "¿Desbloquear esta carta? Al desbloquearla podrás eliminarla.";
  if (!(await appConfirm(prompt))) return;
  return withTransactionIndicator(async () => {
    const { error } = await sb
      .from("love_letters")
      .update({ is_locked: nextLocked })
      .eq("id", id);
    if (error)
      return appAlert(
        "No se pudo " +
          (nextLocked ? "bloquear" : "desbloquear") +
          " la carta: " +
          error.message,
      );
    await createPartnerNotification({
      event_type: "letter_lock_changed",
      title: nextLocked ? "Carta protegida 🔒" : "Carta desbloqueada 💌",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        (nextLocked ? " bloqueó" : " desbloqueó") +
        " la carta «" +
        letter.title +
        "».",
      target_tab: "letters",
      target_id: id,
    });
    await advLoadAll();
  })();
}

const letterPapers = [
  ["classic", "Papel clásico"],
  ["rose", "Rosa romántica"],
  ["lavender", "Lavanda"],
  ["sea", "Azul océano"],
  ["gold", "Dorado cálido"],
  ["night", "Noche estrellada"],
  ["sakura", "Jardín de cerezos"],
  ["forest", "Bosque de helechos"],
  ["sunset", "Atardecer coral"],
  ["moon", "Luna y constelaciones"],
  ["ocean", "Mar de medianoche"],
  ["daisy", "Margaritas de verano"],
];
const letterFonts = [
  "Georgia",
  "Arial",
  "Verdana",
  "Times New Roman",
  "Courier New",
  "Pacifico",
  "Dancing Script",
  "Caveat",
  "Great Vibes",
  "Kalam",
  "Sacramento",
];
const supportedLetterFonts = [...letterFonts, "cursive"];
const letterMarkupTags = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "BR",
  "P",
  "DIV",
  "SPAN",
  "FONT",
]);

// Rebuild supported formatting in an inert template. Never copy executable attributes or URLs.
function cleanLetterMarkup(html) {
  const source = document.createElement("template");
  source.innerHTML = html;
  const output = document.createElement("div");
  const copy = (node, parent) => {
    if (node.nodeType === 3)
      return parent.append(document.createTextNode(node.textContent));
    if (
      node.nodeType !== 1 ||
      [
        "SCRIPT",
        "STYLE",
        "IFRAME",
        "OBJECT",
        "SVG",
        "MATH",
        "TEMPLATE",
      ].includes(node.tagName)
    )
      return;
    const bold = ["bold", "700", "800", "900"].includes(node.style?.fontWeight);
    const italic = ["italic", "oblique"].includes(node.style?.fontStyle);
    const suppliedFont = (
      node.style?.fontFamily ||
      node.getAttribute("face") ||
      ""
    )
      .split(",")[0]
      .replace(/['"]/g, "")
      .trim()
      .toLowerCase();
    const font = supportedLetterFonts.find(
      (value) => value.toLowerCase() === suppliedFont,
    );
    const tag = node.tagName === "FONT" ? "SPAN" : node.tagName;
    const element = letterMarkupTags.has(node.tagName)
      ? document.createElement(tag)
      : parent;
    if (element !== parent) {
      if (bold) element.style.fontWeight = "bold";
      else if (["normal", "400"].includes(node.style?.fontWeight))
        element.style.fontWeight = "normal";
      if (italic) element.style.fontStyle = "italic";
      else if (node.style?.fontStyle === "normal")
        element.style.fontStyle = "normal";
      if (font) element.style.fontFamily = font;
      parent.append(element);
    }
    for (const child of node.childNodes) copy(child, element);
  };
  for (const node of source.content.childNodes) copy(node, output);
  return output.innerHTML;
}

function letterPaperName(paper) {
  return letterPapers.some(([value]) => value === paper) ? paper : "classic";
}

function letterEditorHtml() {
  return (
    select("paper", "Fondo de la carta", letterPapers) +
    '<div class="advActions letterEditorTools" role="group" aria-label="Formato de carta"><button class="btn" type="button" data-command="bold"><b>Negrita</b></button><button class="btn" type="button" data-command="italic"><i>Cursiva</i></button><label>Tipo de letra <select id="letterFont">' +
    letterFonts
      .map((font) => `<option value="${esc(font)}">${esc(font)}</option>`)
      .join("") +
    '</select></label><label>Al pegar <select id="letterPaste"><option value="original">Conservar formato del origen</option><option value="destination">Usar formato de la carta</option></select></label></div>' +
    '<div id="letterEditor" class="letterPaper letterPaper-classic" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texto de la carta"></div>' +
    '<label>Audio opcional (hasta 30 segundos y 5 MB)<input type="file" id="letterAudio" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,.m4a"></label><label id="letterRemoveAudio" hidden><input type="checkbox" id="removeLetterAudio"> Quitar el audio actual</label>'
  );
}

function bindLetterEditor(letter) {
  const editor = $("letterEditor");
  const paper = $("adv_paper");
  editor.innerHTML = letter?.content_html
    ? cleanLetterMarkup(letter.content_html)
    : esc(letter?.content || "").replace(/\r?\n/g, "<br>");
  $("letterRemoveAudio").hidden = !letter?.audio_path;
  paper.value = letterPaperName(letter?.paper);
  const updatePaper = () => {
    editor.className = "letterPaper letterPaper-" + paper.value;
  };
  paper.onchange = updatePaper;
  updatePaper();
  const fontControl = $("letterFont");
  let selection;
  let typingFont;
  let typingBold = false;
  let typingItalic = false;
  const currentFont = () => {
    const value = String(document.queryCommandValue("fontName") || "")
      .split(",")[0]
      .replace(/['"]/g, "")
      .trim()
      .toLowerCase();
    return supportedLetterFonts.find((font) => font.toLowerCase() === value);
  };
  const remember = () => {
    const current = window.getSelection();
    if (
      current?.rangeCount &&
      editor.contains(current.anchorNode) &&
      editor.contains(current.focusNode)
    ) {
      selection = current.getRangeAt(0).cloneRange();
    }
  };
  const trackCaret = () => {
    remember();
    typingFont = currentFont();
    typingBold = document.queryCommandState("bold");
    typingItalic = document.queryCommandState("italic");
    if (typingFont) fontControl.value = typingFont;
  };
  editor.addEventListener("blur", remember);
  editor.addEventListener("pointerup", trackCaret);
  editor.addEventListener("keyup", trackCaret);
  editor.addEventListener("input", remember);
  const format = (command, value) => {
    if (document.activeElement === editor) remember();
    editor.focus({ preventScroll: true });
    const current = window.getSelection();
    if (!selection || !editor.contains(selection.commonAncestorContainer)) {
      selection = document.createRange();
      selection.selectNodeContents(editor);
      selection.collapse(false);
    }
    current.removeAllRanges();
    current.addRange(selection);
    document.execCommand("styleWithCSS", false, true);
    if (current.isCollapsed) {
      if (command === "fontName") typingFont = value;
      if (command === "bold") typingBold = !typingBold;
      if (command === "italic") typingItalic = !typingItalic;
      if (typingFont && currentFont() !== typingFont) {
        document.execCommand("fontName", false, typingFont);
      }
      if (document.queryCommandState("bold") !== typingBold) {
        document.execCommand("bold", false);
      }
      if (document.queryCommandState("italic") !== typingItalic) {
        document.execCommand("italic", false);
      }
    } else {
      document.execCommand(command, false, value);
    }
    remember();
  };
  for (const button of editor.previousElementSibling.querySelectorAll(
    "[data-command]",
  )) {
    button.onmousedown = (event) => {
      remember();
      event.preventDefault();
    };
    button.onclick = () => format(button.dataset.command);
  }
  fontControl.onchange = (event) => format("fontName", event.target.value);
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    const html = event.clipboardData?.getData("text/html");
    if ($("letterPaste").value === "original" && html)
      document.execCommand("insertHTML", false, cleanLetterMarkup(html));
    else
      document.execCommand(
        "insertText",
        false,
        event.clipboardData?.getData("text/plain") || "",
      );
    remember();
  });
}

function letterDraft() {
  const editor = $("letterEditor");
  return {
    content: (editor.innerText ?? editor.textContent).trim(),
    content_html: cleanLetterMarkup(editor.innerHTML),
    paper: letterPaperName($("adv_paper").value),
  };
}

async function uploadLetterAudio(letter) {
  const file = $("letterAudio").files?.[0];
  if (!file)
    return {
      audio_path: $("removeLetterAudio").checked
        ? null
        : letter?.audio_path || null,
    };
  if (file.size > 5 * 1024 * 1024)
    throw new Error("El audio debe pesar hasta 5 MB.");
  const mime = file.type || (/\.m4a$/i.test(file.name) ? "audio/mp4" : "");
  const audio = document.createElement("audio");
  const source = URL.createObjectURL(file);
  try {
    const duration = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("No pudimos leer el audio.")),
        5000,
      );
      audio.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("El formato de audio no es compatible."));
      };
      audio.preload = "metadata";
      audio.src = source;
    });
    if (!Number.isFinite(duration) || duration <= 0 || duration > 30.15)
      throw new Error("Selecciona un fragmento de hasta 30 segundos.");
  } finally {
    audio.removeAttribute("src");
    URL.revokeObjectURL(source);
  }
  const path = user.id + "/" + crypto.randomUUID();
  const { error } = await sb.storage
    .from("letter-audio")
    .upload(path, file, { contentType: mime });
  if (error) throw new Error("No pudimos subir el audio.");
  return { audio_path: path, uploaded: path };
}

async function removeLetterAudio(path) {
  if (path?.startsWith(user.id + "/"))
    await sb.storage.from("letter-audio").remove([path]);
}

async function playLetterAudio(letterId, button) {
  const letter = advCache.letters.find((item) => item.id === letterId);
  if (
    !letter?.audio_path ||
    (letter.unlock_at && new Date(letter.unlock_at) > new Date())
  )
    return;
  button.disabled = true;
  const { data, error } = await sb.storage
    .from("letter-audio")
    .createSignedUrl(letter.audio_path, 300);
  if (error || !data?.signedUrl) {
    button.disabled = false;
    return appAlert("No pudimos abrir el audio de la carta.");
  }
  if (!button.isConnected) return;
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = data.signedUrl;
  button.replaceWith(audio);
}
