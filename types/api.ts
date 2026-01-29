export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "restaurant" | "rider" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  owner?: User;
  menu_items?: MenuItem[];
  created_at: string;
  updated_at: string;
}

export interface MenuItemRatings {
  average: number | null;
  count: number;
  user_rating: {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  restaurant?: Store;
  ratings?: MenuItemRatings;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "preparing"
  | "on_the_way"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed";

export interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  menu_item?: MenuItem;
}

export interface Payment {
  id: number;
  order_id: number;
  reference?: string;
  status?: string;
  amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer?: User;
  restaurant?: Store;
  rider?: User;
  total_amount: number;
  total?: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_address: string | null;
  notes: string | null;
  order_items?: OrderItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface Favourite {
  id: number;
  user_id: number;
  menu_item_id: number;
  menu_item: MenuItem & { restaurant?: Store };
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: number;
  user_id: number;
  menu_item_id: number;
  rating: number;
  comment: string | null;
  user: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrors {
  [field: string]: string[];
}

export interface ApiErrorResponse {
  message: string;
  errors?: ApiErrors;
}
