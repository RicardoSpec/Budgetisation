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

  // Banque d'étiquettes par catégorie (enrichie à la volée)
  const SEED_TAGS = {
    revenu: ["APL","Prime","Remboursement","Salaire","Vente","Cadeau reçu","Exceptionnel"],
    besoin: ["Carrefour","Super U","Leclerc","Monoprix","Lidl","TGTG","Icee","Naturalia","Biocoop","Boulangerie","Loyer","Assurance","Téléphone","Électricité","Banque","Pharmacie","Kiné"],
    desir:  ["Restau","Bar","Escalade","Voyage","Décathlon","Fnac","Cinéma","FDJ","Cadeau","Essence","TAN","SNCF","Vélo"],
    epargne:["LDDS","LEP","CEL","PEL","PEE","Assurance vie","Épargne pilotée"],
    invest: ["PEA","Coinbase","CTO","Greengot","Actions Greengot","Lita","Time for the Planet","PER"],
  };
  Object.keys(SEED_TAGS).forEach(g => { if (!tagBank[g]) tagBank[g] = SEED_TAGS[g].slice(); });
  save(K.bank, tagBank);

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
  let showAllPostes = false;       // afficher aussi les postes vides (pour les remplir)
  let dashBound = false;           // délégation d'événements posée une seule fois

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

    const toolbar = `
      <div class="toolbar">
        <button class="btn" id="newYear">+ Créer une année</button>
        <label class="check"><input type="checkbox" id="showAll" ${showAllPostes?"checked":""}> Afficher tous les postes</label>
        <button class="btn btn--ghost" id="resetYear">Réinitialiser mes modifs ${y}</button>
        <span class="hint">Clique une cellule pour modifier le budget. Vide = retour à la valeur d'origine.</span>
      </div>`;

    host.innerHTML = kpis + toolbar + ledgerAnnuel(y);

    el("#newYear").onclick = creerAnnee;
    el("#showAll").onchange = e => { showAllPostes = e.target.checked; renderDashboard(); };
    el("#resetYear").onclick = () => {
      if (!overlays[y] || !Object.keys(overlays[y]).length) return;
      if (!confirm(`Effacer tes modifications de ${y} et revenir aux valeurs importées ?`)) return;
      delete overlays[y]; save(K.overlays, overlays); renderAll();
    };

    if (!dashBound) {
      dashBound = true;
      el("#panel-dashboard").addEventListener("change", e => {
        const inp = e.target.closest("input[data-cell]");
        if (!inp) return;
        const [id, mStr] = inp.dataset.cell.split("|"); const m = +mStr;
        const raw = inp.value.trim();
        if (raw === "") clearOverlay(anneeCourante, id, m);
        else setOverlay(anneeCourante, id, m, parseFloat(raw.replace(",", ".")) || 0);
        renderDashboard();
      });
    }
  }

  function setOverlay(y,id,m,n){ overlays[y]=overlays[y]||{}; overlays[y][id]=overlays[y][id]||{}; overlays[y][id][m]=n; save(K.overlays,overlays); }
  function clearOverlay(y,id,m){ if(hasOverlay(y,id,m)){ delete overlays[y][id][m]; if(!Object.keys(overlays[y][id]).length) delete overlays[y][id]; save(K.overlays,overlays); } }

  function ledgerAnnuel(y) {
    const head = `<thead><tr><th>Poste</th>${MOIS.map((m,i)=>`<th${i===moisCourant?' class="col-now"':''}>${m.slice(0,3)}</th>`).join("")}<th class="col-total">Total</th></tr></thead>`;
    let body = "";
    ORDRE.forEach(g => {
      const ids = postesGroupe(g).filter(id => showAllPostes || posteUtilise(y,id));
      if (!ids.length) return;
      body += `<tr class="group-row is-${g}"><th colspan="14">${GROUPES[g].label}</th></tr>`;
      ids.forEach(id => {
        let tot=0; const cells=[];
        for(let m=0;m<12;m++){
          const v = valDisplay(y,id,m); if(v!==null) tot+=v;
          const ov = hasOverlay(y,id,m) ? " is-edited" : "";
          cells.push(`<td class="cell${ov}"><input class="cell-input ${signe(v||0)}" data-cell="${id}|${m}" inputmode="decimal" value="${v===null?"":v}" aria-label="${POSTES[id].label} ${MOIS[m]}"></td>`);
        }
        body += `<tr><th><span class="dot dot--${g}"></span>${POSTES[id].label}</th>${cells.join("")}<td class="col-total ${signe(tot)}">${fmt(tot)}</td></tr>`;
      });
      const tm=[]; let ta=0;
      for(let m=0;m<12;m++){ const t=totalGroupeMois(y,g,m); tm.push(t); ta+=t; }
      body += `<tr class="total-row"><th>Total ${GROUPES[g].label.toLowerCase()}</th>${tm.map(t=>`<td class="${signe(t)}">${fmt(t)}</td>`).join("")}<td class="col-total ${signe(ta)}">${fmt(ta)}</td></tr>`;
    });
    return `<div class="ledger-wrap"><table class="ledger ledger--edit"><caption>Grand livre ${y} — éditable</caption>${head}<tbody>${body}</tbody></table></div>`;
  }

  // Créer une année : valeurs par défaut = moyenne mensuelle de l'an passé (objectif)
  function creerAnnee() {
    const ys = Object.keys(YEARS).map(Number).sort((a,b)=>a-b);
    const src = anneeCourante;
    const defaut = (ys.length ? Math.max(...ys) : new Date().getFullYear()) + 1;
    const saisie = prompt("Créer quelle année ? (les budgets seront initialisés sur la moyenne de "+src+")", String(defaut));
    if (!saisie) return;
    const ny = parseInt(saisie, 10);
    if (isNaN(ny)) return;
    if (YEARS[ny] && !confirm(`L'année ${ny} existe déjà. La remplacer par une base moyenne de ${src} ?`)) return;

    const lignes = {};
    Object.keys(POSTES).forEach(id => {
      if (!posteUtilise(src, id)) return;
      let s=0, n=0;
      for (let m=0;m<12;m++){ const v=valDisplay(src,id,m); if (v!==null){ s+=v; n++; } }
      if (n>0){ const moy = Math.round(s/n); lignes[id] = Array(12).fill(moy); }
    });
    const sr = YEARS[src] && YEARS[src].soldeReel || [];
    const dep = [...sr].reverse().find(v=>v!==null && v!==undefined);
    YEARS[ny] = { soldeDepart: dep ?? 0, lignes, soldeReel: [] };
    save(K.years, YEARS);
    anneeCourante = ny; moisCourant = 0;
    initYearSelect(); renderAll();
    activerTab("dashboard");
  }

  /* ====================================================================
     Placeholders (remplis aux lots suivants)
     ==================================================================== */
  /* ====================================================================
     Vue mensuelle (Lot D)
     ==================================================================== */
  const EXPANDED = new Set();   // postes dépliés (mémoire de session)
  let monthBound = false;

  function renderMonth(){
    const host = el("[data-fill='month']");
    if (anneeCourante === null) { host.innerHTML = `<div class="empty"><p>Importe d'abord une année.</p></div>`; return; }
    const y = anneeCourante, m = moisCourant;

    const chips = MOIS.map((mn,i)=>`<button class="mchip ${i===m?'is-active':''}" data-month="${i}">${mn.slice(0,3)}</button>`).join("");
    const reel = (YEARS[y].soldeReel||[])[m];
    const caption = `
      <div class="month-caption">
        <span class="month-caption__name">${MOIS[m]} ${y}</span>
        ${reel!==null&&reel!==undefined ? `<span class="month-caption__reel">solde réel fin de mois&nbsp;: <strong class="num ${signe(reel)}">${fmt(reel)}</strong></span>`:""}
        <label class="check"><input type="checkbox" id="mShowAll" ${showAllPostes?"checked":""}> tous les postes</label>
      </div>`;

    host.innerHTML = `<div class="mchips" role="tablist">${chips}</div>${caption}<div class="blocks">${ORDRE.map(g=>blockHtml(y,m,g)).join("")}</div>`;

    if (!monthBound) { monthBound = true; bindMonth(); }
  }

  function blockHtml(y,m,g){
    const ids = postesGroupe(g).filter(id => showAllPostes || posteUtilise(y,id) || base(y,id,m)!==null);
    const total = totalGroupeMois(y,g,m);
    const lines = ids.length ? ids.map(id=>lineHtml(y,m,id,g)).join("") : `<p class="muted" style="padding:.4rem .2rem">Aucun poste — coche « tous les postes » pour en ajouter.</p>`;
    return `
      <section class="mblock mblock--${g}">
        <header class="mblock__head">
          <span class="mblock__title">${GROUPES[g].label}</span>
          <span class="mblock__sum num ${signe(total)}">${fmt(total)}</span>
        </header>
        <div class="mblock__body">${lines}</div>
      </section>`;
  }

  function lineHtml(y,m,id,g){
    const v = valDisplay(y,id,m);
    const open = EXPANDED.has(id);
    const bag = (tags[y]&&tags[y][m]&&tags[y][m][id]) || {};
    const nbTags = Object.keys(bag).length;
    const edited = hasOverlay(y,id,m) ? " is-edited" : "";
    const detail = open ? tagDetail(y,m,id,g,bag) : "";
    return `
      <div class="mline${open?' is-open':''}" data-line="${id}">
        <button class="mline__chevron" data-toggle="${id}" aria-label="Détail">▸</button>
        <span class="mline__label" data-toggle="${id}">${POSTES[id].label}${nbTags?` <span class="mline__badge">${nbTags}</span>`:""}</span>
        <input class="mline__amount${edited} ${signe(v||0)}" data-amount="${id}" inputmode="decimal" value="${v===null?"":v}" aria-label="Montant ${POSTES[id].label}">
      </div>
      ${detail}`;
  }

  function tagDetail(y,m,id,g,bag){
    const entries = Object.keys(bag);
    const rows = entries.map(label=>{
      const a = bag[label];
      return `<div class="tagrow">
        <span class="tagrow__name">${label}</span>
        <input class="tagrow__amt num" data-tagamt="${id}|${label}" inputmode="decimal" value="${a===null||a===undefined?"":a}" placeholder="€">
        <button class="tagrow__del" data-tagdel="${id}|${label}" aria-label="Retirer">×</button>
      </div>`;
    }).join("");
    const somme = tagsSum(y,m,id);
    const sumLine = somme!==null ? `<div class="tagsum"><span>Σ étiquettes</span><strong class="num ${signe(somme)}">${fmt(somme)}</strong><button class="btn btn--ghost btn--xs" data-apply="${id}">appliquer au poste</button></div>` : "";
    const sugg = (tagBank[g]||[]).map(t=>`<option value="${t}">`).join("");
    return `
      <div class="tagdetail">
        ${rows || `<p class="muted" style="margin:.2rem 0">Aucune étiquette. Ajoute-en une pour ventiler ce poste.</p>`}
        ${sumLine}
        <div class="tagadd">
          <input class="tagadd__name" list="bank-${g}" data-addname="${id}" placeholder="étiquette (ex. Carrefour)">
          <datalist id="bank-${g}">${sugg}</datalist>
          <input class="tagadd__amt num" data-addamt="${id}" inputmode="decimal" placeholder="€">
          <button class="btn btn--xs" data-addbtn="${id}">+ ajouter</button>
        </div>
      </div>`;
  }

  function tagsSum(y,m,id){
    const t = tags[y]&&tags[y][m]&&tags[y][m][id]; if(!t) return null;
    let s=0, any=false; Object.values(t).forEach(v=>{ if(typeof v==="number"&&!isNaN(v)){s+=v;any=true;} }); return any?s:null;
  }
  function ensureBag(y,m,id){ tags[y]=tags[y]||{}; tags[y][m]=tags[y][m]||{}; tags[y][m][id]=tags[y][m][id]||{}; }

  function bindMonth(){
    const panel = el("#panel-month");

    panel.addEventListener("click", e => {
      const mc = e.target.closest("[data-month]");
      if (mc){ moisCourant = +mc.dataset.month; renderMonth(); return; }

      const tg = e.target.closest("[data-toggle]");
      if (tg){ const id=tg.dataset.toggle; EXPANDED.has(id)?EXPANDED.delete(id):EXPANDED.add(id); renderMonth(); return; }

      const del = e.target.closest("[data-tagdel]");
      if (del){ const [id,label]=del.dataset.tagdel.split("|"); if(tags[anneeCourante]?.[moisCourant]?.[id]){ delete tags[anneeCourante][moisCourant][id][label]; save(K.tags,tags); renderMonth(); } return; }

      const ap = e.target.closest("[data-apply]");
      if (ap){ const id=ap.dataset.apply; const s=tagsSum(anneeCourante,moisCourant,id); if(s!==null){ setOverlay(anneeCourante,id,moisCourant,s); renderMonth(); } return; }

      const add = e.target.closest("[data-addbtn]");
      if (add){
        const id=add.dataset.addbtn;
        const nameInp = panel.querySelector(`[data-addname="${id}"]`);
        const amtInp  = panel.querySelector(`[data-addamt="${id}"]`);
        const name=(nameInp.value||"").trim(); if(!name) return;
        const amt = amtInp.value.trim()===""?null:(parseFloat(amtInp.value.replace(",","."))||0);
        const g = POSTES[id].groupe;
        tagBank[g]=tagBank[g]||[]; if(!tagBank[g].includes(name)){ tagBank[g].push(name); tagBank[g].sort((a,b)=>a.localeCompare(b,'fr')); save(K.bank,tagBank); }
        ensureBag(anneeCourante,moisCourant,id); tags[anneeCourante][moisCourant][id][name]=amt; save(K.tags,tags);
        renderMonth(); return;
      }
    });

    panel.addEventListener("change", e => {
      const am = e.target.closest("[data-amount]");
      if (am){
        const id=am.dataset.amount, raw=am.value.trim();
        if(raw==="") clearOverlay(anneeCourante,id,moisCourant);
        else setOverlay(anneeCourante,id,moisCourant,parseFloat(raw.replace(",","."))||0);
        renderMonth(); return;
      }
      const ta = e.target.closest("[data-tagamt]");
      if (ta){
        const [id,label]=ta.dataset.tagamt.split("|"); const raw=ta.value.trim();
        ensureBag(anneeCourante,moisCourant,id);
        tags[anneeCourante][moisCourant][id][label]= raw===""?null:(parseFloat(raw.replace(",","."))||0);
        save(K.tags,tags); renderMonth(); return;
      }
    });

    // case « tous les postes » dans la légende du mois
    panel.addEventListener("input", e => {
      if (e.target.id==="mShowAll"){ showAllPostes=e.target.checked; renderMonth(); }
    });
  }
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
