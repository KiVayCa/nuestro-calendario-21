async function forgotPassword() {
  const email = $("email").value.trim().toLowerCase();

  if (!email) {
    setMsg("Escribe primero tu correo.");

    return;
  }

  try {
    const { error } = await sb.auth.resetPasswordForEmail(
      email,

      {
        redirectTo: "https://nuestrocalendario21.vercel.app/",
      },
    );

    if (error) {
      console.error(error);

      setMsg("No pudimos enviar el correo de recuperación.");

      return;
    }

    setMsg("Te enviamos un correo para recuperar tu contraseña ❤️", true);
  } catch (err) {
    console.error(err);

    setMsg("No pudimos enviar el correo de recuperación.");
  }
}

function budgetProfiles() {
  const ps = coupleProfiles || [];
  const ana =
    ps.find((p) => (p.display_name || "").toLowerCase().includes("ana")) ||
    ps[0];
  const nico =
    ps.find((p) => (p.display_name || "").toLowerCase().includes("nicol")) ||
    ps.find((p) => p.user_id !== ana?.user_id) ||
    ps[1];
  return [
    { id: ana?.user_id, name: ana?.display_name || "Ana María", key: "ana" },
    {
      id: nico?.user_id,
      name: nico?.display_name || "Nicolás",
      key: "nicolas",
    },
  ].filter((p, i, a) => p.id && a.findIndex((q) => q.id === p.id) === i);
}

function defaultDisplayName() {
  const e = (user?.email || "").toLowerCase();
  if (e.includes("anamariagarciazapata3")) return "Ana María";
  if (e.includes("nickolasmorales82") || e.includes("nickodavid"))
    return "Nicolás";
  return (user?.email || "").split("@")[0] || "Usuario";
}

async function loadProfiles() {
  if (!user || !couple) return;
  let { data } = await sb
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) {
    const { data: created } = await sb
      .from("user_profiles")
      .upsert(
        { user_id: user.id, display_name: defaultDisplayName() },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    data = created;
  }
  myProfile = {
    ...myProfile,
    ...(data || {}),
    display_name: data?.display_name || defaultDisplayName(),
  };
  const { data: members } = await sb
    .from("couple_members")
    .select("user_id,display_name")
    .eq("couple_id", couple.id);
  const ids = (members || []).map((x) => x.user_id);
  if (ids.length) {
    const r = await sb.from("user_profiles").select("*").in("user_id", ids);
    coupleProfiles = r.data || [];
  }
  const chip = $("profileChipName");
  if (chip) chip.textContent = myProfile.display_name || defaultDisplayName();
}

function activityCountsFor(uid) {
  const sources = {
    plans: plans || [],
    memories: advCache.memories || [],
    love_letters: advCache.letters || [],
    dreams: advCache.dreams || [],
    challenges: advCache.challenges || [],
    important_dates: advCache.dates || [],
    goals: advCache.goals || [],
    places: advCache.places || [],
    activity_ideas: advCache.ideas || [],
  };
  const out = {};
  Object.entries(sources).forEach(([table, rows]) => {
    out[table] = rows.filter((row) => row.created_by === uid).length;
  });
  return out;
}

function renderProfileActivitySummary() {
  const target = $("coupleActivitySummary");
  if (!target) return;
  const others = (coupleProfiles || []).filter((p) => p.user_id !== user?.id);
  target.innerHTML = others.length
    ? others
        .map((p) => {
          const c = activityCountsFor(p.user_id),
            n = Object.values(c).reduce((a, b) => a + b, 0);
          return (
            '<div class="advItem"><div><div class="advItemTitle">' +
            esc(p.display_name || "Tu persona ❤️") +
            '</div><div class="advMeta">' +
            c.plans +
            " planes · " +
            c.memories +
            " recuerdos · " +
            c.love_letters +
            " cartas · " +
            n +
            " aportaciones</div></div></div>"
          );
        })
        .join("")
    : '<div class="advEmpty">Aún no hay otro perfil vinculado.</div>';
}

function refreshProfilePanelFromCache() {
  if (!$("profileModal")?.classList.contains("show")) return;
  const name = myProfile.display_name || defaultDisplayName();
  const heading = $("profileDisplayNameHeading");
  if (heading) heading.textContent = name;
  const nameInput = $("profileName");
  if (nameInput && document.activeElement !== nameInput) nameInput.value = name;
  const bioInput = $("profileBio");
  if (bioInput && document.activeElement !== bioInput)
    bioInput.value = myProfile.bio || "";
  const bioText = $("profileBioPreview");
  if (bioText) bioText.textContent = myProfile.bio || "Sin biografía todavía.";
  const counts = activityCountsFor(user.id),
    total = Object.values(counts).reduce((a, b) => a + b, 0);
  const values = {
    plans: counts.plans,
    memories: counts.memories,
    letters: counts.love_letters,
    total,
  };
  Object.entries(values).forEach(([key, value]) => {
    const el = $("profileCount" + key[0].toUpperCase() + key.slice(1));
    if (el) el.textContent = String(value);
  });
  renderProfileActivitySummary();
}

function openProfilePanel() {
  if (!user || !couple) return;
  const body = $("profileModalBody"),
    modal = $("profileModal");
  if (!body || !modal) return;
  const counts = activityCountsFor(user.id),
    total = Object.values(counts).reduce((a, b) => a + b, 0);
  body.innerHTML = `<div class="profileHero"><img id="profileAvatarPreview" class="profileAvatar" src="pareja.jpeg" alt="Foto de perfil" loading="lazy"><div><h3 id="profileDisplayNameHeading" style="margin:0;color:var(--ink)">${esc(myProfile.display_name || defaultDisplayName())}</h3><p style="margin:5px 0;color:var(--muted)">${esc(user.email || "")}</p><p id="profileBioPreview" style="margin:8px 0 0;color:var(--muted)">${esc(myProfile.bio || "Sin biografía todavía.")}</p></div></div>
  <div class="profileGrid"><div class="profileStat"><strong id="profileCountPlans">${counts.plans}</strong><span>planes creados</span></div><div class="profileStat"><strong id="profileCountMemories">${counts.memories}</strong><span>recuerdos</span></div><div class="profileStat"><strong id="profileCountLetters">${counts.love_letters}</strong><span>cartas</span></div><div class="profileStat"><strong id="profileCountTotal">${total}</strong><span>aportaciones a nuestro espacio</span></div></div>
  <div class="settingsCard" style="margin-top:16px"><h3>👤 Mis datos</h3><div class="advFormGrid"><div class="field"><label>Nombre</label><input id="profileName" value="${esc(myProfile.display_name || "")}"></div><div class="field"><label>Correo</label><input value="${esc(user.email || "")}" disabled></div></div><div class="field"><label>Sobre mí</label><textarea id="profileBio" placeholder="Una frase, apodo o lo que quieras...">${esc(myProfile.bio || "")}</textarea></div><div class="field"><label>Foto de perfil</label><input id="profilePhotoInput" type="file" accept="image/*"></div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn" onclick="changePassword()">🔐 Cambiar contraseña</button><button class="btn primary" onclick="saveMyProfile()">Guardar perfil ❤️</button><button class="btn danger" onclick="logout()">🚪 Cerrar sesión</button></div><div id="profileMsg" class="settingsNote hidden"></div></div>
  <div class="settingsCard" style="margin-top:16px"><h3>👩‍❤️‍👨 Nuestra actividad</h3><div id="coupleActivitySummary" class="advList"><div class="advEmpty">Cargando...</div></div></div>`;
  modal.classList.remove("is-closing");
  modal.classList.add("show");
  renderProfileActivitySummary();
  if (myProfile.user_id !== user.id) {
    loadProfiles()
      .then(() => refreshProfilePanelFromCache())
      .catch((err) => console.warn("No se pudo actualizar el perfil:", err));
  }
  if (myProfile.avatar_path) {
    profileAvatarUrl(myProfile.avatar_path)
      .then((url) => {
        const img = $("profileAvatarPreview");
        if (url && img && modal.classList.contains("show")) img.src = url;
      })
      .catch(() => {});
  }
}

function closeProfilePanel() {
  const modal = $("profileModal");
  if (!modal || !modal.classList.contains("show")) return;
  modal.classList.add("is-closing");
  window.setTimeout(() => {
    if (modal.classList.contains("is-closing"))
      modal.classList.remove("show", "is-closing");
  }, 210);
}

async function saveMyProfile() {
  const name = $("profileName")?.value.trim() || defaultDisplayName(),
    bio = $("profileBio")?.value.trim() || null;
  let avatar_path = myProfile.avatar_path;
  const f = $("profilePhotoInput")?.files?.[0];
  if (f) {
    if (!f.type.startsWith("image/"))
      return appAlert("Selecciona una imagen válida.");
    if (f.size > 8 * 1024 * 1024)
      return appAlert("La foto debe pesar menos de 8 MB.");
    const path = `${couple.id}/profiles/${user.id}-${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await sb.storage
      .from("couple-media")
      .upload(path, f, { upsert: false });
    if (up.error)
      return appAlert("No se pudo subir la foto: " + up.error.message);
    if (avatar_path)
      await sb.storage.from("couple-media").remove([avatar_path]);
    avatar_path = path;
  }
  const { data, error } = await sb
    .from("user_profiles")
    .upsert(
      { user_id: user.id, display_name: name, bio, avatar_path },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) return appAlert("No se pudo guardar el perfil: " + error.message);
  myProfile = { ...myProfile, ...data };
  const chip = $("profileChipName");
  if (chip) chip.textContent = name;
  const msg = $("profileMsg");
  if (msg) {
    msg.textContent = "✅ Perfil guardado.";
    msg.classList.remove("hidden");
  }
  await loadProfiles();
  await renderAdvanced();
}

async function changePassword() {
  const pass = await appPrompt(
    "Escribe tu nueva contraseña (mínimo 6 caracteres):",
  );
  if (pass === null) return;
  if (pass.length < 6)
    return appAlert("La contraseña debe tener al menos 6 caracteres.");
  const { error } = await sb.auth.updateUser({ password: pass });
  if (error)
    return appAlert("No se pudo cambiar la contraseña: " + error.message);
  appAlert("✅ Contraseña actualizada correctamente.");
}
