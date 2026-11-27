// Pick from the shared history rather than from each person's local progress.
// A question answered by both is retired permanently. If one already answered,
// their earlier response is reused and only the remaining person can answer.
function dailyQuestionRows(rows, text, throughDate) {
  const byUser = new Map();
  for (const row of rows) {
    if (!row.answer?.trim() || row.question_text !== text || row.question_date > throughDate) continue;
    const old = byUser.get(row.user_id);
    if (!old || old.question_date < row.question_date) byUser.set(row.user_id, row);
  }
  return [...byUser.values()];
}

function selectDailyQuestion(date, bank, rows) {
  // Once anyone has answered today's question, leave it unchanged for the day.
  const existing = rows.filter(r => r.question_date === date && r.question_text)
    .sort((a,b) => String(a.created_at||"").localeCompare(String(b.created_at||"")) || String(a.id||"").localeCompare(String(b.id||"")))[0];
  if (existing) return {date,text:existing.question_text};
  if (!bank.length) return {date,text:null};
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
  const start = ((day % bank.length) + bank.length) % bank.length;
  for (let i=0;i<bank.length;i++) {
    const text=bank[(start+i)%bank.length];
    if (dailyQuestionRows(rows,text,date).length < 2) return {date,text};
  }
  return {date,text:null};
}

function todayQuestion() {
  return selectDailyQuestion(countdownToday(), dailyQuestionBank, advCache.dailyAnswers || []);
}

function dailyQuestionProgress(date) {
  return dailyQuestionBank.filter(text => dailyQuestionRows(advCache.dailyAnswers,text,date).length >= 2).length;
}

function dailyQuestionHomeCard() {
  const q = todayQuestion();
  if (!q.text) return `<div class="advCard dailyQuestionCard"><h3>💭 ¡Completaron todas las preguntas!</h3><p>Pueden volver a leer sus respuestas en el historial.</p><button class="btn" onclick="showTodayDailyQuestion()">Ver historial</button></div>`;
  const rows=dailyQuestionRows(advCache.dailyAnswers,q.text,q.date);
  const mine=rows.find(a=>a.user_id===user?.id);
  const count=rows.length;
  return `<div class="advCard dailyQuestionCard"><div class="advMeta">💭 PREGUNTA DEL DÍA · ${dateES(q.date)}</div><h3>${esc(q.text)}</h3><p>${mine ? "Tu respuesta ya está guardada. ❤️" : "Tómense un minuto para responderse algo bonito."}</p><div class="advActions"><button class="btn primary" onclick="showTodayDailyQuestion()">${mine ? "Ver respuestas" : "Responder juntos"} · ${count}/2</button></div></div>`;
}

function openDailyQuestionHistory(date) {
  window.__nc21SelectedQuestionDate = date;
  showAdvancedTab("question");
}

function showTodayDailyQuestion() {
  window.__nc21SelectedQuestionDate = null;
  knowingCategory = "today";
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
  const answers = isHistory ? advCache.dailyAnswers.filter(a=>a.question_date===q.date) : dailyQuestionRows(advCache.dailyAnswers,q.text,q.date);
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
    (!isHistory && !mine && q.text
      ? `<form onsubmit="event.preventDefault();saveDailyAnswer()"><div class="field"><label for="dailyAnswerInput">Tu respuesta · ${esc(myName)}</label><textarea id="dailyAnswerInput" data-date="${esc(q.date)}" data-question="${esc(q.text)}" rows="4" required placeholder="Escribe con sinceridad ❤️"></textarea></div><button class="btn primary" type="submit">Guardar mi respuesta ❤️</button></form>`
      : "") +
    (mine ? dailyAnswerCard(mine, myName, true) : "") +
    (partner ? dailyAnswerCard(partner, partnerName, false) : "") +
    (!isHistory && q.text && !partner
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
    `<p class="advMeta">💗 ${dailyQuestionProgress(today.date)}/${dailyQuestionBank.length} preguntas respondidas por ambos. Solo regresan las que aún tienen respuestas pendientes.</p>`+
    `<div class="advMeta" id="dailyQuestionDate" data-date="${esc(q.date)}">` +
    dateES(q.date) +
    " · " +
    (isHistory ? "PREGUNTA ANTERIOR" : "PREGUNTA COMPARTIDA") +
    "</div>" +
    '<h2 style="font:italic 30px Georgia,serif;color:#653449">' +
    esc(q.text || "¡Completaron todas las preguntas! ❤️") +
    "</h2>" +
    (isHistory
      ? '<div class="advActions"><button class="btn primary" onclick="showTodayDailyQuestion()">Volver a la pregunta de hoy ❤️</button></div>'
      : "") +
    '<div class="advList" style="margin-top:18px">' +
    answerHtml +
    "</div></div>" +
    renderKnowing() +
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
  return `<div class="advItem"><div><div class="advItemTitle">${mine ? "💗 " : "💞 "}${esc(name)}${mine ? " · Tu respuesta" : ""}</div><small class="advMeta">Respondida el ${esc(dateES(answer.question_date))}</small><p class="dailyAnswerText">${esc(answer.answer)}</p>${revisions}</div>${mine ? `<button class="btn" type="button" data-id="${esc(answer.id)}" onclick="openDailyAnswerEdit(this.dataset.id)">Editar respuesta</button>` : ""}</div>`;
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
  const displayedDate=input?.dataset.date, displayedQuestion=input?.dataset.question;
  if (!editId) {
    await advLoadAll(["dailyAnswers"]);
    if(user?.id!==account||couple?.id!==space)return;
  }
  const q = todayQuestion();
  const existing = advCache.dailyAnswers.find(
    (row) =>
      row.user_id === account &&
      (editId ? row.id === editId : row.question_text === q.text || row.question_date === q.date),
  );
  if (!editId && (!q.text || displayedDate !== q.date || displayedQuestion !== q.text || existing)) {
    renderAdvanced();
    return appAlert("La pregunta cambió o ya está respondida. Revisa la pregunta actual antes de continuar.");
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
