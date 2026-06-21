/* =============================================================
   app.js — Grand livre (budget personnel)
   Logique : registre des postes, tableau de bord, vue mensuelle
   éditable, banque de tags, stockage local (navigateur), import &
   sauvegarde. Aucune donnée ne quitte le navigateur.
   ============================================================= */
(function () {
  "use strict";

  /* ---------- Constantes ---------- */
  const MOIS = ["janvier","février","mars","avril","mai","juin",
                "juillet","août","septembre","octobre","novembre","décembre"];

  // Registre des postes : libellé + groupe. Toutes années confondues.
  // groupe : "revenu" | "besoin" | "desir" | "epargne"
  const POSTES = {
    // Revenus
    salaire:        { label: "Salaire (mois précédent)", groupe: "revenu" },
    apl:            { label: "APL",                        groupe: "revenu" },
    prime:          { label: "Prime d'activité",          groupe: "revenu" },
    mobilijeune:    { label: "Mobilijeune / aide",        groupe: "revenu" },
    exceptionnel:   { label: "Exceptionnel",              groupe: "revenu" },
    autre:          { label: "Autre / aides",             groupe: "revenu" },
    // Besoins
    courses:        { label: "Courses",                   groupe: "besoin" },
    abonnements:    { label: "Abonnements divers",        groupe: "besoin" },
    loyer:          { label: "Loyer Cc",                  groupe: "besoin" },
    medic:          { label: "Médical (kiné, ysp)",       groupe: "besoin" },
    // Désirs
    empruntAssu:    { label: "Emprunt + assurance",       groupe: "desir" },
    camionAssu:     { label: "Camion + assurance auto",   groupe: "desir" },
    tanSncf:        { label: "Tan + SNCF",                groupe: "desir" },
    sorties:        { label: "Sorties, meubles, voyages", groupe: "desir" },
    essence:        { label: "Essence (+ médical)",       groupe: "desir" },
    velo:           { label: "Vélo / ordi",               groupe: "desir" },
    divers:         { label: "Divers",                    groupe: "desir" },
    // Épargne
    ldds:           { label: "LDDS",                      groupe: "epargne" },
    pea:            { label: "PEA",                        groupe: "epargne" },
    epargnePilotee: { label: "Épargne pilotée",           groupe: "epargne" },
    pee:            { label: "PEE",                        groupe: "epargne" },
    assuranceVie:   { label: "Assurance vie",             groupe: "epargne" },
    lclCoinbase:    { label: "LCL / Coinbase",            groupe: "epargne" },
    lep:            { label: "LEP",                        groupe: "epargne" },
    cel:            { label: "CEL",                        groupe: "epargne" },
    pel:            { label: "PEL",                        groupe: "epargne" },
    economie:       { label: "Économie + Pro",            groupe: "epargne" },
  };

  const GROUPES = {
    revenu:  { label: "Revenus",  pct: null },
    besoin:  { label: "Besoins",  pct: 50 },
    desir:   { label: "Désirs",   pct: 30 },
    epargne: { label: "Épargne",  pct: 20 },
  };

  // Banque de tags initiale par poste (réutilisable, enrichie à la volée)
  const TAGS_SEED = {
    courses:     ["Carrefour","Super U","Leclerc","Monoprix","TGTG","Icee","Naturalia","Biocoop","Lidl","Boulangerie"],
    abonnements: ["YouTube","Keepcool","Mint","Prixtel","Bourso","Alabri","Libé","Disney","Brief.me"],
    medic:       ["Kiné","Ostéo","Médecin","Pharmacie","Ophtalmo"],
    sorties:     ["Restau","Bar","Escalade","Voyage","Décathlon","Fnac","Cinéma","FDJ","Cadeau"],
    tanSncf:     ["TAN","SNCF"],
    essence:     ["Essence"],
    divers:      ["Pharma","Cadeau","Vélo","Brico","Vap"],
  };

  /* ---------- Stockage local ---------- */
  const K = { overlays: "gl_overlays_v1", tags: "gl_tags_v1", bank: "gl_tagbank_v1" };
  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("Stockage indisponible", e); } };

  let overlays = load(K.overlays, {});   // overlays[year][posteId][monthIdx] = nombre
  let tags     = load(K.tags, {});        // tags[year][monthIdx][posteId] = { "Carrefour": 30, ... }
  let tagBank  = load(K.bank, {});        // tagBank[posteId] = ["Carrefour", ...]

  // Amorcer la banque avec les graines si vide
  Object.keys(TAGS_SEED).forEach(id => { if (!tagBank[id]) tagBank[id] = TAGS_SEED[id].slice(); });
  save(K.bank, tagBank);

  /* ---------- État courant ---------- */
  const annees = Object.keys(window.BUDGET_DATA || {}).map(Number).sort((a,b)=>a-b);
  let anneeCourante = annees[annees.length - 1];
  let moisCourant = 0;

  /* ---------- Helpers de valeurs ---------- */
  const fmtNb = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  function fmt(n) { return (n === null || n === undefined || isNaN(n)) ? "" : fmtNb.format(Math.round(n)) + " €"; }
  function signe(n) { return n > 0 ? "pos" : n < 0 ? "neg" : ""; }

  // Valeur de base issue du tableur (peut être null = non suivi)
  function base(year, id, m) {
    const d = window.BUDGET_DATA[year];
    if (!d || !d.lignes[id]) return null;
    return d.lignes[id][m];
  }
  // Y a-t-il une superposition utilisateur ?
  function hasOverlay(year, id, m) {
    return overlays[year] && overlays[year][id] && overlays[year][id][m] !== undefined;
  }
  // Somme des tags chiffrés pour un poste/mois
  function tagsSum(year, m, id) {
    const t = tags[year] && tags[year][m] && tags[year][m][id];
    if (!t) return null;
    let s = 0, any = false;
    Object.values(t).forEach(v => { if (typeof v === "number" && !isNaN(v)) { s += v; any = true; } });
    return any ? s : null;
  }
  // Valeur effective : overlay > base (les tags ne s'appliquent que si tu cliques « appliquer »)
  function val(year, id, m) {
    if (hasOverlay(year, id, m)) return overlays[year][id][m];
    const b = base(year, id, m);
    return b === null ? 0 : b;
  }
  // Pour l'affichage : distingue null (non suivi) de 0
  function valDisplay(year, id, m) {
    if (hasOverlay(year, id, m)) return overlays[year][id][m];
    return base(year, id, m);
  }

  function setOverlay(year, id, m, n) {
    overlays[year] = overlays[year] || {};
    overlays[year][id] = overlays[year][id] || {};
    overlays[year][id][m] = n;
    save(K.overlays, overlays);
  }
  function clearOverlay(year, id, m) {
    if (hasOverlay(year, id, m)) { delete overlays[year][id][m]; save(K.overlays, overlays); }
  }

  function postesDuGroupe(g) { return Object.keys(POSTES).filter(id => POSTES[id].groupe === g); }

  // Total d'un groupe sur un mois
  function totalGroupeMois(year, g, m) {
    return postesDuGroupe(g).reduce((s, id) => s + val(year, id, m), 0);
  }
  // Total d'un groupe sur l'année
  function totalGroupeAnnee(year, g) {
    let s = 0;
    for (let m = 0; m < 12; m++) s += totalGroupeMois(year, g, m);
    return s;
  }
  // Un poste est-il utilisé cette année (présent en base ou en overlay) ?
  function posteUtilise(year, id) {
    const d = window.BUDGET_DATA[year];
    const enBase = d && d.lignes[id] && d.lignes[id].some(v => v !== null && v !== 0);
    const enOv = overlays[year] && overlays[year][id] && Object.keys(overlays[year][id]).length;
    return enBase || enOv;
  }

  /* ====================================================================
     RENDU — Tableau de bord
     ==================================================================== */
  function renderDashboard() {
    const year = anneeCourante;
    const rev = totalGroupeAnnee(year, "revenu");
    const bes = totalGroupeAnnee(year, "besoin");
    const des = totalGroupeAnnee(year, "desir");
    const epa = totalGroupeAnnee(year, "epargne");
    const solde = rev - bes - des - epa;
    const pct = x => rev > 0 ? Math.round((x / rev) * 100) : 0;

    const kpi = (cls, label, value, sub) => `
      <div class="kpi kpi--${cls}">
        <div class="kpi__label">${label}</div>
        <div class="kpi__value num ${signe(value)}">${fmt(value)}</div>
        <div class="kpi__sub">${sub}</div>
      </div>`;

    const kpis = `
      <div class="kpis">
        ${kpi("revenu", "Revenus " + year, rev, "Total encaissé sur l'année")}
        ${kpi("besoin", "Besoins", bes, `${pct(bes)} % des revenus · cible 50 %`)}
        ${kpi("desir", "Désirs", des, `${pct(des)} % des revenus · cible 30 %`)}
        ${kpi("epargne", "Épargne", epa, `${pct(epa)} % des revenus · cible 20 %`)}
        ${kpi(solde >= 0 ? "epargne" : "desir", "Solde annuel", solde, "Revenus − dépenses − épargne")}
      </div>`;

    el("[data-fill='dashboard']").innerHTML = kpis + ledgerAnnuel(year);
  }

  // Grand livre annuel : lignes par groupe, colonnes = 12 mois + Total
  function ledgerAnnuel(year) {
    const head = `<thead><tr><th>Poste</th>${
      MOIS.map(m => `<th>${m.slice(0,3)}</th>`).join("")
    }<th>Total</th></tr></thead>`;

    let body = "";
    ["revenu","besoin","desir","epargne"].forEach(g => {
      const ids = postesDuGroupe(g).filter(id => posteUtilise(year, id));
      if (!ids.length) return;
      body += `<tr class="group-row is-${g}"><th colspan="14">${GROUPES[g].label}</th></tr>`;
      ids.forEach(id => {
        const cells = [];
        let tot = 0;
        for (let m = 0; m < 12; m++) {
          const v = valDisplay(year, id, m);
          if (v !== null) tot += v;
          cells.push(`<td class="${signe(v||0)}">${v === null ? "" : fmt(v)}</td>`);
        }
        body += `<tr><th><span class="dot dot--${g}"></span>${POSTES[id].label}</th>${cells.join("")}<td class="${signe(tot)}">${fmt(tot)}</td></tr>`;
      });
      // Total du groupe
      const totMois = [];
      let totAn = 0;
      for (let m = 0; m < 12; m++) { const t = totalGroupeMois(year, g, m); totMois.push(t); totAn += t; }
      body += `<tr class="total-row"><th>Total ${GROUPES[g].label.toLowerCase()}</th>${
        totMois.map(t => `<td class="${signe(t)}">${fmt(t)}</td>`).join("")
      }<td class="${signe(totAn)}">${fmt(totAn)}</td></tr>`;
    });

    return `<div class="ledger-wrap"><table class="ledger">
      <caption>Grand livre ${year}</caption>${head}<tbody>${body}</tbody></table></div>`;
  }

  /* ====================================================================
     RENDU — Vue mensuelle
     ==================================================================== */
  function renderMonth() {
    const year = anneeCourante, m = moisCourant;
    const head = `
      <div class="month-head">
        <button class="month-nav" id="mPrev" aria-label="Mois précédent">‹</button>
        <span class="month-title">${MOIS[m]} ${year}</span>
        <button class="month-nav" id="mNext" aria-label="Mois suivant">›</button>
      </div>`;

    const blocs = ["revenu","besoin","desir","epargne"].map(g => {
      const ids = postesDuGroupe(g).filter(id => posteUtilise(year, id) || base(year, id, m) !== null);
      if (!ids.length) return "";
      const total = totalGroupeMois(year, g, m);
      const lignes = ids.map(id => ligneMensuelle(year, m, id, g)).join("");
      return `
        <section class="block block--${g}">
          <div class="block__head">
            <span class="block__title">${GROUPES[g].label}</span>
            <span class="block__sum num ${signe(total)}">${fmt(total)}</span>
          </div>
          ${lignes}
        </section>`;
    }).join("");

    const reel = window.BUDGET_DATA[year].soldeReel?.[m];
    const note = reel !== null && reel !== undefined
      ? `<div class="note">Solde réel du compte relevé fin ${MOIS[m]} : <strong class="num ${signe(reel)}">${fmt(reel)}</strong>.</div>`
      : "";

    el("[data-fill='month']").innerHTML = head + note + blocs;

    el("#mPrev").onclick = () => { moisCourant = (m + 11) % 12; renderMonth(); };
    el("#mNext").onclick = () => { moisCourant = (m + 1) % 12; renderMonth(); };
  }

  function ligneMensuelle(year, m, id, g) {
    const v = valDisplay(year, id, m);
    const inputVal = v === null ? "" : v;
    const reset = hasOverlay(year, id, m)
      ? `<button class="month-nav" data-reset="${id}" title="Revenir à la valeur d'origine" style="width:1.7rem;height:1.7rem">↺</button>` : "";
    return `
      <div class="line" data-line="${id}">
        <span class="line__label">${POSTES[id].label}</span>
        <span style="display:flex;gap:.35rem;align-items:center">
          ${reset}
          <input class="line__input" type="number" inputmode="decimal"
                 data-edit="${id}" value="${inputVal}" placeholder="0" aria-label="Montant ${POSTES[id].label}">
        </span>
        ${tagBank[id] || g === "besoin" || g === "desir" ? tagZone(year, m, id, g) : ""}
      </div>`;
  }

  /* ---------- Zone de tags d'un poste ---------- */
  function tagZone(year, m, id, g) {
    const bank = tagBank[id] || [];
    const actifs = (tags[year] && tags[year][m] && tags[year][m][id]) || {};
    const somme = tagsSum(year, m, id);

    const chips = bank.map(label => {
      const on = Object.prototype.hasOwnProperty.call(actifs, label);
      const amount = on && typeof actifs[label] === "number" ? actifs[label] : "";
      const inner = on
        ? `${label}<input class="tag__amt" data-tagamt="${id}|${label}" type="number" value="${amount}" placeholder="€" style="width:3.2rem;margin-left:.3rem;border:0;background:transparent;color:inherit;font-family:var(--mono);text-align:right" aria-label="Montant ${label}"><span data-tagdel="${id}|${label}" style="margin-left:.2rem;cursor:pointer">×</span>`
        : label;
      return `<button class="tag ${on ? "is-on" : ""}" data-tagtoggle="${id}|${label}">${inner}</button>`;
    }).join("");

    const appliquer = somme !== null
      ? ` <button class="tag tag--add" data-tagapply="${id}" title="Reporter la somme des tags sur la ligne">Σ ${fmt(somme)} → ligne</button>` : "";

    return `
      <div class="tagbank" style="grid-column:1/-1">
        <div class="tags tags--${g}">
          ${chips}
          <button class="tag tag--add" data-tagnew="${id}">+ tag</button>
          ${appliquer}
        </div>
      </div>`;
  }

  /* ---------- Délégation d'événements (vue mensuelle) ---------- */
  function bindMonthEvents() {
    const panel = el("#panel-month");
    panel.addEventListener("input", e => {
      const t = e.target;
      if (t.dataset.edit !== undefined) {
        const id = t.dataset.edit, raw = t.value.trim();
        if (raw === "") clearOverlay(anneeCourante, id, moisCourant);
        else setOverlay(anneeCourante, id, moisCourant, parseFloat(raw) || 0);
        refreshSums();
      }
      if (t.dataset.tagamt !== undefined) {
        const [id, label] = t.dataset.tagamt.split("|");
        const raw = t.value.trim();
        ensureTag(anneeCourante, moisCourant, id);
        tags[anneeCourante][moisCourant][id][label] = raw === "" ? null : (parseFloat(raw) || 0);
        save(K.tags, tags);
        refreshSums();
      }
    });
    panel.addEventListener("click", e => {
      const t = e.target.closest("[data-tagtoggle],[data-tagdel],[data-tagnew],[data-tagapply],[data-reset]");
      if (!t) return;

      if (t.dataset.reset !== undefined) {
        clearOverlay(anneeCourante, t.dataset.reset, moisCourant); renderMonth(); return;
      }
      if (t.dataset.tagtoggle !== undefined) {
        const [id, label] = t.dataset.tagtoggle.split("|");
        ensureTag(anneeCourante, moisCourant, id);
        const bag = tags[anneeCourante][moisCourant][id];
        if (Object.prototype.hasOwnProperty.call(bag, label)) delete bag[label];
        else bag[label] = null;
        save(K.tags, tags); renderMonth(); return;
      }
      if (t.dataset.tagdel !== undefined) {
        const [id, label] = t.dataset.tagdel.split("|");
        if (tags[anneeCourante]?.[moisCourant]?.[id]) { delete tags[anneeCourante][moisCourant][id][label]; save(K.tags, tags); renderMonth(); }
        return;
      }
      if (t.dataset.tagnew !== undefined) {
        const id = t.dataset.tagnew;
        const label = (prompt("Nom du nouveau tag pour « " + POSTES[id].label + " » :") || "").trim();
        if (label) {
          tagBank[id] = tagBank[id] || [];
          if (!tagBank[id].includes(label)) tagBank[id].push(label);
          save(K.bank, tagBank);
          ensureTag(anneeCourante, moisCourant, id);
          tags[anneeCourante][moisCourant][id][label] = null;
          save(K.tags, tags); renderMonth();
        }
        return;
      }
      if (t.dataset.tagapply !== undefined) {
        const id = t.dataset.tagapply;
        const s = tagsSum(anneeCourante, moisCourant, id);
        if (s !== null) { setOverlay(anneeCourante, id, moisCourant, s); renderMonth(); }
        return;
      }
    });
  }

  function ensureTag(year, m, id) {
    tags[year] = tags[year] || {};
    tags[year][m] = tags[year][m] || {};
    tags[year][m][id] = tags[year][m][id] || {};
  }

  // Met à jour seulement les totaux affichés sans tout reconstruire
  function refreshSums() {
    els(".block").forEach(b => {
      const g = b.className.match(/block--(\w+)/)[1];
      const sum = b.querySelector(".block__sum");
      const total = totalGroupeMois(anneeCourante, g, moisCourant);
      sum.textContent = fmt(total);
      sum.className = "block__sum num " + signe(total);
    });
  }

  /* ====================================================================
     RENDU — Import & Sauvegarde
     ==================================================================== */
  function renderImport() {
    el("[data-fill='import']").innerHTML = `
      <h2>Import</h2>
      <p class="muted">Le portefeuille (export CSV Boursorama) sera branché à la prochaine étape.
         Pour l'instant, tu peux restaurer une sauvegarde du budget.</p>
      <div class="note">Astuce : pour repartir d'un appareil à l'autre, exporte une sauvegarde
         depuis l'onglet « Sauvegarde », puis restaure-la ici.</div>
      <p><input type="file" id="fileImport" accept="application/json"></p>
      <p><button class="btn" id="doImport">Restaurer la sauvegarde</button></p>
      <p id="importMsg" class="muted"></p>`;
    el("#doImport").onclick = () => {
      const f = el("#fileImport").files[0];
      if (!f) { el("#importMsg").textContent = "Choisis d'abord un fichier de sauvegarde."; return; }
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (data.overlays) { overlays = data.overlays; save(K.overlays, overlays); }
          if (data.tags)     { tags = data.tags;         save(K.tags, tags); }
          if (data.tagBank)  { tagBank = data.tagBank;   save(K.bank, tagBank); }
          el("#importMsg").textContent = "Sauvegarde restaurée.";
          renderAll();
        } catch { el("#importMsg").textContent = "Fichier illisible : ce n'est pas une sauvegarde valide."; }
      };
      r.readAsText(f);
    };
  }

  function renderBackup() {
    el("[data-fill='backup']").innerHTML = `
      <h2>Sauvegarde</h2>
      <p class="muted">Tes saisies et tes tags vivent dans ce navigateur. Exporte-les
         régulièrement pour ne rien perdre (changement d'appareil, vidage du cache…).</p>
      <p>
        <button class="btn" id="doExport">Exporter une sauvegarde</button>
        <button class="btn btn--ghost" id="doReset">Effacer mes modifications</button>
      </p>
      <p id="backupMsg" class="muted"></p>`;
    el("#doExport").onclick = () => {
      const blob = new Blob([JSON.stringify({ overlays, tags, tagBank }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `grand-livre-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      el("#backupMsg").textContent = "Sauvegarde téléchargée.";
    };
    el("#doReset").onclick = () => {
      if (!confirm("Effacer toutes tes modifications et tags ? Les données d'origine des tableurs restent intactes.")) return;
      overlays = {}; tags = {};
      save(K.overlays, overlays); save(K.tags, tags);
      el("#backupMsg").textContent = "Modifications effacées.";
      renderAll();
    };
  }

  /* ====================================================================
     Échafaudage : sélecteur d'année, onglets
     ==================================================================== */
  function renderAll() {
    renderDashboard();
    renderMonth();
    renderImport();
    renderBackup();
  }

  function initYearSelect() {
    const sel = el("#yearSelect");
    sel.innerHTML = annees.map(y => `<option value="${y}">${y}</option>`).join("");
    sel.value = anneeCourante;
    sel.onchange = () => { anneeCourante = Number(sel.value); moisCourant = 0; renderAll(); };
  }

  function initTabs() {
    els(".tab").forEach(btn => {
      btn.onclick = () => {
        els(".tab").forEach(b => b.classList.remove("is-active"));
        els(".panel").forEach(p => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        el("#panel-" + btn.dataset.tab).classList.add("is-active");
      };
    });
  }

  /* ---------- Mini-utilitaires DOM ---------- */
  function el(sel) { return document.querySelector(sel); }
  function els(sel) { return Array.from(document.querySelectorAll(sel)); }

  /* ---------- Démarrage ---------- */
  if (!annees.length) {
    el("[data-fill='dashboard']").innerHTML = "<p class='muted'>Aucune donnée chargée. Vérifie que les fichiers data-*.js sont bien présents.</p>";
    return;
  }
  initYearSelect();
  initTabs();
  bindMonthEvents();
  renderAll();

})();
