/* ============================================================
   data-2025.js  —  Année 2025
   Source : Google Sheet 1ChaIXRO (onglet « Annuel »)

   FORMAT
   Chaque ligne est un tableau de 12 valeurs : [jan, fév, mar, avr, mai,
   juin, juil, août, sep, oct, nov, déc]. Une valeur peut être négative
   (retrait d'épargne, remboursement) ou 0.

   Les libellés, le groupe (besoin / désir / épargne) et les couleurs
   de chaque ligne sont définis UNE seule fois dans app.js (registre des
   postes), pas ici : ce fichier ne contient que des nombres, pour rester
   identique d'une année à l'autre.

   « soldeDepart » = solde réel du compte fin décembre 2024 (= 92 €).
   « soldeReel »   = solde réel relevé en fin de chaque mois.
   ============================================================ */

window.BUDGET_DATA = window.BUDGET_DATA || {};

window.BUDGET_DATA[2025] = {

  soldeDepart: 92,

  lignes: {

    /* ---------- REVENUS ---------- */
    salaire:        [2040, 1776, 1785, 1840, 1844, 1803, 1891, 1827, 1866, 1936, 1815, 1814],
    apl:            [ 300,  300,  300,  301,  301,  301,  301,  301,  301,  301,  304,  304],
    prime:          [  62,   62,   62,    0,    0,    0,    0,    0,    0,    0,    0,    0],
    exceptionnel:   [ 400,   78,  500,    0,    0,  600, 2500,    0,  850,    0,    0,    0],
    autre:          [   0,    0,    0,    0,    0, 3779,    0,    0,    0,    0,    0,    0],

    /* ---------- BESOINS ---------- */
    courses:        [ 503,  237,  384,  260,  348,  423,  213,  237,  114,  169,  148,   79],
    abonnements:    [  94,  161,  190,  134,  109,  136,   95,  221,  101,   61,  110,  125],
    loyer:          [ 480,  480,  480,  480,  480,  480,  480,  480,  480,  480,  480,  480],
    medic:          [   0,    0,    0,    0,    0,    0,    0,   60,   17,    0,   21,   60],

    /* ---------- DÉSIRS ---------- */
    empruntAssu:    [ 105,  105,  107,  106,  106,  106,   38,    0,    0,    0,    0,    0],
    tanSncf:        [  99,   61,   96,  197,   56,  154,  118,  530,   54,   80,    0,   64],
    sorties:        [ 560,  200,  203,  600,  231,  500, 1145, 1546,  786,  127,  547,  671],
    essence:        [  60,   90,  120,  -50,   50,   90,    0,    0,    0,    0,    0,    0],
    divers:         [ 421,  445, 1350,  133,  200, 1423,    0,    0,    0,    0,    0,  800],

    /* ---------- ÉPARGNE (versement +, retrait -) ---------- */
    ldds:           [ 350, -250,-1150,   50,  400, -350,  600, -550, -200,  -50,    0,   50],
    pea:            [   0,    0,    0,    0,    0,    0,   50,  100,  400,  930,  300,    0],
    epargnePilotee: [  30,   30,   30,   30,   30,   30,   30,    0,    0,  200,  100,    0],
    pee:            [  50,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0],
    assuranceVie:   [  50,   50,   50,   50,   50,   50,   50,   50,   50,   50,   50,   50],
    lclCoinbase:    [   0,  100,  150,    0, -100, 1450,   50,  -50, -100,  250,  400,  100],
    lep:            [   0,   30,  570,  100,  100, 1950, 1750, -400, 1200, -100, -200, -400],
    cel:            [   0,  300,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0],
    pel:            [   0,  270,   45,   45,   45,   45,   45,   45,   45,   45,   45,   45],
  },

  /* Solde réel du compte en fin de mois (pour le rapprochement) */
  soldeReel:        [  92,   -1,   21,   27,   67,   63,   91,  -50,   20,   15,  133,  127],
};
