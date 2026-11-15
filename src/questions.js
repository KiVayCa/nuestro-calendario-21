function todayQuestion() {
  const today = localISODate();
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
  const answerHtml = isHistory
    ? (mine
        ? '<div class="advItem"><div><div class="advItemTitle">💗 ' +
          esc(myName) +
          " · Tu respuesta</div><p>" +
          esc(mine.answer) +
          "</p></div></div>"
        : "") +
      (partner
        ? '<div class="advItem"><div><div class="advItemTitle">💞 ' +
          esc(partnerName) +
          "</div><p>" +
          esc(partner.answer) +
          "</p></div></div>"
        : "") +
      (!mine && !partner
        ? '<div class="advEmpty">No hay respuestas guardadas para esta fecha.</div>'
        : "")
    : '<div class="field"><label>Tu respuesta · ' +
      esc(myName) +
      '</label><textarea id="dailyAnswerInput" rows="4" placeholder="Escribe con sinceridad ❤️">' +
      esc(mine?.answer || "") +
      '</textarea></div><button class="btn primary" onclick="saveDailyAnswer()">Guardar mi respuesta ❤️</button><div class="advList" style="margin-top:18px">' +
      (mine
        ? '<div class="advItem"><div><div class="advItemTitle">💗 ' +
          esc(myName) +
          " · Tu respuesta</div><p>" +
          esc(mine.answer) +
          "</p></div></div>"
        : "") +
      (partner
        ? '<div class="advItem"><div><div class="advItemTitle">💞 ' +
          esc(partnerName) +
          "</div><p>" +
          esc(partner.answer) +
          "</p></div></div>"
        : '<div class="advEmpty">La respuesta de tu pareja aparecerá aquí cuando la guarde. No hay afán. ❤️</div>') +
      "</div>";
  return (
    advHeader(
      "La pregunta de hoy",
      "Una pregunta diaria para conversar, conocerse y cuidar lo que están construyendo.",
      "Volver al inicio",
      "showAdvancedTab('home')",
    ) +
    '<div class="advCard dailyQuestionCard" style="margin-top:18px">' +
    '<div class="advMeta">' +
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

async function saveDailyAnswer() {
  const answer = $("dailyAnswerInput")?.value.trim();
  if (!answer) return appAlert("Escribe tu respuesta antes de guardarla ❤️");
  const q = todayQuestion();
  const { error } = await sb.from("daily_answers").upsert(
    {
      couple_id: couple.id,
      user_id: user.id,
      question_date: q.date,
      question_text: q.text,
      answer,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "couple_id,user_id,question_date" },
  );
  if (error)
    return appAlert("No se pudo guardar la respuesta: " + error.message);
  await createPartnerNotification({
    event_type: "daily_answer_saved",
    title: "Respondió la pregunta del día 💭",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " compartió su respuesta a la pregunta de hoy.",
    target_tab: "question",
  });
  await advLoadAll();
  appAlert("Tu respuesta quedó guardada ❤️");
}
