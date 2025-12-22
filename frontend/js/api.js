/**
 * SmartVend API Service
 * Handles all communication with the backend
 */
const API = {
  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
      'X-Machine-ID': getMachineId(),
      ...options.headers
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      // Update session ID if server provides one
      const newSessionId = response.headers.get('X-Session-ID');
      if (newSessionId) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, newSessionId);
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // ==================== Products ====================
  Products: {
    async getAll(params = {}) {
      const queryParams = new URLSearchParams({
        machineId: getMachineId(),
        ...params
      });
      return API.request(`/products?${queryParams}`);
    },
    
    async getById(productId) {
      return API.request(`/products/${productId}`);
    },
    
    async getByCategory(categoryId) {
      const queryParams = new URLSearchParams({
        machineId: getMachineId()
      });
      return API.request(`/products/category/${categoryId}?${queryParams}`);
    },
    
    async checkAvailability(productId) {
      return API.request(`/products/${productId}/availability`);
    }
  },
  
  // ==================== Categories ====================
  Categories: {
    async getAll() {
      return API.request('/categories');
    },
    
    async getById(categoryId) {
      return API.request(`/categories/${categoryId}`);
    }
  },
  
  // ==================== Cart ====================
  Cart: {
    async get() {
      const queryParams = new URLSearchParams({
        machineId: getMachineId()
      });
      return API.request(`/cart?${queryParams}`);
    },
    
    async addItem(productId, quantity = 1) {
      return API.request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity,
          machineId: getMachineId()
        })
      });
    },
    
    async updateItem(productId, quantity) {
      return API.request(`/cart/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
    },
    
    async removeItem(productId) {
      return API.request(`/cart/items/${productId}`, {
        method: 'DELETE'
      });
    },
    
    async clear() {
      return API.request('/cart', {
        method: 'DELETE'
      });
    }
  },
  
  // ==================== Orders ====================
  Orders: {
    async create(paymentMethod = 'card') {
      return API.request('/orders', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: getSessionId(),
          machineId: getMachineId(),
          paymentMethod
        })
      });
    },
    
    async getById(orderId) {
      return API.request(`/orders/${orderId}`);
    },
    
    async getByNumber(orderNumber) {
      return API.request(`/orders/number/${orderNumber}`);
    },
    
    async getMultiple(orderIds) {
      return API.request('/orders/multiple', {
        method: 'POST',
        body: JSON.stringify({ orderIds })
      });
    },
    
    async getStatus(orderId) {
      return API.request(`/orders/${orderId}/status`);
    },
    
    async cancel(orderId) {
      return API.request(`/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
    },
    
    async regenerateCode(orderId) {
      return API.request(`/orders/${orderId}/regenerate-code`, {
        method: 'POST'
      });
    }
  },
  
  // ==================== Payments ====================
  Payments: {
    async createIntent(orderId, paymentMethod = 'card') {
      return API.request('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          paymentMethod
        })
      });
    },
    
    async process(orderId, paymentDetails = {}) {
      return API.request('/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          ...paymentDetails
        })
      });
    },
    
    async getStatus(orderId) {
      return API.request(`/payments/${orderId}/status`);
    }
  },
  
  // ==================== Machine ====================
  Machine: {
    async getInfo() {
      return API.request(`/machine/${getMachineId()}`);
    },
    
    async getStatus() {
      return API.request(`/machine/${getMachineId()}/status`);
    },
    
    async getInventory() {
      return API.request(`/machine/${getMachineId()}/inventory`);
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
