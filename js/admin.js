// ============================================================
// admin.js – Операции администратора и контроллер панели управления
// ============================================================
import { db, auth } from './firebase-config.js';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp, getDoc, onSnapshot, limit
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthChange, getCurrentUserProfile, logout, toast } from './auth.js';
import { getAllOrders, updateOrderStatus } from './orders.js';

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

// ------------------------------------------------------------
// Логика страницы admin.html
// ------------------------------------------------------------
let menuItems = [];
let queueUnsubscribe = null;

window.showSection = (name) => {
  ['stats','menu','orders','queue','users'].forEach(s => {
    const sec = document.getElementById(`section-${s}`);
    const nav = document.getElementById(`nav-${s}`);
    if (sec) sec.classList.toggle('hidden', s !== name);
    if (nav) nav.classList.toggle('active', s === name);
  });
  if (name === 'menu')   loadMenuTable();
  if (name === 'orders') loadOrdersTable();
  if (name === 'users')  loadUsersTable();
  if (name === 'queue')  startQueueSubscription();
  else if (queueUnsubscribe) { queueUnsubscribe(); queueUnsubscribe = null; }
};

async function loadStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  const s = await getStats();
  grid.innerHTML = `
    <div class="stat-card"><div class="stat-num">${s.totalOrders}</div><div class="stat-label">Всего заказов</div></div>
    <div class="stat-card"><div class="stat-num">${s.totalUsers}</div><div class="stat-label">Пользователей</div></div>
    <div class="stat-card"><div class="stat-num">${s.totalMenuItems}</div><div class="stat-label">Блюд в меню</div></div>
    <div class="stat-card"><div class="stat-num">${s.totalRevenue} ₸</div><div class="stat-label">Выручка (выданные)</div></div>`;
}

async function loadMenuTable() {
  const wrap = document.getElementById('menuTableWrap');
  if (!wrap) return;
  const snap = await getDocs(query(collection(db, 'menuItems'), orderBy('nameLower'), limit(150)));
  menuItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  wrap.innerHTML = menuItems.length ? `
    <div class="table-responsive">
      <table class="admin-table">
        <thead><tr><th>Название</th><th>Категория</th><th>Цена</th><th>Доступность</th><th>Действия</th></tr></thead>
        <tbody>${menuItems.map(i => `
          <tr>
            <td><strong>${i.name}</strong></td>
            <td>${i.category}</td>
            <td>${i.price} ₸</td>
            <td><span class="availability-status ${i.available !== false ? 'is-available' : 'is-unavailable'}">${i.available !== false ? 'В наличии' : 'Стоп-лист'}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="editItem('${i.id}')">✏️</button>
              <button class="btn btn-sm btn-danger"  onclick="delItem('${i.id}')">🗑️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p>Меню пустое</p>';
}

window.editItem = (id) => {
  const i = menuItems.find(m => m.id === id);
  if (!i) return;
  document.getElementById('menuModalTitle').textContent = 'Редактировать блюдо';
  document.getElementById('editItemId').value = id;
  document.getElementById('iName').value   = i.name || '';
  document.getElementById('iDesc').value   = i.description || '';
  document.getElementById('iPrice').value  = i.price || '';
  document.getElementById('iCal').value    = i.calories || '';
  document.getElementById('iWeight').value = i.weight || '';
  document.getElementById('iCat').value    = i.category || 'main';
  document.getElementById('iImg').value    = i.imageUrl || '';
  document.getElementById('iAvail').checked = i.available !== false;
  document.getElementById('menuItemModal').classList.add('open');
};

window.delItem = async (id) => {
  if (!confirm('Удалить это блюдо?')) return;
  await deleteMenuItem(id);
  toast('Блюдо удалено', 'success');
  loadMenuTable();
};

window.openMenuModal = () => {
  document.getElementById('menuModalTitle').textContent = 'Добавить блюдо';
  document.getElementById('editItemId').value = '';
  ['iName','iDesc','iPrice','iCal','iWeight','iImg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('iCat').value = 'main';
  document.getElementById('iAvail').checked = true;
  document.getElementById('menuItemModal').classList.add('open');
};

window.closeMenuModal = () => {
  document.getElementById('menuItemModal').classList.remove('open');
};

window.saveMenuItem = async () => {
  const id     = document.getElementById('editItemId').value;
  const data   = {
    name:        document.getElementById('iName').value.trim(),
    description: document.getElementById('iDesc').value.trim(),
    price:       parseFloat(document.getElementById('iPrice').value) || 0,
    calories:    parseInt(document.getElementById('iCal').value) || 0,
    weight:      parseInt(document.getElementById('iWeight').value) || 0,
    category:    document.getElementById('iCat').value,
    imageUrl:    document.getElementById('iImg').value.trim(),
    available:   document.getElementById('iAvail').checked,
  };
  if (!data.name) { toast('Введите название блюда', 'error'); return; }
  try {
    if (id) await updateMenuItem(id, data);
    else    await addMenuItem(data);
    window.closeMenuModal();
    toast(id ? 'Блюдо обновлено ✅' : 'Блюдо добавлено ✅', 'success');
    loadMenuTable();
  } catch(e) { toast(e.message, 'error'); }
};

async function loadOrdersTable() {
  const wrap = document.getElementById('ordersTableWrap');
  if (!wrap) return;
  const orders = await getAllOrders();
  const statusMap = {pending:'Ожидает',preparing:'Готовится',ready:'Готово',completed:'Выдан',cancelled:'Отменён'};
  wrap.innerHTML = orders.length ? `
    <div class="table-responsive">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Email</th><th>Сумма</th><th>Время</th><th>Статус</th><th>Действие</th></tr></thead>
        <tbody>${orders.map(o => `
          <tr>
            <td>#${o.id.slice(-6).toUpperCase()}</td>
            <td>${o.userEmail || ''}</td>
            <td>${o.total} ₸</td>
            <td>${o.pickupTime || '—'}</td>
            <td><span class="order-status status-${o.status}">${statusMap[o.status]||o.status}</span></td>
            <td>
              <select onchange="changeStatus('${o.id}',this.value)" style="font-size:.82rem;padding:.3rem .5rem;border-radius:6px;border:1px solid var(--border)">
                ${['pending','preparing','ready','completed','cancelled'].map(s => `<option value="${s}" ${s===o.status?'selected':''}>${statusMap[s]}</option>`).join('')}
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p>Заказов пока нет</p>';
}

window.changeStatus = async (orderId, status) => {
  await updateOrderStatus(orderId, status);
  toast(`Статус заказа обновлён!`, 'success');
};

function startQueueSubscription() {
  if (queueUnsubscribe) queueUnsubscribe();
  const q = query(collection(db, 'orders'), orderBy('createdAt','desc'), limit(50));
  queueUnsubscribe = onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({id:d.id,...d.data()}));
    ['pending','preparing','ready','completed'].forEach(status => {
      const col = document.getElementById(`q-${status}`);
      if (!col) return;
      const items = orders.filter(o => o.status === status);
      col.innerHTML = items.map(o => `
        <div class="queue-item">
          <div class="queue-item-id">#${o.id.slice(-6).toUpperCase()}</div>
          <div style="font-size:.8rem;color:var(--text-muted)">${o.pickupTime||''} | ${o.total}₸</div>
          <div style="font-size:.82rem;margin:0.2rem 0;">${(o.items||[]).map(i=>`${i.name}×${i.qty}`).join(', ')}</div>
          ${status !== 'completed' ? `
            <button class="btn btn-sm btn-success" style="width:100%;margin-top:.4rem" onclick="advanceOrder('${o.id}','${status}')">
              ${status==='pending'?'▶ Начать готовить':status==='preparing'?'✅ Готово к выдаче':'🏁 Выдать заказ'}
            </button>` : ''}
        </div>`).join('') || '<p style="font-size:.82rem;color:var(--text-muted);text-align:center">Пусто</p>';
    });
  });
}

window.advanceOrder = async (id, currentStatus) => {
  const next = {pending:'preparing',preparing:'ready',ready:'completed'};
  await updateOrderStatus(id, next[currentStatus]);
};

async function loadUsersTable() {
  const wrap = document.getElementById('usersTableWrap');
  if (!wrap) return;
  const users = await getAllUsers();
  wrap.innerHTML = users.length ? `
    <div class="table-responsive">
      <table class="admin-table">
        <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Действие</th></tr></thead>
        <tbody>${users.map(u => `
          <tr>
            <td>${u.displayName||'—'}</td>
            <td>${u.email||''}</td>
            <td><span class="badge ${u.role==='admin'?'badge-admin':''}">${u.role||'user'}</span></td>
            <td>
              ${u.role !== 'admin'
                ? `<button class="btn btn-sm btn-secondary" onclick="makeAdmin('${u.id}')">Сделать admin</button>`
                : `<button class="btn btn-sm btn-outline" onclick="makeUser('${u.id}')">Снять admin</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p>Пользователей нет</p>';
}

window.makeAdmin = async (uid) => { await setUserRole(uid,'admin'); toast('Роль admin назначена','success'); loadUsersTable(); };
window.makeUser  = async (uid) => { await setUserRole(uid,'user');  toast('Роль понижена до user','success'); loadUsersTable(); };

// Инициализация на странице admin.html
if (document.getElementById('adminPanel')) {
  onAuthChange(async user => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }
    const p = await getCurrentUserProfile();
    const navUserName = document.getElementById('navUserName');
    const logoutBtn = document.getElementById('logoutBtn');
    if (navUserName) navUserName.textContent = p?.displayName || user.email;
    if (logoutBtn) logoutBtn.onclick = () => { logout(); };

    if (!await isAdmin()) {
      document.getElementById('accessDenied').classList.remove('hidden');
      return;
    }
    document.getElementById('adminPanel').classList.remove('hidden');
    loadStats();
  });

  const modal = document.getElementById('menuItemModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }
}
