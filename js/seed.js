// seed.js – Run once in browser console to populate Firestore with demo data
// 1. Open index.html in browser
// 2. Open DevTools Console
// 3. Paste and run this script

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const MENU_ITEMS = [
  { name: 'Борщ украинский',       category: 'soup',    price: 85,  calories: 280, weight: 300, description: 'Наваристый борщ со сметаной и пампушками', imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80' },
  { name: 'Щи со свежей капустой', category: 'soup',    price: 75,  calories: 220, weight: 300, description: 'Классические щи из свежей капусты', imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' },
  { name: 'Котлета по-киевски',    category: 'main',    price: 145, calories: 420, weight: 200, description: 'Нежная куриная котлета с маслом внутри', imageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&q=80' },
  { name: 'Гречка с подливой',     category: 'main',    price: 95,  calories: 380, weight: 350, description: 'Рассыпчатая гречневая каша с мясной подливой', imageUrl: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&q=80' },
  { name: 'Макароны по-флотски',   category: 'main',    price: 90,  calories: 450, weight: 300, description: 'Макароны с фаршем – классика столовой', imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80' },
  { name: 'Пюре картофельное',     category: 'main',    price: 65,  calories: 280, weight: 300, description: 'Нежное картофельное пюре со сливочным маслом', imageUrl: 'https://images.unsplash.com/photo-1596458456895-82c20f903fd3?w=400&q=80' },
  { name: 'Салат Оливье',          category: 'salad',   price: 75,  calories: 320, weight: 200, description: 'Традиционный советский салат', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
  { name: 'Винегрет',              category: 'salad',   price: 55,  calories: 180, weight: 200, description: 'Свёкла, морковь, картофель, маринованный огурец', imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80' },
  { name: 'Греческий салат',       category: 'salad',   price: 110, calories: 260, weight: 220, description: 'Овощи, маслины, фета', imageUrl: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&q=80' },
  { name: 'Чай чёрный',            category: 'drink',   price: 25,  calories: 5,   weight: 250, description: 'Крепкий чёрный чай', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80' },
  { name: 'Компот из сухофруктов', category: 'drink',   price: 30,  calories: 95,  weight: 300, description: 'Домашний компот', imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80' },
  { name: 'Какао с молоком',       category: 'drink',   price: 45,  calories: 180, weight: 250, description: 'Горячее какао на молоке', imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&q=80' },
  { name: 'Пирожок с капустой',    category: 'bread',   price: 35,  calories: 220, weight: 120, description: 'Свежевыпеченный пирожок', imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&q=80' },
  { name: 'Ватрушка с творогом',   category: 'bread',   price: 40,  calories: 280, weight: 130, description: 'Ватрушка с нежным творожным кремом', imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80' },
  { name: 'Кисель ягодный',        category: 'dessert', price: 30,  calories: 140, weight: 250, description: 'Густой кисель из ягод', imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80' },
  { name: 'Творожная запеканка',   category: 'dessert', price: 65,  calories: 310, weight: 200, description: 'Нежная запеканка со сметаной', imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&q=80' },
];

async function seed() {
  console.log('Seeding menu items...');
  for (const item of MENU_ITEMS) {
    await addDoc(collection(db, 'menuItems'), {
      ...item,
      nameLower: item.name.toLowerCase(),
      available: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`Added: ${item.name}`);
  }
  console.log('Done! Reload the page.');
}

seed();
