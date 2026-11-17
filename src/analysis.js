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

function analysisPlanStatus(done, total) {
  const percentage = total ? Math.round((done * 100) / total) : 0;
  return `<section class="advCard"><h3>Cumplimiento de planes</h3>
    <div class="analysis-donut" style="--completed:${percentage}%"><strong>${percentage}%</strong></div>
    <p>${done} de ${total} fechas completadas · ${total - done} pendientes</p></section>`;
}

function analysisMonthOffset(month, offset) {
  const date = new Date(month + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function analysisOccurrences(month) {
  const end = new Date(analysisMonthOffset(month, 1) + "-01T12:00:00Z");
  end.setUTCDate(0);
  return getPlanOccurrencesForRange(
    month + "-01",
    end.toISOString().slice(0, 10),
  );
}

function analysisTrend(month) {
  const rows = Array.from({ length: 6 }, (_, index) => {
    const key = analysisMonthOffset(month, index - 5);
    return {
      key,
      completed: analysisOccurrences(key).filter((plan) => plan.completed)
        .length,
      memories: advCache.memories.filter((memory) =>
        memory.memory_date?.startsWith(key),
      ).length,
    };
  });
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [row.completed, row.memories]),
  );
  const x = (index) => 45 + index * 59;
  const y = (value) => 140 - (112 * value) / max;
  const pointX = (row, index, key) =>
    row.completed === row.memories
      ? x(index) + (key === "completed" ? -6 : 6)
      : x(index);
  const line = (key, name) =>
    `<polyline class="${name}" points="${rows.map((row, i) => pointX(row, i, key) + "," + y(row[key])).join(" ")}"/>` +
    rows
      .map(
        (row, i) =>
          `<g class="analysis-point" tabindex="0" role="button" aria-label="${esc(albumMonthLabel(row.key))} · ${key === "completed" ? "Planes completados" : "Recuerdos"}: ${row[key]}"
          onclick="openAnalysisMonth('${row.key}','${key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.dispatchEvent(new MouseEvent('click'))}">
          <circle class="${name}" cx="${pointX(row, i, key)}" cy="${y(row[key])}" r="5"/><title>${esc(albumMonthLabel(row.key))}: ${row[key]}</title></g>`,
      )
      .join("");
  const latest = rows.at(-1);
  const previous = rows.at(-2);
  const delta = (value) => (value > 0 ? "+" + value : String(value));
  const table = rows
    .map(
      (row) =>
        `<tr><th scope="row">${esc(albumMonthLabel(row.key))}</th><td><button type="button" class="btn" onclick="openAnalysisMonth('${row.key}','completed')">${row.completed}</button></td><td><button type="button" class="btn" onclick="openAnalysisMonth('${row.key}','memories')">${row.memories}</button></td></tr>`,
    )
    .join("");
  const ticks = [...new Set([0, Math.round(max / 2), max])];
  return `<section class="advCard analysis-wide"><h3>Evolución de los últimos seis meses</h3>
    <p>${esc(albumMonthLabel(latest.key))} frente a ${esc(albumMonthLabel(previous.key))} ·
    ${delta(latest.completed - previous.completed)} planes completados · ${delta(latest.memories - previous.memories)} recuerdos</p>
    <div class="analysis-legend"><span>● Planes completados</span><span>● Recuerdos</span></div>
    <svg class="analysis-trend" viewBox="0 0 370 172" aria-label="Evolución mensual de planes completados y recuerdos">
    ${ticks.map((value) => `<path d="M40 ${y(value)}H348"/><text x="34" y="${y(value) + 4}" text-anchor="end">${value}</text>`).join("")}
    ${rows.map((row, i) => `<text x="${x(i)}" y="161" text-anchor="middle">${row.key.slice(5)}/${row.key.slice(2, 4)}</text>`).join("")}
    ${line("completed", "analysis-plans")}${line("memories", "analysis-memories")}
    </svg>
    <details><summary>Ver cifras por mes</summary><table><thead><tr><th>Mes</th><th>Planes</th><th>Recuerdos</th></tr></thead><tbody>${table}</tbody></table></details>
  </section>`;
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
    ...new Set([
      ...series.flatMap(([, items, key]) =>
        items.map((item) => item[key]?.slice(0, 7)),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        analysisMonthOffset(dateKeyLocal(new Date()).slice(0, 7), -i),
      ),
      ...plans.flatMap((plan) =>
        (plan.completed_occurrences || []).map((date) => date.slice(0, 7)),
      ),
    ]),
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
  const currentMonth = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const summaryMonth = analysisPeriod === "all" ? currentMonth : analysisPeriod;
  const earliestPlan = plans
    .map((plan) => plan.plan_date)
    .filter(Boolean)
    .sort()[0];
  const latestPlan = plans
    .map((plan) => plan.plan_date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const endOfCurrentMonth = new Date(
    analysisMonthOffset(currentMonth, 1) + "-01T12:00:00Z",
  );
  endOfCurrentMonth.setUTCDate(0);
  const historyEnd = [
    latestPlan,
    endOfCurrentMonth.toISOString().slice(0, 10),
    ...plans.flatMap((plan) => plan.completed_occurrences || []),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);
  const selectedPlans =
    analysisPeriod === "all"
      ? earliestPlan
        ? getPlanOccurrencesForRange(earliestPlan, historyEnd)
        : []
      : analysisOccurrences(analysisPeriod);
  const memories = within(advCache.memories, "memory_date");
  const expenses = within(advCache.expenses, "spent_on");
  const activePlans = selectedPlans.filter((plan) => !plan.cancelled);
  const done = activePlans.filter((p) => p.completed).length;
  const income = expenses
    .filter((e) => e.entry_type === "income")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const spending = expenses
    .filter((e) => e.entry_type !== "income")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const monthLabel = (month) => albumMonthLabel(month);
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
    ${analysisTrend(summaryMonth)}
    ${analysisChart(
      "Actividad por sección",
      series.map(([name, items, key]) => [
        name,
        name === "Planes" ? selectedPlans.length : within(items, key).length,
      ]),
    )}
    ${analysisPlanStatus(done, activePlans.length)}
    ${analysisChart("Planes por categoría", analysisCounts(selectedPlans, "category"))}
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
