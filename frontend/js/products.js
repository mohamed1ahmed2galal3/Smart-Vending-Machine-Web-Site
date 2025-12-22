/**
 * SmartVend Products Module
 * Handles product listing, filtering, and display
 */

const Products = {
  products: [],
  categories: [],
  currentCategory: 'all',
  
  /**
   * Initialize products page
   */
  async init() {
    await Cart.init();
    await this.loadCategories();
    await this.loadProducts();
    this.setupEventListeners();
  },
  
  /**
   * Load all categories from API
   */
  async loadCategories() {
    try {
      const response = await API.Categories.getAll();
      if (response.success) {
        this.categories = response.data;
        console.log(this.categories);
        this.renderCategoryTabs();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.showError('Failed to load categories');
    }
  },
  
  /**
   * Load products from API
   * @param {string} categorySlug - Category slug (e.g., 'cold-drinks') or 'all'
   */
  async loadProducts(categorySlug = null) {
    const grid = document.getElementById('products-grid');
    const loading = document.getElementById('products-loading');
    
    if (loading) loading.style.display = 'flex';
    if (grid) grid.innerHTML = '';
    
    try {
      let response;
      if (categorySlug && categorySlug !== 'all') {
        response = await API.Products.getByCategory(categorySlug);
      } else {
        response = await API.Products.getAll();
      }
      
      if (response.success) {
        this.products = response.data;
        this.renderProducts();
      }
    } catch (error) {
      console.error('Error loading products:', error);
      this.showError('Failed to load products');
    } finally {
      if (loading) loading.style.display = 'none';
    }
  },
  
  /**
   * Render category tabs
   */
  renderCategoryTabs() {
    const container = document.getElementById('category-tabs');
    const sidebar = document.getElementById('sidebar-categories');
    
    const icons = {
      'Cold Drinks': 'local_drink',
      'Hot Drinks': 'coffee',
      'Snacks': 'cookie',
      'Candy': 'cake',
      'Healthy Options': 'eco',
      'Fresh Food': 'restaurant'
    };
    
    // Render sidebar categories if exists
    if (sidebar) {
      let sidebarHtml = `
        <a class="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/20 text-text-main dark:text-white font-medium border border-primary/20 cursor-pointer" data-category="all" data-slug="all">
          <span class="material-symbols-outlined icon-filled text-primary-dark">grid_view</span>
          All Items
        </a>
      `;
      
      this.categories.forEach(cat => {
        const icon = icons[cat.name] || 'category';
        sidebarHtml += `
          <a class="flex items-center gap-3 px-4 py-3 rounded-lg text-text-main dark:text-gray-300 hover:bg-[#e7f3eb] dark:hover:bg-card-dark transition-colors cursor-pointer" data-category="${cat._id}" data-slug="${cat.slug}">
            <span class="material-symbols-outlined">${icon}</span>
            ${cat.name}
          </a>
        `;
      });
      
      sidebar.innerHTML = sidebarHtml;
      
      // Add click handlers for sidebar
      sidebar.querySelectorAll('[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
          sidebar.querySelectorAll('[data-category]').forEach(l => {
            l.classList.remove('bg-primary/20', 'font-medium', 'border', 'border-primary/20');
            l.classList.add('hover:bg-[#e7f3eb]', 'dark:hover:bg-card-dark');
          });
          e.currentTarget.classList.add('bg-primary/20', 'font-medium', 'border', 'border-primary/20');
          e.currentTarget.classList.remove('hover:bg-[#e7f3eb]', 'dark:hover:bg-card-dark');
          const categorySlug = e.currentTarget.dataset.slug;
          this.currentCategory = categorySlug;
          this.loadProducts(categorySlug);
        });
      });
    }
    
    // Render horizontal tabs if container exists
    if (container) {
      let html = `
        <button class="category-tab active" data-category="all" data-slug="all">
          <span class="material-symbols-outlined text-[20px]">grid_view</span>
          All Items
        </button>
      `;
      
      this.categories.forEach(cat => {
        const icon = icons[cat.name] || 'category';
        html += `
          <button class="category-tab" data-category="${cat._id}" data-slug="${cat.slug}">
            <span class="material-symbols-outlined text-[20px]">${icon}</span>
            ${cat.name}
          </button>
        `;
      });
      
      container.innerHTML = html;
      
      // Add click handlers
      container.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const categorySlug = e.currentTarget.dataset.slug;
          this.currentCategory = categorySlug;
          this.loadProducts(categorySlug);
        });
      });
    }
  },
  
  /**
   * Render products grid
   */
  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    if (this.products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 text-gray-500">
          <span class="material-symbols-outlined text-[64px] mb-4">inventory_2</span>
          <p class="text-lg font-medium">No products available</p>
          <p class="text-sm">Check back later for new items</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    this.products.forEach(product => {
      const inStock = product.stock > 0;
      const isLowStock = product.stock > 0 && product.stock <= 5;
      
      // Stock indicator
      let stockIndicator = '';
      if (!inStock) {
        stockIndicator = `<div class="text-xs font-medium text-red-500 flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          Out of Stock
        </div>`;
      } else if (isLowStock) {
        stockIndicator = `<div class="text-xs font-medium text-text-secondary flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
          ${product.stock} left
        </div>`;
      } else {
        stockIndicator = `<div class="text-xs font-medium text-text-secondary flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          In Stock
        </div>`;
      }
      
      // Card classes
      const cardClass = inStock 
        ? 'group bg-card-light dark:bg-card-dark rounded-xl border border-[#e7f3eb] dark:border-white/5 p-4 flex flex-col hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300'
        : 'group bg-card-light dark:bg-card-dark rounded-xl border border-[#e7f3eb] dark:border-white/5 p-4 flex flex-col opacity-60 relative';
      
      html += `
        <div class="${cardClass}" data-product-id="${product._id}">
          ${!inStock ? '<div class="absolute inset-0 z-10 flex items-center justify-center"><div class="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg">Sold Out</div></div>' : ''}
          <div class="relative aspect-square mb-4 bg-[#f8fcf9] dark:bg-black/20 rounded-lg flex items-center justify-center overflow-hidden ${!inStock ? 'grayscale' : ''}">
            <img 
              class="h-4/5 w-auto object-contain ${inStock ? 'group-hover:scale-110' : ''} transition-transform duration-300" 
              src="${product.image || 'https://via.placeholder.com/200x200'}" 
              alt="${product.name}"
              onerror="this.src='https://via.placeholder.com/200x200?text=No+Image'"
            />
          </div>
          <div class="flex flex-col flex-1 ${!inStock ? 'grayscale' : ''}">
            <div class="flex justify-between items-start mb-1">
              <h3 class="text-text-main dark:text-white font-bold text-lg leading-tight">${product.name}</h3>
              <span class="${inStock ? 'text-primary' : 'text-text-secondary'} font-black text-lg">$${product.price.toFixed(2)}</span>
            </div>
            <p class="text-text-secondary text-sm mb-4 line-clamp-1">${product.description || ''}</p>
            <div class="mt-auto flex items-center justify-between gap-3">
              ${stockIndicator}
              <button 
                class="flex-1 ${inStock ? 'bg-primary hover:bg-[#25d360]' : 'bg-gray-200 dark:bg-gray-700'} ${inStock ? 'text-text-main' : 'text-gray-500'} font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
                onclick="Products.addToCart('${product._id}')"
                ${!inStock ? 'disabled' : ''}
              >
                <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Add
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    grid.innerHTML = html;
  },
  
  /**
   * Add product to cart
   */
  async addToCart(productId) {
    const product = this.products.find(p => p._id === productId);
    if (!product) return;
    
    const button = document.querySelector(`[data-product-id="${productId}"] button`);
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>';
    }
    
    try {
      await Cart.addItem(productId, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="material-symbols-outlined text-[18px]">add_shopping_cart</span> Add';
      }
    }
  },
  
  /**
   * Show product details modal
   */
  showDetails(productId) {
    const product = this.products.find(p => p._id === productId);
    if (!product) return;
    
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    document.getElementById('modal-product-image').src = product.image || product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image';
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-description').textContent = product.description || 'No description available';
    document.getElementById('modal-product-price').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('modal-product-stock').textContent = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';
    document.getElementById('modal-product-stock').className = product.stock > 0 ? 'text-green-600' : 'text-red-500';
    
    // Nutrition info
    const nutritionContainer = document.getElementById('modal-nutrition');
    if (product.nutritionInfo) {
      nutritionContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>Calories: ${product.nutritionInfo.calories || 'N/A'}</div>
          <div>Sugar: ${product.nutritionInfo.sugar || 'N/A'}g</div>
          <div>Protein: ${product.nutritionInfo.protein || 'N/A'}g</div>
          <div>Fat: ${product.nutritionInfo.fat || 'N/A'}g</div>
        </div>
      `;
    } else {
      nutritionContainer.innerHTML = '<p class="text-sm text-gray-500">Nutrition info not available</p>';
    }
    
    // Add to cart button
    const addBtn = document.getElementById('modal-add-btn');
    addBtn.onclick = () => {
      this.addToCart(productId);
      this.closeModal();
    };
    addBtn.disabled = product.stock <= 0;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },
  
  /**
   * Close product modal
   */
  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close modal on backdrop click
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
    
    // Close modal on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.filterBySearch(e.target.value);
        }, 300);
      });
    }
  },
  
  /**
   * Filter products by search term
   */
  filterBySearch(term) {
    if (!term) {
      this.renderProducts();
      return;
    }
    
    const filtered = this.products.filter(p => 
      p.name.toLowerCase().includes(term.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(term.toLowerCase()))
    );
    
    const originalProducts = this.products;
    this.products = filtered;
    this.renderProducts();
    this.products = originalProducts;
  },
  
  /**
   * Show error message
   */
  showError(message) {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-16 text-red-500">
          <span class="material-symbols-outlined text-[64px] mb-4">error</span>
          <p class="text-lg font-medium">${message}</p>
          <button onclick="Products.loadProducts()" class="mt-4 px-4 py-2 bg-primary text-text-main rounded-lg font-semibold">
            Try Again
          </button>
        </div>
      `;
    }
  }
};

// Make Products available globally
window.Products = Products;
