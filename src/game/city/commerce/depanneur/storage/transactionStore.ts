import { create } from 'zustand';
import type { Product, PaymentMethod, Transaction } from './types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface TransactionStoreState {
  cart: CartItem[];
  cartSubtotal: number;
  cartTPS: number;
  cartTVQ: number;
  cartTotal: number;
  addToCart: (product: Product, quantity?: number) => void;
  clearCart: () => void;
  checkout: (method: PaymentMethod, money: number) => Transaction | null;
}

export const useTransactionStore = create<TransactionStoreState>((set, get) => ({
  cart: [],
  cartSubtotal: 0,
  cartTPS: 0,
  cartTVQ: 0,
  cartTotal: 0,
  addToCart: (product, quantity = 1) => set((state) => {
    const existingIndex = state.cart.findIndex((i) => i.product.id === product.id);
    let newCart: CartItem[];
    if (existingIndex >= 0) {
      newCart = state.cart.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      newCart = [...state.cart, { product, quantity }];
    }
    const subtotal = newCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const total = subtotal + tps + tvq;
    return {
      cart: newCart,
      cartSubtotal: subtotal,
      cartTPS: tps,
      cartTVQ: tvq,
      cartTotal: total,
    };
  }),
  clearCart: () => set({
    cart: [],
    cartSubtotal: 0,
    cartTPS: 0,
    cartTVQ: 0,
    cartTotal: 0,
  }),
  checkout: (method, money) => {
    const { cart, cartSubtotal, cartTPS, cartTVQ, cartTotal } = get();
    if (cart.length === 0 || money < cartTotal) return null;
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      items: [...cart],
      subtotal: cartSubtotal,
      tps: cartTPS,
      tvq: cartTVQ,
      total: cartTotal,
      paymentMethod: method,
      amountPaid: money,
      changeDue: method === 'cash' ? money - cartTotal : 0,
      timestamp: Date.now(),
    };
    get().clearCart();
    return tx;
  },
}));
