function renderAdvGoals() {
  return (
    advHeader(
      "Nuestras metas",
      "Metas de ahorro, viajes, proyectos y cualquier cosa que quieran construir juntos.",
      "💰 Nueva meta",
      "openGoalForm()",
    ) +
    `<div class="advList">${
      advCache.goals.length
        ? advCache.goals
            .map((x) => {
              const pct = x.target_amount
                ? Math.min(
                    100,
                    Math.round(
                      (Number(x.current_amount || 0) /
                        Number(x.target_amount)) *
                        100,
                    ),
                  )
                : 0;
              return `<div class="advItem" data-advanced-id="${x.id}"><div style="flex:1"><div class="advItemTitle">${x.completed ? "✅ " : "💰 "}${esc(x.title)}</div><div class="advMeta">${x.target_amount ? money(x.current_amount) + " / " + money(x.target_amount) : "Sin monto objetivo"}${x.target_date ? " · " + dateES(x.target_date) : ""}</div>${x.target_amount ? `<div class="progress"><span style="width:${pct}%"></span></div><div class="advMeta">${pct}% completado</div>` : ""}${goalProjection(x)}<p>${esc(x.description || "")}</p>${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? `<div class="advMeta">📍 Lugar: ${placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name)}</div>` : ""}</div><div class="advActions"><button class="btn" onclick="advanceGoal('${x.id}','add')">＋ Aportar</button><button class="btn" onclick="advanceGoal('${x.id}','subtract')">− Retirar</button><button class="btn" onclick="toggleGoal('${x.id}',${!x.completed})">${x.completed ? "↩️" : "✓"}</button><button class="btn" onclick="openGoalHistory('${x.id}')">Historial</button><button class="btn" onclick="openAdvancedEdit('goals','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('goals','${x.id}')">🗑️</button></div></div>`;
            })
            .join("")
        : `<div class="advEmpty">💰 Pongan una meta en común y vean cómo crece.</div>`
    }</div>`
  );
}

function openGoalMovement(id, mode = "add") {
  delete $("advModal").dataset.goalRequestId;
  const x = advCache.goals.find((g) => g.id === id);
  if (!x) return;
  const adding = mode === "add";
  openAdvModal(
    adding ? "Aportar a la meta ❤️" : "Retirar dinero de la meta",
    '<div class="moneyModalIntro"><span>' +
      (adding ? "🌱" : "↘️") +
      "</span><div><strong>" +
      esc(x.title) +
      "</strong><p>Saldo actual: <b>" +
      money(x.current_amount || 0) +
      "</b>" +
      (x.target_amount ? " · Objetivo: " + money(x.target_amount) : "") +
      '</p></div></div><div class="field"><label>' +
      (adding ? "Valor que vas a aportar" : "Valor que vas a retirar") +
      '</label><input id="goalMovementAmount" type="number" min="1" step="1" placeholder="Ej. 50000" inputmode="numeric"></div><div class="field"><label>Nota (opcional)</label><input id="goalMovementNote" type="text" maxlength="120" placeholder="' +
      (adding ? "Ahorro del mes" : "Retiro de la meta") +
      '"></div>' +
      moneyModalActions(
        "saveGoalMovement('" + id + "','" + mode + "')",
        adding ? "Registrar aporte" : "Registrar retiro",
      ),
  );
}

async function saveGoalMovement(id, mode) {
  const amount = Number($("goalMovementAmount")?.value);
  if (!Number.isFinite(amount) || amount <= 0)
    return moneyFormError("Ingresa un valor mayor que cero.");
  const modal = $("advModal");
  const requestId =
    modal.dataset.goalRequestId ||
    (modal.dataset.goalRequestId = crypto.randomUUID());
  const { data: movement, error } = await sb.rpc("record_goal_movement", {
    p_goal_id: id,
    p_amount: mode === "add" ? amount : -amount,
    p_note: $("goalMovementNote")?.value.trim() || null,
    p_request_id: requestId,
  });
  if (error)
    return moneyFormError(
      "No se pudo registrar el movimiento: " + error.message,
    );
  const partner = coupleProfiles.find((profile) => profile.user_id !== user.id);
  if (partner && movement?.notification_id) {
    const { error: pushError } = await sb.functions.invoke(
      "send-push-notification",
      {
        body: {
          couple_id: couple.id,
          recipient_user_id: partner.user_id,
          notification_id: movement.notification_id,
        },
      },
    );
    if (pushError)
      console.warn(
        "Movimiento guardado. El aviso push no pudo enviarse.",
        pushError.message,
      );
  }
  delete modal.dataset.goalRequestId;
  closeAdvModal();
  await advLoadAll(["goals", "notifications"]);
  showAppToast("Movimiento registrado.");
}

function openGoalForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva meta 💰",
    formShell(
      input("title", "Meta") +
        textarea("description", "Descripción") +
        `<div class="advFormGrid">${input("target_amount", "Monto objetivo", "number", 'min="0"')}${input("target_date", "Fecha objetivo", "date")}</div>`,
      `saveGoal()`,
    ),
  );
}

async function saveGoal() {
  if (advancedEditState.key === "goals" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return moneyFormError("Escribe el nombre de la meta.");
  const target = $("adv_target_amount").value;
  if (target !== "" && (!Number.isFinite(Number(target)) || Number(target) < 0))
    return moneyFormError(
      "El monto objetivo debe ser cero o un valor positivo.",
    );
  const { data: created, error } = await sb
    .from("goals")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      target_amount: target || null,
      target_date: $("adv_target_date").value || null,
    })
    .select("id")
    .single();
  if (error)
    return moneyFormError("No se pudo guardar la meta: " + error.message);
  await createPartnerNotification({
    event_type: "goal_created",
    title: "Nueva meta compartida 💰",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó la meta «" +
      title +
      "».",
    target_tab: "goals",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
  showAppToast("Meta guardada ❤️");
}

async function toggleGoal(id, val) {
  const goal = advCache.goals.find((x) => x.id === id);
  const { error } = await sb
    .from("goals")
    .update({ completed: val })
    .eq("id", id);
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "goal_status_changed",
    title: val ? "¡Meta cumplida! 💰" : "Meta actualizada 💰",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      (val ? " marcó como cumplida" : " actualizó") +
      " la meta «" +
      (goal?.title || "una meta") +
      "».",
    target_tab: "goals",
    target_id: id,
  });
  await advLoadAll();
}

function advanceGoal(id, mode = "add") {
  openGoalMovement(id, mode);
}
