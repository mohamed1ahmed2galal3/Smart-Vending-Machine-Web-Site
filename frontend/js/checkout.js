/**
 * SmartVend Checkout Module
 * Handles payment processing and order creation
 */

const Checkout = {
  orderData: null,
  
  /**
   * Initialize checkout page
   */
  async init() {
    await Cart.init();
    this.loadOrderSummary();
    this.setupPaymentForm();
  },

  getSelectedPaymentMethod() {
    return document.querySelector('input[name="payment_method"]:checked')?.value || 'card';
  },
  
  /**
   * Load order summary from cart
   */
  loadOrderSummary() {
    const items = Cart.items;
    const totals = Cart.calculateTotals();
    
    // Update summary display
    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');
    const itemCountEl = document.getElementById('checkout-item-count');
    
    if (subtotalEl) subtotalEl.textContent = `EGP ${totals.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `EGP ${totals.tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `EGP ${totals.total.toFixed(2)}`;
    if (itemCountEl) itemCountEl.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}`;
    
    // Render items list
    const itemsContainer = document.getElementById('checkout-items');
    if (itemsContainer && items.length > 0) {
      let html = '';
      items.forEach(item => {
        const product = item.product || item;
        const price = product.price || 0;
        const quantity = item.quantity || 1;
        
        html += `
          <div class="flex items-center gap-3 py-3 border-b border-[#e7f3eb] dark:border-white/10 last:border-0">
            <div class="size-12 rounded-lg bg-[#f8fcf9] dark:bg-black/20 flex items-center justify-center overflow-hidden">
              <img 
                src="${product.image || product.imageUrl || 'https://via.placeholder.com/48'}" 
                alt="${product.name}"
                class="w-full h-full object-cover"
                onerror="this.src='https://via.placeholder.com/48'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm text-text-main dark:text-white truncate">${product.name}</p>
              <p class="text-xs text-text-secondary">Qty: ${quantity}</p>
            </div>
            <span class="font-bold text-sm text-text-main dark:text-white">EGP ${(price * quantity).toFixed(2)}</span>
          </div>
        `;
      });
      itemsContainer.innerHTML = html;
    }
    
    // Check if cart is empty
    if (items.length === 0) {
      this.showEmptyCart();
    }
  },
  
  /**
   * Show empty cart message
   */
  showEmptyCart() {
    const form = document.getElementById('payment-form');
    if (form) {
      form.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <span class="material-symbols-outlined text-[64px] text-text-secondary mb-4">shopping_cart</span>
          <h3 class="text-xl font-bold text-text-main dark:text-white mb-2">Your cart is empty</h3>
          <p class="text-text-secondary mb-6">Add some items before checking out</p>
          <a href="selectproduct.html" class="bg-primary hover:bg-[#25d360] text-text-main font-bold py-3 px-6 rounded-lg transition-colors">
            Browse Products
          </a>
        </div>
      `;
    }
  },
  
  /**
   * Setup payment form handlers
   */
  setupPaymentForm() {
    const form = document.getElementById('payment-form');
    if (!form) return;
    
    // Format card number input
    const cardInput = document.getElementById('card-number');
    if (cardInput) {
      cardInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        value = value.substring(0, 16);
        const parts = value.match(/.{1,4}/g) || [];
        e.target.value = parts.join(' ');
      });
    }
    
    // Format expiry input
    const expiryInput = document.getElementById('card-expiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
          value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
      });
    }
    
    // Format CVV input
    const cvvInput = document.getElementById('card-cvv');
    if (cvvInput) {
      cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }
    
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.processPayment();
    });

    // Payment method toggle logic
    const pmRadios = document.querySelectorAll('input[name="payment_method"]');
    pmRadios.forEach(r => r.addEventListener('change', () => this.updatePaymentMethodUI()));

    // Initialize UI based on default selection
    this.updatePaymentMethodUI();
  },

  updatePaymentMethodUI() {
    const method = this.getSelectedPaymentMethod();
    const cardFields = document.getElementById('card-fields');
    const walletFields = document.getElementById('wallet-fields');

    if (cardFields && walletFields) {
      if (method === 'wallet') {
        cardFields.classList.add('hidden');
        // remove required attrs from card inputs
        document.getElementById('card-name').required = false;
        document.getElementById('card-number').required = false;
        document.getElementById('card-expiry').required = false;
        document.getElementById('card-cvv').required = false;

        walletFields.classList.remove('hidden');
        document.getElementById('wallet-name').required = true;
        document.getElementById('wallet-phone').required = true;
        document.getElementById('wallet-provider').required = true;
      } else {
        walletFields.classList.add('hidden');
        document.getElementById('wallet-name').required = false;
        document.getElementById('wallet-phone').required = false;
        document.getElementById('wallet-provider').required = false;

        cardFields.classList.remove('hidden');
        document.getElementById('card-name').required = true;
        document.getElementById('card-number').required = true;
        document.getElementById('card-expiry').required = true;
        document.getElementById('card-cvv').required = true;
      }
    }
  },
  
  /**
   * Validate payment form
   */
  validateForm() {
    const method = this.getSelectedPaymentMethod();
    const errors = [];

    if (method === 'card') {
      const cardNumber = document.getElementById('card-number')?.value.replace(/\s/g, '');
      const expiry = document.getElementById('card-expiry')?.value;
      const cvv = document.getElementById('card-cvv')?.value;
      const name = document.getElementById('card-name')?.value;

      if (!cardNumber || cardNumber.length < 13) {
        errors.push('Please enter a valid card number');
      }

      if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
        errors.push('Please enter a valid expiry date (MM/YY)');
      } else {
        const [month, year] = expiry.split('/');
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;

        if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
          errors.push('Card has expired');
        }
      }

      if (!cvv || cvv.length < 3) {
        errors.push('Please enter a valid CVV');
      }

      if (!name || name.trim().length < 2) {
        errors.push('Please enter the cardholder name');
      }
    } else if (method === 'wallet') {
      const wname = document.getElementById('wallet-name')?.value;
      const wphone = document.getElementById('wallet-phone')?.value;
      const wprov = document.getElementById('wallet-provider')?.value;

      if (!wname || wname.trim().length < 2) {
        errors.push('Please enter the wallet holder name');
      }

      if (!wphone || !/\d{7,15}/.test(wphone.replace(/\D/g, ''))) {
        errors.push('Please enter a valid phone number');
      }

      if (!wprov) {
        errors.push('Please select a wallet provider');
      }
    }
    return errors;
  },
  
  /**
   * Process payment
   */
  async processPayment() {
    const errors = this.validateForm();

    if (errors.length > 0) {
      this.showError(errors.join('<br>'));
      return;
    }
    
    const submitBtn = document.getElementById('submit-payment');
    const originalText = submitBtn?.innerHTML;
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span> Processing...';
    }
    
    try {
      // Create order first
      const orderResponse = await API.Orders.create();
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }
      
      const order = orderResponse.data;
      // Determine selected method and send appropriate payment payload
      const method = this.getSelectedPaymentMethod();
      let paymentPayload = { amount: order.total };

      if (method === 'card') {
        // minimal card details (simulated)
        paymentPayload.paymentMethodId = 'pm_card_visa';
        paymentPayload.card = {
          name: document.getElementById('card-name')?.value,
          number: document.getElementById('card-number')?.value.replace(/\s/g, ''),
          expiry: document.getElementById('card-expiry')?.value,
        };
        paymentPayload.method = 'card';
      } else if (method === 'wallet') {
        paymentPayload.method = 'wallet';
        paymentPayload.wallet = {
          name: document.getElementById('wallet-name')?.value,
          phone: document.getElementById('wallet-phone')?.value,
          provider: document.getElementById('wallet-provider')?.value,
        };
      }

      // Process payment (simulated)
      const paymentResponse = await API.Payments.process(order._id, paymentPayload);
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Payment failed');
      }
      
      // Store order info for confirmation page
      localStorage.setItem('smartvend_order', JSON.stringify({
        orderId: order._id,
        orderNumber: order.orderNumber,
        pickupCode: order.pickupCode,
        total: order.total,
        items: order.items
      }));
      
      // Store order ID in order history for "My Orders" page
      this.addToOrderHistory(order._id);
      
      // Clear cart
      await Cart.clear();
      
      // Redirect to confirmation page
      window.location.href = 'confirmationpage.html';
      
    } catch (error) {
      console.error('Payment error:', error);
      this.showError(error.message || 'Payment failed. Please try again.');
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  },
  
  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('payment-error');
    if (errorDiv) {
      errorDiv.innerHTML = `
        <div class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <span class="material-symbols-outlined text-red-500">error</span>
          <p class="text-sm text-red-700 dark:text-red-400">${message}</p>
        </div>
      `;
      errorDiv.classList.remove('hidden');
    }
  },
  
  /**
   * Hide error message
   */
  hideError() {
    const errorDiv = document.getElementById('payment-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  },
  
  /**
   * Add order to localStorage history
   */
  addToOrderHistory(orderId) {
    try {
      const stored = localStorage.getItem('smartvend_order_history');
      let orderIds = stored ? JSON.parse(stored) : [];
      
      // Add to beginning if not already present
      if (!orderIds.includes(orderId)) {
        orderIds.unshift(orderId);
      }
      
      // Keep only last 50 orders
      orderIds = orderIds.slice(0, 50);
      
      localStorage.setItem('smartvend_order_history', JSON.stringify(orderIds));
    } catch (e) {
      console.error('Failed to save order to history:', e);
    }
  }
};

// Make Checkout available globally
window.Checkout = Checkout;
