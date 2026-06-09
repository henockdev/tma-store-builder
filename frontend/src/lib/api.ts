// Centralized API client. Reads NEXT_PUBLIC_API_BASE_URL at build time.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type Product = {
  id: string;
  merchant_id: string;
  name: string;
  name_am?: string;
  description: string;
  description_am?: string;
  price_etb: number;
  image_url: string;
  images?: string[];
  stock: number;
  category: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Store = {
  id: string;
  store_name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  phone: string;
  language: "en" | "am";
};

export type Order = {
  id: string;
  merchant_id: string;
  tx_ref: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "failed";
  items: Array<{
    product_id: string;
    name: string;
    price_etb: number;
    quantity: number;
    image_url: string;
  }>;
  subtotal_etb: number;
  shipping_etb: number;
  total_etb: number;
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  notes: string;
  payment_method: string;
  created_at: string;
};

export type Stats = {
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  revenue_etb: number;
  active_products: number;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = typeof window !== "undefined" ? localStorage.getItem("merchant_token") : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export const api = {
  baseURL: API_BASE,
  // Public
  getStore: (slug: string) => request<Store>(`/api/v1/store/${encodeURIComponent(slug)}`),
  getProducts: (slug: string) =>
    request<{ products: Product[]; count: number }>(
      `/api/v1/store/${encodeURIComponent(slug)}/products`
    ),
  createOrder: (body: {
    merchant_slug: string;
    items: Array<{ product_id: string; name: string; price_etb: number; quantity: number; image_url: string }>;
    customer_name: string;
    customer_phone: string;
    delivery_area: string;
    notes: string;
    payment_method: string;
    language: string;
  }) => request<{ order_id: string; tx_ref: string; total_etb: number; status: string; checkout_url: string }>(
    `/api/v1/orders`,
    { method: "POST", body: JSON.stringify(body) }
  ),
  initializeChapa: (body: { order_id: string; return_url: string; callback_url: string }) =>
    request<{ checkout_url: string; tx_ref: string }>(`/api/v1/chapa/initialize`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getOrder: (id: string) => request<Order>(`/api/v1/orders/${id}`),

  // Merchant auth
  registerMerchant: (body: { email: string; password: string; store_name: string; description?: string; phone?: string; language?: string }) =>
    request<{ token: string; merchant: { id: string; email: string; store_name: string; slug: string; language: string } }>(
      `/api/v1/merchants/register`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  loginMerchant: (body: { email: string; password: string }) =>
    request<{ token: string; merchant: { id: string; email: string; store_name: string; slug: string; language: string } }>(
      `/api/v1/merchants/login`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  me: () => request<Store & { email: string }>(`/api/v1/merchant/me`),

  // Merchant catalog
  myProducts: () => request<{ products: Product[]; count: number }>(`/api/v1/merchant/products`),
  createProduct: (body: Partial<Product>) =>
    request<Product>(`/api/v1/merchant/products`, { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Partial<Product>) =>
    request<{ success: boolean }>(`/api/v1/merchant/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: string) =>
    request<{ success: boolean }>(`/api/v1/merchant/products/${id}`, { method: "DELETE" }),

  // Merchant orders
  myOrders: () => request<{ orders: Order[]; count: number }>(`/api/v1/merchant/orders`),
  updateOrderStatus: (id: string, status: string) =>
    request<{ success: boolean }>(`/api/v1/merchant/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  stats: () => request<Stats>(`/api/v1/merchant/stats`),
};
