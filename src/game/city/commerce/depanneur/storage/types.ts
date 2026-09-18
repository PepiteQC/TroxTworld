export type PaymentMethod = 'cash' | 'debit' | 'credit';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameFr: string;
  category: string;
  price: number;
  stock: number;
}

export interface Transaction {
  id: string;
  receiptNo: string;
  items: Array<{ product: Product; quantity: number }>;
  subtotal: number;
  tps: number;
  tvq: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeDue?: number;
  timestamp: number;
}
