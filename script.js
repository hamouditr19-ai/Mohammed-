'use strict';

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

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
];

const STATE = {
    userId: null,
    balance: 0,
    sliderIndex: 0,
    sliderTimer: null,
    activeCategory: 'all',
    products: [],
    categories: [],
    workingProxy: 0,
};

// منتجات افتراضية لو فشل الاتصال
const DEMO_PRODUCTS = [
    { id: 1, name: 'UC 60 PUBG', price: 0.104, category: 'pubg' },
    { id: 2, name: 'UC 300 PUBG', price: 0.520, category: 'pubg' },
    { id: 3, name: 'UC 600 PUBG', price: 1.040, category: 'pubg' },
    { id: 4, name: 'شحن Free Fire 100', price: 0.150, category: 'freefire' },
    { id: 5, name: 'شحن Free Fire 500', price: 0.750, category: 'freefire' },
    { id: 6, name: 'بطاقة Google Play 10$', price: 10.000, category: 'google' },
    { id: 7, name: 'بطاقة Google Play 25$', price: 25.000, category: 'google' },
    { id: 8, name: 'خدمة توصيل سريعة', price: 2.000, category: 'services' },
];

const DEMO_CATEGORIES = [
    { id: 'all', name: 'الكل' },
    { id: 'pubg', name: 'PUBG' },
    { id: 'freefire', name: 'Free Fire' },
    { id: 'google', name: 'بطاقات قوقل' },
    { id: 'services', name: 'خدمات' },
];

// ==================== API مع Proxy ====================
async function tryFetchWithProxy(endpoint, options = {}, proxyIndex = 0) {
    if (proxyIndex >= CORS_PROXIES.length) throw new Error('كل البروكسيات فشلت');
    
    const apiUrl = CONFIG.apiBaseUrl + endpoint;
    const proxyUrl = CORS_PROXIES[proxyIndex] + encodeURIComponent(apiUrl);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(proxyUrl, {
            ...options,
            signal: controller.signal,
            headers: {
                'api-token': CONFIG.apiToken,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        
        clearTimeout(timeout);
        
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        STATE.workingProxy = proxyIndex;
        return data;
    } catch (e) {
        console.warn(`Proxy ${proxyIndex + 1} فشل:`, e.message);
        return tryFetchWithProxy(endpoint, options, proxyIndex + 1);
    }
}

// ==================== Telegram ====================
function initTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        STATE.userId = '123456789';
        STATE.balance = 15.75;
    } else {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
            STATE.userId = tg.initDataUnsafe.user.id;
            loadBalanceFromAPI();
        }
    }
    updateUserUI();
}

async function loadBalanceFromAPI() {
    try {
        const data = await tryFetchWithProxy('/profile');
        if (data && data.status === 'OK') {
            STATE.balance = parseFloat(data.balance) || 0;
            updateUserUI();
        }
    } catch (e) {
        console.log('تعذر جلب الرصيد من API');
    }
}

function updateUserUI() {
    document.getElementById('displayUserId').textContent = STATE.userId || '---';
    document.getElementById('displayBalance').textContent = STATE.balance.toFixed(3);
}

// ==================== المودالات ====================
function openPaymentMethodsModal() { document.getElementById('paymentMethodsModal').classList.add('active'); }
function closePaymentMethodsModal() { document.getElementById('paymentMethodsModal').classList.remove('active'); }
function openShamCashForm() { closePaymentMethodsModal(); resetShamCashForm(); document.getElementById('shamCashModal').classList.add('active'); }
function closeShamCashModal() { document.getElementById('shamCashModal').classList.remove('active'); }
function openHelpModal() { document.getElementById('helpModal').classList.add('active'); }
function closeHelpModal() { document.getElementById('helpModal').classList.remove('active'); }

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
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// ==================== نسخ ====================
function copyAddress() {
    const addr = CONFIG.shamCashAddress;
    const btn = document.getElementById('btnCopyAddress');
    if (navigator.clipboard) {
        navigator.clipboard.writeText(addr).then(() => {
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
            showToast('✅ تم النسخ');
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<i class="fa-solid fa-copy"></i> نسخ';
            }, 2000);
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('✅ تم النسخ');
    }
}

// ==================== العملة ====================
function handleCurrencyChange() {
    document.getElementById('exchangePreview').style.display = 
        document.getElementById('currencySelect').value === 'SYP' ? 'block' : 'none';
    calculatePreview();
}
function handleAmountInput() { calculatePreview(); }
function calculatePreview() {
    const c = document.getElementById('currencySelect').value;
    const a = parseFloat(document.getElementById('amountInput').value) || 0;
    document.getElementById('previewAmount').textContent = 
        (c === 'SYP' && a > 0) ? (a / CONFIG.exchangeRate).toFixed(2) + ' USD' : '0.00 USD';
}
function handleTransactionIdInput() {
    const input = document.getElementById('transactionIdInput');
    const error = document.getElementById('transactionError');
    const help = document.getElementById('helpLink');
    input.value = input.value.replace(/\D/g, '');
    const len = input.value.length;
    error.style.display = (len > 0 && (len < 7 || len > 10)) ? 'flex' : 'none';
    help.style.display = (len >= 7 && len <= 10) ? 'none' : 'inline-flex';
}
function submitPayment() {
    const c = document.getElementById('currencySelect').value;
    const a = parseFloat(document.getElementById('amountInput').value) || 0;
    const t = document.getElementById('transactionIdInput').value;
    if (!c) return showToast('⚠️ اختر العملة');
    if (a <= 0) return showToast('⚠️ أدخل المبلغ');
    if (t.length < 7 || t.length > 10) return showToast('⚠️ رقم عملية غير صحيح');
    const btn = document.getElementById('btnSubmitPayment');
    btn.disabled = true;
    btn.textContent = 'جاري...';
    setTimeout(() => {
        STATE.balance += (c === 'SYP') ? (a / CONFIG.exchangeRate) : a;
        updateUserUI();
        showToast('🎉 تم الشحن بنجاح!');
        closeShamCashModal();
    }, 1500);
}

// ==================== البنرات ====================
function initBanners() {
    const banners = [
        { badge: '🔥 عرض', title: 'PUBG', subtitle: 'شحن فوري', link: 'pubg' },
        { badge: '⚡ خدمة', title: 'Free Fire', subtitle: 'توصيل سريع', link: 'freefire' },
        { badge: '🏦 محفظة', title: 'شام كاش', subtitle: 'شحن رصيد', link: 'shamcash' },
        { badge: '💎 عرض', title: 'بطاقات قوقل', subtitle: 'خصم 15%', link: 'google' },
    ];
    renderBanners(banners);
    startSlider();
}

function renderBanners(banners) {
    const slider = document.getElementById('promoSlider');
    const dots = document.getElementById('promoDots');
    if (!slider || !dots) return;
    slider.innerHTML = dots.innerHTML = '';
    banners.forEach((b, i) => {
        const slide = document.createElement('div');
        slide.className = 'promo-slide';
        slide.innerHTML = `<div class="promo-glow"></div><div class="promo-content"><span class="promo-badge">${b.badge}</span><h3 class="promo-title">${b.title}</h3><p class="promo-subtitle">${b.subtitle}</p></div>`;
        slide.addEventListener('click', e => { addRipple(e, slide); handleBannerClick(b.link); });
        slider.appendChild(slide);
        const dot = document.createElement('span');
        dot.className = 'promo-dot' + (i === 0 ? ' active' : '');
        dot.onclick = () => goToSlide(i);
        dots.appendChild(dot);
    });
}

function addRipple(e, el) {
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = el.getBoundingClientRect(), s = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX-rect.left-s/2}px;top:${e.clientY-rect.top-s/2}px`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
}

function handleBannerClick(link) {
    if (link === 'shamcash') openShamCashForm();
    else if (link) filterByCategory(link);
    else showToast('📂 قيد التجهيز');
}

function goToSlide(i) {
    const t = 4;
    if (i < 0) i = t - 1;
    if (i >= t) i = 0;
    STATE.sliderIndex = i;
    document.getElementById('promoSlider').style.transform = `translateX(-${i*100}%)`;
    document.querySelectorAll('.promo-dot').forEach((d, j) => d.classList.toggle('active', j === i));
}

function startSlider() {
    clearInterval(STATE.sliderTimer);
    STATE.sliderTimer = setInterval(() => goToSlide(STATE.sliderIndex + 1), CONFIG.sliderInterval);
}

// ==================== الأقسام والمنتجات ====================
async function loadCategories() {
    try {
        const data = await tryFetchWithProxy('/content/0');
        if (data && data.status === 'OK' && data.categories) {
            STATE.categories = [{ id: 'all', name: 'الكل' }, ...data.categories.map(c => ({ id: c.id.toString(), name: c.name }))];
            renderCategories();
            return;
        }
    } catch (e) {}
    
    STATE.categories = DEMO_CATEGORIES;
    renderCategories();
}

function renderCategories() {
    const c = document.getElementById('categoriesContainer');
    if (!c) return;
    c.innerHTML = STATE.categories.map(cat =>
        `<span class="category-chip${STATE.activeCategory===cat.id?' active':''}" onclick="filterByCategory('${cat.id}')">${cat.name}</span>`
    ).join('');
}

async function filterByCategory(id) {
    STATE.activeCategory = id;
    renderCategories();
    await loadProducts(id);
}

async function loadProducts(catId = 'all') {
    const c = document.getElementById('productsContainer');
    if (!c) return;
    c.innerHTML = '<div class="state-message"><i class="fa-solid fa-spinner fa-spin"></i>جاري التحميل...</div>';
    
    try {
        if (catId === 'all') {
            const data = await tryFetchWithProxy('/products');
            if (Array.isArray(data)) {
                STATE.products = data;
                renderProducts(STATE.products);
                return;
            } else if (data && data.products) {
                STATE.products = data.products;
                renderProducts(STATE.products);
                return;
            }
        } else {
            const data = await tryFetchWithProxy(`/content/${catId}`);
            if (data && data.status === 'OK' && data.products) {
                STATE.products = data.products;
                renderProducts(STATE.products);
                return;
            }
        }
    } catch (e) {}
    
    // رجوع للمنتجات التجريبية
    const filtered = catId === 'all' ? DEMO_PRODUCTS : DEMO_PRODUCTS.filter(p => p.category === catId);
    renderProducts(filtered);
}

function renderProducts(products) {
    const c = document.getElementById('productsContainer');
    if (!c) return;
    if (!products || products.length === 0) {
        c.innerHTML = '<div class="state-message"><i class="fa-solid fa-box-open"></i>لا توجد منتجات</div>';
        return;
    }
    c.innerHTML = '<div class="products-grid">' + products.map(p =>
        `<div class="product-card">
            <div class="product-img"><i class="fa-solid fa-box"></i></div>
            <div class="product-info"><div class="product-name">${p.name||'منتج'}</div><div class="product-price">$${parseFloat(p.price||0).toFixed(3)}</div></div>
        </div>`
    ).join('') + '</div>';
}

// ==================== مساعدات ====================
function setupSocialLinks() {
    const links = {
        instagram: CONFIG.socialLinks.instagram,
        whatsapp: CONFIG.socialLinks.whatsapp,
        telegram: CONFIG.socialLinks.telegram,
        tiktok: CONFIG.socialLinks.tiktok,
    };
    ['instagram','whatsapp','telegram','tiktok'].forEach(p => {
        const el = document.querySelector(`.social-icon.${p}`);
        if (el) el.href = links[p];
    });
}

function showToast(msg) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 2200);
}

window.setQRImage = url => { const c = document.getElementById('qrContainer'); if(c) c.innerHTML = `<img src="${url}" alt="QR">`; };
window.setHelpImage = url => { const c = document.getElementById('helpImagePlaceholder'); if(c) c.innerHTML = `<img src="${url}" alt="تعليمات" style="width:100%;border-radius:8px;">`; };
window.setShamCashIcon = url => { const c = document.getElementById('shamCashIcon'); if(c) c.innerHTML = `<img src="${url}" alt="شام كاش" style="width:100%;height:100%;object-fit:contain;">`; };

// ==================== لمس ====================
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('promoSlider');
    let sx = 0;
    slider?.addEventListener('touchstart', e => { sx = e.changedTouches[0].screenX; }, { passive: true });
    slider?.addEventListener('touchend', e => {
        if (Math.abs(sx - e.changedTouches[0].screenX) > 40) {
            clearInterval(STATE.sliderTimer);
            goToSlide(STATE.sliderIndex + (sx > e.changedTouches[0].screenX ? 1 : -1));
            startSlider();
        }
    });
});

// ==================== بدء ====================
document.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    initBanners();
    loadCategories();
    loadProducts('all');
    setupSocialLinks();
});
