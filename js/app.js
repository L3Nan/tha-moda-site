// Helpers para barra de categorias especiais
function normText(s){
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function setUrlParam(key, value){
  const url = new URL(window.location.href);
  if(value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState({}, "", url.toString());
}
import { loadProducts, loadCategories, loadSettings, loadShipping, brl, getParam } from "./data.js";
import {
  cartAdd, cartCount, cartGet, cartRemove, cartUpdateQuantity, cartClear,
  cartTotal, cartWhatsAppMessage, openWhatsApp, setWhatsAppNumber
} from "./cart.js";

const PLACEHOLDER_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='100%25' height='100%25' fill='%23FFF3F8'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23C54886' font-family='Arial' font-size='20'>Sem imagem</text></svg>";

let productsCache = null;

document.addEventListener("DOMContentLoaded", async () => {
  injectCartCount();
  const settings = await loadSettings();
  applyBrandSettings(settings);
  if(settings?.whatsAppNumber) setWhatsAppNumber(settings.whatsAppNumber);
  setActiveNav();
  await initSearchOverlay();
  initQuickAdd();

  const page = document.body.dataset.page;

  if(page === "home") await initHome();
  if(page === "loja") await initLoja();
  if(page === "categoria") await initCategoria();
  if(page === "produto") await initProduto();
  if(page === "carrinho") await initCarrinho();
  normalizeUnsplashImages();
  normalizeProxyImages();

  // Atualiza contador ao voltar pra aba
  window.addEventListener("focus", injectCartCount);
});

function injectCartCount(){
  const el = document.getElementById("cartCount");
  if(el) el.textContent = String(cartCount());
}

function setActiveNav(){
  const path = (location.pathname || "").toLowerCase();
  const map = {
    "/loja.html": "loja",
    "/sobre.html": "sobre",
    "/contato.html": "contato"
  };
  const current = map[path] || "";
  document.querySelectorAll(".nav a").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    const key = href.replace("./", "/");
    a.classList.toggle("is-active", key === `/${current}.html`);
  });
}
function applyBrandSettings(settings){
  const storeName = settings?.storeName || "Tha Modas e Acessórios";
  document.querySelectorAll(".brand").forEach((brand) => {
    if(brand.classList.contains("hero-brand")) return;
    const textSpan = brand.querySelector("span:last-child");
    if(textSpan) textSpan.textContent = storeName;
    if(settings?.logoUrl){
      if(!brand.querySelector(".brand-logo")){
        const img = document.createElement("img");
        img.src = settings.logoUrl;
        img.alt = storeName;
        img.className = "brand-logo";
        if(textSpan) brand.insertBefore(img, textSpan);
        else brand.prepend(img);
      }
      brand.classList.add("has-logo");
    }
  });
  if(document.title.includes("Tha Moda")){
    document.title = document.title
      .replace("Tha Moda & Acessórios", storeName)
      .replace("Tha Moda", storeName);
  }
}

async function initSearchOverlay(){
  const searchToggle = document.getElementById("searchToggle");
  const searchOverlay = document.getElementById("searchOverlay");
  const searchInput = document.getElementById("searchInput");
  const searchClose = document.getElementById("searchClose");
  const searchResults = document.getElementById("searchResults");

  if(!searchToggle || !searchOverlay || !searchInput) return;

  const products = await getProductsCached();

  const renderResults = (query) => {
    const q = (query || "").trim().toLowerCase();
    if(!searchResults) return;
    if(!q){
      searchResults.innerHTML = "";
      return;
    }
    const list = products.filter(p => (p.name || "").toLowerCase().includes(q)).slice(0,8);
    if(!list.length){
      searchResults.innerHTML = `<div class="search-empty">Nenhum resultado encontrado.</div>`;
      return;
    }
    searchResults.innerHTML = list.map(p => `
      <div class="search-item">
        <a class="search-item-link" href="./produto.html?slug=${encodeURIComponent(p.slug)}">
          <div class="search-thumb">
            <img src="${resolveImage(p?.images?.[0])}" data-original="${p?.images?.[0] || ""}" onerror="handleImageError(this)" referrerpolicy="no-referrer" alt="${escapeHtml(p.name)}">
          </div>
          <div class="search-meta">
            <div class="search-name">${escapeHtml(p.name)}</div>
            <div class="search-price">${brl(priceOf(p))}</div>
          </div>
        </a>
        ${p.inStock ? `<button class="btn btn-primary search-add" type="button" data-add="${p.id}">Adicionar</button>` : ``}
      </div>
    `).join("");
  };

  searchToggle.addEventListener("click", () => {
    searchOverlay.classList.add("active");
    searchInput.focus();
  });

  searchOverlay.addEventListener("click", (e) => {
    if(e.target === searchOverlay) searchOverlay.classList.remove("active");
  });

  searchClose?.addEventListener("click", () => {
    searchOverlay.classList.remove("active");
  });

  searchInput.addEventListener("input", (e) => {
    renderResults(e.target.value);
  });

  searchInput.addEventListener("keydown", (e) => {
    if(e.key === "Escape") searchOverlay.classList.remove("active");
    if(e.key === "Enter") {
      const first = searchResults?.querySelector(".search-item-link");
      if(first){
        e.preventDefault();
        window.location.href = first.getAttribute("href");
        searchOverlay.classList.remove("active");
        return;
      }
      const q = searchInput.value.trim();
      if(q) window.location.href = `./loja.html?search=${encodeURIComponent(q)}`;
      searchOverlay.classList.remove("active");
    }
  });

}

/* ================= HOME ================= */
async function initHome(){
  const products = await loadProducts();
  const categories = await loadCategories();

  renderCategories(categories);

  renderHighlights(products);
}

function renderCategories(categories){
  const el = document.getElementById("gridCategorias");
  if(!el) return;

  el.innerHTML = categories.map(c => `
    <a class="card category-card" href="./categoria.html?slug=${encodeURIComponent(c.slug)}" style="grid-column: span 3;">
      <div class="card-body">
        <div class="card-title">${escapeHtml(c.name)}</div>
        <div class="category-link">Ver itens</div>
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

function renderHighlights(products){
  const el = document.getElementById("gridDestaques");
  if(!el) return;
  const list = products.slice(0,4);
  el.innerHTML = list.map((p, idx) => {
    const priceOld = Number(p.price ?? 0);
    const priceNew = Number(p.salePrice ?? (priceOld * 0.9));
    const installment = priceNew / 3;
    const img = resolveImage(p?.images?.[0]);

    let badgesHtml = "";
    if(p.salePrice != null) badgesHtml += `<div class="tag tag-promocao">Promo</div>`;
    if((p.tags||[]).includes("novidades")) badgesHtml += `<div class="tag tag-novidades">Novidade</div>`;
    if((p.tags||[]).includes("mais_vendidos")) badgesHtml += `<div class="tag tag-mais-vendidos">Mais Vendido</div>`;
    if(!p.inStock) badgesHtml += `<div class="tag" style="background:#000;color:#fff">Esgotado</div>`;

    return `
      <article class="highlight-card" style="grid-column: span 3;">
        <a class="highlight-media" href="./produto.html?slug=${encodeURIComponent(p.slug)}">
          <img src="${img}" data-original="${p?.images?.[0] || ""}" onerror="handleImageError(this)" referrerpolicy="no-referrer" alt="${escapeHtml(p.name)}">
        </a>
        <div class="card-badges">${badgesHtml}</div>
        <div class="highlight-body" style="padding-top: 4px;">
          <div class="highlight-name">${escapeHtml(p.name)}</div>
          <div class="highlight-prices">
            <span class="price-old">${brl(priceOld)}</span>
            <span class="price">${brl(priceNew)}</span>
          </div>
          <div class="highlight-installment">ou 3x de ${brl(installment)}</div>
          <button class="btn btn-primary highlight-btn" type="button" data-add="${p.id}">Comprar</button>
        </div>
      </article>
    `;
  }).join("");
}

/* ================= LOJA ================= */
async function initLoja(){
  const products = await getProductsCached();
  const categoryBar = document.getElementById("categoryBar");
  const grid = document.getElementById("gridLoja");

  // lê cat e search da URL (se vier do overlay que manda ?search=...)
  const initialCat = getParam("cat") || "";
  const initialSearch = getParam("search") || "";

  // categorias "de UI" (não mexe no categories.json)
  const barCats = [
    { label: "TODOS", slug: "" },
    { label: "ACESSÓRIOS", slug: "acessorios" },
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
    categoryBar.innerHTML = barCats.map((c, idx) => `
      <button type="button"
        class="category-btn${c.slug === activeCat ? " is-active" : ""}"
        data-cat="${c.slug}"
        tabindex="0"
        aria-pressed="${c.slug === activeCat ? "true" : "false"}"
        aria-label="${c.label}"
        >
        ${c.label}
      </button>
    `).join("");
  }

  function setActiveCat(slug){
    activeCat = slug;

    // atualiza URL
    setUrlParam("cat", slug);

    // re-render da barra (pra mudar ativo)
    renderCategoryBar();

    // scroll suave pro ativo
    const activeBtn = categoryBar?.querySelector(".is-active");
    activeBtn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    render();
  }

  const render = () => {
    let list = [...products];

    const cat = activeCat; // usa a barra como principal
    const q = (initialSearch || "").trim().toLowerCase();

    if(cat){
      if(cat === "tenis"){
        list = list.filter(p => p.category === "sapatos" && normText(p.name).includes("tenis"));
      } else if(cat === "sandalias"){
        list = list.filter(p => p.category === "sapatos" && normText(p.name).includes("sandalia"));
      } else {
        list = list.filter(p => p.category === cat);
      }
    }
    if(q) list = list.filter(p => (p.name||"").toLowerCase().includes(q));

    const grid = document.getElementById("gridLoja");
    if(!grid) return;

    if(!list.length){
      grid.innerHTML = `<div class="notice">Nenhum produto encontrado com esses filtros.</div>`;
      return;
    }

    grid.innerHTML = list.map(p => productCard(p)).join("");
  };

  // primeira renderização (já respeita ?cat e ?search)
  renderCategoryBar();

  // bind click events for category bar
  categoryBar?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if(!btn) return;
    setActiveCat(btn.dataset.cat || "");
  });
  // Navegação por teclado (setas esquerda/direita)
  categoryBar?.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const buttons = Array.from(categoryBar.querySelectorAll(".category-btn"));
    const current = document.activeElement;
    const idx = buttons.indexOf(current);
    if(idx === -1) return;
    let nextIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
    if(nextIdx < 0) nextIdx = 0;
    if(nextIdx >= buttons.length) nextIdx = buttons.length - 1;
    buttons[nextIdx].focus();
    e.preventDefault();
  });

  render();
}

/* ================= CATEGORIA ================= */
async function initCategoria(){
  const slug = getParam("slug");
  const products = await getProductsCached();
  const categories = await loadCategories();

  const title = document.getElementById("catTitle");
  const catName = categories.find(c => c.slug === slug)?.name;
  if(title) title.textContent = catName ? `Categoria: ${catName}` : "Categoria";

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
  const products = await getProductsCached();

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
  const btnNotify = document.getElementById("btnNotify");

  // Handle gallery clicks
  document.querySelectorAll(".thumb-btn").forEach(btn => {
      btn.addEventListener("click", function(){
          document.querySelectorAll(".thumb-btn").forEach(b => b.classList.remove("active"));
          this.classList.add("active");
          // image swap is inline in HTML for simplicity, or we can do it here
      });
  });

  if(btnNotify){
      btnNotify.addEventListener("click", () => {
          const msg = `Oi! Quero saber quando volta o ${p.name}.`;
          openWhatsApp(msg);
      });
  }

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
    showToast("Adicionado ao carrinho.", "Ir para carrinho", "./carrinho.html");
    setTimeout(() => {
      window.location.href = "./carrinho.html";
    }, 400);
  });

  function validate(){
    if(btnAdd) btnAdd.disabled = !(selectedColor && selectedSize && p.inStock);
  }

  validate();
}

/* ================= CARRINHO ================= */
async function initCarrinho(){
  const products = await getProductsCached();
  renderCartPage(products);
  const shipping = await loadShipping();

  const cepInput = document.getElementById("clientCep");
  const deliverySelect = document.getElementById("deliveryType");
  const shippingInfo = document.getElementById("shippingInfo");
  const shippingFeeValue = document.getElementById("shippingFeeValue");
  const totalWithShippingValue = document.getElementById("cartTotalWithShipping");
  const btnCheckout = document.getElementById("btnCheckout");
  const clientNameInput = document.getElementById("clientName");
  
  // Endereço automático
  const addressInput = document.getElementById("clientAddress");
  const cityInput = document.getElementById("clientCity");
  const numberInput = document.getElementById("clientNumber");

  function normalizeCep(value){
    return String(value || "").replace(/\D/g, "").slice(0, 8);
  }

  async function fetchAddress(cep){
    if(cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if(!data.erro){
        if(addressInput) addressInput.value = data.logradouro;
        if(cityInput) cityInput.value = `${data.bairro} - ${data.localidade}/${data.uf}`;
        if(numberInput) numberInput.focus();
      }
    } catch(e){
      console.error("Erro ao buscar CEP", e);
    }
  }

  function regionLabel(region){
    const map = {
      norte: "Zona Norte",
      sul: "Zona Sul",
      leste: "Zona Leste",
      oeste: "Zona Oeste"
    };
    return map[region] || region;
  }

  function detectRegion(cep){
    const mapping = shipping?.cepMapping || [];
    for(const item of mapping){
      if(cep.startsWith(item.prefix)) return item.region;
    }
    return "";
  }

  function buildDeliveryOptions(){
    if(!deliverySelect) return;
    const cep = normalizeCep(cepInput?.value);
    const region = cep.length >= 2 ? detectRegion(cep) : "";
    const options = [];

    if(region){
      const fee = Number(shipping?.spRegions?.[region] ?? 0);
      options.push({ value: `sp:${region}`, label: `Entrega SP - ${regionLabel(region)}`, fee });
    } else if(cep.length === 8 && shipping?.correios?.enabled){
      const pacFee = Number(shipping?.correios?.pac ?? 0);
      const sedexFee = Number(shipping?.correios?.sedex ?? 0);
      options.push({ value: "correios:pac", label: "Correios PAC", fee: pacFee });
      options.push({ value: "correios:sedex", label: "Correios SEDEX", fee: sedexFee });
    } else {
      options.push({ value: "", label: "Preencha o CEP para ver o frete", fee: 0, disabled: true });
    }

    options.push({ value: "retirar", label: "Retirar", fee: 0 });

    deliverySelect.innerHTML = options.map((o) => `
      <option value="${o.value}" data-fee="${o.fee}" data-label="${o.label}" ${o.disabled ? "disabled" : ""}>
        ${o.label}
      </option>
    `).join("");
  }

  function computeShipping(){
    const selected = deliverySelect?.selectedOptions?.[0];
    const fee = Number(selected?.dataset?.fee || 0);
    const label = selected?.dataset?.label || "";
    const productsTotal = cartTotal();
    const totalWithShipping = productsTotal + fee;

    if(shippingFeeValue) shippingFeeValue.textContent = brl(fee);
    if(totalWithShippingValue) totalWithShippingValue.textContent = brl(totalWithShipping);
    if(shippingInfo) shippingInfo.textContent = label ? `Frete selecionado: ${label}` : "Selecione uma opção de entrega";

    return { fee, label, totalWithShipping };
  }

  function updateCheckoutState(){
    const nameOk = Boolean(clientNameInput?.value?.trim());
    const cepOk = normalizeCep(cepInput?.value).length === 8;
    const hasItems = cartGet().length > 0;
    if(btnCheckout) btnCheckout.disabled = !(nameOk && cepOk && hasItems);
  }

  buildDeliveryOptions();
  computeShipping();
  updateCheckoutState();

  cepInput?.addEventListener("input", () => {
    const cep = normalizeCep(cepInput.value);
    if(cep.length === 8) fetchAddress(cep);
    buildDeliveryOptions();
    computeShipping();
    updateCheckoutState();
  });

  deliverySelect?.addEventListener("change", () => {
    computeShipping();
  });

  document.addEventListener("cart:updated", () => {
    computeShipping();
    updateCheckoutState();
  });

  clientNameInput?.addEventListener("input", () => {
    updateCheckoutState();
  });

  document.getElementById("btnClearCart")?.addEventListener("click", () => {
    cartClear();
    injectCartCount();
    renderCartPage(products);
  });

  btnCheckout?.addEventListener("click", () => {
    const clientName = document.getElementById("clientName")?.value || "";
    const clientCity = document.getElementById("clientCity")?.value || "";
    const address = document.getElementById("clientAddress")?.value || "";
    const number = document.getElementById("clientNumber")?.value || "";
    const complement = document.getElementById("clientComplement")?.value || "";
    const cep = normalizeCep(document.getElementById("clientCep")?.value || "");
    const deliveryType = document.getElementById("deliveryType")?.value || "";
    const payment = document.getElementById("payment")?.value || "";
    const note = document.getElementById("note")?.value || "";
    const shippingState = computeShipping();

    const fullAddress = `${address}, ${number}${complement ? " - " + complement : ""}`;

    const cart = cartGet();
    if(!cart.length){
      alert("Carrinho vazio.");
      return;
    }
    
    if(!clientName){
        alert("Por favor, preencha seu nome.");
        return;
    }
    // Se não for retirada, exige endereço
    const isRetirada = (deliveryType === "retirar");
    if(!isRetirada){
      if(!address || !number){
          alert("Preencha o endereço e número.");
          return;
      }
    }

    const deliveryDetail = shippingState?.label || "";
    const msg = cartWhatsAppMessage({
      clientName,
      clientCity,
      address: fullAddress,
      cep,
      deliveryType,
      deliveryDetail,
      shippingFee: shippingState?.fee ?? 0,
      totalWithShipping: shippingState?.totalWithShipping ?? cartTotal(),
      payment,
      note
    });
    openWhatsApp(msg);
  });
}

function renderCartPage(products = []){
  const listEl = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotalValue");
  const summaryEl = document.querySelector(".summary-card");
  const cartLayout = document.querySelector(".cart-layout");
  const shippingFeeValue = document.getElementById("shippingFeeValue");
  const totalWithShippingValue = document.getElementById("cartTotalWithShipping");
  const shippingInfo = document.getElementById("shippingInfo");
  if(!listEl || !totalEl) return;

  const cart = cartGet();
  if(!cart.length){
    const recos = products.filter(p => (p.tags||[]).includes("novidades") || (p.tags||[]).includes("mais_vendidos")).slice(0,4);
    listEl.innerHTML = `
      <div class="cart-empty" style="grid-column: span 12;">
        <div class="cart-empty-title">Seu carrinho está vazio</div>
        <div class="muted">Confira nossos destaques e monte seu pedido.</div>
        <a class="btn btn-primary" href="./loja.html">Ver produtos</a>
      </div>
      <div class="cart-empty-recos" style="grid-column: span 12;">
        <div class="section-title" style="font-size:20px">Recomendados</div>
        <div class="grid">${recos.map(p => productCard(p)).join("")}</div>
      </div>
    `;
    totalEl.textContent = "R$ 0,00";
    if(shippingFeeValue) shippingFeeValue.textContent = "R$ 0,00";
    if(totalWithShippingValue) totalWithShippingValue.textContent = "R$ 0,00";
    if(shippingInfo) shippingInfo.textContent = "Adicione itens para calcular o frete.";
    summaryEl?.classList.add("is-hidden");
    cartLayout?.classList.add("is-empty");
    return;
  }
  summaryEl?.classList.remove("is-hidden");
  cartLayout?.classList.remove("is-empty");

  listEl.innerHTML = cart.map(i => `
    <div class="card" style="grid-column: span 12;">
      <div class="card-body" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;gap:12px;align-items:center;min-width:260px">
          <div style="width:64px;height:64px;border-radius:12px;background:var(--bg-soft);overflow:hidden;border:1px solid var(--border)">
            ${i.image ? `<img src="${resolveImage(i.image)}" data-original="${i.image}" onerror="handleImageError(this)" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover">` : `<img src="${PLACEHOLDER_IMAGE}" style="width:100%;height:100%;object-fit:cover">`}
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
  document.dispatchEvent(new CustomEvent("cart:updated"));

  // bind controls
  listEl.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
    const key = b.dataset.inc;
    const item = cartGet().find(x => x.key === key);
    cartUpdateQuantity(key, (item?.quantity||1) + 1);
    injectCartCount(); renderCartPage(products);
  }));
  listEl.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
    const key = b.dataset.dec;
    const item = cartGet().find(x => x.key === key);
    cartUpdateQuantity(key, Math.max(1, (item?.quantity||1) - 1));
    injectCartCount(); renderCartPage(products);
  }));
  listEl.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => {
    cartRemove(b.dataset.remove);
    injectCartCount(); renderCartPage(products);
  }));
}

function productCard(p){
  const price = priceOf(p);
  const hasSale = p.salePrice != null;

  const rawImg = p?.images?.[0] || "";
  const img = resolveImage(rawImg);
  
  let badgesHtml = "";
  if(hasSale) badgesHtml += `<div class="tag tag-promocao">Promo</div>`;
  if((p.tags||[]).includes("novidades")) badgesHtml += `<div class="tag tag-novidades">Novidade</div>`;
  if((p.tags||[]).includes("mais_vendidos")) badgesHtml += `<div class="tag tag-mais-vendidos">Mais Vendido</div>`;
  if(!p.inStock) badgesHtml += `<div class="tag" style="background:#000;color:#fff">Esgotado</div>`;

  // if(!badgesHtml) badgesHtml = `<div class="tag">Produto</div>`; // REMOVIDO para não poluir

  return `
    <article class="card product-card" style="${!p.inStock ? "opacity:0.7" : ""}">
      <a href="./produto.html?slug=${encodeURIComponent(p.slug)}">
        <div class="img-box">
          <img src="${img}" data-original="${rawImg}" onerror="handleImageError(this)" referrerpolicy="no-referrer" alt="${escapeHtml(p.name)}">
        </div>
      </a>
      <div class="card-body">
        <div class="card-badges" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${badgesHtml}</div>
        <div class="card-title">${escapeHtml(p.name)}</div>
        <div>
          <span class="price">${brl(price)}</span>
          ${hasSale ? `<span class="price-old">${brl(p.price)}</span>` : ``}
        </div>
        <div class="muted" style="margin-top:6px">${escapeHtml(formatCategoryLabel(p.category, p.subcategory))}</div>
        <div class="card-actions">
          ${p.inStock
            ? `
              <button class="btn btn-primary btn-wide" type="button" data-add="${p.id}">Adicionar ao carrinho</button>
              <a class="btn btn-ghost btn-wide" href="./produto.html?slug=${encodeURIComponent(p.slug)}">Ver detalhes</a>
            `
            : `
              <button class="btn btn-primary btn-wide" type="button" disabled>Indisponível</button>
              <a class="btn btn-ghost btn-wide" href="./produto.html?slug=${encodeURIComponent(p.slug)}">Ver detalhes</a>
            `
          }
        </div>
      </div>
    </article>
  `;
}

function formatCategoryLabel(category, subcategory){
  const labels = {
    acessorios: "Acessórios",
    sapatos: "Sapatos",
    vestidos: "Vestidos",
    blusas: "Blusas",
    calcas: "Calças",
    saias: "Saias",
    macacao: "Macacão"
  };
  const base = labels[category] || category || "";
  if(!base) return "";
  if(subcategory){
    const sub = labels[subcategory] || String(subcategory);
    return `${base} • ${sub}`;
  }
  return base;
}

function renderProductDetail(p){
  const rawImg = p?.images?.[0] || "";
  const img = resolveImage(rawImg);
  const hasSale = p.salePrice != null;

  // Gallery thumbnails
  const thumbs = (p.images || []).map((src, i) => `
    <button type="button" class="thumb-btn ${i===0?'active':''}" onclick="document.getElementById('mainImg').src='${src}'" style="border:none;background:none;cursor:pointer;padding:0">
      <div style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <img src="${resolveImage(src)}" data-original="${src || ""}" onerror="handleImageError(this)" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover">
      </div>
    </button>
  `).join("");

  return `
    <div class="product">
      <div class="product-media">
        <div class="card" style="overflow:hidden">
          <div class="img-box" style="aspect-ratio: 4/4;">
            <img id="mainImg" src="${img}" data-original="${rawImg}" onerror="handleImageError(this)" referrerpolicy="no-referrer" alt="${escapeHtml(p.name)}">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;overflow-x:auto;padding-bottom:4px">
          ${thumbs}
        </div>

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Tabela de medidas</h3>
          <div class="notice">${escapeHtml(p.sizeGuide || "Consulte nossa tabela de medidas.")}</div>
        </div>
      </div>

      <div class="product-info">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${hasSale ? `<div class="tag tag-promocao">Promo</div>` : ""}
          ${(p.tags||[]).map(t => {
             let cls = "";
             let label = t.replace("_"," ");
             if(t === "novidades") { cls = "tag-novidades"; label = "Novidade"; }
             if(t === "mais_vendidos") { cls = "tag-mais-vendidos"; label = "Mais Vendido"; }
             if(t === "promocoes") { cls = "tag-promocao"; label = "Promo"; }
             return `<div class="tag ${cls}">${label}</div>`;
          }).join("")}
        </div>
        
        <h2 class="product-title-page" style="margin-top:10px">${escapeHtml(p.name)}</h2>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="product-price-page">${brl(priceOf(p))}</div>
          ${hasSale ? `<div class="price-old">${brl(p.price)}</div>` : ``}
        </div>

        <div class="hr"></div>

        ${p.inStock ? `
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
        ` : `
            <div class="notice" style="background:var(--bg-soft);border:1px solid var(--border);color:var(--text-1)">
                <strong>Este produto está esgotado.</strong><br>
                Entre em contato para saber quando chega reposição.
            </div>
            <button id="btnNotify" class="btn btn-primary btn-wide" type="button" style="margin-top:10px">
                Chamar no WhatsApp
            </button>
        `}

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Descrição</h3>
          <div class="notice">${escapeHtml(p.description || "")}</div>
        </div>

        <div class="section">
          <h3 class="section-title" style="font-size:18px">Detalhes</h3>
          <div class="notice">${escapeHtml(p.details || "")}</div>
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

function resolveImage(src){
  const value = String(src || "").trim();
  if(!value) return PLACEHOLDER_IMAGE;
  if(value.startsWith("https://images.weserv.nl/")) return value.replace("https://images.weserv.nl/","https://wsrv.nl/");
  if(value.startsWith("https://wsrv.nl/")) return value;
  if(value.startsWith("http://") || value.startsWith("https://")) return imageProxyUrl(value) || value;
  if(value.startsWith("/")) return value;
  return PLACEHOLDER_IMAGE;
}

function normalizeUnsplashImages(){
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if(src.includes("images.unsplash.com")){
      const proxy = imageProxyUrl(src);
      if(proxy) img.src = proxy;
    }
  });
}

function normalizeProxyImages(){
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if(src.startsWith("https://images.weserv.nl/")){
      img.src = src.replace("https://images.weserv.nl/","https://wsrv.nl/");
    }
  });
}

function imageProxyUrl(src){
  const value = String(src || "").trim();
  if(!value) return "";
  if(value.startsWith("https://images.weserv.nl/")) return value.replace("https://images.weserv.nl/","https://wsrv.nl/");
  if(value.startsWith("https://wsrv.nl/")) return value;
  if(value.startsWith("http://")) return `https://wsrv.nl/?url=${encodeURIComponent(value.replace("http://",""))}`;
  if(value.startsWith("https://")) return `https://wsrv.nl/?url=${encodeURIComponent(value.replace("https://",""))}`;
  return "";
}

function handleImageError(img){
  if(!img) return;
  const attempted = img.getAttribute("data-fallback") || "";
  const original = img.getAttribute("data-original") || "";
  if(attempted !== "proxy"){
    const proxy = imageProxyUrl(original);
    if(proxy){
      img.setAttribute("data-fallback", "proxy");
      img.src = proxy;
      return;
    }
  }
  img.src = PLACEHOLDER_IMAGE;
  img.closest(".img-box")?.classList.add("is-fallback");
}

window.handleImageError = handleImageError;

async function getProductsCached(){
  if(productsCache) return productsCache;
  productsCache = await loadProducts();
  return productsCache;
}

function initQuickAdd(){
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-add]");
    if(!btn) return;
    const id = btn.getAttribute("data-add");
    const products = await getProductsCached();
    const product = products.find(p => p.id === id);
    if(!product) return;
    if(canQuickAdd(product)){
      quickAddProduct(product, { redirect: false });
      return;
    }
    window.location.href = `./produto.html?slug=${encodeURIComponent(product.slug)}`;
  });
}

function canQuickAdd(p){
  return Boolean(p?.inStock && (p.colors||[]).length === 1 && (p.sizes||[]).length === 1);
}

function quickAddProduct(p, { redirect = false } = {}){
  if(!canQuickAdd(p)){
    window.location.href = `./produto.html?slug=${encodeURIComponent(p.slug)}`;
    return;
  }
  const color = p.colors[0];
  const size = p.sizes[0];
  cartAdd(p, { color, size, quantity: 1 });
  injectCartCount();
  showToast("Adicionado ao carrinho.", "Ir para carrinho", "./carrinho.html");
  if(redirect){
    setTimeout(() => {
      window.location.href = "./carrinho.html";
    }, 400);
  }
}

function showToast(message, actionLabel, actionHref){
  let toast = document.getElementById("toast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div class="toast-body">
      <div class="toast-message">${escapeHtml(message)}</div>
      ${actionLabel && actionHref ? `<a class="btn btn-primary" href="${actionHref}">${actionLabel}</a>` : ""}
    </div>
  `;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2500);
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
