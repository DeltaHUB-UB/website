// Dinamica Sacalinului — story content (RO / EN). Edit texts, years, camera shots and bubbles here.
// The visitor rides the story "on rails": STOPS are the stations; ▶ / ◀ travel between them, and the year runs with the ride.
// Coordinates: km, x = east, z = south, origin = UTM 35N E 700000, N 4966000.
// Camera shot: {x, z, dist (km), tilt (deg from vertical), head (deg, 0 = looking north, -45 = looking north-west)}.
// ⚠ Texts are a DRAFT written by Claude from the 2018 Sacalin manuscript — check every fact before the exhibition.

// "Method & sources" panel (shared/storyui.js)
const R3 = {
  cera: 'Laloyaux P. et al. (2018). <i>CERA-20C: A Coupled Reanalysis of the Twentieth Century.</i> Journal of Advances in Modeling Earth Systems 10: 1172–1195.',
  sat: 'Copernicus Sentinel-2 L2A (ESA); Landsat 4/5/7/8 Collection 2 (USGS) — via Microsoft Planetary Computer.'
};
export const SOURCES = {
  ro: {
    lead: 'Cum am reconstituit mișcarea Sacalinului, de la nașterea lui în 1898 până azi.',
    sections: [
      { h: 'Liniile țărmului', html: `<ul><li>1898–1979: digitizate din hărți istorice; 1989–2013: din imagini — DELTA-Hub / Universitatea din București.</li>
<li>Fâșia de nisip din perioada hărților este schematică: hărțile dau doar linia țărmului dinspre mare.</li>
<li>Batimetria gurii în 1898: izobate digitizate de pe harta din 1898.</li></ul>` },
      { h: 'Teren și fotografii', html: `<p>Măsurătorile de teren, observațiile și fotografiile aeriene: Stațiunea de Cercetări Marine și Fluviale Sfântu Gheorghe (SCMF), Universitatea din București. Fotografii: Florin Zăinescu.</p>` },
      { h: 'Ritmuri și dimensiuni', html: `<p>Ratele de retragere și de alungire, lățimea barierei centrale și suprafața grindurilor noi provin din foile de calcul ale manuscrisului „Sacalin” (Zăinescu, Vespremeanu-Stroe et al., 2018).</p>` },
      { h: 'Furtuni', html: `<p>Puterea valurilor mai înalte de 3 m, cumulată pe fiecare an (J pe metru de front de val), calculată din reanaliza CERA-20C (ECMWF).</p>` },
      { h: 'Imagini satelitare', html: `<p>Mediane ale verii (mai–septembrie): Landsat 4/5/7/8 (USGS, 30 m, 1984–2016) și Sentinel-2 L2A (ESA Copernicus, 10 m, 2017–2025), calculate prin Microsoft Planetary Computer.</p>` },
      { h: 'Referințe', html: `<p class="ref">Zăinescu F., Vespremeanu-Stroe A. et al. (2018). Manuscrisul „Sacalin”, DELTA-Hub / Universitatea din București (foi de calcul pentru retragere, alungire și lățime).</p><p class="ref">Stațiunea de Cercetări Marine și Fluviale Sfântu Gheorghe (SCMF), Universitatea din București.</p><p class="ref">${R3.cera}</p><p class="ref">${R3.sat}</p>` }
    ]
  },
  en: {
    lead: 'How we rebuilt the movement of Sacalin, from its birth in 1898 to today.',
    sections: [
      { h: 'Shorelines', html: `<ul><li>1898–1979: digitised from historical maps; 1989–2013: from imagery — DELTA-Hub / University of Bucharest.</li>
<li>The sand strip of the map era is schematic: the maps give only the seaward shoreline.</li>
<li>Mouth bathymetry in 1898: isobaths digitised from the 1898 map.</li></ul>` },
      { h: 'Field work and photos', html: `<p>Field surveys, observations and aerial photos: the Sfântu Gheorghe Marine and Fluvial Research Station (SCMF), University of Bucharest. Photos: Florin Zăinescu.</p>` },
      { h: 'Rates and sizes', html: `<p>Retreat and elongation rates, the central barrier width and the area of new beach ridges come from the workbooks of the “Sacalin” manuscript (Zăinescu, Vespremeanu-Stroe et al., 2018).</p>` },
      { h: 'Storms', html: `<p>Power of the waves higher than 3 m, summed over each year (J per metre of wave crest), from the CERA-20C reanalysis (ECMWF).</p>` },
      { h: 'Satellite images', html: `<p>Summer (May–September) medians: Landsat 4/5/7/8 (USGS, 30 m, 1984–2016) and Sentinel-2 L2A (ESA Copernicus, 10 m, 2017–2025), computed via Microsoft Planetary Computer.</p>` },
      { h: 'References', html: `<p class="ref">Zăinescu F., Vespremeanu-Stroe A. et al. (2018). The “Sacalin” manuscript, DELTA-Hub / University of Bucharest (workbooks for retreat, elongation and width).</p><p class="ref">Sfântu Gheorghe Marine and Fluvial Research Station (SCMF), University of Bucharest.</p><p class="ref">${R3.cera}</p><p class="ref">${R3.sat}</p>` }
    ]
  }
};

export const UI = {
  ro: { title: 'Dinamica Sacalinului', sub: 'o insulă care se mișcă', data: 'Despre date', lang: 'EN', menu: 'Meniu', nextStory: 'Următoarea poveste', soon: 'în curând',
        hintStart: 'Apasă ▶ ca să pornești. Trage cu degetul ca să privești în jur.', hintBub: 'Atinge bulele ca să afli mai multe.',
        eraMap: 'hartă istorică · linia țărmului', eraBirth: 'înainte de Sacalin', eraSat: s => `${s} · mediana verii`, coast: 'Linia țărmului în anul…',
         km: 'km', mpy: 'm/an', m: 'm', km2: 'km²', noData: 'fără date',
        chart: {
          len: { t: 'Lungimea Sacalinului', u: 'km, de-a lungul țărmului' },
          ret: { t: 'Retragerea țărmului', u: 'm/an, cei mai mobili 4 km', t2: 'Furtunile', u2: 'puterea valurilor > 3 m · 10¹² J/m pe an' },
          wid: { t: 'Lățimea barierei centrale', u: 'm, la un transect din centrul insulei', breach: 'breșă' },
          brp: { t: 'Grinduri noi la capătul sudic', u: 'km² câștigați la fiecare 5 ani' }
        } },
  en: { title: 'Sacalin on the Move', sub: 'an island that moves', data: 'About the data', lang: 'RO', menu: 'Menu', nextStory: 'Next story', soon: 'coming soon',
        hintStart: 'Press ▶ to set off. Drag with a finger to look around.', hintBub: 'Touch the bubbles to learn more.',
        eraMap: 'historical map · shoreline', eraBirth: 'before Sacalin', eraSat: s => `${s} · summer median`, coast: 'Shoreline in the year…',
         km: 'km', mpy: 'm/yr', m: 'm', km2: 'km²', noData: 'no data',
        chart: {
          len: { t: 'Length of Sacalin', u: 'km, along the shoreline' },
          ret: { t: 'Shoreline retreat', u: 'm/yr, most mobile 4 km', t2: 'Storms', u2: 'power of waves > 3 m · 10¹² J/m per year' },
          wid: { t: 'Width of the central barrier', u: 'm, at a transect in the middle of the island', breach: 'breach' },
          brp: { t: 'New ridges at the southern end', u: 'km² gained every 5 years' }
        } }
};

// map labels: [ro, en, x, z, yearFrom, yearTo, kind]
export const LABELS = [
  ['Marea Neagră', 'Black Sea', 11, 5, 0, 9999, 'sea'],
  ['Brațul Sfântu Gheorghe', 'Sfântu Gheorghe branch', 1.5, -11.8, 0, 9999, 'riv'],
  ['Sfântu Gheorghe', 'Sfântu Gheorghe', 5.2, -9.6, 0, 9999, 'town'],
  ['Delta Dunării', 'Danube Delta', -8, -6, 0, 9999, 'land'],
  ['Lagună', 'Lagoon', -0.6, 0.9, 1950, 9999, 'feat'],
  ['Platforma gurii', 'Mouth platform', 9.6, -1.2, 0, 1912, 'feat']
];

// years on the rail that are worth a mark (not stations)
export const ANCHORS = [
  { y: 1972, ro: 'Porțile de Fier I', en: 'Iron Gates I dam' },
  { y: 1998, ro: 'Furtuna 1997/98', en: 'Storm of 1997/98' }
];

/* ==================================================================== STOPS (stations on the rail)
   year: the year shown at the station (the ride from the previous station runs the years in between).
   travel: seconds of the ride that ends here. shot: camera at the station; via: optional wider shot half-way.
   tab: chart highlighted at the station (len | ret). drift: longshore sand streaks along the coast.
   bubbles: [x, z, ro {t, b}, en {t, b}]. */
export const STOPS = [
  {
    year: 1890, short: { ro: 'Start', en: 'Start' }, tab: 'len', drift: 1,
    shot: { x: 4.5, z: -3.5, dist: 25, tilt: 46, head: -38 },
    ro: { kicker: 'Dinamica Sacalinului', title: 'O insulă care se mișcă', body: 'La gura brațului Sfântu Gheorghe s-a născut, acum mai puțin de 130 de ani, o insulă de nisip: Sacalinul. De atunci n-a stat pe loc nicio clipă: valurile o împing spre uscat și o întind spre sud. Urmărim cum a crescut, din hărțile vechi până la imaginile din satelit.', fact: 'Azi: peste 20 km lungime' },
    en: { kicker: 'Sacalin on the Move', title: 'An island that moves', body: 'Less than 130 years ago a sand island was born at the mouth of the Sfântu Gheorghe branch: Sacalin. It has never stood still since: the waves push it toward the land and stretch it southward. We follow its growth from old maps to satellite images.', fact: 'Today: more than 20 km long' },
    bubbles: [
      [9.4, -2.6, { t: 'Platforma de sub apă', b: 'Harta din 1898 arată în fața gurii o platformă de nisip largă, adâncă de doar 1–5 m, care coboară brusc la peste 20 m spre larg. Aici sedimentele fluviului s-au depus doar sub apă și au pregătit temelia pe care s-a născut și a crescut insula.' },
                   { t: 'The underwater platform', b: 'The 1898 map shows a wide sand platform in front of the mouth, only 1–5 m deep, dropping sharply to more than 20 m offshore. Here the river’s sediment settled only underwater and laid the foundation on which the island was born and grew.' }],
      [6.6, -7.2, { t: 'Gura Sfântu Gheorghe', b: 'Brațul Sfântu Gheorghe duce cam 23% din apa Dunării. La vărsare, curentul încetinește, iar nisipul se depune într-o platformă largă și puțin adâncă în fața gurii: din ea s-a ridicat Sacalinul.' },
                  { t: 'The Sfântu Gheorghe mouth', b: 'The Sfântu Gheorghe branch carries about 23% of the Danube’s water. At the mouth the current slows down and sand settles in a wide, shallow platform in front of it: Sacalin rose from this platform.' }],
      [11.5, -2.5, { t: 'Curentul longitudinal', b: 'Valurile vin mai ales dinspre nord-est și se sparg oblic pe țărm. Spargerea lor naște curentul longitudinal de țărm, care mută spre sud aproape un milion de metri cubi de nisip pe an. Jumătate din acest transport are loc în decembrie și ianuarie, în lunile cu furtuni.' },
                   { t: 'The longshore current', b: 'Waves come mostly from the north-east and break at an angle on the shore. Their breaking drives the longshore current, which moves almost a million cubic metres of sand southward every year. Half of it moves in December and January, the stormy months.' }]
    ]
  },
  {
    year: 1898, travel: 5, short: { ro: 'Nașterea', en: 'Birth' }, tab: 'len', drift: 1,
    shot: { x: 7.4, z: -3.8, dist: 10, tilt: 50, head: -32 },
    ro: { kicker: '1898', title: 'Se naște o insulă', body: 'După marile viituri din 1897, nisipul din fața gurii iese la suprafață. Valurile îl împing spre țărm și îl strâng într-un banc lung de un kilometru și jumătate, la circa 3 km în larg. Prima hartă care îl arată stabil este cea din 1898.', fact: '1898: o insulă de ~1,5 km' },
    en: { kicker: '1898', title: 'An island is born', body: 'After the great floods of 1897, the sand in front of the mouth breaks the surface. The waves push it shoreward and gather it into a bar one and a half kilometres long, about 3 km offshore. The first map that shows it in a stable position dates from 1898.', fact: '1898: an island of ~1.5 km' },
    bubbles: [
      [8.6, -3.3, { t: 'Cum apare o insulă', b: 'Valurile care trec peste un banc puțin adânc împing nisipul mai mult spre țărm decât înapoi. Bancul crește, iese din apă și devine o insulă-barieră. Pe hărțile mai vechi, de exemplu din 1871, apar bancuri trecătoare, mai aproape de țărm.' },
                  { t: 'How an island appears', b: 'Waves crossing a shallow bar push sand shoreward more than back. The bar grows, emerges and becomes a barrier island. Older maps, from 1871 for example, show short-lived bars closer to the shore.' }]
    ]
  },
  {
    year: 1944, travel: 7, short: { ro: 'Insula tânără', en: 'Young island' }, tab: 'len', drift: 1,
    shot: { x: 6.0, z: -1.6, dist: 16, tilt: 48, head: -36 },
    ro: { kicker: '1898 – 1950', title: 'Insula tânără', body: 'Primele decenii sunt liniștite: valurile ating rar 3 m, iar insula se retrage doar 3–9 m pe an. În schimb, crește repede în lungime, spre nord și spre sud, și se desprinde de marginea platformei gurii. E joasă, îngustă și aproape fără vegetație.', fact: '1944: ~9 km lungime' },
    en: { kicker: '1898 – 1950', title: 'The young island', body: 'The first decades are calm: waves rarely reach 3 m and the island retreats only 3–9 m a year. Instead it grows quickly in length, northward and southward, and moves off the edge of the mouth platform. It is low, narrow and almost bare.', fact: '1944: ~9 km long' },
    bubbles: [
      [6.6, 0.6, { t: 'Valuri și nisip', b: 'O insulă-barieră se hrănește cu nisipul adus de curentul longitudinal de țărm, format de spargerea valurilor. Capătul sudic primește nisipul și se alungește, iar partea expusă valurilor pierde nisip și migrează spre uscat.' },
                 { t: 'Waves and sand', b: 'A barrier island feeds on sand brought by the longshore current, driven by breaking waves. Its southern end receives sand and lengthens, while the side exposed to the waves loses sand and migrates landward.' }]
    ]
  },
  {
    year: 1971, travel: 7, short: { ro: 'Furtunile', en: 'Storms' }, tab: 'ret', drift: 1,
    shot: { x: 4.6, z: -0.6, dist: 20, tilt: 46, head: -40 },
    ro: { kicker: '1950 – 1975', title: 'Deceniile cu furtuni', body: 'Anii ’60 sunt cei mai furtunoși din ultimul secol. Țărmul Sacalinului se retrage atunci cu până la 57 m pe an. Partea de nord se lipește de deltă, iar la capătul sudic încep să se adune grinduri noi de nisip. Insula a devenit o săgeată de nisip legată de uscat.', fact: 'Anii ’60: până la 57 m de retragere pe an' },
    en: { kicker: '1950 – 1975', title: 'The stormy decades', body: 'The 1960s are the stormiest decade of the last century. Sacalin’s shoreline then retreats by up to 57 m a year. Its northern part attaches to the delta, and new sand ridges start piling up at its southern end. The island has become a spit tied to the land.', fact: '1960s: up to 57 m of retreat a year' },
    bubbles: [
      [7.0, -5.6, { t: 'Lipit de deltă', b: 'În anii ’60–’70, partea de nord a Sacalinului s-a sudat de o deltă mică, crescută în lagună de un braț secundar. De atunci, la nord, insula este legată de uscat.' },
                  { t: 'Joined to the delta', b: 'In the 1960s–70s the northern part of Sacalin welded onto a small delta that a secondary branch had built into the lagoon. Since then, in the north, the island has been attached to the land.' }],
      [5.6, -1.6, { t: 'Insula se rostogolește', b: 'Săgețile arată valurile de furtună care trec peste insula joasă și împing nisipul de pe plajă în spatele ei, spre lagună. Plaja pierde nisip, iar spatele insulei primește: așa migrează toată insula spre uscat, „rostogolindu-se” peste ea însăși.' },
                  { t: 'The island rolls over', b: 'The arrows show storm waves washing over the low island and pushing sand from the beach to its back, into the lagoon. The beach loses sand and the back of the island gains it: this is how the whole island migrates landward, “rolling over” itself.' }],
      [10.0, 1.5, { t: 'Furtunile mută țărmul', b: 'Retragerea țărmului urmează puterea valurilor mai mari de 3 m: cu cât sunt mai multe furtuni puternice, cu atât insula migrează mai repede spre uscat. Cele două serii se potrivesc foarte bine (R = 0,82).' },
                  { t: 'Storms move the shore', b: 'Shoreline retreat follows the power of waves higher than 3 m: the more strong storms, the faster the island migrates landward. The two series match very well (R = 0.82).' }]
    ]
  },
  {
    year: 1986, travel: 6, short: { ro: 'Din satelit', en: 'From space' }, tab: 'len', drift: 0,
    shot: { x: 3.0, z: 0.4, dist: 21, tilt: 42, head: -40 },
    ro: { kicker: 'Din 1984', title: 'Privim din satelit', body: 'Din anii ’80, sateliții Landsat fotografiază delta de mai multe ori în fiecare vară. Pentru fiecare an am combinat toate imaginile fără nori într-o singură imagine. De acum vedem insula așa cum era: plaja albă, laguna din spate și apa tulbure a Dunării.', fact: 'Mediana verii: o imagine pe an' },
    en: { kicker: 'From 1984', title: 'Seen from space', body: 'From the 1980s on, the Landsat satellites photograph the delta several times every summer. For each year we combined all the cloud-free images into one. From now on we see the island as it was: the white beach, the lagoon behind and the muddy Danube water.', fact: 'Summer median: one image per year' },
    bubbles: [
      [-2.6, 4.3, { t: 'Capătul care crește', b: 'În anii ’80, capătul sudic s-a alungit repede, „înmugurind”: un banc nou apare în prelungirea vârfului, apoi se unește cu el. Uneori insula a crescut astfel cu sute de metri într-un singur an.' },
                  { t: 'The growing tip', b: 'In the 1980s the southern end lengthened quickly by “budding”: a new bar appears beyond the tip and then joins it. At times the island grew by hundreds of metres in a single year this way.' }],
      [-0.6, -1.6, { t: 'Laguna din spate', b: 'Între Sacalin și deltă stă o lagună. Insula migrează peste ea, spre vest, iar în nord laguna se umple cu mâlul adus de un braț mic. Pentru că insula se lungește, laguna, per total, se face mai mare.' },
                   { t: 'The lagoon behind', b: 'A lagoon lies between Sacalin and the delta. The island is migrating westward over it, and in the north the lagoon fills with mud brought by a small branch. Because the island keeps lengthening, the lagoon is growing overall.' }]
    ]
  },
  {
    year: 2000, travel: 6, short: { ro: 'Breșe', en: 'Breaches' }, tab: 'ret', drift: 0,
    shot: { x: 3.4, z: 0.8, dist: 11, tilt: 50, head: -44 },
    ro: { kicker: '1980 – 2005', title: 'Un ciclu de distrugere și reformare', body: 'Partea centrală a Sacalinului, despărțită de deltă printr-o lagună, trăiește în cicluri. Valurile o subțiază încet, de la 400–600 m până la 50–150 m. Atunci marea o rupe: se deschide o breșă. Nisipul împins prin breșă lărgește din nou insula, iar în 1–3 ani breșa se închide.', fact: 'O breșă la 15–25 de ani' },
    en: { kicker: '1980 – 2005', title: 'A cycle of destruction and rebuilding', body: 'The central part of Sacalin, separated from the delta by a lagoon, lives in cycles. The waves slowly thin it from 400–600 m down to 50–150 m. Then the sea breaks through: a breach opens. Sand pushed through the breach widens the island again, and within 1–3 years the breach closes.', fact: 'A breach every 15–25 years' },
    bubbles: [
      [4.4, 0.0, { t: 'Cele trei faze', b: '1. Subțierea: marea erodează insula dinspre larg. 2. Lărgirea: după o breșă, nisipul trece pe sub apă și se depune în spatele insulei. 3. Înălțarea: valurile de furtună clădesc din nou o terasă de nisip deasupra breșei închise.' },
                 { t: 'Three phases', b: '1. Narrowing: the sea eats the island from the seaward side. 2. Widening: after a breach, sand travels underwater and settles behind the island. 3. Building up: storm waves rebuild a sand terrace over the closed breach.' }],
      [6.3, -2.4, { t: 'Furtuna din iarna 1997/98', b: 'O furtună extremă a trecut peste dunele din nordul insulei și a împins nisip în lagună. Într-o singură iarnă, țărmul s-a mutat cât în 4–5 ani obișnuiți.' },
                  { t: 'The storm of winter 1997/98', b: 'An extreme storm overtopped the dunes in the north of the island and pushed sand into the lagoon. In a single winter the shoreline moved as much as in 4–5 ordinary years.' }]
    ]
  },
  {
    year: 2012, travel: 5, short: { ro: 'Spărtura', en: 'The breach' }, tab: 'ret', drift: 0, breach: 1,
    shot: { x: 2.4, z: 1.7, dist: 8.5, tilt: 50, head: -46 },
    ro: { kicker: '2009 – 2013', title: 'Spărtura', body: 'Când bariera centrală ajunge la limită, nu e nevoie de o furtună extremă: marea o rupe pe aproape 3,5 km. Pe această porțiune țărmul s-a retras în medie cu 500 m, de peste zece ori mai mult decât într-un an obișnuit. Nisipul din breșă a format un evantai larg în lagună.', fact: '~500 m de retragere pe 3,5 km' },
    en: { kicker: '2009 – 2013', title: 'The breach', body: 'When the central barrier reaches its limit, no extreme storm is needed: the sea breaks through along almost 3.5 km. On this stretch the shoreline retreated by 500 m on average, more than ten times an ordinary year. The sand from the breach spread into a wide fan in the lagoon.', fact: '~500 m of retreat over 3.5 km' },
    bubbles: [
      [1.9, 2.4, { t: 'Evantaiul de spărtură', b: 'Conturul auriu arată nisipul împins prin breșă în lagună. Stuful îl acoperă repede, iar insula devine din nou lată. Așa migrează bariera spre uscat: „se rostogolește” peste propria lagună.' },
                 { t: 'The breach fan', b: 'The gold outline shows the sand pushed through the breach into the lagoon. Reeds quickly cover it and the island becomes wide again. This is how the barrier migrates landward: it “rolls over” its own lagoon.' }, { img: 'data/img/sacalin_bariera.webp', by: 'Florin Zăinescu' }]
    ]
  },
  {
    year: 2025, travel: 6, short: { ro: 'Azi', en: 'Today' }, tab: 'len', drift: 1,
    shot: { x: 2.4, z: 0.4, dist: 23, tilt: 42, head: -40 },
    ro: { kicker: 'Azi', title: 'Sacalinul azi', body: 'Sacalinul are peste 20 km și se mișcă în continuare. Nu are diguri, drăgări sau construcții: este un laborator natural rar pentru felul în care țărmurile răspund la furtuni și la nisipul adus de fluviu. Zona Sacalin–Zătoane este strict protejată în Rezervația Biosferei Delta Dunării.', fact: 'Câmpul de grinduri din sud crește de două ori mai repede după 1995' },
    en: { kicker: 'Today', title: 'Sacalin today', body: 'Sacalin is more than 20 km long and still moving. It has no dykes, no dredging and no buildings: a rare natural laboratory for how coasts respond to storms and to the sand a river brings. The Sacalin–Zătoane area is strictly protected within the Danube Delta Biosphere Reserve.', fact: 'The southern ridge plain has grown twice as fast since 1995' },
    bubbles: [
      [-3.0, 4.4, { t: 'Câmpul de grinduri din sud', b: 'La capătul sudic, nisipul adus de curent se așază în grinduri paralele, fiecare un fost țărm. Din anii ’60 s-a format aici unul dintre cele mai noi câmpuri de grinduri din deltă.' },
                   { t: 'The southern ridge plain', b: 'At the southern end, sand brought by the current settles in parallel ridges, each one a former shoreline. Since the 1960s one of the newest ridge plains of the delta has formed here.' }],
      [2.4, 0.0, { t: 'Un refugiu pentru păsări', b: 'Plajele pustii și laguna liniștită sunt locuri de cuibărit și de odihnă pentru păsări de țărm și de apă. De aceea accesul pe insulă este strict limitat.' },
                  { t: 'A refuge for birds', b: 'The empty beaches and the quiet lagoon are nesting and resting places for shore and water birds. That is why access to the island is strictly limited.' }, { img: 'data/img/sacalin_pelicani.webp', by: 'Florin Zăinescu' }]
    ]
  }
];
