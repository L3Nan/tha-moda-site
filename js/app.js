import { loadProducts, loadCategories, brl, getParam } from "./data.js";
import {
  cartAdd, cartCount, cartGet, cartRemove, cartUpdateQuantity, cartClear,
  cartTotal, cartWhatsAppMessage, openWhatsApp
} from "./cart.js";

document.addEventListener("DOMContentLoaded", async () => {
  injectCartCount();

  // Search functionality
  const searchToggle = document.getElementById("searchToggle");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchInput = document.getElementById("searchInput");

  if(searchToggle && searchOverlay){
    searchToggle.addEventListener("click", () => {
      searchOverlay.classList.add("active");
      searchInput.focus();
    });

    searchOverlay.addEventListener("click", (e) => {
      if(e.target === searchOverlay) searchOverlay.classList.remove("active");
    });

    searchInput.addEventListener("keydown", (e) => {
      if(e.key === "Escape") searchOverlay.classList.remove("active");
      if(e.key === "Enter") {
        const q = searchInput.value.trim();
        if(q) window.location.href = `./loja.html?search=${encodeURIComponent(q)}`;
        searchOverlay.classList.remove("active");
      }
    });
  }

  const page = document.body.dataset.page;

  if(page === "home") await initHome();
  if(page === "loja") await initLoja();
  if(page === "categoria") await initCategoria();
  if(page === "produto") await initProduto();
  if(page === "carrinho") await initCarrinho();

  // Atualiza contador ao voltar pra aba
  window.addEventListener("focus", injectCartCount);
});

function injectCartCount(){
  const el = document.getElementById("cartCount");
  if(el) el.textContent = String(cartCount());
}

/* ================= HOME ================= */
async function initHome(){
  const products = await loadProducts();
  const categories = await loadCategories();

  renderCategories(categories);

  renderProductsSection("gridNovidades", products.filter(p => (p.tags||[]).includes("novidades")).slice(0,8));
  renderProductsSection("gridPromocoes", products.filter(p => p.salePrice).slice(0,8));
  renderProductsSection("gridMaisVendidos", products.filter(p => (p.tags||[]).includes("mais_vendidos")).slice(0,8));
}

function renderCategories(categories){
  const el = document.getElementById("gridCategorias");
  if(!el) return;

  el.innerHTML = categories.map(c => `
    <a class="card" href="./categoria.html?slug=${encodeURIComponent(c.slug)}" style="grid-column: span 3;">
      <div class="card-body">
        <div class="tag">Categoria</div>
        <div class="card-title">${escapeHtml(c.name)}</div>
        <div class="muted">Ver itens</div>
      </div>
    </a>
  `).join("");
}

function renderProductsSection(targetId, list){
  const el = document.getElementById(targetId);
  if(!el) return;

  if(!list.length){
    el.innerHTML = `<div class="notice">Nenhum item disponível no momento.</div>`;
    return;
  }

  el.innerHTML = list.map(p => productCard(p)).join("");
}

/* ================= LOJA ================= */
async function initLoja(){
  const products = await loadProducts();
  const categories = await loadCategories();

  // Renderizar vitrine com produtos em destaque
  renderProductsSection("gridVitrine", products.slice(0, 12)); // Mostra os primeiros 12 produtos como vitrine

  const categoryBar = document.getElementById("categoryBar");
  const selCat = document.getElementById("filterCategory");
  const selSize = document.getElementById("filterSize");
  const selColor = document.getElementById("filterColor");
  const onlySale = document.getElementById("filterSale");
  const search = document.getElementById("filterSearch");
  const sort = document.getElementById("filterSort");

  // lê cat e search da URL (se vier do overlay que manda ?search=...)
  const initialCat = getParam("cat") || "";
  const initialSearch = getParam("search") || "";
  if(initialSearch && search) search.value = initialSearch;

  // categorias "de UI" (não mexe no categories.json)
  const barCats = [
    { label: "TODOS", slug: "" },
    { label: "BRINCOS", slug: "brincos" },
    { label: "PULSEIRAS & COLARES", slug: "pulseiras-colares" },
    { label: "SAPATOS", slug: "sapatos" },
    { label: "TÊNIS", slug: "tenis" },
    { label: "SANDÁLIAS", slug: "sandalias" },
    { label: "VESTIDOS", slug: "vestidos" },
    { label: "BLUSAS", slug: "blusas" },
    { label: "CALÇAS", slug: "calcas" },
    { label: "SAIAS", slug: "saias" },
    { label: "MACACÃO", slug: "macacao" },
  ];

  let activeCat = initialCat; // estado principal

  function renderCategoryBar(){
    if(!categoryBar) return;

    categoryBar.innerHTML = barCats.map(c => `
      <button type="button"
        class="category-btn ${c.slug === activeCat ? "is-active" : ""}"
        data-cat="${c.slug}">
        ${c.label}
      </button>
    `).join("");
  }

  function setActiveCat(slug){
    activeCat = slug;

    // sincroniza o select quando for categoria "real"
    // (para pulseiras-colares/tenis/sandalias deixamos select em branco)
    const isReal = categories.some(c => c.slug === slug);
    selCat.value = isReal ? slug : "";

    // atualiza URL
    setUrlParam("cat", slug);

    // re-render da barra (pra mudar ativo)
    renderCategoryBar();

    // scroll suave pro ativo
    const activeBtn = categoryBar?.querySelector(".is-active");
    activeBtn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    render();
  }

  // popula categorias
  selCat.innerHTML = `<option value="">Todas</option>` + categories.map(c => `<option value="${c.slug}">${escapeHtml(c.name)}</option>`).join("");

  // popula tamanhos e cores a partir dos produtos (união)
  const allSizes = uniq(products.flatMap(p => p.sizes || [])).sort();
  const allColors = uniq(products.flatMap(p => p.colors || [])).sort();

  selSize.innerHTML = `<option value="">Todos</option>` + allSizes.map(s => `<option value="${s}">${s}</option>`).join("");
  selColor.innerHTML = `<option value="">Todas</option>` + allColors.map(c => `<option value="${c}">${escapeHtml(c)}</option>`).join("");

  const render = () => {
    let list = [...products];

    const cat = activeCat; // usa a barra como principal
    const size = selSize.value;
    const color = selColor.value;
    const sale = onlySale.checked;
    const q = (search.value || "").trim().toLowerCase();

    if(cat){
      if(cat === "pulseiras-colares"){
        list = list.filter(p => p.category === "pulseiras" || p.category === "colares");
      } else if(cat === "tenis"){
        list = list.filter(p => p.category === "sapatos" && normText(p.name).includes("tenis"));
      } else if(cat === "sandalias"){
        list = list.filter(p => p.category === "sapatos" && normText(p.name).includes("sandalia"));
      } else {
        list = list.filter(p => p.category === cat);
      }
    }
    if(size) list = list.filter(p => (p.sizes||[]).includes(size));
    if(color) list = list.filter(p => (p.colors||[]).includes(color));
    if(sale) list = list.filter(p => !!p.salePrice);
    if(q) list = list.filter(p => (p.name||"").toLowerCase().includes(q));

    // sort
    const s = sort.value;
    if(s === "price-asc") list.sort((a,b) => priceOf(a)-priceOf(b));
    if(s === "price-desc") list.sort((a,b) => priceOf(b)-priceOf(a));
    if(s === "sale") list.sort((a,b) => Number(!!b.salePrice) - Number(!!a.salePrice));

    const grid = document.getElementById("gridLoja");
    if(!grid) return;

    if(!list.length){
      grid.innerHTML = `<div class="notice">Nenhum produto encontrado com esses filtros.</div>`;
      return;
    }

    grid.innerHTML = list.map(p => productCard(p)).join("");
  };

  [selCat, selSize, selColor, onlySale, sort].forEach(x => x.addEventListener("change", render));
  search.addEventListener("input", render);

  // se o usuário mexer no select manualmente, a barra acompanha
  selCat.addEventListener("change", () => {
    activeCat = selCat.value || "";
    setUrlParam("cat", activeCat);
    renderCategoryBar();
    render();
  });

  // primeira renderização (já respeita ?cat e ?search)
  renderCategoryBar();

  // bind click events for category bar
  categoryBar?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if(!btn) return;
    setActiveCat(btn.dataset.cat || "");
  });

  render();
}

/* ================= CATEGORIA ================= */
async function initCategoria(){
  const slug = getParam("slug");
  const products = await loadProducts();

  const title = document.getElementById("catTitle");
  if(title) title.textContent = slug ? `Categoria: ${slug}` : "Categoria";

  const grid = document.getElementById("gridCategoria");
  if(!grid) return;

  const list = slug ? products.filter(p => p.category === slug) : products;
  if(!list.length){
    grid.innerHTML = `<div class="notice">Nenhum produto nessa categoria.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => productCard(p)).join("");
}

/* ================= PRODUTO ================= */
async function initProduto(){
  const slug = getParam("slug");
  const products = await loadProducts();

  const p = products.find(x => x.slug === slug);
  const wrap = document.getElementById("productWrap");
  if(!wrap) return;

  if(!p){
    wrap.innerHTML = `<div class="notice">Produto não encontrado.</div>`;
    return;
  }

  wrap.innerHTML = renderProductDetail(p);
  bindProductDetail(p);
}

function bindProductDetail(p){
  let selectedColor = "";
  let selectedSize = "";
  let qty = 1;

  const colorWrap = document.getElementById("colors");
  const sizeWrap = document.getElementById("sizes");
  const qtyInput = document.getElementById("qtyInput");
  const btnAdd = document.getElementById("btnAddCart");

  colorWrap?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if(!b) return;
    selectedColor = b.dataset.color;
    setPressed(colorWrap, "data-color", selectedColor);
    validate();
  });

  sizeWrap?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-size]");
    if(!b) return;
    selectedSize = b.dataset.size;
    setPressed(sizeWrap, "data-size", selectedSize);
    validate();
  });

  document.getElementById("qtyMinus")?.addEventListener("click", () => {
    qty = Math.max(1, Number(qtyInput.value || 1) - 1);
    qtyInput.value = String(qty);
  });
  document.getElementById("qtyPlus")?.addEventListener("click", () => {
    qty = Math.min(99, Number(qtyInput.value || 1) + 1);
    qtyInput.value = String(qty);
  });

  btnAdd?.addEventListener("click", () => {
    qty = Math.max(1, Number(qtyInput.value || 1));
    if(!selectedColor || !selectedSize){
      alert("Selecione cor e tamanho.");
      return;
    }
    cartAdd(p, { color: selectedColor, size: selectedSize, quantity: qty });
    injectCartCount();
    alert("Adicionado ao carrinho.");
  });

  function validate(){
    if(btnAdd) btnAdd.disabled = !(selectedColor && selectedSize && p.inStock);
  }

  validate();
}

/* ================= CARRINHO ================= */
async function initCarrinho(){
  renderCartPage();

  document.getElementById("btnClearCart")?.addEventListener("click", () => {
    cartClear();
    injectCartCount();
    renderCartPage();
  });

  document.getElementById("btnCheckout")?.addEventListener("click", () => {
    const cep = document.getElementById("cep")?.value || "";
    const payment = document.getElementById("payment")?.value || "";
    const note = document.getElementById("note")?.value || "";

    const cart = cartGet();
    if(!cart.length){
      alert("Carrinho vazio.");
      return;
    }

    const msg = cartWhatsAppMessage({ cep, payment, note });
    openWhatsApp(msg);
  });
}

function renderCartPage(){
  const listEl = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotalValue");
  if(!listEl || !totalEl) return;

  const cart = cartGet();
  if(!cart.length){
    listEl.innerHTML = `<div class="notice">Seu carrinho está vazio. <a class="kbd" href="./loja.html">Ir para loja</a></div>`;
    totalEl.textContent = "R$ 0,00";
    return;
  }

  listEl.innerHTML = cart.map(i => `
    <div class="card" style="grid-column: span 12;">
      <div class="card-body" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;gap:12px;align-items:center;min-width:260px">
          <div style="width:64px;height:64px;border-radius:12px;background:var(--bg-soft);overflow:hidden;border:1px solid var(--border)">
            ${i.image ? `<img src="${i.image}" style="width:100%;height:100%;object-fit:cover">` : ""}
          </div>
          <div>
            <div style="font-weight:900">${escapeHtml(i.name)}</div>
            <div class="muted">Cor: ${escapeHtml(i.color)} | Tam: ${escapeHtml(i.size)}</div>
            <div style="font-weight:900">${brl(i.unitPrice)}</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-ghost" data-dec="${i.key}">-</button>
          <input class="kbd" style="width:70px;text-align:center" value="${i.quantity}" data-qty="${i.key}">
          <button class="btn btn-ghost" data-inc="${i.key}">+</button>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <div style="font-weight:900">${brl(i.unitPrice * i.quantity)}</div>
          <button class="btn btn-ghost" data-remove="${i.key}">Remover</button>
        </div>
      </div>
    </div>
  `).join("");

  totalEl.textContent = brl(cartTotal());

  // bind controls
  listEl.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
    const key = b.dataset.inc;
    const item = cartGet().find(x => x.key === key);
    cartUpdateQuantity(key, (item?.quantity||1) + 1);
    injectCartCount(); renderCartPage();
  }));
  listEl.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
    const key = b.dataset.dec;
    const item = cartGet().find(x => x.key === key);
    cartUpdateQuantity(key, Math.max(1, (item?.quantity||1) - 1));
    injectCartCount(); renderCartPage();
  }));
  listEl.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
    cartRemove(b.dataset.remove);
    injectCartCount(); renderCartPage();
  }));
}

function productCard(p){
  const price = priceOf(p);
  const hasSale = p.salePrice != null;

  const img = (p.images && p.images[0]) ? p.images[0] : "";
  const badge = hasSale ? `<div class="tag">Promo</div>` : `<div class="tag">Produto</div>`;

  return `
    <article class="card">
      <a href="./produto.html?slug=${encodeURIComponent(p.slug)}">
        <div class="img-box">
          ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-soft);color:var(--text-2);font-size:14px;">📦 Produto</div>`}
        </div>
      </a>
      <div class="card-body">
        ${badge}
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div>
          <span class="price">${brl(price)}</span>
          ${hasSale ? `<span class="price-old">${brl(p.price)}</span>` : ``}
        </div>
        <div class="muted" style="margin-top:6px">${escapeHtml((p.category||"").toUpperCase())}</div>
        <div style="margin-top:10px">
          <a class="btn btn-primary btn-wide" href="./produto.html?slug=${encodeURIComponent(p.slug)}">Ver produto</a>
        </div>
      </div>
    </article>
  `;
}

function renderProductDetail(p){
  const img = (p.images && p.images[0]) ? p.images[0] : "";
  const hasSale = p.salePrice != null;

  return `
    <div class="product">
      <div class="product-media">
        <div class="card" style="overflow:hidden">
          <div class="img-box" style="aspect-ratio: 4/4;">
            ${img ? `<img src="${img}" alt="${escapeHtml(p.name)}">` : ``}
          </div>
        </div>

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Tabela de medidas</h3>
          <div class="notice">${escapeHtml(p.sizeGuide || "Consulte nossa tabela de medidas.")}</div>
        </div>
      </div>

      <div class="product-info">
        <div class="tag">${hasSale ? "Promoção" : "Produto"}</div>
        <h2 class="section-title" style="margin-top:10px">${escapeHtml(p.name)}</h2>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="price" style="font-size:22px">${brl(priceOf(p))}</div>
          ${hasSale ? `<div class="price-old">${brl(p.price)}</div>` : ``}
        </div>

        <div class="hr"></div>

        <div>
          <label>Cor</label>
          <div class="chips" id="colors">
            ${(p.colors||[]).map(c => `<button class="chip" type="button" aria-pressed="false" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
          </div>
        </div>

        <div style="margin-top:14px">
          <label>Tamanho</label>
          <div class="chips" id="sizes">
            ${(p.sizes||[]).map(s => `<button class="chip" type="button" aria-pressed="false" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("")}
          </div>
        </div>

        <div class="qty">
          <button id="qtyMinus" type="button">-</button>
          <input id="qtyInput" value="1" inputmode="numeric">
          <button id="qtyPlus" type="button">+</button>
        </div>

        <div style="margin-top:14px;display:grid;grid-template-columns:1fr;gap:10px">
          <button id="btnAddCart" class="btn btn-primary btn-wide" type="button">Adicionar ao carrinho</button>
          <a class="btn btn-ghost btn-wide" href="./carrinho.html">Ir para o carrinho</a>
        </div>

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Descrição</h3>
          <div class="notice">${escapeHtml(p.description || "")}</div>
        </div>

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Detalhes</h3>
          <div class="notice">${escapeHtml(p.details || "")}</div>
        </div>

        <div class="section">
          <div class="notice">
            <strong>Status:</strong>
            ${p.inStock ? `<span style="color:var(--success);font-weight:900">Em estoque</span>` : `<span style="color:var(--danger);font-weight:900">Esgotado</span>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function setPressed(container, attr, value){
  container.querySelectorAll(`[${attr}]`).forEach(el => {
    const v = el.getAttribute(attr);
    el.setAttribute("aria-pressed", String(v === value));
  });
}

function priceOf(p){
  return Number(p.salePrice ?? p.price ?? 0);
}

function uniq(arr){
  return Array.from(new Set(arr.filter(Boolean)));
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
