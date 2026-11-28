const albumFrames = {
  rose: {
    name: "Rosa editorial",
    paper: "#f8e6e4",
    ink: "#48252e",
    trim: "#a85364",
  },
  sage: {
    name: "Jardín de salvia",
    paper: "#e6eee2",
    ink: "#263e33",
    trim: "#617c65",
  },
  night: {
    name: "Noche dorada",
    paper: "#211e35",
    ink: "#fff2db",
    trim: "#ddaf6b",
  },
};
const albumPhrases = [
  "Qué bonito coincidir contigo.",
  "Lo mejor del mes fue vivirlo a tu lado.",
  "Contigo, los días sencillos también se vuelven recuerdos.",
  "Un mes más escribiendo nuestra historia.",
];

const collagePhrases = [
  ...albumPhrases,
  "En cualquier lugar, si es contigo.",
  "Siempre encuentro algo nuevo que amar de ti.",
  "Mi lugar favorito es a tu lado.",
  "Y entre tantos días, este se quedó conmigo.",
  "Así se ve la felicidad cuando la compartimos.",
  "Lo volvería a vivir, detalle por detalle.",
  "Si el tiempo pasa rápido, que nos deje estas fotos.",
  "De todos los caminos, qué alegría que el mío llegara a ti.",
  "Tu risa es mi parte favorita de estos días.",
  "Un pedacito de nuestra vida, guardado para siempre.",
  "Entre planes, risas y abrazos, pasó otro mes.",
  "Que nunca nos falten ganas de crear más recuerdos.",
  "El mundo se siente un poco más nuestro cuando vamos juntos.",
  "Cada foto guarda algo que solo nosotros sabemos.",
  "Hay días que merecen volver a verse.",
  "Lo cotidiano también es extraordinario contigo.",
  "Qué fortuna poder decir: esto lo vivimos juntos.",
  "Ojalá nunca nos acostumbremos a lo bonito de estar juntos.",
  "Si pudiera guardar un sonido, sería tu risa de ese día.",
  "Entre todos los momentos, siempre te elijo a ti.",
  "Esta foto me recuerda por qué valió la pena salir de casa.",
  "Algunas aventuras empiezan con un simple «¿vamos?».",
  "De este mes me quedo con nuestras sobremesas y tus abrazos.",
  "Nos faltan muchos lugares, pero ya tenemos historias para contar.",
  "Un mes más para agradecerle a Dios por tu vida.",
  "Que Dios siga guiando cada paso que demos juntos.",
  "El amor es paciente, es bondadoso. · 1 Corintios 13:4",
  "Mejores son dos que uno. · Eclesiastés 4:9",
  "Tu amor me hace agradecer hasta los días más sencillos.",
  "Qué bonito crecer contigo y seguir aprendiendo a querernos.",
  "Que la vida nos encuentre siempre haciendo planes juntos.",
  "Cada vez que veo estas fotos, vuelvo a sonreír.",
  "Esto también fue amor: detenernos y disfrutar el momento.",
  "Un recordatorio de lo bien que se siente ser nosotros.",
  "El 21 siempre tendrá un lugar en nuestra historia.",
  "Si este mes tuviera una palabra, sería «contigo».",
];

function albumMonthLabel(key) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(key + "-01T12:00:00Z"));
}

function albumMonthKeys() {
  return [
    ...new Set(
      advCache.memories
        .map((m) => m.memory_date?.slice(0, 7))
        .filter((key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key)),
    ),
  ].sort();
}

function openAlbumExport() {
  const months = albumMonthKeys();
  if (!months.length)
    return appAlert("Guarda un recuerdo con fecha para crear tu álbum.");
  openAdvModal(
    "Exportar nuestros recuerdos",
    `
    <div class="advActions album-options">
      <button class="btn primary" type="button" onclick="renderAlbumOptions('pdf')">Álbum PDF</button>
      <button class="btn" type="button" onclick="renderAlbumOptions('collage')">Collage del mes</button>
    </div><div id="albumOptions"></div>`,
  );
  renderAlbumOptions("pdf");
}

function renderAlbumOptions(mode) {
  const months = albumMonthKeys().reverse();
  const options = $("albumOptions");
  if (options.dataset.busy) return;
  if (mode === "pdf") {
    options.innerHTML = `<fieldset class="album-options"><legend>Meses del álbum</legend>
      ${months.map((month, i) => `<label><input type="checkbox" name="album-month" value="${month}" ${i ? "" : "checked"}> ${esc(albumMonthLabel(month))}</label>`).join("")}
      </fieldset><button class="btn primary" type="button" onclick="runAlbumExport('pdf')">Descargar PDF</button>
      <p id="albumStatus" role="status"></p>`;
    return;
  }
  options.innerHTML = `<div class="album-options">
    <label>Mes <select id="albumCollageMonth" onchange="renderCollagePhotos()">${months.map((m) => `<option value="${m}">${esc(albumMonthLabel(m))}</option>`).join("")}</select></label>
    <label>Marco <select id="albumCollageFrame" onchange="updateCollageFrame()">${Object.entries(
      albumFrames,
    )
      .map(([id, f]) => `<option value="${id}">${f.name}</option>`)
      .join("")}</select></label>
    <label>Frase <select id="albumCollagePhrase" onchange="updateCollageFrame()"><option value="">Escribir mi propia frase</option>${collagePhrases.map((p, i) => `<option value="${i}" ${i === 0 ? "selected" : ""}>${esc(p)}</option>`).join("")}</select></label></div>
    <div id="albumCustomPhraseField" hidden><label for="albumCustomPhrase">Tu frase (máximo 100 caracteres)</label>
      <input id="albumCustomPhrase" type="text" maxlength="100" placeholder="Escribe una frase para este mes…" oninput="updateCollageFrame()"></div>
    <div id="albumFrameSample" class="album-frame-sample"></div>
    <fieldset class="album-options"><legend>Elige de 1 a 12 fotos</legend><div id="albumPhotoList" class="album-photo-list"></div></fieldset>
    <button class="btn primary" type="button" onclick="runAlbumExport('collage')">Descargar collage PNG</button>
    <p id="albumStatus" role="status"></p>`;
  renderCollagePhotos();
}

function selectedCollagePhrase() {
  const choice = $("albumCollagePhrase").value;
  return choice === ""
    ? $("albumCustomPhrase").value.trim()
    : collagePhrases[Number(choice)];
}

function updateCollageFrame() {
  $("albumCustomPhraseField").hidden = $("albumCollagePhrase").value !== "";
  const sample = $("albumFrameSample");
  const frame = albumFrames[$("albumCollageFrame").value];
  sample.style.cssText = `background:${frame.paper};color:${frame.ink};border-color:${frame.trim}`;
  sample.textContent =
    "Nuestro Calendario #21 · " +
    albumMonthLabel($("albumCollageMonth").value) +
    " · " +
    (selectedCollagePhrase() || "Tu frase aparecerá aquí");
}

function renderCollagePhotos() {
  const month = $("albumCollageMonth").value;
  const photos = advCache.memories.filter(
    (m) => m.photo_url && m.memory_date?.startsWith(month),
  );
  $("albumPhotoList").innerHTML = photos.length
    ? photos
        .map(
          (m) => `<label class="album-photo-option">
    <img loading="lazy" data-memory-path="${esc(m.photo_url)}" alt="">
    <span><input type="checkbox" name="album-photo" value="${esc(m.id)}"> ${esc(m.title)}</span></label>`,
        )
        .join("")
    : "<p>Este mes todavía no tiene recuerdos con foto.</p>";
  hydrateMemoryImages();
  updateCollageFrame();
}

function albumCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function albumPhoto(memory) {
  if (!memory.photo_url) return null;
  const url = await memoryImageUrl(memory.photo_url);
  if (!url) throw new Error("Foto sin enlace");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Foto no disponible");
  return createImageBitmap(await response.blob());
}

function albumText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && ctx.measureText(line + " " + word).width > maxWidth) {
        lines.push(line);
        line = "";
      }
      const separator = line ? " " : "";
      line += separator + word;
      while (ctx.measureText(line).width > maxWidth) {
        let end = 1;
        while (
          end < line.length &&
          ctx.measureText(line.slice(0, end + 1)).width <= maxWidth
        )
          end++;
        lines.push(line.slice(0, end));
        line = line.slice(end);
      }
    }
    lines.push(line);
  }
  if (y == null) return lines;
  lines
    .slice(0, maxLines)
    .forEach((line, index) =>
      ctx.fillText(
        index === maxLines - 1 && lines.length > maxLines
          ? line.trimEnd() + "…"
          : line,
        x,
        y + index * lineHeight,
        maxWidth,
      ),
    );
  return lines;
}

function paintAlbumFrame(ctx, frame) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = frame.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = frame.trim;
  ctx.lineWidth = 3;
  ctx.strokeRect(29, 29, width - 58, height - 58);
  ctx.lineWidth = 1;
  ctx.strokeRect(39, 39, width - 78, height - 78);
  ctx.fillStyle = frame.ink;
}

function paintAlbumImage(ctx, bitmap, x, y, width, height, cover = false) {
  const scale = (cover ? Math.max : Math.min)(
    width / bitmap.width,
    height / bitmap.height,
  );
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(bitmap, x + (width - w) / 2, y + (height - h) / 2, w, h);
  ctx.restore();
}

function encodeAlbumCanvas(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("No se pudo generar el archivo")),
      type,
      quality,
    ),
  );
}

// Each JPEG is embedded as a full A4 page. Byte offsets are measured after encoding.
function makeAlbumPdf(pages) {
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [0];
  let length = 0;
  const append = (chunk) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.byteLength;
  };
  const object = (number, body, stream) => {
    offsets[number] = length;
    append(number + " 0 obj\n" + body);
    if (stream) {
      append("\nstream\n");
      append(stream);
      append("\nendstream");
    }
    append("\nendobj\n");
  };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => 3 + i * 3 + " 0 R").join(" ")}] >>`,
  );
  pages.forEach(({ bytes, width, height }, index) => {
    const id = 3 + index * 3;
    const command = encoder.encode("q 595 0 0 842 0 0 cm /Photo Do Q");
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Photo ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    );
    object(
      id + 1,
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.byteLength} >>`,
      bytes,
    );
    object(id + 2, `<< /Length ${command.byteLength} >>`, command);
  });
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets
    .slice(1)
    .forEach((offset) =>
      append(String(offset).padStart(10, "0") + " 00000 n \n"),
    );
  append(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );
  return new Blob(parts, { type: "application/pdf" });
}

function albumPage(ctx, number, section) {
  paintAlbumFrame(ctx, albumFrames.rose);
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("NUESTRO CALENDARIO #21", 72, 98);
  ctx.font = "19px sans-serif";
  ctx.fillText(section, 72, 1196);
  ctx.textAlign = "right";
  ctx.fillText(String(number).padStart(2, "0"), 828, 1196);
  ctx.textAlign = "left";
}

function albumHeading(ctx, title, y) {
  ctx.font = "bold 53px Georgia, serif";
  const lines = albumText(ctx, title, 72, y, 756, 61, 3);
  return y + Math.min(3, lines.length) * 61;
}

async function buildMemoryAlbum(
  groups,
  progress,
  stillSignedIn,
  title = "Todo lo que vivimos",
  dedication = "A veces, lo más bonito de un día es recordarlo juntos.",
  section = "Álbum de recuerdos",
) {
  const canvas = albumCanvas(900, 1273);
  const ctx = canvas.getContext("2d");
  const pages = [];
  let missing = 0;
  const addPage = async () => {
    const image = await encodeAlbumCanvas(canvas, "image/jpeg", 0.88);
    pages.push({
      bytes: await image.arrayBuffer(),
      width: canvas.width,
      height: canvas.height,
    });
  };
  const count = groups.reduce((sum, [, memories]) => sum + memories.length, 0);
  albumPage(ctx, 1, section);
  ctx.fillStyle = "#b56874";
  ctx.font = "96px Georgia, serif";
  ctx.fillText("♡", 70, 405);
  ctx.fillStyle = albumFrames.rose.ink;
  albumHeading(ctx, title, 510);
  ctx.font = "30px Georgia, serif";
  albumText(
    ctx,
    dedication,
    72,
    700,
    700,
    43,
    8,
  );
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(
    `${groups.length} ${groups.length === 1 ? "mes" : "meses"} · ${count} ${section === 'Libro de nuestra vida' ? (count===1?'momento':'momentos') : (count===1?'recuerdo':'recuerdos')}`,
    72,
    1050,
  );
  ctx.font = "22px sans-serif";
  const first = albumMonthLabel(groups[0][0]);
  const last = albumMonthLabel(groups.at(-1)[0]);
  albumText(
    ctx,
    first === last ? first : `${first} — ${last}`,
    72,
    1094,
    756,
    34,
  );
  await addPage();
  let index = 0;
  for (const [month, memories] of groups) {
    const label = albumMonthLabel(month);
    const photos = memories.filter((m) => m.photo_url).length;
    albumPage(ctx, pages.length + 1, "Capítulo del mes");
    const y = albumHeading(ctx, label[0].toUpperCase() + label.slice(1), 390);
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(
      `${memories.length} ${section === 'Libro de nuestra vida' ? (memories.length===1?'momento':'momentos') : (memories.length===1?'recuerdo':'recuerdos')} · ${photos} ${photos === 1 ? "foto" : "fotos"}`,
      72,
      y + 32,
    );
    ctx.font = "italic 33px Georgia, serif";
    albumText(
      ctx,
      albumPhrases[(Number(month.slice(5)) - 1) % albumPhrases.length],
      72,
      y + 120,
      700,
      47,
    );
    ctx.font = "24px sans-serif";
    albumText(
      ctx,
      `Guardamos ${memories.length === 1 ? "un instante de este mes que merece" : "instantes de este mes que merecen"} volver a vivirse, aunque sea pasando estas páginas.`,
      72,
      y + 290,
      705,
      36,
    );
    await addPage();
    for (const memory of memories) {
      if (!stillSignedIn())
        throw new Error("La sesión cambió durante la exportación.");
      progress(`Preparando recuerdo ${++index} de ${count}…`);
      albumPage(ctx, pages.length + 1, label);
      const top = albumHeading(ctx, memory.title, 190);
      ctx.font = "22px sans-serif";
      const meta = [
        dateES(memory.memory_date),
        memory.location ||
          advCache.places.find((p) => p.id === memory.place_id)?.name,
      ]
        .filter(Boolean)
        .join(" · ");
      albumText(ctx, meta, 72, top - 10, 756, 30, 2);
      let textY = top + 66;
      try {
        const photo = await albumPhoto(memory);
        if (photo) {
          try {
            paintAlbumImage(ctx, photo, 72, textY, 756, 490);
          } finally {
            photo.close();
          }
          textY += 540;
        }
      } catch {
        missing++;
        ctx.fillStyle = "#754552";
        ctx.fillText("Foto no disponible", 72, textY);
        textY += 52;
      }
      ctx.fillStyle = albumFrames.rose.ink;
      ctx.font = "26px Georgia, serif";
      const lines = albumText(ctx, memory.description || "", 72, null, 756, 38);
      while (lines.length) {
        const amount = Math.max(1, 1 + Math.floor((1130 - textY) / 38));
        lines
          .splice(0, amount)
          .forEach((line, n) => ctx.fillText(line, 72, textY + n * 38));
        await addPage();
        if (!lines.length) break;
        albumPage(ctx, pages.length + 1, label);
        ctx.font = "italic 25px Georgia, serif";
        albumText(ctx, memory.title + " · continuación", 72, 175, 756, 34, 2);
        ctx.font = "26px Georgia, serif";
        textY = 265;
      }
    }
  }
  return { blob: makeAlbumPdf(pages), missing };
}

async function buildMemoryCollage(
  memories,
  month,
  frame,
  phrase,
  progress,
  stillSignedIn,
) {
  const width = 1800;
  const columns = memories.length === 1 ? 1 : memories.length <= 4 ? 2 : 3;
  const rows = Math.ceil(memories.length / columns);
  const gap = 22;
  const margin = 72;
  const tileWidth = (width - 2 * margin - gap * (columns - 1)) / columns;
  const tileHeight = Math.min(1040, tileWidth * 0.87);
  const photoTop = 244;
  const footer = photoTop + rows * (tileHeight + gap) - gap + 118;
  const canvas = albumCanvas(width, Math.ceil(footer + 238));
  const ctx = canvas.getContext("2d");
  paintAlbumFrame(ctx, frame);
  ctx.textAlign = "center";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("NUESTRO CALENDARIO #21", width / 2, 93);
  const label = albumMonthLabel(month);
  ctx.font = "bold 77px Georgia, serif";
  ctx.fillText(label[0].toUpperCase() + label.slice(1), width / 2, 189);
  for (const [i, memory] of memories.entries()) {
    if (!stillSignedIn())
      throw new Error("La sesión cambió durante la exportación.");
    progress(`Preparando foto ${i + 1} de ${memories.length}…`);
    let photo;
    try {
      photo = await albumPhoto(memory);
      const row = Math.floor(i / columns);
      const count = Math.min(columns, memories.length - row * columns);
      const x =
        (width - (count * tileWidth + (count - 1) * gap)) / 2 +
        (i % columns) * (tileWidth + gap);
      paintAlbumImage(
        ctx,
        photo,
        x,
        photoTop + row * (tileHeight + gap),
        tileWidth,
        tileHeight,
        memories.length > 1,
      );
    } catch {
      throw new Error(
        `No se pudo abrir «${memory.title}». Vuelve a intentar o elige otra foto.`,
      );
    } finally {
      photo?.close();
    }
  }
  ctx.fillStyle = frame.trim;
  ctx.fillRect(width / 2 - 82, footer - 66, 164, 3);
  ctx.fillStyle = frame.ink;
  ctx.font = "italic 49px Georgia, serif";
  albumText(ctx, phrase, width / 2, footer, width - 180, 55, 3);
  ctx.globalAlpha = 0.7;
  ctx.font = "26px sans-serif";
  ctx.fillText(
    "Nuestro Calendario #21  ·  " + label,
    width / 2,
    canvas.height - 86,
  );
  return encodeAlbumCanvas(canvas, "image/png");
}

async function runAlbumExport(mode) {
  const panel = $("albumOptions");
  if (panel.dataset.busy) return;
  const status = $("albumStatus");
  const progress = (message) => {
    status.textContent = message;
  };
  const session = user?.id;
  const space = couple?.id;
  const stillSignedIn = () =>
    !!session &&
    !!space &&
    session === user?.id &&
    space === couple?.id &&
    panel.isConnected;
  const controls = Array.from(panel.querySelectorAll("button, input, select"));
  panel.dataset.busy = "true";
  controls.forEach((control) => {
    control.disabled = true;
  });
  try {
    let blob,
      filename,
      missing = 0;
    if (mode === "pdf") {
      const selected = [
        ...panel.querySelectorAll('[name="album-month"]:checked'),
      ]
        .map((item) => item.value)
        .sort();
      if (!selected.length) throw new Error("Selecciona al menos un mes.");
      const groups = selected.map((month) => [
        month,
        advCache.memories
          .filter((m) => m.memory_date?.startsWith(month))
          .sort((a, b) => a.memory_date.localeCompare(b.memory_date)),
      ]);
      ({ blob, missing } = await buildMemoryAlbum(
        groups,
        progress,
        stillSignedIn,
      ));
      filename = `nuestro-calendario-${selected[0]}${selected.length > 1 ? "-a-" + selected.at(-1) : ""}.pdf`;
    } else {
      const month = $("albumCollageMonth").value;
      const selected = new Set(
        [...panel.querySelectorAll('[name="album-photo"]:checked')].map(
          (item) => item.value,
        ),
      );
      if (selected.size < 1 || selected.size > 12)
        throw new Error("Selecciona entre 1 y 12 fotos.");
      const photos = advCache.memories.filter(
        (m) =>
          selected.has(m.id) && m.photo_url && m.memory_date?.startsWith(month),
      );
      if (photos.length !== selected.size)
        throw new Error("La lista de fotos cambió. Elige las fotos de nuevo.");
      const phrase = selectedCollagePhrase();
      if (!phrase) throw new Error("Escribe una frase para tu collage.");
      blob = await buildMemoryCollage(
        photos,
        month,
        albumFrames[$("albumCollageFrame").value],
        phrase,
        progress,
        stillSignedIn,
      );
      filename = `collage-${month}.png`;
    }
    if (!stillSignedIn()) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    progress(
      missing
        ? `Álbum descargado. ${missing} foto(s) no se pudieron incluir.`
        : "Descarga lista.",
    );
  } catch (error) {
    progress(error.message);
  } finally {
    delete panel.dataset.busy;
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}
