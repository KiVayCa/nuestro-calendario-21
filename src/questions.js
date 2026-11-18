function todayQuestion() {
  const today = countdownToday();
  const seed = Number(today.replaceAll("-", ""));
  return {
    date: today,
    text: dailyQuestionBank[seed % dailyQuestionBank.length],
  };
}

function dailyQuestionHomeCard() {
  const q = todayQuestion();
  const mine = advCache.dailyAnswers.find(
    (a) => a.user_id === user?.id && a.question_date === q.date,
  );
  const count = advCache.dailyAnswers.filter(
    (a) => a.question_date === q.date && a.answer?.trim(),
  ).length;
  return `<div class="advCard dailyQuestionCard"><div class="advMeta">💭 PREGUNTA DEL DÍA · ${dateES(q.date)}</div><h3>${esc(q.text)}</h3><p>${mine ? "Tu respuesta ya está guardada. ❤️" : "Tómense un minuto para responderse algo bonito."}</p><div class="advActions"><button class="btn primary" onclick="showAdvancedTab('question')">${mine ? "Ver respuestas" : "Responder juntos"} · ${count}/2</button></div></div>`;
}

function openDailyQuestionHistory(date) {
  window.__nc21SelectedQuestionDate = date;
  showAdvancedTab("question");
}

function showTodayDailyQuestion() {
  window.__nc21SelectedQuestionDate = null;
  showAdvancedTab("question");
}

function renderAdvQuestion() {
  const today = todayQuestion();
  const selectedDate = window.__nc21SelectedQuestionDate;
  const isHistory = !!selectedDate && selectedDate !== today.date;
  const q = isHistory
    ? {
        date: selectedDate,
        text:
          advCache.dailyAnswers.find(
            (a) => a.question_date === selectedDate && a.question_text,
          )?.question_text || "Pregunta anterior",
      }
    : today;
  const answers = advCache.dailyAnswers.filter(
    (a) => a.question_date === q.date,
  );
  const mine = answers.find((a) => a.user_id === user?.id);
  const partner = answers.find((a) => a.user_id !== user?.id);
  const myName =
    coupleProfiles.find((p) => p.user_id === user?.id)?.display_name ||
    defaultDisplayName();
  const partnerName =
    coupleProfiles.find((p) => p.user_id !== user?.id)?.display_name ||
    "Tu persona favorita";
  const historyDates = [
    ...new Set(
      advCache.dailyAnswers
        .filter((a) => a.question_date && a.question_date !== today.date)
        .map((a) => a.question_date),
    ),
  ]
    .sort()
    .reverse();
  const historyHtml = historyDates.length
    ? historyDates
        .map((date) => {
          const rows = advCache.dailyAnswers.filter(
            (a) => a.question_date === date,
          );
          const text =
            rows.find((a) => a.question_text)?.question_text ||
            "Pregunta anterior";
          const count = rows.filter((a) => a.answer?.trim()).length;
          return (
            '<div class="advItem"><div><div class="advItemTitle">' +
            esc(dateES(date)) +
            " · " +
            count +
            "/2 respuestas</div><p>" +
            esc(text) +
            '</p></div><button class="btn" data-date="' +
            esc(date) +
            '" onclick="openDailyQuestionHistory(this.dataset.date)">' +
            (selectedDate === date ? "Viendo" : "Ver respuestas") +
            "</button></div>"
          );
        })
        .join("")
    : '<div class="advEmpty">Aquí aparecerán las preguntas anteriores cuando alguno de los dos guarde una respuesta. ❤️</div>';
  const answerHtml =
    (!isHistory && !mine
      ? `<form onsubmit="event.preventDefault();saveDailyAnswer()"><div class="field"><label for="dailyAnswerInput">Tu respuesta · ${esc(myName)}</label><textarea id="dailyAnswerInput" data-date="${esc(q.date)}" rows="4" required placeholder="Escribe con sinceridad ❤️"></textarea></div><button class="btn primary" type="submit">Guardar mi respuesta ❤️</button></form>`
      : "") +
    (mine ? dailyAnswerCard(mine, myName, true) : "") +
    (partner ? dailyAnswerCard(partner, partnerName, false) : "") +
    (!isHistory && !partner
      ? '<div class="advEmpty">La respuesta de tu pareja aparecerá aquí cuando la guarde. ❤️</div>'
      : "") +
    (isHistory && !mine && !partner
      ? '<div class="advEmpty">No hay respuestas guardadas para esta fecha.</div>'
      : "");
  return (
    advHeader(
      "La pregunta de hoy",
      "Una pregunta diaria para conversar, conocerse y cuidar lo que están construyendo.",
      "Volver al inicio",
      "showAdvancedTab('home')",
    ) +
    '<div class="advCard dailyQuestionCard" style="margin-top:18px">' +
    `<div class="advMeta" id="dailyQuestionDate" data-date="${esc(q.date)}">` +
    dateES(q.date) +
    " · " +
    (isHistory ? "PREGUNTA ANTERIOR" : "PREGUNTA COMPARTIDA") +
    "</div>" +
    '<h2 style="font:italic 30px Georgia,serif;color:#653449">' +
    esc(q.text) +
    "</h2>" +
    (isHistory
      ? '<div class="advActions"><button class="btn primary" onclick="showTodayDailyQuestion()">Volver a la pregunta de hoy ❤️</button></div>'
      : "") +
    '<div class="advList" style="margin-top:18px">' +
    answerHtml +
    "</div></div>" +
    '<div class="advCard" style="margin-top:18px"><h3>📖 Historial de preguntas</h3><p>Vuelve a leer las preguntas anteriores y las respuestas que hayan guardado.</p><div class="advList">' +
    historyHtml +
    "</div></div>"
  );
}

function dailyAnswerCard(answer, name, mine) {
  const history = Array.isArray(answer.answer_history)
    ? answer.answer_history
    : [];
  const revisions = history.length
    ? `<details class="dailyAnswerHistory"><summary>Historial de cambios (${history.length})</summary>${history
        .slice()
        .reverse()
        .map(
          (edit) =>
            `<div><small>${esc(new Date(edit.edited_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</small><p><b>Antes:</b> ${esc(edit.before)}</p><p><b>Después:</b> ${esc(edit.after)}</p></div>`,
        )
        .join("")}</details>`
    : "";
  return `<div class="advItem"><div><div class="advItemTitle">${mine ? "💗 " : "💞 "}${esc(name)}${mine ? " · Tu respuesta" : ""}</div><p class="dailyAnswerText">${esc(answer.answer)}</p>${revisions}</div>${mine ? `<button class="btn" type="button" data-id="${esc(answer.id)}" onclick="openDailyAnswerEdit(this.dataset.id)">Editar respuesta</button>` : ""}</div>`;
}

function openDailyAnswerEdit(id) {
  const row = advCache.dailyAnswers.find(
    (item) => item.id === id && item.user_id === user?.id,
  );
  if (!row) return;
  openAdvModal(
    "Editar tu respuesta",
    `<form onsubmit="event.preventDefault();saveDailyAnswer(this.dataset.id)" data-id="${esc(id)}"><div class="field"><label for="dailyAnswerEditInput">Respuesta</label><textarea id="dailyAnswerEditInput" rows="5" required>${esc(row.answer)}</textarea></div><div class="advActions"><button class="btn primary" type="submit">Guardar cambios</button><button class="btn" type="button" onclick="closeAdvModal()">Cancelar</button></div></form>`,
  );
  $("dailyAnswerEditInput").dataset.previous = row.answer;
}

async function saveDailyAnswer(editId) {
  const account = user?.id,
    space = couple?.id;
  if (!account || !space) return;
  const input = $(editId ? "dailyAnswerEditInput" : "dailyAnswerInput");
  const answer = input?.value.trim();
  if (!answer) return appAlert("Escribe tu respuesta antes de guardarla ❤️");
  const q = todayQuestion();
  const existing = advCache.dailyAnswers.find(
    (row) =>
      row.user_id === account &&
      (editId ? row.id === editId : row.question_date === q.date),
  );
  if (!editId && (input.dataset.date !== q.date || existing)) {
    await advLoadAll(["dailyAnswers"]);
    renderAdvanced();
    return;
  }
  if (editId && (!existing || existing.answer !== input.dataset.previous))
    return appAlert(
      "La respuesta cambió en otro dispositivo. Vuelve a abrirla para editarla.",
    );
  if (editId && answer === existing.answer) {
    closeAdvModal();
    return;
  }
  const mutation = editId
    ? sb
        .from("daily_answers")
        .update({ answer })
        .eq("id", editId)
        .eq("user_id", account)
        .eq("couple_id", space)
        .eq("updated_at", existing.updated_at)
    : sb.from("daily_answers").insert({
        couple_id: space,
        user_id: account,
        question_date: q.date,
        question_text: q.text,
        answer,
      });
  const { data, error } = await mutation.select("*").maybeSingle();
  if (user?.id !== account || couple?.id !== space) return;
  if (error?.code === "23505") {
    await advLoadAll(["dailyAnswers"]);
    return appAlert("Ya tienes una respuesta guardada para esta pregunta.");
  }
  if (error || !data)
    return appAlert(
      "No se pudo guardar la respuesta. Vuelve a abrir la pregunta e inténtalo de nuevo.",
    );
  advCache.dailyAnswers = [
    data,
    ...advCache.dailyAnswers.filter((item) => item.id !== data.id),
  ];
  if (editId) closeAdvModal();
  if (advancedTab === "question") renderAdvanced();
  await createPartnerNotification({
    event_type: editId ? "daily_answer_edited" : "daily_answer_saved",
    title: editId
      ? "Editó una respuesta 💭"
      : "Respondió la pregunta del día 💭",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      (editId
        ? " actualizó una respuesta. Puedes ver qué cambió en el historial."
        : " compartió su respuesta a la pregunta de hoy."),
    target_tab: "question",
  });
  await advLoadAll(["dailyAnswers"]);
  showAppToast(
    editId ? "Cambios guardados." : "Tu respuesta quedó guardada ❤️",
  );
}
