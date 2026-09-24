// menu.js – Menu catalog with real-time, pagination, search, filter
import { db } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit,
  startAfter, getDocs, onSnapshot, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const PAGE_SIZE = 12;
let lastVisible = null;
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'name';
let unsubscribe = null;

export function subscribeMenu(onItems) {
  if (unsubscribe) unsubscribe();
  let q = collection(db, 'menuItems');
  const constraints = [orderBy(currentSort)];
  if (currentCategory !== 'all') {
    constraints.unshift(where('category', '==', currentCategory));
  }
  constraints.push(limit(PAGE_SIZE));
  q = query(q, ...constraints);
  unsubscribe = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    lastVisible = snap.docs[snap.docs.length - 1] || null;
    onItems(items, false);
  });
  return unsubscribe;
}

export async function loadMore(onItems) {
  if (!lastVisible) return;
  const constraints = [orderBy(currentSort)];
  if (currentCategory !== 'all') {
    constraints.unshift(where('category', '==', currentCategory));
  }
  constraints.push(startAfter(lastVisible), limit(PAGE_SIZE));
  const q = query(collection(db, 'menuItems'), ...constraints);
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lastVisible = snap.docs[snap.docs.length - 1] || null;
  onItems(items, true);
  return items.length;
}

export async function searchMenu(term) {
  currentSearch = term.toLowerCase();
  const q = query(
    collection(db, 'menuItems'),
    orderBy('nameLower'),
    where('nameLower', '>=', currentSearch),
    where('nameLower', '<=', currentSearch + '\uf8ff'),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  lastVisible = snap.docs[snap.docs.length - 1] || null;
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function setCategory(cat) { currentCategory = cat; lastVisible = null; }
export function setSort(s) { currentSort = s; lastVisible = null; }

export async function getMenuItem(id) {
  const snap = await getDoc(doc(db, 'menuItems', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
