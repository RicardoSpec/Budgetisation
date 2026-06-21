/* ============================================================
   data-2022.js  —  Année 2022  (août → décembre)
   Source : Google Sheet 10urMHs (onglet « Annuel »)

   CONTEXTE & CHOIX
   Ce tableur, le plus ancien, tient un cycle août→août sans année
   explicite. En prenant le premier août comme AOÛT 2022, août→décembre
   tombe en année civile 2022 (ce fichier) ; janvier→juillet relève de
   2023 (pourra devenir data-2023.js). Janvier à juillet 2022 valent null
   (non suivis ici).

   Particularités de l'époque (alternance / chômage), gérées par app.js :
   • Revenus non décomposables (annotations dans le tableur) → on garde
     « salaire » + « autre » (aides, chômage, exceptionnel). Leur somme
     reproduit les totaux mensuels du tableur.
   • Postes propres à cette période : « camionAssu » (camion + assurance
     auto), « velo » (remboursement vélo/ordi), « economie » (Économie+Pro).
   • Pas encore de PEA / LDDS / assurance-vie : l'épargne passe par
     « economie ».

   Conventions identiques aux autres années (12 valeurs jan→déc).
   « soldeDepart » = solde réel fin juillet 2022 (= 240 €).
   ============================================================ */

window.BUDGET_DATA = window.BUDGET_DATA || {};

window.BUDGET_DATA[2022] = {

  soldeDepart: 240,

  lignes: {

    /* ---------- REVENUS ----------    jan  fév  mar  avr  mai  jun  jul  août   sep   oct   nov   déc */
    salaire:     [null, null, null, null, null, null, null,    0, 1030, 1024,  858, 1339],
    autre:       [null, null, null, null, null, null, null, 1132, 1944,  487,  240,  229],

    /* ---------- BESOINS ---------- */
    courses:     [null, null, null, null, null, null, null,   75,  264,  298,  172,  216],
    abonnements: [null, null, null, null, null, null, null,   30,   21,   24,   24,   24],
    loyer:       [null, null, null, null, null, null, null,  150,  450,  450,  450,  450],

    /* ---------- DÉSIRS ---------- */
    camionAssu:  [null, null, null, null, null, null, null,  102,  102,  102,  102,  102],
    tanSncf:     [null, null, null, null, null, null, null,   90,   92,   61,   33,   68],
    sorties:     [null, null, null, null, null, null, null,  380,  260,  182,  852,  705],
    essence:     [null, null, null, null, null, null, null,  115,    0,    0,    0,    0],
    velo:        [null, null, null, null, null, null, null,  458,  460,  460,  396,  250],

    /* ---------- ÉPARGNE (versement +, retrait -) ---------- */
    economie:    [null, null, null, null, null, null, null,    0,  500,    0, -220, -180],
  },

  /* Solde réel du compte en fin de mois */
  soldeReel:     [null, null, null, null, null, null, null,  -28,  797,  731,   20,  -47],
};
