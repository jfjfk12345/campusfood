// ============================================================
// item.js – Контроллер страницы с подробной информацией о блюде
// ============================================================
import { auth, db } from './firebase-config.js';
import { onAuthChange, getCurrentUserProfile, logout, toast } from './auth.js';
import { getMenuItem } from './menu.js';
import { addToCart, getCart } from './cart.js';
import { collection, query, where, getDocs, limit, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const params = new URLSearchParams(location.search);
const itemId = params.get('id');

async function updateCartBadge() {
  const items = await getCart();
  const total = items.reduce((s,i) => s + (Number(i.qty)||1), 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.classList.toggle('hidden', total === 0);
  }
}

async function loadRelated(cat, excludeId) {
  const q = query(collection(db, 'menuItems'), where('category','==',cat), limit(4), orderBy('nameLower'));
  const snap = await getDocs(q);
  const items = snap.docs.filter(d => d.id !== excludeId).slice(0,3).map(d => ({id:d.id,...d.data()}));
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;
  grid.innerHTML = items.length ? items.map(i => `
    <a href="item.html?id=${i.id}" class="menu-card" style="text-decoration:none;">
      <div class="card-img-wrap"><img src="${i.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'}" alt="${i.name}" loading="lazy"/></div>
      <div class="card-body">
        <div class="card-name">${i.name}</div>
        <div class="card-footer"><span class="card-price">${i.price} ₸</span></div>
      </div>
    </a>`).join('') : '<p style="color:var(--text-muted)">Похожих блюд пока нет</p>';
}

async function loadItem() {
  const sec = document.getElementById('detailSection');
  if (!sec) return;
  if (!itemId) { location.href = 'index.html'; return; }

  const item = await getMenuItem(itemId);
  if (!item) {
    sec.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Блюдо не найдено</p><a href="index.html" class="btn btn-primary mt-2">← Вернуться в меню</a></div>';
    return;
  }

  document.title = `${item.name} – CampusFood`;
  const catLabel = {main:'Горячее',salad:'Салат',soup:'Суп',drink:'Напиток',dessert:'Десерт',bread:'Выпечка'}[item.category] || item.category || '';

  sec.innerHTML = `
    <a href="index.html" class="back-link">← Назад в меню</a>
    <div class="detail-grid">
      <div class="detail-img">
        <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80'}" alt="${item.name}"/>
      </div>
      <div class="detail-info">
        <div class="detail-meta">
          <span class="meta-tag">🏷️ ${catLabel}</span>
          ${item.calories ? `<span class="meta-tag">🔥 ${item.calories} ккал</span>` : ''}
          ${item.weight  ? `<span class="meta-tag">⚖️ ${item.weight} г</span>` : ''}
          <span class="meta-tag availability-status ${item.available !== false ? 'is-available' : 'is-unavailable'}">${item.available !== false ? 'В наличии' : 'Нет в наличии'}</span>
        </div>
        <h1>${item.name}</h1>
        <div class="detail-price">${item.price} ₸</div>
        <p class="detail-desc">${item.description || 'Свежее блюдо из нашей столовой.'}</p>
        <div class="detail-actions">
          <button class="btn btn-primary btn-lg" id="addCartBtn" ${item.available === false ? 'disabled' : ''}>
            ${item.available !== false ? '🛒 В корзину' : 'Нет в наличии'}
          </button>
          <a href="cart.html" class="btn btn-outline btn-lg">Перейти в корзину</a>
        </div>
      </div>
    </div>
    <div class="related-section">
      <h2 class="section-title">Похожие блюда</h2>
      <div class="menu-grid" id="relatedGrid"><div class="spinner"></div></div>
    </div>
  `;

  document.getElementById('addCartBtn')?.addEventListener('click', async () => {
    if (!auth.currentUser) {
      toast('Сначала войдите в систему', 'info');
      setTimeout(() => { location.href = 'auth.html'; }, 800);
      return;
    }
    if (item.available === false) {
      toast('Блюдо временно недоступно', 'error');
      return;
    }
    await addToCart(item);
    toast(`${item.name} добавлен в корзину! 🛒`, 'success');
    updateCartBadge();
  });

  loadRelated(item.category, item.id);
}

// Инициализация на странице item.html
if (document.getElementById('detailSection')) {
  onAuthChange(async user => {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const navUserName = document.getElementById('navUserName');
    const adminLink = document.getElementById('adminLink');
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
      if (navAuth) navAuth.classList.add('hidden');
      if (navUser) navUser.classList.remove('hidden');
      const p = await getCurrentUserProfile();
      if (navUserName) navUserName.textContent = p?.displayName || user.email;
      if (p?.role === 'admin' && adminLink) adminLink.classList.remove('hidden');
      updateCartBadge();
    } else {
      if (navAuth) navAuth.classList.remove('hidden');
      if (navUser) navUser.classList.add('hidden');
    }
    if (logoutBtn) logoutBtn.onclick = () => { logout(); };
  });

  loadItem();
}
