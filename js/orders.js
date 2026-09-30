// ============================================================
// orders.js – Оформление и отслеживание заказов, контроллер страницы профиля
// ============================================================
import { db, auth } from './firebase-config.js';
import {
  collection, addDoc, query, where, orderBy, getDocs,
  onSnapshot, doc, updateDoc, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getCart, clearCart } from './cart.js';
import { onAuthChange, getCurrentUserProfile, logout, toast } from './auth.js';

export async function placeOrder(pickupTime, comment = '') {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Войдите в систему для оформления заказа');
  const cartItems = await getCart();
  if (!cartItems.length) throw new Error('Корзина пуста');

  const total = cartItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

  const orderRef = await addDoc(collection(db, 'orders'), {
    uid,
    userEmail: auth.currentUser.email,
    items: cartItems.map(i => ({
      menuItemId: i.menuItemId || i.id,
      name: i.name,
      price: i.price,
      qty: i.qty
    })),
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
  if (!uid) {
    onOrders([]);
    return () => {};
  }
  // Запрашиваем только по uid без orderBy в самом запросе,
  // чтобы Firestore НЕ требовал создания составного индекса.
  const q = query(
    collection(db, 'orders'),
    where('uid', '==', uid)
  );
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Сортируем заказы в памяти браузера: самые свежие сверху
    items.sort((a, b) => {
      const getMs = (item) => {
        if (item.createdAt?.toMillis) return item.createdAt.toMillis();
        if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
        return 0;
      };
      return getMs(b) - getMs(a);
    });
    onOrders(items);
  }, error => {
    console.error("Ошибка загрузки заказов из Firestore:", error);
    toast(`Ошибка загрузки заказов: ${error.message}`, 'error');
    // Обязательно вызываем onOrders([]) чтобы спиннер исчез и не крутился вечно
    onOrders([]);
  });
}

export async function getAllOrders() {
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}

// ------------------------------------------------------------
// Логика страницы profile.html
// ------------------------------------------------------------
let allOrders = [];
let unsubOrders = null;

function renderOrders() {
  const activeContainer = document.getElementById('activeOrders');
  const historyContainer = document.getElementById('historyOrders');
  if (!activeContainer || !historyContainer) return;

  const active  = allOrders.filter(o => ['pending','preparing','ready'].includes(o.status));
  const history = allOrders.filter(o => ['completed','cancelled'].includes(o.status));

  activeContainer.innerHTML = active.length
    ? active.map(orderCard).join('')
    : '<div class="empty-state"><div class="icon">✅</div><p>Нет активных заказов</p><a href="index.html" class="btn btn-primary mt-2">Сделать заказ</a></div>';

  historyContainer.innerHTML = history.length
    ? history.map(orderCard).join('')
    : '<div class="empty-state"><div class="icon">📋</div><p>История заказов пуста</p></div>';
}

function orderCard(o) {
  const statusMap = {
    pending: 'Ожидает',
    preparing: 'Готовится',
    ready: 'Готово к выдаче! 🎉',
    completed: 'Выполнен',
    cancelled: 'Отменён'
  };
  const d = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('ru-RU') : 'Только что';
  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div style="font-weight:700;">Заказ #${o.id.slice(-6).toUpperCase()}</div>
          <div class="order-id">📅 ${d}</div>
          ${o.pickupTime ? `<div class="order-id">⏰ Время выдачи: <strong>${o.pickupTime}</strong></div>` : ''}
          ${o.comment ? `<div class="order-id">💬 ${o.comment}</div>` : ''}
        </div>
        <span class="order-status status-${o.status}">${statusMap[o.status] || o.status}</span>
      </div>
      <div class="order-items">${(o.items||[]).map(i => `${i.name} × ${i.qty}`).join(', ')}</div>
      <div class="order-total">Итого: ${o.total} ₸</div>
    </div>`;
}

window.switchTab = (tab) => {
  const act = document.getElementById('activeOrders');
  const hist = document.getElementById('historyOrders');
  const tabAct = document.getElementById('tab-active');
  const tabHist = document.getElementById('tab-history');

  if (act) act.classList.toggle('hidden', tab !== 'active');
  if (hist) hist.classList.toggle('hidden', tab !== 'history');

  if (tabAct) {
    tabAct.style.borderBottom = tab === 'active' ? '3px solid var(--primary)' : 'none';
    tabAct.style.color = tab === 'active' ? 'var(--primary)' : '';
  }
  if (tabHist) {
    tabHist.style.borderBottom = tab === 'history' ? '3px solid var(--primary)' : 'none';
    tabHist.style.color = tab === 'history' ? 'var(--primary)' : '';
  }
};

window.openEditModal = () => {
  const m = document.getElementById('editModal');
  if (m) m.classList.add('open');
};

window.saveProfile = async () => {
  const editInput = document.getElementById('editName');
  const name = editInput ? editInput.value.trim() : '';
  if (!name) {
    toast('Введите имя', 'error');
    return;
  }
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'users', uid), { displayName: name });
    const profileName = document.getElementById('profileName');
    const navUserName = document.getElementById('navUserName');
    const avatarBlock = document.getElementById('avatarBlock');
    const editModal = document.getElementById('editModal');

    if (profileName) profileName.textContent = name;
    if (navUserName) navUserName.textContent = name;
    if (avatarBlock) avatarBlock.textContent = name[0].toUpperCase();
    if (editModal) editModal.classList.remove('open');
    toast('Профиль обновлён! ✅', 'success');
  } catch(err) {
    toast(err.message, 'error');
  }
};

// Инициализация на странице profile.html
if (document.getElementById('activeOrders')) {
  onAuthChange(async user => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }
    let p = null;
    try {
      p = await getCurrentUserProfile();
    } catch (err) {
      console.warn('Не удалось загрузить данные профиля:', err);
    }
    const navUserName = document.getElementById('navUserName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    const avatarBlock = document.getElementById('avatarBlock');
    const editName = document.getElementById('editName');
    const adminLink = document.getElementById('adminLink');
    const logoutBtn = document.getElementById('logoutBtn');

    const name = p?.displayName || user.email;
    if (navUserName) navUserName.textContent = name;
    if (profileName) profileName.textContent = name;
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileRole) profileRole.textContent = p?.role || 'user';
    if (avatarBlock) avatarBlock.textContent = name[0].toUpperCase();
    if (editName) editName.value = p?.displayName || '';
    if (p?.role === 'admin' && adminLink) adminLink.classList.remove('hidden');
    if (logoutBtn) logoutBtn.onclick = () => { logout(); };

    // Подписка на обновления заказов в реальном времени
    if (unsubOrders) unsubOrders();
    unsubOrders = subscribeMyOrders(orders => {
      allOrders = orders;
      renderOrders();
    });
  });

  // Закрытие модального окна по нажатию на фон
  const editModal = document.getElementById('editModal');
  if (editModal) {
    editModal.addEventListener('click', e => {
      if (e.target === editModal) editModal.classList.remove('open');
    });
  }
}
