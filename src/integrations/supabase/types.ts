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
      ai_usage_daily: {
        Row: {
          created_at: string | null
          id: string
          message_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
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
      budget_items: {
        Row: {
          amount: number
          balance_amount: number | null
          balance_due_date: string | null
          category: string
          created_at: string
          has_balance: boolean | null
          id: string
          item_date: string | null
          memo: string | null
          paid_by: string | null
          payment_method: string | null
          payment_stage: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_amount?: number | null
          balance_due_date?: string | null
          category: string
          created_at?: string
          has_balance?: boolean | null
          id?: string
          item_date?: string | null
          memo?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_stage?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_amount?: number | null
          balance_due_date?: string | null
          category?: string
          created_at?: string
          has_balance?: boolean | null
          id?: string
          item_date?: string | null
          memo?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_stage?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_settings: {
        Row: {
          category_budgets: Json | null
          created_at: string
          guest_count: number | null
          id: string
          region: string
          total_budget: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_budgets?: Json | null
          created_at?: string
          guest_count?: number | null
          id?: string
          region?: string
          total_budget?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_budgets?: Json | null
          created_at?: string
          guest_count?: number | null
          id?: string
          region?: string
          total_budget?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      community_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          has_image: boolean | null
          id: string
          image_urls: string[] | null
          title: string
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          has_image?: boolean | null
          id?: string
          image_urls?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          has_image?: boolean | null
          id?: string
          image_urls?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      couple_diary: {
        Row: {
          author_id: string
          content: string
          couple_link_id: string
          created_at: string
          diary_date: string
          id: string
          mood: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          couple_link_id: string
          created_at?: string
          diary_date?: string
          id?: string
          mood?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          couple_link_id?: string
          created_at?: string
          diary_date?: string
          id?: string
          mood?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_diary_couple_link_id_fkey"
            columns: ["couple_link_id"]
            isOneToOne: false
            referencedRelation: "couple_links"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_diary_photos: {
        Row: {
          created_at: string
          diary_id: string
          display_order: number
          id: string
          photo_url: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          diary_id: string
          display_order?: number
          id?: string
          photo_url: string
          storage_path: string
        }
        Update: {
          created_at?: string
          diary_id?: string
          display_order?: number
          id?: string
          photo_url?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_diary_photos_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "couple_diary"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_links: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          linked_at: string | null
          partner_user_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          linked_at?: string | null
          partner_user_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          linked_at?: string | null
          partner_user_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      couple_votes: {
        Row: {
          ai_suggestion: string | null
          created_at: string
          id: string
          my_pick: string | null
          my_reason: string | null
          option_a: string
          option_b: string
          partner_pick: string | null
          partner_reason: string | null
          partner_user_id: string | null
          status: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggestion?: string | null
          created_at?: string
          id?: string
          my_pick?: string | null
          my_reason?: string | null
          option_a: string
          option_b: string
          partner_pick?: string | null
          partner_reason?: string | null
          partner_user_id?: string | null
          status?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggestion?: string | null
          created_at?: string
          id?: string
          my_pick?: string | null
          my_reason?: string | null
          option_a?: string
          option_b?: string
          partner_pick?: string | null
          partner_reason?: string | null
          partner_user_id?: string | null
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_claims: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_claims_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "partner_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          benefit_detail: string | null
          category: string | null
          cautions: string | null
          conditions: string | null
          description: string | null
          end_date: string | null
          event_id: number
          start_date: string | null
          status: string | null
          title: string
          vendor_id: number | null
          vendor_name: string | null
          view_count: number | null
        }
        Insert: {
          benefit_detail?: string | null
          category?: string | null
          cautions?: string | null
          conditions?: string | null
          description?: string | null
          end_date?: string | null
          event_id: number
          start_date?: string | null
          status?: string | null
          title: string
          vendor_id?: number | null
          vendor_name?: string | null
          view_count?: number | null
        }
        Update: {
          benefit_detail?: string | null
          category?: string | null
          cautions?: string | null
          conditions?: string | null
          description?: string | null
          end_date?: string | null
          event_id?: number
          start_date?: string | null
          status?: string | null
          title?: string
          vendor_id?: number | null
          vendor_name?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      ext_hanbok: {
        Row: {
          additional_options: Json | null
          composition: string | null
          composition_name: string | null
          custom_price: number | null
          fabric_option1: string | null
          fabric_option2: string | null
          fabric1_price: number | null
          fabric2_price: number | null
          hanbok_id: number
          item_id: number | null
          rental_price: number | null
        }
        Insert: {
          additional_options?: Json | null
          composition?: string | null
          composition_name?: string | null
          custom_price?: number | null
          fabric_option1?: string | null
          fabric_option2?: string | null
          fabric1_price?: number | null
          fabric2_price?: number | null
          hanbok_id: number
          item_id?: number | null
          rental_price?: number | null
        }
        Update: {
          additional_options?: Json | null
          composition?: string | null
          composition_name?: string | null
          custom_price?: number | null
          fabric_option1?: string | null
          fabric_option2?: string | null
          fabric1_price?: number | null
          fabric2_price?: number | null
          hanbok_id?: number
          item_id?: number | null
          rental_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_hanbok_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ext_products"
            referencedColumns: ["item_id"]
          },
        ]
      }
      ext_products: {
        Row: {
          as_warranty: string | null
          category_sub: string | null
          delivery_period: string | null
          item_id: number
          model_no: string | null
          name: string
          original_price: number | null
          price: number | null
          purchase_url: string | null
          specs: Json | null
          vendor_id: number | null
        }
        Insert: {
          as_warranty?: string | null
          category_sub?: string | null
          delivery_period?: string | null
          item_id: number
          model_no?: string | null
          name: string
          original_price?: number | null
          price?: number | null
          purchase_url?: string | null
          specs?: Json | null
          vendor_id?: number | null
        }
        Update: {
          as_warranty?: string | null
          category_sub?: string | null
          delivery_period?: string | null
          item_id?: number
          model_no?: string | null
          name?: string
          original_price?: number | null
          price?: number | null
          purchase_url?: string | null
          specs?: Json | null
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      ext_wedding_halls: {
        Row: {
          meal_cost_range: string | null
          meal_type: string | null
          parking_info: string | null
          rental_cost_range: string | null
          vendor_id: number
        }
        Insert: {
          meal_cost_range?: string | null
          meal_type?: string | null
          parking_info?: string | null
          rental_cost_range?: string | null
          vendor_id: number
        }
        Update: {
          meal_cost_range?: string | null
          meal_type?: string | null
          parking_info?: string | null
          rental_cost_range?: string | null
          vendor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ext_wedding_halls_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["vendor_id"]
          },
        ]
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
      game_scores: {
        Row: {
          created_at: string
          doubled: boolean
          earned_points: number
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          doubled?: boolean
          earned_points?: number
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          doubled?: boolean
          earned_points?: number
          id?: string
          score?: number
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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          order_number: string
          paid_at: string | null
          payment_method: string | null
          shipping_address: string | null
          shipping_memo: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          shipping_address?: string | null
          shipping_memo?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          shipping_address?: string | null
          shipping_memo?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_deals: {
        Row: {
          banner_image_url: string | null
          category: string
          claim_count: number
          coupon_code: string | null
          created_at: string
          deal_price: number | null
          deal_type: string
          description: string
          discount_info: string | null
          display_order: number
          end_date: string | null
          external_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          original_price: number | null
          partner_logo_url: string | null
          partner_name: string
          short_description: string | null
          start_date: string | null
          terms: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          banner_image_url?: string | null
          category?: string
          claim_count?: number
          coupon_code?: string | null
          created_at?: string
          deal_price?: number | null
          deal_type?: string
          description: string
          discount_info?: string | null
          display_order?: number
          end_date?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          original_price?: number | null
          partner_logo_url?: string | null
          partner_name: string
          short_description?: string | null
          start_date?: string | null
          terms?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          banner_image_url?: string | null
          category?: string
          claim_count?: number
          coupon_code?: string | null
          created_at?: string
          deal_price?: number | null
          deal_type?: string
          description?: string
          discount_info?: string | null
          display_order?: number
          end_date?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          original_price?: number | null
          partner_logo_url?: string | null
          partner_name?: string
          short_description?: string | null
          start_date?: string | null
          terms?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          method: string | null
          order_id: string | null
          order_number: string
          payment_key: string
          raw_response: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string | null
          order_number: string
          payment_key: string
          raw_response?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          method?: string | null
          order_id?: string | null
          order_number?: string
          payment_key?: string
          raw_response?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          extra_price: number | null
          features: string | null
          item_id: number | null
          option_id: number
          option_name: string | null
          sort_order: number | null
        }
        Insert: {
          extra_price?: number | null
          features?: string | null
          item_id?: number | null
          option_id: number
          option_name?: string | null
          sort_order?: number | null
        }
        Update: {
          extra_price?: number | null
          features?: string | null
          item_id?: number | null
          option_id?: number
          option_name?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ext_products"
            referencedColumns: ["item_id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          name: string
          price: number
          sale_price: number | null
          stock: number
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name: string
          price?: number
          sale_price?: number | null
          stock?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          name?: string
          price?: number
          sale_price?: number | null
          stock?: number
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          ai_summary: string | null
          content: string | null
          created_at: string | null
          item_id: number | null
          rating: number | null
          review_id: number
          user_id: number | null
          vendor_id: number | null
        }
        Insert: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string | null
          item_id?: number | null
          rating?: number | null
          review_id: number
          user_id?: number | null
          vendor_id?: number | null
        }
        Update: {
          ai_summary?: string | null
          content?: string | null
          created_at?: string | null
          item_id?: number | null
          rating?: number | null
          review_id?: number
          user_id?: number | null
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      shopping_products: {
        Row: {
          brand_id: number | null
          cautions: string | null
          detail_url: string | null
          discount_rate: number | null
          keywords: string | null
          original_price: number | null
          price: number | null
          product_name: string
          rating: number | null
          review_count: number | null
          sales_count: number | null
          shopping_product_id: number
          thumbnail_url: string | null
        }
        Insert: {
          brand_id?: number | null
          cautions?: string | null
          detail_url?: string | null
          discount_rate?: number | null
          keywords?: string | null
          original_price?: number | null
          price?: number | null
          product_name: string
          rating?: number | null
          review_count?: number | null
          sales_count?: number | null
          shopping_product_id: number
          thumbnail_url?: string | null
        }
        Update: {
          brand_id?: number | null
          cautions?: string | null
          detail_url?: string | null
          discount_rate?: number | null
          keywords?: string | null
          original_price?: number | null
          price?: number | null
          product_name?: string
          rating?: number | null
          review_count?: number | null
          sales_count?: number | null
          shopping_product_id?: number
          thumbnail_url?: string | null
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
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          plan: string
          price: number | null
          started_at: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan?: string
          price?: number | null
          started_at?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          plan?: string
          price?: number | null
          started_at?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
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
      user_points: {
        Row: {
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_schedule_items: {
        Row: {
          category: string | null
          completed: boolean
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wedding_settings: {
        Row: {
          created_at: string
          id: string
          partner_name: string | null
          updated_at: string
          user_id: string
          wedding_date: string | null
          wedding_region: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          partner_name?: string | null
          updated_at?: string
          user_id: string
          wedding_date?: string | null
          wedding_region?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          partner_name?: string | null
          updated_at?: string
          user_id?: string
          wedding_date?: string | null
          wedding_region?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          amenities: string | null
          avg_rating: number | null
          business_hours: string | null
          category_type: string
          keywords: string | null
          name: string
          parking_hours: string | null
          parking_location: string | null
          region: string | null
          review_count: number | null
          sns_info: Json | null
          tel: string | null
          thumbnail_url: string | null
          vendor_id: number
        }
        Insert: {
          address?: string | null
          amenities?: string | null
          avg_rating?: number | null
          business_hours?: string | null
          category_type: string
          keywords?: string | null
          name: string
          parking_hours?: string | null
          parking_location?: string | null
          region?: string | null
          review_count?: number | null
          sns_info?: Json | null
          tel?: string | null
          thumbnail_url?: string | null
          vendor_id: number
        }
        Update: {
          address?: string | null
          amenities?: string | null
          avg_rating?: number | null
          business_hours?: string | null
          category_type?: string
          keywords?: string | null
          name?: string
          parking_hours?: string | null
          parking_location?: string | null
          region?: string | null
          review_count?: number | null
          sns_info?: Json | null
          tel?: string | null
          thumbnail_url?: string | null
          vendor_id?: number
        }
        Relationships: []
      }
      venue_halls: {
        Row: {
          capacity_max: number | null
          capacity_min: number | null
          ceremony_fee: number | null
          created_at: string
          floor: string | null
          hall_type: string | null
          id: string
          meal_price: number | null
          name: string
          price_per_person: number | null
          size_pyeong: number | null
          thumbnail_url: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          capacity_max?: number | null
          capacity_min?: number | null
          ceremony_fee?: number | null
          created_at?: string
          floor?: string | null
          hall_type?: string | null
          id?: string
          meal_price?: number | null
          name: string
          price_per_person?: number | null
          size_pyeong?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          capacity_max?: number | null
          capacity_min?: number | null
          ceremony_fee?: number | null
          created_at?: string
          floor?: string | null
          hall_type?: string | null
          id?: string
          meal_price?: number | null
          name?: string
          price_per_person?: number | null
          size_pyeong?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_halls_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_special_points: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          title: string
          venue_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title: string
          venue_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_special_points_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
      game_ranking: {
        Row: {
          best_score: number | null
          display_name: string | null
          games_played: number | null
          total_earned: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_game_points: {
        Args: { p_doubled?: boolean; p_score: number; p_user_id: string }
        Returns: number
      }
      increment_ai_usage: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      increment_claim_count: { Args: { deal_id: string }; Returns: undefined }
      is_couple_member: {
        Args: { _couple_link_id: string; _user_id: string }
        Returns: boolean
      }
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
