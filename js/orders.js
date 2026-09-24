// orders.js – Order placement and history
import { db, auth } from './firebase-config.js';
import {
  collection, addDoc, query, where, orderBy, getDocs,
  onSnapshot, doc, updateDoc, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getCart, clearCart } from './cart.js';

export async function placeOrder(pickupTime, comment = '') {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Войдите в систему');
  const cartItems = await getCart();
  if (!cartItems.length) throw new Error('Корзина пуста');

  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  const orderRef = await addDoc(collection(db, 'orders'), {
    uid,
    userEmail: auth.currentUser.email,
    items: cartItems.map(i => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, qty: i.qty })),
    total,
    status: 'pending',
    pickupTime,
    comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await clearCart();
  return orderRef.id;
}

export function subscribeMyOrders(onOrders) {
  const uid = auth.currentUser?.uid;
  if (!uid) return () => {};
  const q = query(
    collection(db, 'orders'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, snap => {
    onOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function getAllOrders() {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}
