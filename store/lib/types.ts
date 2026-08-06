export type Role = 'customer' | 'admin' | 'manager' | 'delivery';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod =
  | 'cash_on_delivery'
  | 'deposit'
  | 'bank_transfer'
  | 'local_wallet';

export interface Banner {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  image_url: string;
  cta_label: string | null;
  cta_link: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface Category {
  id: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  is_active?: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  title_ar: string;
  description_ar: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  images: string[];
  sizes: string[];
  is_featured: boolean;
  is_active?: boolean;
  barcode?: string | null;
  category?: Category;
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  title_ar: string;
  unit_price: number;
  size: string | null;
  quantity: number;
}

export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  provider: string | null;
  reference: string | null;
  note?: string | null;
  proof_url?: string | null;
  ocr_status?: 'pending' | 'verified' | 'rejected' | null;
  ocr_data?: Record<string, unknown> | null;
  paid_at: string | null;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id?: string;
  total_amount: number;
  status: OrderStatus;
  shipping_address: string;
  gps_coordinates?: { x: number; y: number } | null;
  deposit_paid: boolean;
  assigned_to?: string | null;
  note?: string | null;
  created_at: string;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  items?: OrderItem[];
  payments?: Transaction[];
}

export interface CreateOrderInput {
  shipping_address: string;
  note?: string;
  lat?: number;
  lng?: number;
  items: { product_id: string; size: string; quantity: number }[];
}
