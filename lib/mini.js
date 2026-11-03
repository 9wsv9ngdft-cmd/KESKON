// ——— mini.js : un petit moteur d'affichage maison (façon Preact + htm), sans dépendance ———
// html`...` décrit l'interface, render() l'affiche, et les hooks gèrent l'état.

// ——— Nœuds virtuels ———
export function h(type, props, ...children) {
  props = props || {};
  const kids = [];
  const aplatir = (c) => {
    if (Array.isArray(c)) c.forEach(aplatir);
    else if (c === null || c === undefined || c === false || c === true || c === '') return;
    else if (typeof c === 'object' && c.type !== undefined) kids.push(c);
    else kids.push({ type: '#text', text: String(c) });
  };
  aplatir(children.length ? children : props.children);
  const { key, ...reste } = props;
  return { type, props: { ...reste, children: kids }, key: key ?? null };
}
export const Fragment = (p) => p.children;

// ——— Le gabarit html`` (lu une seule fois par gabarit, puis réutilisé) ———
const MARQ = '\u0001';
const caches = new WeakMap();
export function html(strings, ...vals) {
  let arbre = caches.get(strings);
  if (!arbre) { arbre = analyser(strings); caches.set(strings, arbre); }
  const r = construire(arbre, vals);
  return r.length === 1 ? r[0] : r;
}
function analyser(strings) {
  // On remplace chaque ${…} par un marqueur numéroté
  let src = strings[0];
  for (let i = 1; i < strings.length; i++) src += MARQ + (i - 1) + MARQ + strings[i];
  let i = 0;
  const racine = { enfants: [] };
  const pile = [racine];
  const lireValeur = (s) => {
    // découpe une chaîne avec marqueurs en morceaux : texte ou {trou: n}
    const parts = []; const re = new RegExp(MARQ + '(\\d+)' + MARQ, 'g'); let d = 0, m;
    while ((m = re.exec(s))) { if (m.index > d) parts.push(s.slice(d, m.index)); parts.push({ trou: +m[1] }); d = re.lastIndex; }
    if (d < s.length) parts.push(s.slice(d));
    return parts;
  };
  const texte = (t) => {
    if (!t) return;
    if (/^\s*$/.test(t) && t.includes('\n')) return;
    t = t.replace(/^\s*\n\s*/, '').replace(/\s*\n\s*$/, '').replace(/\s*\n\s*/g, ' ');
    if (!t) return;
    lireValeur(t).forEach((p) => pile[pile.length - 1].enfants.push(p));
  };
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) { texte(src.slice(i)); break; }
    texte(src.slice(i, lt));
    i = lt + 1;
    if (src[i] === '/') { // balise fermante
      i = src.indexOf('>', i) + 1;
      const fini = pile.pop();
      pile[pile.length - 1].enfants.push(fini);
      continue;
    }
    // nom de balise ou composant
    let type;
    if (src[i] === MARQ) { const f = src.indexOf(MARQ, i + 1); type = { trou: +src.slice(i + 1, f) }; i = f + 1; }
    else { const m = /^[a-zA-Z][\w-]*/.exec(src.slice(i)); type = m[0]; i += type.length; }
    const noeud = { type, attrs: [], enfants: [] };
    // attributs
    for (;;) {
      while (/\s/.test(src[i])) i++;
      if (src[i] === '/' && src[i + 1] === '>') { i += 2; pile[pile.length - 1].enfants.push(noeud); break; }
      if (src[i] === '>') { i++; pile.push(noeud); break; }
      const m = /^[^\s=>/]+/.exec(src.slice(i)); const nom = m[0]; i += nom.length;
      if (src[i] !== '=') { noeud.attrs.push([nom, [true]]); continue; }
      i++;
      if (src[i] === '"' || src[i] === "'") {
        const q = src[i]; const f = src.indexOf(q, i + 1);
        noeud.attrs.push([nom, lireValeur(src.slice(i + 1, f))]); i = f + 1;
      } else if (src[i] === MARQ) {
        const f = src.indexOf(MARQ, i + 1); noeud.attrs.push([nom, [{ trou: +src.slice(i + 1, f) }]]); i = f + 1;
      } else {
        const m2 = /^[^\s>]+/.exec(src.slice(i)); noeud.attrs.push([nom, [m2[0]]]); i += m2[0].length;
      }
    }
  }
  return racine.enfants;
}
function construire(liste, vals) {
  return liste.map((n) => {
    if (typeof n === 'string') return n;
    if (n.trou !== undefined && !n.type) return vals[n.trou];
    const type = typeof n.type === 'object' ? vals[n.type.trou] : n.type;
    const props = {};
    for (const [nom, parts] of n.attrs) {
      if (parts.length === 1) { const p = parts[0]; props[nom] = typeof p === 'object' && p !== null && p.trou !== undefined ? vals[p.trou] : p; }
      else props[nom] = parts.map((p) => (typeof p === 'object' ? (vals[p.trou] ?? '') : p)).join('');
    }
    return h(type, props, construire(n.enfants, vals));
  });
}

// ——— Affichage et mise à jour ———
let courant = null, indice = 0;
const effets = [];
const sales = new Set();
let prevu = false;

export function render(vnode, conteneur) {
  conteneur.textContent = '';
  const racine = { type: '#root', dom: conteneur, enfants: [], parent: null };
  reconcilier(racine, [vnode]);
  synchroniser(racine);
  lancerEffets();
}

const estHote = (f) => typeof f.type === 'string';
function monter(v, parent) {
  const f = { type: v.type, props: v.props, key: v.key, parent, enfants: [] };
  if (v.type === '#text') { f.dom = document.createTextNode(v.text); f.text = v.text; return f; }
  if (typeof v.type === 'function') { f.hooks = []; rendreComposant(f); return f; }
  f.dom = document.createElement(v.type);
  poserProps(f.dom, {}, v.props);
  reconcilier(f, v.props.children);
  synchroniser(f);
  if (v.props.autofocus) setTimeout(() => f.dom.focus(), 50);
  return f;
}
function mettreAJour(f, v) {
  const anciens = f.props;
  f.props = v.props;
  if (v.type === '#text') { if (f.text !== v.text) { f.dom.data = v.text; f.text = v.text; } return; }
  if (typeof v.type === 'function') { rendreComposant(f); return; }
  poserProps(f.dom, anciens, v.props);
  reconcilier(f, v.props.children);
  synchroniser(f);
}
function rendreComposant(f) {
  courant = f; indice = 0;
  let sortie;
  try { sortie = f.type(f.props); } finally { courant = null; }
  const liste = h(Fragment, null, sortie).props.children;
  reconcilier(f, liste);
}
function reconcilier(f, nouveaux) {
  const anciens = f.enfants;
  const parCle = new Map();
  const sansCle = [];
  anciens.forEach((a) => (a.key != null ? parCle.set(a.key, a) : sansCle.push(a)));
  let k = 0;
  const utilises = new Set();
  const res = nouveaux.map((v) => {
    let a = null;
    if (v.key != null) { a = parCle.get(v.key); if (a && a.type !== v.type) a = null; }
    else {
      while (k < sansCle.length && utilises.has(sansCle[k])) k++;
      if (k < sansCle.length && sansCle[k].type === v.type) { a = sansCle[k]; k++; }
      else if (k < sansCle.length) { k++; }
    }
    if (a && !utilises.has(a)) { utilises.add(a); mettreAJour(a, v); return a; }
    return monter(v, f);
  });
  anciens.forEach((a) => { if (!utilises.has(a)) demonter(a); });
  f.enfants = res;
}
function noeudsDom(f, acc = []) {
  if (f.type === '#text' || estHote(f)) acc.push(f.dom);
  else f.enfants.forEach((e) => noeudsDom(e, acc));
  return acc;
}
function synchroniser(hote) {
  const dom = hote.dom;
  const voulus = [];
  hote.enfants.forEach((e) => noeudsDom(e, voulus));
  for (let i = 0; i < voulus.length; i++) {
    const n = voulus[i];
    if (dom.childNodes[i] !== n) dom.insertBefore(n, dom.childNodes[i] || null);
  }
}
function demonter(f) {
  f.mort = true;
  if (f.hooks) f.hooks.forEach((hk) => { if (hk && typeof hk.nettoyer === 'function') { try { hk.nettoyer(); } catch {} } });
  f.enfants.forEach(demonter);
  if (f.dom && (f.type === '#text' || estHote(f))) f.dom.remove();
}
function hoteParent(f) { let p = f.parent; while (p && !(p.type === '#root' || estHote(p))) p = p.parent; return p; }
function profondeur(f) { let d = 0; while (f.parent) { d++; f = f.parent; } return d; }
function planifier(f) {
  sales.add(f);
  if (prevu) return;
  prevu = true;
  queueMicrotask(() => {
    prevu = false;
    const liste = [...sales].sort((a, b) => profondeur(a) - profondeur(b));
    sales.clear();
    for (const c of liste) {
      if (c.mort) continue;
      rendreComposant(c);
      const hote = hoteParent(c);
      if (hote) synchroniser(hote);
    }
    lancerEffets();
  });
}

// ——— Propriétés du DOM ———
function poserProps(dom, anciens, nouveaux) {
  for (const n in anciens) if (n !== 'children' && !(n in nouveaux)) poser(dom, n, null, anciens[n]);
  for (const n in nouveaux) if (n !== 'children' && nouveaux[n] !== anciens[n]) poser(dom, n, nouveaux[n], anciens[n]);
}
function poser(dom, n, v, ancien) {
  if (n === 'ref') { if (v) v.current = dom; return; }
  if (n === 'key' || n === 'autofocus') return;
  if (n[0] === 'o' && n[1] === 'n') {
    const ev = n.slice(2).toLowerCase();
    dom._l = dom._l || {};
    if (!dom._l[ev]) dom.addEventListener(ev, (e) => dom._l[ev] && dom._l[ev](e), ev === 'touchstart' || ev === 'scroll' ? { passive: true } : false);
    dom._l[ev] = v;
    return;
  }
  if (n === 'class' || n === 'className') { dom.setAttribute('class', v || ''); return; }
  if (n === 'style') {
    if (typeof v === 'string' || v == null) dom.style.cssText = v || '';
    else { dom.style.cssText = ''; Object.assign(dom.style, v); }
    return;
  }
  if (n === 'value' || n === 'checked') { if (dom[n] !== v) dom[n] = v ?? ''; return; }
  if (n === 'disabled' || n === 'hidden') { dom[n] = !!v; return; }
  if (v === null || v === undefined || v === false) dom.removeAttribute(n);
  else dom.setAttribute(n, v === true ? '' : v);
}

// ——— Hooks ———
function hook(init) {
  const f = courant; const i = indice++;
  if (!f.hooks[i]) f.hooks[i] = init();
  return [f.hooks[i], f];
}
const changes = (a, b) => !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));
export function useState(init) {
  const [hk, f] = hook(() => ({ v: typeof init === 'function' ? init() : init }));
  if (!hk.set) hk.set = (nv) => {
    const v = typeof nv === 'function' ? nv(hk.v) : nv;
    if (Object.is(v, hk.v)) return;
    hk.v = v; planifier(f);
  };
  return [hk.v, hk.set];
}
export function useRef(init) { return hook(() => ({ current: init }))[0]; }
export function useMemo(fn, deps) {
  const [hk] = hook(() => ({}));
  if (!('v' in hk) || changes(hk.deps, deps)) { hk.v = fn(); hk.deps = deps; }
  return hk.v;
}
export function useEffect(fn, deps) {
  const [hk] = hook(() => ({}));
  if (!hk.lance || deps === undefined || changes(hk.deps, deps)) { hk.lance = true; hk.deps = deps; effets.push([hk, fn]); }
}
function lancerEffets() {
  const l = effets.splice(0);
  for (const [hk, fn] of l) {
    if (typeof hk.nettoyer === 'function') { try { hk.nettoyer(); } catch {} }
    try { hk.nettoyer = fn(); } catch (e) { console.error(e); }
  }
}
