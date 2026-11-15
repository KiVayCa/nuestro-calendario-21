let analysisPeriod = "all";

function analysisChart(title, values, format = String) {
  const max = Math.max(1, ...values.map(([, value]) => value));
  return `<section class="advCard"><h3>${esc(title)}</h3>${
    values.length
      ? values
          .map(
            ([label, value]) => `<div class="analysis-bar">
      <div><span>${esc(label)}</span><strong>${esc(format(value))}</strong></div>
      <span class="analysis-track" aria-hidden="true"><span style="width:${(100 * value) / max}%"></span></span>
      </div>`,
          )
          .join("")
      : "<p>Sin registros en este período.</p>"
  }</section>`;
}

function analysisCounts(items, key) {
  const counts = new Map();
  for (const item of items) {
    const label = item[key] || "Sin categoría";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function renderAdvAnalysis() {
  const series = [
    ["Planes", plans, "plan_date"],
    ["Recuerdos", advCache.memories, "memory_date"],
    ["Cartas", advCache.letters, "created_at"],
    ["Sueños", advCache.dreams, "created_at"],
    ["Retos", advCache.challenges, "created_at"],
    ["Metas", advCache.goals, "created_at"],
    ["Ideas", advCache.ideas, "created_at"],
    ["Lugares", advCache.places, "created_at"],
    ["Fechas especiales", advCache.dates, "event_date"],
    ["Respuestas", advCache.dailyAnswers, "question_date"],
    ["Movimientos de presupuesto", advCache.expenses, "spent_on"],
  ];
  const months = [
    ...new Set(
      series.flatMap(([, items, key]) =>
        items.map((item) => item[key]?.slice(0, 7)),
      ),
    ),
  ]
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .sort()
    .reverse();
  if (analysisPeriod !== "all" && !months.includes(analysisPeriod))
    analysisPeriod = "all";
  const within = (items, key) =>
    items.filter(
      (item) =>
        analysisPeriod === "all" || item[key]?.startsWith(analysisPeriod),
    );
  const selectedPlans = within(plans, "plan_date");
  const memories = within(advCache.memories, "memory_date");
  const expenses = within(advCache.expenses, "spent_on");
  const done = selectedPlans.filter((p) => p.completed).length;
  const income = expenses
    .filter((e) => e.entry_type === "income")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const spending = expenses
    .filter((e) => e.entry_type !== "income")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const monthLabel = (month) => albumMonthLabel(month);
  const trendMonths =
    analysisPeriod === "all" ? months.slice(0, 6).reverse() : [analysisPeriod];
  const status = (items, key, complete) => {
    const rows = within(items, key);
    const count = rows.filter(complete).length;
    return [
      ["Completados", count],
      ["Pendientes", rows.length - count],
    ];
  };
  return `<div class="analysis-heading"><div><h2>Análisis</h2><p>Actividad, recuerdos y avances de su calendario.</p></div>
    <label>Período <select onchange="analysisPeriod=this.value;renderAdvanced()">
    <option value="all">Todo el historial</option>
    ${months.map((month) => `<option value="${month}" ${analysisPeriod === month ? "selected" : ""}>${esc(monthLabel(month))}</option>`).join("")}
    </select></label></div>
    <div class="analysis-grid">
    ${analysisChart(
      "Actividad por sección",
      series.map(([name, items, key]) => [name, within(items, key).length]),
    )}
    ${analysisChart("Estado de los planes", [
      ["Completados", done],
      ["Pendientes", selectedPlans.length - done],
    ])}
    ${analysisChart("Planes por categoría", analysisCounts(selectedPlans, "category"))}
    ${analysisChart(
      "Recuerdos por mes",
      trendMonths.map((month) => [
        monthLabel(month),
        memories.filter((m) => m.memory_date?.startsWith(month)).length,
      ]),
    )}
    ${analysisChart("Recuerdos por categoría", analysisCounts(memories, "category"))}
    ${analysisChart(
      "Presupuesto · Saldo " + money(income - spending),
      [
        ["Ingresos", income],
        ["Gastos", spending],
      ],
      money,
    )}
    ${analysisChart(
      "Sueños",
      status(advCache.dreams, "created_at", (d) => d.status === "cumplido"),
    )}
    ${analysisChart(
      "Retos",
      status(advCache.challenges, "created_at", (c) => c.completed),
    )}
    ${analysisChart(
      "Metas",
      status(advCache.goals, "created_at", (g) => g.completed),
    )}
    </div>`;
}
