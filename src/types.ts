export interface Supplier {
  id: string
  user_id: string
  slug: string
  name: string
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  must_change_password?: boolean
}

export interface Product {
  id: string
  supplier_id: string
  code: string
  description: string
  stock: number
  price: number
  image_urls: string[]
}

export interface CartItem {
  product: Product
  quantity: number
}
