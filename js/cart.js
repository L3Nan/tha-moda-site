const CART_KEY = "cart_v1";
const WHATSAPP_NUMBER = "55SEUNUMEROAQUI"; // <-- TROQUE AQUI (ex: 5531999999999)

export function cartGet(){
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}
export function cartSave(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
export function cartCount(){
  return cartGet().reduce((acc,i)=>acc+i.quantity,0);
}
export function cartTotal(){
  return cartGet().reduce((acc,i)=>acc+(i.unitPrice*i.quantity),0);
}

export function cartAdd(product, {color, size, quantity=1}){
  const cart = cartGet();

  const unitPrice = Number(product.salePrice ?? product.price);
  const image = (product.images && product.images[0]) ? product.images[0] : "";

  const key = `${product.id}__${color}__${size}`;
  const found = cart.find(i => i.key === key);

  if(found){
    found.quantity += quantity;
  }else{
    cart.push({
      key,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      color,
      size,
      unitPrice,
      quantity
    });
  }

  cartSave(cart);
}

export function cartUpdateQuantity(key, newQty){
  const cart = cartGet();
  const item = cart.find(i => i.key === key);
  if(!item) return;
  item.quantity = Math.max(1, Number(newQty || 1));
  cartSave(cart);
}

export function cartRemove(key){
  const cart = cartGet().filter(i => i.key !== key);
  cartSave(cart);
}

export function cartClear(){
  cartSave([]);
}

export function cartWhatsAppMessage({cep="", payment="", note=""} = {}){
  const cart = cartGet();
  let msg = "Olá! Quero finalizar meu pedido:%0A";

  let total = 0;
  cart.forEach((i, idx) => {
    const line = `${idx+1}) ${i.name} | Cor: ${i.color} | Tam: ${i.size} | Qtde: ${i.quantity} | ${formatMoney(i.unitPrice)}%0A`;
    msg += line;
    total += i.unitPrice * i.quantity;
  });

  msg += `%0A%0ATotal: ${formatMoney(total)}%0A`;

  if(cep) msg += `CEP: ${encodeURIComponent(cep)}%0A`;
  if(payment) msg += `Pagamento: ${encodeURIComponent(payment)}%0A`;
  if(note) msg += `Obs: ${encodeURIComponent(note)}%0A`;

  return msg;
}

export function openWhatsApp(message){
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank");
}

function formatMoney(n){
  return `R$ ${Number(n||0).toFixed(2).replace(".", ",")}`;
}
