# 🍽️ CampusFood — Онлайн-заказ в столовой колледжа

> Веб-приложение для предварительного заказа еды в студенческой столовой.
> Студент выбирает блюда, указывает время получения, и забирает готовый заказ без очереди.

## 🔗 Ссылки

- **GitHub:** https://github.com/YOUR_USERNAME/campusfood
- **GitHub Pages:** https://YOUR_USERNAME.github.io/campusfood

---

## 📋 Функционал

| Страница | Возможности |
|----------|-------------|
| `index.html` | Меню дня, поиск, фильтр по категориям, сортировка, пагинация, real-time |
| `item.html` | Детальная страница блюда, похожие блюда |
| `cart.html` | Корзина, управление позициями, оформление заказа с временем получения |
| `profile.html` | Личный кабинет, история заказов в реальном времени, редактирование профиля |
| `admin.html` | CRUD меню, управление заказами, очередь real-time, управление пользователями, статистика |
| `auth.html` | Регистрация, вход, восстановление пароля |

---

## 🗄️ Схема Базы Данных (Firestore)

```
firestore/
├── users/{uid}
│   ├── uid: string
│   ├── email: string
│   ├── displayName: string
│   ├── role: 'user' | 'admin'
│   ├── createdAt: timestamp
│   └── cart/{menuItemId}          ← subcollection
│       ├── menuItemId: string
│       ├── name: string
│       ├── price: number
│       ├── imageUrl: string
│       ├── qty: number
│       └── addedAt: timestamp
│
├── menuItems/{itemId}
│   ├── name: string
│   ├── nameLower: string          ← для поиска (индекс)
│   ├── description: string
│   ├── price: number
│   ├── category: 'main'|'soup'|'salad'|'drink'|'dessert'|'bread'
│   ├── calories: number
│   ├── weight: number
│   ├── imageUrl: string
│   ├── available: boolean
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
└── orders/{orderId}
    ├── uid: string
    ├── userEmail: string
    ├── items: array[{menuItemId, name, price, qty}]
    ├── total: number
    ├── status: 'pending'|'preparing'|'ready'|'completed'|'cancelled'
    ├── pickupTime: string          ← "HH:MM"
    ├── comment: string
    ├── createdAt: timestamp
    └── updatedAt: timestamp
```

---

## ⚙️ Установка и запуск

### 1. Создать Firebase проект

1. Зайди на [console.firebase.google.com](https://console.firebase.google.com)
2. Создай новый проект
3. Добавь **веб-приложение** (Web App)
4. Включи **Authentication** → Email/Password
5. Создай **Firestore Database** (Production mode)

### 2. Вставить конфигурацию

Открой [`js/firebase-config.js`](js/firebase-config.js) и вставь свои данные из Firebase Console → Project Settings:

```javascript
const firebaseConfig = {
  apiKey:            'ТВОЙ_API_KEY',
  authDomain:        'ТВОЙ_PROJECT_ID.firebaseapp.com',
  projectId:         'ТВОЙ_PROJECT_ID',
  storageBucket:     'ТВОЙ_PROJECT_ID.appspot.com',
  messagingSenderId: 'ТВОЙ_MESSAGING_SENDER_ID',
  appId:             'ТВОЙ_APP_ID'
};
```

### 3. Настроить правила безопасности

В Firebase Console → Firestore → Rules вставь содержимое файла [`firestore.rules`](firestore.rules).

### 4. Добавить индексы

В Firebase Console → Firestore → Indexes → Composite создай индексы из [`firestore.indexes.json`](firestore.indexes.json):
- `menuItems`: `category ASC + nameLower ASC`
- `menuItems`: `category ASC + price ASC`
- `menuItems`: `category ASC + createdAt DESC`
- `orders`: `uid ASC + createdAt DESC`

### 5. Заполнить тестовые данные

1. Открой `index.html` в браузере
2. Зарегистрируйся и выйди
3. В Firebase Console → Firestore → users → найди свой документ → измени `role` на `admin`
4. Открой DevTools Console (F12) и выполни:
```javascript
// Импорт и запуск seed-скрипта
const m = await import('./js/seed.js');
```

### 6. Деплой на GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit: CampusFood app"
git remote add origin https://github.com/USERNAME/campusfood.git
git push -u origin main
```

Затем: GitHub → Repository → Settings → Pages → Source: `main` / `root`

---

## 🔥 Firebase функционалы

| Требование | Реализация |
|-----------|-----------|
| `onSnapshot` real-time | Главная страница (меню), Личный кабинет (заказы), Очередь в Админке |
| Пагинация | Кнопка "Показать ещё" с `startAfter()` |
| Поиск | `nameLower` + range query (>=, <=) |
| Фильтрация | `where('category', '==', ...)` |
| Сортировка | `orderBy(field)` |
| Security Rules | Роли user/admin, владелец корзины, публичное меню |
| Индексы | Composite indexes для фильтр+сортировка |
| Оптимизация | `nameLower` для case-insensitive поиска, дублирование данных в orders.items |

---

## 🎓 Критерии оценки

- ✅ Аутентификация (регистрация, вход, выход, сброс пароля)
- ✅ Каталог с пагинацией (кнопка "Показать ещё")
- ✅ Система заказов (корзина → заказ → история)
- ✅ Личный кабинет с историей и статусами в real-time
- ✅ Схема БД (см. выше)
- ✅ Правила безопасности (firestore.rules)
- ✅ Режим реального времени (onSnapshot в 3 местах)
- ✅ Полноценная Админ-панель (CRUD меню, заказы, очередь, пользователи)
- ✅ Оптимизация запросов (индексы, nameLower, limit)
- ✅ ES6 модули, чистая архитектура, адаптивная верстка
