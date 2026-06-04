/**
 * SmartVend Checkout Module
 * Creates a pending wallet-transfer order and waits for SMS reconciliation.
 */

const Checkout = {
  orderData: null,
  pollTimer: null,

  async init() {
    await Cart.init();
    this.loadOrderSummary();
    this.setupPaymentForm();
    this.updateTransferInstructions();
  },

  getSelectedProvider() {
    const radioProvider = document.querySelector('input[name="payment_provider"]:checked')?.value;
    const selectProvider = document.getElementById('wallet-provider')?.value;
    return radioProvider || selectProvider || 'vodafone_cash';
  },

  getProviderLabel(provider) {
    return {
      vodafone_cash: 'Vodafone Cash',
      etisalat_cash: 'Etisalat Cash',
      instapay: 'Instapay'
    }[provider] || provider;
  },

  loadOrderSummary() {
    const items = Cart.items;
    const totals = Cart.calculateTotals();

    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');
    const itemCountEl = document.getElementById('checkout-item-count');
    const payAmountEl = document.getElementById('pay-amount');

    if (subtotalEl) subtotalEl.textContent = `EGP ${totals.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `EGP ${totals.tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `EGP ${totals.total.toFixed(2)}`;
    if (itemCountEl) itemCountEl.textContent = `${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''}`;
    if (payAmountEl) payAmountEl.textContent = `EGP ${totals.total.toFixed(2)}`;

    const itemsContainer = document.getElementById('checkout-items');
    if (itemsContainer && items.length > 0) {
      itemsContainer.innerHTML = items.map(item => {
        const product = item.product || item;
        const price = product.price || 0;
        const quantity = item.quantity || 1;

        return `
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
      }).join('');
    }

    if (items.length === 0) {
      this.showEmptyCart();
    }
  },

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

  setupPaymentForm() {
    const form = document.getElementById('payment-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createWalletOrder();
    });

    document.querySelectorAll('input[name="payment_provider"]').forEach(input => {
      input.addEventListener('change', () => {
        const providerSelect = document.getElementById('wallet-provider');
        if (providerSelect) providerSelect.value = input.value;
        this.updateTransferInstructions();
      });
    });

    const providerSelect = document.getElementById('wallet-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        const matchingRadio = document.querySelector(`input[name="payment_provider"][value="${providerSelect.value}"]`);
        if (matchingRadio) matchingRadio.checked = true;
        this.updateTransferInstructions();
      });
      providerSelect.value = this.getSelectedProvider();
    }
  },

  updateTransferInstructions() {
    const provider = this.getSelectedProvider();
    const label = this.getProviderLabel(provider);
    const totals = Cart.calculateTotals();
    const instructions = document.getElementById('transfer-instructions');

    if (instructions) {
      instructions.innerHTML = `
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined text-primary">payments</span>
          <div>
            <p class="font-bold text-gray-900 dark:text-white">Transfer EGP ${totals.total.toFixed(2)} using ${label}.</p>
            <p class="mt-1 text-gray-600 dark:text-gray-300">Use the same sender mobile number below so the API can match the incoming SMS to this order.</p>
          </div>
        </div>
      `;
    }
  },

  validateForm() {
    const errors = [];
    const phone = document.getElementById('wallet-phone')?.value;

    if (!this.getSelectedProvider()) {
      errors.push('Please select a transfer provider');
    }

    if (!phone || !/^(\+?2)?0?1\d{9}$/.test(phone.replace(/\s/g, ''))) {
      errors.push('Please enter a valid Egyptian mobile number');
    }

    if (Cart.itemCount === 0) {
      errors.push('Your cart is empty');
    }

    return errors;
  },

  async createWalletOrder() {
    const errors = this.validateForm();
    if (errors.length > 0) {
      this.showError(errors.join('<br>'));
      return;
    }

    const submitBtn = document.getElementById('submit-payment');
    const originalText = submitBtn?.innerHTML;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span> Creating order...';
    }

    try {
      const provider = this.getSelectedProvider();
      const phone = document.getElementById('wallet-phone')?.value.trim();
      const name = document.getElementById('wallet-name')?.value.trim();

      const orderResponse = await API.Orders.create({
        paymentMethod: provider,
        paymentProvider: provider,
        payerPhone: phone,
        customerPhone: phone,
        customerName: name
      });

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const order = orderResponse.data;
      this.orderData = order;
      this.addToOrderHistory(order._id);
      localStorage.setItem('smartvend_pending_order', JSON.stringify({
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        provider,
        phone
      }));

      this.showWaiting(order);
      this.startPolling(order._id);
    } catch (error) {
      console.error('Checkout error:', error);
      this.showError(error.message || 'Could not create order. Please try again.');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  },

  showWaiting(order) {
    this.hideError();

    const statusDiv = document.getElementById('payment-status');
    if (statusDiv) {
      const deadline = order.paymentDeadlineAt ? new Date(order.paymentDeadlineAt) : null;
      statusDiv.innerHTML = `
        <div class="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-blue-500 animate-spin">sync</span>
            <div>
              <p class="font-bold text-blue-800 dark:text-blue-300">Waiting for transfer confirmation</p>
              <p class="mt-1 text-sm text-blue-700 dark:text-blue-200">Order #${order.orderNumber} is open. Keep this page open or check My Orders later.</p>
              ${deadline ? `<p class="mt-1 text-xs text-blue-600 dark:text-blue-300">Payment deadline: ${deadline.toLocaleTimeString('en-EG')}</p>` : ''}
            </div>
          </div>
        </div>
      `;
      statusDiv.classList.remove('hidden');
    }

    const submitBtn = document.getElementById('submit-payment');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span> Waiting for SMS...';
    }
  },

  startPolling(orderId) {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollOrderStatus(orderId);
    this.pollTimer = setInterval(() => this.pollOrderStatus(orderId), 3000);
  },

  async pollOrderStatus(orderId) {
    try {
      const response = await API.Orders.getStatus(orderId);
      if (!response.success) return;

      const orderStatus = response.data;
      this.updateWaitingStatus(orderStatus);

      if (orderStatus.status === 'ready_to_dispense' && orderStatus.pickupCode) {
        clearInterval(this.pollTimer);
        localStorage.setItem('smartvend_order', JSON.stringify({
          orderId,
          orderNumber: orderStatus.orderNumber,
          pickupCode: orderStatus.pickupCode,
          pickupCodeExpiresAt: orderStatus.pickupCodeExpiresAt,
          total: orderStatus.total,
          amountPaid: orderStatus.amountPaid,
          balanceApplied: orderStatus.balanceApplied,
          balanceCredited: orderStatus.balanceCredited
        }));
        await Cart.clear();
        window.location.href = 'confirmationpage.html';
      } else if (['cancelled', 'declined'].includes(orderStatus.status)) {
        clearInterval(this.pollTimer);
        this.showTerminalStatus(orderStatus);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  },

  updateWaitingStatus(orderStatus) {
    const statusDiv = document.getElementById('payment-status');
    if (!statusDiv || !orderStatus.message) return;

    const messageEl = statusDiv.querySelector('p.mt-1.text-sm');
    if (messageEl) {
      messageEl.textContent = orderStatus.message;
    }
  },

  showTerminalStatus(orderStatus) {
    const statusDiv = document.getElementById('payment-status');
    if (statusDiv) {
      const isDeclined = orderStatus.status === 'declined';
      statusDiv.innerHTML = `
        <div class="rounded-lg border ${isDeclined ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800'} p-4">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined ${isDeclined ? 'text-red-500' : 'text-gray-500'}">${isDeclined ? 'error' : 'schedule'}</span>
            <div>
              <p class="font-bold ${isDeclined ? 'text-red-800 dark:text-red-300' : 'text-gray-800 dark:text-gray-300'}">${isDeclined ? 'Order declined' : 'Order cancelled'}</p>
              <p class="mt-1 text-sm ${isDeclined ? 'text-red-700 dark:text-red-200' : 'text-gray-700 dark:text-gray-200'}">${orderStatus.message}</p>
            </div>
          </div>
        </div>
      `;
    }
  },

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

  hideError() {
    const errorDiv = document.getElementById('payment-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  },

  addToOrderHistory(orderId) {
    try {
      const stored = localStorage.getItem('smartvend_order_history');
      let orderIds = stored ? JSON.parse(stored) : [];

      if (!orderIds.includes(orderId)) {
        orderIds.unshift(orderId);
      }

      orderIds = orderIds.slice(0, 50);
      localStorage.setItem('smartvend_order_history', JSON.stringify(orderIds));
    } catch (e) {
      console.error('Failed to save order to history:', e);
    }
  }
};

window.Checkout = Checkout;
