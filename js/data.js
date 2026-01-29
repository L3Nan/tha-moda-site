export async function loadProducts(){
  try {
    const res = await fetch("./data/products.json");
    const data = await res.json();
    return data.products || [];
  } catch(e) {
    console.error("Erro ao carregar produtos:", e);
    return [];
  }
}

export async function loadCategories(){
  try {
    const res = await fetch("./data/categories.json");
    const data = await res.json();
    return data.categories || [];
  } catch(e) {
    console.error("Erro ao carregar categorias:", e);
    return [];
  }
}

export function brl(value){
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function getParam(name){
  return new URLSearchParams(window.location.search).get(name);
}
