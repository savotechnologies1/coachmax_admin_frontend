export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  inventoryCount: number;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  success: boolean;
  message: string;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  price: number;
  inventoryCount: number;
  images?: string[];
}

export type UpdateProductRequest = Partial<CreateProductRequest>;
