// Gura Sfântu Gheorghe — story content (RO / EN). Edit texts, dates, camera shots and bubbles here.
// The visitor rides "on rails" between STOPS; time runs with the ride (and slows down during big floods and storms).
// Coordinates: km, x = east, z = south, origin = UTM 35N E 708400, N 4971900 (centre of the surveyed square).
// Camera shot: {x, z, dist (km), tilt (deg from vertical), head (deg, 0 = looking north, -90 = looking west)}.
// Text tokens: {dv:a-b} = measured volume change of the periods a … b-1 (story_data.json → periods), e.g. {dv:0-2} = 2004 → 2006;
// {cn:key} / {cs:key} = shoreline change north of the mouth / on Sacalin (coast.json → stats: lost_km2, gain_km2, max_m, rate).
// ⚠ Texts are a DRAFT written by Claude from Zăinescu et al. 2019 (Marine Geology 417) — check every fact before the exhibition.

// "Method & sources" panel (shared/storyui.js)
const R4 = {
  z19: 'Zăinescu F., Vespremeanu-Stroe A., Anthony E., Tătui F., Preoteasa L., Mateescu R. (2019). <i>Flood deposition and storm removal of sediments in front of a deltaic wave-influenced river mouth.</i> Marine Geology 417: 106015.',
  era5: 'Hersbach H. et al. (2020). <i>The ERA5 global reanalysis.</i> Quarterly Journal of the Royal Meteorological Society 146: 1999–2049 (via Open-Meteo).',
  grdc: 'GRDC — The Global Runoff Data Centre, Koblenz: Danube at Ceatal Izmail (6742900), INHGA data.'
};
export const SOURCES = {
  ro: {
    lead: 'Măsurători reale ale fundului mării la gura Sfântu Gheorghe, puse alături de debitul Dunării și de valurile din larg.',
    sections: [
      { h: 'Batimetria', html: `<ul><li>15 campanii anuale, 2004–2017, ale Stației de cercetări marine și fluviale Sfântu Gheorghe (Universitatea din București): sonar monofascicul pe profile perpendiculare pe țărm, grile de 50 m (4 × 4 km).</li>
<li>Volumele sunt calculate pe cei ~8 km² măsurați în toate campaniile; articolul (cu 2018, pe 8,8 km²) dă +5,2 milioane m³ pentru 2005–2006 și −6,9 milioane m³ pentru 2011–2012.</li>
<li>Relieful e exagerat pe verticală; în pătratul măsurat, bara gurii și canalul sunt accentuate încă o dată față de panta generală, ca să se vadă.</li>
<li>Colorăm doar schimbările mari ale fundului mării (peste ~0,5 m), între țărm și ~10 m adâncime, unde se petrec cele mai importante; ele sunt desenate exagerat (×2) pe verticală.</li></ul>` },
      { h: 'Fluviul și marea', html: `<ul><li>Debitul: Dunărea la Ceatal Izmail (GRDC, zilnic) × 0,25 — partea brațului Sfântu Gheorghe; sedimentul în suspensie se calculează din debit, după relația din articol.</li>
<li>Viitura din 25 aprilie 2006 (15 900 m³/s la Ceatal Izmail) e cel mai mare debit zilnic din seria GRDC 1921–2021; 2005 a atins 14 400 m³/s.</li>
<li>Valurile: înălțimea semnificativă orară din reanaliza ERA5 (ECMWF / Copernicus, prin Open-Meteo), într-un punct în larg la SE de gură.</li>
<li>Jetul, pana de sediment, valurile și curenții ilustrează modelul conceptual din Zăinescu et al. (2019), bazat pe modelare MIKE 21/3.</li></ul>` },
      { h: 'Uscatul și țărmul', html: `<ul><li>Uscatul: mediana verii 2017 Sentinel-2 (ESA Copernicus) și modelul de teren LiDAR al deltei.</li>
<li>Țărmul 1985 → 2025: medianele verii Landsat 5 și Landsat 8/9 (USGS, 30 m, prin Microsoft Planetary Computer); apă = MNDWI &gt; 0; contează doar marea deschisă (nu lagunele și lacurile).</li>
<li>Sedimentul Dunării: ~640 kg/s (≈ 20 milioane t/an) în 2004–2015, de aproximativ trei ori mai puțin decât înainte de barajele Porțile de Fier (Zăinescu et al., 2019).</li></ul>` },
      { h: 'Referințe', html: `<p class="ref">${R4.z19}</p><p class="ref">${R4.era5}</p><p class="ref">${R4.grdc}</p>` }
    ]
  },
  en: {
    lead: 'Real surveys of the sea bed at the Sfântu Gheorghe mouth, set side by side with the Danube’s discharge and the offshore waves.',
    sections: [
      { h: 'Bathymetry', html: `<ul><li>15 yearly surveys, 2004–2017, by the Sfântu Gheorghe Marine and Fluvial Research Station (University of Bucharest): single-beam echo sounder on shore-normal profiles, 50 m grids (4 × 4 km).</li>
<li>Volumes are computed over the ~8 km² covered by every survey; the paper (with 2018, over 8.8 km²) gives +5.2 million m³ for 2005–2006 and −6.9 million m³ for 2011–2012.</li>
<li>Relief is exaggerated vertically; inside the surveyed square the mouth bar and the channel are stressed once more against the general slope so they can be seen.</li>
<li>Only large sea-bed changes (above ~0.5 m) between the shore and ~10 m depth, where the most important ones happen, are coloured; they are drawn exaggerated (×2) vertically.</li></ul>` },
      { h: 'River and sea', html: `<ul><li>Discharge: the Danube at Ceatal Izmail (GRDC, daily) × 0.25 — the share of the Sfântu Gheorghe branch; suspended sediment follows from discharge with the relation in the paper.</li>
<li>The flood of 25 April 2006 (15,900 m³/s at Ceatal Izmail) is the highest daily discharge in the GRDC series 1921–2021; 2005 reached 14,400 m³/s.</li>
<li>Waves: hourly significant wave height from the ERA5 reanalysis (ECMWF / Copernicus, via Open-Meteo), at an offshore point SE of the mouth.</li>
<li>The jet, sediment wedge, waves and currents illustrate the conceptual model of Zăinescu et al. (2019), based on MIKE 21/3 modelling.</li></ul>` },
      { h: 'Land and coast', html: `<ul><li>Land: Sentinel-2 summer 2017 median (ESA Copernicus) and the delta LiDAR terrain model.</li>
<li>Coast 1985 → 2025: Landsat 5 and Landsat 8/9 summer medians (USGS, 30 m, via Microsoft Planetary Computer); water = MNDWI &gt; 0; only the open sea counts (not lagoons or lakes).</li>
<li>Danube sediment: ~640 kg/s (≈ 20 million t a year) in 2004–2015, about three times less than before the Iron Gates dams (Zăinescu et al., 2019).</li></ul>` },
      { h: 'References', html: `<p class="ref">${R4.z19}</p><p class="ref">${R4.era5}</p><p class="ref">${R4.grdc}</p>` }
    ]
  }
};

export const UI = {
  ro: { title: 'Lupta de la gură', sub: 'Gura Sfântu Gheorghe', lang: 'EN', menu: 'Meniu', nextStory: 'Următoarea poveste', soon: 'în curând', back1: 'Înapoi la bazinul Dunării',
        hintStart: 'Apasă ▶ ca să pornești. Trage cu degetul ca să privești în jur.', hintBub: 'Atinge bulele ca să afli mai multe.',
        river: 'Râul', sea: 'Marea', qUnit: 'm³/s', hsUnit: 'm valuri',
        winRiver: 'râul aduce și depune', winSea: 'marea ridică și duce spre sud', draw: 'echilibru',
        legend: 'Fundul mării față de', dep: 's-a depus', ero: 's-a erodat', since: r => `față de ${r}`,
        months: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
        survey: 'măsurătoare', flood: 'Viitură', storm: 'Furtună', apex: 'la intrarea în deltă', waves: 'valuri de',
        mil: 'mil. m³', period: 'Atinge o bară: ce a lăsat fiecare rundă', tapPeriod: (a, b) => `${a} → ${b}`,
        before: 'Înainte de baraje', today: 'Azi', sedTitle: 'Sedimentul Dunării la intrarea în deltă', mt: 'mil. t/an',
        dams: 'Porțile de Fier', mouth: 'Gura Sfântu Gheorghe', trapped: 'reținut în lacurile de acumulare',
        stopHere: 'Aici se oprește sedimentul', lake: 'lacul de acumulare', little: 'mai departe ajunge puțin',
        coastSat: 'mediana verii · Landsat', coastLeg: 'Țărmul: roșu = uscat luat de mare, auriu = uscat nou, din 1985',
        chart: {
          q: { t: 'Fluviul: debitul la gură', u: 'm³/s, brațul Sfântu Gheorghe · viitură > 2 200' },
          hs: { t: 'Marea: valurile din larg', u: 'm, înălțimea valurilor · furtună > 2,5' },
          dv: { t: 'Bilanțul gurii', u: 'milioane m³ câștigați / pierduți între măsurători' }
        } },
  en: { title: 'The Battle at the Mouth', sub: 'Sfântu Gheorghe mouth', lang: 'RO', menu: 'Menu', nextStory: 'Next story', soon: 'coming soon', back1: 'Back to the Danube basin',
        hintStart: 'Press ▶ to set off. Drag with a finger to look around.', hintBub: 'Touch the bubbles to learn more.',
        river: 'River', sea: 'Sea', qUnit: 'm³/s', hsUnit: 'm waves',
        winRiver: 'the river brings and deposits', winSea: 'the sea lifts and carries south', draw: 'balance',
        legend: 'Sea bed compared with', dep: 'deposited', ero: 'eroded', since: r => `since ${r}`,
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        survey: 'survey', flood: 'Flood', storm: 'Storm', apex: 'at the delta apex', waves: 'waves of',
        mil: 'million m³', period: 'Touch a bar: what each round left behind', tapPeriod: (a, b) => `${a} → ${b}`,
        before: 'Before the dams', today: 'Today', sedTitle: 'Danube sediment entering the delta', mt: 'million t/yr',
        dams: 'Iron Gates', mouth: 'Sfântu Gheorghe mouth', trapped: 'trapped in the reservoirs',
        stopHere: 'Sediment stops here', lake: 'reservoir', little: 'little gets past',
        coastSat: 'summer median · Landsat', coastLeg: 'Coast: red = land taken by the sea, gold = new land, since 1985',
        chart: {
          q: { t: 'The river: discharge at the mouth', u: 'm³/s, Sfântu Gheorghe branch · flood > 2,200' },
          hs: { t: 'The sea: offshore waves', u: 'm, wave height · storm > 2.5' },
          dv: { t: 'Budget of the mouth', u: 'million m³ gained / lost between surveys' }
        } }
};

// map labels: [ro, en, x, z, kind, scope]; scope 'c' = only at the coast station (the others are hidden there)
export const LABELS = [
  ['Marea Neagră', 'Black Sea', 4.2, 2.6, 'sea'],
  ['Brațul Sfântu Gheorghe', 'Sfântu Gheorghe branch', -4.7, -3.15, 'riv'],
  ['Sfântu Gheorghe', 'Sfântu Gheorghe', -2.2, -3.9, 'town'],
  ['Delta Dunării', 'Danube Delta', -5.6, 0.8, 'land'],
  ['Sacalin', 'Sacalin', -3.4, 5.4, 'feat'],
  ['Sulina', 'Sulina', -1.2, -32.0, 'town', 'c'],
  ['Gura Sfântu Gheorghe', 'Sfântu Gheorghe mouth', -2.4, -1.0, 'town', 'c'],
  ['Sacalin', 'Sacalin', -14.5, 9.5, 'feat', 'c'],
  ['Lacul Roșu', 'Lake Roșu', -5.6, -20.1, 'lake', 'c'],
  ['Marea Neagră', 'Black Sea', 7.0, -6.0, 'sea', 'c'],
  ['Delta Dunării', 'Danube Delta', -14.0, -12.0, 'land', 'c']
];

// the channel axis (from the satellite water mask upstream, the survey thalweg near the mouth) and the mouth M = last point
export const CHANNEL = [[-7.6, -6.05], [-7.0, -5.42], [-6.2, -4.45], [-5.4, -3.42], [-4.8, -2.85], [-4.2, -2.57], [-3.4, -2.28], [-3.0, -2.0],
  [-2.6, -1.71], [-2.2, -1.43], [-1.8, -1.05], [-1.4, -0.75], [-1.1, -0.45]];

// dates worth a mark on the rail (not stations)
export const ANCHORS = [
  { t: 2016.5, ro: '2 măsurători / an', en: '2 surveys / yr' }
];

/* ==================================================================== STOPS (stations on the rail)
   t: decimal year at the station (the ride from the previous station runs the days in between).
   travel: seconds of the ride that ends here. shot: camera at the station.
   proc: forcing shown while standing at the station ({q: m³/s, hs: m}); during the ride the real daily series drive it.
   ref: survey index the sea-bed colours compare with (gold = deposited, red = eroded; only |Δz| > ~0.8 m down to ~10 m); null = depth colours only.
   tab: chart highlighted. periods: the budget bars can be touched. basin: the Danube basin panel.
   coast: the 1985 → 2025 shoreline-change map from Sacalin to Sulina (label = text over the rail dot).
   bubbles: [x, z, ro {t, b}, en {t, b}]. */
export const STOPS = [
  {
    t: 2004.54, short: { ro: 'Start', en: 'Start' }, tab: 'dv', ref: null, proc: { q: 1700, hs: 0.9 },
    shot: { x: -0.6, z: -0.5, dist: 7.6, tilt: 50, head: -72 },
    ro: { kicker: 'Gura Sfântu Gheorghe', title: 'Aici se decide soarta deltei', body: 'La gura brațului Sfântu Gheorghe, Dunărea și Marea Neagră se luptă pentru fiecare grăunte de nisip. Când fluviul e mare, aduce sediment și îl depune în fața gurii. Când marea se înfurie, valurile îl ridică, iar curentul îl duce spre sud. Din 2004, fundul mării a fost măsurat aici în fiecare an. Urmărim cele două runde mari: viiturile record din 2005–2006 și furtuna extremă din februarie 2012.', fact: '15 măsurători · 2004–2017 · 4 × 4 km' },
    en: { kicker: 'Sfântu Gheorghe mouth', title: 'Where the fate of the delta is decided', body: 'At the mouth of the Sfântu Gheorghe branch, the Danube and the Black Sea fight over every grain of sand. When the river is high, it brings sediment and drops it in front of the mouth. When the sea rages, the waves lift it up and the current carries it south. Since 2004 the sea bed here has been measured every year. We follow the two big rounds: the record floods of 2005–2006 and the extreme storm of February 2012.', fact: '15 surveys · 2004–2017 · 4 × 4 km' },
    bubbles: [
      [-0.85, -0.75, { t: 'Bara de la gură', b: 'În fața gurii, nisipul formează o bară sub apă, în formă de arc. Creasta ei e la doar 1,5–2 m adâncime; spre sud, un canal mai adânc (3–3,5 m) lasă apa fluviului să treacă. Bara e asimetrică: valurile din nord-est o împing spre sud.' },
                      { t: 'The mouth bar', b: 'In front of the mouth the sand forms an arc-shaped bar under water. Its crest is only 1.5–2 m deep; to the south a deeper channel (3–3.5 m) lets the river water through. The bar is lopsided: waves from the north-east push it south.' }],
      [-2.3, -1.5, { t: 'Brațul Sfântu Gheorghe', b: 'Brațul duce cam un sfert din apa Dunării. La gură, albia are ~500 m lățime și ~5 m adâncime: tot debitul trece printr-o „duză” îngustă, care îl aruncă în mare ca pe un jet.' },
                   { t: 'The Sfântu Gheorghe branch', b: 'The branch carries about a quarter of the Danube’s water. At the mouth the channel is ~500 m wide and ~5 m deep: the whole flow passes through a narrow “nozzle” that shoots it into the sea as a jet.' }, { img: 'data/img/gura_sfg.webp', by: 'Florin Zăinescu' }],
      [1.0, 1.3, { t: 'Cum s-a măsurat', b: 'Din 2004, echipa Stației de cercetări marine și fluviale Sfântu Gheorghe (Universitatea din București) a măsurat adâncimea cu sonarul, de pe barcă, pe profile perpendiculare pe țărm, până la 20 m adâncime. Din fiecare campanie s-a făcut o hartă a fundului mării, cu celule de 50 m.' },
                 { t: 'How it was measured', b: 'Since 2004 the team of the Sfântu Gheorghe Marine and Fluvial Research Station (University of Bucharest) has measured the depth with an echo sounder from a boat, on profiles perpendicular to the shore, down to 20 m. Each survey became a map of the sea bed with 50 m cells.' }],
      [2.4, -3.2, { t: 'Valurile din nord-est', b: 'Valurile dominante vin din nord-est, oblic pe țărm. Ele împing nisipul de-a lungul țărmului spre sud: cam un milion de metri cubi pe an trec astfel prin dreptul gurii.' },
                  { t: 'Waves from the north-east', b: 'The dominant waves come from the north-east, at an angle to the shore. They push sand along the coast to the south: about one million cubic metres a year pass the mouth this way.' }]
    ]
  },
  {
    t: 2006.54, travel: 18, short: { ro: 'Viiturile record', en: 'Record floods' }, tab: 'q', ref: 0, proc: { q: 3975, hs: 0.6 },
    shot: { x: -0.45, z: -0.25, dist: 4.5, tilt: 55, head: -66 },
    ro: { kicker: '2005 – 2006 · viituri record', title: 'Fluviul atacă', body: 'În 2005 și 2006 au venit cele mai mari viituri înregistrate la intrarea Dunării în deltă: pe 25 aprilie 2006 au trecut 15 900 m³/s, recordul măsurătorilor zilnice începute în 1921. Pe brațul Sfântu Gheorghe au curs ~4 000 m³/s. Jetul iese din gură cu aproape 2 m/s, se desface în evantai după creasta barei și își lasă încărcătura: o pană de sediment groasă de 1–3 m lângă creastă, tot mai subțire spre larg.', fact: '{dv:0-2} în doi ani' },
    en: { kicker: '2005 – 2006 · record floods', title: 'The river attacks', body: 'In 2005 and 2006 came the largest floods ever recorded where the Danube enters the delta: on 25 April 2006, 15,900 m³/s flowed past, the record of the daily measurements that began in 1921. About 4,000 m³/s went down the Sfântu Gheorghe branch. The jet leaves the mouth at almost 2 m/s, fans out past the bar crest and drops its load: a wedge of sediment 1–3 m thick next to the crest, thinner and thinner out to sea.', fact: '{dv:0-2} in two years' },
    bubbles: [
      [-0.55, -0.05, { t: 'Unde se desprinde pana', b: 'Apa dulce e mai ușoară decât cea sărată. Chiar după creasta barei, jetul se desprinde de fund și se întinde la suprafață ca o pană tulbure. Dedesubt, apa mării curge înapoi spre gură. Acolo unde curentul de la fund scade brusc, sedimentul se oprește.' },
                      { t: 'Where the plume lifts off', b: 'Fresh water is lighter than salt water. Just past the bar crest the jet lifts off the bed and spreads at the surface as a muddy plume. Underneath, sea water flows back toward the mouth. Where the current at the bed drops suddenly, the sediment stops.' }],
      [0.4, 0.6, { t: 'Pana de sediment', b: 'Depunerea are 1–3 m pe partea dinspre larg a crestei și 0,5–1 m mai departe, spre prodeltă. Se subțiază și devine mai fină spre larg: nisip lângă gură, mâl mai departe. În apa sărată, mâlul se lipește în fulgi care cad repede, aproape de gură.' },
                 { t: 'The sediment wedge', b: 'The deposit is 1–3 m thick on the seaward side of the crest and 0.5–1 m further out, toward the prodelta. It thins and gets finer out to sea: sand near the mouth, mud further away. In salt water the mud sticks into flakes that sink fast, close to the mouth.' }],
      [0.2, -0.35, { t: 'Bara avansează', b: 'După cele două viituri, creasta barei s-a mutat cu aproximativ 300 m spre larg. Așa crește o deltă: gură după gură, viitură după viitură.' },
                   { t: 'The bar moves forward', b: 'After the two floods the bar crest had moved about 300 m out to sea. This is how a delta grows: mouth after mouth, flood after flood.' }]
    ]
  },
  {
    t: 2012.37, travel: 20, short: { ro: 'Furtuna 2012', en: 'Storm of 2012' }, tab: 'hs', ref: 6, proc: { q: 1250, hs: 6.6 },
    shot: { x: -0.35, z: 0.0, dist: 4.8, tilt: 56, head: -88 },
    ro: { kicker: 'februarie 2012 · furtună extremă', title: 'Marea contraatacă', body: 'Între 5 și 10 februarie 2012, o furtună extremă a ridicat în larg valuri de peste 7 m, cele mai mari din toți anii măsurătorilor. Ele se sparg deja la 8 m adâncime, ridică nisipul și mâlul de pe fund, iar curentul de-a lungul țărmului, de până la 2 m/s, le duce spre sud. Fluviul, cu ape mici, nu a putut răspunde. Într-un singur an, gura a pierdut aproape tot ce câștigase în cei doi ani de viituri.', fact: '{dv:6-7} într-un an' },
    en: { kicker: 'February 2012 · extreme storm', title: 'The sea strikes back', body: 'Between 5 and 10 February 2012, an extreme storm raised waves higher than 7 m offshore, the biggest in all the years of surveys. They break already in 8 m of water, lift sand and mud off the bed, and the longshore current, up to 2 m/s, carries them south. The river, at low water, could not answer. In a single year the mouth lost almost everything it had gained in the two flood years.', fact: '{dv:6-7} in one year' },
    bubbles: [
      [-0.7, -0.6, { t: 'Valuri care se sparg', b: 'Cu cât valurile sunt mai mari, cu atât se sparg mai departe de țărm: la 2 m adâncime pentru valuri de 1,5 m, la 8 m pentru valuri de 6 m. Furtuna din 2012 a lovit toată bara, nu doar creasta.' },
                    { t: 'Breaking waves', b: 'The higher the waves, the further from shore they break: in 2 m of water for 1.5 m waves, in 8 m for 6 m waves. The 2012 storm hit the whole bar, not just the crest.' }],
      [0.1, 0.0, { t: 'Unde a erodat', b: 'Cea mai mare eroziune a fost pe fața dinspre larg a crestei, până la 8 m adâncime, cu scăderi de 2–4 m în unele locuri. Doar în canalul fluviului s-a mai depus ceva.' },
                 { t: 'Where it eroded', b: 'The strongest erosion was on the seaward face of the crest, down to 8 m depth, with the bed dropping 2–4 m in places. Only in the river channel did some sediment settle.' }],
      [0.8, 0.6, { t: 'Nu doar nisip', b: 'Furtunile iau și mâlul fin de la adâncimi mai mari. Modelul arată că eroziunea din 2012 se explică doar dacă valurile ridică și acest mâl, nu doar nisipul.' },
                 { t: 'Not just sand', b: 'Storms also take the fine mud from deeper water. The model shows that the 2012 erosion can only be explained if the waves lift this mud too, not just the sand.' }],
      [-1.0, 1.4, { t: 'Încotro?', b: 'Sedimentul ridicat de furtuni pleacă mai ales spre sud, în suspensie, cu curentul de țărm. O parte din nisip hrănește insula Sacalin (povestea 3).' },
                  { t: 'Where to?', b: 'The sediment lifted by storms leaves mostly to the south, in suspension, with the longshore current. Part of the sand feeds Sacalin island (story 3).' }]
    ]
  },
  {
    t: 2017.79, travel: 16, short: { ro: 'Bilanțul', en: 'The score' }, tab: 'dv', ref: 0, proc: { q: 1900, hs: 1.4 }, periods: 1,
    shot: { x: -0.45, z: -0.3, dist: 5.6, tilt: 46, head: -72 },
    ro: { kicker: '2004 – 2017 · bilanț', title: 'Cine câștigă?', body: 'Fiecare an e o rundă: viiturile adaugă, furtunile scad. Studiul a găsit o regulă simplă: o oră de valuri peste 2,5 m anulează cam 15 ore de viitură peste 2 200 m³/s. Viiturile mari au fost rare, furtunile nu. Atinge o bară din grafic ca să vezi ce a lăsat fiecare rundă pe fundul mării.', fact: 'Bilanț 2004 – 2017: {dv:0-14}' },
    en: { kicker: '2004 – 2017 · the score', title: 'Who wins?', body: 'Every year is a round: floods add, storms take away. The study found a simple rule: one hour of waves above 2.5 m cancels about 15 hours of flood above 2,200 m³/s. Big floods were rare, storms were not. Touch a bar in the chart to see what each round left on the sea bed.', fact: 'Score 2004 – 2017: {dv:0-14}' },
    bubbles: [
      [-0.85, -0.75, { t: 'Bara rezistă, dar…', b: 'Bara nu dispare: se refac mereu creasta și canalul. Dar după 13 ani, la gură e mai puțin sediment decât la început. Fluviul pierde mai multe runde decât câștigă.' },
                      { t: 'The bar holds, but…', b: 'The bar does not disappear: the crest and the channel always rebuild. But after 13 years there is less sediment at the mouth than at the start. The river loses more rounds than it wins.' }]
    ]
  },
  {
    t: 2017.79, travel: 7, short: { ro: 'Țărmul', en: 'The coast' }, label: '1985–2025', tab: 'dv', ref: null, proc: { q: 1500, hs: 2.2 }, coast: 1,
    shot: { x: -5.5, z: -6.0, dist: 36, tilt: 20, head: -90 },
    ro: { kicker: '1985 – 2025 · țărmul', title: 'Țărmul plătește', body: 'Ce pierde gura la furtuni nu se mai întoarce. Pe țărmul dintre Sfântu Gheorghe și Sulina, marea înaintează în fiecare an (roșu: uscat luat de mare). Nisipul pleacă spre sud, în Sacalin, care se mută spre uscat și se lungește (auriu). Două cauze lucrează împreună: fluviul aduce mult mai puțin sediment de când există barajele, iar la fiecare gură, în lupta dintre viituri și valuri, marea câștigă tot mai des.', fact: 'Nord: {cn:lost} km² pierduți · {cn:rate} m pe an' },
    en: { kicker: '1985 – 2025 · the coast', title: 'The coast pays the price', body: 'What the mouth loses to storms does not come back. On the coast between Sfântu Gheorghe and Sulina the sea moves inland every year (red: land taken by the sea). The sand travels south, to Sacalin, which moves landward and grows longer (gold). Two causes work together: the river brings far less sediment since the dams were built, and at every mouth, in the fight between floods and waves, the sea wins more and more often.', fact: 'North: {cn:lost} km² lost · {cn:rate} m a year' },
    bubbles: [
      [-0.3, -16.5, { t: 'Țărmul de la nord', b: 'În dreptul lacului Roșu și mai departe, pe cei 26 km dintre gura Sfântu Gheorghe și Sulina, marea a luat între 1985 și 2025 {cn:lost} km² de uscat: în medie {cn:rate} m pe an, iar pe porțiunile cele mai afectate peste {cn:max} m în 40 de ani. Aceste plaje erau hrănite de nisipul gurilor Dunării; azi primesc prea puțin.' },
                    { t: 'The northern coast', b: 'Off Lake Roșu and beyond, on the 26 km between the Sfântu Gheorghe mouth and Sulina, the sea took {cn:lost} km² of land between 1985 and 2025: on average {cn:rate} m a year, and more than {cn:max} m in 40 years on the worst stretches. These beaches were fed by the sand of the Danube mouths; today they get too little.' }],
      [-10.5, 9.5, { t: 'Sacalin: se mută și crește', b: 'Insula pierde pe partea dinspre mare ({cs:lost} km², roșu), dar câștigă spre lagună și la capătul sudic ({cs:gain} km², auriu): se rostogolește spre uscat cu până la {cs:max} m și se lungește. Nisipul luat de valuri la gură și pe țărmul din jur ajunge aici (povestea 3).' },
                   { t: 'Sacalin: moving and growing', b: 'The island loses on its seaward side ({cs:lost} km², red) but gains toward the lagoon and at its southern tip ({cs:gain} km², gold): it rolls landward by up to {cs:max} m and grows longer. The sand that waves take from the mouth and the nearby coast ends up here (story 3).' }],
      [1.2, -1.0, { t: 'Bătălia de la guri', b: 'Aceeași luptă se dă la fiecare gură a Dunării: viiturile aduc, valurile iau. Cât timp fluviul aducea mult sediment, gurile câștigau și delta creștea spre mare. Cu de trei ori mai puțin sediment, gurile pierd mai multe runde, iar țărmul dintre ele rămâne fără nisip și se retrage.' },
                  { t: 'The battle at the mouths', b: 'The same fight goes on at every Danube mouth: floods bring, waves take. While the river brought plenty of sediment, the mouths won and the delta grew out to sea. With three times less sediment, the mouths lose more rounds, and the coast between them runs short of sand and retreats.' }]
    ]
  },
  {
    t: 2017.79, travel: 6, short: { ro: 'De ce?', en: 'Why?' }, tab: 'dv', ref: 0, proc: { q: 3600, hs: 0.8 }, basin: 1,
    shot: { x: -0.2, z: -3.3, dist: 14, tilt: 40, head: -72 },
    ro: { kicker: 'Cauza', title: 'Sedimentul oprit la Porțile de Fier', body: 'Dunărea aduce azi în deltă de aproximativ trei ori mai puțin sediment decât înainte de anii ’70. Barajele Porțile de Fier I (1972) și II (1984), la peste 860 km în amonte, rețin în lacurile lor o mare parte din nisipul și mâlul venite din bazin. Fără el, viiturile nu mai pot ține pasul cu valurile, iar fruntea deltei se retrage. Cercul se închide: bazinul care a clădit delta îi ține azi sedimentul departe de mare.', fact: '≈ 60 → ≈ 20 milioane t pe an' },
    en: { kicker: 'The cause', title: 'Sediment stopped at the Iron Gates', body: 'Today the Danube brings about three times less sediment into the delta than before the 1970s. The Iron Gates I (1972) and II (1984) dams, more than 860 km upstream, hold back in their reservoirs much of the sand and mud coming from the basin. Without it, floods can no longer keep up with the waves, and the delta front retreats. The circle closes: the basin that built the delta now keeps its sediment away from the sea.', fact: '≈ 60 → ≈ 20 million t a year' },
    bubbles: []
  }
];

// the basin panel: dams and the mouth [ro, en, lon, lat, year]
export const DAMS = [
  ['Porțile de Fier I', 'Iron Gates I', 22.53, 44.67, 1972],
  ['Porțile de Fier II', 'Iron Gates II', 22.57, 44.30, 1984]
];
export const MOUTH_LL = [29.62, 44.89];
// suspended sediment entering the delta, million t / yr (the paper: 640 kg/s 2004–2015, ~3× less than before the Iron Gates)
export const SED = { before: 60, today: 20 };
