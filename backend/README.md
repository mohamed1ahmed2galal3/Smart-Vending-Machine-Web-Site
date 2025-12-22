# SmartVend Backend API

Backend server for the SmartVend vending machine application. Built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Product Management** - Browse products, categories, check availability
- **Shopping Cart** - Session-based cart with automatic expiration
- **Order Processing** - Create orders, track status, 6-digit pickup codes
- **Payment Integration** - Stripe payment processing (with mock support for development)
- **Hardware Communication** - API endpoints for vending machine hardware
- **Rate Limiting** - Protect against abuse
- **Security** - Helmet, CORS, data sanitization

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js              # Database connection
├── controllers/
│   ├── productController.js
│   ├── categoryController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── paymentController.js
│   ├── machineController.js
│   └── hardwareController.js
├── middleware/
│   ├── errorHandler.js
│   ├── sessionHandler.js
│   ├── validateMachine.js
│   └── authenticateHardware.js
├── models/
│   ├── Product.js
│   ├── Category.js
│   ├── Cart.js
│   ├── Order.js
│   ├── Payment.js
│   ├── Machine.js
│   └── User.js
├── routes/
│   ├── productRoutes.js
│   ├── categoryRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── paymentRoutes.js
│   ├── machineRoutes.js
│   └── hardwareRoutes.js
├── seeds/
│   ├── data/
│   │   ├── categories.js
│   │   ├── products.js
│   │   └── machines.js
│   └── seeder.js
├── utils/
│   ├── asyncHandler.js
│   ├── errorResponse.js
│   └── generateCode.js
├── app.js
├── server.js
├── package.json
└── .env.example
```

## 🛠️ Installation

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/smartvend
   STRIPE_SECRET_KEY=sk_test_...
   HARDWARE_API_KEY=your_hardware_key
   ```

3. **Seed the database:**
   ```bash
   npm run seed
   ```

4. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Base URL: `/api/v1`

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products |
| GET | `/products/:productId` | Get single product |
| GET | `/products/category/:categorySlug` | Get products by category |
| GET | `/products/:productId/availability` | Check product availability |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | Get all categories |
| GET | `/categories/:id` | Get single category |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add item to cart |
| PUT | `/cart/items/:productId` | Update item quantity |
| DELETE | `/cart/items/:productId` | Remove item |
| DELETE | `/cart` | Clear cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create order |
| GET | `/orders/:orderId` | Get order by ID |
| GET | `/orders/number/:orderNumber` | Get order by number |
| GET | `/orders/:orderId/status` | Get order status |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-intent` | Create payment intent |
| POST | `/payments/process` | Process payment |
| GET | `/payments/:orderId/status` | Get payment status |

### Machine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/machine/:machineId` | Get machine info |
| GET | `/machine/:machineId/status` | Get machine status |
| GET | `/machine/:machineId/inventory` | Get machine inventory |

### Hardware (for vending machine)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hardware/verify-code` | Verify 6-digit pickup code |
| POST | `/hardware/dispense` | Trigger dispense |
| POST | `/hardware/dispense/status` | Update dispense status |
| POST | `/hardware/health` | Report machine health |
| PUT | `/hardware/inventory` | Update inventory |

## 🔄 Workflow

### User Flow (Frontend)
1. User scans QR code on machine → Opens website with machine ID
2. User browses products and adds to cart
3. User proceeds to checkout and pays
4. User receives 6-digit pickup code
5. User enters code on machine keypad
6. Machine dispenses items

### Hardware Flow
1. Hardware polls `/hardware/:machineId/pending-orders` or waits for keypad input
2. When user enters code, hardware calls `/hardware/verify-code`
3. If valid, hardware receives order details
4. Hardware calls `/hardware/dispense` to start dispensing
5. Hardware updates progress via `/hardware/dispense/status`
6. Stock is automatically updated after successful dispense

## 🔑 Session Management

- Sessions are identified by `X-Session-ID` header
- If not provided, server generates one and returns in response header
- Cart expires after 30 minutes of inactivity

## 🔒 Security Features

- **Helmet** - Secure HTTP headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - 100 requests/minute (general), 10/minute (payments)
- **Data Sanitization** - Prevent NoSQL injection
- **HPP** - Prevent HTTP parameter pollution

## 💳 Payment Testing

For development without Stripe:
- Leave `STRIPE_SECRET_KEY` empty
- System uses mock payment processing
- All payments auto-succeed

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/health

# Get products
curl http://localhost:5000/api/v1/products

# Get categories
curl http://localhost:5000/api/v1/categories
```

## 📝 Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm run seed     # Seed database with sample data
npm run seed:destroy  # Clear all data
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT
