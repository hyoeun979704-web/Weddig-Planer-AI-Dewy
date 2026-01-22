export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appliances: {
        Row: {
          brand: string
          brand_options: string[] | null
          category_types: string[] | null
          created_at: string
          feature_options: string[] | null
          id: string
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          brand_options?: string[] | null
          category_types?: string[] | null
          created_at?: string
          feature_options?: string[] | null
          id?: string
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          brand_options?: string[] | null
          category_types?: string[] | null
          created_at?: string
          feature_options?: string[] | null
          id?: string
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      hanbok: {
        Row: {
          address: string
          created_at: string
          hanbok_types: string[] | null
          id: string
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          service_options: string[] | null
          style_options: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          hanbok_types?: string[] | null
          id?: string
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          service_options?: string[] | null
          style_options?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          hanbok_types?: string[] | null
          id?: string
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          service_options?: string[] | null
          style_options?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      honeymoon: {
        Row: {
          accommodation_types: string[] | null
          created_at: string
          destination: string
          duration: string
          id: string
          included_services: string[] | null
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          thumbnail_url: string | null
          trip_types: string[] | null
          updated_at: string
        }
        Insert: {
          accommodation_types?: string[] | null
          created_at?: string
          destination: string
          duration: string
          id?: string
          included_services?: string[] | null
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          trip_types?: string[] | null
          updated_at?: string
        }
        Update: {
          accommodation_types?: string[] | null
          created_at?: string
          destination?: string
          duration?: string
          id?: string
          included_services?: string[] | null
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          trip_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      honeymoon_gifts: {
        Row: {
          brand: string
          brand_options: string[] | null
          category_types: string[] | null
          created_at: string
          delivery_options: string[] | null
          id: string
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          brand_options?: string[] | null
          category_types?: string[] | null
          created_at?: string
          delivery_options?: string[] | null
          id?: string
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          brand_options?: string[] | null
          category_types?: string[] | null
          created_at?: string
          delivery_options?: string[] | null
          id?: string
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invitation_venues: {
        Row: {
          address: string
          amenity_options: string[] | null
          capacity_range: string
          created_at: string
          cuisine_options: string[] | null
          id: string
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          thumbnail_url: string | null
          updated_at: string
          venue_types: string[] | null
        }
        Insert: {
          address: string
          amenity_options?: string[] | null
          capacity_range: string
          created_at?: string
          cuisine_options?: string[] | null
          id?: string
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
          venue_types?: string[] | null
        }
        Update: {
          address?: string
          amenity_options?: string[] | null
          capacity_range?: string
          created_at?: string
          cuisine_options?: string[] | null
          id?: string
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
          venue_types?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studios: {
        Row: {
          address: string
          created_at: string
          id: string
          is_partner: boolean
          min_guarantee: number
          name: string
          package_types: string[] | null
          price_per_person: number
          rating: number
          review_count: number
          service_options: string[] | null
          style_options: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_partner?: boolean
          min_guarantee?: number
          name: string
          package_types?: string[] | null
          price_per_person: number
          rating?: number
          review_count?: number
          service_options?: string[] | null
          style_options?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_partner?: boolean
          min_guarantee?: number
          name?: string
          package_types?: string[] | null
          price_per_person?: number
          rating?: number
          review_count?: number
          service_options?: string[] | null
          style_options?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suits: {
        Row: {
          address: string
          brand_options: string[] | null
          created_at: string
          id: string
          is_partner: boolean
          name: string
          price_range: string
          rating: number
          review_count: number
          service_options: string[] | null
          suit_types: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          brand_options?: string[] | null
          created_at?: string
          id?: string
          is_partner?: boolean
          name: string
          price_range: string
          rating?: number
          review_count?: number
          service_options?: string[] | null
          suit_types?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          brand_options?: string[] | null
          created_at?: string
          id?: string
          is_partner?: boolean
          name?: string
          price_range?: string
          rating?: number
          review_count?: number
          service_options?: string[] | null
          suit_types?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          created_at: string
          event_options: string[] | null
          hall_types: string[] | null
          id: string
          is_partner: boolean
          meal_options: string[] | null
          min_guarantee: number
          name: string
          price_per_person: number
          rating: number
          review_count: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          event_options?: string[] | null
          hall_types?: string[] | null
          id?: string
          is_partner?: boolean
          meal_options?: string[] | null
          min_guarantee?: number
          name: string
          price_per_person: number
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          event_options?: string[] | null
          hall_types?: string[] | null
          id?: string
          is_partner?: boolean
          meal_options?: string[] | null
          min_guarantee?: number
          name?: string
          price_per_person?: number
          rating?: number
          review_count?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
