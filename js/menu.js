// ============================================================
// menu.js – Каталог меню и контроллер главной страницы
// ============================================================
import { db, auth } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit,
  startAfter, getDocs, onSnapshot, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { login, register, logout, resetPassword, onAuthChange, getCurrentUserProfile, toast } from './auth.js';
import { addToCart, getCart } from './cart.js';

const PAGE_SIZE = 12;
let lastVisible = null;
let currentCategory = 'all';
let currentSort = 'nameLower';
let unsubscribe = null;

export function subscribeMenu(onItems) {
  if (unsubscribe) unsubscribe();
  const constraints = [orderBy(currentSort)];
  if (currentCategory !== 'all') {
    constraints.unshift(where('category', '==', currentCategory));
  }
  constraints.push(limit(PAGE_SIZE));
  const q = query(collection(db, 'menuItems'), ...constraints);
  unsubscribe = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    lastVisible = snap.docs[snap.docs.length - 1] || null;
    onItems(items, false);
  }, err => {
    console.error('Ошибка загрузки меню:', err);
    toast(`Ошибка загрузки меню: ${err.message}`, 'error');
    onItems([], false);
  });
  return unsubscribe;
}

export async function loadMore(onItems) {
  if (!lastVisible) return 0;
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
  const lower = term.toLowerCase();
  const q = query(
    collection(db, 'menuItems'),
    orderBy('nameLower'),
    where('nameLower', '>=', lower),
    where('nameLower', '<=', lower + '\uf8ff'),
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

// ------------------------------------------------------------
// Логика страницы index.html
// ------------------------------------------------------------
let currentItems = [];
let searchTimeout;

function categoryLabel(cat) {
  const m = {main:'Горячее',salad:'Салат',soup:'Суп',drink:'Напиток',dessert:'Десерт',bread:'Выпечка'};
  return m[cat] || cat || 'Блюдо';
}

function renderMenu(items, append = false) {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  grid.setAttribute('aria-busy', 'false');
  if (!append) {
    currentItems = items;
    grid.innerHTML = items.length ? '' : '<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🍽️</div><p>Блюда не найдены</p></div>';
  } else {
    currentItems = [...currentItems, ...items];
  }
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    const isAvail = item.available !== false;
    const img = item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
    card.innerHTML = `
      <a href="item.html?id=${item.id}">
        <div class="card-img-wrap">
          <img src="${img}" alt="${item.name}" loading="lazy"/>
          <span class="card-badge">${categoryLabel(item.category)}</span>
          ${!isAvail ? '<span class="card-badge-soldout">Закончилось</span>' : ''}
        </div>
        <div class="card-body">
          <div class="card-name">${item.name}</div>
          <div class="card-desc">${item.description || ''}</div>
          <div class="card-footer">
            <span class="card-price">${item.price} ₸</span>
            <button class="btn btn-primary btn-sm" ${!isAvail ? 'disabled' : ''} onclick="addItem(event,'${item.id}','${item.name.replace(/'/g,"\\'")}',${item.price},'${img}')">
              ${isAvail ? '+ В корзину' : 'Нет'}
            </button>
          </div>
        </div>
      </a>`;
    grid.appendChild(card);
  });
}

async function updateCartBadge() {
  const items = await getCart();
  const total = items.reduce((s,i) => s + (Number(i.qty)||1), 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.classList.toggle('hidden', total === 0);
  }
}

// Глобальные обработчики страницы index.html
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

window.openLoginModal = () => openModal('loginModal');
window.openRegModal   = () => openModal('regModal');
window.closeModal     = closeModal;
window.switchToReset  = () => { closeModal('loginModal'); openModal('resetModal'); };

window.handleLogin = async () => {
  const emailEl = document.getElementById('loginEmail');
  const passEl  = document.getElementById('loginPassword');
  if (!emailEl || !passEl) return;
  try {
    await login(emailEl.value.trim(), passEl.value);
    closeModal('loginModal');
    toast('Добро пожаловать! 👋', 'success');
  } catch(e) { toast(e.message, 'error'); }
};

window.handleRegister = async () => {
  const nameEl  = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl  = document.getElementById('regPassword');
  if (!nameEl || !emailEl || !passEl) return;
  try {
    await register(emailEl.value.trim(), passEl.value, nameEl.value.trim());
    closeModal('regModal');
    toast('Аккаунт создан! 🎉', 'success');
  } catch(e) { toast(e.message, 'error'); }
};

window.handleReset = async () => {
  const emailEl = document.getElementById('resetEmail');
  if (!emailEl) return;
  try {
    await resetPassword(emailEl.value.trim());
    closeModal('resetModal');
    toast('Ссылка для сброса отправлена на почту ✉️', 'success');
  } catch(e) { toast(e.message, 'error'); }
};

window.handleLogout = async () => {
  await logout();
  toast('До свидания! 👋');
};

window.filterCat = (el, cat) => {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  setCategory(cat);
  subscribeMenu((items, append) => {
    renderMenu(items, false);
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) loadBtn.classList.toggle('hidden', items.length < PAGE_SIZE);
  });
};

window.handleSort = (val) => {
  setSort(val);
  subscribeMenu((items, append) => {
    renderMenu(items, false);
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) loadBtn.classList.toggle('hidden', items.length < PAGE_SIZE);
  });
};

window.handleSearch = (val) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const loadBtn = document.getElementById('loadMoreBtn');
    if (!val.trim()) {
      subscribeMenu((items) => renderMenu(items, false));
      return;
    }
    const items = await searchMenu(val);
    renderMenu(items, false);
    if (loadBtn) loadBtn.classList.add('hidden');
  }, 400);
};

window.handleLoadMore = async () => {
  const more = await loadMore((items, append) => renderMenu(items, true));
  const loadBtn = document.getElementById('loadMoreBtn');
  if (!more && loadBtn) loadBtn.classList.add('hidden');
};

window.addItem = async (e, id, name, price, imageUrl) => {
  e.preventDefault();
  e.stopPropagation();
  if (!auth.currentUser) {
    openModal('loginModal');
    return;
  }
  try {
    await addToCart({ id, name, price, imageUrl });
    toast(`${name} добавлен в корзину 🛒`, 'success');
    updateCartBadge();
  } catch(err) {
    toast(err.message, 'error');
  }
};

// Инициализация на странице index.html
if (document.getElementById('menuGrid')) {
  onAuthChange(async user => {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const adminLink = document.getElementById('adminLink');
    const navUserName = document.getElementById('navUserName');

    if (navAuth) {
      navAuth.classList.remove('auth-pending');
      navAuth.classList.toggle('hidden', Boolean(user));
    }
    if (navUser) navUser.classList.toggle('hidden', !user);

    if (!user) {
      if (adminLink) adminLink.classList.add('hidden');
      return;
    }

    if (navUserName) navUserName.textContent = user.email || '';
    const profile = await getCurrentUserProfile();
    if (navUserName) navUserName.textContent = profile?.displayName || user.email;
    if (profile?.role === 'admin' && adminLink) adminLink.classList.remove('hidden');
    updateCartBadge();
  });

  // Запускаем обновление меню в реальном времени
  subscribeMenu((items, append) => {
    renderMenu(items, append);
    const loadBtn = document.getElementById('loadMoreBtn');
    if (loadBtn) loadBtn.classList.toggle('hidden', items.length < PAGE_SIZE);
  });

  // Закрытие модального окна по нажатию на фон
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}
