require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const dns = require('dns');

if (process.env.MONGO_URI && process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant_billing';

const seedUsers = [
  {
    name: 'Admin Manager',
    username: 'admin',
    email: 'admin@urbanplate.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Frontdesk Cashier',
    username: 'cashier',
    email: 'cashier@urbanplate.com',
    password: 'cashier123',
    role: 'cashier',
    isActive: true,
  },
];

const seedTables = Array.from({ length: 10 }, (_, i) => ({
  tableNumber: `T${i + 1}`,
  status: 'free',
}));

const seedMenuItems = [
  // 1. Starters
  { name: 'Paneer Tikka', category: 'Starters', price: 240, foodType: 'veg', isAvailable: true },
  { name: 'Crispy Corn & Peppers', category: 'Starters', price: 190, foodType: 'veg', isAvailable: true },
  { name: 'Veg Spring Rolls', category: 'Starters', price: 180, foodType: 'veg', isAvailable: true },
  { name: 'Murgh Malai Tikka', category: 'Starters', price: 310, foodType: 'non-veg', isAvailable: true },
  { name: 'Mutton Seekh Kebab', category: 'Starters', price: 360, foodType: 'non-veg', isAvailable: true },

  // 2. Main Course
  { name: 'Paneer Butter Masala', category: 'Main Course', price: 280, foodType: 'veg', isAvailable: true },
  { name: 'Dal Makhani Urban Special', category: 'Main Course', price: 230, foodType: 'veg', isAvailable: true },
  { name: 'Malai Kofta', category: 'Main Course', price: 270, foodType: 'veg', isAvailable: true },
  { name: 'Classic Butter Chicken', category: 'Main Course', price: 340, foodType: 'non-veg', isAvailable: true },
  { name: 'Kadai Murgh', category: 'Main Course', price: 320, foodType: 'non-veg', isAvailable: true },

  // 3. Breads
  { name: 'Butter Naan', category: 'Breads', price: 50, foodType: 'veg', isAvailable: true },
  { name: 'Garlic Butter Naan', category: 'Breads', price: 65, foodType: 'veg', isAvailable: true },
  { name: 'Tandoori Roti', category: 'Breads', price: 30, foodType: 'veg', isAvailable: true },
  { name: 'Laccha Paratha', category: 'Breads', price: 55, foodType: 'veg', isAvailable: true },
  { name: 'Cheese Garlic Naan', category: 'Breads', price: 90, foodType: 'veg', isAvailable: true },

  // 4. Biryani
  { name: 'Hyderabadi Chicken Dum Biryani', category: 'Biryani', price: 320, foodType: 'non-veg', isAvailable: true },
  { name: 'Lucknowi Mutton Biryani', category: 'Biryani', price: 420, foodType: 'non-veg', isAvailable: true },
  { name: 'Subz Dum Veg Biryani', category: 'Biryani', price: 240, foodType: 'veg', isAvailable: true },
  { name: 'Egg Dum Biryani', category: 'Biryani', price: 260, foodType: 'non-veg', isAvailable: true },

  // 5. Beverages
  { name: 'Fresh Lime Soda', category: 'Beverages', price: 80, foodType: 'veg', isAvailable: true },
  { name: 'Mango Lassi', category: 'Beverages', price: 110, foodType: 'veg', isAvailable: true },
  { name: 'Urban Masala Chai', category: 'Beverages', price: 50, foodType: 'veg', isAvailable: true },
  { name: 'Cold Coffee with Ice Cream', category: 'Beverages', price: 130, foodType: 'veg', isAvailable: true },
  { name: 'Packaged Mineral Water (1L)', category: 'Beverages', price: 30, foodType: 'veg', isAvailable: true },

  // 6. Desserts
  { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', price: 90, foodType: 'veg', isAvailable: true },
  { name: 'Kesari Rasmalai (2 pcs)', category: 'Desserts', price: 120, foodType: 'veg', isAvailable: true },
  { name: 'Sizzling Brownie with Ice Cream', category: 'Desserts', price: 190, foodType: 'veg', isAvailable: true },
  { name: 'Matka Kulfi', category: 'Desserts', price: 100, foodType: 'veg', isAvailable: true },
];

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB at', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] Connected successfully.');

    const isReset = process.argv.includes('--clean') || process.argv.includes('-d');
    if (isReset) {
      console.log('[Seeder] Reset flag detected: Cleaning all collections...');
      await Promise.all([
        User.deleteMany({}),
        MenuItem.deleteMany({}),
        Table.deleteMany({}),
        Order.deleteMany({}),
        Bill.deleteMany({}),
        Payment.deleteMany({}),
      ]);
      console.log('[Seeder] Cleaned existing collections.');
    }

    // 1. Seed Users (idempotent: upsert or check existence)
    for (const userData of seedUsers) {
      const existing = await User.findOne({
        $or: [{ username: userData.username }, { email: userData.email }],
      });
      if (!existing) {
        await User.create(userData);
        console.log(`[Seeder] Created user: ${userData.username} (${userData.role})`);
      } else {
        console.log(`[Seeder] User already exists: ${userData.username}`);
      }
    }

    // 2. Seed Tables (idempotent: T1–T10)
    for (const tableData of seedTables) {
      const existing = await Table.findOne({ tableNumber: tableData.tableNumber });
      if (!existing) {
        await Table.create(tableData);
        console.log(`[Seeder] Created table: ${tableData.tableNumber}`);
      } else {
        console.log(`[Seeder] Table already exists: ${tableData.tableNumber}`);
      }
    }

    // 3. Seed Menu Items (idempotent: check by item name)
    let addedItems = 0;
    for (const itemData of seedMenuItems) {
      const existing = await MenuItem.findOne({ name: itemData.name });
      if (!existing) {
        await MenuItem.create(itemData);
        addedItems++;
      }
    }
    console.log(`[Seeder] Menu items processed. ${addedItems} new items inserted.`);

    const totalUsers = await User.countDocuments();
    const totalTables = await Table.countDocuments();
    const totalMenuItems = await MenuItem.countDocuments();

    console.log('----------------------------------------------------');
    console.log(' Urban Plate Restaurant Database Seeding Complete!');
    console.log(` - Total Users: ${totalUsers}`);
    console.log(` - Total Tables: ${totalTables} (T1 - T10)`);
    console.log(` - Total Menu Items: ${totalMenuItems}`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
