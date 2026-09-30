// ============================================================
// cart.js – Управление корзиной и контроллер страницы корзины
// ============================================================
import { db, auth } from './firebase-config.js';
import {
  doc, collection, setDoc, getDoc, updateDoc, deleteDoc,
  getDocs, serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthChange, getCurrentUserProfile, logout, toast } from './auth.js';
import { placeOrder } from './orders.js';

function cartRef(uid) {
  return collection(db, 'users', uid, 'cart');
}

export async function addToCart(item) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Пожалуйста, сначала войдите в аккаунт');
  const ref = doc(db, 'users', uid, 'cart', item.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { qty: (existing.data().qty || 1) + 1 });
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

// ------------------------------------------------------------
// Логика страницы cart.html
// ------------------------------------------------------------
let cartData = [];

async function loadCartPage() {
  cartData = await getCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const footer    = document.getElementById('cartFooter');
  const empty     = document.getElementById('emptyCart');

  if (!container || !footer || !empty) return;

  if (!cartData.length) {
    container.innerHTML = '';
    footer.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  footer.classList.remove('hidden');

  container.innerHTML = cartData.map(item => `
    <div class="cart-item" id="ci-${item.id}">
      <img class="cart-item-img" src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80'}" alt="${item.name}"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price} ₸ / шт.</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeQty('${item.id}',${item.qty - 1})">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}',${item.qty + 1})">+</button>
      </div>
      <div style="font-weight:800;min-width:70px;text-align:right">${item.price * item.qty} ₸</div>
      <button class="btn btn-danger btn-sm btn-icon" onclick="removeItem('${item.id}')" title="Удалить">🗑️</button>
    </div>`).join('');

  const totalCount = cartData.reduce((s,i) => s + i.qty, 0);
  const totalPrice = cartData.reduce((s,i) => s + i.price * i.qty, 0);
  const totalCountEl = document.getElementById('totalCount');
  const totalPriceEl = document.getElementById('totalPrice');
  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} ₸`;
}

window.changeQty = async (id, qty) => {
  await updateQty(id, qty);
  cartData = await getCart();
  renderCart();
};

window.removeItem = async (id) => {
  await removeFromCart(id);
  cartData = cartData.filter(i => i.id !== id);
  renderCart();
  toast('Позиция удалена из корзины');
};

window.handleOrder = async () => {
  const timeEl    = document.getElementById('pickupTime');
  const commentEl = document.getElementById('orderComment');
  const time    = timeEl ? timeEl.value : '';
  const comment = commentEl ? commentEl.value : '';

  if (!time) {
    toast('Укажите желаемое время получения заказа ⏰', 'error');
    if (timeEl) timeEl.focus();
    return;
  }
  try {
    const orderId = await placeOrder(time, comment);
    toast(`Заказ #${orderId.slice(-6).toUpperCase()} оформлен! 🎉`, 'success');
    cartData = [];
    renderCart();
    setTimeout(() => { window.location.href = 'profile.html'; }, 1500);
  } catch(e) {
    toast(e.message, 'error');
  }
};

// Инициализация на странице cart.html
if (document.getElementById('cartItems')) {
  onAuthChange(async user => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }
    const p = await getCurrentUserProfile();
    const navUserName = document.getElementById('navUserName');
    const adminLink = document.getElementById('adminLink');
    const logoutBtn = document.getElementById('logoutBtn');
    if (navUserName) navUserName.textContent = p?.displayName || user.email;
    if (p?.role === 'admin' && adminLink) adminLink.classList.remove('hidden');
    if (logoutBtn) logoutBtn.onclick = () => { logout(); };
    loadCartPage();
  });
}
