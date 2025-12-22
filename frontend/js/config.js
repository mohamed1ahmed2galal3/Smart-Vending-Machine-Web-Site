/**
 * SmartVend Frontend Configuration
 */
const CONFIG = {
  // API Base URL - change this for production
  API_BASE_URL: 'http://localhost:5000/api/v1',
  
  // Default machine ID (can be overridden by URL parameter)
  DEFAULT_MACHINE_ID: 'VM-4029',
  
  // Tax rate (should match backend)
  TAX_RATE: 0,
  
  // Session storage keys
  STORAGE_KEYS: {
    SESSION_ID: 'smartvend_session_id',
    MACHINE_ID: 'smartvend_machine_id',
    CART: 'smartvend_cart',
    CURRENT_ORDER: 'smartvend_current_order'
  },
  
  // Pickup code expiry (24 hours in ms)
  PICKUP_CODE_EXPIRY: 24 * 60 * 60 * 1000
};

/**
 * Get machine ID from URL or storage
 */
function getMachineId() {
  // Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const urlMachineId = urlParams.get('machineId') || urlParams.get('machine');
  
  if (urlMachineId) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MACHINE_ID, urlMachineId);
    return urlMachineId;
  }
  
  // Check localStorage
  const storedMachineId = localStorage.getItem(CONFIG.STORAGE_KEYS.MACHINE_ID);
  if (storedMachineId) {
    return storedMachineId;
  }
  
  // Use default
  localStorage.setItem(CONFIG.STORAGE_KEYS.MACHINE_ID, CONFIG.DEFAULT_MACHINE_ID);
  return CONFIG.DEFAULT_MACHINE_ID;
}

/**
 * Get or generate session ID
 */
function getSessionId() {
  let sessionId = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);
  
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 18);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
  }
  
  return sessionId;
}

/**
 * Format price to currency string (Egyptian Pounds)
 */
function formatPrice(price) {
  return 'EGP ' + parseFloat(price).toFixed(2);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg z-[100] flex items-center gap-2 transform transition-all duration-300 ${
    type === 'success' ? 'bg-primary text-black' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-gray-800 text-white'
  }`;
  
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-xl">${icon}</span>
    <span class="font-medium">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('translate-y-0', 'opacity-100'), 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show loading spinner
 */
function showLoading(element) {
  if (!element) return;
  element.dataset.originalContent = element.innerHTML;
  element.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span>';
  element.disabled = true;
}

/**
 * Hide loading spinner
 */
function hideLoading(element) {
  if (!element || !element.dataset.originalContent) return;
  element.innerHTML = element.dataset.originalContent;
  element.disabled = false;
  delete element.dataset.originalContent;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Ensure machine ID and session ID are set
  getMachineId();
  getSessionId();
});
