// admin.js – Admin operations
import { db, auth } from './firebase-config.js';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function isAdmin() {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() && snap.data().role === 'admin';
}

export async function addMenuItem(data) {
  return addDoc(collection(db, 'menuItems'), {
    ...data,
    nameLower: data.name.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMenuItem(id, data) {
  const updates = { ...data, updatedAt: serverTimestamp() };
  if (data.name) updates.nameLower = data.name.toLowerCase();
  return updateDoc(doc(db, 'menuItems', id), updates);
}

export async function deleteMenuItem(id) {
  return deleteDoc(doc(db, 'menuItems', id));
}

export async function getAllUsers() {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setUserRole(uid, role) {
  return updateDoc(doc(db, 'users', uid), { role });
}

export async function getStats() {
  const [ordersSnap, usersSnap, menuSnap] = await Promise.all([
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'menuItems'))
  ]);
  const totalRevenue = ordersSnap.docs
    .filter(d => d.data().status === 'completed')
    .reduce((s, d) => s + (d.data().total || 0), 0);
  return {
    totalOrders: ordersSnap.size,
    totalUsers: usersSnap.size,
    totalMenuItems: menuSnap.size,
    totalRevenue
  };
}
