function money(v) {
  return v == null || v === ""
    ? "—"
    : new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Number(v));
}

function renderAdvBudget() {
  const expenses = advCache.expenses
    .slice()
    .sort((a, b) => (b.spent_on || "").localeCompare(a.spent_on || ""));
  const month = budgetSelectedMonth;
  const monthItems = expenses.filter(
    (e) => (e.spent_on || "").slice(0, 7) === month,
  );
  const people = budgetProfiles();
  const stats = people.map((p) =>
    Object.assign({}, p, budgetPersonStats(p.id, monthItems)),
  );
  const totalIncome = stats.reduce((s, p) => s + p.income, 0),
    totalExpenses = stats.reduce((s, p) => s + p.expenses, 0),
    liquidity = totalIncome - totalExpenses;
  const max = Math.max(
    1,
    ...stats.flatMap((p) => [p.income, p.expenses]),
    totalIncome,
    totalExpenses,
  );
  const names = new Map(people.map((p) => [p.id, p.name]));
  const categories = monthItems
    .filter((e) => e.entry_type !== "income")
    .reduce(
      (o, e) => (
        (o[e.category || "otros"] =
          (o[e.category || "otros"] || 0) + Number(e.amount || 0)),
        o
      ),
      {},
    );
  const peopleCards = stats
    .map(
      (p) =>
        '<div class="advCard budgetPersonCard"><div class="budgetPersonHeading"><div class="budgetAvatar">' +
        (p.key === "ana" ? "🌷" : "🧑🏻") +
        "</div><div><h3>Presupuesto " +
        esc(p.name) +
        '</h3><div class="advMeta">Resumen de ' +
        esc(month) +
        '</div></div></div><div class="budgetMetricRow"><span>Ingresos</span><strong class="incomeText">' +
        money(p.income) +
        '</strong></div><div class="budgetMetricRow"><span>Gastos</span><strong class="expenseText">' +
        money(p.expenses) +
        '</strong></div><div class="budgetLiquidity"><span>Liquidez</span><strong class="' +
        (p.liquidity < 0 ? "expenseText" : "incomeText") +
        '">' +
        money(p.liquidity) +
        '</strong></div><div class="advMeta">' +
        p.count +
        " movimiento(s) este mes</div></div>",
    )
    .join("");
  const categoryRows = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([k, v]) =>
        '<p class="budgetCategoryRow"><span>' +
        esc(k) +
        "</span><strong>" +
        money(v) +
        "</strong></p>",
    )
    .join("");
  const movementRows = monthItems
    .map(
      (e) =>
        '<div class="advItem"><div class="budgetMovementIcon ' +
        (e.entry_type === "income" ? "incomeIcon" : "expenseIcon") +
        '">' +
        (e.entry_type === "income" ? "↗" : "↘") +
        '</div><div style="flex:1;min-width:0"><div class="advItemTitle">' +
        esc(e.title) +
        '</div><div class="advMeta">' +
        dateES(e.spent_on) +
        " · " +
        esc(e.category || "otros") +
        " · " +
        esc(names.get(e.owner_user_id) || "Integrante") +
        " · " +
        (e.entry_type === "income" ? "Ingreso" : "Gasto") +
        (e.recurring_template_id ? " · 🔁 Recurrente" : "") +
        "</div>" +
        (e.notes ? "<p>" + esc(e.notes) + "</p>" : "") +
        '</div><div class="advActions"><strong class="' +
        (e.entry_type === "income" ? "incomeText" : "expenseText") +
        '">' +
        (e.entry_type === "income" ? "+" : "−") +
        money(e.amount) +
        "</strong>" +
        (e.owner_user_id === user.id
          ? '<button class="btn danger" aria-label="Eliminar movimiento" onclick="deleteExpense(\'' +
            e.id +
            "')\">🗑️</button>"
          : "") +
        "</div></div>",
    )
    .join("");
  const monthLabel = new Date(month + "-01T00:00:00").toLocaleDateString(
    "es-CO",
    { month: "long", year: "numeric" },
  );
  const recurringRows = advCache.recurring
    .map(
      (t) =>
        '<div class="advItem"><div style="flex:1;min-width:0"><div class="advItemTitle">🔁 ' +
        esc(t.title) +
        (t.active ? "" : ' <span class="advMeta">· Pausado</span>') +
        '</div><div class="advMeta">' +
        esc(names.get(t.owner_user_id) || "Integrante") +
        " · " +
        (t.entry_type === "income" ? "Ingreso" : "Gasto") +
        " · Día " +
        t.day_of_month +
        " · " +
        money(t.amount) +
        '</div></div><div class="advActions">' +
        (t.owner_user_id === user.id
          ? '<button class="btn" onclick="toggleRecurringTemplate(\'' +
            t.id +
            "'," +
            !t.active +
            ')">' +
            (t.active ? "Pausar" : "Reactivar") +
            "</button>"
          : "") +
        "</div></div>",
    )
    .join("");
  return (
    advHeader(
      "Presupuesto familiar",
      "Controlen por separado las finanzas de Ana y Nicolás y consulten el total de ambos.",
      "＋ Registrar movimiento",
      "openExpenseForm()",
    ) +
    '<div class="budgetMonthPicker"><button class="btn" onclick="changeBudgetMonth(-1)" aria-label="Mes anterior">‹</button><div><label for="budgetMonth">Mes del presupuesto</label><input id="budgetMonth" type="month" value="' +
    month +
    '" onchange="setBudgetMonth(this.value)"><strong>' +
    esc(monthLabel) +
    '</strong></div><button class="btn" onclick="changeBudgetMonth(1)" aria-label="Mes siguiente">›</button></div><div class="budgetSummaryGrid"><div class="budgetSummaryCard"><span>Ingresos conjuntos · mes</span><strong class="incomeText">' +
    money(totalIncome) +
    '</strong></div><div class="budgetSummaryCard"><span>Gastos conjuntos · mes</span><strong class="expenseText">' +
    money(totalExpenses) +
    '</strong></div><div class="budgetSummaryCard"><span>Liquidez conjunta · mes</span><strong class="' +
    (liquidity < 0 ? "expenseText" : "incomeText") +
    '">' +
    money(liquidity) +
    '</strong></div></div><div class="budgetPeopleGrid">' +
    peopleCards +
    '</div><div class="advGrid"><div class="advCard"><h3>📊 Ingresos vs. gastos</h3><p>Comparación del mes seleccionado en pesos colombianos.</p>' +
    budgetBar("Ingresos", totalIncome, max, "incomeFill") +
    budgetBar("Gastos", totalExpenses, max, "expenseFill") +
    '</div><div class="advCard"><h3>👫 Liquidez por persona</h3><p>Lo que queda después de restar los gastos a los ingresos.</p>' +
    stats
      .map((p) =>
        budgetBar(
          p.name,
          p.liquidity > 0 ? p.liquidity : 0,
          Math.max(1, ...stats.map((s) => Math.max(0, s.liquidity))),
          "incomeFill",
        ),
      )
      .join("") +
    (stats.some((p) => p.liquidity < 0)
      ? '<div class="advMeta">Saldo negativo: ' +
        stats
          .filter((p) => p.liquidity < 0)
          .map((p) => esc(p.name) + " " + money(p.liquidity))
          .join(" · ") +
        "</div>"
      : "") +
    '</div><div class="advCard"><h3>🧾 Gastos por categoría</h3>' +
    (categoryRows || "<p>Aún no hay gastos este mes.</p>") +
    '</div></div><div class="advCard" style="margin-top:16px"><div class="budgetListHeading"><div><h3>Movimientos del mes</h3><p>Los ingresos y gastos se muestran separados por persona.</p></div><button class="btn primary" onclick="openExpenseForm()">＋ Añadir</button></div><div class="advList">' +
    (movementRows ||
      '<div class="advEmpty">💗 No hay movimientos en este mes todavía.</div>') +
    '</div></div><div class="advCard" style="margin-top:16px"><div class="budgetListHeading"><div><h3>🔁 Ingresos y gastos repetitivos</h3><p>Se registran automáticamente al consultar cada mes, sin duplicar movimientos.</p></div><button class="btn primary" onclick="openRecurringForm()">＋ Crear recurrente</button></div><div class="advList">' +
    (recurringRows ||
      '<div class="advEmpty">Aún no han configurado movimientos recurrentes.</div>') +
    "</div></div>"
  );
}

function openExpenseForm() {
  const people = budgetProfiles();
  const me = people.find((p) => p.id === user.id);
  openAdvModal(
    "Nuevo movimiento de dinero",
    '<div class="moneyModalIntro"><span>💸</span><div><strong>Organicen sus finanzas</strong><p>Este movimiento se guardará en el presupuesto de ' +
      esc(me?.name || myProfile.display_name || "tu perfil") +
      ' y en el resumen conjunto.</p></div></div><div class="field"><label>Tipo de movimiento</label><div class="moneyTypeChoices"><button type="button" id="budgetIncomeChoice" class="moneyTypeChoice" onclick="setBudgetEntryType(\'income\')">↗ Ingreso</button><button type="button" id="budgetExpenseChoice" class="moneyTypeChoice active" onclick="setBudgetEntryType(\'expense\')">↘ Gasto</button></div></div><input type="hidden" id="adv_entry_type" value="expense">' +
      input("title", "Concepto del movimiento") +
      input(
        "amount",
        "Valor en pesos colombianos",
        "number",
        'min="1" step="1" placeholder="Ej. 150000"',
      ) +
      input("spent_on", "Fecha", "date") +
      select("category", "Categoría", [
        ["salario", "Salario"],
        ["extra", "Ingreso extra"],
        ["citas", "Citas"],
        ["comida", "Comida"],
        ["transporte", "Transporte"],
        ["viajes", "Viajes"],
        ["hogar", "Hogar"],
        ["servicios", "Servicios"],
        ["regalos", "Regalos"],
        ["ahorro", "Ahorro"],
        ["deuda", "Deuda / cuota"],
        ["otros", "Otros"],
      ]) +
      textarea("notes", "Notas (opcional)", "Un detalle para recordar...") +
      moneyModalActions("saveExpense()"),
  );
  $("adv_spent_on").value =
    budgetSelectedMonth === localISODate().slice(0, 7)
      ? localISODate()
      : budgetSelectedMonth + "-01";
  setBudgetEntryType("expense");
  $("adv_title")?.focus();
}

function setBudgetEntryType(type) {
  $("adv_entry_type").value = type;
  $("budgetIncomeChoice")?.classList.toggle("active", type === "income");
  $("budgetExpenseChoice")?.classList.toggle("active", type === "expense");
  const category = $("adv_category");
  if (category && type === "income") category.value = "salario";
  else if (category && ["salario", "extra"].includes(category.value))
    category.value = "otros";
}

async function saveExpense() {
  const title = $("adv_title").value.trim(),
    amount = Number($("adv_amount").value),
    spent_on = $("adv_spent_on").value,
    entry_type = $("adv_entry_type").value;
  if (!title) return moneyFormError("Escribe el concepto del movimiento.");
  if (!Number.isFinite(amount) || amount <= 0)
    return moneyFormError("Ingresa un valor válido mayor que cero.");
  if (!spent_on) return moneyFormError("Selecciona la fecha del movimiento.");
  if (!user?.id || !couple?.id)
    return moneyFormError("Tu sesión no está lista. Vuelve a iniciar sesión.");
  const { data: created, error } = await sb
    .from("shared_expenses")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      paid_by: user.id,
      owner_user_id: user.id,
      entry_type,
      title,
      amount,
      spent_on,
      category: $("adv_category").value,
      notes: $("adv_notes").value.trim() || null,
    })
    .select("id")
    .single();
  if (error) return moneyFormError("No se pudo guardar: " + error.message);
  await createPartnerNotification({
    event_type: "budget_movement_created",
    title: (entry_type === "income" ? "Nuevo ingreso" : "Nuevo gasto") + " 💰",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " registró " +
      (entry_type === "income" ? "el ingreso" : "el gasto") +
      " «" +
      title +
      "» por " +
      money(amount) +
      ".",
    target_tab: "budget",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
  showAppToast("Movimiento guardado correctamente ❤️");
}

function deleteExpense(id) {
  const safeId = String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\\\'");
  openConfirmModal(
    "Eliminar movimiento",
    "¿Quieres eliminar este movimiento del presupuesto? Esta acción no se puede deshacer.",
    "Eliminar",
    "confirmDeleteExpense('" + safeId + "')",
  );
}

async function confirmDeleteExpense(id) {
  const movement = advCache.expenses.find((x) => x.id === id);
  const { data, error } = await sb
    .from("shared_expenses")
    .delete()
    .eq("id", id)
    .eq("couple_id", couple.id)
    .eq("owner_user_id", user.id)
    .select("id");
  if (error) return moneyFormError("No se pudo eliminar: " + error.message);
  if (!data || !data.length)
    return moneyFormError(
      "No se eliminó el movimiento. Solo puedes eliminar tus propios ingresos y gastos; actualiza el presupuesto e inténtalo de nuevo.",
    );
  if (movement)
    await createPartnerNotification({
      event_type: "budget_movement_deleted",
      title: "Movimiento eliminado del presupuesto",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        " eliminó «" +
        movement.title +
        "» del presupuesto.",
      target_tab: "budget",
    });
  closeAdvModal();
  await advLoadAll();
  showAppToast("Movimiento eliminado.");
}

function changeBudgetMonth(delta) {
  const [y, m] = budgetSelectedMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  budgetSelectedMonth =
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  advLoadAll();
}

function setBudgetMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return;
  budgetSelectedMonth = value;
  advLoadAll();
}

async function ensureRecurringBudgetMovements(monthKey) {
  if (!couple || !user || !monthKey) return;
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = monthKey + "-01";
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = advCache.recurring
    .filter(
      (t) =>
        t.owner_user_id === user.id &&
        t.active &&
        t.start_date &&
        t.start_date.slice(0, 7) <= monthKey &&
        (!t.end_date || t.end_date.slice(0, 7) >= monthKey),
    )
    .map((t) => {
      const spent_on =
        monthKey +
        "-" +
        String(Math.min(Number(t.day_of_month || 1), daysInMonth)).padStart(
          2,
          "0",
        );
      return {
        couple_id: couple.id,
        created_by: t.created_by,
        paid_by: t.owner_user_id,
        owner_user_id: t.owner_user_id,
        entry_type: t.entry_type,
        title: t.title,
        amount: t.amount,
        spent_on,
        category: t.category || "otros",
        notes: t.notes || null,
        recurring_template_id: t.id,
        recurrence_month: monthStart,
      };
    })
    .filter(
      (row) =>
        row.spent_on >=
          (advCache.recurring.find((t) => t.id === row.recurring_template_id)
            ?.start_date || monthStart) &&
        (!advCache.recurring.find((t) => t.id === row.recurring_template_id)
          ?.end_date ||
          row.spent_on <=
            advCache.recurring.find((t) => t.id === row.recurring_template_id)
              .end_date),
    );
  if (!rows.length) return;
  const { error } = await sb.from("shared_expenses").upsert(rows, {
    onConflict: "recurring_template_id,recurrence_month",
    ignoreDuplicates: true,
  });
  if (error)
    console.warn(
      "No se pudieron generar movimientos recurrentes:",
      error.message,
    );
}

function openRecurringForm() {
  openAdvModal(
    "Nuevo ingreso o gasto recurrente",
    '<div class="moneyModalIntro"><span>🔁</span><div><strong>Regístralo una sola vez</strong><p>La aplicación creará el movimiento en cada mes que corresponda, usando el día elegido. Si el mes es más corto, usará su último día.</p></div></div>' +
      input(
        "recurring_title",
        "Concepto",
        "text",
        'maxlength="120" placeholder="Ej. Salario, arriendo, recibo de luz"',
      ) +
      input(
        "recurring_amount",
        "Valor en pesos colombianos",
        "number",
        'min="1" step="1" placeholder="Ej. 150000"',
      ) +
      select("recurring_type", "Tipo de movimiento", [
        ["expense", "Gasto"],
        ["income", "Ingreso"],
      ]) +
      select("recurring_category", "Categoría", [
        ["salario", "Salario"],
        ["extra", "Ingreso extra"],
        ["hogar", "Hogar"],
        ["servicios", "Servicios"],
        ["deuda", "Deuda / cuota"],
        ["transporte", "Transporte"],
        ["comida", "Comida"],
        ["ahorro", "Ahorro"],
        ["otros", "Otros"],
      ]) +
      input(
        "recurring_day",
        "Día del mes",
        "number",
        'min="1" max="31" value="1"',
      ) +
      input("recurring_start", "Primer mes / fecha de inicio", "date") +
      input("recurring_end", "Última fecha (opcional)", "date") +
      textarea(
        "recurring_notes",
        "Notas (opcional)",
        "Detalle del movimiento",
      ) +
      moneyModalActions("saveRecurringTemplate()"),
  );
  $("adv_recurring_start").value = localISODate();
  $("adv_recurring_day").value = String(new Date().getDate());
}

async function saveRecurringTemplate() {
  const title = $("adv_recurring_title").value.trim(),
    amount = Number($("adv_recurring_amount").value),
    start_date = $("adv_recurring_start").value,
    end_date = $("adv_recurring_end").value || null,
    day_of_month = Number($("adv_recurring_day").value),
    entry_type = $("adv_recurring_type").value;
  if (!title) return moneyFormError("Escribe el concepto.");
  if (!Number.isFinite(amount) || amount <= 0)
    return moneyFormError("Ingresa un valor mayor que cero.");
  if (!start_date) return moneyFormError("Selecciona la fecha de inicio.");
  if (!Number.isInteger(day_of_month) || day_of_month < 1 || day_of_month > 31)
    return moneyFormError("El día debe estar entre 1 y 31.");
  if (end_date && end_date < start_date)
    return moneyFormError("La fecha final no puede ser anterior al inicio.");
  const { error } = await sb.from("budget_recurring_templates").insert({
    couple_id: couple.id,
    created_by: user.id,
    owner_user_id: user.id,
    entry_type,
    title,
    amount,
    category: $("adv_recurring_category").value,
    day_of_month,
    start_date,
    end_date,
    notes: $("adv_recurring_notes").value.trim() || null,
    active: true,
  });
  if (error)
    return moneyFormError("No se pudo guardar el recurrente: " + error.message);
  await createPartnerNotification({
    event_type: "budget_recurring_created",
    title: "Nuevo movimiento recurrente 🔁",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " programó " +
      (entry_type === "income" ? "un ingreso" : "un gasto") +
      " recurrente: «" +
      title +
      "».",
    target_tab: "budget",
  });
  closeAdvModal();
  await advLoadAll();
  showAppToast("Movimiento recurrente guardado ❤️");
}

async function toggleRecurringTemplate(id, active) {
  const item = advCache.recurring.find((x) => x.id === id);
  const { error } = await sb
    .from("budget_recurring_templates")
    .update({ active })
    .eq("id", id)
    .eq("couple_id", couple.id)
    .eq("owner_user_id", user.id);
  if (error)
    return showAppToast("No se pudo actualizar: " + error.message, "error");
  if (item)
    await createPartnerNotification({
      event_type: "budget_recurring_status",
      title: active
        ? "Movimiento recurrente reactivado 🔁"
        : "Movimiento recurrente pausado",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        (active ? " reactivó" : " pausó") +
        " «" +
        item.title +
        "».",
      target_tab: "budget",
    });
  await advLoadAll();
  showAppToast(
    active
      ? "Movimiento recurrente reactivado."
      : "Movimiento recurrente pausado.",
  );
}

function moneyModalActions(action, label = "Guardar") {
  return (
    '<div class="moneyModalActions"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" onclick="' +
    action +
    '">' +
    label +
    '</button></div><div id="moneyFormError" class="moneyFormError" role="alert" hidden></div>'
  );
}

function moneyFormError(message) {
  const e = $("moneyFormError");
  if (e) {
    e.textContent = message;
    e.hidden = false;
  } else showAppToast(message, "error");
}
