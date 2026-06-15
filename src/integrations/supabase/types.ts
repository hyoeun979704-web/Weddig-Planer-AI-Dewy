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
      agent_outputs: {
        Row: {
          body: string | null
          created_at: string
          deslop_score: number | null
          id: string
          issues: string | null
          kind: string
          media_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          status: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deslop_score?: number | null
          id?: string
          issues?: string | null
          kind: string
          media_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deslop_score?: number | null
          id?: string
          issues?: string | null
          kind?: string
          media_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          feedback: string | null
          id: string
          intent: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feedback?: string | null
          id?: string
          intent?: string | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feedback?: string | null
          id?: string
          intent?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      ai_usage_minute: {
        Row: {
          message_count: number
          minute: string
          user_id: string
        }
        Insert: {
          message_count?: number
          minute: string
          user_id: string
        }
        Update: {
          message_count?: number
          minute?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      billing_attempts: {
        Row: {
          amount: number | null
          attempt_type: string
          attempted_at: string
          billing_key: string | null
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          external_payment_id: string | null
          id: string
          provider: string
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          attempt_type: string
          attempted_at?: string
          billing_key?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_payment_id?: string | null
          id?: string
          provider: string
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          attempt_type?: string
          attempted_at?: string
          billing_key?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          external_payment_id?: string | null
          id?: string
          provider?: string
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_attempts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_blog_authors: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          blogger_name: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          blogger_name: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          blogger_name?: string
          reason?: string | null
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      business_coupons: {
        Row: {
          created_at: string
          discount_text: string
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_won: number | null
          moderation_note: string | null
          moderation_status: string
          owner_user_id: string
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_text: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_won?: number | null
          moderation_note?: string | null
          moderation_status?: string
          owner_user_id: string
          place_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_text?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_won?: number | null
          moderation_note?: string | null
          moderation_status?: string
          owner_user_id?: string
          place_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          featured_until: string | null
          id: string
          moderation_note: string | null
          moderation_status: string
          owner_user_id: string
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured_until?: string | null
          id?: string
          moderation_note?: string | null
          moderation_status?: string
          owner_user_id: string
          place_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          featured_until?: string | null
          id?: string
          moderation_note?: string | null
          moderation_status?: string
          owner_user_id?: string
          place_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          moderation_status: string
          name: string
          owner_user_id: string
          place_id: string
          price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          moderation_status?: string
          name: string
          owner_user_id: string
          place_id: string
          price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          moderation_status?: string
          name?: string
          owner_user_id?: string
          place_id?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_products_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          approval_status: string
          business_name: string
          business_number: string
          business_type: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          partner_tier: string
          phone: string | null
          representative_name: string
          review_note: string | null
          reviewed_at: string | null
          service_category: string
          updated_at: string | null
          user_id: string
          vendor_id: number | null
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          business_name: string
          business_number: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          partner_tier?: string
          phone?: string | null
          representative_name: string
          review_note?: string | null
          reviewed_at?: string | null
          service_category: string
          updated_at?: string | null
          user_id: string
          vendor_id?: number | null
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          business_name?: string
          business_number?: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          partner_tier?: string
          phone?: string | null
          representative_name?: string
          review_note?: string | null
          reviewed_at?: string | null
          service_category?: string
          updated_at?: string | null
          user_id?: string
          vendor_id?: number | null
          verified_at?: string | null
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
      client_error_logs: {
        Row: {
          created_at: string
          digest: string | null
          id: string
          message: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          digest?: string | null
          id?: string
          message: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          digest?: string | null
          id?: string
          message?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      community_announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          pinned?: boolean
          title?: string
          updated_at?: string
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
      community_notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string | null
          id: string
          post_id: string | null
          read_at: string | null
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          read_at?: string | null
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_places: {
        Row: {
          created_at: string | null
          place_id: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          place_id: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          place_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
          {
            foreignKeyName: "community_post_places_post_id_fkey"
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
          comment_count: number
          content: string
          created_at: string
          has_image: boolean | null
          id: string
          image_urls: string[] | null
          like_count: number
          title: string
          updated_at: string
          user_id: string
          views: number | null
          wedding_style: string | null
        }
        Insert: {
          category: string
          comment_count?: number
          content: string
          created_at?: string
          has_image?: boolean | null
          id?: string
          image_urls?: string[] | null
          like_count?: number
          title: string
          updated_at?: string
          user_id: string
          views?: number | null
          wedding_style?: string | null
        }
        Update: {
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          has_image?: boolean | null
          id?: string
          image_urls?: string[] | null
          like_count?: number
          title?: string
          updated_at?: string
          user_id?: string
          views?: number | null
          wedding_style?: string | null
        }
        Relationships: []
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason_code: string
          reason_text: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason_code: string
          reason_text?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason_code?: string
          reason_text?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
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
      coupon_downloads: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_downloads_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "business_coupons"
            referencedColumns: ["id"]
          },
        ]
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
      dress_fittings: {
        Row: {
          created_at: string
          error_message: string | null
          hearts_spent: number
          id: string
          prompt_params: Json
          result_image_path: string | null
          selected_sample_id: string | null
          source_image_path: string
          status: string
          thumbnail_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          hearts_spent?: number
          id?: string
          prompt_params?: Json
          result_image_path?: string | null
          selected_sample_id?: string | null
          source_image_path: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          hearts_spent?: number
          id?: string
          prompt_params?: Json
          result_image_path?: string | null
          selected_sample_id?: string | null
          source_image_path?: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dress_fittings_selected_sample_id_fkey"
            columns: ["selected_sample_id"]
            isOneToOne: false
            referencedRelation: "dress_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      dress_samples: {
        Row: {
          back_design: string | null
          color: string | null
          created_at: string
          details: string[] | null
          display_order: number
          fabric: string | null
          id: string
          image_url: string
          is_active: boolean
          length: string | null
          license_status: string | null
          mood: string[] | null
          name: string
          neckline: string | null
          pregnancy_supported: string | null
          silhouette: string | null
          sleeve: string | null
          source: string | null
          thumbnail_url: string | null
          updated_at: string
          waist: string | null
        }
        Insert: {
          back_design?: string | null
          color?: string | null
          created_at?: string
          details?: string[] | null
          display_order?: number
          fabric?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          length?: string | null
          license_status?: string | null
          mood?: string[] | null
          name: string
          neckline?: string | null
          pregnancy_supported?: string | null
          silhouette?: string | null
          sleeve?: string | null
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          waist?: string | null
        }
        Update: {
          back_design?: string | null
          color?: string | null
          created_at?: string
          details?: string[] | null
          display_order?: number
          fabric?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          length?: string | null
          license_status?: string | null
          mood?: string[] | null
          name?: string
          neckline?: string | null
          pregnancy_supported?: string | null
          silhouette?: string | null
          sleeve?: string | null
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          waist?: string | null
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          created_at: string
          delegated_scopes: string[]
          display_name: string | null
          expires_at: string
          id: string
          invite_code: string
          linked_at: string | null
          member_user_id: string | null
          owner_user_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delegated_scopes?: string[]
          display_name?: string | null
          expires_at?: string
          id?: string
          invite_code: string
          linked_at?: string | null
          member_user_id?: string | null
          owner_user_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delegated_scopes?: string[]
          display_name?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          linked_at?: string | null
          member_user_id?: string | null
          owner_user_id?: string
          role?: string
          status?: string
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
      geocode_admin: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      geocode_backfill_log: {
        Row: {
          address: string | null
          category: string | null
          created_at: string | null
          district: string | null
          district_match: boolean | null
          dry_run: boolean | null
          error: string | null
          id: number
          lat: number | null
          lng: number | null
          matched: boolean | null
          name: string | null
          place_id: string | null
          query: string | null
          raw_mapx: string | null
          raw_mapy: string | null
          run_id: string | null
          title: string | null
          used_fallback: boolean | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          district?: string | null
          district_match?: boolean | null
          dry_run?: boolean | null
          error?: string | null
          id?: never
          lat?: number | null
          lng?: number | null
          matched?: boolean | null
          name?: string | null
          place_id?: string | null
          query?: string | null
          raw_mapx?: string | null
          raw_mapy?: string | null
          run_id?: string | null
          title?: string | null
          used_fallback?: boolean | null
        }
        Update: {
          address?: string | null
          category?: string | null
          created_at?: string | null
          district?: string | null
          district_match?: boolean | null
          dry_run?: boolean | null
          error?: string | null
          id?: never
          lat?: number | null
          lng?: number | null
          matched?: boolean | null
          name?: string | null
          place_id?: string | null
          query?: string | null
          raw_mapx?: string | null
          raw_mapy?: string | null
          run_id?: string | null
          title?: string | null
          used_fallback?: boolean | null
        }
        Relationships: []
      }
      guest_list_items: {
        Row: {
          attending_count: number
          contact: string | null
          created_at: string
          id: string
          invitation_rsvp_id: string | null
          name: string
          notes: string | null
          relationship: string | null
          rsvp_status: string
          side: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attending_count?: number
          contact?: string | null
          created_at?: string
          id?: string
          invitation_rsvp_id?: string | null
          name: string
          notes?: string | null
          relationship?: string | null
          rsvp_status?: string
          side?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attending_count?: number
          contact?: string | null
          created_at?: string
          id?: string
          invitation_rsvp_id?: string | null
          name?: string
          notes?: string | null
          relationship?: string | null
          rsvp_status?: string
          side?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_list_items_invitation_rsvp_id_fkey"
            columns: ["invitation_rsvp_id"]
            isOneToOne: false
            referencedRelation: "invitation_rsvp"
            referencedColumns: ["id"]
          },
        ]
      }
      hair_preview_jobs: {
        Row: {
          charged: number | null
          created_at: string
          discounted: boolean | null
          error: string | null
          id: string
          options: string[]
          results: Json
          single_style: string | null
          source_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          options?: string[]
          results?: Json
          single_style?: string | null
          source_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          options?: string[]
          results?: Json
          single_style?: string | null
          source_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hair_preview_usage: {
        Row: {
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      hair_samples: {
        Row: {
          category: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          name: string
          prompt: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          prompt?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          prompt?: string | null
        }
        Relationships: []
      }
      heart_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      influencer_contents: {
        Row: {
          content_type: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          influencer_id: string
          like_count: number
          thumbnail_url: string | null
          title: string
          view_count: number
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          influencer_id: string
          like_count?: number
          thumbnail_url?: string | null
          title: string
          view_count?: number
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          influencer_id?: string
          like_count?: number
          thumbnail_url?: string | null
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "influencer_contents_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          bio: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          display_order: number
          external_url: string | null
          follower_count: number
          handle: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          platform: string | null
          profile_image_url: string | null
          tags: string[]
        }
        Insert: {
          bio?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_order?: number
          external_url?: string | null
          follower_count?: number
          handle?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          platform?: string | null
          profile_image_url?: string | null
          tags?: string[]
        }
        Update: {
          bio?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          display_order?: number
          external_url?: string | null
          follower_count?: number
          handle?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          platform?: string | null
          profile_image_url?: string | null
          tags?: string[]
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          answer: string | null
          answered_at: string | null
          category: string
          content: string
          created_at: string
          feedback: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          category: string
          content: string
          created_at?: string
          feedback?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          category?: string
          content?: string
          created_at?: string
          feedback?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_post_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          card_count: number
          card_image_urls: string[]
          card_texts: Json
          created_at: string
          created_by: string | null
          hashtags: string[]
          id: string
          last_error: string | null
          published_at: string | null
          published_media_id: string | null
          published_permalink: string | null
          retry_count: number
          scheduled_for: string | null
          source_id: string | null
          source_type: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          card_count?: number
          card_image_urls?: string[]
          card_texts?: Json
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          last_error?: string | null
          published_at?: string | null
          published_media_id?: string | null
          published_permalink?: string | null
          retry_count?: number
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          card_count?: number
          card_image_urls?: string[]
          card_texts?: Json
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          last_error?: string | null
          published_at?: string | null
          published_media_id?: string | null
          published_permalink?: string | null
          retry_count?: number
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitation_assets: {
        Row: {
          category: string
          collection: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          is_recolorable: boolean
          name: string
          natural_height: number | null
          natural_width: number | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category: string
          collection?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          is_recolorable?: boolean
          name: string
          natural_height?: number | null
          natural_width?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          collection?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          is_recolorable?: boolean
          name?: string
          natural_height?: number | null
          natural_width?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invitation_fonts: {
        Row: {
          category: string
          created_at: string
          display_order: number
          family: string
          file_url: string
          id: string
          is_active: boolean
          license: string | null
          name: string
          preview_url: string | null
          style: string
          supports_korean: boolean
          updated_at: string
          weight: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          family: string
          file_url: string
          id?: string
          is_active?: boolean
          license?: string | null
          name: string
          preview_url?: string | null
          style?: string
          supports_korean?: boolean
          updated_at?: string
          weight?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          family?: string
          file_url?: string
          id?: string
          is_active?: boolean
          license?: string | null
          name?: string
          preview_url?: string | null
          style?: string
          supports_korean?: boolean
          updated_at?: string
          weight?: string
        }
        Relationships: []
      }
      invitation_rsvp: {
        Row: {
          child_count: number
          companion_count: number
          created_at: string
          id: string
          invitation_id: string
          is_attending: boolean
          meal_preference: string
          message: string | null
          name: string
          side: string
        }
        Insert: {
          child_count?: number
          companion_count?: number
          created_at?: string
          id?: string
          invitation_id: string
          is_attending?: boolean
          meal_preference?: string
          message?: string | null
          name: string
          side?: string
        }
        Update: {
          child_count?: number
          companion_count?: number
          created_at?: string
          id?: string
          invitation_id?: string
          is_attending?: boolean
          meal_preference?: string
          message?: string | null
          name?: string
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_rsvp_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_templates: {
        Row: {
          created_at: string
          default_back_template_id: string | null
          default_font_id: string | null
          display_order: number
          engine_grade: string | null
          face: string
          format: string
          id: string
          is_active: boolean
          layout: Json
          name: string
          preview_url: string | null
          price_hearts: number
          recommended_fonts: string[] | null
          slug: string | null
          text_prompt_hint: string | null
          thumbnail_url: string
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_back_template_id?: string | null
          default_font_id?: string | null
          display_order?: number
          engine_grade?: string | null
          face?: string
          format?: string
          id?: string
          is_active?: boolean
          layout?: Json
          name: string
          preview_url?: string | null
          price_hearts?: number
          recommended_fonts?: string[] | null
          slug?: string | null
          text_prompt_hint?: string | null
          thumbnail_url: string
          tone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_back_template_id?: string | null
          default_font_id?: string | null
          display_order?: number
          engine_grade?: string | null
          face?: string
          format?: string
          id?: string
          is_active?: boolean
          layout?: Json
          name?: string
          preview_url?: string | null
          price_hearts?: number
          recommended_fonts?: string[] | null
          slug?: string | null
          text_prompt_hint?: string | null
          thumbnail_url?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_templates_default_back_fk"
            columns: ["default_back_template_id"]
            isOneToOne: false
            referencedRelation: "invitation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_templates_default_font_fk"
            columns: ["default_font_id"]
            isOneToOne: false
            referencedRelation: "invitation_fonts"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          ai_generated_text: Json | null
          back_template_id: string | null
          created_at: string
          id: string
          layout: Json
          preview_image_path: string | null
          share_slug: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_data: Json
          user_id: string
        }
        Insert: {
          ai_generated_text?: Json | null
          back_template_id?: string | null
          created_at?: string
          id?: string
          layout?: Json
          preview_image_path?: string | null
          share_slug?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_data?: Json
          user_id: string
        }
        Update: {
          ai_generated_text?: Json | null
          back_template_id?: string | null
          created_at?: string
          id?: string
          layout?: Json
          preview_image_path?: string | null
          share_slug?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invitation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      makeup_fittings: {
        Row: {
          created_at: string
          error_message: string | null
          hearts_spent: number
          id: string
          prompt_params: Json
          result_image_path: string | null
          selected_sample_id: string | null
          source_image_path: string
          status: string
          thumbnail_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          hearts_spent?: number
          id?: string
          prompt_params?: Json
          result_image_path?: string | null
          selected_sample_id?: string | null
          source_image_path: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          hearts_spent?: number
          id?: string
          prompt_params?: Json
          result_image_path?: string | null
          selected_sample_id?: string | null
          source_image_path?: string
          status?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "makeup_fittings_selected_sample_id_fkey"
            columns: ["selected_sample_id"]
            isOneToOne: false
            referencedRelation: "makeup_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      makeup_samples: {
        Row: {
          base_finish: string | null
          blush_color: string | null
          blush_placement: string | null
          brow_shape: string | null
          contour_intensity: string | null
          created_at: string
          details: string[] | null
          display_order: number
          eye_color: string | null
          eye_style: string | null
          id: string
          image_url: string
          is_active: boolean
          license_status: string | null
          lip_color: string | null
          lip_finish: string | null
          mood: string[] | null
          name: string
          source: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          base_finish?: string | null
          blush_color?: string | null
          blush_placement?: string | null
          brow_shape?: string | null
          contour_intensity?: string | null
          created_at?: string
          details?: string[] | null
          display_order?: number
          eye_color?: string | null
          eye_style?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          license_status?: string | null
          lip_color?: string | null
          lip_finish?: string | null
          mood?: string[] | null
          name: string
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          base_finish?: string | null
          blush_color?: string | null
          blush_placement?: string | null
          brow_shape?: string | null
          contour_intensity?: string | null
          created_at?: string
          details?: string[] | null
          display_order?: number
          eye_color?: string | null
          eye_style?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          license_status?: string | null
          lip_color?: string | null
          lip_finish?: string | null
          mood?: string[] | null
          name?: string
          source?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      naver_search_cache: {
        Row: {
          address: string | null
          cached_at: string
          city: string | null
          description: string | null
          district: string | null
          id: number
          label: string
          name: string
          naver_category: string | null
          naver_place_url: string | null
          region_query: string
          tel: string | null
        }
        Insert: {
          address?: string | null
          cached_at?: string
          city?: string | null
          description?: string | null
          district?: string | null
          id?: number
          label: string
          name: string
          naver_category?: string | null
          naver_place_url?: string | null
          region_query: string
          tel?: string | null
        }
        Update: {
          address?: string | null
          cached_at?: string
          city?: string | null
          description?: string | null
          district?: string | null
          id?: number
          label?: string
          name?: string
          naver_category?: string | null
          naver_place_url?: string | null
          region_query?: string
          tel?: string | null
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
      partnership_applications: {
        Row: {
          business_profile_id: string
          created_at: string
          id: string
          message: string | null
          review_note: string | null
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_profile_id: string
          created_at?: string
          id?: string
          message?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_profile_id?: string
          created_at?: string
          id?: string
          message?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_applications_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          plan_type: string | null
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
          plan_type?: string | null
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
          plan_type?: string | null
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
      photo_retouch_jobs: {
        Row: {
          charged: number | null
          created_at: string
          discounted: boolean | null
          error: string | null
          id: string
          results: Json
          source_paths: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          results?: Json
          source_paths?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          results?: Json
          source_paths?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_retouch_usage: {
        Row: {
          first_free_used: boolean
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          first_free_used?: boolean
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          first_free_used?: boolean
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      place_appliances: {
        Row: {
          brand_options: string[] | null
          capacity_text: string | null
          card_discount_available: boolean | null
          card_partners: string[] | null
          energy_rating: string | null
          floor_location: string | null
          free_delivery: boolean | null
          free_installation: boolean | null
          gift_items: string[] | null
          home_visit_quote: boolean | null
          installment_months: number | null
          is_bestseller: boolean | null
          is_new_model: boolean | null
          model_release_year: number | null
          negotiable: boolean | null
          old_appliance_pickup: boolean | null
          package_examples: string[] | null
          package_items: string[] | null
          package_price_range: string | null
          package_set_price: number | null
          payment_options: string[] | null
          place_id: string
          price_per_person: number | null
          product_categories: string[] | null
          product_code: string | null
          product_type: string | null
          product_url: string | null
          promotion_text: string | null
          quote_request_url: string | null
          specialties: string[] | null
          store_chain: string | null
          target_household: string | null
          total_discount_percent: number | null
          warranty_years: number | null
        }
        Insert: {
          brand_options?: string[] | null
          capacity_text?: string | null
          card_discount_available?: boolean | null
          card_partners?: string[] | null
          energy_rating?: string | null
          floor_location?: string | null
          free_delivery?: boolean | null
          free_installation?: boolean | null
          gift_items?: string[] | null
          home_visit_quote?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new_model?: boolean | null
          model_release_year?: number | null
          negotiable?: boolean | null
          old_appliance_pickup?: boolean | null
          package_examples?: string[] | null
          package_items?: string[] | null
          package_price_range?: string | null
          package_set_price?: number | null
          payment_options?: string[] | null
          place_id: string
          price_per_person?: number | null
          product_categories?: string[] | null
          product_code?: string | null
          product_type?: string | null
          product_url?: string | null
          promotion_text?: string | null
          quote_request_url?: string | null
          specialties?: string[] | null
          store_chain?: string | null
          target_household?: string | null
          total_discount_percent?: number | null
          warranty_years?: number | null
        }
        Update: {
          brand_options?: string[] | null
          capacity_text?: string | null
          card_discount_available?: boolean | null
          card_partners?: string[] | null
          energy_rating?: string | null
          floor_location?: string | null
          free_delivery?: boolean | null
          free_installation?: boolean | null
          gift_items?: string[] | null
          home_visit_quote?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new_model?: boolean | null
          model_release_year?: number | null
          negotiable?: boolean | null
          old_appliance_pickup?: boolean | null
          package_examples?: string[] | null
          package_items?: string[] | null
          package_price_range?: string | null
          package_set_price?: number | null
          payment_options?: string[] | null
          place_id?: string
          price_per_person?: number | null
          product_categories?: string[] | null
          product_code?: string | null
          product_type?: string | null
          product_url?: string | null
          promotion_text?: string | null
          quote_request_url?: string | null
          specialties?: string[] | null
          store_chain?: string | null
          target_household?: string | null
          total_discount_percent?: number | null
          warranty_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_appliances_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_claims: {
        Row: {
          business_number: string | null
          created_at: string
          id: string
          note: string | null
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_number?: string | null
          created_at?: string
          id?: string
          note?: string | null
          place_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_number?: string | null
          created_at?: string
          id?: string
          note?: string | null
          place_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_claims_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
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
          amenities: Json | null
          analyzed_at: string | null
          atmosphere: string[] | null
          avg_total_estimate: number | null
          basic_services: Json | null
          closed_days: string | null
          cons: string[] | null
          consultation_required: boolean | null
          contract_policy: string | null
          event_info: string | null
          facebook_url: string | null
          hidden_costs: string[] | null
          holiday_notice: string | null
          hours_fri: string | null
          hours_mon: string | null
          hours_sat: string | null
          hours_sun: string | null
          hours_thu: string | null
          hours_tue: string | null
          hours_wed: string | null
          image_urls: Json | null
          instagram_url: string | null
          kakao_channel_url: string | null
          naver_blog_url: string | null
          naver_place_url: string | null
          parking_capacity: number | null
          parking_free_guest: string | null
          parking_free_parents: string | null
          parking_location: string | null
          place_id: string
          price_packages: Json | null
          pros: string[] | null
          recommended_for: string[] | null
          shuttle_bus_available: boolean | null
          shuttle_bus_info: string | null
          subway_line: string | null
          subway_station: string | null
          tel: string | null
          updated_at: string | null
          walk_minutes: number | null
          website_url: string | null
          wedding_count: number | null
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
          amenities?: Json | null
          analyzed_at?: string | null
          atmosphere?: string[] | null
          avg_total_estimate?: number | null
          basic_services?: Json | null
          closed_days?: string | null
          cons?: string[] | null
          consultation_required?: boolean | null
          contract_policy?: string | null
          event_info?: string | null
          facebook_url?: string | null
          hidden_costs?: string[] | null
          holiday_notice?: string | null
          hours_fri?: string | null
          hours_mon?: string | null
          hours_sat?: string | null
          hours_sun?: string | null
          hours_thu?: string | null
          hours_tue?: string | null
          hours_wed?: string | null
          image_urls?: Json | null
          instagram_url?: string | null
          kakao_channel_url?: string | null
          naver_blog_url?: string | null
          naver_place_url?: string | null
          parking_capacity?: number | null
          parking_free_guest?: string | null
          parking_free_parents?: string | null
          parking_location?: string | null
          place_id: string
          price_packages?: Json | null
          pros?: string[] | null
          recommended_for?: string[] | null
          shuttle_bus_available?: boolean | null
          shuttle_bus_info?: string | null
          subway_line?: string | null
          subway_station?: string | null
          tel?: string | null
          updated_at?: string | null
          walk_minutes?: number | null
          website_url?: string | null
          wedding_count?: number | null
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
          amenities?: Json | null
          analyzed_at?: string | null
          atmosphere?: string[] | null
          avg_total_estimate?: number | null
          basic_services?: Json | null
          closed_days?: string | null
          cons?: string[] | null
          consultation_required?: boolean | null
          contract_policy?: string | null
          event_info?: string | null
          facebook_url?: string | null
          hidden_costs?: string[] | null
          holiday_notice?: string | null
          hours_fri?: string | null
          hours_mon?: string | null
          hours_sat?: string | null
          hours_sun?: string | null
          hours_thu?: string | null
          hours_tue?: string | null
          hours_wed?: string | null
          image_urls?: Json | null
          instagram_url?: string | null
          kakao_channel_url?: string | null
          naver_blog_url?: string | null
          naver_place_url?: string | null
          parking_capacity?: number | null
          parking_free_guest?: string | null
          parking_free_parents?: string | null
          parking_location?: string | null
          place_id?: string
          price_packages?: Json | null
          pros?: string[] | null
          recommended_for?: string[] | null
          shuttle_bus_available?: boolean | null
          shuttle_bus_info?: string | null
          subway_line?: string | null
          subway_station?: string | null
          tel?: string | null
          updated_at?: string | null
          walk_minutes?: number | null
          website_url?: string | null
          wedding_count?: number | null
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
      place_dress_shops: {
        Row: {
          alteration_count: number | null
          bestseller_designer: string | null
          bouquet_included: boolean | null
          card_partners: string[] | null
          designer_brands: Json | null
          dress_count_included: number | null
          dress_size_range: string | null
          dress_styles: string[] | null
          fitting_count: number | null
          gift_items: string[] | null
          gloves_included: boolean | null
          helper_included: boolean | null
          inner_included: boolean | null
          installment_months: number | null
          is_bestseller: boolean | null
          is_new: boolean | null
          main_dress_count: number | null
          mother_dress_available: boolean | null
          package_url: string | null
          place_id: string
          price_per_person: number | null
          private_room: boolean | null
          promotion_text: string | null
          rental_includes_alterations: boolean | null
          rental_only: boolean | null
          shoes_included: boolean | null
          sub_dress_count: number | null
          tiara_included: boolean | null
          veil_included: boolean | null
        }
        Insert: {
          alteration_count?: number | null
          bestseller_designer?: string | null
          bouquet_included?: boolean | null
          card_partners?: string[] | null
          designer_brands?: Json | null
          dress_count_included?: number | null
          dress_size_range?: string | null
          dress_styles?: string[] | null
          fitting_count?: number | null
          gift_items?: string[] | null
          gloves_included?: boolean | null
          helper_included?: boolean | null
          inner_included?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          main_dress_count?: number | null
          mother_dress_available?: boolean | null
          package_url?: string | null
          place_id: string
          price_per_person?: number | null
          private_room?: boolean | null
          promotion_text?: string | null
          rental_includes_alterations?: boolean | null
          rental_only?: boolean | null
          shoes_included?: boolean | null
          sub_dress_count?: number | null
          tiara_included?: boolean | null
          veil_included?: boolean | null
        }
        Update: {
          alteration_count?: number | null
          bestseller_designer?: string | null
          bouquet_included?: boolean | null
          card_partners?: string[] | null
          designer_brands?: Json | null
          dress_count_included?: number | null
          dress_size_range?: string | null
          dress_styles?: string[] | null
          fitting_count?: number | null
          gift_items?: string[] | null
          gloves_included?: boolean | null
          helper_included?: boolean | null
          inner_included?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          main_dress_count?: number | null
          mother_dress_available?: boolean | null
          package_url?: string | null
          place_id?: string
          price_per_person?: number | null
          private_room?: boolean | null
          promotion_text?: string | null
          rental_includes_alterations?: boolean | null
          rental_only?: boolean | null
          shoes_included?: boolean | null
          sub_dress_count?: number | null
          tiara_included?: boolean | null
          veil_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_dress_shops_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_exclusions: {
        Row: {
          excluded_at: string
          reason: string
          source_id: string
          source_name: string
        }
        Insert: {
          excluded_at?: string
          reason: string
          source_id: string
          source_name: string
        }
        Update: {
          excluded_at?: string
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
      place_hanboks: {
        Row: {
          accessories_included: boolean | null
          custom_available: boolean | null
          delivery_available: boolean | null
          hanbok_types: string[] | null
          place_id: string
          price_per_person: number | null
        }
        Insert: {
          accessories_included?: boolean | null
          custom_available?: boolean | null
          delivery_available?: boolean | null
          hanbok_types?: string[] | null
          place_id: string
          price_per_person?: number | null
        }
        Update: {
          accessories_included?: boolean | null
          custom_available?: boolean | null
          delivery_available?: boolean | null
          hanbok_types?: string[] | null
          place_id?: string
          price_per_person?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_hanboks_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_honeymoons: {
        Row: {
          agency_name: string | null
          agency_product_url: string | null
          airline: string | null
          avg_budget: number | null
          child_price: number | null
          cities: string[] | null
          countries: string[] | null
          days: number | null
          departure_airport: string | null
          departure_type: string | null
          direct_flight: boolean | null
          flight_hours: number | null
          guide_included: boolean | null
          honeymoon_perks: string[] | null
          hotel_grade: string | null
          hotel_names: string[] | null
          infant_price: number | null
          itinerary_highlights: string[] | null
          itinerary_summary: string | null
          layover_cities: string[] | null
          meal_plan: string | null
          nights: number | null
          place_id: string
          price_excludes: string[] | null
          price_includes: string[] | null
          price_per_person: number | null
          product_code: string | null
          product_type: string | null
          promotion_text: string | null
          region_group: string | null
          representative_city: string | null
          room_type: string | null
          shopping_required: boolean | null
          single_supplement: number | null
          themes: string[] | null
          usage_count: number | null
          validity_days: number | null
          visa_required: boolean | null
        }
        Insert: {
          agency_name?: string | null
          agency_product_url?: string | null
          airline?: string | null
          avg_budget?: number | null
          child_price?: number | null
          cities?: string[] | null
          countries?: string[] | null
          days?: number | null
          departure_airport?: string | null
          departure_type?: string | null
          direct_flight?: boolean | null
          flight_hours?: number | null
          guide_included?: boolean | null
          honeymoon_perks?: string[] | null
          hotel_grade?: string | null
          hotel_names?: string[] | null
          infant_price?: number | null
          itinerary_highlights?: string[] | null
          itinerary_summary?: string | null
          layover_cities?: string[] | null
          meal_plan?: string | null
          nights?: number | null
          place_id: string
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person?: number | null
          product_code?: string | null
          product_type?: string | null
          promotion_text?: string | null
          region_group?: string | null
          representative_city?: string | null
          room_type?: string | null
          shopping_required?: boolean | null
          single_supplement?: number | null
          themes?: string[] | null
          usage_count?: number | null
          validity_days?: number | null
          visa_required?: boolean | null
        }
        Update: {
          agency_name?: string | null
          agency_product_url?: string | null
          airline?: string | null
          avg_budget?: number | null
          child_price?: number | null
          cities?: string[] | null
          countries?: string[] | null
          days?: number | null
          departure_airport?: string | null
          departure_type?: string | null
          direct_flight?: boolean | null
          flight_hours?: number | null
          guide_included?: boolean | null
          honeymoon_perks?: string[] | null
          hotel_grade?: string | null
          hotel_names?: string[] | null
          infant_price?: number | null
          itinerary_highlights?: string[] | null
          itinerary_summary?: string | null
          layover_cities?: string[] | null
          meal_plan?: string | null
          nights?: number | null
          place_id?: string
          price_excludes?: string[] | null
          price_includes?: string[] | null
          price_per_person?: number | null
          product_code?: string | null
          product_type?: string | null
          promotion_text?: string | null
          region_group?: string | null
          representative_city?: string | null
          room_type?: string | null
          shopping_required?: boolean | null
          single_supplement?: number | null
          themes?: string[] | null
          usage_count?: number | null
          validity_days?: number | null
          visa_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_honeymoons_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_inquiries: {
        Row: {
          answer: string | null
          answered_at: string | null
          contact: string | null
          content: string
          created_at: string
          id: string
          place_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          contact?: string | null
          content: string
          created_at?: string
          id?: string
          place_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          contact?: string | null
          content?: string
          created_at?: string
          id?: string
          place_id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_inquiries_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_invitation_venues: {
        Row: {
          atmosphere: string[] | null
          capacity_max: number | null
          capacity_min: number | null
          corkage_fee_won: number | null
          drinks_included: boolean | null
          place_id: string
          price_per_person: number | null
          private_room_count: number | null
          room_charge_separate: boolean | null
          signature_dishes: string[] | null
          valet_parking: boolean | null
          venue_types: string[] | null
        }
        Insert: {
          atmosphere?: string[] | null
          capacity_max?: number | null
          capacity_min?: number | null
          corkage_fee_won?: number | null
          drinks_included?: boolean | null
          place_id: string
          price_per_person?: number | null
          private_room_count?: number | null
          room_charge_separate?: boolean | null
          signature_dishes?: string[] | null
          valet_parking?: boolean | null
          venue_types?: string[] | null
        }
        Update: {
          atmosphere?: string[] | null
          capacity_max?: number | null
          capacity_min?: number | null
          corkage_fee_won?: number | null
          drinks_included?: boolean | null
          place_id?: string
          price_per_person?: number | null
          private_room_count?: number | null
          room_charge_separate?: boolean | null
          signature_dishes?: string[] | null
          valet_parking?: boolean | null
          venue_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "place_invitation_venues_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_jewelry: {
        Row: {
          aftercare_includes: string[] | null
          band_design: string | null
          band_finishing: string | null
          band_profile: string | null
          band_thickness_mm: number | null
          band_width_mm: number | null
          brand_history_year: number | null
          brand_name: string | null
          brand_origin: string | null
          brand_tier: string | null
          carat_diamond: number | null
          couple_set_available: boolean | null
          custom_design_available: boolean | null
          delivery_days: number | null
          diamond_cert_org: string | null
          diamond_certified: boolean | null
          diamond_clarity: string | null
          diamond_color: string | null
          diamond_cut: string | null
          diamond_origin: string | null
          diamond_shape: string | null
          engraving_available: boolean | null
          gold_karat: string | null
          lifetime_warranty: boolean | null
          metals: string[] | null
          package_includes: string[] | null
          partnership_dept_stores: string[] | null
          place_id: string
          price_couple_set: number | null
          price_per_person: number | null
          product_categories: string[] | null
          product_code: string | null
          product_type: string | null
          product_url: string | null
          promotion_text: string | null
          showroom_count: number | null
          side_stones_count: number | null
          side_stones_total_carat: number | null
          signature_collection: string | null
          size_resize_free: boolean | null
          stone_setting: string | null
          store_type: string | null
          sub_category: string | null
        }
        Insert: {
          aftercare_includes?: string[] | null
          band_design?: string | null
          band_finishing?: string | null
          band_profile?: string | null
          band_thickness_mm?: number | null
          band_width_mm?: number | null
          brand_history_year?: number | null
          brand_name?: string | null
          brand_origin?: string | null
          brand_tier?: string | null
          carat_diamond?: number | null
          couple_set_available?: boolean | null
          custom_design_available?: boolean | null
          delivery_days?: number | null
          diamond_cert_org?: string | null
          diamond_certified?: boolean | null
          diamond_clarity?: string | null
          diamond_color?: string | null
          diamond_cut?: string | null
          diamond_origin?: string | null
          diamond_shape?: string | null
          engraving_available?: boolean | null
          gold_karat?: string | null
          lifetime_warranty?: boolean | null
          metals?: string[] | null
          package_includes?: string[] | null
          partnership_dept_stores?: string[] | null
          place_id: string
          price_couple_set?: number | null
          price_per_person?: number | null
          product_categories?: string[] | null
          product_code?: string | null
          product_type?: string | null
          product_url?: string | null
          promotion_text?: string | null
          showroom_count?: number | null
          side_stones_count?: number | null
          side_stones_total_carat?: number | null
          signature_collection?: string | null
          size_resize_free?: boolean | null
          stone_setting?: string | null
          store_type?: string | null
          sub_category?: string | null
        }
        Update: {
          aftercare_includes?: string[] | null
          band_design?: string | null
          band_finishing?: string | null
          band_profile?: string | null
          band_thickness_mm?: number | null
          band_width_mm?: number | null
          brand_history_year?: number | null
          brand_name?: string | null
          brand_origin?: string | null
          brand_tier?: string | null
          carat_diamond?: number | null
          couple_set_available?: boolean | null
          custom_design_available?: boolean | null
          delivery_days?: number | null
          diamond_cert_org?: string | null
          diamond_certified?: boolean | null
          diamond_clarity?: string | null
          diamond_color?: string | null
          diamond_cut?: string | null
          diamond_origin?: string | null
          diamond_shape?: string | null
          engraving_available?: boolean | null
          gold_karat?: string | null
          lifetime_warranty?: boolean | null
          metals?: string[] | null
          package_includes?: string[] | null
          partnership_dept_stores?: string[] | null
          place_id?: string
          price_couple_set?: number | null
          price_per_person?: number | null
          product_categories?: string[] | null
          product_code?: string | null
          product_type?: string | null
          product_url?: string | null
          promotion_text?: string | null
          showroom_count?: number | null
          side_stones_count?: number | null
          side_stones_total_carat?: number | null
          signature_collection?: string | null
          size_resize_free?: boolean | null
          stone_setting?: string | null
          store_type?: string | null
          sub_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_jewelry_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_makeup_shops: {
        Row: {
          bestseller_designer: string | null
          bridesmaid_makeup_available: boolean | null
          card_partners: string[] | null
          director_level: string | null
          early_morning_fee: number | null
          eyelash_extension_available: boolean | null
          false_lashes_included: boolean | null
          gift_items: string[] | null
          groom_grooming_available: boolean | null
          groom_grooming_price: number | null
          hair_makeup_separate: boolean | null
          includes_rehearsal: boolean | null
          installment_months: number | null
          is_bestseller: boolean | null
          is_new: boolean | null
          makeup_styles: string[] | null
          package_url: string | null
          parents_makeup_available: boolean | null
          parents_makeup_price: number | null
          place_id: string
          price_per_person: number | null
          promotion_text: string | null
          rehearsal_count: number | null
          semi_permanent_makeup: boolean | null
          travel_fee_included: boolean | null
          travel_zones: string[] | null
          wedding_day_helper: boolean | null
        }
        Insert: {
          bestseller_designer?: string | null
          bridesmaid_makeup_available?: boolean | null
          card_partners?: string[] | null
          director_level?: string | null
          early_morning_fee?: number | null
          eyelash_extension_available?: boolean | null
          false_lashes_included?: boolean | null
          gift_items?: string[] | null
          groom_grooming_available?: boolean | null
          groom_grooming_price?: number | null
          hair_makeup_separate?: boolean | null
          includes_rehearsal?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          makeup_styles?: string[] | null
          package_url?: string | null
          parents_makeup_available?: boolean | null
          parents_makeup_price?: number | null
          place_id: string
          price_per_person?: number | null
          promotion_text?: string | null
          rehearsal_count?: number | null
          semi_permanent_makeup?: boolean | null
          travel_fee_included?: boolean | null
          travel_zones?: string[] | null
          wedding_day_helper?: boolean | null
        }
        Update: {
          bestseller_designer?: string | null
          bridesmaid_makeup_available?: boolean | null
          card_partners?: string[] | null
          director_level?: string | null
          early_morning_fee?: number | null
          eyelash_extension_available?: boolean | null
          false_lashes_included?: boolean | null
          gift_items?: string[] | null
          groom_grooming_available?: boolean | null
          groom_grooming_price?: number | null
          hair_makeup_separate?: boolean | null
          includes_rehearsal?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          makeup_styles?: string[] | null
          package_url?: string | null
          parents_makeup_available?: boolean | null
          parents_makeup_price?: number | null
          place_id?: string
          price_per_person?: number | null
          promotion_text?: string | null
          rehearsal_count?: number | null
          semi_permanent_makeup?: boolean | null
          travel_fee_included?: boolean | null
          travel_zones?: string[] | null
          wedding_day_helper?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_makeup_shops_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          kind: string
          owner_user_id: string
          place_id: string
          price: number | null
          title: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          kind?: string
          owner_user_id: string
          place_id: string
          price?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          kind?: string
          owner_user_id?: string
          place_id?: string
          price?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "place_media_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
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
          owner_response: string | null
          owner_response_at: string | null
          place_id: string
          rating: number | null
          review_date: string | null
          review_id: string
          sentiment: string | null
          source_name: string | null
          source_review_id: string | null
          source_type: string | null
          title: string | null
          user_id: string | null
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
          owner_response?: string | null
          owner_response_at?: string | null
          place_id: string
          rating?: number | null
          review_date?: string | null
          review_id?: string
          sentiment?: string | null
          source_name?: string | null
          source_review_id?: string | null
          source_type?: string | null
          title?: string | null
          user_id?: string | null
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
          owner_response?: string | null
          owner_response_at?: string | null
          place_id?: string
          rating?: number | null
          review_date?: string | null
          review_id?: string
          sentiment?: string | null
          source_name?: string | null
          source_review_id?: string | null
          source_type?: string | null
          title?: string | null
          user_id?: string | null
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
      place_studio_products: {
        Row: {
          album_count: number | null
          album_pages: number | null
          concepts: string[] | null
          created_at: string | null
          display_order: number | null
          dress_included: boolean | null
          frame_included: boolean | null
          hair_makeup_included: boolean | null
          includes: string[] | null
          main_image_url: string | null
          notes: string | null
          original_count: number | null
          outdoor_included: boolean | null
          place_id: string
          price: number | null
          product_id: string
          product_name: string
          product_type: string | null
          retouch_count: number | null
          shoot_locations: string[] | null
        }
        Insert: {
          album_count?: number | null
          album_pages?: number | null
          concepts?: string[] | null
          created_at?: string | null
          display_order?: number | null
          dress_included?: boolean | null
          frame_included?: boolean | null
          hair_makeup_included?: boolean | null
          includes?: string[] | null
          main_image_url?: string | null
          notes?: string | null
          original_count?: number | null
          outdoor_included?: boolean | null
          place_id: string
          price?: number | null
          product_id?: string
          product_name: string
          product_type?: string | null
          retouch_count?: number | null
          shoot_locations?: string[] | null
        }
        Update: {
          album_count?: number | null
          album_pages?: number | null
          concepts?: string[] | null
          created_at?: string | null
          display_order?: number | null
          dress_included?: boolean | null
          frame_included?: boolean | null
          hair_makeup_included?: boolean | null
          includes?: string[] | null
          main_image_url?: string | null
          notes?: string | null
          original_count?: number | null
          outdoor_included?: boolean | null
          place_id?: string
          price?: number | null
          product_id?: string
          product_name?: string
          product_type?: string | null
          retouch_count?: number | null
          shoot_locations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "place_studio_products_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_studios: {
        Row: {
          album_extra_cost: number | null
          author_tiers: string[] | null
          base_retouch_count: number | null
          base_shoot_hours: number | null
          card_partners: string[] | null
          dress_provided: boolean | null
          editing_days: number | null
          file_format: string[] | null
          frame_included: boolean | null
          gift_items: string[] | null
          hair_makeup_included: boolean | null
          hanbok_shooting_included: boolean | null
          includes_originals: boolean | null
          instagram_discount_available: boolean | null
          installment_months: number | null
          is_bestseller: boolean | null
          is_new: boolean | null
          original_count: number | null
          outdoor_available: boolean | null
          outfit_count: number | null
          package_types: string[] | null
          package_url: string | null
          parents_photo_included: boolean | null
          per_retouch_cost: number | null
          photobook_pages: number | null
          photographer_choice: boolean | null
          place_id: string
          price_per_person: number | null
          promotion_text: string | null
          raw_file_extra_cost: number | null
          retouching_included: boolean | null
          shoot_locations: Json | null
          shoot_styles: string[] | null
          total_photos: number | null
          video_extra_cost: number | null
          video_included: boolean | null
        }
        Insert: {
          album_extra_cost?: number | null
          author_tiers?: string[] | null
          base_retouch_count?: number | null
          base_shoot_hours?: number | null
          card_partners?: string[] | null
          dress_provided?: boolean | null
          editing_days?: number | null
          file_format?: string[] | null
          frame_included?: boolean | null
          gift_items?: string[] | null
          hair_makeup_included?: boolean | null
          hanbok_shooting_included?: boolean | null
          includes_originals?: boolean | null
          instagram_discount_available?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          original_count?: number | null
          outdoor_available?: boolean | null
          outfit_count?: number | null
          package_types?: string[] | null
          package_url?: string | null
          parents_photo_included?: boolean | null
          per_retouch_cost?: number | null
          photobook_pages?: number | null
          photographer_choice?: boolean | null
          place_id: string
          price_per_person?: number | null
          promotion_text?: string | null
          raw_file_extra_cost?: number | null
          retouching_included?: boolean | null
          shoot_locations?: Json | null
          shoot_styles?: string[] | null
          total_photos?: number | null
          video_extra_cost?: number | null
          video_included?: boolean | null
        }
        Update: {
          album_extra_cost?: number | null
          author_tiers?: string[] | null
          base_retouch_count?: number | null
          base_shoot_hours?: number | null
          card_partners?: string[] | null
          dress_provided?: boolean | null
          editing_days?: number | null
          file_format?: string[] | null
          frame_included?: boolean | null
          gift_items?: string[] | null
          hair_makeup_included?: boolean | null
          hanbok_shooting_included?: boolean | null
          includes_originals?: boolean | null
          instagram_discount_available?: boolean | null
          installment_months?: number | null
          is_bestseller?: boolean | null
          is_new?: boolean | null
          original_count?: number | null
          outdoor_available?: boolean | null
          outfit_count?: number | null
          package_types?: string[] | null
          package_url?: string | null
          parents_photo_included?: boolean | null
          per_retouch_cost?: number | null
          photobook_pages?: number | null
          photographer_choice?: boolean | null
          place_id?: string
          price_per_person?: number | null
          promotion_text?: string | null
          raw_file_extra_cost?: number | null
          retouching_included?: boolean | null
          shoot_locations?: Json | null
          shoot_styles?: string[] | null
          total_photos?: number | null
          video_extra_cost?: number | null
          video_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_studios_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_tailor_shops: {
        Row: {
          accessories_included: boolean | null
          custom_available: boolean | null
          designer_brands: Json | null
          fitting_count: number | null
          place_id: string
          price_per_person: number | null
          suit_styles: string[] | null
        }
        Insert: {
          accessories_included?: boolean | null
          custom_available?: boolean | null
          designer_brands?: Json | null
          fitting_count?: number | null
          place_id: string
          price_per_person?: number | null
          suit_styles?: string[] | null
        }
        Update: {
          accessories_included?: boolean | null
          custom_available?: boolean | null
          designer_brands?: Json | null
          fitting_count?: number | null
          place_id?: string
          price_per_person?: number | null
          suit_styles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "place_tailor_shops_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      place_wedding_halls: {
        Row: {
          ceremony_only_available: boolean | null
          dress_code: string | null
          food_tasting_available: boolean | null
          hall_count: number | null
          hall_styles: string[] | null
          max_guarantee: number | null
          meal_types: string[] | null
          min_guarantee: number | null
          outdoor_available: boolean | null
          place_id: string
          price_per_person: number | null
        }
        Insert: {
          ceremony_only_available?: boolean | null
          dress_code?: string | null
          food_tasting_available?: boolean | null
          hall_count?: number | null
          hall_styles?: string[] | null
          max_guarantee?: number | null
          meal_types?: string[] | null
          min_guarantee?: number | null
          outdoor_available?: boolean | null
          place_id: string
          price_per_person?: number | null
        }
        Update: {
          ceremony_only_available?: boolean | null
          dress_code?: string | null
          food_tasting_available?: boolean | null
          hall_count?: number | null
          hall_styles?: string[] | null
          max_guarantee?: number | null
          meal_types?: string[] | null
          min_guarantee?: number | null
          outdoor_available?: boolean | null
          place_id?: string
          price_per_person?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_wedding_halls_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: true
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      places: {
        Row: {
          avg_rating: number | null
          category: string
          city: string
          confidence: number | null
          created_at: string | null
          currency: string | null
          data_completeness: number
          data_source: string | null
          deleted_at: string | null
          description: string | null
          district: string
          inquiry_channel: string
          inquiry_phone: string | null
          inquiry_url: string | null
          is_active: boolean | null
          is_partner: boolean | null
          last_collected_at: string | null
          last_source_date: string | null
          lat: number | null
          lng: number | null
          main_image_url: string | null
          min_price: number | null
          moderation_note: string | null
          moderation_status: string
          name: string
          owner_user_id: string | null
          partner_rank: number
          place_id: string
          review_count: number | null
          source_refs: Json | null
          tags: string[] | null
          updated_at: string | null
          view_count: number
        }
        Insert: {
          avg_rating?: number | null
          category: string
          city?: string
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          data_completeness?: number
          data_source?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string
          inquiry_channel?: string
          inquiry_phone?: string | null
          inquiry_url?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          last_collected_at?: string | null
          last_source_date?: string | null
          lat?: number | null
          lng?: number | null
          main_image_url?: string | null
          min_price?: number | null
          moderation_note?: string | null
          moderation_status?: string
          name: string
          owner_user_id?: string | null
          partner_rank?: number
          place_id?: string
          review_count?: number | null
          source_refs?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          avg_rating?: number | null
          category?: string
          city?: string
          confidence?: number | null
          created_at?: string | null
          currency?: string | null
          data_completeness?: number
          data_source?: string | null
          deleted_at?: string | null
          description?: string | null
          district?: string
          inquiry_channel?: string
          inquiry_phone?: string | null
          inquiry_url?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          last_collected_at?: string | null
          last_source_date?: string | null
          lat?: number | null
          lng?: number | null
          main_image_url?: string | null
          min_price?: number | null
          moderation_note?: string | null
          moderation_status?: string
          name?: string
          owner_user_id?: string | null
          partner_rank?: number
          place_id?: string
          review_count?: number | null
          source_refs?: Json | null
          tags?: string[] | null
          updated_at?: string | null
          view_count?: number
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_blocklist: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          reason: string | null
          source: string
          source_product_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          reason?: string | null
          source: string
          source_product_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          reason?: string | null
          source?: string
          source_product_id?: string
        }
        Relationships: []
      }
      product_clicks: {
        Row: {
          clicked_at: string
          id: string
          product_id: string
          source_tab: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          product_id: string
          source_tab?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          product_id?: string
          source_tab?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_search_cache: {
        Row: {
          fetched_at: string
          id: string
          query: string
          results: Json
          source: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          query: string
          results: Json
          source: string
        }
        Update: {
          fetched_at?: string
          id?: string
          query?: string
          results?: Json
          source?: string
        }
        Relationships: []
      }
      product_seed_keywords: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          keyword: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          categories: string[]
          category: string | null
          created_at: string
          description: string | null
          featured_personas: string[]
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          last_resynced_at: string | null
          name: string
          price: number
          rating: number
          raw_data: Json | null
          review_count: number
          sale_price: number | null
          short_description: string | null
          sold_count: number
          source: string
          source_mall: string | null
          source_product_id: string | null
          source_url: string | null
          stale_count: number
          stale_reason: string | null
          stock: number
          synced_at: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          categories?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          featured_personas?: string[]
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          last_resynced_at?: string | null
          name: string
          price?: number
          rating?: number
          raw_data?: Json | null
          review_count?: number
          sale_price?: number | null
          short_description?: string | null
          sold_count?: number
          source?: string
          source_mall?: string | null
          source_product_id?: string | null
          source_url?: string | null
          stale_count?: number
          stale_reason?: string | null
          stock?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          categories?: string[]
          category?: string | null
          created_at?: string
          description?: string | null
          featured_personas?: string[]
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          last_resynced_at?: string | null
          name?: string
          price?: number
          rating?: number
          raw_data?: Json | null
          review_count?: number
          sale_price?: number | null
          short_description?: string | null
          sold_count?: number
          source?: string
          source_mall?: string | null
          source_product_id?: string | null
          source_url?: string | null
          stale_count?: number
          stale_reason?: string | null
          stock?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          community_nickname: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          member_tier: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          community_nickname?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          member_tier?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          community_nickname?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          member_tier?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotional_events: {
        Row: {
          audience: string
          badge_color: string | null
          badge_label: string | null
          created_at: string
          cta_label: string
          cta_path: string
          ends_at: string | null
          ends_label: string | null
          icon: string | null
          id: string
          image_url: string | null
          position: number
          show_as_popup: boolean
          slug: string
          starts_at: string | null
          status: string
          subtitle: string | null
          target_personas: string[]
          target_styles: string[]
          thumb_bg: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          badge_color?: string | null
          badge_label?: string | null
          created_at?: string
          cta_label: string
          cta_path: string
          ends_at?: string | null
          ends_label?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          position?: number
          show_as_popup?: boolean
          slug: string
          starts_at?: string | null
          status?: string
          subtitle?: string | null
          target_personas?: string[]
          target_styles?: string[]
          thumb_bg?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          badge_color?: string | null
          badge_label?: string | null
          created_at?: string
          cta_label?: string
          cta_path?: string
          ends_at?: string | null
          ends_label?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          position?: number
          show_as_popup?: boolean
          slug?: string
          starts_at?: string | null
          status?: string
          subtitle?: string | null
          target_personas?: string[]
          target_styles?: string[]
          thumb_bg?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          place_id: string
          read_at: string | null
          request_id: string
          sender_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          place_id: string
          read_at?: string | null
          request_id: string
          sender_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          place_id?: string
          read_at?: string | null
          request_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_request_targets: {
        Row: {
          created_at: string
          owner_user_id: string
          place_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          owner_user_id: string
          place_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          owner_user_id?: string
          place_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_targets_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string
          created_at: string
          expires_at: string
          id: string
          note: string | null
          region_city: string | null
          region_district: string | null
          status: string
          style: string | null
          user_id: string
          wedding_date: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category: string
          created_at?: string
          expires_at?: string
          id?: string
          note?: string | null
          region_city?: string | null
          region_district?: string | null
          status?: string
          style?: string | null
          user_id: string
          wedding_date?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          created_at?: string
          expires_at?: string
          id?: string
          note?: string | null
          region_city?: string | null
          region_district?: string | null
          status?: string
          style?: string | null
          user_id?: string
          wedding_date?: string | null
        }
        Relationships: []
      }
      quote_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          owner_user_id: string
          place_id: string
          price_max: number | null
          price_min: number | null
          read_at: string | null
          request_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          owner_user_id: string
          place_id: string
          price_max?: number | null
          price_min?: number | null
          read_at?: string | null
          request_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          owner_user_id?: string
          place_id?: string
          price_max?: number | null
          price_min?: number | null
          read_at?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          id: string
          redeemed_at: string
          referee_user_id: string
          referrer_user_id: string
        }
        Insert: {
          code: string
          id?: string
          redeemed_at?: string
          referee_user_id: string
          referrer_user_id: string
        }
        Update: {
          code?: string
          id?: string
          redeemed_at?: string
          referee_user_id?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      service_waitlist: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          notified: boolean
          service_id: string
          user_id: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          notified?: boolean
          service_id: string
          user_id?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          notified?: boolean
          service_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          billing_failure_count: number
          billing_key: string | null
          billing_provider: string | null
          cancelled_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_billing_error: string | null
          last_billing_failure_at: string | null
          last_renewal_notified_at: string | null
          next_billing_date: string | null
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
          auto_renew?: boolean
          billing_failure_count?: number
          billing_key?: string | null
          billing_provider?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_billing_error?: string | null
          last_billing_failure_at?: string | null
          last_renewal_notified_at?: string | null
          next_billing_date?: string | null
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
          auto_renew?: boolean
          billing_failure_count?: number
          billing_key?: string | null
          billing_provider?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_billing_error?: string | null
          last_billing_failure_at?: string | null
          last_renewal_notified_at?: string | null
          next_billing_date?: string | null
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
      tip_blogs: {
        Row: {
          blogger_link: string | null
          blogger_name: string | null
          categories: string[] | null
          collected_at: string
          description: string | null
          id: string
          is_active: boolean
          is_ad_suspected: boolean
          post_date: string | null
          search_query: string | null
          source: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          blogger_link?: string | null
          blogger_name?: string | null
          categories?: string[] | null
          collected_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_ad_suspected?: boolean
          post_date?: string | null
          search_query?: string | null
          source?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          blogger_link?: string | null
          blogger_name?: string | null
          categories?: string[] | null
          collected_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_ad_suspected?: boolean
          post_date?: string | null
          search_query?: string | null
          source?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      tip_channels: {
        Row: {
          added_at: string
          channel_id: string
          channel_name: string
          is_active: boolean
          last_sync_error: string | null
          last_sync_new_videos: number | null
          last_synced_at: string | null
          notes: string | null
          video_count: number
        }
        Insert: {
          added_at?: string
          channel_id: string
          channel_name: string
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_new_videos?: number | null
          last_synced_at?: string | null
          notes?: string | null
          video_count?: number
        }
        Update: {
          added_at?: string
          channel_id?: string
          channel_name?: string
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_new_videos?: number | null
          last_synced_at?: string | null
          notes?: string | null
          video_count?: number
        }
        Relationships: []
      }
      tip_instagram_accounts: {
        Row: {
          added_at: string | null
          category: string
          display_name: string | null
          is_active: boolean
          last_sync_error: string | null
          last_sync_new: number | null
          last_synced_at: string | null
          notes: string | null
          reel_count: number
          username: string
        }
        Insert: {
          added_at?: string | null
          category?: string
          display_name?: string | null
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_new?: number | null
          last_synced_at?: string | null
          notes?: string | null
          reel_count?: number
          username: string
        }
        Update: {
          added_at?: string | null
          category?: string
          display_name?: string | null
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_new?: number | null
          last_synced_at?: string | null
          notes?: string | null
          reel_count?: number
          username?: string
        }
        Relationships: []
      }
      tip_instagrams: {
        Row: {
          author: string | null
          categories: string[] | null
          collected_at: string
          description: string | null
          id: string
          is_active: boolean
          moderation_note: string | null
          moderation_status: string
          source: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          author?: string | null
          categories?: string[] | null
          collected_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          moderation_note?: string | null
          moderation_status?: string
          source?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          author?: string | null
          categories?: string[] | null
          collected_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          moderation_note?: string | null
          moderation_status?: string
          source?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      tip_videos: {
        Row: {
          categories: string[] | null
          channel_id: string | null
          channel_name: string | null
          collected_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean | null
          like_count: number | null
          published_at: string | null
          search_query: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          categories?: string[] | null
          channel_id?: string | null
          channel_name?: string | null
          collected_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          published_at?: string | null
          search_query?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          categories?: string[] | null
          channel_id?: string | null
          channel_name?: string | null
          collected_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          published_at?: string | null
          search_query?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      tutorial_completions: {
        Row: {
          completed_at: string
          tour_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          tour_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          tour_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tutorial_tours: {
        Row: {
          tour_id: string
        }
        Insert: {
          tour_id: string
        }
        Update: {
          tour_id?: string
        }
        Relationships: []
      }
      user_ai_memory: {
        Row: {
          created_at: string
          fact_text: string
          fact_type: string
          id: string
          source_message: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fact_text: string
          fact_type: string
          id?: string
          source_message?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fact_text?: string
          fact_type?: string
          id?: string
          source_message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_attendance: {
        Row: {
          current_streak: number
          last_date: string
          longest_streak: number
          total_check_ins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_date: string
          longest_streak?: number
          total_check_ins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_date?: string
          longest_streak?: number
          total_check_ins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          agreed: boolean
          agreed_at: string
          consent_type: string
          consent_version: number
          id: string
          notes: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreed: boolean
          agreed_at?: string
          consent_type: string
          consent_version?: number
          id?: string
          notes?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreed?: boolean
          agreed_at?: string
          consent_type?: string
          consent_version?: number
          id?: string
          notes?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_hearts: {
        Row: {
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number
          id: string
          total_earned: number
          total_points: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_earned?: number
          total_points?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_earned?: number
          total_points?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          source: string
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
          source?: string
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
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wedding_settings: {
        Row: {
          ceremony_type: string | null
          country: string | null
          created_at: string
          excluded_categories: string[]
          guest_count: number | null
          has_children: boolean | null
          has_parents_bride: boolean
          has_parents_groom: boolean
          id: string
          marital_history: string | null
          partner_name: string | null
          partner_user_id: string | null
          persona_mode: string | null
          persona_mode_overridden_at: string | null
          planning_stage: string | null
          planning_style: string | null
          pregnancy_due_date: string | null
          pregnant: boolean
          role: string | null
          updated_at: string
          user_id: string
          value_tags: string[]
          wedding_country: string | null
          wedding_date: string | null
          wedding_date_tbd: boolean | null
          wedding_region: string | null
          wedding_region_sigungu: string | null
          wedding_region_tbd: boolean | null
          wedding_style: string | null
          wedding_venue_address: string | null
          wedding_venue_city: string | null
          wedding_venue_district: string | null
          wedding_venue_lat: number | null
          wedding_venue_lng: number | null
          wedding_venue_name: string | null
          wedding_venue_place_id: string | null
          wedding_venue_set_at: string | null
        }
        Insert: {
          ceremony_type?: string | null
          country?: string | null
          created_at?: string
          excluded_categories?: string[]
          guest_count?: number | null
          has_children?: boolean | null
          has_parents_bride?: boolean
          has_parents_groom?: boolean
          id?: string
          marital_history?: string | null
          partner_name?: string | null
          partner_user_id?: string | null
          persona_mode?: string | null
          persona_mode_overridden_at?: string | null
          planning_stage?: string | null
          planning_style?: string | null
          pregnancy_due_date?: string | null
          pregnant?: boolean
          role?: string | null
          updated_at?: string
          user_id: string
          value_tags?: string[]
          wedding_country?: string | null
          wedding_date?: string | null
          wedding_date_tbd?: boolean | null
          wedding_region?: string | null
          wedding_region_sigungu?: string | null
          wedding_region_tbd?: boolean | null
          wedding_style?: string | null
          wedding_venue_address?: string | null
          wedding_venue_city?: string | null
          wedding_venue_district?: string | null
          wedding_venue_lat?: number | null
          wedding_venue_lng?: number | null
          wedding_venue_name?: string | null
          wedding_venue_place_id?: string | null
          wedding_venue_set_at?: string | null
        }
        Update: {
          ceremony_type?: string | null
          country?: string | null
          created_at?: string
          excluded_categories?: string[]
          guest_count?: number | null
          has_children?: boolean | null
          has_parents_bride?: boolean
          has_parents_groom?: boolean
          id?: string
          marital_history?: string | null
          partner_name?: string | null
          partner_user_id?: string | null
          persona_mode?: string | null
          persona_mode_overridden_at?: string | null
          planning_stage?: string | null
          planning_style?: string | null
          pregnancy_due_date?: string | null
          pregnant?: boolean
          role?: string | null
          updated_at?: string
          user_id?: string
          value_tags?: string[]
          wedding_country?: string | null
          wedding_date?: string | null
          wedding_date_tbd?: boolean | null
          wedding_region?: string | null
          wedding_region_sigungu?: string | null
          wedding_region_tbd?: boolean | null
          wedding_style?: string | null
          wedding_venue_address?: string | null
          wedding_venue_city?: string | null
          wedding_venue_district?: string | null
          wedding_venue_lat?: number | null
          wedding_venue_lng?: number | null
          wedding_venue_name?: string | null
          wedding_venue_place_id?: string | null
          wedding_venue_set_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wedding_settings_wedding_venue_place_fk"
            columns: ["wedding_venue_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      view_events: {
        Row: {
          day: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          day?: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Update: {
          day?: string
          target_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      wedding_consulting_reports: {
        Row: {
          analysis: Json
          boards_remaining: number | null
          charged: number | null
          created_at: string
          discounted: boolean | null
          error: string | null
          id: string
          results: Json
          sections: string[]
          source_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis: Json
          boards_remaining?: number | null
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          results?: Json
          sections?: string[]
          source_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          boards_remaining?: number | null
          charged?: number | null
          created_at?: string
          discounted?: boolean | null
          error?: string | null
          id?: string
          results?: Json
          sections?: string[]
          source_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wedding_consulting_usage: {
        Row: {
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_reports_overview: {
        Row: {
          reason_code: string | null
          reason_text: string | null
          report_id: string | null
          reported_at: string | null
          reporter_id: string | null
          resolved_at: string | null
          status: string | null
          target_author_id: string | null
          target_id: string | null
          target_preview: string | null
          target_type: string | null
        }
        Insert: {
          reason_code?: string | null
          reason_text?: string | null
          report_id?: string | null
          reported_at?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string | null
          target_author_id?: never
          target_id?: string | null
          target_preview?: never
          target_type?: string | null
        }
        Update: {
          reason_code?: string | null
          reason_text?: string | null
          report_id?: string | null
          reported_at?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          status?: string | null
          target_author_id?: never
          target_id?: string | null
          target_preview?: never
          target_type?: string | null
        }
        Relationships: []
      }
      community_author_cards: {
        Row: {
          community_nickname: string | null
          role: string | null
          user_id: string | null
          wedding_style: string | null
        }
        Relationships: []
      }
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
      user_consents_canonical: {
        Row: {
          agreed: boolean | null
          agreed_at: string | null
          consent_type: string | null
          consent_version: number | null
          id: string | null
          notes: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          agreed?: boolean | null
          agreed_at?: string | null
          consent_type?: string | null
          consent_version?: number | null
          id?: string | null
          notes?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          agreed?: boolean | null
          agreed_at?: string | null
          consent_type?: string | null
          consent_version?: number | null
          id?: string | null
          notes?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _biz_category_to_place: { Args: { p_cat: string }; Returns: string }
      _jsonb_to_text_arr: { Args: { p: Json }; Returns: string[] }
      accept_quote_response: { Args: { p_response_id: string }; Returns: Json }
      add_game_points: {
        Args: { p_doubled?: boolean; p_score: number; p_user_id: string }
        Returns: number
      }
      admin_ai_job_stats: { Args: never; Returns: Json }
      admin_list_business_tiers: {
        Args: never
        Returns: {
          business_name: string
          id: string
          partner_tier: string
          service_category: string
        }[]
      }
      admin_list_partnership_applications: {
        Args: never
        Returns: {
          business_name: string
          business_profile_id: string
          created_at: string
          id: string
          message: string
          service_category: string
          status: string
        }[]
      }
      admin_list_pending_businesses: {
        Args: never
        Returns: {
          address: string | null
          approval_status: string
          business_name: string
          business_number: string
          business_type: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          partner_tier: string
          phone: string | null
          representative_name: string
          review_note: string | null
          reviewed_at: string | null
          service_category: string
          updated_at: string | null
          user_id: string
          vendor_id: number | null
          verified_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "business_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_pending_events: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          ends_at: string | null
          featured_until: string | null
          id: string
          moderation_note: string | null
          moderation_status: string
          owner_user_id: string
          place_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "business_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_pending_listings: {
        Args: never
        Returns: {
          avg_rating: number | null
          category: string
          city: string
          confidence: number | null
          created_at: string | null
          currency: string | null
          data_completeness: number
          data_source: string | null
          deleted_at: string | null
          description: string | null
          district: string
          inquiry_channel: string
          inquiry_phone: string | null
          inquiry_url: string | null
          is_active: boolean | null
          is_partner: boolean | null
          last_collected_at: string | null
          last_source_date: string | null
          lat: number | null
          lng: number | null
          main_image_url: string | null
          min_price: number | null
          moderation_note: string | null
          moderation_status: string
          name: string
          owner_user_id: string | null
          partner_rank: number
          place_id: string
          review_count: number | null
          source_refs: Json | null
          tags: string[] | null
          updated_at: string | null
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "places"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_pending_products: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          moderation_status: string
          name: string
          owner_user_id: string
          place_id: string
          price: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "business_products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_place_claims: {
        Args: never
        Returns: {
          business_number: string
          created_at: string
          id: string
          note: string
          place_city: string
          place_id: string
          place_name: string
          status: string
          user_id: string
        }[]
      }
      admin_review_business: {
        Args: { p_approved: boolean; p_note?: string; p_profile_id: string }
        Returns: Json
      }
      admin_review_event: {
        Args: { p_approved: boolean; p_id: string }
        Returns: Json
      }
      admin_review_listing: {
        Args: { p_approved: boolean; p_note?: string; p_place_id: string }
        Returns: Json
      }
      admin_review_partnership: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      admin_review_place_claim: {
        Args: { p_approved: boolean; p_claim_id: string }
        Returns: Json
      }
      admin_review_product: {
        Args: { p_approved: boolean; p_id: string }
        Returns: Json
      }
      admin_set_app_config: {
        Args: { p_key: string; p_value: Json }
        Returns: Json
      }
      admin_set_business_tier: {
        Args: { p_profile_id: string; p_tier: string }
        Returns: Json
      }
      admin_set_member_tier: {
        Args: { p_tier: string; p_user_id: string }
        Returns: undefined
      }
      admin_upsert_promotional_event: {
        Args: { p_payload: Json; p_slug: string }
        Returns: Json
      }
      check_referral_milestones: {
        Args: never
        Returns: {
          community_done: boolean
          has_referral: boolean
          review_done: boolean
          rewarded: boolean
          wedding_info_done: boolean
        }[]
      }
      claim_daily_attendance: {
        Args: never
        Returns: {
          base_amount: number
          bonus_amount: number
          claimed: boolean
          current_streak: number
          total_earned: number
        }[]
      }
      claim_mission_bonus: {
        Args: never
        Returns: {
          amount: number
          balance_after: number
          claimed: boolean
        }[]
      }
      cleanup_inactive_tips: {
        Args: never
        Returns: {
          blogs_deleted: number
          videos_deleted: number
        }[]
      }
      complete_tutorial: {
        Args: { p_tour_id: string }
        Returns: {
          awarded: boolean
          base_amount: number
          bonus_amount: number
          total_completed: number
        }[]
      }
      compute_place_completeness: {
        Args: { p_place_id: string }
        Returns: number
      }
      consulting_board_done: {
        Args: { p_path: string; p_report: string; p_section: string }
        Returns: undefined
      }
      create_family_invite: {
        Args: {
          p_delegated_scopes: string[]
          p_display_name: string
          p_role: string
        }
        Returns: Json
      }
      create_quote_request: {
        Args: {
          p_budget_max?: number
          p_budget_min?: number
          p_category: string
          p_city?: string
          p_district?: string
          p_note?: string
          p_style?: string
          p_wedding_date?: string
        }
        Returns: Json
      }
      derive_wedding_persona: {
        Args: {
          s: Database["public"]["Tables"]["user_wedding_settings"]["Row"]
        }
        Returns: string
      }
      earn_hearts: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_user_id: string
        }
        Returns: {
          balance_after: number
        }[]
      }
      earn_points: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_user_id: string
        }
        Returns: {
          balance_after: number
        }[]
      }
      get_my_coupon_download_count: { Args: never; Returns: number }
      get_my_listing: {
        Args: never
        Returns: {
          avg_rating: number | null
          category: string
          city: string
          confidence: number | null
          created_at: string | null
          currency: string | null
          data_completeness: number
          data_source: string | null
          deleted_at: string | null
          description: string | null
          district: string
          inquiry_channel: string
          inquiry_phone: string | null
          inquiry_url: string | null
          is_active: boolean | null
          is_partner: boolean | null
          last_collected_at: string | null
          last_source_date: string | null
          lat: number | null
          lng: number | null
          main_image_url: string | null
          min_price: number | null
          moderation_note: string | null
          moderation_status: string
          name: string
          owner_user_id: string | null
          partner_rank: number
          place_id: string
          review_count: number | null
          source_refs: Json | null
          tags: string[] | null
          updated_at: string | null
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "places"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_listing_detail: { Args: never; Returns: Json }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_place_inquiry_stats: { Args: { p_place_id: string }; Returns: Json }
      get_quote_lead_contact: { Args: { p_request_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      increment_ai_usage_gated: {
        Args: {
          p_daily_limit: number
          p_date: string
          p_minute_limit: number
          p_user_id: string
        }
        Returns: Json
      }
      increment_ai_usage_if_allowed: {
        Args: { p_date: string; p_limit: number; p_user_id: string }
        Returns: number
      }
      increment_claim_count: { Args: { deal_id: string }; Returns: undefined }
      increment_place_views: {
        Args: { p_place_id: string }
        Returns: undefined
      }
      increment_post_views: { Args: { p_post_id: string }; Returns: undefined }
      invitation_photo_paths: { Args: { layout: Json }; Returns: string[] }
      is_couple_member: {
        Args: { _couple_link_id: string; _user_id: string }
        Returns: boolean
      }
      is_couple_partner: { Args: { _other_user: string }; Returns: boolean }
      is_premium_member: { Args: { p_user_id: string }; Returns: boolean }
      list_expired_ai_uploads: {
        Args: { retention_days?: number }
        Returns: {
          bucket_id: string
          name: string
        }[]
      }
      list_expired_invitation_drafts: {
        Args: { retention_days?: number }
        Returns: {
          invitation_id: string
          photo_paths: string[]
        }[]
      }
      list_expired_invitation_published: {
        Args: { mobile_days?: number; paper_days?: number }
        Returns: {
          invitation_id: string
          photo_paths: string[]
        }[]
      }
      pay_balance: {
        Args: {
          p_item_id: string
          p_memo: string
          p_pay_date: string
          p_payment_method: string
        }
        Returns: string
      }
      pick_geocode_targets: {
        Args: { cats: string[]; lim: number }
        Returns: {
          category: string
          city: string
          district: string
          name: string
          place_id: string
        }[]
      }
      product_click_counts: {
        Args: { p_days?: number }
        Returns: {
          click_count: number
          product_id: string
        }[]
      }
      publish_invitation: {
        Args: { p_invitation_id: string }
        Returns: {
          invitation_id: string
          share_slug: string
          status: string
        }[]
      }
      reap_stuck_generation_jobs: { Args: never; Returns: number }
      redeem_couple_invite: { Args: { p_code: string }; Returns: Json }
      redeem_family_invite: { Args: { p_code: string }; Returns: Json }
      redeem_referral_code: {
        Args: { p_code: string }
        Returns: {
          message: string
          redeemed: boolean
          referee_amount: number
          referrer_amount: number
        }[]
      }
      replace_place_halls: {
        Args: { p_place_id: string; p_rows: Json }
        Returns: number
      }
      replace_studio_products: {
        Args: { p_place_id: string; p_rows: Json }
        Returns: number
      }
      request_place_claim: {
        Args: { p_note?: string; p_place_id: string }
        Returns: Json
      }
      resync_couple_settings: { Args: never; Returns: Json }
      send_quote_message: {
        Args: { p_body: string; p_place_id: string; p_request_id: string }
        Returns: Json
      }
      set_sensitive_preference: {
        Args: {
          p_consent_version?: number
          p_extra_patch?: Json
          p_field: string
          p_user_agent?: string
          p_value?: Json
        }
        Returns: Json
      }
      spend_hearts: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_user_id: string
        }
        Returns: {
          balance_after: number
          message: string
          success: boolean
        }[]
      }
      spend_points: {
        Args: {
          p_amount: number
          p_reason: string
          p_ref_id?: string
          p_user_id: string
        }
        Returns: {
          balance_after: number
        }[]
      }
      submit_place_review: {
        Args: {
          p_content: string
          p_place_id: string
          p_rating: number
          p_title: string
        }
        Returns: {
          amount: number
          awarded: boolean
          balance_after: number
          review_id: string
        }[]
      }
      submit_quote_response: {
        Args: {
          p_message: string
          p_price_max?: number
          p_price_min?: number
          p_request_id: string
        }
        Returns: Json
      }
      subscriptions_due_for_renewal_notification: {
        Args: { days_ahead?: number }
        Returns: {
          next_billing_date: string
          plan: string
          price: number
          subscription_id: string
          user_id: string
        }[]
      }
      upsert_my_listing:
        | {
            Args: {
              p_city?: string
              p_description?: string
              p_district?: string
              p_inquiry_channel?: string
              p_inquiry_phone?: string
              p_inquiry_url?: string
              p_main_image_url?: string
              p_min_price?: number
              p_name: string
              p_tags?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_city: string
              p_description: string
              p_district: string
              p_main_image_url: string
              p_min_price: number
              p_name: string
              p_tags: string[]
            }
            Returns: Json
          }
      upsert_my_listing_detail: { Args: { p_detail: Json }; Returns: Json }
    }
    Enums: {
      app_role: "individual" | "business" | "admin"
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
    Enums: {
      app_role: ["individual", "business", "admin"],
    },
  },
} as const
