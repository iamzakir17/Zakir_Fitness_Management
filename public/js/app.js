/* Zakir Fitness Management - frontend logic
   Fields used everywhere: product_id, product_name, product_price, product_quantity, reorder_level */

const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => '\u20B9' + (parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function api(url, method = 'GET', body) {
    const opt = { method };
    if (body) { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
    const res = await fetch(url, opt);
    let json = {};
    try { json = await res.json(); } catch (e) { /* ignore */ }
    if (!res.ok || json.success === false) throw new Error(json.message || 'Request failed (' + res.status + ')');
    return json;
}

function toast(msg, type = 'ok') {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
    const icon = { ok: 'fa-circle-check', bad: 'fa-circle-xmark', warn: 'fa-circle-exclamation' }[type] || 'fa-circle-info';
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4200);
}

function confirmBox(title, text, okText) {
    return new Promise(done => {
        const m = document.createElement('div');
        m.className = 'modal';
        m.innerHTML = `<div><h3>${esc(title)}</h3><p>${text}</p><div class="acts"><button class="btn ghost" data-v="0">Cancel</button><button class="btn red" data-v="1">${esc(okText)}</button></div></div>`;
        m.addEventListener('click', e => {
            const v = e.target.dataset.v;
            if (v !== undefined || e.target === m) { m.remove(); done(v === '1'); }
        });
        document.body.appendChild(m);
    });
}

// stock helpers
const level = p => {
    const q = +p.product_quantity, r = +p.reorder_level;
    return q === 0 ? 'out' : q <= r ? 'low' : 'ok';
};
const LABEL = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };
const ICON = { ok: 'fa-circle-check', low: 'fa-triangle-exclamation', out: 'fa-circle-xmark' };
const tag = p => { const l = level(p); return `<span class="tag ${l}"><i class="fa-solid ${ICON[l]}"></i>${LABEL[l]}</span>`; };
const bar = p => {
    const q = +p.product_quantity, r = +p.reorder_level;
    const w = r > 0 ? Math.min(100, Math.round(q / (r * 2) * 100)) : (q > 0 ? 100 : 0);
    return `<div class="bar ${level(p)}"><span style="width:${w}%"></span></div>`;
};
const readForm = f => ({
    product_id: f.product_id.value.trim(),
    product_name: f.product_name.value.trim(),
    product_price: parseFloat(f.product_price.value),
    product_quantity: parseInt(f.product_quantity.value, 10),
    reorder_level: parseInt(f.reorder_level.value, 10)
});
function check(d) {
    if (!d.product_id) return 'Please enter a Product ID.';
    if (!d.product_name) return 'Please enter a Product Name.';
    if (isNaN(d.product_price) || d.product_price < 0) return 'Price must be 0 or more.';
    if (isNaN(d.product_quantity) || d.product_quantity < 0) return 'Quantity must be a whole number, 0 or more.';
    if (isNaN(d.reorder_level) || d.reorder_level < 0) return 'Reorder level must be a whole number, 0 or more.';
    return '';
}
async function busy(btn, html, fn) {
    const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + html;
    try { await fn(); } finally { btn.disabled = false; btn.innerHTML = old; }
}
const emptyBox = (icon, title, text) => `<div class="empty"><i class="fa-solid ${icon}"></i><b>${title}</b><span>${text}</span></div>`;

// ---------- page shell (sidebar + header) ----------
const NAV = [
    ['index.html', 'home', 'fa-gauge-high', 'Dashboard'],
    ['list.html', 'list', 'fa-table-list', 'All Products'],
    ['insert.html', 'insert', 'fa-circle-plus', 'Add Product'],
    ['search.html', 'search', 'fa-magnifying-glass', 'Search'],
    ['update.html', 'update', 'fa-pen-to-square', 'Update'],
    ['delete.html', 'delete', 'fa-trash-can', 'Delete'],
    ['low-stock.html', 'low-stock', 'fa-triangle-exclamation', 'Low Stock']
];

function buildShell() {
    const b = document.body, page = b.dataset.page;
    const links = NAV.map(n => `<a href="${n[0]}" class="${n[1] === page ? 'on' : ''}"><i class="fa-solid ${n[2]}"></i>${n[3]}${n[1] === 'low-stock' ? '<em id="navAlert" hidden></em>' : ''}</a>`).join('');
    const content = $('#content');
    b.insertAdjacentHTML('afterbegin', `
        <aside class="side" id="side">
            <a href="index.html" class="logo"><i class="fa-solid fa-dumbbell"></i><div><b>ZAKIR</b><small>Fitness Management</small></div></a>
            <nav class="nav">${links}</nav>
            <div class="owner"><span>Z</span><div><b>Zakir</b>Store Owner</div></div>
        </aside>
        <div class="main">
            <header class="top">
                <button class="burger" id="burger" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
                <div><h1>${esc(b.dataset.title)}</h1><p>${esc(b.dataset.sub)}</p></div>
                <button class="pill" id="dbPill" title="Click to test the database connection"><i class="dot"></i><span>Checking...</span></button>
            </header>
            <main class="wrap" id="slot"></main>
            <footer class="foot">&copy; Zakir Fitness Management &middot; Sports &amp; Fitness Equipment Inventory</footer>
        </div><div class="veil" id="veil"></div>`);
    $('#slot').appendChild(content);
    const side = $('#side'), veil = $('#veil');
    const toggle = () => { side.classList.toggle('open'); veil.classList.toggle('on'); };
    $('#burger').onclick = toggle; veil.onclick = toggle;
    $('#dbPill').onclick = async () => { await health(); toast($('#dbPill').classList.contains('up') ? 'Database is connected.' : 'Cannot reach MySQL. Check your .env file.', $('#dbPill').classList.contains('up') ? 'ok' : 'bad'); };
    health();
    api('/api/dashboard/stats').then(r => {
        const n = r.data.totalAttentionCount, el = $('#navAlert');
        if (el && n > 0) { el.textContent = n; el.hidden = false; }
    }).catch(() => {});
}

async function health() {
    const pill = $('#dbPill'); if (!pill) return;
    try {
        const r = await fetch('/api/health'); const j = await r.json();
        const ok = r.ok && j.database && j.database.success;
        pill.className = 'pill ' + (ok ? 'up' : 'down');
        pill.lastChild.textContent = ok ? 'MySQL connected' : 'MySQL offline';
    } catch (e) { pill.className = 'pill down'; pill.lastChild.textContent = 'Server offline'; }
}

// ---------- Dashboard ----------
async function pageHome() {
    try {
        const s = (await api('/api/dashboard/stats')).data;
        const cards = [
            ['fa-boxes-stacked', s.totalProducts, 'Products in catalogue', '#c8f31d'],
            ['fa-cubes', s.totalUnits.toLocaleString('en-IN'), 'Units in stock', '#38bdf8'],
            ['fa-indian-rupee-sign', Math.round(s.totalInventoryValue).toLocaleString('en-IN'), 'Inventory value', '#a78bfa'],
            ['fa-triangle-exclamation', s.totalAttentionCount, 'Need restocking', '#f59e0b']
        ];
        $('#stats').innerHTML = cards.map(c => `<div class="stat" style="--c:${c[3]}"><i class="fa-solid ${c[0]}"></i><div><b>${c[1]}</b><span>${c[2]}</span></div></div>`).join('');
        const low = (await api('/api/products/low-stock')).data.slice(0, 6);
        $('#attention').innerHTML = low.length ? low.map(p => `
            <div class="item"><span class="code">${esc(p.product_id)}</span>
            <div><b>${esc(p.product_name)}</b><small>${p.product_quantity} left &middot; reorder at ${p.reorder_level}</small></div>
            ${tag(p)}<a class="btn sm ghost" href="update.html?id=${encodeURIComponent(p.product_id)}">Restock</a></div>`).join('')
            : emptyBox('fa-circle-check', 'All stock is healthy', 'No product is at or below its reorder level.');
    } catch (e) { toast(e.message, 'bad'); }
}

// ---------- Add product ----------
function pageInsert() {
    const f = $('#f');
    const preview = () => {
        const d = readForm(f), box = $('#preview');
        if (isNaN(d.product_quantity) || isNaN(d.reorder_level)) { box.innerHTML = '<i class="fa-solid fa-circle-info"></i> Enter quantity and reorder level to preview the stock status.'; return; }
        const p = { product_quantity: d.product_quantity, reorder_level: d.reorder_level };
        box.innerHTML = tag(p) + ' ' + bar(p);
    };
    f.addEventListener('input', preview);
    f.addEventListener('reset', () => setTimeout(preview, 0));
    preview();
    f.onsubmit = async e => {
        e.preventDefault();
        const d = readForm(f), err = check(d);
        if (err) return toast(err, 'warn');
        await busy($('#save'), 'Saving...', async () => {
            try { const r = await api('/api/products', 'POST', d); toast(r.message); f.reset(); f.product_id.focus(); }
            catch (x) { toast(x.message, 'bad'); }
        });
    };
}

// ---------- All products ----------
let ALL = [];
function drawRows() {
    const term = $('#q').value.toLowerCase().trim(), st = $('#st').value, so = $('#so').value;
    let rows = ALL.filter(p => (!term || p.product_id.toLowerCase().includes(term) || p.product_name.toLowerCase().includes(term)) && (st === 'all' || level(p) === st));
    const by = {
        'id': (a, b) => a.product_id.localeCompare(b.product_id, undefined, { numeric: true }),
        'name': (a, b) => a.product_name.localeCompare(b.product_name),
        'price-asc': (a, b) => a.product_price - b.product_price,
        'price-desc': (a, b) => b.product_price - a.product_price,
        'qty-asc': (a, b) => a.product_quantity - b.product_quantity,
        'qty-desc': (a, b) => b.product_quantity - a.product_quantity
    };
    rows.sort(by[so]);
    $('#count').textContent = `Showing ${rows.length} of ${ALL.length} products`;
    $('#rows').innerHTML = rows.map(p => `<tr>
        <td><span class="code">${esc(p.product_id)}</span></td>
        <td><b>${esc(p.product_name)}</b></td>
        <td>${money(p.product_price)}</td>
        <td><b>${p.product_quantity}</b>${bar(p)}</td>
        <td>${p.reorder_level}</td>
        <td>${tag(p)}</td>
        <td><div class="acts"><a class="btn sm ghost" title="Edit" href="update.html?id=${encodeURIComponent(p.product_id)}"><i class="fa-solid fa-pen"></i> Edit</a>
        <a class="btn sm red" title="Delete" href="delete.html?id=${encodeURIComponent(p.product_id)}"><i class="fa-solid fa-trash"></i> Delete</a></div></td></tr>`).join('');
    $('#empty').hidden = rows.length > 0;
}
async function loadList() {
    try { ALL = (await api('/api/products')).data; drawRows(); }
    catch (e) { toast(e.message, 'bad'); }
}
function pageList() {
    loadList();
    ['q', 'st', 'so'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', drawRows));
    $('#rf').onclick = () => { loadList(); toast('Product list refreshed.'); };
}

// ---------- Search ----------
function pageSearch() {
    const input = $('#sq'), out = $('#results'); let timer;
    const run = async () => {
        const q = input.value.trim();
        if (!q) { out.innerHTML = emptyBox('fa-magnifying-glass', 'Search the catalogue', 'Type a product ID or part of a product name.'); $('#found').textContent = ''; return; }
        try {
            const list = (await api('/api/products?search=' + encodeURIComponent(q))).data;
            $('#found').textContent = list.length ? `${list.length} product${list.length > 1 ? 's' : ''} found for "${q}"` : '';
            out.innerHTML = list.length ? `<div class="cards">${list.map(p => `
                <div class="card pc"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="code">${esc(p.product_id)}</span>${tag(p)}</div>
                <h4>${esc(p.product_name)}</h4>
                <div class="facts"><div><small>Price</small><b>${money(p.product_price)}</b></div><div><small>In stock</small><b>${p.product_quantity}</b></div><div><small>Reorder</small><b>${p.reorder_level}</b></div></div>
                <div class="acts"><a class="btn sm ghost" href="update.html?id=${encodeURIComponent(p.product_id)}"><i class="fa-solid fa-pen"></i> Edit</a>
                <a class="btn sm red" href="delete.html?id=${encodeURIComponent(p.product_id)}"><i class="fa-solid fa-trash"></i> Delete</a></div></div>`).join('')}</div>`
                : `<div class="card">${emptyBox('fa-face-frown', 'No product found', 'Nothing matches "' + esc(q) + '". Check the ID or try another word.')}</div>`;
        } catch (e) { toast(e.message, 'bad'); }
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 280); });
    $('#sf').onsubmit = e => { e.preventDefault(); run(); };
    run();
}

// ---------- Update ----------
function pageUpdate() {
    const lk = $('#lk'), id = $('#lid'), uf = $('#uf'), card = $('#ucard');
    async function load(pid) {
        try {
            const p = (await api('/api/products/' + encodeURIComponent(pid))).data;
            ['product_id', 'product_name', 'product_price', 'product_quantity', 'reorder_level'].forEach(k => uf[k].value = p[k]);
            card.hidden = false; card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) { card.hidden = true; toast(e.message, 'bad'); }
    }
    lk.onsubmit = e => { e.preventDefault(); if (!id.value.trim()) return toast('Enter a Product ID first.', 'warn'); load(id.value.trim()); };
    const pre = new URLSearchParams(location.search).get('id');
    if (pre) { id.value = pre; load(pre); }
    uf.onsubmit = async e => {
        e.preventDefault();
        const d = readForm(uf), err = check(d);
        if (err) return toast(err, 'warn');
        await busy($('#usave'), 'Updating...', async () => {
            try { const r = await api('/api/products/' + encodeURIComponent(d.product_id), 'PUT', d); toast(r.message); }
            catch (x) { toast(x.message, 'bad'); }
        });
    };
}

// ---------- Delete ----------
function pageDelete() {
    const lk = $('#lk'), id = $('#lid'), pv = $('#pv'); let cur = null;
    async function load(pid) {
        try {
            cur = (await api('/api/products/' + encodeURIComponent(pid))).data;
            $('#pvbody').innerHTML = `<span class="code">${esc(cur.product_id)}</span> ${tag(cur)}<h4>${esc(cur.product_name)}</h4>
                <div class="facts"><div><small>Price</small><b>${money(cur.product_price)}</b></div><div><small>In stock</small><b>${cur.product_quantity}</b></div><div><small>Reorder</small><b>${cur.reorder_level}</b></div></div>`;
            pv.hidden = false; toast('Review the product before deleting.', 'warn');
        } catch (e) { cur = null; pv.hidden = true; toast(e.message, 'bad'); }
    }
    lk.onsubmit = e => { e.preventDefault(); if (!id.value.trim()) return toast('Enter a Product ID first.', 'warn'); load(id.value.trim()); };
    const pre = new URLSearchParams(location.search).get('id');
    if (pre) { id.value = pre; load(pre); }
    $('#del').onclick = async () => {
        if (!cur) return;
        if (!await confirmBox('Delete product?', `This will permanently remove <b>${esc(cur.product_name)}</b> (${esc(cur.product_id)}) from the database.`, 'Yes, delete')) return;
        try { const r = await api('/api/products/' + encodeURIComponent(cur.product_id), 'DELETE'); toast(r.message); cur = null; pv.hidden = true; id.value = ''; }
        catch (x) { toast(x.message, 'bad'); }
    };
}

// ---------- Low stock ----------
async function pageLow() {
    try {
        const list = (await api('/api/products/low-stock')).data;
        $('#lcount').textContent = list.length ? `${list.length} item${list.length > 1 ? 's' : ''} at or below the reorder level` : '';
        $('#empty').hidden = list.length > 0;
        $('#rows').innerHTML = list.map(p => `<tr>
            <td><span class="code">${esc(p.product_id)}</span></td><td><b>${esc(p.product_name)}</b></td>
            <td>${money(p.product_price)}</td><td><b>${p.product_quantity}</b>${bar(p)}</td><td>${p.reorder_level}</td>
            <td><b style="color:var(--bad)">+${Math.max(+p.deficit, 0)}</b> units</td><td>${tag(p)}</td>
            <td><a class="btn sm" href="update.html?id=${encodeURIComponent(p.product_id)}"><i class="fa-solid fa-arrow-up"></i> Restock</a></td></tr>`).join('');
    } catch (e) { toast(e.message, 'bad'); }
}

document.addEventListener('DOMContentLoaded', () => {
    buildShell();
    ({ home: pageHome, insert: pageInsert, list: pageList, search: pageSearch, update: pageUpdate, delete: pageDelete, 'low-stock': pageLow })[document.body.dataset.page]?.();
});
