// ——— KESKON, version web ———
// Toute l'appli tient dans ce fichier : Preact + htm, sans étape de construction.
// Les données restent sur l'appareil (localStorage), comme le mode démo de l'iPhone.
import { html, render, useState, useEffect, useRef, useMemo, Fragment } from './lib/mini.js';

// ———————————————————— Données ————————————————————
const RUBRIQUES = await (await fetch('data/rubriques.json')).json();
const ECO = await (await fetch('data/eco.json')).json();
const COUL = { rose: '#FF3D8C', mandarine: '#FF6B2B', jaune: '#FFD233', vert: '#12D18E', violet: '#8C55FF', bleu: '#17A0FA',
  encre: '#1A0F33', framboise: '#ED1C6E', turquoise: '#00C7BF', indigo: '#5545F2', corail: '#FF7366', ocean: '#007AD9', ambre: '#FFA800' };
const couleur = (r) => COUL[r.couleur] || COUL.rose;
const AVATARS = ['🦁', '🐼', '🦊', '🐸', '🐙', '🦄', '🐯', '🐨', '🐵', '🐧', '🐻', '🐰'];
const ANNUAIRE = [['Lucas', '🦊'], ['Emma', '🦄'], ['Hugo', '🐯'], ['Chloé', '🐰'], ['Nathan', '🐸'], ['Inès', '🐼'], ['Mamie', '🐨'], ['Papi', '🐻'], ['Tonton Marc', '🐵'], ['Tata Sophie', '🐧']]
  .map(([prenom, avatar]) => ({ prenom, avatar, pseudo: '@' + prenom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '') }));
const GRILLE = { 1: 0.99, 2: 1.79, 3: 2.49, 4: 2.99, 5: 3.49, 6: 3.89, 7: 4.29, 8: 4.59 };
const euros = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const reduc = (n) => Math.round((1 - GRILLE[n] / (0.99 * n)) * 100);

// ———————————————————— Le magasin (sauvegardé sur l'appareil) ————————————————————
const DEFAUT = { intro: false, prenom: '', avatar: '🦁', famille: '', role: 'parent', qcm: false, gouts: [],
  propositions: {}, idees: {}, choisis: {}, amis: [], groupes: [], premium: false, premiumPersonnes: 0,
  apparence: 'auto', taille: 'normal', accent: 'rose', fondAnime: true, sons: true, ambiance: 'pop',
  eco: { dernier: '', serie: 0, total: 0 }, ville: '', lieux: null, dernierPopup: 0 };
let S;
try { S = { ...DEFAUT, ...JSON.parse(localStorage.getItem('keskon') || '{}') }; } catch { S = { ...DEFAUT }; }
const abonnes = new Set();
function maj(fn) { fn(S); try { localStorage.setItem('keskon', JSON.stringify(S)); } catch {} abonnes.forEach((f) => f()); }
function useS() { const [, f] = useState(0); useEffect(() => { const g = () => f((x) => x + 1); abonnes.add(g); return () => abonnes.delete(g); }, []); return S; }

let toastFn = () => {};
const toast = (t) => toastFn(t);

// ———————————————————— Sons ————————————————————
const cacheSons = {};
function son(nom) {
  if (!S.sons) return;
  const amb = S.premium && S.ambiance !== 'pop' ? S.ambiance + '_' : '';
  const src = `sons/${amb}${nom}.wav`;
  try {
    let a = cacheSons[src];
    if (!a) { a = cacheSons[src] = new Audio(src); }
    a.currentTime = 0; a.play().catch(() => {});
  } catch {}
}

// ———————————————————— Photos Wikipédia ————————————————————
const cachePhotos = {};
function usePhoto(choix) {
  const [url, setUrl] = useState(choix?.photo || cachePhotos[choix?.wiki] || null);
  useEffect(() => {
    if (!choix) return;
    if (choix.photo) { setUrl(choix.photo); return; }
    if (!choix.wiki) { setUrl(null); return; }
    if (cachePhotos[choix.wiki] !== undefined) { setUrl(cachePhotos[choix.wiki]); return; }
    let vivant = true;
    fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(choix.wiki))
      .then((r) => r.json()).then((d) => { const u = d.thumbnail?.source || d.originalimage?.source || null; cachePhotos[choix.wiki] = u; if (vivant) setUrl(u); })
      .catch(() => { cachePhotos[choix.wiki] = null; });
    return () => { vivant = false; };
  }, [choix?.nom]);
  return url;
}
function Photo({ choix, emoji }) {
  const url = usePhoto(choix);
  return url ? html`<img src=${url} alt="" loading="lazy" />` : html`<span>${choix?.emoji || emoji || '✨'}</span>`;
}

// ———————————————————— Goûts et allergies ————————————————————
const NOURRITURE = ['mange', 'commande'];
const SORTIES = ['fait', 'visite', 'joue'];
const viandes = ['viande', 'poulet', 'boeuf', 'porc', 'jambon', 'lardon', 'saucisse', 'steak', 'bacon', 'chorizo', 'merguez', 'kebab', 'dinde', 'canard', 'agneau', 'gyros', 'souvlaki', 'bulgogi', 'burger', 'nugget', 'tender', 'hachis', 'bolognaise', 'carbonara'];
const poissons = ['poisson', 'saumon', 'thon', 'cabillaud', 'sushi', 'maki', 'fish', 'sardine', 'colin', 'anchois', 'truite', 'poke', 'california', 'sashimi'];
const fruitsMer = ['crevette', 'moule', 'fruits de mer', 'calamar', 'homard', 'crabe', 'gambas'];
const laitiers = ['lait', 'creme', 'fromage', 'beurre', 'mozzarella', 'parmesan', 'gruyere', 'emmental', 'raclette', 'yaourt', 'bechamel', 'cheese', 'reblochon', 'feta', 'comte', 'tartiflette'];
const O = (id, emoji, nom, mots, portee = NOURRITURE, aime = false) => ({ id, emoji, nom, mots, portee, aime });
const ETAPES_QCM = [
  ['Ce que tu adores faire 🤩', 'On te proposera ça en premier.', [
    O('a-sport', '🏃', 'Le sport', ['sport', 'velo', 'foot', 'piscine', 'nager', 'course', 'escalade', 'trampoline', 'patinoire', 'ski', 'kayak', 'canoe', 'equitation', 'accrobranche'], SORTIES, true),
    O('a-nature', '🌳', 'La nature', ['nature', 'parc', 'foret', 'jardin', 'plage', 'lac', 'randonnee', 'balade', 'pique nique', 'animaux', 'zoo', 'ferme', 'montagne'], SORTIES, true),
    O('a-creatif', '🎨', 'Créer, bricoler', ['dessin', 'peinture', 'bricolage', 'modeler', 'atelier', 'creatif', 'perles', 'coloriage', 'patisserie', 'cuisine'], SORTIES, true),
    O('a-culture', '🏛️', 'Musées et patrimoine', ['musee', 'chateau', 'monument', 'exposition', 'theatre', 'bibliotheque', 'patrimoine', 'histoire', 'abbaye'], SORTIES, true),
    O('a-sensations', '🎢', 'Les sensations', ['attractions', 'karting', 'accrobranche', 'laser', 'escape', 'trampoline', 'bowling', 'futuroscope', 'disneyland'], SORTIES, true),
    O('a-jeux', '🎲', 'Les jeux', ['jeu', 'jeux', 'cartes', 'plateau', 'societe', 'quiz'], SORTIES, true),
    O('a-calme', '🧘', 'Se détendre', ['calme', 'lecture', 'yoga', 'puzzle', 'detente', 'cocooning', 'plaid'], SORTIES, true)]],
  ['Films, livres, musique 🎬', 'Coche ce qui te fait vibrer.', [
    O('f-animation', '🧸', 'Les dessins animés', ['animation', 'pixar', 'disney', 'ghibli'], ['regarde'], true),
    O('f-aventure', '🗺️', "L'aventure", ['aventure', 'voyage', 'tresor', 'quete'], ['regarde', 'lit'], true),
    O('f-comedie', '😂', 'Les trucs drôles', ['comedie', 'drole', 'humour', 'rire', 'loufoque'], ['regarde', 'lit'], true),
    O('f-magie', '🧙', 'La magie', ['fantastique', 'magie', 'magique', 'sorcier', 'fantasy', 'dragon'], ['regarde', 'lit'], true),
    O('f-heros', '🦸', 'Les super-héros', ['super heros', 'marvel', 'heros'], ['regarde'], true),
    O('f-docu', '🐋', 'Les documentaires', ['documentaire', 'planete', 'animaux', 'science'], ['regarde', 'lit'], true),
    O('m-pop', '🎤', 'La pop', ['pop', 'tubes', 'tube'], ['ecoute'], true),
    O('m-danse', '🕺', 'Danser', ['danse', 'dansante', 'electro', 'latino', 'festive'], ['ecoute'], true),
    O('l-bd', '💬', 'Les BD', ['bande dessinee', 'bd', 'asterix', 'tintin'], ['lit'], true)]],
  ["Ce que tu n'aimes pas 🙅", 'On ne te le proposera plus.', [
    O('x-peur', '😱', 'Les films qui font peur', ['peur', 'horreur', 'effrayant', 'frisson'], ['regarde', 'lit']),
    O('x-foule', '👥', 'La foule', ['attractions', 'disneyland', 'foule', 'futuroscope'], ['visite', 'fait']),
    O('x-musee', '🥱', 'Les musées', ['musee', 'exposition'], ['visite', 'fait']),
    O('x-eau', '💦', 'Se mouiller', ['piscine', 'plage', 'canoe', 'kayak', 'baignade', 'nager'], ['visite', 'fait']),
    O('x-effort', '🥵', 'Les gros efforts', ['randonnee', 'escalade', 'course', 'ski'], ['visite', 'fait']),
    O('x-long', '⏳', 'Les jeux trop longs', ['monopoly', 'risk', 'longue'], ['joue']),
    O('x-rap', '🔇', 'Le rap', ['rap'], ['ecoute']),
    O('x-classique', '🎻', 'La musique classique', ['classique', 'opera'], ['ecoute'])]],
  ['Des allergies ? 🤧', 'Coche tout ce que tu ne peux pas manger.', [
    O('gluten', '🌾', 'Gluten', ['farine', 'pate', 'pates', 'pain', 'ble', 'semoule', 'couscous', 'pizza', 'crepe', 'lasagne', 'burger', 'nouille', 'ramen', 'bagel', 'tarte', 'quiche', 'croque', 'gateau', 'biscuit', 'naan', 'pita', 'tacos', 'gnocchi', 'cookie']),
    O('lactose', '🥛', 'Lactose', laitiers), O('oeufs', '🥚', 'Œufs', ['oeuf', 'omelette', 'mayonnaise', 'carbonara', 'quiche', 'crepe']),
    O('arachides', '🥜', 'Arachides', ['cacahuete', 'arachide', 'peanut', 'satay', 'pad thai']),
    O('coques', '🌰', 'Fruits à coque', ['noix', 'noisette', 'amande', 'pistache', 'cajou', 'praline']),
    O('poisson', '🐟', 'Poisson', poissons), O('fruitsdemer', '🦐', 'Fruits de mer', fruitsMer),
    O('soja', '🫘', 'Soja', ['soja', 'tofu', 'edamame', 'miso']), O('sesame', '🥯', 'Sésame', ['sesame', 'tahini', 'houmous'])]],
  ['Ton régime 🍽️', 'Si tu ne manges pas de tout, dis-le-nous.', [
    O('vegetarien', '🥗', 'Végétarien', [...viandes, ...poissons, ...fruitsMer]),
    O('vegan', '🌱', 'Végan', [...viandes, ...poissons, ...fruitsMer, ...laitiers, 'oeuf', 'omelette', 'miel', 'mayonnaise']),
    O('sansporc', '🐷', 'Sans porc', ['porc', 'jambon', 'lardon', 'bacon', 'chorizo', 'saucisson', 'carbonara', 'tartiflette'])]],
  ['Les aliments que tu détestes 🤢', 'On ne te les proposera jamais. Promis.', [
    O('d-poisson', '🐟', 'Le poisson', poissons), O('d-champi', '🍄', 'Les champignons', ['champignon']),
    O('d-epinard', '🥬', 'Les épinards', ['epinard']), O('d-brocoli', '🥦', 'Les brocolis', ['brocoli']),
    O('d-tomate', '🍅', 'Les tomates', ['tomate']), O('d-oignon', '🧅', 'Les oignons', ['oignon']),
    O('d-fromage', '🧀', 'Le fromage', ['fromage', 'raclette', 'mozzarella', 'parmesan', 'gruyere', 'emmental', 'cheese']),
    O('d-epice', '🌶️', 'Le piquant', ['epice', 'piment', 'piquant', 'curry', 'harissa']),
    O('d-viande', '🥩', 'La viande rouge', ['boeuf', 'steak', 'agneau', 'bolognaise', 'hachis']),
    O('d-courgette', '🥒', 'Les courgettes', ['courgette'])]],
];
const OPTIONS = ETAPES_QCM.flatMap((e) => e[2]);
const norm = (s) => ' ' + (s || '').replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ') + ' ';
const cacheTexte = {};
function texteDe(c, rid) {
  const k = rid + '|' + c.nom;
  if (!cacheTexte[k]) {
    const f = c.fiche;
    cacheTexte[k] = norm([c.nom, c.description, ...(f ? f.sections.flatMap((s) => s.lignes) : []), ...(f ? f.infos.map((i) => i[2]) : [])].join(' '));
  }
  return cacheTexte[k];
}
const trouve = (t, m) => { const x = norm(m).trim(); return t.includes(' ' + x + ' ') || t.includes(' ' + x + 's ') || t.includes(' ' + x + 'x '); };
function appliquerGouts(liste, rid) {
  const actives = OPTIONS.filter((o) => S.gouts.includes(o.id) && o.portee.includes(rid));
  const non = actives.filter((o) => !o.aime).flatMap((o) => o.mots);
  const oui = actives.filter((o) => o.aime);
  let l = non.length ? liste.filter((c) => !non.some((m) => trouve(texteDe(c, rid), m))) : liste;
  if (oui.length) {
    l = l.map((c, i) => [c, i, oui.filter((o) => o.mots.some((m) => trouve(texteDe(c, rid), m))).length])
      .sort((a, b) => b[2] - a[2] || a[1] - b[1]).map((x) => x[0]);
  }
  return l;
}

// ———————————————————— Catalogue ————————————————————
const rubrique = (id) => RUBRIQUES.find((r) => r.id === id);
function catalogue(r) {
  const perso = (S.idees[r.id] || []).map((i) => ({ nom: i.nom, wiki: i.lieu ? null : i.nom, description: i.description, emoji: i.emoji, photo: i.photo, fiche: i.fiche }));
  let base = r.choix;
  if (r.id === 'visite' && S.lieux?.length) base = S.lieux;
  const noms = new Set(perso.map((p) => p.nom));
  return [...perso, ...appliquerGouts(base.filter((c) => !noms.has(c.nom)), r.id)];
}
const proposes = (r) => S.propositions[r.id] || [];
const cartesDuJour = (r) => catalogue(r).filter((c) => proposes(r).includes(c.nom));
function basculer(r, nom) {
  maj((s) => { const l = s.propositions[r.id] || []; s.propositions[r.id] = l.includes(nom) ? l.filter((n) => n !== nom) : [...l, nom]; });
}
function sousTitre(r) {
  const n = proposes(r).length;
  if (S.role === 'parent') return n === 0 ? 'Touche pour proposer' : `${n} proposition${n > 1 ? 's' : ''}`;
  return n === 0 ? 'En attente des parents…' : `${n} carte${n > 1 ? 's' : ''} à swiper`;
}

// ———————————————————— Pubs « maison » (la web app n'a pas de régie) ————————————————————
let dernierePubPlein = 0;
let nbSwipes = 0;
let ouvrirPubPlein = () => {};
function peutMontrerPub() {
  if (S.premium || Date.now() - dernierePubPlein < 60000) return false;
  dernierePubPlein = Date.now(); ouvrirPubPlein(); return true;
}

// ———————————————————— L'application ————————————————————
function App() {
  const s = useS();
  const [vue, setVue] = useState(null);      // { type, ... } : écran poussé par-dessus les onglets
  const [onglet, setOnglet] = useState('decider');
  const [msg, setMsg] = useState(null);
  const [offre, setOffre] = useState(false);
  const [pubPlein, setPubPlein] = useState(false);
  const [popup, setPopup] = useState(false);
  toastFn = (t) => { setMsg(t); setTimeout(() => setMsg(null), 2200); };
  ouvrirPubPlein = () => setPubPlein(true);

  // Apparence
  useEffect(() => {
    const d = document.documentElement;
    if (s.apparence === 'auto') d.removeAttribute('data-theme'); else d.setAttribute('data-theme', s.apparence === 'sombre' ? 'dark' : 'light');
    d.style.setProperty('--accent', COUL[s.accent] || COUL.rose);
    d.style.setProperty('--taille', { petit: '14px', normal: '16px', grand: '18px', tresgrand: '20px' }[s.taille]);
    document.body.classList.toggle('calme', !s.fondAnime);
  }, [s.apparence, s.accent, s.taille, s.fondAnime]);

  // Pop-up Premium après 5 minutes, une fois par jour
  useEffect(() => {
    const t = setTimeout(() => {
      if (!S.premium && Date.now() - S.dernierPopup > 86400000 && S.prenom) { maj((x) => { x.dernierPopup = Date.now(); }); setPopup(true); son('etincelle'); }
    }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, []);

  const ouvrir = (v) => { son('pop'); setVue(v); window.scrollTo(0, 0); };
  const fermer = () => { setVue(null); };
  const ctx = { ouvrir, fermer, offre: () => setOffre(true) };

  let contenu;
  if (!s.intro) contenu = html`<${Intro} fin=${() => maj((x) => { x.intro = true; })} />`;
  else if (!s.prenom) contenu = html`<${Connexion} />`;
  else if (!s.qcm) contenu = html`<${QCM} fin=${() => maj((x) => { x.qcm = true; })} />`;
  else if (vue) contenu = html`<${EcranPousse} vue=${vue} ctx=${ctx} />`;
  else {
    const O2 = { decider: Accueil, amis: Amis, groupes: Groupes, reglages: Reglages }[onglet];
    contenu = html`
      <${O2} ctx=${ctx} />
      <nav class="onglets">
        ${[['decider', '✨', 'Décider'], ['amis', '👥', 'Amis'], ['groupes', '💬', 'Groupes'], ['reglages', '⚙️', 'Réglages']].map(([id, e, t]) => html`
          <button class=${onglet === id ? 'actif' : ''} onClick=${() => { son('pop'); setOnglet(id); window.scrollTo(0, 0); }}><span>${e}</span>${t}</button>`)}
      </nav>`;
  }
  return html`
    <div class="fondpop"><i></i><i></i><i></i></div>
    ${contenu}
    ${msg && html`<div class="toast">${msg}</div>`}
    ${offre && html`<${Offre} fermer=${() => setOffre(false)} />`}
    ${pubPlein && html`<${PubPlein} fermer=${() => setPubPlein(false)} offre=${() => { setPubPlein(false); setOffre(true); }} />`}
    ${popup && html`<${Feuille} fermer=${() => setPopup(false)}>
      <div style="text-align:center;padding:10px 6px">
        <div style="font-size:64px" class="pop-in">😍</div>
        <h2 class="titre" style="margin:10px 0">Tu t'amuses bien sur KESKON ?</h2>
        <p class="muted">Zéro pub, les jeux de groupe, les fonds et les sons, pour toute la famille et pour toujours. Dès 0,99 € par personne !</p>
        <button class="bouton presse" style="background:var(--rose);color:#fff;margin-top:16px" onClick=${() => { setPopup(false); setOffre(true); }}>Voir l'offre ✨</button>
        <button class="muted gras" style="margin-top:14px" onClick=${() => setPopup(false)}>Plus tard</button>
      </div><//>`}`;
}

function EcranPousse({ vue, ctx }) {
  switch (vue.type) {
    case 'rubrique': return html`<${EcranRubrique} r=${rubrique(vue.id)} groupe=${vue.groupe} ctx=${ctx} />`;
    case 'recherche': return html`<${Recherche} ctx=${ctx} />`;
    case 'discussion': return html`<${Discussion} id=${vue.id} ctx=${ctx} />`;
    case 'aide': return html`<${Aide} ctx=${ctx} />`;
    case 'qcm': return html`<${QCM} fin=${ctx.fermer} />`;
    default: return null;
  }
}

function Entete({ titre, retour, droite }) {
  return html`<div class="entete">
    ${retour ? html`<button class="rond-btn presse" aria-label="Retour" onClick=${retour}>‹</button>` : html`<span style="width:40px"></span>`}
    <h1>${titre}</h1>
    ${droite || html`<span style="width:40px"></span>`}
  </div>`;
}

function Feuille({ fermer, children }) {
  return html`<div class="voile" onClick=${fermer}></div><div class="feuille" role="dialog"><div class="poignee"></div>${children}</div>`;
}

// ———————————————————— Intro animée ————————————————————
function Intro({ fin }) {
  const durees = [4000, 4500, 5000, 4500, 99999];
  const fonds = ['linear-gradient(135deg,#FF3D8C,#FF6B2B,#FFD233)', 'linear-gradient(135deg,#8C55FF,#FF3D8C,#17A0FA)',
    'linear-gradient(135deg,#12D18E,#17A0FA,#FFD233)', 'linear-gradient(135deg,#FF6B2B,#FFD233,#FF3D8C)', 'linear-gradient(135deg,#17A0FA,#8C55FF,#FF3D8C)'];
  const [n, setN] = useState(0);
  const [debut, setDebut] = useState(Date.now());
  const [p, setP] = useState(0);
  useEffect(() => { son('whoosh'); setDebut(Date.now()); }, [n]);
  useEffect(() => {
    const i = setInterval(() => {
      const t = (Date.now() - debut) / durees[n];
      setP(Math.min(t, 1));
      if (t >= 1 && n < 4) setN(n + 1);
    }, 50);
    return () => clearInterval(i);
  }, [n, debut]);
  const aller = (k) => setN(Math.max(0, Math.min(4, k)));
  const scenes = [
    html`<img src="icon-512.png" class="pop-in" style="width:150px;height:150px;border-radius:36px;border:3px solid #1A0F33;box-shadow:5px 7px 0 #1A0F33" alt="" />
      <div class="titre pop-in" style="font-size:64px;text-shadow:4px 5px 0 #1A0F33;animation-delay:.4s">KESKON</div>
      <h2 class="pop-in" style="animation-delay:.8s">Qu'est-ce qu'on… ?</h2><p class="pop-in" style="animation-delay:1s">Mange, fait, regarde, visite…<br/>Fini les débats : on décide ensemble !</p>`,
    html`<h2>1. Les parents proposent 📣</h2><p>Ils cochent des idées… ou ajoutent les leurs.</p>
      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:10px">${[['🍝', 'Lasagnes'], ['🍕', 'Pizza maison'], ['🌮', 'Tacos'], ['🥗', 'Salade César']].map(([e, t], i) => html`
        <div class="sticker pop-in" style="display:flex;align-items:center;gap:12px;padding:0 16px;height:54px;color:#1A0F33;animation-delay:${0.3 + i * 0.15}s">
          <span style="font-size:26px">${e}</span><b style="flex:1;text-align:left">${t}</b><span class="coche ${i < 3 ? 'on' : ''}" style="--c:#12D18E;transition-delay:${1.2 + i * 0.6}s">${i < 3 ? '✓' : ''}</span></div>`)}</div>`,
    html`<h2>2. Tout le monde swipe 👆</h2><p>À droite : OUI ! À gauche : NON.</p>
      <div style="position:relative;width:230px;height:280px">
        <div class="sticker" style="position:absolute;inset:0;display:grid;place-items:center;font-size:90px;color:#1A0F33">🍝</div>
        <div class="sticker" style="position:absolute;inset:0;display:grid;place-items:center;font-size:90px;animation:swipeDemo 2.4s ease-in-out .8s both;border-color:#12D18E">🍕</div>
      </div>
      <style>@keyframes swipeDemo{40%{transform:translateX(60px) rotate(6deg)}100%{transform:translateX(520px) rotate(20deg);opacity:0}}</style>`,
    html`<h2>3. On voit ce qui plaît 🏆</h2><p>Les idées préférées de la famille, en un coup d'œil.</p>
      <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:12px">${[['🥇', '🍕 Pizza maison', 4], ['🥈', '🍝 Lasagnes', 3], ['🥉', '🥗 Salade César', 1]].map(([m, t, v], i) => html`
        <div class="sticker pop-in" style="padding:12px;color:#1A0F33;text-align:left;animation-delay:${0.3 + i * 0.2}s">
          <b>${m} ${t}</b><div style="height:10px;border-radius:5px;background:#eee;margin-top:6px"><div style="height:100%;border-radius:5px;background:${i ? '#FF6B2B' : '#FF3D8C'};width:${v * 25}%;animation:barre 1s ease-out 1s both"></div></div></div>`)}</div>
      <style>@keyframes barre{from{width:0}}</style>`,
    html`<h2>Pour tout décider ✨</h2><p>Repas, sorties, films, jeux, musique, cadeaux, voyages…</p>
      <div style="display:grid;grid-template-columns:repeat(5,60px);gap:12px">${RUBRIQUES.map((r, i) => html`
        <div class="sticker pop-in" style="height:60px;display:grid;place-items:center;font-size:30px;animation-delay:${0.4 + i * 0.12}s;transform:rotate(${i % 2 ? 6 : -6}deg)">${r.emoji}</div>`)}</div>
      <button class="bouton presse" style="max-width:340px;margin-top:20px;background:#fff" onClick=${() => { son('bravo'); fin(); }}>C'est parti ! 🚀</button>`,
  ];
  return html`<div class="intro" style="background:${fonds[n]}">
    <div class="barres">${durees.map((d, i) => html`<div><i style="width:${i < n ? 100 : i === n ? (n === 4 ? 100 : p * 100) : 0}%"></i></div>`)}</div>
    <div style="display:flex;justify-content:flex-end;padding:8px 16px"><button class="gras" style="color:#fff;background:rgba(0,0,0,.2);padding:7px 14px;border-radius:99px" onClick=${fin}>Passer</button></div>
    <div class="scene" key=${n} onClick=${(e) => { if (e.target.closest('button')) return; aller(e.clientX < innerWidth / 3 ? n - 1 : n + 1); }}>${scenes[n]}</div>
  </div>`;
}

// ———————————————————— Connexion ————————————————————
function Connexion() {
  const [prenom, setPrenom] = useState('');
  const [avatar, setAvatar] = useState('🦁');
  const [famille, setFamille] = useState('');
  const [role, setRole] = useState('parent');
  const [etape, setEtape] = useState(0);
  if (etape === 0) return html`<div class="plein" style="background:linear-gradient(160deg,#FF3D8C,#FF6B2B,#FFD233);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:30px 22px;gap:14px">
    <div style="text-align:center;font-size:64px" class="pop-in">💬</div>
    <div class="titre" style="text-align:center;font-size:58px;text-shadow:4px 5px 0 #1A0F33">KESKON</div>
    <p style="text-align:center;font-weight:800;font-size:18px;margin:0 0 20px">On décide tout, ensemble.</p>
    ${['Continuer avec Apple', 'Continuer avec Google', 'Continuer avec un e-mail'].map((t) => html`
      <button class="bouton secondaire presse" style="background:#fff;color:#1A0F33" onClick=${() => toast('Bientôt disponible !')}>${t}</button>`)}
    <button class="bouton presse" onClick=${() => setEtape(1)}>Juste mon prénom 👋</button>
  </div>`;
  return html`<div class="ecran">
    <${Entete} titre="Ton profil" retour=${() => setEtape(0)} />
    <div class="section-t">Ton avatar</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${AVATARS.map((a) => html`
      <button class="presse" aria-label=${'Avatar ' + a} style="font-size:30px;height:52px;border-radius:50%;background:${a === avatar ? 'var(--jaune)' : 'var(--ligne)'};border:${a === avatar ? '2.5px solid var(--encre)' : '0'}" onClick=${() => { son('pop'); setAvatar(a); }}>${a}</button>`)}</div>
    <div class="section-t">Ton prénom</div><input class="champ" value=${prenom} onInput=${(e) => setPrenom(e.target.value)} placeholder="Ex : Léa" />
    <div class="section-t">Nom de famille</div><input class="champ" value=${famille} onInput=${(e) => setFamille(e.target.value)} placeholder="Ex : Martin" />
    <div class="section-t">Tu es…</div>
    <div class="segment">${[['parent', 'Parent'], ['enfant', 'Enfant']].map(([v, t]) => html`<button class=${role === v ? 'on' : ''} onClick=${() => setRole(v)}>${t}</button>`)}</div>
    <p class="muted petit">${role === 'parent' ? 'Les parents proposent des idées dans chaque rubrique.' : 'Les enfants swipent parmi les idées proposées par les parents.'}</p>
    <button class="bouton presse" style="margin-top:20px" disabled=${!prenom.trim()} onClick=${() => { son('bravo'); maj((s) => { s.prenom = prenom.trim(); s.avatar = avatar; s.famille = famille.trim(); s.role = role; }); }}>C'est parti !</button>
  </div>`;
}

// ———————————————————— QCM goûts ————————————————————
function QCM({ fin }) {
  const [e, setE] = useState(0);
  const [choix, setChoix] = useState(new Set(S.gouts));
  const [titre, sous, opts] = ETAPES_QCM[e];
  const suivant = () => {
    if (e < ETAPES_QCM.length - 1) { son('whoosh'); setE(e + 1); return; }
    son('bravo'); maj((s) => { s.gouts = [...choix]; }); fin();
  };
  return html`<div class="plein" style="background:linear-gradient(135deg,#12D18E,#17A0FA,#8C55FF);color:#fff;padding:16px 18px 30px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;gap:6px;margin-top:8px">${ETAPES_QCM.map((_, i) => html`<div style="flex:1;height:6px;border-radius:3px;background:${i <= e ? '#fff' : 'rgba(255,255,255,.35)'}"></div>`)}</div>
    <div style="text-align:center" key=${e} class="pop-in">
      <div class="gras" style="opacity:.9">${e === 0 ? S.prenom + ', dis-nous tout !' : 'Tes goûts'}</div>
      <div class="titre" style="font-size:30px;text-shadow:3px 4px 0 #1A0F33">${titre}</div>
      <div class="gras" style="opacity:.95">${sous}</div>
    </div>
    <div class="chips">${opts.map((o) => html`
      <button class=${'chip presse' + (choix.has(o.id) ? ' on' : '')} onClick=${() => { const c = new Set(choix); c.has(o.id) ? (c.delete(o.id), son('tap')) : (c.add(o.id), son('coche')); setChoix(c); }}>
        <span style="font-size:24px">${o.emoji}</span><span style="flex:1">${o.nom}</span><span style="color:${choix.has(o.id) ? 'var(--rose)' : '#bbb'}">${choix.has(o.id) ? '●' : '○'}</span></button>`)}</div>
    <div style="flex:1"></div>
    <div style="display:flex;gap:12px">
      ${e > 0 && html`<button class="bouton secondaire presse" style="width:64px;background:#fff;color:#1A0F33" aria-label="Retour" onClick=${() => setE(e - 1)}>‹</button>`}
      <button class="bouton presse" onClick=${suivant}>${e === ETAPES_QCM.length - 1 ? "C'est noté ! 👌" : 'Suivant'}</button>
    </div>
  </div>`;
}

// ———————————————————— Accueil ————————————————————
function Accueil({ ctx }) {
  const s = useS();
  return html`<div class="ecran">
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="rond-btn presse" aria-label="Rechercher" onClick=${() => ctx.ouvrir({ type: 'recherche' })}>🔍</button>
      <button class="rond-btn presse" aria-label="Aide" onClick=${() => ctx.ouvrir({ type: 'aide' })}>?</button>
    </div>
    <div class="logo-titre">KESKON</div>
    <div class="salut sticker" style="color:#1A0F33;background:#fff">
      <b>Salut ${s.prenom} ${s.avatar} !</b>
      <div class="gras petit">${s.famille ? `Famille ${s.famille} · ` : ''}${s.role === 'parent' ? 'Parent' : 'Enfant'}</div>
      <div class="petit">${s.role === 'parent' ? "Qu'est-ce qu'on propose aujourd'hui ? 😎" : 'Swipe ce que les parents proposent ! 🔥'}</div>
    </div>
    <button class="recherche-faux sticker presse" style="background:#fff" onClick=${() => ctx.ouvrir({ type: 'recherche' })}>🔍 Un plat, un film, une sortie…</button>
    <${Roue} ctx=${ctx} />
    <${CarteEco} />
    ${!s.premium && html`<${Promo} onClick=${ctx.offre} />`}
  </div>`;
}

function Promo({ onClick }) {
  return html`<button class="promo presse" onClick=${onClick}>
    <span style="font-size:32px;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.3);border:2.5px solid var(--encre)">✨</span>
    <span style="flex:1"><b class="titre" style="font-size:20px;display:block">KESKON Premium</b><span class="gras petit">Zéro pub + jeux + fonds + sons · dès 0,99 €</span></span>
    <span style="font-size:26px">›</span></button>`;
}

// ———————————————————— La roue verticale infinie ————————————————————
function Roue({ ctx }) {
  const s = useS();
  const ref = useRef();
  const tour = useMemo(() => {
    const t = [];
    RUBRIQUES.forEach((r, i) => { t.push({ r }); if (!s.premium && (i + 1) % 3 === 0) t.push({ pub: true }); });
    return t;
  }, [s.premium]);
  const TOURS = 30, H = 114;
  const items = useMemo(() => Array.from({ length: TOURS * tour.length }, (_, i) => tour[i % tour.length]), [tour]);
  const [centre, setCentre] = useState(Math.floor(TOURS / 2) * tour.length);
  const centreRef = useRef(centre);
  useEffect(() => { const el = ref.current; const d = Math.floor(TOURS / 2) * tour.length; centreRef.current = d; setCentre(d); el.scrollTop = d * H; requestAnimationFrame(peindre); }, [tour]);
  useEffect(() => { peindre(); });
  const raf = useRef(0);
  function peindre() {
    const el = ref.current; if (!el) return;
    const c = Math.round(el.scrollTop / H);
    if (c !== centreRef.current) { centreRef.current = c; setCentre(c); son('tick'); if (navigator.vibrate) navigator.vibrate(5); }
    for (const enfant of el.children) {
      if (enfant.dataset.i === undefined) continue;
      const i = +enfant.dataset.i;
      const d = Math.max(-3, Math.min(3, (i * H - el.scrollTop) / H));
      enfant.style.transform = `rotateX(${-d * 28}deg) scale(${1 - Math.abs(d) * 0.1})`;
      enfant.style.opacity = 1 - Math.abs(d) * 0.28;
    }
  }
  const auScroll = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(peindre); };
  // On n'affiche que les cartes proches du centre (plus léger)
  const visibles = [];
  for (let i = Math.max(0, centre - 6); i <= Math.min(items.length - 1, centre + 6); i++) visibles.push(i);
  const el = items[centre] || {};
  const sel = el.r ? couleur(el.r) : COUL.jaune;
  return html`<div class="roue" style="--sel:${sel}">
    <div class="roue-scroll" ref=${ref} onScroll=${auScroll}>
      <div style="height:${Math.max(0, centre - 6) * H}px"></div>
      ${visibles.map((i) => { const it = items[i]; return html`<div class="roue-item" key=${i} data-i=${i}>
        ${it.pub ? html`<button class="carte-roue presse" style="background:rgba(255,210,51,.12);border-color:rgba(255,210,51,.5)" onClick=${ctx.offre}>
            <span class="orbe" style="background:rgba(255,210,51,.3);border:1.5px solid #FFD233">🙉</span>
            <span style="min-width:0"><div class="num" style="color:#FFD233">SPONSORISÉ</div><div class="t">Marre des pubs ?</div><div class="s">KESKON Premium · dès 0,99 €</div></span></button>`
          : html`<button class="carte-roue presse" onClick=${() => ctx.ouvrir({ type: 'rubrique', id: it.r.id })}>
            <span class="orbe" style="background:${couleur(it.r)}59;border:1.5px solid ${couleur(it.r)}">${it.r.emoji}</span>
            <span style="min-width:0"><div class="num" style="color:${couleur(it.r)}">${String(RUBRIQUES.indexOf(it.r) + 1).padStart(2, '0')}</div>
            <div class="t">${it.r.titre}</div><div class="s">${sousTitre(it.r)}</div></span><span class="fl">›</span></button>`}
      </div>`; })}
      <div style="height:${Math.max(0, items.length - centre - 7) * H}px"></div>
    </div>
    <div class="roue-fenetre"></div>
  </div>`;
}

// ———————————————————— Éco-geste du jour ————————————————————
const jourDuMonde = () => Math.floor(Date.now() / 86400000);
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const hier = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
function plante(t) { return t === 0 ? ['🌰', 'Une petite graine'] : t <= 2 ? ['🌱', 'Une jeune pousse'] : t <= 6 ? ['🌿', 'Une belle plante'] : t <= 14 ? ['🪴', 'Une plante en pot'] : t <= 29 ? ['🌳', 'Un arbre !'] : ['🌳🍎', 'Un arbre plein de fruits !']; }
function CarteEco() {
  const s = useS();
  const [decal, setDecal] = useState(0);          // démo : voir les autres jours
  const [detail, setDetail] = useState(false);
  const g = ECO[((jourDuMonde() + decal) % ECO.length + ECO.length) % ECO.length];
  const fait = s.eco.dernier === aujourdhui() && decal === 0;
  const serie = s.eco.dernier === aujourdhui() || s.eco.dernier === hier() ? s.eco.serie : 0;
  const valider = (e) => {
    e.stopPropagation();
    if (decal !== 0) { toast("C'est un aperçu : reviens à aujourd'hui pour valider"); return; }
    son('bravo');
    maj((x) => { x.eco = { dernier: aujourdhui(), serie: x.eco.dernier === hier() ? x.eco.serie + 1 : 1, total: x.eco.total + 1 }; });
  };
  const [pe, pn] = plante(s.eco.total);
  const tx = useRef(0);
  return html`<${Fragment}><div class="eco sticker presse" style="cursor:pointer" onClick=${() => setDetail(true)}
      onTouchStart=${(e) => { tx.current = e.touches[0].clientX; }} onTouchEnd=${(e) => { const d = e.changedTouches[0].clientX - tx.current; if (Math.abs(d) > 50) { son('pop'); setDecal(decal + (d < 0 ? 1 : -1)); } }}>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="badge" style="background:rgba(26,15,51,.85);color:#fff">🍃 L'éco-geste du jour</span>
      <span style="flex:1"></span>
      ${serie > 0 && html`<b class="petit">🔥 ${serie} jour${serie > 1 ? 's' : ''}</b>`}
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin:10px 0" key=${decal} class="pop-in">
      <span style="font-size:40px">${g.emoji}</span><b class="titre" style="font-size:18px">${g.geste}</b>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="gras petit" style="opacity:.75">${pe} ${pn}</span><span style="flex:1"></span>
      ${fait ? html`<b class="petit">✅ Fait !</b>` : html`<button class="gras petit" style="background:#1A0F33;color:#fff;padding:8px 14px;border-radius:99px" onClick=${valider}>C'est fait ! 🌍</button>`}
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;font-size:13px;font-weight:800" onClick=${(e) => e.stopPropagation()}>
      <button aria-label="Jour précédent" style="font-size:18px;padding:0 8px" onClick=${() => { son('pop'); setDecal(decal - 1); }}>‹</button>
      <span>${decal === 0 ? "Aujourd'hui" : `Aperçu : jour ${decal > 0 ? '+' : ''}${decal}`}</span>
      <button aria-label="Jour suivant" style="font-size:18px;padding:0 8px" onClick=${() => { son('pop'); setDecal(decal + 1); }}>›</button>
      ${decal !== 0 && html`<button class="petit" style="text-decoration:underline" onClick=${() => setDecal(0)}>revenir</button>`}
    </div></div>
    ${detail && html`<${Feuille} fermer=${() => setDetail(false)}>
      <div onClick=${(e) => e.stopPropagation()} style="text-align:center;color:var(--texte)">
        <div style="font-size:80px">${g.emoji}</div><h2 class="titre">${g.geste}</h2>
        <div class="info" style="background:rgba(255,61,140,.1);text-align:left;margin-bottom:10px"><b style="color:var(--rose)">❤️ Pourquoi c'est important</b><p>${g.pourquoi}</p></div>
        <div class="info" style="background:rgba(23,160,250,.1);text-align:left"><b style="color:var(--bleu)">✨ Le savais-tu ?</b><p>${g.savais}</p></div>
        <div class="info" style="background:rgba(18,209,142,.15);margin-top:14px"><div style="font-size:64px" class="pop-in">${pe}</div><b>${pn}</b>
          <div class="muted petit">${s.eco.total} éco-geste${s.eco.total > 1 ? 's' : ''} en tout · 🔥 série de ${serie} jour${serie > 1 ? 's' : ''}</div></div>
      </div><//>`}
  <//>`;
}

// ———————————————————— Une rubrique : proposer ou swiper ————————————————————
function EcranRubrique({ r, groupe, ctx }) {
  const s = useS();
  const [apercu, setApercu] = useState(!!groupe);
  const sortir = () => { ctx.fermer(); setTimeout(peutMontrerPub, 400); };
  if (r.id === 'visite' && !s.ville) return html`<${Lieu} ctx=${{ ...ctx, fermer: sortir }} fini=${() => {}} />`;
  const parent = s.role === 'parent' && !apercu;
  return html`<div>
    <${Entete} titre=${r.titre} retour=${sortir} droite=${s.role === 'parent' && !groupe ? html`
      <button class="rond-btn presse" aria-label=${apercu ? 'Proposer' : 'Swiper'} onClick=${() => setApercu(!apercu)}>${apercu ? '📋' : '🃏'}</button>` : null} />
    ${parent ? html`<${Propositions} r=${r} ctx=${ctx} />` : html`<${Swipe} r=${r} groupe=${groupe} ctx=${ctx} />`}
  </div>`;
}

function Propositions({ r, ctx }) {
  const s = useS();
  const [fiche, setFiche] = useState(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState('');
  const [desc, setDesc] = useState('');
  const [lieu, setLieu] = useState(false);
  const n = proposes(r).length;
  const idees = s.idees[r.id] || [];
  const base = catalogue(r).filter((c) => !idees.some((i) => i.nom === c.nom));
  const Ligne = (c) => { const on = proposes(r).includes(c.nom); return html`
    <div class="ligne" key=${c.nom}>
      <button class="vignette" onClick=${() => setFiche(c)} aria-label=${'Fiche ' + c.nom}><${Photo} choix=${c} emoji=${r.emoji} /></button>
      <button style="flex:1;min-width:0;text-align:left" onClick=${() => { son(on ? 'tap' : 'coche'); basculer(r, c.nom); }}>
        <b>${c.nom}</b><div class="muted petit" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${c.description}</div></button>
      <button class=${'coche' + (on ? ' on' : '')} style="--c:${couleur(r)}" aria-label=${on ? 'Retirer' : 'Proposer'} onClick=${() => { son(on ? 'tap' : 'coche'); basculer(r, c.nom); }}>${on ? '✓' : ''}</button>
    </div>`; };
  return html`<div class="ecran" style="padding-top:4px">
    <div class="ligne"><span style="font-size:28px">📣</span><div style="flex:1"><b>${n === 0 ? "Rien de proposé pour l'instant" : `${n} proposition${n > 1 ? 's' : ''}`}</b>
      <div class="muted petit">Coche ce que tu proposes. Les enfants swiperont seulement parmi tes propositions.</div></div></div>
    <button class="ligne presse" style="margin-top:10px;color:${couleur(r)};font-weight:900" onClick=${() => setAjout(true)}>➕ Ajouter mon idée</button>
    ${lieu && html`<div class="plein" style="background:var(--fond)"><${Lieu} ctx=${{ ...ctx, fermer: () => setLieu(false) }} /></div>`}
    ${r.id === 'visite' && html`<button class="ligne presse" style="margin-top:10px" onClick=${() => setLieu(true)}>
      <span style="font-size:28px">📍</span><span style="flex:1;text-align:left"><b>Autour de ${s.ville}</b><div class="muted petit">${(s.lieux || []).length} idées autour · Changer d'endroit</div></span>›</button>`}
    ${idees.length > 0 && html`<div class="section-t">Nos idées</div><div class="liste">${idees.map((i) => html`<div style="position:relative">
      ${Ligne({ ...i, wiki: i.nom })}<button class="petit muted" style="position:absolute;right:52px;top:6px" onClick=${() => maj((x) => { x.idees[r.id] = idees.filter((y) => y.nom !== i.nom); x.propositions[r.id] = proposes(r).filter((y) => y !== i.nom); })}>Supprimer</button></div>`)}</div>`}
    <div class="section-t"><span>${r.id === 'visite' && s.lieux?.length ? 'À voir autour de ' + s.ville : 'Le catalogue'}</span>
      <button class="gras" style="color:var(--accent);text-transform:none" onClick=${() => maj((x) => { x.propositions[r.id] = n === 0 ? catalogue(r).map((c) => c.nom) : []; })}>${n === 0 ? 'Tout cocher' : 'Tout décocher'}</button></div>
    <div class="liste">${base.map(Ligne)}</div>
    ${fiche && html`<${FicheVue} c=${fiche} r=${r} fermer=${() => setFiche(null)} ctx=${ctx} />`}
    ${ajout && html`<${Feuille} fermer=${() => setAjout(false)}>
      <h2 class="titre">Ajouter une idée</h2>
      <input class="champ" placeholder="Ex : Poulet-frites de mamie" value=${nom} onInput=${(e) => setNom(e.target.value)} />
      <input class="champ" style="margin-top:10px" placeholder="Petite description (facultatif)" value=${desc} onInput=${(e) => setDesc(e.target.value)} />
      <button class="bouton presse" style="margin-top:16px" onClick=${() => { const t = nom.trim(); if (!t) return; son('coche');
        maj((x) => { x.idees[r.id] = [{ nom: t, description: desc.trim() }, ...(x.idees[r.id] || []).filter((y) => y.nom !== t)]; x.propositions[r.id] = [...new Set([...(x.propositions[r.id] || []), t])]; });
        setNom(''); setDesc(''); setAjout(false); }}>Ajouter</button><//>`}
  </div>`;
}

function Swipe({ r, groupe, ctx }) {
  const s = useS();
  const cartes = useMemo(() => { const c = cartesDuJour(r); return groupe && c.length === 0 ? catalogue(r).slice(0, 20) : c; }, [r.id]);
  const [restants, setRestants] = useState(() => cartes.filter((c) => !(s.choisis[r.id] || []).includes(c.nom)));
  const [acceptes, setAcceptes] = useState(s.choisis[r.id] || []);
  const [dx, setDx] = useState(0);
  const [termine, setTermine] = useState(false);
  const [fiche, setFiche] = useState(null);
  const depart = useRef(null);
  const seuil = useRef(false);
  useEffect(() => {
    maj((x) => { x.choisis[r.id] = acceptes; });
    if (groupe) synchroniserChoix(groupe, r.id, acceptes);
  }, [acceptes]);
  if (cartes.length === 0) return html`<div class="ecran" style="text-align:center;padding-top:80px"><div style="font-size:60px">⏳</div>
    <h2 class="titre">Pas encore de propositions</h2><p class="muted">${s.role === 'parent' ? "Tu n'as encore rien proposé dans cette rubrique." : "Les parents n'ont encore rien proposé. Reviens un peu plus tard !"}</p></div>`;
  const valider = (oui) => {
    const c = restants[0]; if (!c) return;
    son(oui ? 'oui' : 'non'); if (navigator.vibrate) navigator.vibrate(oui ? 20 : 8);
    setDx(oui ? 700 : -700);
    if (++nbSwipes % 10 === 0) setTimeout(peutMontrerPub, 500);
    setTimeout(() => {
      setDx(0);
      const reste = restants.slice(1);
      const acc = oui ? [...acceptes, c.nom] : acceptes;
      if (oui) setAcceptes(acc);
      if (reste.length === 0 && acc.length === 0) { setRestants(cartes); toast('Tu dois en accepter au moins un ! On recommence 🔄'); }
      else { setRestants(reste); if (reste.length === 0) { son('bravo'); setTermine(true); } }
    }, 280);
  };
  if (termine || restants.length === 0) return html`<div class="ecran">
    <div style="text-align:center"><div style="font-size:54px" class="pop-in">🎉</div><h2 class="titre">Mes choix</h2></div>
    <div class="liste">${acceptes.map((n) => { const c = catalogue(r).find((x) => x.nom === n) || { nom: n }; return html`
      <button class="ligne presse" onClick=${() => setFiche(c)}><span class="vignette"><${Photo} choix=${c} emoji=${r.emoji} /></span><b style="flex:1">${n}</b>›</button>`; })}</div>
    ${restants.length > 0 && html`<button class="bouton presse" style="margin-top:16px" onClick=${() => setTermine(false)}>Continuer à swiper</button>`}
    <button class="bouton secondaire presse" style="margin-top:12px" onClick=${() => { setAcceptes([]); setRestants(cartes); setTermine(false); }}>Recommencer</button>
    ${fiche && html`<${FicheVue} c=${fiche} r=${r} fermer=${() => setFiche(null)} ctx=${ctx} />`}
  </div>`;
  const prog = Math.min(Math.abs(dx) / 110, 1);
  const bord = dx > 30 ? '#12D18E' : dx < -30 ? '#ff3b30' : 'var(--encre)';
  const haut = restants[0];
  const down = (e) => { depart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (depart.current == null) return; const d = e.clientX - depart.current; setDx(d);
    const s2 = Math.abs(d) > 110; if (s2 !== seuil.current) { seuil.current = s2; if (s2) son('tick'); }
  };
  const up = () => { if (depart.current == null) return; depart.current = null; if (Math.abs(dx) > 110) valider(dx > 0); else setDx(0); };
  return html`<div style="padding:0 16px 110px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0">
      <span class="gras muted">${cartes.length - restants.length + 1} / ${cartes.length}</span>
      ${acceptes.length > 0 && html`<button class="badge presse" style="background:var(--rose);color:#fff;font-size:14px;padding:8px 14px" onClick=${() => { son('bravo'); setTermine(true); }}>❤️ Mes choix (${acceptes.length})</button>`}
    </div>
    <div class="pile">
      ${restants.slice(0, 3).reverse().map((c, k, arr) => { const dessus = c === haut; const rang = arr.length - 1 - k; return html`
        <div class="carte-swipe" key=${c.nom} style="transform:${dessus ? `translateX(${dx}px) rotate(${dx / 18}deg)` : `translateY(${rang * 12}px) scale(${1 - rang * 0.05})`};
          transition:${depart.current != null && dessus ? 'none' : 'transform .3s cubic-bezier(.2,.9,.3,1)'};border-color:${dessus ? bord : 'var(--encre)'};border-width:${dessus && prog > 0.2 ? 7 : 4}px"
          onPointerDown=${dessus ? down : null} onPointerMove=${dessus ? move : null} onPointerUp=${dessus ? up : null} onPointerCancel=${dessus ? up : null}>
          <div style="position:absolute;inset:0;display:grid;place-items:center;font-size:90px;background:linear-gradient(135deg,var(--jaune),var(--rose))"><${Photo} choix=${c} emoji=${r.emoji} /></div>
          <div class="bas"><b>${c.nom}</b><div style="font-weight:600;opacity:.92;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${c.description}</div></div>
          ${dessus && dx > 30 && html`<div class="tampon" style="left:22px;color:#12D18E;transform:rotate(-14deg);opacity:${prog}">OUI</div>`}
          ${dessus && dx < -30 && html`<div class="tampon" style="right:22px;color:#ff3b30;transform:rotate(14deg);opacity:${prog}">NON</div>`}
        </div>`; })}
    </div>
    <div class="boutons-swipe">
      <button class="presse" aria-label="Non" onClick=${() => valider(false)}>✕</button>
      <button class="presse" aria-label="Voir la fiche" style="width:56px;height:56px;font-size:22px;align-self:center" onClick=${() => setFiche(haut)}>ℹ️</button>
      <button class="presse" aria-label="Oui" onClick=${() => valider(true)}>❤️</button>
    </div>
    ${fiche && html`<${FicheVue} c=${fiche} r=${r} fermer=${() => setFiche(null)} ctx=${ctx} />`}
  </div>`;
}

// ———————————————————— Fiche détaillée ————————————————————
const ICONES = { timer: '⏱️', flame: '🔥', 'person.2': '👥', 'chart.bar': '📊', calendar: '📅', clock: '🕐', film: '🎬', figure: '🧒', euro: '💶', 'person.3': '👨‍👩‍👧', hourglass: '⏳',
  'music.note': '🎵', person: '👤', 'figure.and.child.holdinghands': '🧒', 'books.vertical': '📚', book: '📖', 'cloud.sun': '🌤️', 'eurosign.circle': '💶', 'mappin.and.ellipse': '📍', tag: '🏷️', car: '🚗', 'building.2': '🏙️' };
function FicheVue({ c, r, fermer, ctx }) {
  const s = useS();
  const f = c.fiche;
  return html`<${Feuille} fermer=${fermer}>
    <div class="photo-fiche"><${Photo} choix=${c} emoji=${r.emoji} /><b>${c.nom}</b></div>
    <p class="muted">${c.description}</p>
    ${f && html`
      <div class="infos">${f.infos.map(([ic, t, v]) => html`<div class="info" style="background:${couleur(r)}1a"><small>${ICONES[ic] || '•'} ${t}</small><b>${v}</b></div>`)}</div>
      ${f.sections.map((sec) => html`<h3 class="titre" style="margin:18px 0 8px">${sec.titre}</h3>
        ${sec.lignes.map((l, i) => html`<div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px">
          ${sec.numerotee ? html`<b style="flex:none;width:22px;height:22px;border-radius:50%;background:${couleur(r)};color:#fff;display:grid;place-items:center;font-size:12px">${i + 1}</b>`
            : html`<span style="flex:none;width:7px;height:7px;border-radius:50%;background:${couleur(r)}"></span>`}<span>${l}</span></div>`)}`)}
      ${f.lien && html`<a class="bouton presse" style="background:${couleur(r)};color:#fff;text-decoration:none;margin-top:14px" href=${f.lien[1]} target="_blank" rel="noopener">↗ ${f.lien[0]}</a>`}`}
    ${!s.premium && html`<div style="margin-top:22px"><${Promo} onClick=${() => { fermer(); ctx.offre(); }} /></div>`}
  <//>`;
}

// ———————————————————— Où êtes-vous ? (Visite, avec Wikipédia autour) ————————————————————
function Lieu({ ctx, fini }) {
  const [saisie, setSaisie] = useState('');
  const [etat, setEtat] = useState(null);
  async function chercher(lat, lon, nom) {
    setEtat(`Je cherche quoi visiter autour de ${nom}…`);
    const u = `https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=10000&ggslimit=50&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exsentences=2&exlimit=max`;
    try {
      const d = await (await fetch(u)).json();
      const pages = Object.values(d.query?.pages || {}).filter((p) => p.thumbnail && !/^(Liste|Gare|Arrondissement|Quartier|Canton|Rue|Avenue|Boulevard|Ligne|Station)\b/i.test(p.title));
      const lieux = pages.map((p) => {
        const c = p.coordinates?.[0]; const km = c ? dist(lat, lon, c.lat, c.lon) : 0;
        return { nom: p.title, photo: p.thumbnail.source, emoji: '📍', description: `À ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'} · ${(p.extract || '').slice(0, 140)}`,
          fiche: { infos: [['car', 'Distance', km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'], ['building.2', 'Autour de', nom]],
            sections: p.extract ? [{ titre: 'En bref', lignes: [p.extract] }] : [], lien: ['Y aller (carte)', `https://www.google.com/maps/search/?api=1&query=${c ? c.lat + ',' + c.lon : encodeURIComponent(p.title)}`] } };
      }).sort((a, b) => parseFloat(a.fiche.infos[0][2]) - parseFloat(b.fiche.infos[0][2]));
      if (!lieux.length) { setEtat(null); toast(`Rien trouvé autour de ${nom}`); return; }
      son('bravo');
      maj((x) => { const anciens = new Set((x.lieux || []).map((l) => l.nom)); x.ville = nom; x.lieux = lieux; x.propositions.visite = (x.propositions.visite || []).filter((n) => !anciens.has(n)); });
      (fini || ctx.fermer)();
    } catch { setEtat(null); toast('Impossible de chercher pour le moment'); }
  }
  async function ville(t) {
    if (!t.trim()) return; setEtat(`Je cherche « ${t} »…`);
    try {
      const r = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=' + encodeURIComponent(t))).json();
      if (!r[0]) { setEtat(null); toast(`Je ne trouve pas « ${t} »`); return; }
      chercher(+r[0].lat, +r[0].lon, r[0].display_name.split(',')[0]);
    } catch { setEtat(null); toast('Impossible de chercher pour le moment'); }
  }
  const moi = () => {
    if (!navigator.geolocation) return toast('Localisation indisponible');
    setEtat('Je te localise…');
    navigator.geolocation.getCurrentPosition((p) => chercher(p.coords.latitude, p.coords.longitude, 'ma position'),
      () => { setEtat(null); toast('Pas accès à ta position : tape ta ville'); }, { timeout: 10000 });
  };
  return html`<div class="ecran">
    <${Entete} titre="Où êtes-vous ?" retour=${ctx.fermer} />
    <div style="text-align:center"><div style="font-size:64px">📍</div><p class="gras muted">Dis-moi où tu te trouves : je te proposerai ce qu'il y a à visiter autour.</p></div>
    <form onSubmit=${(e) => { e.preventDefault(); ville(saisie); }}><input class="champ" placeholder="Une ville, une région…" value=${saisie} onInput=${(e) => setSaisie(e.target.value)} /></form>
    <div class="chips" style="grid-template-columns:repeat(3,1fr);margin-top:12px">${['Paris', 'Bretagne', 'Annecy', 'Marseille', 'Lyon', 'Nice'].map((v) => html`
      <button class="chip presse" style="height:42px;justify-content:center;background:var(--jaune)" onClick=${() => ville(v)}>${v}</button>`)}</div>
    <button class="bouton presse" style="margin-top:16px;background:var(--ocean);color:#fff" onClick=${moi}>📍 Autour de moi</button>
    ${etat && html`<div class="ligne" style="margin-top:16px;justify-content:center"><b>⏳ ${etat}</b></div>`}
  </div>`;
}
function dist(a, b, c, d) { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

// ———————————————————— Recherche ————————————————————
function Recherche({ ctx }) {
  useS();
  const [q, setQ] = useState('');
  const [fiche, setFiche] = useState(null);
  const mots = norm(q).trim().split(' ').filter(Boolean);
  const res = mots.length ? RUBRIQUES.map((r) => [r, catalogue(r).filter((c) => { const t = texteDe(c, r.id) + norm(r.titre); return mots.every((m) => t.includes(m)); })]).filter(([, l]) => l.length) : [];
  return html`<div class="ecran">
    <${Entete} titre="Rechercher" retour=${ctx.fermer} />
    <input class="champ" autofocus placeholder="Un plat, un film, une sortie…" value=${q} onInput=${(e) => setQ(e.target.value)} />
    ${!mots.length && html`<div class="section-t">Idées de recherche</div><div class="chips" style="grid-template-columns:repeat(3,1fr)">
      ${['pizza', 'Disney', 'château', 'cartes', 'cadeau', 'pluie', 'chocolat', 'musée', 'vélo'].map((m) => html`<button class="chip presse" style="height:42px;justify-content:center" onClick=${() => setQ(m)}>${m}</button>`)}</div>`}
    ${mots.length > 0 && res.length === 0 && html`<p class="muted" style="text-align:center;margin-top:40px">Aucun résultat pour « ${q} »</p>`}
    ${res.map(([r, l]) => html`<div class="section-t">${r.emoji} ${r.titre} · ${l.length}</div><div class="liste">${l.slice(0, 12).map((c) => { const on = proposes(r).includes(c.nom); return html`
      <div class="ligne"><button class="vignette" onClick=${() => setFiche([c, r])}><${Photo} choix=${c} emoji=${r.emoji} /></button>
        <button style="flex:1;text-align:left;min-width:0" onClick=${() => setFiche([c, r])}><b>${c.nom}</b><div class="muted petit" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.description}</div></button>
        ${S.role === 'parent' && html`<button class=${'coche' + (on ? ' on' : '')} style="--c:${couleur(r)}" aria-label="Proposer" onClick=${() => { son(on ? 'tap' : 'coche'); basculer(r, c.nom); }}>${on ? '✓' : '+'}</button>`}</div>`; })}</div>`)}
    ${fiche && html`<${FicheVue} c=${fiche[0]} r=${fiche[1]} fermer=${() => setFiche(null)} ctx=${ctx} />`}
  </div>`;
}

// ———————————————————— Amis ————————————————————
function Amis() {
  const s = useS();
  const [q, setQ] = useState('');
  const liste = q ? ANNUAIRE.filter((a) => norm(a.prenom + ' ' + a.pseudo).includes(norm(q).trim())) : s.amis;
  return html`<div class="ecran">
    <${Entete} titre="Amis" />
    <input class="champ" placeholder="Rechercher un prénom ou un pseudo" value=${q} onInput=${(e) => setQ(e.target.value)} />
    <p class="muted petit">🧪 Mode démo : les amis restent sur cet appareil en attendant les vrais comptes.</p>
    ${!q && s.amis.length === 0 && html`<div style="text-align:center;margin-top:40px"><div style="font-size:54px">👋</div><p class="muted gras">Cherche tes amis et ta famille pour les ajouter.</p></div>`}
    <div class="liste">${liste.map((a) => { const ami = s.amis.some((x) => x.pseudo === a.pseudo); return html`
      <div class="ligne"><span style="font-size:30px">${a.avatar}</span><div style="flex:1"><b>${a.prenom}</b><div class="muted petit">${a.pseudo}</div></div>
        <button class="badge presse" style="background:${ami ? 'var(--ligne)' : 'var(--accent)'};color:${ami ? 'var(--texte)' : '#fff'};padding:8px 12px"
          onClick=${() => { son(ami ? 'tap' : 'coche'); maj((x) => { x.amis = ami ? x.amis.filter((y) => y.pseudo !== a.pseudo) : [...x.amis, a]; }); }}>${ami ? 'Retirer' : 'Ajouter'}</button></div>`; })}</div>
  </div>`;
}

// ———————————————————— Groupes ————————————————————
function synchroniserChoix(gid, rid, noms) {
  maj((x) => {
    const g = x.groupes.find((y) => y.id === gid); if (!g) return;
    g.messages = g.messages.filter((m) => !(m.moi && m.type === 'choix' && m.rid === rid));
    if (noms.length) g.messages.push({ id: Date.now(), moi: true, auteur: x.prenom, avatar: x.avatar, type: 'choix', rid, noms });
  });
}
function Groupes({ ctx }) {
  const s = useS();
  const [nouveau, setNouveau] = useState(false);
  const [nom, setNom] = useState('');
  const [emoji, setEmoji] = useState('👨‍👩‍👧‍👦');
  const [membres, setMembres] = useState([]);
  return html`<div class="ecran">
    <${Entete} titre="Groupes" droite=${html`<button class="rond-btn presse" aria-label="Nouveau groupe" onClick=${() => setNouveau(true)}>＋</button>`} />
    ${s.groupes.length === 0 && html`<div style="text-align:center;margin-top:60px"><div style="font-size:54px">💬</div><p class="muted gras">Crée un groupe pour discuter, voter et jouer ensemble.</p>
      <button class="bouton presse" style="max-width:300px;margin:16px auto" onClick=${() => setNouveau(true)}>Créer un groupe</button></div>`}
    <div class="liste">${s.groupes.map((g) => { const d = g.messages[g.messages.length - 1]; return html`
      <button class="ligne presse" onClick=${() => ctx.ouvrir({ type: 'discussion', id: g.id })}><span style="font-size:30px;width:50px;height:50px;border-radius:16px;background:rgba(255,107,43,.15);display:grid;place-items:center">${g.emoji}</span>
        <div style="flex:1;min-width:0"><b>${g.nom}</b><div class="muted petit" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d ? (d.texte || (d.type === 'sondage' ? '📊 Sondage' : d.type === 'choix' ? '❤️ Mes choix' : '🎮 Jeu')) : g.membres.map((m) => m.prenom).join(', ')}</div></div>›</button>`; })}</div>
    ${nouveau && html`<${Feuille} fermer=${() => setNouveau(false)}>
      <h2 class="titre">Nouveau groupe</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${['👨‍👩‍👧‍👦', '🎉', '⚽', '🍕', '🏖️', '🎮', '🎂', '❤️'].map((e) => html`<button style="font-size:28px;padding:6px;border-radius:10px;background:${e === emoji ? 'var(--ligne)' : 'none'}" onClick=${() => setEmoji(e)}>${e}</button>`)}</div>
      <input class="champ" placeholder="Nom du groupe" value=${nom} onInput=${(e) => setNom(e.target.value)} />
      <div class="section-t">Membres</div>
      ${s.amis.length === 0 ? html`<p class="muted">Ajoute d'abord des amis dans l'onglet Amis.</p>` : html`<div class="liste">${s.amis.map((a) => { const on = membres.includes(a.pseudo); return html`
        <button class="ligne" onClick=${() => setMembres(on ? membres.filter((m) => m !== a.pseudo) : [...membres, a.pseudo])}><span style="font-size:26px">${a.avatar}</span><b style="flex:1;text-align:left">${a.prenom}</b><span class=${'coche' + (on ? ' on' : '')}>${on ? '✓' : ''}</span></button>`; })}</div>`}
      <button class="bouton presse" style="margin-top:16px" onClick=${() => { if (!nom.trim()) return; son('bravo');
        maj((x) => { x.groupes.unshift({ id: 'g' + Date.now(), nom: nom.trim(), emoji, membres: x.amis.filter((a) => membres.includes(a.pseudo)), messages: [], fond: null }); });
        setNouveau(false); setNom(''); setMembres([]); }}>Créer</button><//>`}
  </div>`;
}

const FONDS = { pop: 'linear-gradient(160deg,#8C55FF,#FF3D8C,#17A0FA)', papier: '#faf5e6', ocean: 'linear-gradient(#8ce0ff,#006bbf)', foret: 'linear-gradient(#bfee99,#1f734d)',
  coucher: 'linear-gradient(#FFD233,#FF6B2B,#FF3D8C,#8C55FF)', nuit: 'radial-gradient(circle at 20% 20%,#fff 1px,transparent 1.5px) 0 0/40px 40px,linear-gradient(#0d0d33,#331a66)',
  bonbon: 'linear-gradient(135deg,#ffcce6,#cce6ff,#e6ffd9)', emojis: '#FFF8ED' };
const NOMS_FONDS = { pop: 'Pop', papier: 'Papier', ocean: 'Océan', foret: 'Forêt', coucher: 'Coucher de soleil', nuit: 'Nuit étoilée', bonbon: 'Bonbons', emojis: 'Emojis' };
const GRATUITS = ['pop', 'papier'];
const JEUX = [['morpion', '❌', 'Morpion', '#8C55FF'], ['pfc', '✂️', 'Pierre-feuille-ciseaux', '#FF6B2B'], ['de', '🎲', 'Lancer le dé', '#17A0FA'], ['piece', '🪙', 'Pile ou face', '#FFA800'], ['action', '🎭', 'Action ou vérité', '#FF3D8C']];
const ACTIONS = ['Imite ton animal préféré pendant 10 secondes 🐒', "Chante le refrain d'une chanson de dessin animé 🎤", 'Parle comme un robot jusqu\'à ton prochain message 🤖', 'Fais 10 sauts sur place 🦘', 'Raconte une blague (même nulle) 😂', 'Danse 15 secondes sans musique 💃'];
const VERITES = ['Quel est ton plus gros fou rire ? 🤣', 'Quel plat tu pourrais manger tous les jours ? 🍕', 'Quel super-pouvoir tu voudrais avoir ? 🦸', 'Quel est ton meilleur souvenir de vacances ? 🏖️', 'Qui dans la famille ronfle le plus fort ? 😴', 'Quel animal tu serais, et pourquoi ? 🦊'];

function Discussion({ id, ctx }) {
  const s = useS();
  const g = s.groupes.find((x) => x.id === id);
  const [texte, setTexte] = useState('');
  const [plus, setPlus] = useState(false);
  const [fonds, setFonds] = useState(false);
  const [jeu, setJeu] = useState(null);
  const bas = useRef();
  useEffect(() => { bas.current?.scrollIntoView({ behavior: 'smooth' }); }, [g?.messages.length]);
  if (!g) return null;
  const envoyer = (m) => { son('envoi'); maj((x) => { x.groupes.find((y) => y.id === id).messages.push({ id: Date.now(), moi: true, auteur: x.prenom, avatar: x.avatar, ...m }); }); };
  const publierJeu = (j, t) => envoyer({ type: 'jeu', jeu: j, texte: t });
  const lancer = (j) => {
    setPlus(false);
    if (!S.premium) { ctx.offre(); return; }
    if (j === 'morpion' || j === 'pfc') { setJeu(j); return; }
    son('whoosh');
    if (j === 'de') { const n = 1 + Math.floor(Math.random() * 6); publierJeu(j, `${S.prenom} a lancé le dé… ${'⚀⚁⚂⚃⚄⚅'[n - 1]} ${n} !`); }
    if (j === 'piece') publierJeu(j, `${S.prenom} a lancé une pièce… ${Math.random() < 0.5 ? 'PILE 🪙' : 'FACE 🙂'} !`);
    if (j === 'action') publierJeu(j, Math.random() < 0.5 ? 'ACTION pour le prochain qui répond : ' + ACTIONS[Math.floor(Math.random() * ACTIONS.length)] : 'VÉRITÉ pour le prochain qui répond : ' + VERITES[Math.floor(Math.random() * VERITES.length)]);
  };
  const fondActif = g.fond && (s.premium || GRATUITS.includes(g.fond) ) ? (g.fond === 'photo' ? `url(${g.photo}) center/cover` : FONDS[g.fond]) : null;
  const classement = (rid) => { const c = {}; g.messages.filter((m) => m.type === 'choix' && m.rid === rid).forEach((m) => m.noms.forEach((n) => { c[n] = (c[n] || 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3); };
  return html`<div style="min-height:100vh;background:${fondActif || 'transparent'};background-attachment:fixed">
    <${Entete} titre=${g.emoji + ' ' + g.nom} retour=${ctx.fermer} droite=${html`<button class="rond-btn presse" aria-label="Changer le fond" onClick=${() => setFonds(true)}>🎨</button>`} />
    <div class="bulles" onContextMenu=${(e) => { e.preventDefault(); setFonds(true); }}>
      <div style="text-align:center" class="petit muted">${[s.prenom, ...g.membres.map((m) => m.prenom)].join(', ')}<br/>🧪 Mode démo : les messages restent sur cet appareil.</div>
      ${g.messages.map((m) => {
        const cote = m.moi ? 'flex-end' : 'flex-start';
        if (m.type === 'jeu') { const j = JEUX.find((x) => x[0] === m.jeu); return html`<div style="align-self:${cote}">
          <div class="carte-jeu" style="background:linear-gradient(135deg,${j[3]},${j[3]}bb);transform:rotate(${m.moi ? 1.2 : -1.2}deg)"><div class="petit gras">${j[2]}</div><div style="display:flex;gap:10px;align-items:flex-start"><span style="font-size:32px">${j[1]}</span><b>${m.texte}</b></div></div></div>`; }
        if (m.type === 'sondage') { const r = rubrique(m.rid); const cl = classement(m.rid); return html`<div class="bulle" style="align-self:${cote};max-width:300px;width:100%">
          <div class="petit gras" style="color:${couleur(r)}">📊 Sondage</div><b class="titre" style="font-size:18px">${r.titre}</b>
          ${cl.length ? html`<div class="petit gras muted" style="margin-top:6px">Les idées du groupe</div>${cl.map(([n, v], i) => html`<div class="petit">${['🥇', '🥈', '🥉'][i]} ${n} · ${v} ❤️</div>`)}` : html`<div class="petit muted">Personne n'a encore voté.</div>`}
          <button class="bouton presse" style="height:44px;font-size:15px;margin-top:10px;background:${couleur(r)};color:#fff" onClick=${() => ctx.ouvrir({ type: 'rubrique', id: m.rid, groupe: id })}>Voter maintenant</button></div>`; }
        if (m.type === 'choix') { const r = rubrique(m.rid); return html`<div class="bulle" style="align-self:${cote}"><div class="petit gras" style="color:${couleur(r)}">❤️ Les choix de ${m.auteur} · ${r.titre}</div>${m.noms.map((n) => html`<div class="gras">${n}</div>`)}</div>`; }
        return html`<div class=${'bulle' + (m.moi ? ' moi' : '')}>${m.texte}</div>`;
      })}
      <div ref=${bas}></div>
    </div>
    ${plus && html`<div class="voile" style="background:transparent" onClick=${() => setPlus(false)}></div><div class="menu-plus">
      <div class="section-t" style="margin-top:4px">${s.premium ? 'Jouer' : 'Jouer · Premium 🔒'}</div>
      ${JEUX.map(([j, e, n]) => html`<button onClick=${() => lancer(j)}>${s.premium ? e : '🔒'} ${n}</button>`)}
      <div class="section-t">Lancer un sondage</div>
      ${RUBRIQUES.map((r) => html`<button onClick=${() => { setPlus(false); envoyer({ type: 'sondage', rid: r.id }); }}>${r.emoji} ${r.titre}</button>`)}
      <button onClick=${() => { setPlus(false); setFonds(true); }}>🎨 Changer le fond</button>
    </div>`}
    <form class="saisie" onSubmit=${(e) => { e.preventDefault(); if (!texte.trim()) return; envoyer({ texte: texte.trim() }); setTexte(''); }}>
      <button type="button" style="font-size:30px;color:var(--mandarine)" aria-label="Plus" onClick=${() => { son('pop'); setPlus(!plus); }}>⊕</button>
      <input placeholder="Message" value=${texte} onInput=${(e) => setTexte(e.target.value)} />
      <button type="submit" style="font-size:30px;color:${texte.trim() ? 'var(--mandarine)' : 'var(--texte2)'}" aria-label="Envoyer">⬆︎</button>
    </form>
    ${fonds && html`<${Feuille} fermer=${() => setFonds(false)}>
      <h2 class="titre">Fond de la discussion 🎨</h2>
      ${s.premium ? html`<label class="bouton presse" style="background:var(--rose);color:#fff;cursor:pointer">🖼️ Choisir une de mes photos
        <input type="file" accept="image/*" style="display:none" onChange=${(e) => photoFond(e, id, () => setFonds(false))} /></label>`
        : html`<button class="bouton presse" style="background:var(--violet);color:#fff" onClick=${() => { setFonds(false); ctx.offre(); }}>🖼️ Ma photo en fond · Premium 🔒</button>`}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
        <button onClick=${() => maj((x) => { x.groupes.find((y) => y.id === id).fond = null; })}><div style="height:110px;border-radius:16px;background:var(--ligne);border:${!g.fond ? '4px solid var(--rose)' : '2px solid var(--encre)'}"></div><b class="petit">Par défaut</b></button>
        ${Object.keys(FONDS).map((f) => { const verrou = !s.premium && !GRATUITS.includes(f); return html`<button style="position:relative" onClick=${() => { if (verrou) { setFonds(false); ctx.offre(); return; } son('coche'); maj((x) => { x.groupes.find((y) => y.id === id).fond = f; }); }}>
          <div style="height:110px;border-radius:16px;background:${FONDS[f]};border:${g.fond === f ? '4px solid var(--rose)' : '2px solid var(--encre)'};display:grid;place-items:center;font-size:22px;opacity:.95">${f === 'emojis' ? '🍕🎲🍿' : ''}</div>
          ${verrou && html`<span class="cadenas" style="position:absolute;top:8px;left:8px">🔒</span>`}<b class="petit">${NOMS_FONDS[f]}</b></button>`; })}
      </div><//>`}
    ${jeu === 'morpion' && html`<${Morpion} fermer=${() => setJeu(null)} publier=${(t) => publierJeu('morpion', t)} />`}
    ${jeu === 'pfc' && html`<${PFC} fermer=${() => setJeu(null)} publier=${(t) => publierJeu('pfc', t)} />`}
  </div>`;
}
function photoFond(e, id, fini) {
  const f = e.target.files?.[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 900 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.75);
    son('coche'); maj((x) => { const g = x.groupes.find((y) => y.id === id); g.fond = 'photo'; g.photo = url; }); fini();
  };
  img.src = URL.createObjectURL(f);
}

const LIGNES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function Morpion({ fermer, publier }) {
  const [c, setC] = useState(Array(9).fill(null));
  const [robot, setRobot] = useState(true);
  const [tour, setTour] = useState('❌');
  const [fin, setFin] = useState(null);
  const [gagne, setGagne] = useState([]);
  const verifier = (g) => {
    for (const l of LIGNES) if (g[l[0]] && g[l[0]] === g[l[1]] && g[l[0]] === g[l[2]]) {
      setGagne(l); const a = g[l[0]];
      setFin(robot ? (a === '❌' ? `${S.prenom} a battu le robot au morpion ! 🏆` : `Le robot 🤖 a gagné au morpion contre ${S.prenom}…`) : `${a} gagne la partie de morpion ! 🏆`);
      son(a === '❌' || !robot ? 'bravo' : 'non'); return true;
    }
    if (g.every(Boolean)) { setFin(robot ? `Match nul entre ${S.prenom} et le robot 🤝` : 'Match nul au morpion 🤝'); son('coche'); return true; }
    return false;
  };
  const jouer = (i, g = c, t = tour) => {
    if (g[i] || fin) return;
    const n = [...g]; n[i] = t; setC(n); son('pop');
    if (verifier(n)) return;
    const suivant = t === '❌' ? '⭕' : '❌'; setTour(suivant);
    if (robot && suivant === '⭕') setTimeout(() => jouer(coupRobot(n), n, '⭕'), 600);
  };
  const coupRobot = (g) => {
    for (const sgn of ['⭕', '❌']) for (const l of LIGNES) { const v = l.map((k) => g[k]); if (v.filter((x) => x === sgn).length === 2) { const k = l.find((k2) => !g[k2]); if (k !== undefined) return k; } }
    if (!g[4]) return 4;
    const coins = [0, 2, 6, 8].filter((k) => !g[k]); if (coins.length) return coins[Math.floor(Math.random() * coins.length)];
    const l = g.map((x, k) => (x ? null : k)).filter((x) => x !== null); return l[Math.floor(Math.random() * l.length)];
  };
  return html`<${Feuille} fermer=${fermer}><div style="text-align:center">
    <h2 class="titre">❌ Morpion ⭕</h2>
    <div class="segment" style="margin-bottom:12px">${[[true, 'Contre le robot 🤖'], [false, 'À deux 👫']].map(([v, t]) => html`<button class=${robot === v ? 'on' : ''} disabled=${c.some(Boolean)} onClick=${() => setRobot(v)}>${t}</button>`)}</div>
    <p class="gras">${fin || (robot && tour === '⭕' ? 'Le robot réfléchit… 🤔' : 'Au tour de ' + tour)}</p>
    <div class="grille-morpion">${c.map((v, i) => html`<button class=${gagne.includes(i) ? 'gagne' : ''} disabled=${!!v || !!fin || (robot && tour === '⭕')} onClick=${() => jouer(i)}>${v || ''}</button>`)}</div>
    ${fin && html`<div style="display:flex;gap:10px;margin-top:16px"><button class="bouton secondaire presse" onClick=${() => { setC(Array(9).fill(null)); setTour('❌'); setFin(null); setGagne([]); }}>Rejouer</button>
      <button class="bouton presse" style="background:var(--violet);color:#fff" onClick=${() => { publier(fin); fermer(); }}>Partager</button></div>`}
  </div><//>`;
}
function PFC({ fermer, publier }) {
  const signes = ['✊', '✋', '✌️'], noms = ['pierre', 'feuille', 'ciseaux'];
  const [moi, setMoi] = useState(null);
  const [rob, setRob] = useState(null);
  const [fin, setFin] = useState(null);
  const jouer = (i) => {
    setMoi(i); son('whoosh');
    setTimeout(() => {
      const r = Math.floor(Math.random() * 3); setRob(r);
      if (r === i) { setFin(`Égalité ! ${S.prenom} et le robot ont fait ${noms[i]} 🤝`); son('coche'); }
      else if ((i + 2) % 3 === r) { setFin(`${S.prenom} gagne : ${noms[i]} bat ${noms[r]} ! 🏆`); son('bravo'); }
      else { setFin(`Le robot gagne : ${noms[r]} bat ${noms[i]} 🤖`); son('non'); }
    }, 900);
  };
  return html`<${Feuille} fermer=${fermer}><div style="text-align:center">
    <h2 class="titre">✊ ✋ ✌️ Pierre-feuille-ciseaux</h2>
    <div style="display:flex;justify-content:center;gap:40px;font-size:70px;margin:16px 0"><span>${moi == null ? '❔' : signes[moi]}</span><b style="font-size:24px;align-self:center">VS</b><span>${rob == null ? '🤖' : signes[rob]}</span></div>
    ${fin ? html`<p class="titre" style="font-size:20px">${fin}</p><div style="display:flex;gap:10px"><button class="bouton secondaire presse" onClick=${() => { setMoi(null); setRob(null); setFin(null); }}>Rejouer</button>
      <button class="bouton presse" style="background:var(--mandarine);color:#fff" onClick=${() => { publier(fin); fermer(); }}>Partager</button></div>`
      : html`<p class="gras">Choisis ton signe :</p><div style="display:flex;justify-content:center;gap:14px">${signes.map((sg, i) => html`<button class="sticker presse" style="width:84px;height:84px;font-size:44px" disabled=${moi != null} onClick=${() => jouer(i)}>${sg}</button>`)}</div>`}
  </div><//>`;
}

// ———————————————————— Réglages ————————————————————
const AMBIANCES = [['pop', '🎈', 'Pop', 'Joyeux et pétillant'], ['doux', '🪵', 'Tout doux', 'Marimba feutré, tout calme'], ['retro', '👾', 'Rétro 8 bits', 'Comme une vieille console'], ['cloches', '🔔', 'Clochettes', 'Cristallin et magique'], ['bulles', '🫧', 'Bulles', 'Plouf, bloup, glou-glou']];
function Reglages({ ctx }) {
  const s = useS();
  const [amb, setAmb] = useState(false);
  const Ligne = (label, droite) => html`<div class="ligne" style="justify-content:space-between"><b>${label}</b>${droite}</div>`;
  const Bascule = (val, f) => html`<button role="switch" aria-checked=${val} onClick=${f} style="width:52px;height:32px;border-radius:16px;background:${val ? 'var(--vert)' : 'var(--ligne)'};position:relative;transition:.2s">
    <span style="position:absolute;top:3px;left:${val ? 23 : 3}px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:.2s"></span></button>`;
  return html`<div class="ecran">
    <${Entete} titre="Réglages" />
    <div class="section-t">Mon profil</div>
    <div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0 10px">${AVATARS.map((a) => html`<button style="font-size:28px;flex:none;width:50px;height:50px;border-radius:50%;background:${a === s.avatar ? 'var(--jaune)' : 'var(--ligne)'}" onClick=${() => { son('pop'); maj((x) => { x.avatar = a; }); }}>${a}</button>`)}</div>
    <div class="liste">
      ${Ligne('Prénom', html`<input style="border:0;background:none;text-align:right;outline:none;font-weight:700;width:55%" value=${s.prenom} onChange=${(e) => e.target.value.trim() && maj((x) => { x.prenom = e.target.value.trim(); })} />`)}
      ${Ligne('Famille', html`<input style="border:0;background:none;text-align:right;outline:none;font-weight:700;width:55%" value=${s.famille} onChange=${(e) => maj((x) => { x.famille = e.target.value.trim(); })} />`)}
      <div class="segment">${[['parent', 'Parent'], ['enfant', 'Enfant']].map(([v, t]) => html`<button class=${s.role === v ? 'on' : ''} onClick=${() => maj((x) => { x.role = v; })}>${t}</button>`)}</div>
      <button class="ligne presse" onClick=${() => ctx.ouvrir({ type: 'qcm' })}><b style="flex:1;text-align:left">🍽️ Mes goûts et allergies</b>›</button>
    </div>
    <div class="section-t">KESKON Premium</div>
    ${s.premium ? html`<div class="ligne"><b style="color:var(--vert);flex:1">✅ Activé pour ${s.premiumPersonnes} personne${s.premiumPersonnes > 1 ? 's' : ''} · merci ! 💛</b></div>
      <button class="ligne petit muted" onClick=${() => maj((x) => { x.premium = false; })}>Remettre les pubs (test)</button>`
      : html`<button class="ligne presse" onClick=${ctx.offre}><b style="flex:1;text-align:left;color:var(--accent)">✨ Passer Premium · dès 0,99 €</b>›</button>`}
    <div class="section-t">Apparence</div>
    <div class="segment">${[['auto', "Comme l'appareil"], ['clair', 'Clair'], ['sombre', 'Sombre']].map(([v, t]) => html`<button class=${s.apparence === v ? 'on' : ''} onClick=${() => maj((x) => { x.apparence = v; })}>${t}</button>`)}</div>
    <div class="section-t">Taille du texte</div>
    <div class="segment">${[['petit', 'Petit'], ['normal', 'Normal'], ['grand', 'Grand'], ['tresgrand', 'Très grand']].map(([v, t]) => html`<button class=${s.taille === v ? 'on' : ''} onClick=${() => maj((x) => { x.taille = v; })}>${t}</button>`)}</div>
    <div class="section-t">Style</div>
    <div class="ligne" style="gap:10px">${['rose', 'violet', 'bleu', 'vert', 'mandarine', 'framboise'].map((c) => html`<button aria-label=${'Couleur ' + c} style="width:36px;height:36px;border-radius:50%;background:${COUL[c]};border:${s.accent === c ? '3px solid var(--encre)' : '0'}" onClick=${() => maj((x) => { x.accent = c; })}></button>`)}</div>
    <div class="liste" style="margin-top:10px">
      ${Ligne('✨ Fond animé', Bascule(s.fondAnime, () => maj((x) => { x.fondAnime = !x.fondAnime; })))}
      ${Ligne('🔊 Sons', Bascule(s.sons, () => { maj((x) => { x.sons = !x.sons; }); son('oui'); }))}
      ${s.sons && html`<button class="ligne presse" onClick=${() => setAmb(true)}><b style="flex:1;text-align:left">🎵 Ambiance sonore</b><span class="muted">${AMBIANCES.find((a) => a[0] === (s.premium ? s.ambiance : 'pop'))[2]}</span>›</button>`}
    </div>
    <div class="section-t">Aide</div>
    <div class="liste">
      <button class="ligne presse" onClick=${() => ctx.ouvrir({ type: 'aide' })}><b style="flex:1;text-align:left">❓ Aide et astuces</b>›</button>
      <button class="ligne presse" onClick=${() => maj((x) => { x.intro = false; })}><b style="flex:1;text-align:left">▶️ Revoir la vidéo d'intro</b>›</button>
      <button class="ligne" style="color:#ff3b30;font-weight:800" onClick=${() => { if (confirm('Changer de profil ?')) maj((x) => { x.prenom = ''; }); }}>Changer de profil</button>
      <button class="ligne muted petit" onClick=${() => { if (confirm('Tout effacer et recommencer la démo ?')) { localStorage.removeItem('keskon'); location.reload(); } }}>Tout effacer (démo)</button>
    </div>
    <p class="muted petit" style="text-align:center;margin-top:20px">KESKON web · version 1.0</p>
    ${amb && html`<${Feuille} fermer=${() => setAmb(false)}><h2 class="titre">Ambiance sonore</h2><div class="liste">
      ${AMBIANCES.map(([id, e, n, d]) => { const verrou = !s.premium && id !== 'pop'; return html`<button class="ligne presse" onClick=${() => {
        if (verrou) { setAmb(false); ctx.offre(); return; }
        maj((x) => { x.ambiance = id; }); son('oui'); setTimeout(() => son('coche'), 550); setTimeout(() => son('bravo'), 950); }}>
        <span style="font-size:30px">${e}</span><span style="flex:1;text-align:left"><b>${n}</b><div class="muted petit">${d}</div></span>
        ${verrou ? html`<span class="cadenas">🔒</span>` : (s.ambiance === id || (!s.premium && id === 'pop')) && html`<span class="coche on">✓</span>`}</button>`; })}
    </div><//>`}
  </div>`;
}

// ———————————————————— Offre Premium (paiement simulé) ————————————————————
function Offre({ fermer }) {
  const s = useS();
  const [n, setN] = useState(4);
  const [paie, setPaie] = useState(false);
  const [merci, setMerci] = useState(false);
  const acheter = () => { setPaie(true); setTimeout(() => { setPaie(false); son('bravo'); maj((x) => { x.premium = true; x.premiumPersonnes = n; }); setMerci(true); }, 1200); };
  return html`<div class="plein" style="background:linear-gradient(135deg,#8C55FF,#FF3D8C,#FF6B2B);color:#fff;padding:20px 22px 40px">
    <button class="rond-btn" style="position:fixed;top:16px;right:16px;background:rgba(0,0,0,.2);border:0;box-shadow:none;color:#fff" aria-label="Fermer" onClick=${fermer}>✕</button>
    ${merci ? html`<div style="text-align:center;padding-top:80px"><div style="font-size:90px" class="pop-in">🎉</div><div class="titre" style="font-size:44px;text-shadow:3px 4px 0 #1A0F33">Merci !</div>
      <p class="gras">Premium activé : zéro pub, jeux, fonds et sons pour toute la famille (${s.premiumPersonnes} personne${s.premiumPersonnes > 1 ? 's' : ''}).</p>
      <button class="bouton presse" style="background:#fff;margin-top:20px" onClick=${fermer}>Super ! 🚀</button></div>`
    : html`<div style="text-align:center"><div style="font-size:54px">✨</div><div class="titre" style="font-size:34px;text-shadow:3px 4px 0 #1A0F33">KESKON Premium</div>
        <p class="gras">Un seul paiement, pour toujours. Pas d'abonnement.</p></div>
      <div class="sticker" style="padding:16px;color:#1A0F33;background:#fff;margin:16px 0">${[['🚫', 'Plus aucune pub, nulle part'], ['🎮', 'Les jeux dans les groupes'], ['🖼️', 'Les fonds de discussion et ta photo'], ['🎵', 'Toutes les ambiances sonores'], ['👨‍👩‍👧‍👦', 'Pour toute la famille']].map(([e, t]) => html`<div style="display:flex;gap:12px;align-items:center;margin:6px 0"><span style="font-size:24px">${e}</span><b>${t}</b></div>`)}</div>
      <div class="sticker" style="padding:18px;color:#1A0F33;background:#fff;text-align:center">
        <b>Combien êtes-vous dans la famille ?</b>
        <div style="display:flex;justify-content:center;margin:10px 0;height:44px">${Array.from({ length: n }, (_, i) => html`<span class="pop-in" style="font-size:24px;width:40px;height:40px;border-radius:50%;background:#FFF8ED;border:2px solid #1A0F33;display:grid;place-items:center;margin-left:-8px">${AVATARS[i]}</span>`)}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:20px">
          <button class="rond-btn" style="background:${n > 1 ? 'var(--rose)' : '#ccc'};color:#fff" disabled=${n <= 1} onClick=${() => { son('tap'); setN(n - 1); }}>−</button>
          <b class="titre" style="font-size:22px;min-width:140px">${n} personne${n > 1 ? 's' : ''}</b>
          <button class="rond-btn" style="background:${n < 8 ? 'var(--rose)' : '#ccc'};color:#fff" disabled=${n >= 8} onClick=${() => { son('tap'); setN(n + 1); }}>+</button>
        </div>
        ${n > 1 && html`<div style="margin-top:10px"><s class="muted">${euros(0.99 * n)}</s> <span class="badge" style="background:var(--vert);color:#fff">-${reduc(n)} %</span></div>`}
        <div class="titre" style="font-size:40px">${euros(GRILLE[n])}</div>
        <div class="petit muted gras">soit ${euros(GRILLE[n] / n)} par personne</div>
      </div>
      <button class="bouton presse" style="margin-top:18px;height:60px" disabled=${paie} onClick=${acheter}>${paie ? 'Paiement…' : `Passer Premium · ${euros(GRILLE[n])}`}</button>
      <p style="text-align:center"><span class="badge" style="background:var(--jaune);color:#1A0F33">🧪 Mode test : aucun paiement réel</span></p>`}
  </div>`;
}

// La « pub » plein écran (maison) : elle se ferme au bout de 5 secondes
function PubPlein({ fermer, offre }) {
  const [t, setT] = useState(5);
  useEffect(() => { const i = setInterval(() => setT((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(i); }, []);
  return html`<div class="plein" style="background:#120f29;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:30px;text-align:center">
    <button style="position:fixed;top:16px;right:16px;background:rgba(255,255,255,.15);padding:8px 14px;border-radius:99px;font-weight:800;color:#fff" disabled=${t > 0} onClick=${fermer}>${t > 0 ? `Fermer dans ${t}` : 'Fermer ✕'}</button>
    <span class="badge" style="background:var(--jaune);color:#1A0F33">SPONSORISÉ</span>
    <div style="font-size:90px" class="pop-in">🙉</div>
    <div class="titre" style="font-size:36px">Marre des pubs ?</div>
    <p class="gras" style="opacity:.8">Passe à KESKON Premium : zéro pub, les jeux de groupe, les fonds et les sons. Dès 0,99 € par personne.</p>
    <button class="bouton presse" style="max-width:320px" onClick=${offre}>Voir l'offre ✨</button>
  </div>`;
}

// ———————————————————— Aide ————————————————————
const AIDE = [
  ['Les bases', [['👋', "C'est quoi KESKON ?", "KESKON aide la famille à décider ensemble : quoi manger, quoi faire, quoi regarder, où aller… Les parents proposent des idées, puis tout le monde swipe pour dire oui ou non."],
    ['👨‍👩‍👧', 'Parent ou enfant ?', "Le parent coche les idées à proposer dans chaque rubrique. L'enfant swipe uniquement parmi ces propositions. Un parent peut aussi swiper avec le bouton 🃏 en haut de la rubrique."],
    ['👉', 'Comment on swipe ?', 'Fais glisser la carte vers la droite pour dire OUI (bord vert) et vers la gauche pour NON (bord rouge), ou utilise les boutons ✕ et ❤️. Pas besoin de tout swiper : touche « Mes choix ».'],
    ['📖', 'Voir la recette ou les détails', 'Touche la photo ou le bouton ℹ️ : la fiche s\'ouvre avec la recette, où regarder le film, les règles du jeu…']]],
  ['Les rubriques', [['📍', 'Visiter près de chez nous', 'En ouvrant « Keskon visite ? », KESKON te demande où tu es. Tu verras alors ce qu\'il y a à voir autour, avec photos et résumés de Wikipédia.'],
    ['🍽️', 'Mes goûts et allergies', 'Dans Réglages → Mes goûts et allergies. Ce que tu adores remonte en premier, ce que tu n\'aimes pas disparaît.'],
    ['🔍', 'Chercher une idée', "Utilise la barre de recherche de l'accueil : elle cherche dans toutes les rubriques à la fois."]]],
  ['La planète', [['🌱', "L'éco-geste du jour", "Chaque jour, un petit geste pour la nature. Touche « C'est fait ! » : ta série grandit et la plante de la famille aussi. Les flèches ‹ › (ou un glissement) permettent de voir les gestes des autres jours."]]],
  ['Amis et groupes', [['💬', 'Groupes, sondages et jeux', 'Crée un groupe, puis touche ⊕ pour lancer un sondage ou un jeu (Premium). Les OUI de chacun s\'ajoutent tout seuls au sondage.'],
    ['🧪', 'Pourquoi mes amis ne voient pas mes messages ?', 'KESKON est en mode démo : tout reste sur cet appareil en attendant les vrais comptes.']]],
];
function Aide({ ctx }) {
  const [ouvert, setOuvert] = useState(null);
  return html`<div class="ecran">
    <${Entete} titre="Aide" retour=${ctx.fermer} />
    <div style="text-align:center"><div style="font-size:54px">🤔</div><b class="titre" style="font-size:22px">Besoin d'un coup de main ?</b></div>
    ${AIDE.map(([t, qs]) => html`<div class="section-t">${t}</div><div class="liste">${qs.map(([e, q, r]) => html`
      <button class="ligne" style="flex-direction:column;align-items:stretch" onClick=${() => setOuvert(ouvert === q ? null : q)}>
        <span style="display:flex;gap:12px;align-items:center"><span style="font-size:24px">${e}</span><b style="flex:1;text-align:left">${q}</b>${ouvert === q ? '−' : '+'}</span>
        ${ouvert === q && html`<p class="muted" style="text-align:left;margin:8px 0 0">${r}</p>`}</button>`)}</div>`)}
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
