export interface Product {
  id: number;
  name: string;
  description: string;
  original_price: number;
  discount_price: number;
  discount_percent: number;
  original_link: string;
  affiliate_link: string;
  image_url: string;
  rating: number;
  sales_count: number;
  platform: string;
  created_at: string;
}

export interface Copy {
  id: number;
  product_id: number;
  title: string;
  content: string;
  variation: number;
}

export interface Settings {
  [key: string]: string;
}

export interface Analytics {
  id: number;
  product_id: number;
  clicks: number;
  conversions: number;
  date: string;
}
