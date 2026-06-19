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

// ==================== API ====================
async function apiCall(endpoint, options = {}) {
    const apiUrl = CONFIG.apiBaseUrl + endpoint;
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);
    
    try {
        const res = await fetch(proxyUrl, {
            method: options.method || 'GET',
            headers: {
                'api-token': CONFIG.apiToken,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            body: options.body,
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        showToast('⚠️ تعذر الاتصال بالسيرفر');
        throw e;
    }
}

// ==================== Telegram ====================
function initTelegram() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        STATE.userId = '123456789';
        updateUserUI();
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
    } catch (e) {}
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
    navigator.clipboard?.writeText(addr).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
        showToast('✅ تم النسخ');
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<i class="fa-solid fa-copy"></i> نسخ';
        }, 2000);
    }).catch(() => showToast('⚠️ فشل النسخ'));
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
    STATE.banners = [
        { badge: '🔥 عرض', title: 'PUBG', subtitle: 'شحن فوري', link: 7, bg: 0 },
        { badge: '⚡ خدمة', title: 'شام كاش', subtitle: 'شحن سريع', link: 'shamcash', bg: 1 },
        { badge: '💎 عرض', title: 'خصم 15%', subtitle: 'لفترة محدودة', link: null, bg: 2 },
        { badge: '🎁 جديد', title: 'عروض 2026', subtitle: 'اكتشف الآن', link: null, bg: 3 },
    ];
    renderBanners();
    startSlider();
}

function renderBanners() {
    const slider = document.getElementById('promoSlider');
    const dots = document.getElementById('promoDots');
    if (!slider || !dots) return;
    slider.innerHTML = dots.innerHTML = '';
    STATE.banners.forEach((b, i) => {
        const slide = document.createElement('div');
        slide.className = 'promo-slide' + (!b.link ? ' no-link' : '');
        slide.innerHTML = `<div class="promo-glow"></div><div class="promo-content"><span class="promo-badge">${b.badge}</span><h3 class="promo-title">${b.title}</h3><p class="promo-subtitle">${b.subtitle}</p></div>`;
        slide.addEventListener('click', e => { addRipple(e, slide); if (b.link) handleBannerClick(b.link); });
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
    link === 'shamcash' ? openShamCashForm() : typeof link === 'number' ? filterByCategory(link) : showToast('📂 قيد التجهيز');
}

function goToSlide(i) {
    const t = STATE.banners.length;
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
        const data = await apiCall('/content/0');
        if (data?.status === 'OK' && data.categories) {
            STATE.categories = [{ id: 0, name: 'الكل' }, ...data.categories];
            renderCategories();
        }
    } catch (e) {
        STATE.categories = [{ id: 0, name: 'الكل' }];
        renderCategories();
    }
}

function renderCategories() {
    const c = document.getElementById('categoriesContainer');
    if (!c) return;
    c.innerHTML = STATE.categories.map(cat =>
        `<span class="category-chip${STATE.activeCategory===cat.id?' active':''}" onclick="filterByCategory(${cat.id})">${cat.name}</span>`
    ).join('');
}

async function filterByCategory(id) {
    STATE.activeCategory = id;
    renderCategories();
    await loadProducts(id);
}

async function loadProducts(catId = 0) {
    const c = document.getElementById('productsContainer');
    if (!c) return;
    c.innerHTML = '<div class="state-message"><i class="fa-solid fa-spinner fa-spin"></i>جاري التحميل...</div>';
    try {
        const data = await apiCall(catId > 0 ? `/content/${catId}` : '/products');
        STATE.products = catId > 0 ? (data?.products || []) : (Array.isArray(data) ? data : (data?.products || []));
        renderProducts();
    } catch (e) {
        c.innerHTML = '<div class="state-message"><i class="fa-solid fa-triangle-exclamation"></i>تعذر تحميل المنتجات</div>';
    }
}

function renderProducts() {
    const c = document.getElementById('productsContainer');
    if (!STATE.products.length) {
        c.innerHTML = '<div class="state-message"><i class="fa-solid fa-box-open"></i>لا توجد منتجات</div>';
        return;
    }
    c.innerHTML = '<div class="products-grid">' + STATE.products.map(p =>
        `<div class="product-card" onclick="createOrder(${p.id},'${p.name||''}')">
            <div class="product-img"><i class="fa-solid fa-box"></i></div>
            <div class="product-info"><div class="product-name">${p.name||'منتج'}</div><div class="product-price">$${parseFloat(p.price||0).toFixed(3)}</div></div>
        </div>`
    ).join('') + '</div>';
}

async function createOrder(id, name) {
    if (STATE.orderInProgress) return;
    STATE.orderInProgress = true;
    showToast('🔄 جاري الطلب...');
    try {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
        const data = await apiCall(`/newOrder/${id}/params?qty=1&order_uuid=${uuid}`, { method: 'POST' });
        showToast(data?.status === 'OK' ? '✅ تم الطلب!' : '⚠️ فشل');
        if (data?.status === 'OK') loadBalance();
    } catch (e) { showToast('⚠️ خطأ'); }
    STATE.orderInProgress = false;
}

// ==================== مساعدات ====================
function setupSocialLinks() {
    ['instagram','whatsapp','telegram','tiktok'].forEach(p => {
        const el = document.querySelector(`.social-icon.${p}`);
        if (el) el.href = CONFIG.socialLinks[p];
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
    loadProducts(0);
    setupSocialLinks();
});
