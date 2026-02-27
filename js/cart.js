const CART_KEY = "cart_v1";
let WHATSAPP_NUMBER = "5511999999999";

export function setWhatsAppNumber(value){
  if(value) WHATSAPP_NUMBER = String(value);
}

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

export function cartWhatsAppMessage({
  clientName="",
  clientCity="",
  address="",
  cep="",
  deliveryType="",
  deliveryDetail="",
  shippingFee=null,
  totalWithShipping=null,
  payment="",
  note=""
} = {}){
  const cart = cartGet();
  let lines = [];
  lines.push("Oi! Quero fechar esse pedido na THA MODAS E ACESSÓRIOS 🛍️");
  lines.push("");

  let total = 0;
  cart.forEach((i) => {
    const subtotal = i.unitPrice * i.quantity;
    lines.push(`*${i.name}* — ${i.color}/${i.size}`);
    lines.push(`Qtd: ${i.quantity} | Unit: ${formatMoney(i.unitPrice)} | Sub: ${formatMoney(subtotal)}`);
    lines.push("");
    total += subtotal;
  });

  lines.push(`*Total de produtos: ${formatMoney(total)}*`);
  if(shippingFee != null) lines.push(`*Frete: ${formatMoney(shippingFee)}*`);
  if(totalWithShipping != null) lines.push(`*Total com frete: ${formatMoney(totalWithShipping)}*`);
  lines.push("");

  if(clientName) lines.push(`*Nome:* ${clientName}`);
  if(cep) lines.push(`*CEP:* ${cep}`);
  if(clientCity) lines.push(`*Bairro/Cidade:* ${clientCity}`);
  if(address) lines.push(`*Endereço:* ${address}`);
  if(deliveryType) lines.push(`*Entrega/Retirada:* ${deliveryType}`);
  if(deliveryDetail) lines.push(`*Detalhe do frete:* ${deliveryDetail}`);
  if(payment) lines.push(`*Pagamento:* ${payment}`);
  if(note) lines.push(`*Obs:* ${note}`);

  return encodeURIComponent(lines.join("\n"));
}

export function openWhatsApp(message){
  // message is already encoded
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank");
}

function formatMoney(n){
  return `R$ ${Number(n||0).toFixed(2).replace(".", ",")}`;
}
