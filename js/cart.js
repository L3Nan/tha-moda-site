const CART_KEY = "cart_v1";

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(product, color, size){
  const cart = getCart();
  const key = product.id + color + size;
  const item = cart.find(i => i.key === key);

  if(item){
    item.quantity++;
  }else{
    cart.push({
      key,
      productId: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      color,
      size,
      quantity: 1
    });
  }
  saveCart(cart);
}
