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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_logs: {
        Row: {
          category: string | null
          data_quality_score: number | null
          error_message: string | null
          failed_records: Json | null
          finished_at: string | null
          found: number | null
          id: string
          inserted: number | null
          next_retry_at: string | null
          parent_log_id: string | null
          region: string | null
          retry_count: number | null
          skipped: number | null
          source: string | null
          started_at: string | null
          status: string | null
          updated: number | null
        }
        Insert: {
          category?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          failed_records?: Json | null
          finished_at?: string | null
          found?: number | null
          id?: string
          inserted?: number | null
          next_retry_at?: string | null
          parent_log_id?: string | null
          region?: string | null
          retry_count?: number | null
          skipped?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          updated?: number | null
        }
        Update: {
          category?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          failed_records?: Json | null
          finished_at?: string | null
          found?: number | null
          id?: string
          inserted?: number | null
          next_retry_at?: string | null
          parent_log_id?: string | null
          region?: string | null
          retry_count?: number | null
          skipped?: number | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          updated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_logs_parent_log_id_fkey"
            columns: ["parent_log_id"]
            isOneToOne: false
            referencedRelation: "collection_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ext_hanbok: {
        Row: {
          accessories_included: boolean | null
          custom_price_range: string | null
          fabric_options: string[] | null
          family_package: boolean | null
          hanbok_styles: string[] | null
          lead_time_weeks: number | null
          photo_hanbok_available: boolean | null
          place_id: string
          rental_price_range: string | null
          service_types: string[] | null
          target_types: string[] | null
        }
        Insert: {
          accessories_included?: boolean | null
          custom_price_range?: string | null
          fabric_options?: string[] | null
          family_package?: boolean | null
          hanbok_styles?: string[] | null
          lead_time_weeks?: number | null
          photo_hanbok_available?: boolean | null
          place_id: string
          rental_price_range?: string | null
          service_types?: string[] | null
          target_types?: string[] | null
        }
        Update: {
          accessories_included?: boolean | null
          custom_price_range?: string | null
          fabric_options?: string[] | null
          family_package?: boolean | null
          hanbok_styles?: string[] | null
          lead_time_weeks?: number | null
          photo_hanbok_available?: boolean | null
          place_id?: string
          rental_price_range?: string | null
          service_types?: string[] | null
          target_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_hanbok_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      ext_makeup: {
        Row: {
          artist_count: number | null
          early_morning_available: boolean | null
          includes_hair: boolean | null
          package_options: Json | null
          place_id: string
          service_types: string[] | null
          signature_styles: string[] | null
          travel_fee: number | null
          travel_service: boolean | null
          trial_available: boolean | null
          trial_price: number | null
        }
        Insert: {
          artist_count?: number | null
          early_morning_available?: boolean | null
          includes_hair?: boolean | null
          package_options?: Json | null
          place_id: string
          service_types?: string[] | null
          signature_styles?: string[] | null
          travel_fee?: number | null
          travel_service?: boolean | null
          trial_available?: boolean | null
          trial_price?: number | null
        }
        Update: {
          artist_count?: number | null
          early_morning_available?: boolean | null
          includes_hair?: boolean | null
          package_options?: Json | null
          place_id?: string
          service_types?: string[] | null
          signature_styles?: string[] | null
          travel_fee?: number | null
          travel_service?: boolean | null
          trial_available?: boolean | null
          trial_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_makeup_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      ext_restaurants: {
        Row: {
          ambiance_tags: string[] | null
          capacity: number | null
          corkage_allowed: boolean | null
          corkage_fee: number | null
          cuisine_types: string[] | null
          featured_menus: string[] | null
          is_reservable: boolean | null
          min_order_amount: number | null
          place_id: string
          price_per_person: number | null
          private_room: boolean | null
          private_room_capacity: number | null
          rental_fee: number | null
          venue_rental: boolean | null
        }
        Insert: {
          ambiance_tags?: string[] | null
          capacity?: number | null
          corkage_allowed?: boolean | null
          corkage_fee?: number | null
          cuisine_types?: string[] | null
          featured_menus?: string[] | null
          is_reservable?: boolean | null
          min_order_amount?: number | null
          place_id: string
          price_per_person?: number | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rental_fee?: number | null
          venue_rental?: boolean | null
        }
        Update: {
          ambiance_tags?: string[] | null
          capacity?: number | null
          corkage_allowed?: boolean | null
          corkage_fee?: number | null
          cuisine_types?: string[] | null
          featured_menus?: string[] | null
          is_reservable?: boolean | null
          min_order_amount?: number | null
          place_id?: string
          price_per_person?: number | null
          private_room?: boolean | null
          private_room_capacity?: number | null
          rental_fee?: number | null
          venue_rental?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_restaurants_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      ext_studios: {
        Row: {
          additional_retouch_price: number | null
          album_options: string[] | null
          dress_count: number | null
          includes_dress_rental: boolean | null
          includes_makeup: boolean | null
          outdoor_locations: string[] | null
          package_options: Json | null
          place_id: string
          reservation_lead_days: number | null
          retouching_count: number | null
          shooting_styles: string[] | null
          studio_types: string[] | null
        }
        Insert: {
          additional_retouch_price?: number | null
          album_options?: string[] | null
          dress_count?: number | null
          includes_dress_rental?: boolean | null
          includes_makeup?: boolean | null
          outdoor_locations?: string[] | null
          package_options?: Json | null
          place_id: string
          reservation_lead_days?: number | null
          retouching_count?: number | null
          shooting_styles?: string[] | null
          studio_types?: string[] | null
        }
        Update: {
          additional_retouch_price?: number | null
          album_options?: string[] | null
          dress_count?: number | null
          includes_dress_rental?: boolean | null
          includes_makeup?: boolean | null
          outdoor_locations?: string[] | null
          package_options?: Json | null
          place_id?: string
          reservation_lead_days?: number | null
          retouching_count?: number | null
          shooting_styles?: string[] | null
          studio_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_studios_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      ext_tailors: {
        Row: {
          alteration_included: boolean | null
          brand_options: string[] | null
          custom_price_range: string | null
          dress_styles: string[] | null
          fitting_count: number | null
          gender_target: string | null
          lead_time_weeks: number | null
          place_id: string
          rental_price_range: string | null
          service_types: string[] | null
          size_range: string | null
          suit_styles: string[] | null
        }
        Insert: {
          alteration_included?: boolean | null
          brand_options?: string[] | null
          custom_price_range?: string | null
          dress_styles?: string[] | null
          fitting_count?: number | null
          gender_target?: string | null
          lead_time_weeks?: number | null
          place_id: string
          rental_price_range?: string | null
          service_types?: string[] | null
          size_range?: string | null
          suit_styles?: string[] | null
        }
        Update: {
          alteration_included?: boolean | null
          brand_options?: string[] | null
          custom_price_range?: string | null
          dress_styles?: string[] | null
          fitting_count?: number | null
          gender_target?: string | null
          lead_time_weeks?: number | null
          place_id?: string
          rental_price_range?: string | null
          service_types?: string[] | null
          size_range?: string | null
          suit_styles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ext_tailors_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_details: {
        Row: {
          address: string | null
          advantage_1_content: string | null
          advantage_1_title: string | null
          advantage_2_content: string | null
          advantage_2_title: string | null
          advantage_3_content: string | null
          advantage_3_title: string | null
          closed_days: string | null
          facebook_url: string | null
          holiday_notice: string | null
          hours_fri: string | null
          hours_mon: string | null
          hours_sat: string | null
          hours_sun: string | null
          hours_thu: string | null
          hours_tue: string | null
          hours_wed: string | null
          image_url_1: string | null
          image_url_2: string | null
          image_url_3: string | null
          instagram_url: string | null
          kakao_channel_url: string | null
          naver_blog_url: string | null
          naver_place_url: string | null
          parking_capacity: number | null
          parking_free_guest: string | null
          parking_free_parents: string | null
          parking_location: string | null
          place_id: string
          shuttle_bus_available: boolean | null
          shuttle_bus_info: string | null
          subway_line: string | null
          subway_station: string | null
          tel: string | null
          updated_at: string | null
          walk_minutes: number | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          advantage_1_content?: string | null
          advantage_1_title?: string | null
          advantage_2_content?: string | null
          advantage_2_title?: string | null
          advantage_3_content?: string | null
          advantage_3_title?: string | null
          closed_days?: string | null
          facebook_url?: string | null
          holiday_notice?: string | null
          hours_fri?: string | null
          hours_mon?: string | null
          hours_sat?: string | null
          hours_sun?: string | null
          hours_thu?: string | null
          hours_tue?: string | null
          hours_wed?: string | null
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          instagram_url?: string | null
          kakao_channel_url?: string | null
          naver_blog_url?: string | null
          naver_place_url?: string | null
          parking_capacity?: number | null
          parking_free_guest?: string | null
          parking_free_parents?: string | null
          parking_location?: string | null
          place_id: string
          shuttle_bus_available?: boolean | null
          shuttle_bus_info?: string | null
          subway_line?: string | null
          subway_station?: string | null
          tel?: string | null
          updated_at?: string | null
          walk_minutes?: number | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          advantage_1_content?: string | null
          advantage_1_title?: string | null
          advantage_2_content?: string | null
          advantage_2_title?: string | null
          advantage_3_content?: string | null
          advantage_3_title?: string | null
          closed_days?: string | null
          facebook_url?: string | null
          holiday_notice?: string | null
          hours_fri?: string | null
          hours_mon?: string | null
          hours_sat?: string | null
          hours_sun?: string | null
          hours_thu?: string | null
          hours_tue?: string | null
          hours_wed?: string | null
          image_url_1?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          instagram_url?: string | null
          kakao_channel_url?: string | null
          naver_blog_url?: string | null
          naver_place_url?: string | null
          parking_capacity?: number | null
          parking_free_guest?: string | null
          parking_free_parents?: string | null
          parking_location?: string | null
          place_id?: string
          shuttle_bus_available?: boolean | null
          shuttle_bus_info?: string | null
          subway_line?: string | null
          subway_station?: string | null
          tel?: string | null
          updated_at?: string | null
          walk_minutes?: number | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_details_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_exclusions: {
        Row: {
          detected_at: string | null
          id: string
          reason: string
          source_id: string
          source_name: string
        }
        Insert: {
          detected_at?: string | null
          id?: string
          reason: string
          source_id: string
          source_name: string
        }
        Update: {
          detected_at?: string | null
          id?: string
          reason?: string
          source_id?: string
          source_name?: string
        }
        Relationships: []
      }
      place_gallery_images: {
        Row: {
          caption: string | null
          created_at: string | null
          hall_id: string | null
          id: string
          image_url: string
          place_id: string
          sort_order: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          hall_id?: string | null
          id?: string
          image_url: string
          place_id: string
          sort_order?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          hall_id?: string | null
          id?: string
          image_url?: string
          place_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_gallery_images_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "place_halls"
            referencedColumns: ["hall_id"]
          },
          {
            foreignKeyName: "place_gallery_images_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_halls: {
        Row: {
          capacity_seated: number | null
          capacity_standing: number | null
          ceiling_height: number | null
          ceremony_duration_min: number | null
          ceremony_interval_min: number | null
          ceremony_type: string | null
          concierge_fee: number | null
          concierge_included: boolean | null
          created_at: string | null
          decoration_diy_allowed: boolean | null
          drinks_separate_price: number | null
          drinks_type: string | null
          event_options: string[] | null
          external_alcohol_allowed: boolean | null
          floor: string | null
          floral_decor: string | null
          floral_included: boolean | null
          floral_mandatory: boolean | null
          floral_price: number | null
          hall_id: string
          hall_name: string
          hall_type: string | null
          includes_drinks: boolean | null
          main_image_url: string | null
          max_guarantee: number | null
          meal_price: number | null
          meal_ticket_provided: boolean | null
          meal_type: string | null
          min_guarantee: number | null
          parking_available: boolean | null
          place_id: string
          rental_fee: number | null
          simultaneous_events: boolean | null
          tags: string[] | null
          virgin_road_length: number | null
        }
        Insert: {
          capacity_seated?: number | null
          capacity_standing?: number | null
          ceiling_height?: number | null
          ceremony_duration_min?: number | null
          ceremony_interval_min?: number | null
          ceremony_type?: string | null
          concierge_fee?: number | null
          concierge_included?: boolean | null
          created_at?: string | null
          decoration_diy_allowed?: boolean | null
          drinks_separate_price?: number | null
          drinks_type?: string | null
          event_options?: string[] | null
          external_alcohol_allowed?: boolean | null
          floor?: string | null
          floral_decor?: string | null
          floral_included?: boolean | null
          floral_mandatory?: boolean | null
          floral_price?: number | null
          hall_id?: string
          hall_name: string
          hall_type?: string | null
          includes_drinks?: boolean | null
          main_image_url?: string | null
          max_guarantee?: number | null
          meal_price?: number | null
          meal_ticket_provided?: boolean | null
          meal_type?: string | null
          min_guarantee?: number | null
          parking_available?: boolean | null
          place_id: string
          rental_fee?: number | null
          simultaneous_events?: boolean | null
          tags?: string[] | null
          virgin_road_length?: number | null
        }
        Update: {
          capacity_seated?: number | null
          capacity_standing?: number | null
          ceiling_height?: number | null
          ceremony_duration_min?: number | null
          ceremony_interval_min?: number | null
          ceremony_type?: string | null
          concierge_fee?: number | null
          concierge_included?: boolean | null
          created_at?: string | null
          decoration_diy_allowed?: boolean | null
          drinks_separate_price?: number | null
          drinks_type?: string | null
          event_options?: string[] | null
          external_alcohol_allowed?: boolean | null
          floor?: string | null
          floral_decor?: string | null
          floral_included?: boolean | null
          floral_mandatory?: boolean | null
          floral_price?: number | null
          hall_id?: string
          hall_name?: string
          hall_type?: string | null
          includes_drinks?: boolean | null
          main_image_url?: string | null
          max_guarantee?: number | null
          meal_price?: number | null
          meal_ticket_provided?: boolean | null
          meal_type?: string | null
          min_guarantee?: number | null
          parking_available?: boolean | null
          place_id?: string
          rental_fee?: number | null
          simultaneous_events?: boolean | null
          tags?: string[] | null
          virgin_road_length?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_halls_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_product_options: {
        Row: {
          extra_price: number | null
          is_available: boolean | null
          option_id: string
          option_name: string | null
          option_type: string | null
          product_id: string
        }
        Insert: {
          extra_price?: number | null
          is_available?: boolean | null
          option_id?: string
          option_name?: string | null
          option_type?: string | null
          product_id: string
        }
        Update: {
          extra_price?: number | null
          is_available?: boolean | null
          option_id?: string
          option_name?: string | null
          option_type?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "place_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "place_product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_lowest_prices"
            referencedColumns: ["product_id"]
          },
        ]
      }
      place_product_price_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_triggered: boolean | null
          notified_at: string | null
          notified_price: number | null
          product_id: string
          target_price: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_triggered?: boolean | null
          notified_at?: string | null
          notified_price?: number | null
          product_id: string
          target_price: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_triggered?: boolean | null
          notified_at?: string | null
          notified_price?: number | null
          product_id?: string
          target_price?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_product_price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "place_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "place_product_price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_lowest_prices"
            referencedColumns: ["product_id"]
          },
        ]
      }
      place_product_price_history: {
        Row: {
          id: string
          platform: string
          price: number
          product_id: string
          recorded_at: string | null
        }
        Insert: {
          id?: string
          platform: string
          price: number
          product_id: string
          recorded_at?: string | null
        }
        Update: {
          id?: string
          platform?: string
          price?: number
          product_id?: string
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "place_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "place_product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_lowest_prices"
            referencedColumns: ["product_id"]
          },
        ]
      }
      place_product_prices: {
        Row: {
          crawled_at: string | null
          discount_rate: number | null
          id: string
          is_free_shipping: boolean | null
          is_lowest: boolean | null
          original_price: number | null
          platform: string
          platform_product_id: string | null
          price: number
          product_id: string
          product_url: string
          seller_name: string | null
          shipping_fee: number | null
          stock_status: string | null
        }
        Insert: {
          crawled_at?: string | null
          discount_rate?: number | null
          id?: string
          is_free_shipping?: boolean | null
          is_lowest?: boolean | null
          original_price?: number | null
          platform: string
          platform_product_id?: string | null
          price: number
          product_id: string
          product_url: string
          seller_name?: string | null
          shipping_fee?: number | null
          stock_status?: string | null
        }
        Update: {
          crawled_at?: string | null
          discount_rate?: number | null
          id?: string
          is_free_shipping?: boolean | null
          is_lowest?: boolean | null
          original_price?: number | null
          platform?: string
          platform_product_id?: string | null
          price?: number
          product_id?: string
          product_url?: string
          seller_name?: string | null
          shipping_fee?: number | null
          stock_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "place_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "place_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_lowest_prices"
            referencedColumns: ["product_id"]
          },
        ]
      }
      place_products: {
        Row: {
          brand: string
          category: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          main_image_url: string | null
          model_name: string | null
          model_number: string | null
          name: string
          product_id: string
          release_year: number | null
          specs: Json | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand?: string
          category: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          main_image_url?: string | null
          model_name?: string | null
          model_number?: string | null
          name: string
          product_id?: string
          release_year?: number | null
          specs?: Json | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          main_image_url?: string | null
          model_name?: string | null
          model_number?: string | null
          name?: string
          product_id?: string
          release_year?: number | null
          specs?: Json | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      place_reviews: {
        Row: {
          ai_summary: string | null
          author: string | null
          content: string
          created_at: string | null
          hall_name: string | null
          helpful_count: number | null
          is_verified: boolean | null
          place_id: string
          rating: number | null
          review_date: string | null
          review_id: string
          sentiment: string | null
          source_name: string | null
          source_review_id: string | null
          title: string | null
          wedding_date: string | null
        }
        Insert: {
          ai_summary?: string | null
          author?: string | null
          content: string
          created_at?: string | null
          hall_name?: string | null
          helpful_count?: number | null
          is_verified?: boolean | null
          place_id: string
          rating?: number | null
          review_date?: string | null
          review_id?: string
          sentiment?: string | null
          source_name?: string | null
          source_review_id?: string | null
          title?: string | null
          wedding_date?: string | null
        }
        Update: {
          ai_summary?: string | null
          author?: string | null
          content?: string
          created_at?: string | null
          hall_name?: string | null
          helpful_count?: number | null
          is_verified?: boolean | null
          place_id?: string
          rating?: number | null
          review_date?: string | null
          review_id?: string
          sentiment?: string | null
          source_name?: string | null
          source_review_id?: string | null
          title?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_similars: {
        Row: {
          place_id: string
          similar_place_id: string
        }
        Insert: {
          place_id: string
          similar_place_id: string
        }
        Update: {
          place_id?: string
          similar_place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_similars_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
          {
            foreignKeyName: "place_similars_similar_place_id_fkey"
            columns: ["similar_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_sources: {
        Row: {
          id: string
          last_crawled_at: string | null
          place_id: string
          source_id: string
          source_name: string
          source_url: string | null
        }
        Insert: {
          id?: string
          last_crawled_at?: string | null
          place_id: string
          source_id: string
          source_name: string
          source_url?: string | null
        }
        Update: {
          id?: string
          last_crawled_at?: string | null
          place_id?: string
          source_id?: string
          source_name?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_sources_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      places: {
        Row: {
          avg_rating: number | null
          category: string
          city: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          district: string | null
          is_active: boolean | null
          is_partner: boolean | null
          lat: number | null
          lng: number | null
          main_image_url: string | null
          max_guarantee: number | null
          min_guarantee: number | null
          min_price: number | null
          name: string
          place_id: string
          review_count: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          category: string
          city?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          lat?: number | null
          lng?: number | null
          main_image_url?: string | null
          max_guarantee?: number | null
          min_guarantee?: number | null
          min_price?: number | null
          name: string
          place_id?: string
          review_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          category?: string
          city?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          lat?: number | null
          lng?: number | null
          main_image_url?: string | null
          max_guarantee?: number | null
          min_guarantee?: number | null
          min_price?: number | null
          name?: string
          place_id?: string
          review_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      product_lowest_prices: {
        Row: {
          all_prices: Json | null
          brand: string | null
          category: string | null
          is_free_shipping: boolean | null
          lowest_platform: string | null
          lowest_price: number | null
          lowest_seller: string | null
          lowest_url: string | null
          main_image_url: string | null
          name: string | null
          price_updated_at: string | null
          product_id: string | null
          shipping_fee: number | null
          specs: Json | null
          subcategory: string | null
        }
        Relationships: []
      }
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
