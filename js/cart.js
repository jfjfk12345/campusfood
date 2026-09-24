// cart.js – Cart management
import { db, auth } from './firebase-config.js';
import {
  doc, collection, setDoc, getDoc, updateDoc, deleteDoc,
  getDocs, serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

function cartRef(uid) {
  return collection(db, 'users', uid, 'cart');
}

export async function addToCart(item) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Войдите в систему');
  const ref = doc(db, 'users', uid, 'cart', item.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { qty: existing.data().qty + 1 });
  } else {
    await setDoc(ref, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl || '',
      qty: 1,
      addedAt: serverTimestamp()
    });
  }
}

export async function getCart() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(cartRef(uid));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateQty(itemId, qty) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  if (qty <= 0) return removeFromCart(itemId);
  await updateDoc(doc(db, 'users', uid, 'cart', itemId), { qty });
}

export async function removeFromCart(itemId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, 'users', uid, 'cart', itemId));
}

export async function clearCart() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const snap = await getDocs(cartRef(uid));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
