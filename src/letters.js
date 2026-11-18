const letterReactionOptions = [
  ["❤️", "Me encanta"],
  ["🥹", "Me emocionó"],
  ["😍", "Me enamora"],
  ["🥰", "Me dio ternura"],
  ["🤗", "Un abrazo"],
  ["🙏", "Gracias"],
];

function renderLetterReactions(letterId) {
  const reactions = advCache.letterReactions.filter(
    (item) => item.letter_id === letterId,
  );
  const mine = reactions.find((item) => item.user_id === user.id)?.emoji;
  return (
    '<div class="advActions letterReactions" role="group" aria-label="Reacciones a la carta">' +
    letterReactionOptions
      .map(([emoji, label], index) => {
        const count = reactions.filter((item) => item.emoji === emoji).length;
        return `<button type="button" class="btn${mine === emoji ? " primary" : ""}" aria-pressed="${mine === emoji}" aria-label="${label} · ${count}" onclick="saveLetterReaction('${letterId}', ${index}, this)">${emoji} ${count || ""}</button>`;
      })
      .join("") +
    "</div>"
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
    `<div class="advList">${
      advCache.letters.length
        ? advCache.letters
            .map((x) => {
              const scheduled =
                x.unlock_at && new Date(x.unlock_at) > new Date();
              const locked = !!x.is_locked;
              const pendingForRecipient = scheduled && x.created_by !== user.id;
              return `<div class="advItem letterItem" data-advanced-id="${x.id}"><div class="letterContent"><div class="advItemTitle">${locked ? "🔒 " : scheduled ? "🕒 " : "💌 "}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""} · ${scheduled ? "Se desbloquea " + new Date(x.unlock_at).toLocaleString("es-CO") + " · " + letterCountdown(x.unlock_at) : "Disponible"} · ${locked ? "Carta protegida" : "Sin bloqueo"}</div><p>${scheduled ? "Esta carta está guardada para el futuro. ❤️" : esc(x.content)}</p>${scheduled ? "" : renderLetterReactions(x.id)}</div><div class="advActions letterActions">${pendingForRecipient ? "<span>Disponible en la fecha indicada ❤️</span>" : `${!scheduled && x.opened_at ? "✓ Leída" : ""}<button type="button" class="btn" onclick="openAdvancedEdit('letters','${x.id}')">✏️ Editar</button><button type="button" class="btn" onclick="toggleLetterLock('${x.id}')">${locked ? "🔓 Desbloquear" : "🔒 Bloquear"}</button><button type="button" class="btn danger" ${locked ? 'disabled title="Desbloquea la carta para poder eliminarla" aria-label="Eliminar carta bloqueada"' : ""} onclick="deleteAdvanced('letters','${x.id}')">🗑️ Eliminar</button>`}</div></div>`;
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
        textarea("content", "Carta", "Escribe todo lo que quieras decir...") +
        input("unlock_at", "Desbloquear el", "datetime-local") +
        '<label><input id="adv_notify_on_unlock" type="checkbox"> Avisar a mi pareja al abrirse la carta</label>',
      `saveLetter()`,
    ),
  );
}

async function saveLetter() {
  if (advancedEditState.key === "letters" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim(),
    content = $("adv_content").value.trim();
  if (!title || !content) return appAlert("Completa el título y la carta ❤️");
  const unlock = $("adv_unlock_at").value;
  const { data: created, error } = await sb
    .from("love_letters")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      content,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      notify_on_unlock: !!unlock && $("adv_notify_on_unlock").checked,
      unlock_at: unlock ? new Date(unlock).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
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
