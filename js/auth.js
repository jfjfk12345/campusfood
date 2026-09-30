// ============================================================
// auth.js – Модуль аутентификации и контроллер страницы входа
// ============================================================
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function register(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    displayName,
    role: 'user',
    createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? snap.data() : null;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ------------------------------------------------------------
// Функция показа уведомлений
// ------------------------------------------------------------
export function toast(msg, type = '') {
  let c = document.getElementById('toastContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
window.toast = toast;

// ------------------------------------------------------------
// Логика страницы auth.html
// ------------------------------------------------------------
function friendlyError(code) {
  const m = {
    'auth/invalid-email': 'Неверный формат email',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/invalid-credential': 'Неверный email или пароль',
    'auth/email-already-in-use': 'Этот email уже зарегистрирован',
    'auth/weak-password': 'Пароль должен быть минимум 6 символов',
    'auth/configuration-not-found': 'Email/Password провайдер не включен в Firebase Console'
  };
  return m[code] || 'Произошла ошибка. Попробуйте снова.';
}

const show = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };
const hide = (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };

window.showLogin = () => { hide('regCard'); hide('resetCard'); show('loginCard'); };
window.showReg   = () => { hide('loginCard'); hide('resetCard'); show('regCard'); };
window.switchToReset = () => { hide('loginCard'); show('resetCard'); };

window.handleLogin = async () => {
  const emailEl = document.getElementById('loginEmail');
  const passEl  = document.getElementById('loginPassword');
  if (!emailEl || !passEl) return;
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  try {
    await login(email, pass);
    toast('Вход выполнен! Перенаправление...', 'success');
  } catch(e) {
    toast(friendlyError(e.code), 'error');
  }
};

window.handleRegister = async () => {
  const nameEl  = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl  = document.getElementById('regPassword');
  if (!nameEl || !emailEl || !passEl) return;
  const name  = nameEl.value.trim();
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  if (!name) { toast('Введите ваше имя', 'error'); return; }
  try {
    await register(email, pass, name);
    toast('Регистрация успешна! Добро пожаловать! 🎉', 'success');
  } catch(e) {
    toast(friendlyError(e.code), 'error');
  }
};

window.handleReset = async () => {
  const emailEl = document.getElementById('resetEmail');
  if (!emailEl) return;
  const email = emailEl.value.trim();
  try {
    await resetPassword(email);
    toast('Ссылка для сброса отправлена на почту ✉️', 'success');
  } catch(e) {
    toast(friendlyError(e.code), 'error');
  }
};

// Перенаправление, если пользователь уже вошёл на странице auth.html
if (document.getElementById('loginCard')) {
  onAuthChange(user => {
    if (user) {
      window.location.href = 'index.html';
    }
  });
}
