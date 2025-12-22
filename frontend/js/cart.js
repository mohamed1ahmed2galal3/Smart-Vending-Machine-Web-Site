/**
 * SmartVend Cart Manager
 * Handles cart state and UI updates
 */
const Cart = {
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  
  /**
   * Calculate and return totals (for backward compatibility)
   */
  calculateTotals() {
    return {
      subtotal: this.subtotal,
      tax: this.tax,
      total: this.total,
      itemCount: this.itemCount
    };
  },
  
  /**
   * Initialize cart - load from API or localStorage
   */
  async init() {
    // First load from localStorage for quick display
    this.loadFromStorage();
    this.updateAllCartUI();
    
    try {
      const response = await API.Cart.get();
      if (response.success) {
        this.updateFromResponse(response.data);
        this.updateAllCartUI();
      }
      return response.data;
    } catch (error) {
      console.log('Using cached cart data:', error.message);
      return null;
    }
  },
  
  /**
   * Update cart state from API response
   */
  updateFromResponse(data) {
    if (!data) return;
    this.items = data.items || [];
    this.subtotal = data.subtotal || 0;
    this.tax = data.tax || 0;
    this.total = data.total || 0;
    this.itemCount = data.itemCount || 0;
    
    // Store in localStorage for persistence
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify({
      items: this.items,
      subtotal: this.subtotal,
      tax: this.tax,
      total: this.total,
      itemCount: this.itemCount
    }));
  },
  
  /**
   * Load cart from localStorage (for quick display before API responds)
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
      if (stored) {
        const data = JSON.parse(stored);
        this.items = data.items || [];
        this.subtotal = data.subtotal || 0;
        this.tax = data.tax || 0;
        this.total = data.total || 0;
        this.itemCount = data.itemCount || 0;
      }
    } catch (e) {
      console.log('Could not load cart from storage');
    }
  },
  
  /**
   * Add item to cart
   */
  async addItem(productId, quantity = 1) {
    try {
      const response = await API.Cart.addItem(productId, quantity);
      if (response.success) {
        this.updateFromResponse(response.data.cart);
        this.updateAllCartUI();
        showToast(`${response.data.addedItem?.name || 'Item'} added to cart`);
      }
      return response;
    } catch (error) {
      showToast(error.message || 'Failed to add item', 'error');
      throw error;
    }
  },
  
  /**
   * Update item quantity
   */
  async updateItem(productId, quantity) {
    try {
      const response = await API.Cart.updateItem(productId, quantity);
      if (response.success) {
        this.updateFromResponse(response.data);
        this.updateAllCartUI();
      }
      return response;
    } catch (error) {
      showToast(error.message || 'Failed to update item', 'error');
      throw error;
    }
  },
  
  /**
   * Remove item from cart
   */
  async removeItem(productId) {
    try {
      const response = await API.Cart.removeItem(productId);
      if (response.success) {
        this.updateFromResponse(response.data);
        this.updateAllCartUI();
        showToast('Item removed from cart');
      }
      return response;
    } catch (error) {
      showToast(error.message || 'Failed to remove item', 'error');
      throw error;
    }
  },
  
  /**
   * Clear entire cart
   */
  async clear() {
    try {
      await API.Cart.clear();
      this.items = [];
      this.subtotal = 0;
      this.tax = 0;
      this.total = 0;
      this.itemCount = 0;
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
      this.updateAllCartUI();
      return true;
    } catch (error) {
      console.log('Could not clear cart on server:', error.message);
      // Clear locally anyway
      this.items = [];
      this.subtotal = 0;
      this.tax = 0;
      this.total = 0;
      this.itemCount = 0;
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
      this.updateAllCartUI();
      return true;
    }
  },
  
  /**
   * Get quantity of specific product in cart
   */
  getItemQuantity(productId) {
    const item = this.items.find(i => 
      (i.product._id === productId) || (i.product === productId)
    );
    return item ? item.quantity : 0;
  },
  
  /**
   * Check if product is in cart
   */
  hasItem(productId) {
    return this.getItemQuantity(productId) > 0;
  },
  
  /**
   * Update all cart UI elements on the page
   */
  updateAllCartUI() {
    // Update cart count badges
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = this.itemCount;
      el.style.display = this.itemCount > 0 ? 'flex' : 'none';
    });
    
    // Update cart total displays
    document.querySelectorAll('[data-cart-total]').forEach(el => {
      el.textContent = formatPrice(this.total);
    });
    
    // Update subtotal displays
    document.querySelectorAll('[data-cart-subtotal]').forEach(el => {
      el.textContent = formatPrice(this.subtotal);
    });
    
    // Update tax displays
    document.querySelectorAll('[data-cart-tax]').forEach(el => {
      el.textContent = formatPrice(this.tax);
    });
    
    // Update item count text
    document.querySelectorAll('[data-cart-item-count]').forEach(el => {
      el.textContent = `${this.itemCount} item${this.itemCount !== 1 ? 's' : ''}`;
    });
    
    // Show/hide checkout button based on cart
    document.querySelectorAll('[data-checkout-btn]').forEach(el => {
      el.style.display = this.itemCount > 0 ? 'flex' : 'none';
    });
    
    // Trigger custom event for additional UI updates
    document.dispatchEvent(new CustomEvent('cartUpdated', { detail: this }));
  }
};

// Initialize cart from localStorage immediately for fast UI
Cart.loadFromStorage();
Cart.updateAllCartUI();
