/* =============================================================
   app.js — Grand livre (budget personnel) — SOCLE (Lot A)
   Aucune donnée n'est embarquée dans le dépôt : les années sont
   importées depuis l'app et vivent dans le navigateur (localStorage).
   ============================================================= */
(function () {
  "use strict";

  /* ---------- Constantes ---------- */
  const MOIS = ["janvier","février","mars","avril","mai","juin",
                "juillet","août","septembre","octobre","novembre","décembre"];

  // Registre des postes : libellé + groupe (toutes années).
  const POSTES = {
    // Revenus
    salaire:{label:"Salaire (mois précédent)",groupe:"revenu"}, apl:{label:"APL",groupe:"revenu"},
    prime:{label:"Prime d'activité",groupe:"revenu"}, mobilijeune:{label:"Mobilijeune / aide",groupe:"revenu"},
    exceptionnel:{label:"Exceptionnel",groupe:"revenu"}, autre:{label:"Autre / aides",groupe:"revenu"},
    // Besoins
    courses:{label:"Courses",groupe:"besoin"}, abonnements:{label:"Abonnements divers",groupe:"besoin"},
    loyer:{label:"Loyer Cc",groupe:"besoin"}, medic:{label:"Médical (kiné, ysp)",groupe:"besoin"},
    // Désirs
    empruntAssu:{label:"Emprunt + assurance",groupe:"desir"}, camionAssu:{label:"Camion + assurance auto",groupe:"desir"},
    tanSncf:{label:"Tan + SNCF (+ essence)",groupe:"desir"}, sorties:{label:"Sorties, meubles, voyages",groupe:"desir"},
    essence:{label:"Essence",groupe:"desir"}, velo:{label:"Vélo / ordi",groupe:"desir"}, divers:{label:"Divers",groupe:"desir"},
    // Épargne (livrets / sûr)
    ldds:{label:"LDDS",groupe:"epargne"}, lep:{label:"LEP",groupe:"epargne"}, cel:{label:"CEL",groupe:"epargne"},
    pel:{label:"PEL",groupe:"epargne"}, pee:{label:"PEE",groupe:"epargne"}, assuranceVie:{label:"Assurance vie",groupe:"epargne"},
    epargnePilotee:{label:"Épargne pilotée",groupe:"epargne"}, economie:{label:"Économie + Pro",groupe:"epargne"},
    lcl:{label:"LCL (tampon)",groupe:"epargne"},
    // Investissement
    pea:{label:"PEA",groupe:"invest"}, coinbase:{label:"Coinbase",groupe:"invest"}, cto:{label:"CTO Bourso",groupe:"invest"},
    assuVieGreenGot:{label:"Assu-vie GreenGot",groupe:"invest"}, greengotActions:{label:"Actions Greengot",groupe:"invest"},
    lita:{label:"Lita.co solidaire",groupe:"invest"}, timeplanet:{label:"Time for the Planet",groupe:"invest"},
    per:{label:"PER",groupe:"invest"}, hoplunch:{label:"Hoplunch",groupe:"invest"},
    lclCoinbase:{label:"LCL / Coinbase",groupe:"invest"},
  };

  const GROUPES = {
    revenu:{label:"Revenus", cible:null},
    besoin:{label:"Besoins", cible:50},
    desir: {label:"Désirs",  cible:30},
    epargne:{label:"Épargne", cible:null},   // épargne + invest = 20 %
    invest:{label:"Investissement", cible:null},
  };
  const ORDRE = ["revenu","besoin","desir","epargne","invest"];

  /* ---------- Stockage local ---------- */
  const K = { years:"gl_years_v1", overlays:"gl_overlays_v1", tags:"gl_tags_v1", bank:"gl_tagbank_v1", pf:"gl_portfolio_v1" };
  const load = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("Stockage indisponible", e); } };

  let YEARS    = load(K.years, {});      // YEARS[year] = { soldeDepart, lignes:{id:[12]}, soldeReel:[12] }
  let overlays = load(K.overlays, {});
  let tags     = load(K.tags, {});
  let tagBank  = load(K.bank, {});

  /* ---------- État ---------- */
  let anneeCourante = null, moisCourant = 0;
  function refreshAnnees() {
    const ys = Object.keys(YEARS).map(Number).sort((a,b)=>a-b);
    if (!ys.includes(anneeCourante)) anneeCourante = ys[ys.length-1] ?? null;
    return ys;
  }

  /* ---------- Helpers valeurs ---------- */
  const fmtNb = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const fmt = n => (n===null||n===undefined||isNaN(n)) ? "" : fmtNb.format(Math.round(n)) + " €";
  const signe = n => n>0 ? "pos" : n<0 ? "neg" : "";

  function base(y,id,m){ const d=YEARS[y]; if(!d||!d.lignes[id]) return null; const v=d.lignes[id][m]; return v===undefined?null:v; }
  function hasOverlay(y,id,m){ return overlays[y]&&overlays[y][id]&&overlays[y][id][m]!==undefined; }
  function val(y,id,m){ if(hasOverlay(y,id,m)) return overlays[y][id][m]; const b=base(y,id,m); return b===null?0:b; }
  function valDisplay(y,id,m){ if(hasOverlay(y,id,m)) return overlays[y][id][m]; return base(y,id,m); }

  const postesGroupe = g => Object.keys(POSTES).filter(id=>POSTES[id].groupe===g);
  function totalGroupeMois(y,g,m){ return postesGroupe(g).reduce((s,id)=>s+val(y,id,m),0); }
  function totalGroupeAnnee(y,g){ let s=0; for(let m=0;m<12;m++) s+=totalGroupeMois(y,g,m); return s; }
  function posteUtilise(y,id){
    const d=YEARS[y]; const enBase=d&&d.lignes[id]&&d.lignes[id].some(v=>v!==null&&v!==0);
    const enOv=overlays[y]&&overlays[y][id]&&Object.keys(overlays[y][id]).length;
    return enBase||enOv;
  }

  /* ====================================================================
     Tableau de bord
     ==================================================================== */
  function renderDashboard() {
    const host = el("[data-fill='dashboard']");
    if (anneeCourante === null) {
      host.innerHTML = `
        <div class="empty">
          <h2>Aucune année importée</h2>
          <p>Importe une année (fichier fourni) depuis l'onglet « Données » pour commencer,<br>
             ou restaure une sauvegarde globale.</p>
          <button class="btn" id="goData">Aller à « Données »</button>
        </div>`;
      el("#goData").onclick = () => activerTab("data");
      return;
    }
    const y = anneeCourante;
    const rev = totalGroupeAnnee(y,"revenu"), bes = totalGroupeAnnee(y,"besoin"),
          des = totalGroupeAnnee(y,"desir"), epa = totalGroupeAnnee(y,"epargne"), inv = totalGroupeAnnee(y,"invest");
    const solde = rev - bes - des - epa - inv;
    const pct = x => rev>0 ? Math.round(x/rev*100) : 0;
    const kpi = (cls,label,value,sub)=>`
      <div class="kpi kpi--${cls}"><div class="kpi__label">${label}</div>
      <div class="kpi__value num ${signe(value)}">${fmt(value)}</div><div class="kpi__sub">${sub}</div></div>`;
    const kpis = `<div class="kpis">
      ${kpi("revenu","Revenus "+y,rev,"Total encaissé")}
      ${kpi("besoin","Besoins",bes,`${pct(bes)} % · cible 50 %`)}
      ${kpi("desir","Désirs",des,`${pct(des)} % · cible 30 %`)}
      ${kpi("epargne","Épargne",epa,`${pct(epa)} % des revenus`)}
      ${kpi("invest","Investissement",inv,`${pct(inv)} % des revenus`)}
      ${kpi(solde>=0?"epargne":"desir","Solde annuel",solde,"Revenus − dépenses − épargne")}
    </div>`;
    host.innerHTML = kpis + ledgerAnnuel(y) +
      `<p class="muted" style="margin-top:1rem">L'édition des budgets, la création d'année et les +/- values arrivent aux prochains lots.</p>`;
  }

  function ledgerAnnuel(y) {
    const head = `<thead><tr><th>Poste</th>${MOIS.map(m=>`<th>${m.slice(0,3)}</th>`).join("")}<th class="col-total">Total</th></tr></thead>`;
    let body = "";
    ORDRE.forEach(g => {
      const ids = postesGroupe(g).filter(id=>posteUtilise(y,id));
      if (!ids.length) return;
      body += `<tr class="group-row is-${g}"><th colspan="14">${GROUPES[g].label}</th></tr>`;
      ids.forEach(id => {
        let tot=0; const cells=[];
        for(let m=0;m<12;m++){ const v=valDisplay(y,id,m); if(v!==null) tot+=v; cells.push(`<td class="${signe(v||0)}">${v===null?"":fmt(v)}</td>`); }
        body += `<tr><th><span class="dot dot--${g}"></span>${POSTES[id].label}</th>${cells.join("")}<td class="col-total ${signe(tot)}">${fmt(tot)}</td></tr>`;
      });
      const tm=[]; let ta=0;
      for(let m=0;m<12;m++){ const t=totalGroupeMois(y,g,m); tm.push(t); ta+=t; }
      body += `<tr class="total-row"><th>Total ${GROUPES[g].label.toLowerCase()}</th>${tm.map(t=>`<td class="${signe(t)}">${fmt(t)}</td>`).join("")}<td class="col-total ${signe(ta)}">${fmt(ta)}</td></tr>`;
    });
    return `<div class="ledger-wrap"><table class="ledger"><caption>Grand livre ${y}</caption>${head}<tbody>${body}</tbody></table></div>`;
  }

  /* ====================================================================
     Placeholders (remplis aux lots suivants)
     ==================================================================== */
  function renderMonth(){ el("[data-fill='month']").innerHTML =
    anneeCourante===null ? `<div class="empty"><p>Importe d'abord une année.</p></div>`
    : `<div class="empty"><h2>Vue mensuelle</h2><p>Refonte en cours (lot D) : mois en onglets, revenus éditables, tags montant-en-face, blocs dépliables.</p></div>`; }
  function renderPortfolio(){ el("[data-fill='portfolio']").innerHTML =
    `<div class="empty"><h2>Portefeuille</h2><p>Import CSV multi-comptes (PEA, PEE, GreenGot, Coinbase…) et +/- values : lot E.</p></div>`; }
  function renderCharts(){ el("[data-fill='charts']").innerHTML =
    `<div class="empty"><h2>Graphiques</h2><p>Répartition du portefeuille, évolution de la trésorerie, projection 30 k€ : lot F.</p></div>`; }

  /* ====================================================================
     Onglet Données : import par année + sauvegarde globale
     ==================================================================== */
  function renderData() {
    const ys = Object.keys(YEARS).map(Number).sort((a,b)=>a-b);
    const annéesOptions = [];
    for (let yy=2020; yy<=2030; yy++) annéesOptions.push(`<option value="${yy}">${yy}</option>`);
    el("[data-fill='data']").innerHTML = `
      <div class="data-grid">
        <div class="data-card">
          <h3>Importer une année</h3>
          <p>Sélectionne le fichier d'année que je t'ai fourni, choisis l'année concernée, puis importe.
             Les données restent dans ce navigateur.</p>
          <div class="field">
            <input type="file" id="yearFile" accept="application/json,.json">
          </div>
          <div class="field">
            <label for="yearTarget">Année :</label>
            <select id="yearTarget">${annéesOptions.join("")}</select>
            <button class="btn" id="doYearImport">Importer cette année</button>
          </div>
          <p id="yearMsg" class="msg"></p>
          <ul class="year-list">
            ${ys.length ? ys.map(y=>`<li><span>${y}</span><button class="del" data-delyear="${y}">supprimer</button></li>`).join("") : `<li class="muted">Aucune année pour l'instant.</li>`}
          </ul>
        </div>
        <div class="data-card">
          <h3>Sauvegarde globale</h3>
          <p>Exporte tout (années, modifications, tags) dans un seul fichier. Si tu perds ton cache,
             réimporte-le ici pour tout récupérer.</p>
          <div class="field">
            <button class="btn" id="doExport">Exporter la sauvegarde</button>
          </div>
          <div class="field">
            <input type="file" id="backupFile" accept="application/json,.json">
            <button class="btn btn--ghost" id="doRestore">Restaurer</button>
          </div>
          <p id="backupMsg" class="msg"></p>
          <div class="field" style="margin-top:1rem">
            <button class="btn btn--ghost" id="doWipe">Effacer mes modifications</button>
          </div>
        </div>
      </div>`;

    // Import d'une année
    el("#doYearImport").onclick = () => {
      const f = el("#yearFile").files[0], msg = el("#yearMsg");
      if (!f) { msg.className="msg err"; msg.textContent="Choisis d'abord un fichier."; return; }
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          const obj = data.lignes ? data : (data.soldeDepart!==undefined ? data : null);
          if (!obj || !obj.lignes) throw new Error("format");
          const y = Number(el("#yearTarget").value);
          YEARS[y] = { soldeDepart: obj.soldeDepart ?? 0, lignes: obj.lignes, soldeReel: obj.soldeReel || [] };
          save(K.years, YEARS);
          anneeCourante = y; moisCourant = 0;
          msg.className="msg ok"; msg.textContent=`Année ${y} importée.`;
          initYearSelect(); renderAll();
        } catch { msg.className="msg err"; msg.textContent="Fichier illisible : ce n'est pas un fichier d'année valide."; }
      };
      r.readAsText(f);
    };
    // Préselectionner l'année si le fichier en contient une
    el("#yearFile").onchange = () => {
      const f = el("#yearFile").files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const d=JSON.parse(r.result); if (d.year) el("#yearTarget").value=String(d.year); } catch {} };
      r.readAsText(f);
    };
    // Suppression d'une année
    els("[data-delyear]").forEach(b => b.onclick = () => {
      const y = Number(b.dataset.delyear);
      if (!confirm(`Supprimer l'année ${y} de ce navigateur ? (le fichier source reste disponible pour réimport)`)) return;
      delete YEARS[y]; delete overlays[y];
      save(K.years, YEARS); save(K.overlays, overlays);
      refreshAnnees(); initYearSelect(); renderAll();
    });

    // Sauvegarde globale
    el("#doExport").onclick = () => {
      const blob = new Blob([JSON.stringify({ years:YEARS, overlays, tags, tagBank }, null, 2)], { type:"application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `grand-livre-sauvegarde-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      el("#backupMsg").className="msg ok"; el("#backupMsg").textContent="Sauvegarde téléchargée.";
    };
    el("#doRestore").onclick = () => {
      const f = el("#backupFile").files[0], msg = el("#backupMsg");
      if (!f) { msg.className="msg err"; msg.textContent="Choisis un fichier de sauvegarde."; return; }
      const r = new FileReader();
      r.onload = () => {
        try {
          const d = JSON.parse(r.result);
          if (d.years) { YEARS=d.years; save(K.years,YEARS); }
          if (d.overlays) { overlays=d.overlays; save(K.overlays,overlays); }
          if (d.tags) { tags=d.tags; save(K.tags,tags); }
          if (d.tagBank) { tagBank=d.tagBank; save(K.bank,tagBank); }
          refreshAnnees(); msg.className="msg ok"; msg.textContent="Sauvegarde restaurée.";
          initYearSelect(); renderAll();
        } catch { msg.className="msg err"; msg.textContent="Fichier de sauvegarde illisible."; }
      };
      r.readAsText(f);
    };
    el("#doWipe").onclick = () => {
      if (!confirm("Effacer tes modifications et tags ? Les années importées restent intactes.")) return;
      overlays={}; tags={}; save(K.overlays,overlays); save(K.tags,tags);
      el("#backupMsg").className="msg ok"; el("#backupMsg").textContent="Modifications effacées.";
      renderAll();
    };
  }

  /* ====================================================================
     Échafaudage : année, onglets, menu
     ==================================================================== */
  function renderAll(){ renderDashboard(); renderMonth(); renderPortfolio(); renderCharts(); renderData(); }

  function initYearSelect() {
    const ys = refreshAnnees(), sel = el("#yearSelect");
    if (!ys.length) { sel.innerHTML = `<option>—</option>`; sel.disabled = true; return; }
    sel.disabled = false;
    sel.innerHTML = ys.map(y=>`<option value="${y}">${y}</option>`).join("");
    sel.value = anneeCourante;
    sel.onchange = () => { anneeCourante = Number(sel.value); moisCourant = 0; renderAll(); };
  }

  function activerTab(name) {
    els(".tab").forEach(b=>b.classList.toggle("is-active", b.dataset.tab===name));
    els(".panel").forEach(p=>p.classList.remove("is-active"));
    el("#panel-"+name).classList.add("is-active");
  }
  function initTabs(){ els(".tab").forEach(b=> b.onclick = ()=>activerTab(b.dataset.tab)); }

  function initMenu() {
    const burger = el("#burger"), menu = el("#appmenu");
    const close = () => { menu.hidden = true; burger.classList.remove("is-open"); burger.setAttribute("aria-expanded","false"); };
    const toggle = () => { const open = menu.hidden; menu.hidden = !open; burger.classList.toggle("is-open", open); burger.setAttribute("aria-expanded", String(open)); };
    burger.onclick = e => { e.stopPropagation(); toggle(); };
    document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target) && e.target!==burger) close(); });
    document.addEventListener("keydown", e => { if (e.key==="Escape") close(); });
  }

  const el = s => document.querySelector(s);
  const els = s => Array.from(document.querySelectorAll(s));

  /* ---------- Démarrage ---------- */
  refreshAnnees();
  initMenu();
  initTabs();
  initYearSelect();
  renderAll();

})();
