document.addEventListener("DOMContentLoaded", async ()=>{
  const products = await getProducts();
  const grid = document.getElementById("productGrid");
  if(!grid) return;

  products.forEach(p=>{
    grid.innerHTML += `
      <div class="card">
        <img src="${p.images[0]}">
        <strong>${p.name}</strong>
        <div class="price">R$ ${p.price.toFixed(2)}</div>
        <a class="btn" href="/produto.html?slug=${p.slug}">Ver produto</a>
      </div>
    `;
  });
});
