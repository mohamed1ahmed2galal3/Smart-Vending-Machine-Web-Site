/**
 * SmartVend Confirmation Module
 * Handles order confirmation and pickup code display
 */

const Confirmation = {
  orderData: null,
  
  /**
   * Initialize confirmation page
   */
  async init() {
    this.loadOrderData();
    this.displayConfirmation();
    this.startExpiryCountdown();
  },
  
  /**
   * Load order data from localStorage
   */
  loadOrderData() {
    try {
      const stored = localStorage.getItem('smartvend_order');
      if (stored) {
        this.orderData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading order data:', error);
    }
  },
  
  /**
   * Display confirmation details
   */
  displayConfirmation() {
    if (!this.orderData) {
      this.showNoOrder();
      return;
    }
    console.log(this.orderData);
    // Display pickup code
    const pickupCodeEl = document.getElementById('pickup-code');
    if (pickupCodeEl && this.orderData.pickupCode) {
      // Display each digit in a separate box
      const digits = this.orderData.pickupCode.split('');
      let html = '';
      digits.forEach(digit => {
        html += `<span class="inline-flex items-center justify-center size-14 sm:size-16 bg-primary text-text-main text-2xl sm:text-3xl font-black rounded-xl">${digit}</span>`;
      });
      pickupCodeEl.innerHTML = html;
    }
    
    // Display order number
    const orderNumberEl = document.getElementById('order-number');
    if (orderNumberEl) {
      orderNumberEl.textContent = this.orderData.orderNumber || this.orderData.orderId;
    }
    
    // Display total
    const totalEl = document.getElementById('order-total');
    if (totalEl) {
      totalEl.textContent = `EGP ${this.orderData.total?.toFixed(2) || '0.00'}`;
    }
    
    // Display items
    const itemsContainer = document.getElementById('order-items');
    if (itemsContainer && this.orderData.items) {
      let html = '';
      this.orderData.items.forEach(item => {
        // Order items use productName/unitPrice, cart items use product.name/product.price
        const name = item.productName || item.product?.name || item.name || 'Unknown Item';
        const price = item.unitPrice || item.product?.price || item.price || 0;
        const subtotal = item.subtotal || (price * item.quantity);
        html += `
          <div class="flex items-center gap-3 py-2">
            <span class="text-primary font-bold">${item.quantity}x</span>
            <span class="text-text-main dark:text-white">${name}</span>
            <span class="ml-auto text-text-secondary">EGP ${subtotal.toFixed(2)}</span>
          </div>
        `;
      });
      itemsContainer.innerHTML = html;
    }
    
    // Clear stored order data after displaying (user has seen it)
    // Keep it for a while in case they refresh
    setTimeout(() => {
      localStorage.removeItem('smartvend_order');
    }, 300000); // Clear after 5 minutes
  },
  
  /**
   * Show no order message
   */
  showNoOrder() {
    const container = document.getElementById('confirmation-content');
    if (container) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <span class="material-symbols-outlined text-[64px] text-text-secondary mb-4">receipt_long</span>
          <h3 class="text-xl font-bold text-text-main dark:text-white mb-2">No order found</h3>
          <p class="text-text-secondary mb-6">It looks like you haven't placed an order yet.</p>
          <a href="selectproduct.html" class="bg-primary hover:bg-[#25d360] text-text-main font-bold py-3 px-6 rounded-lg transition-colors">
            Start Shopping
          </a>
        </div>
      `;
    }
  },
  
  /**
   * Start countdown timer for pickup code expiry
   */
  startExpiryCountdown() {
    if (!this.orderData) return;
    
    const expiryEl = document.getElementById('code-expiry');
    if (!expiryEl) return;
    
    // Pickup code expires in 15 minutes
    let timeLeft = 15 * 60; // 15 minutes in seconds
    
    const updateTimer = () => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      
      expiryEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        expiryEl.textContent = 'Expired';
        expiryEl.classList.add('text-red-500');
        clearInterval(timer);
      } else if (timeLeft <= 60) {
        expiryEl.classList.add('text-red-500');
      } else if (timeLeft <= 180) {
        expiryEl.classList.add('text-yellow-500');
      }
      
      timeLeft--;
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
  },
  
  /**
   * Copy pickup code to clipboard
   */
  copyCode() {
    if (!this.orderData?.pickupCode) return;
    
    navigator.clipboard.writeText(this.orderData.pickupCode).then(() => {
      const btn = document.getElementById('copy-code-btn');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span> Copied!';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  },
  
  /**
   * Check order status
   */
  async checkStatus() {
    if (!this.orderData?.orderId) return;
    
    try {
      const response = await API.Orders.getStatus(this.orderData.orderId);
      if (response.success) {
        const statusEl = document.getElementById('order-status');
        if (statusEl) {
          const status = response.data.status;
          const statusText = {
            'pending': 'Pending',
            'paid': 'Paid - Ready for Pickup',
            'processing': 'Processing',
            'ready': 'Ready for Pickup',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
          };
          statusEl.textContent = statusText[status] || status;
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  }
};

// Make Confirmation available globally
window.Confirmation = Confirmation;
