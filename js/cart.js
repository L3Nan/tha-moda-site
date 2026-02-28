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
  
  const totalProducts = cartTotal();
  const totalGeral = totalWithShipping != null ? totalWithShipping : totalProducts;
  const shippingLabel = deliveryDetail || "A calcular";
  const itemsCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const storeName = "THA MODAS E ACESSÓRIOS";

  // Formatar CEP
  const cepFormatted = String(cep).replace(/^(\d{5})(\d{3})/, "$1-$2");

  // Sanitizar campos do usuário para remover quebras internas e caracteres perigosos
  const sanitize = (str) => String(str || "").replace(/\s*\n+\s*/g, " ").replace(/[*_~]/g, "").trim();

  const safeName = sanitize(clientName);
  const safeCity = sanitize(clientCity);
  const safeAddress = sanitize(address);
  const safeNote = sanitize(note);

  // Definir modalidade com Motoboy ou Retirada
  let deliveryModeFormatado = deliveryDetail;
  if(deliveryType === "retirar"){
    deliveryModeFormatado = "Retirada";
  } else if(deliveryType.startsWith("sp:") || deliveryType.startsWith("correios:sedex") || deliveryType.startsWith("correios:pac")){
    // Se for SP, assumimos motoboy
    if(deliveryType.startsWith("sp:")) deliveryModeFormatado = "Entrega (Motoboy)";
    else deliveryModeFormatado = deliveryDetail; // Correios mantém o nome
  }

  // Cabeçalho e Resumo
  lines.push(`🛍️ *Pedido — ${storeName}*`);
  lines.push(`📌 Resumo: ${itemsCount} itens | Produtos: ${formatMoney(totalProducts)} | Frete: ${shippingFee ? formatMoney(shippingFee) : "Grátis"} | *Total: ${formatMoney(totalGeral)}*`);
  lines.push("");

  // Lista de Itens
  lines.push(`*🧾 Itens*`);
  lines.push("");
  
  cart.forEach((i, idx) => {
    const subtotal = i.unitPrice * i.quantity;
    lines.push(`${idx + 1}) *${i.name}* (${i.color} / ${i.size})`);
    lines.push(`Qtd: ${i.quantity} × ${formatMoney(i.unitPrice)} = ${formatMoney(subtotal)}`);
    lines.push("");
  });

  // Totais Detalhados
  lines.push(`*💰 Totais*`);
  lines.push(`• Produtos: ${formatMoney(totalProducts)}`);
  lines.push(`• Frete: ${shippingFee ? formatMoney(shippingFee) : "Grátis"} (${shippingLabel})`);
  lines.push(`• *Total com frete: ${formatMoney(totalGeral)}*`);
  lines.push("");

  // Entrega
  lines.push(`*🚚 Entrega*`);
  lines.push(`• Nome: ${safeName}`);
  if(cep) lines.push(`• CEP: ${cepFormatted}`);
  if(address) lines.push(`• Endereço: ${safeAddress}`);
  if(clientCity) lines.push(`• Bairro/Cidade: ${safeCity}`);
  if(deliveryModeFormatado) lines.push(`• Modalidade: ${deliveryModeFormatado}`);
  if(shippingLabel && deliveryType !== "retirar") lines.push(`• Detalhe do frete: ${shippingLabel}`);
  lines.push("");

  // Pagamento
  if(payment){
    lines.push(`*💳 Pagamento*`);
    lines.push(`• Forma: ${payment}`);
    lines.push("");
  }

  // Observações (só se existir)
  if(safeNote){
    lines.push(`*📝 Observações*`);
    lines.push(safeNote);
    lines.push("");
  }

  // Fechamento
  lines.push(`*✅ Pode confirmar disponibilidade e prazo de entrega/retirada?*`);

  // RETORNA A MENSAGEM CRUA (sem encodeURIComponent aqui)
  return lines.join("\n");
}

export function openWhatsApp(message){
  // Faz o encodeURIComponent APENAS AQUI para garantir quebras de linha corretas (%0A)
  const encoded = encodeURIComponent(message);
  console.log("WhatsApp URL Preview (check for %0A):", encoded.substring(0, 200));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, "_blank");
}

function formatMoney(n){
  return `R$ ${Number(n||0).toFixed(2).replace(".", ",")}`;
}
