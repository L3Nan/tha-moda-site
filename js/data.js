async function getProducts(){
  const res = await fetch("/data/products.json");
  return await res.json();
}

async function getCategories(){
  const res = await fetch("/data/categories.json");
  return await res.json();
}
