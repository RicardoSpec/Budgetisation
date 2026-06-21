/* ============================================================
   data-2024.js  —  Année 2024
   Source : Google Sheet 1Smle (onglet « Annuel »)

   Le suivi ne démarre qu'en MARS 2024 dans ce tableur : janvier et
   février valent donc null (non suivis → affichés vides, comptés 0).

   Particularités de cette année, gérées par app.js :
   • « mobilijeune » : aide jeune, présente seulement en 2024.
   • « essence » contient ici Essence + Médical fusionnés (la ligne du
     tableur s'appelait « Essence / Medic »), d'où l'absence de « medic ».
   • Pas encore de LEP / CEL / PEL / Coinbase distincts : l'épargne LCL
     est portée par « lclCoinbase ».

   Mêmes conventions que data-2025.js (12 valeurs jan→déc, négatif = retrait).
   « soldeDepart » = solde réel fin février 2024 (= 184 €).
   ============================================================ */

window.BUDGET_DATA = window.BUDGET_DATA || {};

window.BUDGET_DATA[2024] = {

  soldeDepart: 184,

  lignes: {

    /* ---------- REVENUS ----------         jan   fév  mars  avr   mai  juin juil  août  sep   oct   nov   déc */
    salaire:        [null, null,    0, 1362, 1362, 1376, 1389, 1377, 1425, 1362, 1876, 1780],
    apl:            [null, null,    0,    0,    0,  713,    0,    0,    0,  291,  291,  291],
    prime:          [null, null,    0,  137,  137,  428,  447,  448,  448,  167,  177,  177],
    mobilijeune:    [null, null,   30,  100,  100,  100,  100,  100,  100,    0,    0,    0],
    exceptionnel:   [null, null,    0,    0,   38,    0,    0,    0,  630,    0,    0,    0],

    /* ---------- BESOINS ---------- */
    courses:        [null, null,    0,  124,  276,  249,  324,  114,  195,  200,  263,  309],
    abonnements:    [null, null,    0,   78,   83,   85,   68,   84,   83,   63,   66,   72],
    loyer:          [null, null,    0,  189,  189,  480,  480,  480,  480,  480,  480,  480],

    /* ---------- DÉSIRS ---------- */
    empruntAssu:    [null, null,    0,  103,  103,  103,  103,  103,  103,  103,  103,  120],
    tanSncf:        [null, null,  -78,   74,   72,  159,   74,   31,   26,   74,    5,   28],
    sorties:        [null, null,    0,  200,   40,  150,  605, 1269, 1343,  307,  619,  326],
    essence:        [null, null,    0,   50,   21,  100,   50,   93,   32,   50,   60,  120],
    divers:         [null, null,  418,  489,   50,  126,  475,    0,    0,  301,  132,  432],

    /* ---------- ÉPARGNE (versement +, retrait -) ---------- */
    ldds:           [null, null, -150,  150,  450,  100,   50, -450,   50,    0,  300,    0],
    pea:            [null, null,    0,    0,   50,    0,   40,    0,   50,   50,    0,   50],
    epargnePilotee: [null, null,    0,   30,   30,   30,   30,   30,   30,   30,   30,   30],
    pee:            [null, null,    0,   90,   90,   90,   90,   90,   90,  134,   90,  236],
    assuranceVie:   [null, null,    0,   50,   50,   50,   50,   50,   50,   50,   50,   50],
    lclCoinbase:    [null, null,    0,    0,  150,  800, -500,    0,  100,    0,   50,   50],
  },

  /* Solde réel du compte en fin de mois */
  soldeReel:        [null, null,   24,   -4,  -21,   74,   71,  102,   73,   51,  147,   92],
};
