// أنواع TypeScript المطابقة لمخطط قاعدة بيانات أبو بشار ستورز.
// ملاحظة: في Supabase يمكن توليد هذا الملف تلقائياً عبر:
//   npx supabase gen types typescript --project-id <id> > types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          role: 'customer' | 'admin' | 'manager' | 'delivery';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          full_name: string;
          phone: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          name_ar: string;
          slug: string;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['categories']['Row'], 'id'>> & {
          name_ar: string;
          slug: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      products: {
        Row: {
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
          is_active: boolean;
          barcode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['products']['Row'], 'id'>> & {
          title_ar: string;
          price: number;
        };
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      banners: {
        Row: {
          id: string;
          title_ar: string;
          subtitle_ar: string | null;
          image_url: string;
          cta_label: string | null;
          cta_link: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['banners']['Row'], 'id'>> & {
          title_ar: string;
          image_url: string;
        };
        Update: Partial<Database['public']['Tables']['banners']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          customer_id: string;
          total_amount: number;
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          shipping_address: string;
          gps_coordinates: { x: number; y: number } | null;
          deposit_paid: boolean;
          assigned_to: string | null;
          note: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'order_number'>> & {
          customer_id: string;
          shipping_address: string;
          total_amount?: number;
        };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          title_ar: string;
          unit_price: number;
          size: string | null;
          quantity: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
      };
      transactions: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          method: 'cash_on_delivery' | 'deposit' | 'bank_transfer' | 'local_wallet';
          status: 'pending' | 'paid' | 'failed' | 'refunded';
          provider: string | null;
          reference: string | null;
          note: string | null;
          proof_url: string | null;
          ocr_status: 'pending' | 'verified' | 'rejected' | null;
          ocr_data: Json | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>> & {
          order_id: string;
          amount: number;
          method: Database['public']['Tables']['transactions']['Row']['method'];
        };
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      cart: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          size: string | null;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cart']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cart']['Row']>;
      };
    };
    Functions: {
      create_order_atomic: {
        Args: {
          p_shipping_address: string;
          p_items: Json;
          p_note?: string;
          p_lat?: number;
          p_lng?: number;
          p_clear_cart?: boolean;
        };
        Returns: { id: string; order_number: number; total_amount: number; status: string };
      };
      assign_order_to_me: { Args: { p_order_id: string }; Returns: Database['public']['Tables']['orders']['Row'] };
      update_order_status: {
        Args: { p_order_id: string; p_status: string };
        Returns: Database['public']['Tables']['orders']['Row'];
      };
      mark_delivered: { Args: { p_order_id: string }; Returns: Database['public']['Tables']['orders']['Row'] };
      request_cancellation: { Args: { p_order_id: string }; Returns: Database['public']['Tables']['orders']['Row'] };
      create_payment: {
        Args: {
          p_order_id: string;
          p_method: string;
          p_amount: number;
          p_reference?: string;
          p_note?: string;
          p_proof_url?: string;
        };
        Returns: string;
      };
      confirm_payment: {
        Args: { p_tx_id: string; p_status: string; p_reference?: string };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      get_order_details: { Args: { p_order_id: string }; Returns: Json };
      set_user_role: { Args: { p_user_id: string; p_role: string }; Returns: Database['public']['Tables']['profiles']['Row'] };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Json };
    };
  };
}
