// Povestea Deltei — story content (RO / EN). Edit texts, timings, camera shots, stops and bubbles here.
// The visitor rides the story "on rails": STOPS (bottom of the file) are the stations; ▶ / ◀ travel between them.
// Coordinates: km, x = east, z = south, origin = centre of the delta grid (Stereo 70 E 827040, N 390360).
// Camera shot: {x, z, dist (km), tilt (deg from vertical), head (deg, 0 = looking north)}.
// Time t is in ka (thousands of years before present).
// Optional per chapter: path: [[tf, shot], ...] (camera keyframes), tmap: [[tf, ka], ...] (time warp),
//   proc: { waves: 0..1, lst: {z0, z1 (km, stretch of coast), tip: follow the growing spit}, plumes: 0..1, ice, river, basin }

// "Method & sources" panel (shared/storyui.js): sections of HTML, RO + EN.
const REF_VS17 = 'Vespremeanu-Stroe A., Zăinescu F., Preoteasa L., Tătui F., Rotaru S., Morhange C., Stoica M., Hanganu J., Timar-Gabor A., Cârdan I., Piotrowska N. (2017). <i>Holocene evolution of the Danube delta: An integral reconstruction and a revised chronology.</i> Marine Geology 388: 38–61.';
export const SOURCES = {
  ro: {
    lead: 'Ce este măsurat, ce este reconstruit și ce este doar schematic în această poveste.',
    sections: [
      { h: 'Reconstrucția deltei', html: `<p>Etapele deltei — contururile lobilor, ale lagunelor și ale grindurilor de nisip, și vârsta lor — urmează reconstrucția integrală a lui <b>Vespremeanu-Stroe et al. (2017)</b> (Fig. 9). Autorii au pus laolaltă analize sedimentologice și morfologice ale forajelor și carotelor cu vârste absolute, mai vechi și noi, obținute prin <b>radiocarbon (AMS ¹⁴C)</b> și <b>luminescență stimulată optic (OSL)</b>, și au construit o cronologie pentru toți lobii deltei și toate câmpurile de grinduri.</p>` },
      { h: 'Cum aflăm vârsta nisipului și a mâlului', html: `<p><span class="tag">¹⁴C</span><b>Radiocarbon.</b> Plantele și animalele iau carbon din aer și din apă, iar o parte infimă din el este radioactivă: carbonul-14. După ce mor, nu mai primesc carbon nou, iar carbonul-14 se dezintegrează încet — la fiecare ~5.730 de ani rămâne jumătate. Măsurând cât a mai rămas în cochilii, turbă sau resturi de plante prinse în sedimente, aflăm de când sunt acolo (până la ~50.000 de ani). „AMS” înseamnă că atomii sunt numărați direct, cu un accelerator, din doar câteva miligrame de probă.</p>
<p><span class="tag">OSL</span><b>Luminescență stimulată optic.</b> Boabele de cuarț și feldspat din nisip adună încet energie de la radioactivitatea naturală din jur, cât timp stau îngropate, la întuneric; lumina soarelui le „golește”. În laborator boabele sunt luminate și emit o lumină slabă: cu cât e mai multă, cu atât nisipul a stat mai mult îngropat. Așa aflăm când a fost acoperit ultima oară nisipul unui grind sau al unei plaje.</p>
<p>Cele două metode se completează: ¹⁴C datează materia organică din mâlul lagunelor și din turbă, iar OSL datează direct nisipul grindurilor, unde materia organică lipsește.</p>` },
      { h: 'Relief, mare și bazin', html: `<ul>
<li>Relieful uscatului este cel de azi: modelul LiDAR al deltei (Ministerul Mediului, pentru Universitatea din București) și batimetria GEBCO. Fundul Golfului Dunării și șelful dinaintea deltei sunt reconstruite schematic.</li>
<li>Nivelul mării urmează constrângerile din același studiu; valorile mai vechi de 7.500 de ani sunt aproximative.</li>
<li>Calotele de gheață și ghețarii sunt desenați schematic.</li>
<li>Bazinul Dunării și cursul ei sunt calculate din GEBCO; afluenții sunt schematici.</li>
<li>Antropocenul (ultima stație): canalele, digurile și polderele din hărțile vectoriale folosite de DELTA-Hub. Sensul pulsurilor de pe canale și brațele principale vin din modelul hidrodinamic DELTA-Hub (nivelul apei în timpul viiturii din 2023–2024).</li></ul>` },
      { h: 'Referințe', html: `<p class="ref">${REF_VS17}</p><p class="ref">GEBCO Compilation Group. <i>GEBCO global bathymetric grid.</i> British Oceanographic Data Centre.</p><p class="ref">Ministerul Mediului, pentru Universitatea din București: modelul digital al terenului din date LiDAR al Deltei Dunării.</p>` }
    ]
  },
  en: {
    lead: 'What is measured, what is reconstructed and what is only schematic in this story.',
    sections: [
      { h: 'Reconstructing the delta', html: `<p>The stages of the delta — the outlines of its lobes, lagoons and sand ridges, and their ages — follow the integral reconstruction by <b>Vespremeanu-Stroe et al. (2017)</b> (Fig. 9). The authors brought together sedimentological and morphological analyses of boreholes and cores with absolute ages, earlier and new, from <b>radiocarbon (AMS ¹⁴C)</b> and <b>optically stimulated luminescence (OSL)</b>, and built a chronology for all the delta lobes and beach-ridge plains.</p>` },
      { h: 'How we know the age of sand and mud', html: `<p><span class="tag">¹⁴C</span><b>Radiocarbon.</b> Plants and animals take up carbon from the air and the water, and a tiny part of it is radioactive: carbon-14. Once they die they take up no new carbon, and the carbon-14 slowly decays — every ~5,730 years half of it is gone. Measuring how much is left in shells, peat or plant remains trapped in the sediment tells us how long they have been there (up to ~50,000 years). “AMS” means the atoms are counted directly, with an accelerator, from just a few milligrams.</p>
<p><span class="tag">OSL</span><b>Optically stimulated luminescence.</b> Quartz and feldspar grains in sand slowly store energy from the natural radioactivity around them while they lie buried in the dark; sunlight empties them. In the lab the grains are lit and give off a faint glow: the more light, the longer the sand has been buried. This tells us when the sand of a ridge or a beach was last covered.</p>
<p>The two methods complement each other: ¹⁴C dates organic matter in lagoon mud and peat, OSL dates the ridge sand itself, where organic matter is missing.</p>` },
      { h: 'Relief, sea and basin', html: `<ul>
<li>Land relief is today’s: the delta LiDAR model (Ministry of Environment, for the University of Bucharest) and GEBCO bathymetry. The floor of the Danube Bay and the shelf before the delta are schematic reconstructions.</li>
<li>Sea level follows the constraints of the same study; values older than 7,500 years are approximate.</li>
<li>Ice sheets and glaciers are drawn schematically.</li>
<li>The Danube basin and course are derived from GEBCO; the tributaries are schematic.</li>
<li>The Anthropocene (last station): canals, dikes and polders from the vector maps used by DELTA-Hub. The direction of the pulses on the canals and the main branches come from the DELTA-Hub hydrodynamic model (water levels during the 2023–2024 flood).</li></ul>` },
      { h: 'References', html: `<p class="ref">${REF_VS17}</p><p class="ref">GEBCO Compilation Group. <i>GEBCO global bathymetric grid.</i> British Oceanographic Data Centre.</p><p class="ref">Ministry of Environment, for the University of Bucharest: LiDAR digital terrain model of the Danube Delta.</p>` }
    ]
  }
};

export const UI = {
  ro: { title: 'Povestea Deltei', sub: '8.000 de ani de nisip, mâl și apă', tap: 'Atinge ecranul pentru a începe', ago: n => `acum ${n} de ani`, year: y => `anul ${y}`, today: 'azi', sea: 'Nivelul mării', vsToday: 'față de azi', restart: 'De la început', play: 'Pornește', pause: 'Pauză', data: 'Despre date', qr: 'Ia povestea acasă', lang: 'EN', next: 'Înainte', prev: 'Înapoi', menu: 'Meniu', nextStory: 'Următoarea poveste', soon: 'în curând', hintStart: 'Apasă ▶ ca să pornești. Trage cu degetul ca să privești în jur.', nudge: 'Apasă aici când ești gata', hintBub: 'Atinge bulele ca să afli mai multe.', legend: ['Câmpie deltaică', 'Lacuri / lagune', 'Grinduri de nisip', 'Mare'], proc: ['Valuri', 'Curent longitudinal', 'Sedimente la guri'], anth: ['Canale', 'Diguri', 'Poldere'], bc: 'î.Hr.', ad: 'd.Hr.' },
  en: { title: 'The Story of the Delta', sub: '8,000 years of sand, mud and water', tap: 'Touch the screen to begin', ago: n => `${n} years ago`, year: y => `year ${y}`, today: 'today', sea: 'Sea level', vsToday: 'vs. today', restart: 'Start over', play: 'Play', pause: 'Pause', data: 'About the data', qr: 'Take the story home', lang: 'RO', next: 'Next', prev: 'Back', menu: 'Menu', nextStory: 'Next story', soon: 'coming soon', hintStart: 'Press ▶ to set off. Drag with a finger to look around.', nudge: 'Press here when you’re ready', hintBub: 'Touch the bubbles to learn more.', legend: ['Delta plain', 'Lakes / lagoons', 'Sand ridges', 'Sea'], proc: ['Waves', 'Longshore current', 'River sediment'], anth: ['Canals', 'Dikes', 'Polders'], bc: 'BC', ad: 'AD' }
};

// the Start view: the whole Danube basin (schematic: outline + Danube + main tributaries), the ice-sheet edge at the top
const BASIN_SHOT = { x: -500, z: -250, dist: 2650, tilt: 26, head: 24 };   // 2026-10-21: a little closer (was 3050)

export const CHAPTERS = [
  {
    // Start → the ice melts while the camera follows the Danube from its basin down to the Black Sea
    id: 'gheata', t0: 11.7, t1: 10.0, dur: 26, europe: true, proc: { ice: true, river: true, basin: true },   // Start = beginning of the Holocene
    path: [[0, BASIN_SHOT], [0.3, { x: -520, z: -260, dist: 1900, tilt: 30, head: 0 }],
           [0.62, { x: -120, z: -20, dist: 1050, tilt: 38, head: 0 }], [1, { x: 60, z: 30, dist: 560, tilt: 40, head: 0 }]],
    ro: { kicker: 'Povestea Deltei', title: 'Gheața se topește', body: 'Începe Holocenul: clima se încălzește, calotele se retrag, ghețarii urcă pe munți, iar oceanul continuă să crească. Dunărea duce apa și sedimentele bazinului ei spre Marea Neagră, aflată mult mai jos decât azi.', fact: '' },
    en: { kicker: 'The Story of the Delta', title: 'The ice melts', body: 'The Holocene begins: the climate warms, the ice sheets retreat, the glaciers withdraw up the mountains and the ocean keeps rising. The Danube carries the water and sediment of its basin to the Black Sea, which then lay far below its present level.', fact: '' }
  },
  {
    id: 'marea', t0: 10.0, t1: 8.0, dur: 20, europe: true,
    tmap: [[0, 10.0], [0.25, 9.5], [0.9, 8.2], [1, 8.0]],          // most of the ride is spent on the flooding of the bay
    shot0: { x: 60, z: 30, dist: 560, tilt: 40, head: 0 },
    shot1: { x: 2, z: -14, dist: 165, tilt: 44, head: -15 },
    ro: { kicker: 'Capitolul 1', title: 'Marea urcă', body: 'Acum circa 9.400 de ani, apele Mediteranei au trecut prin Bosfor și Marea Neagră s-a reconectat la oceanul planetar. Nivelul a continuat să urce și a inundat valea Dunării de Jos, între Dobrogea și Podișul Bugeacului. Așa s-a format Golful Dunării, locul în care avea să crească delta.', fact: 'Golful Dunării avea adâncimi de 8–12 m' },
    en: { kicker: 'Chapter 1', title: 'The sea rises', body: 'About 9,400 years ago, Mediterranean water spilled through the Bosphorus and the Black Sea was reconnected to the world ocean. The water kept rising and flooded the lower Danube valley between Dobrogea and the Bugeac Plateau. This created the Danube Bay, where the delta would grow.', fact: 'The Danube Bay was 8–12 m deep' }
  },
  {
    id: 'nastere', t0: 8.0, t1: 7.5, dur: 24, proc: { plumes: 1 },
    shot0: { x: -24, z: -23, dist: 78, tilt: 46, head: 20 },
    shot1: { x: -13, z: -25, dist: 68, tilt: 34, head: 8 },            // close and steep: the lobe and its mouths
    ro: { kicker: 'Capitolul 2', title: 'Geneza', body: 'Când marea și-a încetinit urcușul, delta a putut lua naștere. Când apa fluviului intră în golf, curentul își pierde viteza și nu mai poate duce sedimentele: nisipul se depune chiar la gura de vărsare, iar mâlul puțin mai departe. Bancurile de la guri cresc, ies la suprafață și despart apa în brațe noi. Așa înaintează delta. Primul ei lob, „Dunărea Veche”, crește spre est în apele liniștite ale golfului; resturile lui stau azi îngropate la 4–6 m adâncime.', fact: 'Primul lob: Dunărea Veche, 8.000–5.500 de ani în urmă' },
    en: { kicker: 'Chapter 2', title: 'Genesis', body: 'Once the rising sea slowed down, the delta could be born. When the river enters the bay, its current slows down and can no longer carry its load: sand settles right at the mouth, mud a little further out. The bars at the mouths grow, emerge and split the flow into new branches. That is how a delta advances. Its first lobe, the "Old Danube", grows eastward into the calm bay; what remains of it now lies buried 4–6 m deep.', fact: 'First lobe: Old Danube, 8,000–5,500 years ago' }
  },
  {
    id: 'grind', t0: 7.5, t1: 5.5, dur: 28, proc: { waves: 1, lst: { z0: -80, z1: -20, tip: true }, plumes: 0.6 },
    shot0: { x: 22, z: -44, dist: 145, tilt: 48, head: -25 },
    shot1: { x: 22, z: -40, dist: 125, tilt: 50, head: -28 },          // frames the whole spit, root to junction
    ro: { kicker: 'Capitolul 3', title: 'Valurile și grindul inițial', body: 'Valurile vin mai ales dinspre nord-est și lovesc țărmul oblic. Ele pun în mișcare un curent paralel cu țărmul, curentul longitudinal, care cară nisipul spre sud. Acum circa 6.700–6.500 de ani, nisipul erodat din țărmurile Bugeacului (Ucraina) începe să construiască un cordon lung, „grindul inițial”, care crește de la nord la sud și închide golful în aproximativ 1.000 de ani. În spatele lui, golful devine lagună.', fact: 'Grindul înainta spre sud cu ~35 m pe an' },
    en: { kicker: 'Chapter 3', title: 'Waves and the first barrier', body: 'Waves come mostly from the north-east and strike the shore at an angle. They drive a current along the coast, the longshore current, that carries sand southward. About 6,700–6,500 years ago, sand eroded from the Bugeac coast (Ukraine) starts building a long barrier, the "initial spit", which grows from north to south and closes the bay in about 1,000 years. Behind it, the bay becomes a lagoon.', fact: 'The spit advanced southward by ~35 m a year' }
  },
  {
    id: 'sfg', t0: 5.5, t1: 3.5, dur: 28, proc: { waves: 1, lst: { z0: -80, z1: 0 }, plumes: 1 },
    shot0: { x: 18, z: -14, dist: 125, tilt: 48, head: -15 },
    shot1: { x: 22, z: -6, dist: 115, tilt: 50, head: -8 },
    ro: { kicker: 'Capitolul 4', title: 'Sfântu Gheorghe înaintează în mare', body: 'Brațul Sf. Gheorghe ajunge în mare deschisă și se pune în calea curentului longitudinal: nisipul venit dinspre nord se oprește în fața gurii și se așază în șiruri de grinduri paralele, grindul Caraorman. La gura de vărsare se dă o luptă continuă: fluviul împinge sedimentele în larg, valurile le întorc și le împrăștie de-a lungul țărmului. Rezultatul e un lob asimetric, cu grinduri de nisip în amonte și câmpii mlăștinoase în aval.', fact: '≈1.000 km² de uscat nou în 2.500 de ani' },
    en: { kicker: 'Chapter 4', title: 'The Sfântu Gheorghe advances into the sea', body: 'The Sfântu Gheorghe branch reaches the open sea and blocks the longshore current: sand arriving from the north is trapped in front of the mouth and piles up in parallel ridges, the Caraorman ridge plain. At the mouth a constant struggle goes on: the river pushes sediment offshore, the waves push it back and spread it along the coast. The result is an asymmetric lobe, with sand ridges updrift and marshy plains downdrift.', fact: '≈1,000 km² of new land in 2,500 years' }
  },
  {
    id: 'sulina', t0: 3.5, t1: 2.0, dur: 26, proc: { waves: 1, lst: { z0: -80, z1: -24 }, plumes: 1 },
    shot0: { x: 24, z: -22, dist: 120, tilt: 48, head: -20 },
    shot1: { x: 20, z: -12, dist: 135, tilt: 50, head: -10 },
    ro: { kicker: 'Capitolul 5', title: 'Sulina preia conducerea', body: 'Acum circa 3.500 de ani, o avulsie mută apa spre brațul Sulina, care rupe vechiul cordon. Lobul Sulina crește repede, cu până la 20–27 m pe an. La nord de gura lui, nisipul adus de curentul longitudinal clădește grindul Letea, cel mai mare din deltă. Rămas fără apă și sedimente, lobul Sf. Gheorghe este erodat de valuri: se pierd circa 123 km². La sud, brațul Dunavăț își construiește propriul lob.', fact: 'Gura Sulinei se afla cu până la 6 km mai în larg decât azi' },
    en: { kicker: 'Chapter 5', title: 'The Sulina takes over', body: 'About 3,500 years ago, an avulsion shifts the flow to the Sulina branch, which breaks through the old barrier. The Sulina lobe grows fast, by up to 20–27 m a year. North of its mouth, sand brought by the longshore current builds the Letea ridge plain, the largest in the delta. Starved of water and sediment, the Sfântu Gheorghe lobe is eaten away by the waves: about 123 km² are lost. To the south, the Dunavăț branch builds a lobe of its own.', fact: 'The Sulina mouth lay up to 6 km further offshore than today' }
  },
  {
    id: 'avulsii', t0: 2.0, t1: 1.35, dur: 22, proc: { waves: 0.7, plumes: 1 },
    shot0: { x: 0, z: -5, dist: 165, tilt: 45, head: 0 },
    shot1: { x: 3, z: 2, dist: 160, tilt: 47, head: -5 },   // 2026-10-21: further south so Histria is in view (was x 5, z −10)
    ro: { kicker: 'Capitolul 6', title: 'Marile avulsii', body: 'Acum 2.100–1.900 de ani, Dunărea își redistribuie apele între brațe. Sf. Gheorghe se reactivează, Dunavățul își construiește al doilea lob, iar brațul Chilia începe să umple lagunele din nord, cum este Pardina. Lobul Sulina intră în declin.', fact: 'Cetatea greacă Histria exista deja de câteva secole la sud de deltă' },
    en: { kicker: 'Chapter 6', title: 'The great avulsions', body: '2,100–1,900 years ago, the Danube redistributes its flow among its branches. The Sfântu Gheorghe comes back to life, the Dunavăț builds its second lobe, and the Chilia branch begins to fill the northern lagoons, such as Pardina. The Sulina lobe starts to decline.', fact: 'The Greek city of Histria, south of the delta, was already centuries old' }
  },
  {
    id: 'azi', t0: 1.35, t1: 0.0, dur: 36, reveal: true, proc: { waves: 1, lst: { z0: -80, z1: 22 }, plumes: 1 },
    tmap: [[0, 1.35], [0.45, 0.3], [0.84, 0.0], [1, 0.0]],
    zoom: { x: 37, z: 11, dist: 42, tilt: 42, head: -15, in: [0.52, 0.60], out: [0.76, 0.86] },
    shot0: { x: 25, z: -25, dist: 140, tilt: 48, head: -15 },
    shot1: { x: 15, z: -11, dist: 102, tilt: 40, head: 0 },   // 2026-10-21: closer (was dist 145, then 118)
    ro: { kicker: 'Capitolul 7', title: 'Delta de azi', body: 'Brațul Chilia ajunge la mare acum circa 900 de ani, iar după 1750 construiește cel mai tânăr lob al deltei, înaintând cu până la 100 m pe an. La gura brațului Sf. Gheorghe, după marea viitură din 1897, apare în 1898 insula Sacalin. În secolul XX, lucrările umane din bazinul Dunării reduc drastic aportul de sedimente, iar valurile încep să recâștige teren.', fact: 'Continuăm cu povestea Sacalinului →' },
    en: { kicker: 'Chapter 7', title: 'The delta today', body: 'The Chilia branch reaches the sea about 900 years ago, and after 1750 it builds the youngest lobe of the delta, advancing by up to 100 m a year. At the mouth of the Sfântu Gheorghe, after the great flood of 1897, Sacalin Island emerges in 1898. In the 20th century, human works across the Danube basin sharply cut the sediment supply, and the waves begin to win back ground.', fact: 'Next: the story of Sacalin →' }
  }
];

// river mouths: the plume starts where the arm, followed from its anchor along dir, meets the coast of the moment
// strength keyframes [ka, 0..1] (0 = inactive)
export const MOUTHS = [
  { id: 'olddanube', anchor: [-30.5, -24.6], dir: [1, 0.3], str: [[8.0, 1], [5.9, 0.8], [5.5, 0]] },
  { id: 'protosulina', anchor: [-7.7, -26.8], dir: [1, -0.1], str: [[7.5, 0.6], [5.7, 0.5], [5.5, 0]] },
  { id: 'sfg', anchor: [-3.7, -7.9], dir: [0.97, 0.2], str: [[6.0, 1], [3.6, 1], [3.3, 0.3], [2.1, 0.3], [1.9, 0.9], [0, 0.9]] },
  { id: 'sulina', anchor: [5.6, -27], dir: [1, 0.02], str: [[3.5, 0.7], [3.3, 1], [2.0, 1], [1.6, 0.4], [0, 0.35]] },
  { id: 'dunavat', anchor: [-3.5, 4.5], dir: [0.35, 0.94], str: [[2.6, 0.7], [1.5, 0.7], [1.3, 0]] },
  { id: 'chilia', anchor: [26.2, -49.2], dir: [1, -0.08], str: [[0.9, 0.5], [0.3, 0.6], [0.2, 1], [0, 0.8]] }
];

// map labels: [ro, en, x, z, tFrom, tTo (ka; visible while tFrom >= t >= tTo), kind]
export const LABELS = [
  ['Marea Neagră', 'Black Sea', 250, 215, 20, 10.01, 'sea'],
  ['Scandinavia', 'Scandinavia', -760, -1900, 20, 10.81, 'land'],
  ['Alpi', 'Alps', -1380, -250, 20, 10.9, 'land'],
  ['Carpați', 'Carpathians', -300, -250, 20, 10.01, 'land'],
  ['Balcani', 'Balkans', -330, 200, 20, 10.9, 'land'],
  ['Marea Mediterană', 'Mediterranean Sea', -1500, 800, 20, 10.81, 'sea'],
  ['Bosfor', 'Bosphorus', 13, 416, 20, 9.0, 'feat'],
  ['Izvoarele Dunării', 'Danube source', -1568, -465, 20, 10.9, 'feat'],
  ['Viena', 'Vienna', -966, -389, 20, 10.9, 'town'],
  ['Budapesta', 'Budapest', -775, -293, 20, 10.9, 'town'],
  ['Belgrad', 'Belgrade', -686, 11, 20, 10.9, 'town'],
  ['Porțile de Fier', 'Iron Gates', -525, 43, 20, 10.9, 'feat'],
  ['Bazinul Dunării', 'Danube basin', -880, -150, 20, 10.9, 'basin'],
  ['Marea Neagră', 'Black Sea', 110, 25, 10, 0, 'sea'],
  ['Dobrogea', 'Dobrogea', -55, 25, 10, 0, 'land'],
  ['Golful Dunării', 'Danube Bay', 1.8, -22.2, 9.4, 5.8, 'feat'],
  ['Tulcea', 'Tulcea', -28.3, -25.6, 10, 0, 'town'],
  ['Histria', 'Histria', -27.1, 44.8, 2.65, 0, 'town'],
  ['Lobul Dunării Vechi', 'Old Danube lobe', -13.3, -20.1, 7.9, 5.6, 'feat'],
  ['Grindul inițial', 'Initial spit', 32.1, -54, 6.6, 5.0, 'feat'],
  ['6.700 ani', '6,700 yr', 37.5, -65.5, 6.7, 5.2, 'age'],
  ['6.200 ani', '6,200 yr', 25.7, -43.9, 6.2, 5.2, 'age'],
  ['5.700 ani', '5,700 yr', 14.0, -19, 5.7, 5.2, 'age'],
  ['Lagună', 'Lagoon', 4.3, -48.9, 5.5, 2.2, 'feat'],
  ['Lobul Sf. Gheorghe', 'Sfântu Gheorghe lobe', 25, 0.3, 5.2, 3.3, 'feat'],
  ['Caraorman', 'Caraorman', 18.6, -15.5, 4.6, 0, 'feat'],
  ['Lobul Sulina', 'Sulina lobe', 37.9, -22.7, 2.9, 1.6, 'feat'],
  ['Letea', 'Letea', 28.1, -39.5, 2.8, 0, 'feat'],
  ['Dunavăț', 'Dunavăț', -1.4, 19.7, 2.5, 1.2, 'feat'],
  ['Pardina', 'Pardina', -16.5, -39.1, 1.8, 0, 'feat'],
  ['Brațul Chilia', 'Chilia branch', 7.8, -48.9, 1.8, 0, 'feat'],
  ['Lobul Chilia', 'Chilia lobe', 47, -51.4, 0.3, 0, 'feat'],
  ['Sulina', 'Sulina', 39.0, -26.7, 3.3, 0, 'town'],
  ['Sfântu Gheorghe', 'Sfântu Gheorghe', 38.0, 2.6, 1.3, 0, 'town'],
  ['Lacul Razim', 'Lake Razim', -14, 3.6, 1.9, 0, 'feat'],
  ['Sacalin · 1898', 'Sacalin · 1898', 38.4, 9.6, 0.128, 0, 'feat']
];

// historical anchors shown on the timeline (ka)
export const ANCHORS = [
  { t: 4.5, ro: 'Piramidele din Giza', en: 'Pyramids of Giza' },
  { t: 2.65, ro: 'Grecii fondează Histria', en: 'Greeks found Histria' },
  { t: 0.128, ro: 'Apare Sacalinul (1898)', en: 'Sacalin emerges (1898)' }
];

// schematic ice: [ka, Fennoscandian radius km, British–Irish radius km, glacier depression 0..1]
// (1 = Last Glacial Maximum snowlines, 0 = today's)
export const ICE = [
  [20, 1150, 470, 1.0], [18, 1060, 400, 0.95], [16, 920, 270, 0.85], [14.5, 780, 150, 0.6],
  [13, 660, 60, 0.5], [12, 610, 70, 0.48], [11, 430, 0, 0.2], [10, 260, 0, 0.08], [9, 0, 0, 0.02]
];

/* ==================================================================== STOPS (stations on the rail)
   ch: chapters travelled to reach this stop (their animations play in order); the stop sits at the END of its last chapter.
   travel: seconds per chapter while travelling forward (◀ goes back 2.5× faster).
   short: station name under the dot. bubbles: [x, z (km, same frame as LABELS), ro {t, b}, en {t, b}].
   ⚠ Bubble texts are a DRAFT written by Claude — check every fact before the exhibition. */
export const TRAVEL = { gheata: 5, marea: 7.5, nastere: 5.5, grind: 7, sfg: 6.5, sulina: 5.5, avulsii: 4.5, azi: 10 };

export const STOPS = [
  {
    ch: [], short: { ro: 'Start', en: 'Start' },
    ro: { kicker: 'Povestea Deltei', title: 'O călătorie de 11.700 de ani', body: 'Povestea Deltei începe odată cu Holocenul, acum 11.700 de ani: o perioadă de transformări profunde, în care calotele și ghețarii se topesc, iar temperaturile și nivelul oceanului cresc. Delta e clădită din nisipul și mâlul pe care Dunărea le adună din tot bazinul ei, de la Alpi la Carpați și Balcani. Pornim când oceanul era cu circa 60 m mai jos decât azi și ajungem în delta de azi, oprindu-ne în 6 stații.', fact: 'Bazinul Dunării: ~801.000 km², 19 țări' },
    en: { kicker: 'The Story of the Delta', title: 'An 11,700-year journey', body: 'The story of the Delta begins with the Holocene, 11,700 years ago: a time of profound change, as the ice sheets and glaciers melt and temperatures and the ocean rise. The delta is built from the sand and mud the Danube gathers across its whole basin, from the Alps to the Carpathians and the Balkans. We set off when the ocean stood about 60 m below today and travel to the delta of today, stopping at 6 stations.', fact: 'Danube basin: ~801,000 km², 19 countries' },
    bubbles: [
      [-560, -1430, { t: 'Calota de gheață', b: 'La începutul Holocenului, Scandinavia era încă acoperită de o calotă groasă de peste 2 km. La maximul glaciar, acum circa 20.000 de ani, ea ajungea până în Germania și Polonia de azi, iar oceanul era cu ~120 m mai jos. Greutatea gheții a apăsat scoarța terestră, care încă se ridică și azi, cu câțiva milimetri pe an.' },
                     { t: 'The ice sheet', b: 'At the start of the Holocene, Scandinavia was still covered by an ice sheet more than 2 km thick. At the glacial maximum, about 20,000 years ago, it reached as far as today’s Germany and Poland, and the ocean stood ~120 m lower. The weight of the ice pressed the Earth’s crust down, and the crust is still rising today, by a few millimetres a year.' }],
      [-737, -246, { t: 'Bazinul Dunării', b: 'Dunărea izvorăște din Pădurea Neagră și curge aproape 2.850 km până la Marea Neagră. Bazinul ei, de circa 801.000 km² în 19 țări, adună prin Inn, Drava, Sava, Tisa, Olt, Siret și Prut apa și sedimentele din Alpi, Carpați și Balcani: materia primă a deltei.' },
                   { t: 'The Danube basin', b: 'The Danube rises in the Black Forest and flows almost 2,850 km to the Black Sea. Its basin, about 801,000 km² across 19 countries, gathers through the Inn, Drava, Sava, Tisza, Olt, Siret and Prut the water and sediment of the Alps, the Carpathians and the Balkans: the raw material of the delta.' }],
      [130, 140, { t: 'Marea Neagră, un lac', b: 'Cu oceanul cu zeci de metri mai jos decât azi, pragul Bosforului era uscat. Marea Neagră era un lac izolat, cu apă mai puțin sărată, iar țărmul ei stătea departe, pe platforma continentală de azi.' },
                 { t: 'The Black Sea, a lake', b: 'With the ocean tens of metres below today, the Bosphorus sill was dry land. The Black Sea was an isolated lake, less salty, and its shore lay far out on today’s continental shelf.' }]
    ]
  },
  {
    ch: [0, 1], short: { ro: 'Golful Dunării', en: 'Danube Bay' },
    ro: { kicker: 'Capitolul 1', title: 'Marea urcă', body: 'Acum circa 9.400 de ani, apele Mediteranei au trecut prin Bosfor și Marea Neagră s-a reconectat la oceanul planetar. Nivelul a continuat să urce și a inundat valea Dunării de Jos, între Dobrogea și Podișul Bugeacului: s-a format Golful Dunării, locul în care avea să crească delta.', fact: 'Golful Dunării avea adâncimi de 8–12 m' },
    en: { kicker: 'Chapter 1', title: 'The sea rises', body: 'About 9,400 years ago, Mediterranean water spilled through the Bosphorus and the Black Sea was reconnected to the world ocean. The water kept rising and flooded the lower Danube valley between Dobrogea and the Bugeac Plateau: the Danube Bay was born, where the delta would grow.', fact: 'The Danube Bay was 8–12 m deep' },
    bubbles: [
      [1.8, -22.2, { t: 'Golful Dunării', b: 'Un golf adânc de 8–12 m, ferit de valurile mării deschise. Aici, în ape liniștite, sedimentele fluviului se puteau depune ușor: leagănul deltei.' },
               { t: 'The Danube Bay', b: 'A bay 8–12 m deep, sheltered from the open-sea waves. Here, in calm water, the river’s sediment could settle easily: the cradle of the delta.' }],
      [34.4, -3.7, { t: 'Cât de repede a urcat marea', b: 'Între 11.700 și 8.000 de ani în urmă, apa a urcat cu aproape 50 m: în medie peste 1 m pe secol, de aproape trei ori mai repede decât azi (circa 4,5 mm pe an). Cel mai repede a urcat Marea Neagră după ce s-a reunit cu oceanul, acum circa 9.400 de ani: aproape 25 m în 1.400 de ani, cam 1,7 m pe secol. Cifrele urmează reconstrucția folosită aici; ritmurile exacte sunt încă dezbătute.' },
               { t: 'How fast the sea rose', b: 'Between 11,700 and 8,000 years ago the water rose by almost 50 m: on average more than 1 m per century, nearly three times faster than today (about 4.5 mm a year). The Black Sea rose fastest after it rejoined the ocean, about 9,400 years ago: almost 25 m in 1,400 years, roughly 1.7 m per century. The figures follow the reconstruction used here; the exact rates are still debated.' }],
      [-35.2, -31.7, { t: 'De ce se construiește o deltă aici', b: 'La vărsare, fluviul își pierde viteza și nu-și mai poate duce încărcătura. Marea Neagră are maree foarte mici, iar golful inițial era ferit de valurile puternice ale mării deschise, așa că sedimentele rămân lângă gură în loc să fie spălate: condiții ideale pentru o deltă.' },
               { t: 'Why a delta builds up here', b: 'At the mouth the river slows down and drops its load. The Black Sea has very small tides and the early bay was sheltered from the strong open-sea waves, so the sediment stays near the mouth instead of being washed away: ideal conditions for a delta.' }]
    ]
  },
  {
    ch: [2], short: { ro: 'Geneza', en: 'Genesis' },
    ro: null, en: null,        // texts = chapter 'nastere'
    bubbles: [
      [-3, -16.5, { t: 'Bancul de la gură', b: 'Când curentul încetinește la gura de vărsare, nisipul se depune într-un banc: bara gurii. Bancul crește, iese la suprafață și desparte apa în două brațe. Repetat iar și iar, acest mecanism ramifică delta ca pe un copac.' },
                 { t: 'The mouth bar', b: 'Where the current slows at the river mouth, sand settles into a bank: the mouth bar. The bar grows, emerges and splits the flow into two branches. Repeated again and again, this builds the delta’s tree of channels.' }],
      [-36, -32, { t: 'Vârful deltei', b: 'Lângă Tulcea fluviul iese dintre dealuri și începe să se ramifice. De aici, spre mare, se întinde delta.' },
                     { t: 'The delta apex', b: 'Near Tulcea the river leaves the hills and starts to branch out. From here to the sea stretches the delta.' }]
    ]
  },
  {
    ch: [3], short: { ro: 'Grindurile', en: 'Barriers' },
    ro: null, en: null,
    bubbles: [
      [19.8, -37, { t: 'Grindul inițial', b: 'Un cordon de nisip lung de circa 50 km, crescut de la nord spre sud. În spatele lui, golful s-a transformat într-o lagună cu apă liniștită, unde s-a depus mâl fin.' },
                { t: 'The initial spit', b: 'A sand barrier about 50 km long that grew from north to south. Behind it, the bay turned into a calm lagoon where fine mud settled.' }],
      [49.4, -21, { t: 'Valurile din nord-est', b: 'Furtunile din nord-est trimit cele mai mari valuri pe țărmul vestic al Mării Negre. Lovind țărmul oblic, valurile împing nisipul spre sud — de aceea grindurile cresc în această direcție.' },
                { t: 'North-easterly waves', b: 'North-easterly storms send the largest waves onto the western Black Sea coast. Striking the shore at an angle, they push the sand southward — which is why the barriers grow in that direction.' }]
    ]
  },
  {
    ch: [4], short: { ro: 'Sf. Gheorghe', en: 'Sf. Gheorghe' },
    ro: null, en: null,
    bubbles: [
      [18.6, -15.5, { t: 'Caraorman', b: 'Șiruri de grinduri de nisip înalte de câțiva metri, prinse în fața gurii Sf. Gheorghe. Azi sunt acoperite de dune și de pădurea Caraorman.' },
                    { t: 'Caraorman', b: 'Rows of sand ridges a few metres high, trapped in front of the Sfântu Gheorghe mouth. Today they are covered by dunes and the Caraorman forest.' }],
      [28.8, -1.7, { t: 'O deltă asimetrică', b: 'În amonte de gură (spre nord) nisipul se adună în grinduri; în aval (spre sud), la adăpostul gurii, se formează câmpii mlăștinoase. Este semnătura deltelor modelate de valuri.' },
              { t: 'An asymmetric delta', b: 'Updrift of the mouth (to the north) sand piles up in ridges; downdrift (to the south), sheltered by the mouth, marshy plains form. It is the signature of wave-shaped deltas.' }]
    ]
  },
  {
    ch: [5, 6], short: { ro: 'Sulina', en: 'Sulina' },
    ro: { kicker: 'Capitolul 5', title: 'Sulina și marile avulsii', body: 'Acum circa 3.500 de ani, o avulsie mută apa spre brațul Sulina, al cărui lob crește cu până la 20–27 m pe an; la nord de el, nisipul clădește grindul Letea. Lobul Sf. Gheorghe, rămas fără sedimente, pierde circa 123 km² în fața valurilor. Acum 2.000 de ani, apele se mută din nou: Sf. Gheorghe revine, Dunavățul își face al doilea lob, iar Chilia începe să umple lagunele din nord.', fact: 'Gura Sulinei se afla cu până la 6 km mai în larg decât azi' },
    en: { kicker: 'Chapter 5', title: 'Sulina and the great avulsions', body: 'About 3,500 years ago an avulsion shifts the flow to the Sulina branch, whose lobe grows by up to 20–27 m a year; north of it, sand builds the Letea ridge plain. Starved of sediment, the Sfântu Gheorghe lobe loses about 123 km² to the waves. 2,000 years ago the flow shifts again: the Sfântu Gheorghe returns, the Dunavăț builds a second lobe and the Chilia starts filling the northern lagoons.', fact: 'The Sulina mouth lay up to 6 km further offshore than today' },
    bubbles: [
      [28.1, -39.5, { t: 'Letea', b: 'Cel mai mare câmp de grinduri din deltă. Pe dunele lui crește pădurea Letea, ocrotită ca rezervație naturală încă din 1938.' },
                    { t: 'Letea', b: 'The largest ridge plain of the delta. The Letea forest grows on its dunes, protected as a nature reserve since 1938.' }],
      [5.6, -27, { t: 'Ce este o avulsie', b: 'Un braț care primește multe sedimente își înalță albia. La o viitură, apa găsește un drum mai scurt și mai jos spre mare și se mută într-un braț nou: delta își schimbă „motorul”.' },
               { t: 'What is an avulsion', b: 'A branch that receives lots of sediment raises its own bed. In a flood, the water finds a shorter, lower path to the sea and switches to a new branch: the delta changes its “engine”.' }],
      [-27.1, 44.8, { t: 'Histria', b: 'Oraș fondat de coloniști greci din Milet în secolul VII î.Hr., ca port la mare. Pe măsură ce țărmul s-a închis cu grinduri, portul a fost izolat; azi ruinele stau pe malul lacului Sinoe.' },
                    { t: 'Histria', b: 'A city founded by Greek colonists from Miletus in the 7th century BC as a seaport. As sand barriers closed the coast, the harbour was cut off; today the ruins stand on the shore of Lake Sinoe.' }, { hint: true }]
    ]
  },
  {
    ch: [7], short: { ro: 'Azi', en: 'Today' },
    ro: { kicker: 'Capitolul 6', title: 'Delta de azi: Antropocenul', body: 'După 1750, brațul Chilia construiește cel mai tânăr lob al deltei, iar în 1898 apare insula Sacalin. În secolul XX, delta intră în Antropocen: oamenii sapă circa 1.500 km de canale și ridică peste 1.000 km de diguri, iar zone întinse devin poldere agricole și piscicole, scoase de sub inundații. Barajele din bazin reduc aportul de sedimente. Azi delta funcționează într-un regim hibrid: procese naturale și modificări morfologice făcute de om.', fact: 'Urmează „Delta vie”: cum funcționează delta azi →' },
    en: { kicker: 'Chapter 6', title: 'The delta today: the Anthropocene', body: 'After 1750 the Chilia branch builds the youngest lobe of the delta, and in 1898 Sacalin Island emerges. In the 20th century the delta enters the Anthropocene: people dig about 1,500 km of canals and raise over 1,000 km of dikes, and large areas become farming and fish-farming polders, cut off from the floods. Dams across the basin cut the sediment supply. Today the delta runs in a hybrid regime: natural processes alongside landforms reshaped by people.', fact: 'Next: “The living delta”: how the delta works today →' },
    bubbles: [
      [38.4, 9.6, { t: 'Insula Sacalin', b: 'O insulă-barieră născută în 1898 în fața gurii Sf. Gheorghe. De atunci se mișcă: valurile o împing spre uscat și o alungesc spre sud. O urmărim din satelit în povestea a treia.' },
               { t: 'Sacalin Island', b: 'A barrier island born in 1898 off the Sfântu Gheorghe mouth. It has been moving ever since: the waves push it landward and stretch it southward. We follow it from space in the third story.' }],
      [12, -22, { t: 'O deltă canalizată', b: 'Mai ales în secolul XX s-au săpat circa 1.500 km de canale (cu albastru): pentru navigație, pescuit, transportul stufului și ca să aducă apă în lacuri. Ele scurtează drumul apei și al sedimentelor și schimbă felul în care se umple delta.' },
                { t: 'A canalised delta', b: 'Mostly in the 20th century, about 1,500 km of canals were dug (in blue): for shipping, fishing, reed transport and to bring water to the lakes. They shorten the path of water and sediment and change the way the delta fills up.' }],
      [-2.1, -43.9, { t: 'O deltă îndiguită', b: 'Peste 1.000 km de diguri (cu roșu): 25% din suprafața deltei este îndiguită. Digurile închid incinte numite poldere, desecate pentru agricultură (câmpurile) sau transformate în heleștee. Pardina, cea mai mare, are circa 270 km². Scoase de sub inundații, ele nu mai primesc mâl; unele sunt azi redate naturii.' },
                    { t: 'A diked delta', b: 'Over 1,000 km of dikes (in red): 25% of the delta’s area is diked. The dikes enclose areas called polders, drained for farming (the fields) or turned into fish ponds. Pardina, the largest, covers about 270 km². Cut off from the floods, they no longer receive mud; some are now being given back to nature.' }],
      [-6, -18, { t: 'O deltă protejată', b: 'Din 1990 delta este Rezervație a Biosferei, iar din 1991 face parte din Patrimoniul Mondial UNESCO: stufărișuri, lacuri și grinduri pentru peste 300 de specii de păsări.' },
                { t: 'A protected delta', b: 'Since 1990 the delta has been a Biosphere Reserve, and since 1991 a UNESCO World Heritage site: reed beds, lakes and ridges for more than 300 bird species.' }]
    ]
  }
];

/* ==================================================================== schematic tributaries (Start view)
   Hand-drawn, source → confluence, [lon, lat] through towns on the river; smoothed and draped in the app.
   lbl: where along the line (0..1) the name sits. */
export const TRIBUTARIES = [
  { ro: 'Inn', en: 'Inn', lbl: 0.35, ll: [[9.84, 46.50], [10.20, 46.80], [10.57, 47.14], [11.10, 47.26], [11.40, 47.27], [11.75, 47.35], [12.17, 47.58], [12.13, 47.86], [12.23, 48.06], [12.70, 48.20], [13.02, 48.25], [13.47, 48.57]] },
  { ro: 'Morava', en: 'Morava', lbl: 0.4, ll: [[16.85, 50.15], [17.25, 49.59], [17.40, 49.20], [17.13, 48.85], [16.98, 48.55], [16.98, 48.17]] },
  { ro: 'Váh', en: 'Váh', lbl: 0.3, ll: [[19.40, 49.07], [18.74, 49.22], [18.04, 48.89], [17.83, 48.58], [17.80, 48.10], [18.13, 47.76]] },
  { ro: 'Drava', en: 'Drava', lbl: 0.45, ll: [[12.22, 46.73], [12.77, 46.83], [13.30, 46.75], [13.85, 46.61], [14.30, 46.62], [14.90, 46.62], [15.65, 46.56], [16.34, 46.31], [16.90, 46.10], [17.45, 45.96], [18.20, 45.75], [18.69, 45.56], [18.93, 45.53]] },
  { ro: 'Sava', en: 'Sava', lbl: 0.45, ll: [[13.90, 46.40], [14.36, 46.24], [14.70, 46.05], [15.30, 45.98], [15.98, 45.80], [16.37, 45.48], [17.00, 45.25], [18.00, 45.15], [18.81, 44.87], [19.40, 44.90], [20.00, 44.85], [20.45, 44.82]] },
  { ro: 'Tisa', en: 'Tisza', lbl: 0.78, ll: [[24.21, 48.05], [23.29, 48.17], [22.50, 48.20], [21.70, 48.30], [21.41, 48.12], [21.00, 47.80], [20.50, 47.50], [20.19, 47.17], [20.15, 46.71], [20.15, 46.25], [20.10, 45.80], [20.20, 45.45], [20.30, 45.20]] },
  { ro: 'Mureș', en: 'Mureș', lbl: 0.35, ll: [[25.35, 46.92], [24.56, 46.54], [24.00, 46.25], [23.58, 46.07], [22.90, 45.88], [22.20, 45.95], [21.31, 46.18], [20.70, 46.20], [20.15, 46.25]] },
  { ro: 'Morava', en: 'Morava', lbl: 0.5, ll: [[21.90, 42.55], [21.90, 43.32], [21.41, 43.67], [21.37, 43.93], [21.20, 44.30], [21.00, 44.68]] },
  { ro: 'Jiu', en: 'Jiu', lbl: 0.22, ll: [[23.37, 45.41], [23.27, 45.04], [23.50, 44.70], [23.80, 44.32], [23.85, 44.00], [23.90, 43.78]] },
  { ro: 'Iskar', en: 'Iskar', lbl: 0.5, ll: [[23.40, 42.40], [23.32, 42.70], [23.60, 43.00], [24.00, 43.30], [24.48, 43.70]] },
  { ro: 'Olt', en: 'Olt', lbl: 0.55, ll: [[25.80, 46.60], [25.79, 45.86], [25.30, 45.85], [24.97, 45.84], [24.40, 45.70], [24.37, 45.10], [24.37, 44.43], [24.60, 44.00], [24.87, 43.72]] },
  { ro: 'Argeș', en: 'Argeș', lbl: 0.5, ll: [[24.65, 45.40], [24.87, 44.86], [25.40, 44.50], [26.10, 44.25], [26.64, 44.08]] },
  { ro: 'Ialomița', en: 'Ialomița', lbl: 0.5, ll: [[25.45, 45.40], [25.80, 44.95], [26.40, 44.60], [27.30, 44.55], [27.90, 44.65]] },
  { ro: 'Buzău', en: 'Buzău', lbl: 0.45, ll: [[25.98, 45.67], [26.18, 45.50], [26.30, 45.42], [26.36, 45.30], [26.45, 45.22], [26.82, 45.15], [27.10, 45.20], [27.35, 45.30], [27.63, 45.40], [27.80, 45.50]] },
  { ro: 'Siret', en: 'Siret', lbl: 0.45, ll: [[25.30, 48.10], [26.07, 47.95], [26.40, 47.60], [26.72, 47.25], [26.93, 46.57], [27.18, 46.10], [27.40, 45.70], [27.95, 45.42]] },
  { ro: 'Prut', en: 'Prut', lbl: 0.5, ll: [[24.57, 48.28], [25.30, 48.45], [25.94, 48.29], [26.70, 48.10], [27.30, 47.70], [27.80, 47.21], [28.10, 46.80], [28.20, 46.48], [28.10, 46.00], [28.20, 45.47]] }
];
