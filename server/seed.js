// Run once:  npm run seed
// Replaces the menu collection with the default items.
require("dotenv").config();
const mongoose = require("mongoose");
const MenuItem = require("./models/MenuItem");

const items = [
  { name: "Classic Veg Burger", price: 80, category: "Snacks", emoji: "🍔" },
  { name: "Margherita Pizza", price: 120, category: "Meals", emoji: "🍕" },
  { name: "Veg Sandwich", price: 60, category: "Snacks", emoji: "🥪" },
  { name: "Masala Dosa", price: 70, category: "Meals", emoji: "🥞" },
  { name: "French Fries", price: 55, category: "Snacks", emoji: "🍟" },
  { name: "Fresh Lime Soda", price: 35, category: "Drinks", emoji: "🥤" },
  { name: "Veg Fried Rice", price: 95, category: "Meals", emoji: "🍚" },
  { name: "Cold Coffee", price: 65, category: "Drinks", emoji: "🧋" },
  { name: "Fruit Bowl", price: 50, category: "Snacks", emoji: "🍉" }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(items);
    console.log(`Seeded ${items.length} menu items`);
  } catch (e) {
    console.error("Seed failed:", e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();