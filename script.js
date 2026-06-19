'use strict';

// ==================== الإعدادات ====================
const CONFIG = {
    storeName: 'شام ستوري',
    shamCashAddress: '0933123456',
    exchangeRate: 143.75,
    apiBaseUrl: 'https://store.ahminix.com/client/api',
    apiToken: 'KYQNQBmUT8mAvaTIZPXGalM-AXEeNwHASz8OVj6DBMiuJzFqxZKdVy9oaeeSOCaX',
    sliderInterval: 4000,
    socialLinks: {
        instagram: 'https://instagram.com/',
        whatsapp: 'https://wa.me/',
        telegram: 'https://t.me/',
        tiktok: 'https://tiktok.com/@',
    },
};

const STATE = {
    userId: null,
    balance: 0,
    sliderIndex: 0,
    sliderTimer: null,
    banners: [],
    categories: [],
    products: [],
    activeCategory: 0,
    orderInProgress: false,
};

// ==================== أدوات API ====================
async function apiCall(endpoint, options = {}) {
    const url = CONFIG.apiBaseUrl + endpoint;
    const headers = {
        'api-token': CONFIG.apiToken,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    try {
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast('⚠️ خطأ في الاتصال بالسيرفر');
        throw error;
    }
}

// ==================== Telegram WebApp ====================
function initTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        STATE.userId = '123456789';
        STATE.balance = 15.75;
        updateUserUI();
        console.log('⚠️ وضع تجريبي');
        return;
    }
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe?.user) {
        STATE.userId = tg.initDataUnsafe.user.id;
        loadBalance();
    }
    updateUserUI();
}

async function loadBalance() {
    try {
        const data = await apiCall('/profile');
        if (data.status === 'OK') {
            STATE.balance = parseFloat(data.balance) || 0;
            updateUserUI();
        }
    } catch (e) {
        const saved = sessionStorage.getItem('shamBalance');
        STATE.balance = saved ? parseFloat(saved) : 0;
        updateUserUI();
    }
}

function updateUserUI() {
    const idEl = document.getElementById('displayUserId');
    const balEl = document.getElementById('displayBalance');
    if (idEl) idEl.textContent = STATE.userId || '---';
    if (balEl) balEl.textContent = STATE.balance.toFixed(3);
}

function saveBalanceLocal() {
    sessionStorage.setItem('shamBalance', STATE.balance.toString());
    updateUserUI();
}

// ==================== المودالات ====================
function openPaymentMethodsModal() {
    document.getElementById('paymentMethodsModal').classList.add('active');
}
function closePaymentMethodsModal() {
    document.getElementById('paymentMethodsModal').classList.remove('active');
}
function openShamCashForm() {
    closePaymentMethodsModal();
    resetShamCashForm();
    document.getElementById('shamCashModal').classList.add('active');
}
function closeShamCashModal() {
    document.getElementById('shamCashModal').classList.remove('active');
}
function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
}
function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

function resetShamCashForm() {
    document.getElementById('currencySelect').value = '';
    document.getElementById('amountInput').value = '';
    document.getElementById('transactionIdInput').value = '';
    document.getElementById('exchangePreview').style.display = 'none';
    document.getElementById('transactionError').style.display = 'none';
    document.getElementById('helpLink').style.display = 'inline-flex';
    document.getElementById('btnSubmitPayment').disabled = false;
    document.getElementById('btnSubmitPayment').textContent = 'تأكيد التحويل';
    document.getElementById('previewAmount').textContent = '0.00 USD';
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ==================== نسخ العنوان ====================
function copyAddress() {
    const addr = CONFIG.shamCashAddress;
    const btn = document.getElementById('btnCopyAddress');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(addr).then(() => copyFeedback(btn));
    } else {
        const ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyFeedback(btn);
    }
}

function copyFeedback(btn) {
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
    showToast('✅ تم نسخ العنوان بنجاح');
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<i class="fa-solid fa-copy"></i> نسخ';
    }, 2000);
}

// ==================== العملة والتحويل ====================
function handleCurrencyChange() {
    const currency = document.getElementById('currencySelect').value;
    const preview = document.getElementById('exchangePreview');
    preview.style.display = currency === 'SYP' ? 'block' : 'none';
    calculatePreview();
}

function handleAmountInput() {
    calculatePreview();
}

function calculatePreview() {
    const currency = document.getElementById('currencySelect').value;
    const amount = parseFloat(document.getElementById('amountInput').value) || 0;
    const previewAmount = document.getElementById('previewAmount');
    if (currency === 'SYP' && amount > 0) {
        previewAmount.textContent = (amount / CONFIG.exchangeRate).toFixed(2) + ' USD';
    } else {
        previewAmount.textContent = '0.00 USD';
    }
}

function handleTransactionIdInput() {
    const input = document.getElementById('transactionIdInput');
    const error = document.getElementById('transactionError');
    const helpLink = document.getElementById('helpLink');
    const val = input.value.replace(/\D/g, '');
    input.value = val;

    if (val.length === 0) {
        error.style.display = 'none';
        helpLink.style.display = 'inline-flex';
    } else if (val.length >= 7 && val.length <= 10) {
        error.style.display = 'none';
        helpLink.style.display = 'none';
    } else {
        error.style.display = 'flex';
        helpLink.style.display = 'inline-flex';
    }
}

// ==================== تقديم الدفع ====================
function submitPayment() {
    const currency = document.getElementById('currencySelect').value;
    const amount = parseFloat(document.getElementById('amountInput').value) || 0;
    const txId = document.getElementById('transactionIdInput').value;

    if (!currency) return showToast('⚠️ الرجاء اختيار العملة');
    if (amount <= 0) return showToast('⚠️ الرجاء إدخال المبلغ');
    if (txId.length < 7 || txId.length > 10) return showToast('⚠️ رقم العملية غير صحيح');

    const btn = document.getElementById('btnSubmitPayment');
    btn.disabled = true;
    btn.textContent = 'جاري المعالجة...';

    setTimeout(() => {
        STATE.balance += (currency === 'SYP') ? (amount / CONFIG.exchangeRate) : amount;
        saveBalanceLocal();
        showToast('🎉 تم الشحن بنجاح!');
        closeShamCashModal();
        loadBalance();
    }, 1500);
}

// ==================== البنرات ====================
function initBanners() {
    STATE.banners = [
        { badge: '🔥 عرض', title: 'شحن PUBG', subtitle: 'أفضل الأسعار', link: 7, bg: 0 },
        { badge: '⚡ خدمة', title: 'شحن Free Fire', subtitle: 'توصيل فوري', link: null, bg: 1 },
        { badge: '🏦 محفظة', title: 'شام كاش', subtitle: 'شحن سريع', link: 'shamcash', bg: 2 },
        { badge: '💎 عرض', title: 'بطاقات قوقل', subtitle: 'خصم 15%', link: null, bg: 3 },
    ];
    renderBanners();
    startSlider();
}

function renderBanners() {
    const slider = document.getElementById('promoSlider');
    const dots = document.getElementById('promoDots');
    if (!slider || !dots) return;

    slider.innerHTML = '';
    dots.innerHTML = '';

    STATE.banners.forEach((b, i) => {
        const slide = document.createElement('div');
        slide.className = 'promo-slide' + (!b.link ? ' no-link' : '');
        slide.innerHTML = `
            <div class="promo-glow"></div>
            <div class="promo-content">
                <span class="promo-badge">${b.badge}</span>
                <h3 class="promo-title">${b.title}</h3>
                <p class="promo-subtitle">${b.subtitle}</p>
            </div>`;
        slide.addEventListener('click', function(e) {
            addRipple(e, slide);
            if (b.link) handleBannerClick(b.link);
        });
        slider.appendChild(slide);

        const dot = document.createElement('span');
        dot.className = 'promo-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(i));
        dots.appendChild(dot);
    });
}

function addRipple(e, el) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function handleBannerClick(link) {
    if (link === 'shamcash') {
        openShamCashForm();
    } else if (typeof link === 'number') {
        filterByCategory(link);
    } else {
        showToast('📂 القسم قيد التجهيز');
    }
}

function goToSlide(index) {
    const total = STATE.banners.length;
    if (total === 0) return;
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    STATE.sliderIndex = index;
    const slider = document.getElementById('promoSlider');
    if (slider) slider.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.promo-dot').forEach((d, i) => d.classList.toggle('active', i === index));
}

function startSlider() {
    clearInterval(STATE.sliderTimer);
    STATE.sliderTimer = setInterval(() => goToSlide(STATE.sliderIndex + 1), CONFIG.sliderInterval);
}

// ==================== الأقسام والمنتجات ====================
async function loadCategories() {
    try {
        const data = await apiCall('/content/0');
        if (data.status === 'OK' && data.categories) {
            STATE.categories = [{ id: 0, name: 'الكل' }, ...data.categories];
            renderCategories();
        }
    } catch (e) {
        STATE.categories = [{ id: 0, name: 'الكل' }];
        renderCategories();
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container || STATE.categories.length === 0) return;

    container.innerHTML = STATE.categories.map(c =>
        `<span class="category-chip${STATE.activeCategory === c.id ? ' active' : ''}" onclick="filterByCategory(${c.id})">${c.name}</span>`
    ).join('');
}

async function filterByCategory(catId) {
    STATE.activeCategory = catId;
    renderCategories();
    await loadProducts(catId);
}

async function loadProducts(categoryId = 0) {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    container.innerHTML = '<div class="state-message"><i class="fa-solid fa-spinner fa-spin"></i>جاري التحميل...</div>';

    try {
        const endpoint = categoryId > 0 ? `/content/${categoryId}` : '/products';
        const data = await apiCall(endpoint);

        if (categoryId > 0 && data.status === 'OK') {
            STATE.products = data.products || [];
        } else if (Array.isArray(data)) {
            STATE.products = data;
        } else if (data.products) {
            STATE.products = data.products;
        } else {
            STATE.products = [];
        }
        renderProducts();
    } catch (e) {
        container.innerHTML = '<div class="state-message"><i class="fa-solid fa-triangle-exclamation"></i>تعذر تحميل المنتجات</div>';
    }
}

function renderProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    if (STATE.products.length === 0) {
        container.innerHTML = '<div class="state-message"><i class="fa-solid fa-box-open"></i>لا توجد منتجات في هذا القسم</div>';
        return;
    }

    let html = '<div class="products-grid">';
    STATE.products.forEach(p => {
        html += `
            <div class="product-card" onclick="createOrder(${p.id}, '${p.name || ''}')">
                <div class="product-img"><i class="fa-solid fa-box"></i></div>
                <div class="product-info">
                    <div class="product-name">${p.name || 'منتج'}</div>
                    <div class="product-price">$${parseFloat(p.price || 0).toFixed(3)}</div>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ==================== إنشاء طلب ====================
async function createOrder(productId, productName) {
    if (STATE.orderInProgress) return;
    
    const qty = 1;
    const uuid = generateUUID();
    
    STATE.orderInProgress = true;
    showToast('🔄 جاري إنشاء الطلب...');

    try {
        const data = await apiCall(`/newOrder/${productId}/params?qty=${qty}&order_uuid=${uuid}`, {
            method: 'POST',
        });

        if (data.status === 'OK') {
            showToast('✅ تم إنشاء الطلب بنجاح!');
            loadBalance();
        } else {
            showToast('⚠️ فشل إنشاء الطلب');
        }
    } catch (e) {
        showToast('⚠️ خطأ في الاتصال');
    }

    STATE.orderInProgress = false;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// ==================== السوشيال ====================
function setupSocialLinks() {
    const links = {
        instagram: CONFIG.socialLinks.instagram,
        whatsapp: CONFIG.socialLinks.whatsapp,
        telegram: CONFIG.socialLinks.telegram,
        tiktok: CONFIG.socialLinks.tiktok,
    };
    Object.entries(links).forEach(([platform, url]) => {
        const el = document.querySelector(`.social-icon.${platform}`);
        if (el) el.setAttribute('href', url);
    });
}

// ==================== التوست ====================
function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// ==================== دوال عامة ====================
window.setQRImage = function(url) {
    const c = document.getElementById('qrContainer');
    if (c) c.innerHTML = `<img src="${url}" alt="QR">`;
};
window.setHelpImage = function(url) {
    const c = document.getElementById('helpImagePlaceholder');
    if (c) c.innerHTML = `<img src="${url}" alt="تعليمات" style="width:100%;border-radius:8px;">`;
};
window.setShamCashIcon = function(url) {
    const c = document.getElementById('shamCashIcon');
    if (c) c.innerHTML = `<img src="${url}" alt="شام كاش" style="width:100%;height:100%;object-fit:contain;">`;
};

// ==================== لمس البنرات ====================
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('promoSlider');
    let startX = 0;
    slider?.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; }, { passive: true });
    slider?.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 40) {
            clearInterval(STATE.sliderTimer);
            goToSlide(STATE.sliderIndex + (diff > 0 ? 1 : -1));
            startSlider();
        }
    });
});

// ==================== بدء التطبيق ====================
document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    initBanners();
    loadCategories();
    loadProducts(0);
    setupSocialLinks();
});
