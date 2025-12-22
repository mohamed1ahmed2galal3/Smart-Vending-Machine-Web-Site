const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('colors');

// Load env vars
dotenv.config();

// Load models
const Category = require('../models/Category');
const Product = require('../models/Product');
const Machine = require('../models/Machine');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

// Load data
const categoriesData = require('./data/categories');
const productsData = require('./data/products');
const machinesData = require('./data/machines');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartvend');

// Import data into DB
const importData = async () => {
  try {
    console.log('Importing data...'.yellow);

    // Clear existing data
    await Category.deleteMany();
    await Product.deleteMany();
    await Machine.deleteMany();
    await Cart.deleteMany();
    await Order.deleteMany();
    await Payment.deleteMany();

    console.log('Cleared existing data'.gray);

    // Create categories
    const categories = await Category.insertMany(categoriesData);
    console.log(`Created ${categories.length} categories`.green);

    // Create category slug to ID map
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });

    // Create products with category IDs
    const machineId = machinesData[0].machineId;
    const productsWithCategories = productsData.map(product => ({
      ...product,
      category: categoryMap[product.categorySlug],
      machineId
    }));

    // Remove categorySlug field
    productsWithCategories.forEach(p => delete p.categorySlug);

    const products = await Product.insertMany(productsWithCategories);
    console.log(`Created ${products.length} products`.green);

    // Create machine with slots
    const slots = products.map(product => ({
      position: product.slotPosition,
      product: product._id,
      stock: product.stock,
      maxCapacity: 15,
      isOperational: true
    }));

    const machineData = {
      ...machinesData[0],
      slots
    };

    const machine = await Machine.create(machineData);
    console.log(`Created machine: ${machine.machineId}`.green);

    console.log('\n✅ Data imported successfully!'.green.bold);
    console.log(`
Summary:
- Categories: ${categories.length}
- Products: ${products.length}
- Machines: 1

Machine ID: ${machine.machineId}
    `.cyan);

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red);
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    console.log('Destroying data...'.yellow);

    await Category.deleteMany();
    await Product.deleteMany();
    await Machine.deleteMany();
    await Cart.deleteMany();
    await Order.deleteMany();
    await Payment.deleteMany();

    console.log('\n🗑️  All data destroyed!'.red.bold);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red);
    process.exit(1);
  }
};

// Check command line args
if (process.argv[2] === '-d' || process.argv[2] === '--destroy') {
  deleteData();
} else {
  importData();
}
