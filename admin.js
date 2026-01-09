// Admin functionality for LAMITI SHOP
class AdminManager {
    constructor() {
        this.isAdmin = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAdminSession();
    }

    bindEvents() {
        // Login form submission
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        // Login button click
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        // Enter key in login form
        const usernameInput = document.getElementById('admin-username');
        const passwordInput = document.getElementById('admin-password');
        
        if (usernameInput && passwordInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAdminLogin();
                }
            });
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAdminLogin();
                }
            });
        }
        
        // Listen for new orders
        document.addEventListener('newOrderCreated', (e) => {
            this.handleNewOrderNotification(e.detail.order);
        });
        
        // Listen for data updates
        document.addEventListener('shopDataUpdate', () => {
            if (this.isAdmin) {
                this.loadDashboardStats();
                this.updateCategoriesChart();
                this.loadCustomerStats();
            }
        });
    }

    checkAdminSession() {
        const adminSession = localStorage.getItem('lamiti-admin');
        if (adminSession) {
            try {
                const session = JSON.parse(adminSession);
                const now = new Date();
                const loginTime = new Date(session.loginTime);
                const sessionDuration = now - loginTime;
                
                // Check if session is still valid (1 hour)
                if (sessionDuration < 3600000) {
                    this.isAdmin = true;
                    this.showAdminDashboard();
                    this.loadAdminContent();
                } else {
                    // Session expired
                    localStorage.removeItem('lamiti-admin');
                }
            } catch (error) {
                console.error('Invalid admin session:', error);
                localStorage.removeItem('lamiti-admin');
            }
        }
    }

    handleAdminLogin() {
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value.trim();

        // Simple admin authentication (demo)
        if (username === 'admin' && password === 'lamiti2024') {
            this.isAdmin = true;
            
            // Save admin session
            localStorage.setItem('lamiti-admin', JSON.stringify({
                username,
                loginTime: new Date().toISOString()
            }));
            
            this.showAdminDashboard();
            this.showNotification('Connexion admin réussie!', 'success');
            this.loadAdminContent();
        } else {
            this.showNotification('Identifiants incorrects!', 'error');
            
            // Add shake animation to form
            const loginContainer = document.querySelector('.login-container');
            if (loginContainer) {
                loginContainer.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    loginContainer.style.animation = '';
                }, 500);
            }
        }
    }

    showAdminDashboard() {
        const loginSection = document.getElementById('admin-login');
        const dashboardSection = document.getElementById('admin-dashboard');
        
        if (loginSection && dashboardSection) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
        }
    }

    loadAdminContent() {
        // Load dashboard stats
        this.loadDashboardStats();
        
        // Initialize charts
        this.initializeCharts();
        
        // Load products
        this.loadAdminProducts();
        this.loadMobileProducts();
        
        // Load categories
        this.loadAdminCategories();
        
        // Load orders
        this.loadAdminOrders();
        this.loadMobileOrders();
        
        // Load customers
        this.loadAdminCustomers();
        this.loadMobileCustomers();
        
        // Load customer stats
        this.loadCustomerStats();
        
        // Load low stock
        this.loadLowStockProducts();
        this.loadMobileLowStock();
    }

    loadDashboardStats() {
        if (!window.shop) return;
        
        const totalProducts = window.shop.products.length;
        const totalOrders = window.shop.orders.length;
        const totalRevenue = window.shop.orders.reduce((sum, order) => sum + order.total, 0);
        const lowStockItems = window.shop.products.filter(p => p.stock < 5).length;
        const pendingOrders = window.shop.orders.filter(o => o.status === 'pending').length;
        const completedOrders = window.shop.orders.filter(o => o.status === 'delivered').length;
        
        const elements = {
            'total-products': totalProducts,
            'total-orders': totalOrders,
            'total-revenue': window.shop.formatPrice(totalRevenue),
            'low-stock-items': lowStockItems,
            'pending-orders': pendingOrders,
            'completed-orders': completedOrders
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    loadCustomerStats() {
        if (!window.shop) return;
        
        const customers = this.getUniqueCustomers();
        const totalCustomers = customers.length;
        
        // Calculate active customers (ordered in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeCustomers = customers.filter(customer => {
            const latestOrder = Math.max(...customer.orders.map(o => new Date(o.orderDate).getTime()));
            return latestOrder > thirtyDaysAgo.getTime();
        }).length;
        
        // Calculate average order value
        const totalRevenue = window.shop.orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = window.shop.orders.length > 0 ? totalRevenue / window.shop.orders.length : 0;
        
        // Calculate repeat customer rate
        const repeatCustomers = customers.filter(c => c.orders.length > 1).length;
        const repeatCustomerRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
        
        // Update UI
        const totalCustomersEl = document.getElementById('total-customers');
        const activeCustomersEl = document.getElementById('active-customers');
        const avgOrderValueEl = document.getElementById('avg-order-value');
        const repeatCustomersEl = document.getElementById('repeat-customers');
        
        if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
        if (activeCustomersEl) activeCustomersEl.textContent = activeCustomers;
        if (avgOrderValueEl) avgOrderValueEl.textContent = window.shop.formatPrice(avgOrderValue);
        if (repeatCustomersEl) repeatCustomersEl.textContent = repeatCustomerRate + '%';
    }

    getUniqueCustomers() {
        if (!window.shop) return [];
        
        const customers = {};
        window.shop.orders.forEach(order => {
            const email = order.customer.email;
            if (!customers[email]) {
                customers[email] = {
                    ...order.customer,
                    orders: [],
                    totalSpent: 0
                };
            }
            customers[email].orders.push(order);
            customers[email].totalSpent += order.total;
        });
        
        return Object.values(customers);
    }

    initializeCharts() {
        // Initialize charts if ECharts is available
        if (typeof echarts !== 'undefined') {
            this.updateSalesChart();
            this.updateCategoriesChart();
        }
    }

    updateSalesChart() {
        const salesChartEl = document.getElementById('sales-chart');
        if (!salesChartEl) return;
        
        const salesChart = echarts.init(salesChartEl);
        const salesOption = {
            title: {
                text: 'Ventes des 6 derniers mois',
                left: 'center',
                textStyle: {
                    fontSize: 14
                }
            },
            tooltip: {
                trigger: 'axis'
            },
            xAxis: {
                type: 'category',
                data: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                axisLabel: {
                    fontSize: window.innerWidth <= 768 ? 10 : 12
                }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: '{value} FCFA',
                    fontSize: window.innerWidth <= 768 ? 10 : 12
                }
            },
            series: [{
                data: [120000, 200000, 150000, 80000, 70000, 110000],
                type: 'line',
                smooth: true,
                itemStyle: {
                    color: '#d4af37'
                },
                areaStyle: {
                    color: 'rgba(212, 175, 55, 0.3)'
                }
            }],
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            }
        };
        salesChart.setOption(salesOption);
        
        // Handle resize
        window.addEventListener('resize', function() {
            salesChart.resize();
        });
    }

    updateCategoriesChart() {
        const categoriesChartEl = document.getElementById('categories-chart');
        if (!categoriesChartEl || !window.shop) return;
        
        const categoriesChart = echarts.init(categoriesChartEl);
        const categoryStats = window.shop.getCategoryStats();
        const chartData = Object.entries(categoryStats).map(([name, value]) => ({
            value: value,
            name: name.charAt(0).toUpperCase() + name.slice(1)
        }));

        const categoriesOption = {
            title: {
                text: 'Répartition par catégorie',
                left: 'center',
                textStyle: {
                    fontSize: 14
                }
            },
            tooltip: {
                trigger: 'item'
            },
            series: [{
                type: 'pie',
                radius: window.innerWidth <= 768 ? '45%' : '50%',
                data: chartData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                label: {
                    fontSize: window.innerWidth <= 768 ? 10 : 12
                }
            }],
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            }
        };
        categoriesChart.setOption(categoriesOption);
        
        // Handle resize
        window.addEventListener('resize', function() {
            categoriesChart.resize();
        });
    }

    // PRODUCTS TABLE - DESKTOP VERSION
    loadAdminProducts() {
        if (!window.shop) return;
        
        const productsTable = document.getElementById('products-table-body');
        if (!productsTable) return;

        const products = window.shop.products;
        
        let html = '';
        
        products.forEach(product => {
            const stockClass = product.stock < 5 ? 'text-red-600 font-semibold' : '';
            const statusClass = product.active ? 'status-confirmed' : 'status-cancelled';
            const statusText = product.active ? 'Actif' : 'Inactif';
            const toggleIcon = product.active ? '✅' : '⏸️';
            const saleStatus = product.onSale ? 'Oui' : 'Non';
            
            html += `
                <tr data-product-id="${product.id}">
                    <td>
                        <div class="table-image">
                            <img src="${product.images[0] || 'resources/product-placeholder.jpg'}" alt="${product.name}">
                        </div>
                    </td>
                    <td>
                        <div class="font-semibold" style="font-size: 0.9rem;">${product.name}</div>
                        <div class="text-sm text-gray-600">
                            ${product.description.substring(0, 50)}...
                        </div>
                    </td>
                    <td class="capitalize">${product.category}</td>
                    <td class="font-semibold">${window.shop.formatPrice(product.price)}</td>
                    <td class="${stockClass}">${product.stock}</td>
                    <td>${saleStatus}</td>
                    <td>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit-btn" onclick="editProduct('${product.id}')" title="Modifier">✏️</button>
                            <button class="action-btn toggle-btn ${product.active ? 'active' : ''}" onclick="toggleProduct('${product.id}')" title="${product.active ? 'Désactiver' : 'Activer'}">
                                ${toggleIcon}
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')" title="Supprimer">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        productsTable.innerHTML = html;
    }

    // PRODUCTS MOBILE VERSION
    loadMobileProducts() {
        if (!window.shop || window.innerWidth > 768) return;
        
        const mobileContainer = document.getElementById('products-mobile-view');
        if (!mobileContainer) return;

        const products = window.shop.products;
        
        let html = '';
        
        products.forEach(product => {
            const stockClass = product.stock < 5 ? 'text-red-600 font-semibold' : '';
            const statusClass = product.active ? 'status-confirmed' : 'status-cancelled';
            const statusText = product.active ? 'Actif' : 'Inactif';
            const saleStatus = product.onSale ? 'Oui' : 'Non';
            
            html += `
                <div class="mobile-table-card" data-product-id="${product.id}">
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Image</div>
                        <div class="mobile-table-value">
                            <div class="table-image" style="margin: 0 auto;">
                                <img src="${product.images[0] || 'resources/product-placeholder.jpg'}" alt="${product.name}">
                            </div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Nom</div>
                        <div class="mobile-table-value">
                            <div class="font-semibold">${product.name}</div>
                            <div class="text-sm text-gray-600">${product.description.substring(0, 40)}...</div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Catégorie</div>
                        <div class="mobile-table-value capitalize">${product.category}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Prix</div>
                        <div class="mobile-table-value font-semibold">${window.shop.formatPrice(product.price)}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Stock</div>
                        <div class="mobile-table-value ${stockClass}">${product.stock}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">En solde</div>
                        <div class="mobile-table-value">${saleStatus}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Statut</div>
                        <div class="mobile-table-value">
                            <span class="order-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Actions</div>
                        <div class="mobile-table-value">
                            <div class="table-actions">
                                <button class="action-btn edit-btn" onclick="editProduct('${product.id}')" title="Modifier">✏️</button>
                                <button class="action-btn toggle-btn ${product.active ? 'active' : ''}" onclick="toggleProduct('${product.id}')" title="${product.active ? 'Désactiver' : 'Activer'}">
                                    ${product.active ? '✅' : '⏸️'}
                                </button>
                                <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')" title="Supprimer">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        mobileContainer.innerHTML = html;
    }

    loadAdminCategories() {
        if (!window.shop) return;
        
        const categoriesGrid = document.getElementById('categories-grid');
        if (!categoriesGrid) return;

        let html = '';
        
        window.shop.categories.forEach(category => {
            const subcategories = window.shop.subcategories[category] || [];
            const productCount = window.shop.products.filter(p => p.category === category).length;
            const categoryImage = window.shop.categoryImages ? window.shop.categoryImages[category] : null;
            
            html += `
                <div class="category-card">
                    <div class="category-header">
                        <div class="category-name capitalize">${category}</div>
                        <div class="category-actions">
                            <button class="action-btn edit-btn" onclick="editCategory('${category}')">✏️</button>
                            <button class="action-btn delete-btn" onclick="deleteCategory('${category}')">🗑️</button>
                        </div>
                    </div>
                    <div class="category-image">
                        <img src="${categoryImage || 'resources/category-placeholder.jpg'}" alt="${category}">
                        <div class="category-image-actions">
                            <button class="action-btn edit-btn" onclick="changeCategoryImage('${category}')">📷</button>
                        </div>
                    </div>
                    <div class="subcategories">
                        <div class="text-sm text-gray-600 mb-2">Sous-catégories:</div>
                        <div class="subcategory-list" id="subcategory-list-${category}">
                            ${subcategories.map(sub => `
                                <span class="subcategory-tag">
                                    ${sub}
                                    <button class="remove-subcategory" onclick="removeSubcategory('${category}', '${sub}')">&times;</button>
                                </span>
                            `).join('')}
                        </div>
                        <div class="add-subcategory-form">
                            <input type="text" class="add-subcategory-input" id="subcategory-input-${category}" placeholder="Nouvelle sous-catégorie">
                            <button class="add-subcategory-btn" onclick="addSubcategory('${category}')">+</button>
                        </div>
                    </div>
                    <div class="mt-4 text-sm text-gray-600">
                        ${productCount} produit(s) dans cette catégorie
                    </div>
                </div>
            `;
        });
        
        categoriesGrid.innerHTML = html;
    }

    // ORDERS TABLE - DESKTOP VERSION
    loadAdminOrders() {
        if (!window.shop) return;
        
        const ordersTable = document.getElementById('orders-table-body');
        if (!ordersTable) return;

        let html = '';
        
        window.shop.orders.forEach(order => {
            const paymentMethod = order.paymentMethod === 'card' ? 'Carte' : 'Mobile';
            
            html += `
                <tr data-order-id="${order.id}">
                    <td class="font-mono text-sm">${order.id}</td>
                    <td>
                        <div class="font-semibold" style="font-size: 0.9rem;">${order.customer.firstName} ${order.customer.lastName}</div>
                        <div class="text-sm text-gray-600">${order.customer.email}</div>
                    </td>
                    <td class="text-sm">${new Date(order.orderDate).toLocaleDateString('fr-FR')}</td>
                    <td class="font-semibold">${window.shop.formatPrice(order.total)}</td>
                    <td>
                        <span class="order-status status-${order.status}">
                            ${this.getStatusLabel(order.status)}
                        </span>
                    </td>
                    <td>${paymentMethod}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-btn edit-btn" onclick="viewOrderDetails('${order.id}')" title="Voir détails">👁️</button>
                            <button class="action-btn edit-btn" onclick="openUpdateOrderStatusModal('${order.id}')" title="Mettre à jour">🔄</button>
                            <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')" title="Supprimer">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        ordersTable.innerHTML = html;
    }

    // ORDERS MOBILE VERSION
    loadMobileOrders() {
        if (!window.shop || window.innerWidth > 768) return;
        
        const mobileContainer = document.getElementById('orders-mobile-view');
        if (!mobileContainer) return;

        let html = '';
        
        window.shop.orders.forEach(order => {
            const paymentMethod = order.paymentMethod === 'card' ? 'Carte' : 'Mobile';
            
            html += `
                <div class="mobile-table-card" data-order-id="${order.id}">
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">ID Commande</div>
                        <div class="mobile-table-value font-mono text-sm">${order.id}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Client</div>
                        <div class="mobile-table-value">
                            <div class="font-semibold">${order.customer.firstName} ${order.customer.lastName}</div>
                            <div class="text-sm text-gray-600">${order.customer.email}</div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Date</div>
                        <div class="mobile-table-value text-sm">${new Date(order.orderDate).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Total</div>
                        <div class="mobile-table-value font-semibold">${window.shop.formatPrice(order.total)}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Statut</div>
                        <div class="mobile-table-value">
                            <span class="order-status status-${order.status}">
                                ${this.getStatusLabel(order.status)}
                            </span>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Paiement</div>
                        <div class="mobile-table-value">${paymentMethod}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Actions</div>
                        <div class="mobile-table-value">
                            <div class="table-actions">
                                <button class="action-btn edit-btn" onclick="viewOrderDetails('${order.id}')" title="Voir détails">👁️</button>
                                <button class="action-btn edit-btn" onclick="openUpdateOrderStatusModal('${order.id}')" title="Mettre à jour">🔄</button>
                                <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')" title="Supprimer">🗑️</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        mobileContainer.innerHTML = html;
    }

    // CUSTOMERS TABLE - DESKTOP VERSION
    loadAdminCustomers() {
        if (!window.shop) return;
        
        const customersTable = document.getElementById('customers-table-body');
        if (!customersTable) return;

        // Get unique customers
        const customers = this.getUniqueCustomers();
        
        let html = '';
        
        customers.forEach(customer => {
            // Calculate customer level
            const level = this.getCustomerLevel(customer.totalSpent, customer.orders.length);
            const loyaltyProgress = Math.min((customer.orders.length / 10) * 100, 100);
            
            html += `
                <tr>
                    <td>
                        <div class="font-semibold" style="font-size: 0.9rem;">${customer.firstName} ${customer.lastName}</div>
                    </td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td class="text-center">${customer.orders.length}</td>
                    <td class="font-semibold">${window.shop.formatPrice(customer.totalSpent)}</td>
                    <td>
                        <span class="customer-level level-${level}">${this.getCustomerLevelLabel(level)}</span>
                    </td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${loyaltyProgress}%"></div>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">${customer.orders.length}/10 commandes</div>
                    </td>
                </tr>
            `;
        });
        
        customersTable.innerHTML = html;
    }

    // CUSTOMERS MOBILE VERSION
    loadMobileCustomers() {
        if (!window.shop || window.innerWidth > 768) return;
        
        const mobileContainer = document.getElementById('customers-mobile-view');
        if (!mobileContainer) return;

        // Get unique customers
        const customers = this.getUniqueCustomers();
        
        let html = '';
        
        customers.forEach(customer => {
            // Calculate customer level
            const level = this.getCustomerLevel(customer.totalSpent, customer.orders.length);
            const loyaltyProgress = Math.min((customer.orders.length / 10) * 100, 100);
            
            html += `
                <div class="mobile-table-card">
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Client</div>
                        <div class="mobile-table-value">
                            <div class="font-semibold">${customer.firstName} ${customer.lastName}</div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Email</div>
                        <div class="mobile-table-value">${customer.email}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Téléphone</div>
                        <div class="mobile-table-value">${customer.phone}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Commandes</div>
                        <div class="mobile-table-value text-center">${customer.orders.length}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Total dépensé</div>
                        <div class="mobile-table-value font-semibold">${window.shop.formatPrice(customer.totalSpent)}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Niveau</div>
                        <div class="mobile-table-value">
                            <span class="customer-level level-${level}">${this.getCustomerLevelLabel(level)}</span>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Fidélité</div>
                        <div class="mobile-table-value">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${loyaltyProgress}%"></div>
                            </div>
                            <div class="text-xs text-gray-600 mt-1">${customer.orders.length}/10 commandes</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        mobileContainer.innerHTML = html;
    }

    getCustomerLevel(totalSpent, orderCount) {
        if (orderCount >= 10 || totalSpent >= 1000000) return 'vip';
        if (orderCount >= 5 || totalSpent >= 500000) return 'premium';
        if (orderCount >= 2 || totalSpent >= 100000) return 'regular';
        return 'new';
    }

    getCustomerLevelLabel(level) {
        const labels = {
            'new': 'Nouveau',
            'regular': 'Régulier',
            'premium': 'Premium',
            'vip': 'VIP'
        };
        return labels[level] || level;
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'confirmed': 'Confirmée',
            'shipped': 'Expédiée',
            'delivered': 'Livrée',
            'cancelled': 'Annulée'
        };
        return labels[status] || status;
    }

    // Handle new order notification with sound
    handleNewOrderNotification(order) {
        // Only show notification if admin is logged in
        if (!this.isAdmin) return;
        
        // Play notification sound
        this.playNotificationSound();
        
        // Show desktop notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nouvelle commande!', {
                body: `Nouvelle commande de ${order.customer.firstName} ${order.customer.lastName} - ${window.shop.formatPrice(order.total)}`,
                icon: '/favicon.ico'
            });
        }
        
        // Update notification bell
        this.updateNotificationBell();
    }

    playNotificationSound() {
        const notificationSound = document.getElementById('notification-sound');
        if (notificationSound) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(e => {
                console.log('Audio playback failed:', e);
            });
        }
    }

    updateNotificationBell() {
        const bell = document.getElementById('notification-bell');
        if (bell) {
            bell.classList.add('ringing');
            
            // Stop animation after 3 seconds
            setTimeout(() => {
                bell.classList.remove('ringing');
            }, 3000);
        }
    }

    logout() {
        localStorage.removeItem('lamiti-admin');
        this.isAdmin = false;
        location.reload();
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    // Load low stock products
    loadLowStockProducts() {
        if (!window.shop) return;
        
        const lowStockProducts = window.shop.getLowStockProducts();
        const lowStockTable = document.getElementById('low-stock-table-body');
        if (!lowStockTable) return;

        let html = '';
        
        lowStockProducts.forEach(product => {
            const stockLevel = product.stock < 2 ? 'Critique' : product.stock < 5 ? 'Faible' : 'Normal';
            const stockClass = product.stock < 2 ? 'text-red-600' : 'text-yellow-600';
            
            html += `
                <tr>
                    <td>
                        <div class="table-image">
                            <img src="${product.images[0] || 'resources/product-placeholder.jpg'}" alt="${product.name}">
                        </div>
                    </td>
                    <td>
                        <div class="font-semibold" style="font-size: 0.9rem;">${product.name}</div>
                    </td>
                    <td class="capitalize">${product.category}</td>
                    <td class="font-semibold">${window.shop.formatPrice(product.price)}</td>
                    <td class="${stockClass} font-semibold">${product.stock}</td>
                    <td>
                        <span class="order-status ${product.stock < 2 ? 'status-cancelled' : 'status-pending'}">
                            ${stockLevel}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <input type="number" id="stock-${product.id}" value="${product.stock}" min="0" class="stock-input">
                            <button class="update-stock-btn" onclick="updateProductStock('${product.id}')">💾</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        lowStockTable.innerHTML = html;
    }

    // LOW STOCK MOBILE VERSION
    loadMobileLowStock() {
        if (!window.shop || window.innerWidth > 768) return;
        
        const mobileContainer = document.getElementById('low-stock-mobile-view');
        if (!mobileContainer) return;

        const lowStockProducts = window.shop.getLowStockProducts();
        
        let html = '';
        
        lowStockProducts.forEach(product => {
            const stockLevel = product.stock < 2 ? 'Critique' : product.stock < 5 ? 'Faible' : 'Normal';
            const stockClass = product.stock < 2 ? 'text-red-600' : 'text-yellow-600';
            
            html += `
                <div class="mobile-table-card" data-product-id="${product.id}">
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Image</div>
                        <div class="mobile-table-value">
                            <div class="table-image" style="margin: 0 auto;">
                                <img src="${product.images[0] || 'resources/product-placeholder.jpg'}" alt="${product.name}">
                            </div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Nom</div>
                        <div class="mobile-table-value">
                            <div class="font-semibold">${product.name}</div>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Catégorie</div>
                        <div class="mobile-table-value capitalize">${product.category}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Prix</div>
                        <div class="mobile-table-value font-semibold">${window.shop.formatPrice(product.price)}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Stock</div>
                        <div class="mobile-table-value ${stockClass} font-semibold">${product.stock}</div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Niveau</div>
                        <div class="mobile-table-value">
                            <span class="order-status ${product.stock < 2 ? 'status-cancelled' : 'status-pending'}">
                                ${stockLevel}
                            </span>
                        </div>
                    </div>
                    <div class="mobile-table-row">
                        <div class="mobile-table-label">Actions</div>
                        <div class="mobile-table-value">
                            <div class="table-actions">
                                <input type="number" id="stock-mobile-${product.id}" value="${product.stock}" min="0" class="stock-input">
                                <button class="update-stock-btn" onclick="updateProductStock('${product.id}')">💾</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        mobileContainer.innerHTML = html;
    }
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});

// Global functions for admin interface
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');
    
    // Update sidebar menu
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and activate the clicked link
    const clickedLink = event?.target?.closest('.sidebar-link') || 
        document.querySelector(`.sidebar-link[onclick*="${sectionName}"]`);
    if (clickedLink) {
        clickedLink.classList.add('active');
    }
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('admin-sidebar');
        sidebar.classList.remove('active');
    }
    
    // Load section content
    switch(sectionName) {
        case 'dashboard':
            window.adminManager.loadDashboardStats();
            window.adminManager.initializeCharts();
            window.adminManager.loadCustomerStats();
            break;
        case 'products':
            window.adminManager.loadAdminProducts();
            window.adminManager.loadMobileProducts();
            break;
        case 'categories':
            window.adminManager.loadAdminCategories();
            break;
        case 'orders':
            window.adminManager.loadAdminOrders();
            window.adminManager.loadMobileOrders();
            break;
        case 'customers':
            window.adminManager.loadAdminCustomers();
            window.adminManager.loadMobileCustomers();
            window.adminManager.loadCustomerStats();
            break;
        case 'analytics':
            loadDetailedAnalytics();
            break;
        case 'low-stock':
            window.adminManager.loadLowStockProducts();
            window.adminManager.loadMobileLowStock();
            break;
    }
}

function editProduct(productId) {
    if (window.shop) {
        // Find the product
        const product = window.shop.products.find(p => p.id === productId);
        if (product) {
            // Open the add product modal in edit mode
            openAddProductModal();
            
            // Set the modal to edit mode
            document.getElementById('modal-title').textContent = 'Modifier le produit';
            currentEditingProduct = productId;
            
            // Populate form with product data
            const form = document.getElementById('add-product-form');
            form.name.value = product.name;
            form.category.value = product.category;
            form.price.value = product.price;
            form.originalPrice.value = product.originalPrice || '';
            form.stock.value = product.stock;
            form.sizes.value = product.sizes.join(', ');
            form.colors.value = product.colors.join(', ');
            form.description.value = product.description;
            form.featured.checked = product.featured;
            form.onSale.checked = product.onSale;
            
            // Populate category select
            const categorySelect = document.getElementById('product-category-select');
            categorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
            if (window.shop && window.shop.categories) {
                window.shop.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                    categorySelect.appendChild(option);
                });
            }
            categorySelect.value = product.category;

            // Populate uploaded images
            uploadedImages = [...product.images];
            const uploadedImagesContainer = document.getElementById('uploaded-images');
            uploadedImagesContainer.innerHTML = '';
            uploadedImages.forEach((image, index) => {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'uploaded-image';
                imageDiv.innerHTML = `
                    <img src="${image}" alt="Uploaded">
                    <button class="remove-image" onclick="removeUploadedImage('${image}')">&times;</button>
                `;
                uploadedImagesContainer.appendChild(imageDiv);
            });
        }
    }
}

function toggleProduct(productId) {
    if (window.shop) {
        window.shop.toggleProductStatus(productId);
        // Reload the products table
        if (window.adminManager) {
            window.adminManager.loadAdminProducts();
            window.adminManager.loadMobileProducts();
        }
    }
}

function deleteProduct(productId) {
    if (window.shop) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
            window.shop.deleteProduct(productId);
            // Reload the products table
            if (window.adminManager) {
                window.adminManager.loadAdminProducts();
                window.adminManager.loadMobileProducts();
                window.adminManager.updateCategoriesChart();
            }
        }
    }
}

function editCategory(categoryName) {
    const newName = prompt('Modifier le nom de la catégorie:', categoryName);
    if (newName && newName.trim() && newName !== categoryName) {
        if (window.shop) {
            // Update category name in categories array
            const index = window.shop.categories.indexOf(categoryName);
            if (index !== -1) {
                window.shop.categories[index] = newName.trim().toLowerCase();
                
                // Update subcategories reference
                window.shop.subcategories[newName] = window.shop.subcategories[categoryName] || [];
                delete window.shop.subcategories[categoryName];
                
                // Update category image
                if (window.shop.categoryImages && window.shop.categoryImages[categoryName]) {
                    window.shop.categoryImages[newName] = window.shop.categoryImages[categoryName];
                    delete window.shop.categoryImages[categoryName];
                }
                
                // Update products with this category
                window.shop.products.forEach(product => {
                    if (product.category === categoryName) {
                        product.category = newName.trim().toLowerCase();
                    }
                });
                
                window.shop.saveCategories();
                window.shop.saveProducts();
                window.shop.showNotification('Catégorie modifiée avec succès!', 'success');
                
                // Reload categories and products
                if (window.adminManager) {
                    window.adminManager.loadAdminCategories();
                    window.adminManager.loadAdminProducts();
                    window.adminManager.loadMobileProducts();
                    window.adminManager.updateCategoriesChart();
                }
            }
        }
    }
}

function deleteCategory(categoryName) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ? Cette action est irréversible.`)) {
        if (window.shop) {
            if (window.shop.deleteCategory(categoryName)) {
                // Reload categories
                if (window.adminManager) {
                    window.adminManager.loadAdminCategories();
                    window.adminManager.updateCategoriesChart();
                }
            }
        }
    }
}

function addSubcategory(categoryName) {
    const input = document.getElementById(`subcategory-input-${categoryName}`);
    if (input && window.shop) {
        const subcategoryName = input.value.trim();
        
        if (!subcategoryName) {
            window.shop.showNotification('Veuillez entrer un nom de sous-catégorie', 'error');
            return;
        }
        
        if (!window.shop.subcategories[categoryName]) {
            window.shop.subcategories[categoryName] = [];
        }
        
        if (!window.shop.subcategories[categoryName].includes(subcategoryName)) {
            window.shop.subcategories[categoryName].push(subcategoryName);
            window.shop.saveCategories();
            window.shop.showNotification('Sous-catégorie ajoutée avec succès!', 'success');
            input.value = '';
            
            // Reload categories
            if (window.adminManager) {
                window.adminManager.loadAdminCategories();
            }
        } else {
            window.shop.showNotification('Cette sous-catégorie existe déjà!', 'error');
        }
    }
}

function removeSubcategory(categoryName, subcategoryName) {
    if (confirm(`Supprimer la sous-catégorie "${subcategoryName}" ?`)) {
        if (window.shop) {
            window.shop.subcategories[categoryName] = window.shop.subcategories[categoryName].filter(
                sub => sub !== subcategoryName
            );
            window.shop.saveCategories();
            window.shop.showNotification('Sous-catégorie supprimée!', 'info');
            
            // Reload categories
            if (window.adminManager) {
                window.adminManager.loadAdminCategories();
            }
        }
    }
}

function viewOrderDetails(orderId) {
    if (window.shop) {
        const order = window.shop.orders.find(o => o.id === orderId);
        if (order) {
            currentEditingOrder = orderId;
            
            // Mark notification as read when viewing order
            markOrderNotificationAsRead(orderId);
            
            const content = `
                <div class="order-info">
                    <div class="order-section">
                        <h3 class="font-semibold mb-3">Informations client</h3>
                        <div class="space-y-2">
                            <div><strong>Nom:</strong> ${order.customer.firstName} ${order.customer.lastName}</div>
                            <div><strong>Email:</strong> ${order.customer.email}</div>
                            <div><strong>Téléphone:</strong> ${order.customer.phone}</div>
                        </div>
                    </div>
                    
                    <div class="order-section">
                        <h3 class="font-semibold mb-3">Adresse de livraison</h3>
                        <div class="space-y-2">
                            <div><strong>Adresse:</strong> ${order.shippingAddress.address}</div>
                            <div><strong>Ville:</strong> ${order.shippingAddress.city}</div>
                            <div><strong>Code postal:</strong> ${order.shippingAddress.zipCode}</div>
                            <div><strong>Pays:</strong> ${order.shippingAddress.country}</div>
                        </div>
                    </div>
                </div>
                
                <div class="order-section">
                    <h3 class="font-semibold mb-3">Informations de commande</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><strong>ID:</strong> ${order.id}</div>
                        <div><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString('fr-FR')}</div>
                        <div><strong>Statut:</strong> <span class="order-status status-${order.status}">${getStatusLabel(order.status)}</span></div>
                        <div><strong>Paiement:</strong> ${order.paymentMethod === 'card' ? 'Carte bancaire' : 'Paiement mobile'}</div>
                        <div><strong>Total:</strong> ${window.shop.formatPrice(order.total)}</div>
                        <div><strong>Code suivi:</strong> ${order.trackingCode}</div>
                    </div>
                </div>
                
                <div class="order-timeline">
                    <h3 class="font-semibold mb-3">Suivi de commande</h3>
                    ${renderOrderTimeline(order)}
                </div>
                
                <div class="order-items">
                    <h3 class="font-semibold mb-3">Articles commandés</h3>
                    ${order.items.map(item => {
                        const product = window.shop.products.find(p => p.id === item.productId);
                        return `
                            <div class="order-item">
                                <div class="order-item-image">
                                    <img src="${product ? product.images[0] : ''}" alt="${product ? product.name : 'Produit'}">
                                </div>
                                <div class="flex-1">
                                    <div class="font-semibold">${product ? product.name : 'Produit inconnu'}</div>
                                    <div class="text-sm text-gray-600">
                                        ${item.size ? `Taille: ${item.size}` : ''}
                                        ${item.color ? `Couleur: ${item.color}` : ''}
                                        Quantité: ${item.quantity}
                                    </div>
                                    <div class="font-semibold text-right">
                                        ${window.shop.formatPrice(product ? product.price * item.quantity : 0)}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="flex gap-4 mt-6 flex-wrap">
                    <button class="add-product-btn" onclick="openUpdateOrderStatusModal('${order.id}')">
                        Mettre à jour le statut
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')">
                        Supprimer la commande
                    </button>
                </div>
            `;
            
            document.getElementById('order-details-content').innerHTML = content;
            
            const modal = document.getElementById('order-details-modal');
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }
}

function renderOrderTimeline(order) {
    const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const statusLabels = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
    };
    
    let html = '';
    
    // Get status history or create default
    const statusHistory = order.statusHistory || [
        { status: 'pending', timestamp: order.orderDate, note: 'Commande créée' }
    ];
    
    statusHistory.forEach((history, index) => {
        const isLast = index === statusHistory.length - 1;
        const isCurrent = history.status === order.status;
        
        html += `
            <div class="timeline-item ${isLast ? 'current' : 'completed'}">
                <div class="font-semibold">${statusLabels[history.status] || history.status}</div>
                <div class="timeline-content">
                    ${history.note || 'Mise à jour du statut'}
                    <div class="timeline-time">
                        ${new Date(history.timestamp).toLocaleString('fr-FR')}
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

function markOrderNotificationAsRead(orderId) {
    // Load notifications
    const notifications = JSON.parse(localStorage.getItem('lamiti-notifications') || '[]');
    
    // Find and mark notification as read
    notifications.forEach(notification => {
        if (notification.orderId === orderId) {
            notification.read = true;
        }
    });
    
    // Save notifications
    localStorage.setItem('lamiti-notifications', JSON.stringify(notifications));
    
    // Update UI
    updateNotificationBadge();
    updateNotificationPanel();
}

function updateOrderStatus(orderId, newStatus) {
    if (window.shop) {
        const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        const order = window.shop.orders.find(o => o.id === orderId);
        if (order) {
            const currentIndex = statuses.indexOf(order.status);
            const nextIndex = (currentIndex + 1) % statuses.length;
            const newStatus = statuses[nextIndex];
            
            window.shop.updateOrderStatus(orderId, newStatus);
            window.shop.showNotification(`Statut mis à jour: ${getStatusLabel(newStatus)}`, 'success');
            
            // Reload orders
            if (window.adminManager) {
                window.adminManager.loadAdminOrders();
                window.adminManager.loadMobileOrders();
            }
        }
    }
}

function deleteOrder(orderId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
        if (window.shop) {
            window.shop.orders = window.shop.orders.filter(o => o.id !== orderId);
            localStorage.setItem('lamiti-orders', JSON.stringify(window.shop.orders));
            window.shop.showNotification('Commande supprimée avec succès!', 'info');
            
            // Reload orders
            if (window.adminManager) {
                window.adminManager.loadAdminOrders();
                window.adminManager.loadMobileOrders();
            }
            
            closeOrderDetailsModal();
        }
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'En attente',
        'confirmed': 'Confirmée',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
    };
    return labels[status] || status;
}

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .category-image {
        position: relative;
    }
    
    .category-image-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .category-card:hover .category-image-actions {
        opacity: 1;
    }
    
    .stock-input {
        width: 50px;
        padding: 0.3rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-align: center;
        font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
        .stock-input {
            width: 40px;
        }
    }
    
    .update-stock-btn {
        background: #27ae60;
        color: white;
        border: none;
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 0.3rem;
        font-size: 0.8rem;
        white-space: nowrap;
    }
    
    .update-stock-btn:hover {
        background: #219a52;
    }
`;
document.head.appendChild(style);

// Global variables
let uploadedImages = [];
let currentEditingProduct = null;
let currentEditingOrder = null;
let currentEditingCategory = null;
let categoryImages = [];

// Modal functions
function openAddProductModal() {
    currentEditingProduct = null;
    document.getElementById('modal-title').textContent = 'Ajouter un produit';
    document.getElementById('add-product-form').reset();
    uploadedImages = [];
    document.getElementById('uploaded-images').innerHTML = '';
    
    // Populate category select
    const categorySelect = document.getElementById('product-category-select');
    categorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
    if (window.shop && window.shop.categories) {
        window.shop.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categorySelect.appendChild(option);
        });
    }
    
    const modal = document.getElementById('add-product-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('add-product-form').reset();
    uploadedImages = [];
    document.getElementById('uploaded-images').innerHTML = '';
    currentEditingProduct = null;
}

function openAddCategoryModal() {
    document.getElementById('add-category-form').reset();
    categoryImages = [];
    document.getElementById('category-uploaded-images').innerHTML = '';
    
    const modal = document.getElementById('add-category-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('add-category-form').reset();
    categoryImages = [];
    document.getElementById('category-uploaded-images').innerHTML = '';
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('order-details-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentEditingOrder = null;
}

function closeUpdateOrderStatusModal() {
    const modal = document.getElementById('update-order-status-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Image handling functions
function handleImageUpload(event) {
    const files = event.target.files;
    const uploadedImagesContainer = document.getElementById('uploaded-images');
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedImages.push(e.target.result);
                
                const imageDiv = document.createElement('div');
                imageDiv.className = 'uploaded-image';
                imageDiv.innerHTML = `
                    <img src="${e.target.result}" alt="Uploaded">
                    <button class="remove-image" onclick="removeUploadedImage('${e.target.result}')">&times;</button>
                `;
                
                uploadedImagesContainer.appendChild(imageDiv);
            };
            reader.readAsDataURL(file);
        }
    });
}

function handleCategoryImageUpload(event) {
    const files = event.target.files;
    const uploadedImagesContainer = document.getElementById('category-uploaded-images');
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                categoryImages = [e.target.result]; // Only one image for category
                
                const imageDiv = document.createElement('div');
                imageDiv.className = 'uploaded-image';
                imageDiv.innerHTML = `
                    <img src="${e.target.result}" alt="Uploaded">
                    <button class="remove-image" onclick="removeCategoryImage('${e.target.result}')">&times;</button>
                `;
                
                uploadedImagesContainer.innerHTML = '';
                uploadedImagesContainer.appendChild(imageDiv);
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeUploadedImage(imageSrc) {
    uploadedImages = uploadedImages.filter(img => img !== imageSrc);
    const imageDiv = document.querySelector(`img[src="${imageSrc}"]`).parentElement;
    imageDiv.remove();
}

function removeCategoryImage(imageSrc) {
    categoryImages = categoryImages.filter(img => img !== imageSrc);
    const imageDiv = document.querySelector(`img[src="${imageSrc}"]`).parentElement;
    imageDiv.remove();
}

// Form handlers
function handleAddProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('name'),
        category: formData.get('category'),
        price: parseInt(formData.get('price')),
        originalPrice: parseInt(formData.get('originalPrice')) || null,
        stock: parseInt(formData.get('stock')),
        sizes: formData.get('sizes').split(',').map(s => s.trim()).filter(s => s),
        colors: formData.get('colors').split(',').map(s => s.trim()).filter(s => s),
        description: formData.get('description'),
        featured: formData.has('featured'),
        onSale: formData.has('onSale'),
        images: uploadedImages.length > 0 ? uploadedImages : ['resources/product-placeholder.jpg']
    };
    
    if (currentEditingProduct) {
        // Update existing product
        window.shop.updateProduct(currentEditingProduct, productData);
        window.shop.showNotification('Produit mis à jour avec succès!', 'success');
    } else {
        // Add new product
        window.shop.addProduct(productData);
    }
    
    closeAddProductModal();
    if (window.adminManager) {
        window.adminManager.loadAdminProducts();
        window.adminManager.loadMobileProducts();
        window.adminManager.updateCategoriesChart();
    }
}

function handleAddCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryData = {
        name: formData.get('name').trim().toLowerCase(),
        subcategories: formData.get('subcategories').split(',').map(s => s.trim()).filter(s => s),
        image: categoryImages.length > 0 ? categoryImages[0] : null
    };
    
    if (window.shop.addCategory(categoryData.name, categoryData.subcategories, categoryData.image)) {
        closeAddCategoryModal();
        if (window.adminManager) {
            window.adminManager.loadAdminCategories();
            window.adminManager.updateCategoriesChart();
        }
    }
}

// Stock management
function updateProductStock(productId) {
    let stockInput;
    if (window.innerWidth <= 768) {
        stockInput = document.getElementById(`stock-mobile-${productId}`);
    } else {
        stockInput = document.getElementById(`stock-${productId}`);
    }
    
    if (stockInput && window.shop) {
        const newStock = parseInt(stockInput.value);
        if (!isNaN(newStock) && newStock >= 0) {
            const product = window.shop.products.find(p => p.id === productId);
            if (product) {
                product.stock = newStock;
                window.shop.saveProducts();
                window.shop.showNotification('Stock mis à jour!', 'success');
                
                // Reload low stock products
                if (window.adminManager) {
                    window.adminManager.loadLowStockProducts();
                    window.adminManager.loadMobileLowStock();
                    window.adminManager.loadDashboardStats();
                }
            }
        }
    }
}

// Category image change
function changeCategoryImage(categoryName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                if (window.shop) {
                    if (!window.shop.categoryImages) {
                        window.shop.categoryImages = {};
                    }
                    window.shop.categoryImages[categoryName] = e.target.result;
                    window.shop.saveCategoryImages();
                    window.shop.showNotification('Image de catégorie mise à jour!', 'success');
                    if (window.adminManager) {
                        window.adminManager.loadAdminCategories();
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// Detailed analytics
function loadDetailedAnalytics() {
    if (typeof echarts !== 'undefined') {
        // Detailed Sales Chart
        const detailedSalesChartEl = document.getElementById('detailed-sales-chart');
        if (detailedSalesChartEl) {
            const detailedSalesChart = echarts.init(detailedSalesChartEl);
            const detailedSalesOption = {
                title: {
                    text: 'Analyse détaillée des ventes',
                    left: 'center',
                    textStyle: {
                        fontSize: window.innerWidth <= 768 ? 12 : 14
                    }
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: ['Ventes', 'Bénéfices', 'Commandes'],
                    textStyle: {
                        fontSize: window.innerWidth <= 768 ? 10 : 12
                    }
                },
                xAxis: {
                    type: 'category',
                    data: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                    axisLabel: {
                        fontSize: window.innerWidth <= 768 ? 10 : 12
                    }
                },
                yAxis: [
                    {
                        type: 'value',
                        name: 'FCFA',
                        axisLabel: {
                            formatter: '{value} FCFA',
                            fontSize: window.innerWidth <= 768 ? 10 : 12
                        }
                    },
                    {
                        type: 'value',
                        name: 'Commandes',
                        axisLabel: {
                            formatter: '{value}',
                            fontSize: window.innerWidth <= 768 ? 10 : 12
                        }
                    }
                ],
                series: [
                    {
                        name: 'Ventes',
                        type: 'bar',
                        data: [120000, 200000, 150000, 80000, 70000, 110000],
                        itemStyle: {
                            color: '#d4af37'
                        }
                    },
                    {
                        name: 'Bénéfices',
                        type: 'line',
                        data: [30000, 50000, 35000, 20000, 15000, 25000],
                        itemStyle: {
                            color: '#27ae60'
                        }
                    },
                    {
                        name: 'Commandes',
                        type: 'line',
                        yAxisIndex: 1,
                        data: [12, 25, 18, 10, 8, 15],
                        itemStyle: {
                            color: '#3498db'
                        }
                    }
                ],
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                }
            };
            detailedSalesChart.setOption(detailedSalesOption);
            
            // Handle resize
            window.addEventListener('resize', function() {
                detailedSalesChart.resize();
            });
        }
        
        // Products Performance Chart
        const productsChartEl = document.getElementById('products-performance-chart');
        if (productsChartEl) {
            const productsChart = echarts.init(productsChartEl);
            const productsOption = {
                title: {
                    text: 'Performance des produits',
                    left: 'center',
                    textStyle: {
                        fontSize: window.innerWidth <= 768 ? 12 : 14
                    }
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['Sac Cuir', 'Blazer', 'Montre', 'Lunettes', 'Robe', 'Chemise'],
                    axisLabel: {
                        fontSize: window.innerWidth <= 768 ? 10 : 12,
                        rotate: window.innerWidth <= 768 ? 45 : 0
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: '{value}',
                        fontSize: window.innerWidth <= 768 ? 10 : 12
                    }
                },
                series: [{
                    name: 'Ventes',
                    type: 'bar',
                    data: [8, 15, 5, 12, 10, 7],
                    itemStyle: {
                        color: '#d4af37'
                    }
                }],
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: window.innerWidth <= 768 ? '15%' : '3%',
                    containLabel: true
                }
            };
            productsChart.setOption(productsOption);
            
            // Handle resize
            window.addEventListener('resize', function() {
                productsChart.resize();
            });
        }
    }
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeAddProductModal();
        closeAddCategoryModal();
        closeOrderDetailsModal();
        closeUpdateOrderStatusModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAddProductModal();
        closeAddCategoryModal();
        closeOrderDetailsModal();
        closeUpdateOrderStatusModal();
    }
});

// Listen for data updates
document.addEventListener('shopDataUpdate', function() {
    if (window.adminManager && window.adminManager.isAdmin) {
        window.adminManager.loadDashboardStats();
        window.adminManager.updateCategoriesChart();
        window.adminManager.loadCustomerStats();
    }
});

// Notification functions from admin.html
function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    const bell = document.getElementById('notification-bell');
    
    if (panel && panel.classList.contains('show')) {
        panel.classList.remove('show');
        isNotificationPanelOpen = false;
    } else if (panel) {
        panel.classList.add('show');
        isNotificationPanelOpen = true;
        
        // Mark all as read when opening panel
        markAllNotificationsAsRead();
        
        // Stop bell animation
        if (bell) {
            bell.classList.remove('ringing');
        }
    }
}

function markAllNotificationsAsRead() {
    const notifications = JSON.parse(localStorage.getItem('lamiti-notifications') || '[]');
    notifications.forEach(notification => {
        notification.read = true;
    });
    localStorage.setItem('lamiti-notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    updateNotificationPanel();
}

function clearAllNotifications() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les notifications ?')) {
        localStorage.setItem('lamiti-notifications', JSON.stringify([]));
        updateNotificationBadge();
        updateNotificationPanel();
    }
}

function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem('lamiti-notifications') || '[]');
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');
    const bell = document.getElementById('notification-bell');
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    if (bell) {
        if (unreadCount > 0 && !isNotificationPanelOpen) {
            bell.classList.add('ringing');
        } else {
            bell.classList.remove('ringing');
        }
    }
}

function updateNotificationPanel() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    const notifications = JSON.parse(localStorage.getItem('lamiti-notifications') || '[]');
    const unreadNotifications = notifications.filter(n => !n.read);
    const readNotifications = notifications.filter(n => n.read);
    
    let html = '';
    
    // Unread notifications
    unreadNotifications.forEach((notification, index) => {
        html += createNotificationHTML(notification, index, true);
    });
    
    // Read notifications
    readNotifications.forEach((notification, index) => {
        html += createNotificationHTML(notification, index + unreadNotifications.length, false);
    });
    
    if (notifications.length === 0) {
        html = `
            <div class="notification-item" style="text-align: center; color: #666;">
                Aucune notification
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function createNotificationHTML(notification, index, isUnread) {
    const timeAgo = getTimeAgo(notification.timestamp);
    const orderLink = notification.orderId ? 
        `<span class="notification-item-order" onclick="viewOrderFromNotification('${notification.orderId}')">
            Voir la commande
        </span>` : '';
    
    return `
        <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="markNotificationAsRead(${index})">
            <div class="notification-item-title">
                <span>${notification.title}</span>
                <span class="notification-item-time">${timeAgo}</span>
            </div>
            <div class="notification-item-message">${notification.message}</div>
            ${orderLink}
        </div>
    `;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return past.toLocaleDateString('fr-FR');
}

function markNotificationAsRead(index) {
    const notifications = JSON.parse(localStorage.getItem('lamiti-notifications') || '[]');
    if (notifications[index]) {
        notifications[index].read = true;
        localStorage.setItem('lamiti-notifications', JSON.stringify(notifications));
        updateNotificationBadge();
        updateNotificationPanel();
    }
}

function viewOrderFromNotification(orderId) {
    // Close notification panel
    toggleNotificationPanel();
    
    // Show orders section
    showSection('orders');
    
    // Find and highlight the order
    setTimeout(() => {
        const orderRow = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderRow) {
            // Scroll to the order
            orderRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the order
            orderRow.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                orderRow.style.backgroundColor = '';
            }, 3000);
            
            // Open order details
            viewOrderDetails(orderId);
        } else {
            // If order not found in current view, reload orders
            if (window.adminManager) {
                window.adminManager.loadAdminOrders();
                window.adminManager.loadMobileOrders();
            }
            setTimeout(() => {
                viewOrderFromNotification(orderId);
            }, 500);
        }
    }, 500);
}