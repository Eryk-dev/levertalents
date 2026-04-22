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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_images_pending: {
        Row: {
          ad_id: string
          error_message: string | null
          file_size: number | null
          id: string
          meli_image_id: string | null
          meli_image_url: string | null
          mime_type: string | null
          sku: string
          storage_path: string
          storage_url: string
          sync_status: string | null
          synced_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          ad_id: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          meli_image_id?: string | null
          meli_image_url?: string | null
          mime_type?: string | null
          sku: string
          storage_path: string
          storage_url: string
          sync_status?: string | null
          synced_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          ad_id?: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          meli_image_id?: string | null
          meli_image_url?: string | null
          mime_type?: string | null
          sku?: string
          storage_path?: string
          storage_url?: string
          sync_status?: string | null
          synced_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_pending_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads_meli"
            referencedColumns: ["platform_ad_id"]
          },
        ]
      }
      admin_config: {
        Row: {
          id: number
          password_hash: string
          session_created_at: string | null
          session_token: string | null
        }
        Insert: {
          id?: number
          password_hash: string
          session_created_at?: string | null
          session_token?: string | null
        }
        Update: {
          id?: number
          password_hash?: string
          session_created_at?: string | null
          session_token?: string | null
        }
        Relationships: []
      }
      ads_changelog: {
        Row: {
          ad_id: string
          change_source: string | null
          change_type: Database["public"]["Enums"]["marketplace_ad_change_type"]
          changed_at: string
          changed_by_user_id: string | null
          changes: Json | null
          id: string
          notes: string | null
        }
        Insert: {
          ad_id: string
          change_source?: string | null
          change_type: Database["public"]["Enums"]["marketplace_ad_change_type"]
          changed_at?: string
          changed_by_user_id?: string | null
          changes?: Json | null
          id?: string
          notes?: string | null
        }
        Update: {
          ad_id?: string
          change_source?: string | null
          change_type?: Database["public"]["Enums"]["marketplace_ad_change_type"]
          changed_at?: string
          changed_by_user_id?: string | null
          changes?: Json | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      ads_meli: {
        Row: {
          accepts_mercadopago: boolean | null
          account: string | null
          ad_name: string | null
          attributes: Json | null
          automatic_relist: boolean | null
          available_quantity: number | null
          base_price: number | null
          buying_mode: string | null
          catalog_listing: boolean | null
          catalog_product_id: string | null
          category_id: string | null
          channels: Json | null
          compatibilities: string[] | null
          condition: string | null
          coverage_areas: Json | null
          created_at: string | null
          currency_id: string | null
          date_created: string | null
          deal_ids: Json | null
          descriptions: Json | null
          differential_pricing: Json | null
          discovery_source: string | null
          domain_id: string | null
          end_time: string | null
          expiration_time: string | null
          external_image_urls: Json | null
          family_name: string | null
          geolocation: Json | null
          health: number | null
          id: string
          image_source: boolean | null
          initial_quantity: number | null
          international_delivery_mode: string | null
          inventory_id: string | null
          is_deleted: boolean | null
          item_relations: Json | null
          last_api_check: string | null
          last_updated: string | null
          listing_source: string | null
          listing_type_id: string | null
          location: Json | null
          non_mercado_pago_payment_methods: Json | null
          official_store_id: string | null
          original_price: number | null
          parent_item_id: string | null
          permalink: string | null
          pictures: Json | null
          platform_ad_id: string
          price: number | null
          raw_data: Json | null
          sale_terms: Json | null
          seller_address: Json | null
          seller_contact: Json | null
          seller_custom_field: string | null
          seller_id: number | null
          shipping: Json | null
          site_id: string | null
          sku: string
          sold_quantity: number | null
          start_time: string | null
          status: string | null
          status_stock_change: string | null
          stop_time: string | null
          sub_status: Json | null
          sync_status: string | null
          tags: Json | null
          thumbnail: string | null
          thumbnail_id: string | null
          title: string | null
          updated_at: string | null
          user_product_id: string | null
          variations: Json | null
          video_id: string | null
          warnings: Json | null
          warranty: string | null
        }
        Insert: {
          accepts_mercadopago?: boolean | null
          account?: string | null
          ad_name?: string | null
          attributes?: Json | null
          automatic_relist?: boolean | null
          available_quantity?: number | null
          base_price?: number | null
          buying_mode?: string | null
          catalog_listing?: boolean | null
          catalog_product_id?: string | null
          category_id?: string | null
          channels?: Json | null
          compatibilities?: string[] | null
          condition?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          currency_id?: string | null
          date_created?: string | null
          deal_ids?: Json | null
          descriptions?: Json | null
          differential_pricing?: Json | null
          discovery_source?: string | null
          domain_id?: string | null
          end_time?: string | null
          expiration_time?: string | null
          external_image_urls?: Json | null
          family_name?: string | null
          geolocation?: Json | null
          health?: number | null
          id?: string
          image_source?: boolean | null
          initial_quantity?: number | null
          international_delivery_mode?: string | null
          inventory_id?: string | null
          is_deleted?: boolean | null
          item_relations?: Json | null
          last_api_check?: string | null
          last_updated?: string | null
          listing_source?: string | null
          listing_type_id?: string | null
          location?: Json | null
          non_mercado_pago_payment_methods?: Json | null
          official_store_id?: string | null
          original_price?: number | null
          parent_item_id?: string | null
          permalink?: string | null
          pictures?: Json | null
          platform_ad_id: string
          price?: number | null
          raw_data?: Json | null
          sale_terms?: Json | null
          seller_address?: Json | null
          seller_contact?: Json | null
          seller_custom_field?: string | null
          seller_id?: number | null
          shipping?: Json | null
          site_id?: string | null
          sku: string
          sold_quantity?: number | null
          start_time?: string | null
          status?: string | null
          status_stock_change?: string | null
          stop_time?: string | null
          sub_status?: Json | null
          sync_status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          thumbnail_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_product_id?: string | null
          variations?: Json | null
          video_id?: string | null
          warnings?: Json | null
          warranty?: string | null
        }
        Update: {
          accepts_mercadopago?: boolean | null
          account?: string | null
          ad_name?: string | null
          attributes?: Json | null
          automatic_relist?: boolean | null
          available_quantity?: number | null
          base_price?: number | null
          buying_mode?: string | null
          catalog_listing?: boolean | null
          catalog_product_id?: string | null
          category_id?: string | null
          channels?: Json | null
          compatibilities?: string[] | null
          condition?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          currency_id?: string | null
          date_created?: string | null
          deal_ids?: Json | null
          descriptions?: Json | null
          differential_pricing?: Json | null
          discovery_source?: string | null
          domain_id?: string | null
          end_time?: string | null
          expiration_time?: string | null
          external_image_urls?: Json | null
          family_name?: string | null
          geolocation?: Json | null
          health?: number | null
          id?: string
          image_source?: boolean | null
          initial_quantity?: number | null
          international_delivery_mode?: string | null
          inventory_id?: string | null
          is_deleted?: boolean | null
          item_relations?: Json | null
          last_api_check?: string | null
          last_updated?: string | null
          listing_source?: string | null
          listing_type_id?: string | null
          location?: Json | null
          non_mercado_pago_payment_methods?: Json | null
          official_store_id?: string | null
          original_price?: number | null
          parent_item_id?: string | null
          permalink?: string | null
          pictures?: Json | null
          platform_ad_id?: string
          price?: number | null
          raw_data?: Json | null
          sale_terms?: Json | null
          seller_address?: Json | null
          seller_contact?: Json | null
          seller_custom_field?: string | null
          seller_id?: number | null
          shipping?: Json | null
          site_id?: string | null
          sku?: string
          sold_quantity?: number | null
          start_time?: string | null
          status?: string | null
          status_stock_change?: string | null
          stop_time?: string | null
          sub_status?: Json | null
          sync_status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          thumbnail_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_product_id?: string | null
          variations?: Json | null
          video_id?: string | null
          warnings?: Json | null
          warranty?: string | null
        }
        Relationships: []
      }
      ads_meli_141: {
        Row: {
          accepts_mercadopago: boolean | null
          account: string | null
          ad_name: string | null
          attributes: Json | null
          automatic_relist: boolean | null
          available_quantity: number | null
          base_price: number | null
          buying_mode: string | null
          catalog_listing: boolean | null
          catalog_product_id: string | null
          category_id: string | null
          channels: Json | null
          compatibilities: string[] | null
          condition: string | null
          coverage_areas: Json | null
          created_at: string | null
          currency_id: string | null
          date_created: string | null
          deal_ids: Json | null
          descriptions: Json | null
          differential_pricing: Json | null
          discovery_source: string | null
          domain_id: string | null
          end_time: string | null
          expiration_time: string | null
          external_image_urls: Json | null
          family_name: string | null
          geolocation: Json | null
          health: number | null
          id: string
          image_source: boolean | null
          initial_quantity: number | null
          international_delivery_mode: string | null
          inventory_id: string | null
          is_deleted: boolean | null
          item_relations: Json | null
          last_api_check: string | null
          last_updated: string | null
          listing_source: string | null
          listing_type_id: string | null
          location: Json | null
          non_mercado_pago_payment_methods: Json | null
          official_store_id: string | null
          original_price: number | null
          parent_item_id: string | null
          permalink: string | null
          pictures: Json | null
          platform_ad_id: string
          price: number | null
          raw_data: Json | null
          sale_terms: Json | null
          seller_address: Json | null
          seller_contact: Json | null
          seller_custom_field: string | null
          seller_id: number | null
          shipping: Json | null
          site_id: string | null
          sku: string
          sold_quantity: number | null
          start_time: string | null
          status: string | null
          status_stock_change: string | null
          stop_time: string | null
          sub_status: Json | null
          sync_status: string | null
          tags: Json | null
          thumbnail: string | null
          thumbnail_id: string | null
          title: string | null
          updated_at: string | null
          user_product_id: string | null
          variations: Json | null
          video_id: string | null
          warnings: Json | null
          warranty: string | null
        }
        Insert: {
          accepts_mercadopago?: boolean | null
          account?: string | null
          ad_name?: string | null
          attributes?: Json | null
          automatic_relist?: boolean | null
          available_quantity?: number | null
          base_price?: number | null
          buying_mode?: string | null
          catalog_listing?: boolean | null
          catalog_product_id?: string | null
          category_id?: string | null
          channels?: Json | null
          compatibilities?: string[] | null
          condition?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          currency_id?: string | null
          date_created?: string | null
          deal_ids?: Json | null
          descriptions?: Json | null
          differential_pricing?: Json | null
          discovery_source?: string | null
          domain_id?: string | null
          end_time?: string | null
          expiration_time?: string | null
          external_image_urls?: Json | null
          family_name?: string | null
          geolocation?: Json | null
          health?: number | null
          id?: string
          image_source?: boolean | null
          initial_quantity?: number | null
          international_delivery_mode?: string | null
          inventory_id?: string | null
          is_deleted?: boolean | null
          item_relations?: Json | null
          last_api_check?: string | null
          last_updated?: string | null
          listing_source?: string | null
          listing_type_id?: string | null
          location?: Json | null
          non_mercado_pago_payment_methods?: Json | null
          official_store_id?: string | null
          original_price?: number | null
          parent_item_id?: string | null
          permalink?: string | null
          pictures?: Json | null
          platform_ad_id: string
          price?: number | null
          raw_data?: Json | null
          sale_terms?: Json | null
          seller_address?: Json | null
          seller_contact?: Json | null
          seller_custom_field?: string | null
          seller_id?: number | null
          shipping?: Json | null
          site_id?: string | null
          sku: string
          sold_quantity?: number | null
          start_time?: string | null
          status?: string | null
          status_stock_change?: string | null
          stop_time?: string | null
          sub_status?: Json | null
          sync_status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          thumbnail_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_product_id?: string | null
          variations?: Json | null
          video_id?: string | null
          warnings?: Json | null
          warranty?: string | null
        }
        Update: {
          accepts_mercadopago?: boolean | null
          account?: string | null
          ad_name?: string | null
          attributes?: Json | null
          automatic_relist?: boolean | null
          available_quantity?: number | null
          base_price?: number | null
          buying_mode?: string | null
          catalog_listing?: boolean | null
          catalog_product_id?: string | null
          category_id?: string | null
          channels?: Json | null
          compatibilities?: string[] | null
          condition?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          currency_id?: string | null
          date_created?: string | null
          deal_ids?: Json | null
          descriptions?: Json | null
          differential_pricing?: Json | null
          discovery_source?: string | null
          domain_id?: string | null
          end_time?: string | null
          expiration_time?: string | null
          external_image_urls?: Json | null
          family_name?: string | null
          geolocation?: Json | null
          health?: number | null
          id?: string
          image_source?: boolean | null
          initial_quantity?: number | null
          international_delivery_mode?: string | null
          inventory_id?: string | null
          is_deleted?: boolean | null
          item_relations?: Json | null
          last_api_check?: string | null
          last_updated?: string | null
          listing_source?: string | null
          listing_type_id?: string | null
          location?: Json | null
          non_mercado_pago_payment_methods?: Json | null
          official_store_id?: string | null
          original_price?: number | null
          parent_item_id?: string | null
          permalink?: string | null
          pictures?: Json | null
          platform_ad_id?: string
          price?: number | null
          raw_data?: Json | null
          sale_terms?: Json | null
          seller_address?: Json | null
          seller_contact?: Json | null
          seller_custom_field?: string | null
          seller_id?: number | null
          shipping?: Json | null
          site_id?: string | null
          sku?: string
          sold_quantity?: number | null
          start_time?: string | null
          status?: string | null
          status_stock_change?: string | null
          stop_time?: string | null
          sub_status?: Json | null
          sync_status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          thumbnail_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_product_id?: string | null
          variations?: Json | null
          video_id?: string | null
          warnings?: Json | null
          warranty?: string | null
        }
        Relationships: []
      }
      analytics_api_calls: {
        Row: {
          created_at: string
          endpoint: string
          error_code: string | null
          error_message: string | null
          id: string
          is_error: boolean | null
          method: string
          request_body_summary: Json | null
          request_headers: Json | null
          request_params: Json | null
          response_size_bytes: number | null
          response_status: number | null
          response_time_ms: number | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_error?: boolean | null
          method: string
          request_body_summary?: Json | null
          request_headers?: Json | null
          request_params?: Json | null
          response_size_bytes?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          is_error?: boolean | null
          method?: string
          request_body_summary?: Json | null
          request_headers?: Json | null
          request_params?: Json | null
          response_size_bytes?: number | null
          response_status?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_calls_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          component_name: string | null
          created_at: string
          element_class: string | null
          element_id: string | null
          element_text: string | null
          element_type: string | null
          event_action: string
          event_category: string
          event_data: Json | null
          event_label: string | null
          event_type: string
          event_value: number | null
          id: string
          page_path: string | null
          page_title: string | null
          page_url: string | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          element_type?: string | null
          event_action: string
          event_category: string
          event_data?: Json | null
          event_label?: string | null
          event_type: string
          event_value?: number | null
          id?: string
          page_path?: string | null
          page_title?: string | null
          page_url?: string | null
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          component_name?: string | null
          created_at?: string
          element_class?: string | null
          element_id?: string | null
          element_text?: string | null
          element_type?: string | null
          event_action?: string
          event_category?: string
          event_data?: Json | null
          event_label?: string | null
          event_type?: string
          event_value?: number | null
          id?: string
          page_path?: string | null
          page_title?: string | null
          page_url?: string | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_features: {
        Row: {
          action_detail: string | null
          action_type: string
          created_at: string
          data_size_bytes: number | null
          duration_ms: number | null
          error_message: string | null
          error_type: string | null
          feature_category: string | null
          feature_name: string
          feature_version: string | null
          id: string
          input_summary: Json | null
          is_successful: boolean | null
          items_count: number | null
          output_summary: Json | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          action_detail?: string | null
          action_type: string
          created_at?: string
          data_size_bytes?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          feature_category?: string | null
          feature_name: string
          feature_version?: string | null
          id?: string
          input_summary?: Json | null
          is_successful?: boolean | null
          items_count?: number | null
          output_summary?: Json | null
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          action_detail?: string | null
          action_type?: string
          created_at?: string
          data_size_bytes?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          feature_category?: string | null
          feature_name?: string
          feature_version?: string | null
          id?: string
          input_summary?: Json | null
          is_successful?: boolean | null
          items_count?: number | null
          output_summary?: Json | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_performance: {
        Row: {
          cls_score: number | null
          created_at: string
          dom_ready_ms: number | null
          fcp_ms: number | null
          fid_ms: number | null
          id: string
          lcp_ms: number | null
          page_load_ms: number | null
          page_path: string
          page_url: string
          resources_count: number | null
          resources_size_bytes: number | null
          session_id: string | null
          timestamp: string
          ttfb_ms: number | null
          user_id: string
        }
        Insert: {
          cls_score?: number | null
          created_at?: string
          dom_ready_ms?: number | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          page_load_ms?: number | null
          page_path: string
          page_url: string
          resources_count?: number | null
          resources_size_bytes?: number | null
          session_id?: string | null
          timestamp?: string
          ttfb_ms?: number | null
          user_id: string
        }
        Update: {
          cls_score?: number | null
          created_at?: string
          dom_ready_ms?: number | null
          fcp_ms?: number | null
          fid_ms?: number | null
          id?: string
          lcp_ms?: number | null
          page_load_ms?: number | null
          page_path?: string
          page_url?: string
          resources_count?: number | null
          resources_size_bytes?: number | null
          session_id?: string | null
          timestamp?: string
          ttfb_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_performance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_searches: {
        Row: {
          clicked_result_id: string | null
          clicked_result_position: number | null
          created_at: string
          has_results: boolean | null
          id: string
          is_refined_search: boolean | null
          parent_search_id: string | null
          result_clicked: boolean | null
          results_count: number | null
          results_returned: number | null
          search_duration_ms: number | null
          search_filters: Json | null
          search_query: string
          search_type: string
          session_id: string | null
          time_to_click_ms: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          clicked_result_id?: string | null
          clicked_result_position?: number | null
          created_at?: string
          has_results?: boolean | null
          id?: string
          is_refined_search?: boolean | null
          parent_search_id?: string | null
          result_clicked?: boolean | null
          results_count?: number | null
          results_returned?: number | null
          search_duration_ms?: number | null
          search_filters?: Json | null
          search_query: string
          search_type: string
          session_id?: string | null
          time_to_click_ms?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          clicked_result_id?: string | null
          clicked_result_position?: number | null
          created_at?: string
          has_results?: boolean | null
          id?: string
          is_refined_search?: boolean | null
          parent_search_id?: string | null
          result_clicked?: boolean | null
          results_count?: number | null
          results_returned?: number | null
          search_duration_ms?: number | null
          search_filters?: Json | null
          search_query?: string
          search_type?: string
          session_id?: string | null
          time_to_click_ms?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_activity_parent_search_id_fkey"
            columns: ["parent_search_id"]
            isOneToOne: false
            referencedRelation: "analytics_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          api_calls_count: number
          auth_session_id: string | null
          browser_info: Json | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_page: string | null
          entry_referrer: string | null
          events_count: number
          exit_page: string | null
          id: string
          ip_address: unknown
          is_active: boolean
          language: string | null
          last_activity_at: string
          page_views_count: number
          screen_resolution: string | null
          started_at: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          api_calls_count?: number
          auth_session_id?: string | null
          browser_info?: Json | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_referrer?: string | null
          events_count?: number
          exit_page?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          language?: string | null
          last_activity_at?: string
          page_views_count?: number
          screen_resolution?: string | null
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          api_calls_count?: number
          auth_session_id?: string | null
          browser_info?: Json | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          entry_referrer?: string | null
          events_count?: number
          exit_page?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean
          language?: string | null
          last_activity_at?: string
          page_views_count?: number
          screen_resolution?: string | null
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      api_debug_logs: {
        Row: {
          action: string
          adjustments: string[] | null
          api_method: string | null
          api_url: string | null
          attempt_number: number | null
          copy_log_id: number | null
          created_at: string | null
          dest_item_id: string | null
          dest_seller: string | null
          error_message: string | null
          id: number
          org_id: string | null
          platform: string | null
          request_payload: Json | null
          resolved: boolean | null
          response_body: Json | null
          response_status: number | null
          source_item_id: string | null
          source_seller: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          adjustments?: string[] | null
          api_method?: string | null
          api_url?: string | null
          attempt_number?: number | null
          copy_log_id?: number | null
          created_at?: string | null
          dest_item_id?: string | null
          dest_seller?: string | null
          error_message?: string | null
          id?: number
          org_id?: string | null
          platform?: string | null
          request_payload?: Json | null
          resolved?: boolean | null
          response_body?: Json | null
          response_status?: number | null
          source_item_id?: string | null
          source_seller?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          adjustments?: string[] | null
          api_method?: string | null
          api_url?: string | null
          attempt_number?: number | null
          copy_log_id?: number | null
          created_at?: string | null
          dest_item_id?: string | null
          dest_seller?: string | null
          error_message?: string | null
          id?: number
          org_id?: string | null
          platform?: string | null
          request_payload?: Json | null
          resolved?: boolean | null
          response_body?: Json | null
          response_status?: number | null
          source_item_id?: string | null
          source_seller?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_debug_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_debug_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_stage_history: {
        Row: {
          application_id: string
          from_stage:
            | Database["public"]["Enums"]["application_stage_enum"]
            | null
          id: string
          moved_at: string
          moved_by: string
          note: string | null
          to_stage: Database["public"]["Enums"]["application_stage_enum"]
        }
        Insert: {
          application_id: string
          from_stage?:
            | Database["public"]["Enums"]["application_stage_enum"]
            | null
          id?: string
          moved_at?: string
          moved_by: string
          note?: string | null
          to_stage: Database["public"]["Enums"]["application_stage_enum"]
        }
        Update: {
          application_id?: string
          from_stage?:
            | Database["public"]["Enums"]["application_stage_enum"]
            | null
          id?: string
          moved_at?: string
          moved_by?: string
          note?: string | null
          to_stage?: Database["public"]["Enums"]["application_stage_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "application_stage_history_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          closed_at: string | null
          created_at: string
          id: string
          job_opening_id: string
          last_moved_by: string | null
          notes: string | null
          rejection_message_id: string | null
          stage: Database["public"]["Enums"]["application_stage_enum"]
          stage_entered_at: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          job_opening_id: string
          last_moved_by?: string | null
          notes?: string | null
          rejection_message_id?: string | null
          stage?: Database["public"]["Enums"]["application_stage_enum"]
          stage_entered_at?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          job_opening_id?: string
          last_moved_by?: string | null
          notes?: string | null
          rejection_message_id?: string | null
          stage?: Database["public"]["Enums"]["application_stage_enum"]
          stage_entered_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "jobs_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_last_moved_by_fkey"
            columns: ["last_moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_rejection_message_fkey"
            columns: ["rejection_message_id"]
            isOneToOne: false
            referencedRelation: "standard_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          session_info: Json | null
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          session_info?: Json | null
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          session_info?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      auth_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          org_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          org_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auth_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      background_checks: {
        Row: {
          application_id: string
          created_at: string
          file_path: string | null
          id: string
          note: string | null
          status_flag: Database["public"]["Enums"]["background_status_enum"]
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          application_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          note?: string | null
          status_flag: Database["public"]["Enums"]["background_status_enum"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          application_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          note?: string | null
          status_flag?: Database["public"]["Enums"]["background_status_enum"]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_checks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_checks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "background_checks_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_jobs: {
        Row: {
          attempts: number
          ca_endpoint: string
          ca_method: string
          ca_payload: Json
          ca_protocolo: string | null
          ca_response_body: Json | null
          ca_response_status: number | null
          completed_at: string | null
          created_at: string
          group_id: string | null
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          priority: number
          scheduled_for: string
          seller_slug: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          ca_endpoint: string
          ca_method?: string
          ca_payload: Json
          ca_protocolo?: string | null
          ca_response_body?: Json | null
          ca_response_status?: number | null
          completed_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          idempotency_key: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          priority?: number
          scheduled_for?: string
          seller_slug: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          ca_endpoint?: string
          ca_method?: string
          ca_payload?: Json
          ca_protocolo?: string | null
          ca_response_body?: Json | null
          ca_response_status?: number | null
          completed_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          idempotency_key?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          priority?: number
          scheduled_for?: string
          seller_slug?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ca_tokens: {
        Row: {
          access_token: string
          expires_at: number
          id: number
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          expires_at: number
          id?: number
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          expires_at?: number
          id?: number
          refresh_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      candidate_access_log: {
        Row: {
          action: Database["public"]["Enums"]["log_action_enum"]
          actor_id: string
          actual_version: string | null
          at: string
          candidate_id: string
          expected_version: string | null
          id: string
          resource: string
          resource_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["log_action_enum"]
          actor_id: string
          actual_version?: string | null
          at?: string
          candidate_id: string
          expected_version?: string | null
          id?: string
          resource: string
          resource_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["log_action_enum"]
          actor_id?: string
          actual_version?: string | null
          at?: string
          candidate_id?: string
          expected_version?: string | null
          id?: string
          resource?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_access_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_access_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          anonymization_reason:
            | Database["public"]["Enums"]["anonymization_reason_enum"]
            | null
          anonymized_at: string | null
          cpf: string | null
          created_at: string
          cv_storage_path: string | null
          document_number: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          email: string
          full_name: string
          id: string
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          anonymization_reason?:
            | Database["public"]["Enums"]["anonymization_reason_enum"]
            | null
          anonymized_at?: string | null
          cpf?: string | null
          created_at?: string
          cv_storage_path?: string | null
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          email: string
          full_name: string
          id?: string
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          anonymization_reason?:
            | Database["public"]["Enums"]["anonymization_reason_enum"]
            | null
          anonymized_at?: string | null
          cpf?: string | null
          created_at?: string
          cv_storage_path?: string | null
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      climate_questions: {
        Row: {
          category: string
          created_at: string | null
          id: string
          question_order: number
          question_text: string
          survey_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          question_order: number
          question_text: string
          survey_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          question_order?: number
          question_text?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "climate_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_responses: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          question_id: string
          score: number
          survey_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          question_id: string
          score: number
          survey_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
          score?: number
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "climate_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climate_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "climate_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climate_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_surveys: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          id: string
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string | null
          differentials: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          overview: string | null
          tagline: string | null
          updated_at: string
          values_list: string[]
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string | null
          differentials?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          overview?: string | null
          tagline?: string | null
          updated_at?: string
          values_list?: string[]
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string | null
          differentials?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          overview?: string | null
          tagline?: string | null
          updated_at?: string
          values_list?: string[]
          website?: string | null
        }
        Relationships: []
      }
      company: {
        Row: {
          adress: string | null
          city: string | null
          company_name: string | null
          created_at: string
          default_stock: string | null
          id: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          adress?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_stock?: string | null
          id?: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          adress?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_stock?: string | null
          id?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compat_logs: {
        Row: {
          created_at: string | null
          error_count: number
          id: number
          org_id: string | null
          skus: string[]
          source_item_id: string
          status: string
          success_count: number
          targets: Json
          total_targets: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_count: number
          id?: number
          org_id?: string | null
          skus: string[]
          source_item_id: string
          status?: string
          success_count: number
          targets: Json
          total_targets: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number
          id?: number
          org_id?: string | null
          skus?: string[]
          source_item_id?: string
          status?: string
          success_count?: number
          targets?: Json
          total_targets?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compat_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          content: string
          created_at: string | null
          file_metadata: Json | null
          file_urls: Json | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_metadata?: Json | null
          file_urls?: Json | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_metadata?: Json | null
          file_urls?: Json | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: []
      }
      copy_logs: {
        Row: {
          correction_details: Json | null
          created_at: string | null
          dest_item_ids: Json | null
          dest_sellers: string[]
          error_details: Json | null
          id: number
          org_id: string | null
          source_item_id: string
          source_item_sku: string | null
          source_item_thumbnail: string | null
          source_item_title: string | null
          source_seller: string
          status: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          correction_details?: Json | null
          created_at?: string | null
          dest_item_ids?: Json | null
          dest_sellers: string[]
          error_details?: Json | null
          id?: number
          org_id?: string | null
          source_item_id: string
          source_item_sku?: string | null
          source_item_thumbnail?: string | null
          source_item_title?: string | null
          source_seller: string
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          correction_details?: Json | null
          created_at?: string | null
          dest_item_ids?: Json | null
          dest_sellers?: string[]
          error_details?: Json | null
          id?: number
          org_id?: string | null
          source_item_id?: string
          source_item_sku?: string | null
          source_item_thumbnail?: string | null
          source_item_title?: string | null
          source_seller?: string
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copy_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_sellers: {
        Row: {
          active: boolean | null
          created_at: string | null
          ml_access_token: string | null
          ml_app_id: string | null
          ml_refresh_token: string | null
          ml_secret_key: string | null
          ml_token_expires_at: string | null
          ml_user_id: number | null
          name: string | null
          official_store_id: number | null
          org_id: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          ml_access_token?: string | null
          ml_app_id?: string | null
          ml_refresh_token?: string | null
          ml_secret_key?: string | null
          ml_token_expires_at?: string | null
          ml_user_id?: number | null
          name?: string | null
          official_store_id?: number | null
          org_id: string
          slug: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          ml_access_token?: string | null
          ml_app_id?: string | null
          ml_refresh_token?: string | null
          ml_secret_key?: string | null
          ml_token_expires_at?: string | null
          ml_user_id?: number | null
          name?: string | null
          official_store_id?: number | null
          org_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_sellers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_fit_questions: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["fit_question_kind_enum"]
          options: Json | null
          order_index: number
          prompt: string
          scale_max: number | null
          scale_min: number | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["fit_question_kind_enum"]
          options?: Json | null
          order_index: number
          prompt: string
          scale_max?: number | null
          scale_min?: number | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["fit_question_kind_enum"]
          options?: Json | null
          order_index?: number
          prompt?: string
          scale_max?: number | null
          scale_min?: number | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_fit_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_fit_responses: {
        Row: {
          anonymized_at: string | null
          application_id: string
          created_at: string
          id: string
          payload: Json
          submitted_at: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          application_id: string
          created_at?: string
          id?: string
          payload: Json
          submitted_at?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          application_id?: string
          created_at?: string
          id?: string
          payload?: Json
          submitted_at?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_fit_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "cultural_fit_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_fit_surveys: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_fit_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_fit_tokens: {
        Row: {
          application_id: string
          consumed_at: string | null
          expires_at: string
          id: string
          issued_at: string
          revoked_at: string | null
          survey_id: string
          token_hash: string
        }
        Insert: {
          application_id: string
          consumed_at?: string | null
          expires_at: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          survey_id: string
          token_hash: string
        }
        Update: {
          application_id?: string
          consumed_at?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          survey_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_fit_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "cultural_fit_tokens_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_tokens_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          configuration: Json | null
          created_at: string
          id: number
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          id?: number
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          id?: number
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      debug_list_users_log: {
        Row: {
          caller_user_id: string | null
          created_at: string | null
          error_message: string | null
          error_name: string | null
          extra: Json | null
          id: number
          step: string
        }
        Insert: {
          caller_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_name?: string | null
          extra?: Json | null
          id?: number
          step: string
        }
        Update: {
          caller_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          error_name?: string | null
          extra?: Json | null
          id?: number
          step?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          company_id: string | null
          created_at: string
          deposit_name: string
          empresa: string | null
          external_id: number | null
          id: string
          next_to: string | null
          stock_type: string | null
          type: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          deposit_name: string
          empresa?: string | null
          external_id?: number | null
          id?: string
          next_to?: string | null
          stock_type?: string | null
          type?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          deposit_name?: string
          empresa?: string | null
          external_id?: number | null
          id?: string
          next_to?: string | null
          stock_type?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sources_next_to_fkey"
            columns: ["next_to"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sources_next_to_fkey1"
            columns: ["next_to"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plan_updates: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          plan_id: string
          progress_change: number | null
          update_text: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          plan_id: string
          progress_change?: number | null
          update_text: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          plan_id?: string
          progress_change?: number | null
          update_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plan_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plan_updates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "development_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      development_plans: {
        Row: {
          action_items: string
          anticipated_challenges: string | null
          approved_at: string | null
          approved_by: string | null
          committed_actions: string | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          development_area: string
          goals: string
          id: string
          main_objective: string | null
          one_on_one_id: string | null
          progress_percentage: number | null
          required_support: string | null
          status: string | null
          success_metrics: string | null
          timeline: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_items: string
          anticipated_challenges?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committed_actions?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          development_area: string
          goals: string
          id?: string
          main_objective?: string | null
          one_on_one_id?: string | null
          progress_percentage?: number | null
          required_support?: string | null
          status?: string | null
          success_metrics?: string | null
          timeline?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_items?: string
          anticipated_challenges?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committed_actions?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          development_area?: string
          goals?: string
          id?: string
          main_objective?: string | null
          one_on_one_id?: string | null
          progress_percentage?: number | null
          required_support?: string | null
          status?: string | null
          success_metrics?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      ecommerce_qa: {
        Row: {
          answer: string | null
          answer_date: string | null
          created_at: string | null
          id: string
          platform: string
          question: string
          question_date: string | null
          sku: string
        }
        Insert: {
          answer?: string | null
          answer_date?: string | null
          created_at?: string | null
          id?: string
          platform: string
          question: string
          question_date?: string | null
          sku: string
        }
        Update: {
          answer?: string | null
          answer_date?: string | null
          created_at?: string | null
          id?: string
          platform?: string
          question?: string
          question_date?: string | null
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ecommerce_qa_sku"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      employee_onboarding_handoffs: {
        Row: {
          application_id: string
          contract_type:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cost_cents: number | null
          created_at: string
          final_title: string | null
          id: string
          leader_id: string | null
          onboarded_at: string | null
          profile_id: string
          start_date: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cost_cents?: number | null
          created_at?: string
          final_title?: string | null
          id?: string
          leader_id?: string | null
          onboarded_at?: string | null
          profile_id: string
          start_date?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cost_cents?: number | null
          created_at?: string
          final_title?: string | null
          id?: string
          leader_id?: string | null
          onboarded_at?: string | null
          profile_id?: string
          start_date?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_handoffs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_handoffs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "employee_onboarding_handoffs_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_handoffs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_handoffs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          areas_for_improvement: string | null
          behavioral_score: number | null
          comments: string | null
          created_at: string | null
          evaluated_user_id: string
          evaluator_user_id: string
          id: string
          leadership_score: number | null
          overall_score: number | null
          period: string
          status: string | null
          strengths: string | null
          technical_score: number | null
          updated_at: string | null
        }
        Insert: {
          areas_for_improvement?: string | null
          behavioral_score?: number | null
          comments?: string | null
          created_at?: string | null
          evaluated_user_id: string
          evaluator_user_id: string
          id?: string
          leadership_score?: number | null
          overall_score?: number | null
          period: string
          status?: string | null
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Update: {
          areas_for_improvement?: string | null
          behavioral_score?: number | null
          comments?: string | null
          created_at?: string | null
          evaluated_user_id?: string
          evaluator_user_id?: string
          id?: string
          leadership_score?: number | null
          overall_score?: number | null
          period?: string
          status?: string | null
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluated_user_id_fkey"
            columns: ["evaluated_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_user_id_fkey"
            columns: ["evaluator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_batch_items: {
        Row: {
          amount_signed: number
          batch_id: string
          created_at: string
          expense_date: string | null
          expense_direction: string | null
          expense_id: number
          payment_id: number | null
          seller_slug: string
          snapshot_payload: Json | null
          status_snapshot: string | null
        }
        Insert: {
          amount_signed?: number
          batch_id: string
          created_at?: string
          expense_date?: string | null
          expense_direction?: string | null
          expense_id: number
          payment_id?: number | null
          seller_slug: string
          snapshot_payload?: Json | null
          status_snapshot?: string | null
        }
        Update: {
          amount_signed?: number
          batch_id?: string
          created_at?: string
          expense_date?: string | null
          expense_direction?: string | null
          expense_id?: number
          payment_id?: number | null
          seller_slug?: string
          snapshot_payload?: Json | null
          status_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_expense_batch_items_batch"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "expense_batches"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      expense_batches: {
        Row: {
          amount_total_signed: number
          batch_id: string
          company: string
          created_at: string
          date_from: string | null
          date_to: string | null
          exported_at: string | null
          gdrive_error: string | null
          gdrive_file_id: string | null
          gdrive_file_link: string | null
          gdrive_folder_link: string | null
          gdrive_status: string | null
          gdrive_updated_at: string | null
          imported_at: string | null
          notes: string | null
          rows_count: number
          seller_slug: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_total_signed?: number
          batch_id: string
          company: string
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          exported_at?: string | null
          gdrive_error?: string | null
          gdrive_file_id?: string | null
          gdrive_file_link?: string | null
          gdrive_folder_link?: string | null
          gdrive_status?: string | null
          gdrive_updated_at?: string | null
          imported_at?: string | null
          notes?: string | null
          rows_count?: number
          seller_slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_total_signed?: number
          batch_id?: string
          company?: string
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          exported_at?: string | null
          gdrive_error?: string | null
          gdrive_file_id?: string | null
          gdrive_file_link?: string | null
          gdrive_folder_link?: string | null
          gdrive_status?: string | null
          gdrive_updated_at?: string | null
          imported_at?: string | null
          notes?: string | null
          rows_count?: number
          seller_slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      extrato_uploads: {
        Row: {
          csv_content: string | null
          error_message: string | null
          filename: string | null
          final_balance: number | null
          id: number
          initial_balance: number | null
          lines_already_covered: number | null
          lines_ingested: number | null
          lines_skipped: number | null
          lines_total: number | null
          month: string
          seller_slug: string
          status: string | null
          summary: Json | null
          uploaded_at: string | null
        }
        Insert: {
          csv_content?: string | null
          error_message?: string | null
          filename?: string | null
          final_balance?: number | null
          id?: number
          initial_balance?: number | null
          lines_already_covered?: number | null
          lines_ingested?: number | null
          lines_skipped?: number | null
          lines_total?: number | null
          month: string
          seller_slug: string
          status?: string | null
          summary?: Json | null
          uploaded_at?: string | null
        }
        Update: {
          csv_content?: string | null
          error_message?: string | null
          filename?: string | null
          final_balance?: number | null
          id?: number
          initial_balance?: number | null
          lines_already_covered?: number | null
          lines_ingested?: number | null
          lines_skipped?: number | null
          lines_total?: number | null
          month?: string
          seller_slug?: string
          status?: string | null
          summary?: Json | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extrato_uploads_seller_slug_fkey"
            columns: ["seller_slug"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["slug"]
          },
        ]
      }
      faturamento: {
        Row: {
          created_at: string | null
          data: string
          empresa: string
          id: number
          source: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          empresa: string
          id?: number
          source?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          empresa?: string
          id?: number
          source?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          empresa: string
          grupo: string
          id: string
          month: number
          valor: number
          year: number
        }
        Insert: {
          empresa: string
          grupo: string
          id?: string
          month: number
          valor?: number
          year?: number
        }
        Update: {
          empresa?: string
          grupo?: string
          id?: string
          month?: number
          valor?: number
          year?: number
        }
        Relationships: []
      }
      hiring_decisions: {
        Row: {
          application_id: string
          created_at: string
          decided_at: string
          id: string
          outcome: Database["public"]["Enums"]["hiring_outcome_enum"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          decided_at?: string
          id?: string
          outcome: Database["public"]["Enums"]["hiring_outcome_enum"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          decided_at?: string
          id?: string
          outcome?: Database["public"]["Enums"]["hiring_outcome_enum"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
        ]
      }
      image_slot_configurations: {
        Row: {
          created_at: string | null
          id: string
          image_id: string | null
          image_metadata: Json | null
          image_source: string
          image_url: string | null
          sku: string
          slot_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          image_metadata?: Json | null
          image_source: string
          image_url?: string | null
          sku: string
          slot_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          image_metadata?: Json | null
          image_source?: string
          image_url?: string | null
          sku?: string
          slot_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_slot_configurations_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      interview_decisions: {
        Row: {
          comments: string | null
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["evaluator_decision_enum"]
          evaluator_id: string
          id: string
          interview_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["evaluator_decision_enum"]
          evaluator_id: string
          id?: string
          interview_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["evaluator_decision_enum"]
          evaluator_id?: string
          id?: string
          interview_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_decisions_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_decisions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          kind: Database["public"]["Enums"]["interview_kind_enum"]
          location_or_link: string | null
          mode: Database["public"]["Enums"]["interview_mode_enum"]
          participants: string[]
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status_enum"]
          summary: string | null
          transcript_path: string | null
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          id?: string
          kind: Database["public"]["Enums"]["interview_kind_enum"]
          location_or_link?: string | null
          mode: Database["public"]["Enums"]["interview_mode_enum"]
          participants?: string[]
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status_enum"]
          summary?: string | null
          transcript_path?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["interview_kind_enum"]
          location_or_link?: string | null
          mode?: Database["public"]["Enums"]["interview_mode_enum"]
          participants?: string[]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status_enum"]
          summary?: string | null
          transcript_path?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "v_hiring_bottlenecks"
            referencedColumns: ["application_id"]
          },
          {
            foreignKeyName: "interviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_descriptions: {
        Row: {
          approval_state: Database["public"]["Enums"]["description_approval_enum"]
          approved_at: string | null
          approver_id: string | null
          author_id: string
          benefits_list: string[]
          content_md: string | null
          created_at: string
          daily_routine: string | null
          expectations: string | null
          id: string
          job_opening_id: string
          pdf_path: string | null
          rejection_reason: string | null
          requirements: string[]
          updated_at: string
          version: number
          work_schedule: string | null
        }
        Insert: {
          approval_state?: Database["public"]["Enums"]["description_approval_enum"]
          approved_at?: string | null
          approver_id?: string | null
          author_id: string
          benefits_list?: string[]
          content_md?: string | null
          created_at?: string
          daily_routine?: string | null
          expectations?: string | null
          id?: string
          job_opening_id: string
          pdf_path?: string | null
          rejection_reason?: string | null
          requirements?: string[]
          updated_at?: string
          version: number
          work_schedule?: string | null
        }
        Update: {
          approval_state?: Database["public"]["Enums"]["description_approval_enum"]
          approved_at?: string | null
          approver_id?: string | null
          author_id?: string
          benefits_list?: string[]
          content_md?: string | null
          created_at?: string
          daily_routine?: string | null
          expectations?: string | null
          id?: string
          job_opening_id?: string
          pdf_path?: string | null
          rejection_reason?: string | null
          requirements?: string[]
          updated_at?: string
          version?: number
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "jobs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_external_publications: {
        Row: {
          channel: Database["public"]["Enums"]["publication_channel_enum"]
          created_at: string
          id: string
          job_opening_id: string
          note: string | null
          published_at: string
          published_by: string
          updated_at: string
          url: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["publication_channel_enum"]
          created_at?: string
          id?: string
          job_opening_id: string
          note?: string | null
          published_at: string
          published_by: string
          updated_at?: string
          url: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["publication_channel_enum"]
          created_at?: string
          id?: string
          job_opening_id?: string
          note?: string | null
          published_at?: string
          published_by?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_external_publications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_external_publications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "jobs_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_external_publications_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          benefits: string | null
          close_reason:
            | Database["public"]["Enums"]["job_close_reason_enum"]
            | null
          closed_at: string | null
          company_id: string
          confidential: boolean
          confidential_participant_ids: string[]
          contract_type:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          created_at: string
          cultural_fit_survey_id: string | null
          hours_per_week: number | null
          id: string
          num_openings: number
          opened_at: string
          override_address: boolean
          public_slug: string | null
          requested_by: string
          required_skills: string[]
          salary_max_cents: number | null
          salary_min_cents: number | null
          sector: string | null
          shift: string | null
          status: Database["public"]["Enums"]["job_status_enum"]
          summary: string | null
          target_deadline: string | null
          title: string
          updated_at: string
          work_mode: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          benefits?: string | null
          close_reason?:
            | Database["public"]["Enums"]["job_close_reason_enum"]
            | null
          closed_at?: string | null
          company_id: string
          confidential?: boolean
          confidential_participant_ids?: string[]
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          created_at?: string
          cultural_fit_survey_id?: string | null
          hours_per_week?: number | null
          id?: string
          num_openings?: number
          opened_at?: string
          override_address?: boolean
          public_slug?: string | null
          requested_by: string
          required_skills?: string[]
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          sector?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
          summary?: string | null
          target_deadline?: string | null
          title: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          benefits?: string | null
          close_reason?:
            | Database["public"]["Enums"]["job_close_reason_enum"]
            | null
          closed_at?: string | null
          company_id?: string
          confidential?: boolean
          confidential_participant_ids?: string[]
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          created_at?: string
          cultural_fit_survey_id?: string | null
          hours_per_week?: number | null
          id?: string
          num_openings?: number
          opened_at?: string
          override_address?: boolean
          public_slug?: string | null
          requested_by?: string
          required_skills?: string[]
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          sector?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
          summary?: string | null
          target_deadline?: string | null
          title?: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_cultural_fit_survey_id_fkey"
            columns: ["cultural_fit_survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_cultural_fit_survey_id_fkey"
            columns: ["cultural_fit_survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meli_categories: {
        Row: {
          api_last_synced: string | null
          attribute_types: string | null
          buying_modes: Json | null
          category_id: string
          category_name: string
          children_categories: Json | null
          created_at: string | null
          currencies: Json | null
          date_created: string | null
          id: string
          listing_allowed: boolean | null
          max_pictures_per_item: number | null
          max_title_length: number | null
          minimum_price: number | null
          parent_category_id: string | null
          path_from_root: Json | null
          permalink: string | null
          picture_url: string | null
          raw_api_response: Json | null
          settings: Json | null
          status: string | null
          total_items_in_this_category: number | null
          updated_at: string | null
        }
        Insert: {
          api_last_synced?: string | null
          attribute_types?: string | null
          buying_modes?: Json | null
          category_id: string
          category_name: string
          children_categories?: Json | null
          created_at?: string | null
          currencies?: Json | null
          date_created?: string | null
          id?: string
          listing_allowed?: boolean | null
          max_pictures_per_item?: number | null
          max_title_length?: number | null
          minimum_price?: number | null
          parent_category_id?: string | null
          path_from_root?: Json | null
          permalink?: string | null
          picture_url?: string | null
          raw_api_response?: Json | null
          settings?: Json | null
          status?: string | null
          total_items_in_this_category?: number | null
          updated_at?: string | null
        }
        Update: {
          api_last_synced?: string | null
          attribute_types?: string | null
          buying_modes?: Json | null
          category_id?: string
          category_name?: string
          children_categories?: Json | null
          created_at?: string | null
          currencies?: Json | null
          date_created?: string | null
          id?: string
          listing_allowed?: boolean | null
          max_pictures_per_item?: number | null
          max_title_length?: number | null
          minimum_price?: number | null
          parent_category_id?: string | null
          path_from_root?: Json | null
          permalink?: string | null
          picture_url?: string | null
          raw_api_response?: Json | null
          settings?: Json | null
          status?: string | null
          total_items_in_this_category?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meli_category_attributes: {
        Row: {
          attribute_group_id: string | null
          attribute_group_name: string | null
          attribute_id: string
          attribute_name: string | null
          category_id: string
          created_at: string | null
          hierarchy: string | null
          hint: string | null
          id: string
          is_conditional_required: boolean | null
          is_hidden: boolean | null
          is_new_required: boolean | null
          is_read_only: boolean | null
          is_required: boolean | null
          raw_api_response: Json | null
          relevance: number | null
          tags: Json | null
          tooltip: string | null
          value_max_length: number | null
          value_type: string | null
          values: Json | null
        }
        Insert: {
          attribute_group_id?: string | null
          attribute_group_name?: string | null
          attribute_id: string
          attribute_name?: string | null
          category_id: string
          created_at?: string | null
          hierarchy?: string | null
          hint?: string | null
          id?: string
          is_conditional_required?: boolean | null
          is_hidden?: boolean | null
          is_new_required?: boolean | null
          is_read_only?: boolean | null
          is_required?: boolean | null
          raw_api_response?: Json | null
          relevance?: number | null
          tags?: Json | null
          tooltip?: string | null
          value_max_length?: number | null
          value_type?: string | null
          values?: Json | null
        }
        Update: {
          attribute_group_id?: string | null
          attribute_group_name?: string | null
          attribute_id?: string
          attribute_name?: string | null
          category_id?: string
          created_at?: string | null
          hierarchy?: string | null
          hint?: string | null
          id?: string
          is_conditional_required?: boolean | null
          is_hidden?: boolean | null
          is_new_required?: boolean | null
          is_read_only?: boolean | null
          is_required?: boolean | null
          raw_api_response?: Json | null
          relevance?: number | null
          tags?: Json | null
          tooltip?: string | null
          value_max_length?: number | null
          value_type?: string | null
          values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meli_category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "meli_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      meli_category_sync_log: {
        Row: {
          category_id: string | null
          completed_at: string | null
          duration_ms: number | null
          endpoint_url: string | null
          error_details: string | null
          errors_count: number | null
          http_status: number | null
          id: string
          records_created: number | null
          records_processed: number | null
          records_updated: number | null
          response_headers: Json | null
          response_size_bytes: number | null
          started_at: string | null
          sync_type: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          endpoint_url?: string | null
          error_details?: string | null
          errors_count?: number | null
          http_status?: number | null
          id?: string
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          response_headers?: Json | null
          response_size_bytes?: number | null
          started_at?: string | null
          sync_type: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          endpoint_url?: string | null
          error_details?: string | null
          errors_count?: number | null
          http_status?: number | null
          id?: string
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          response_headers?: Json | null
          response_size_bytes?: number | null
          started_at?: string | null
          sync_type?: string
        }
        Relationships: []
      }
      meli_category_tree: {
        Row: {
          child_category_id: string | null
          created_at: string | null
          depth_level: number | null
          id: string
          parent_category_id: string | null
        }
        Insert: {
          child_category_id?: string | null
          created_at?: string | null
          depth_level?: number | null
          id?: string
          parent_category_id?: string | null
        }
        Update: {
          child_category_id?: string | null
          created_at?: string | null
          depth_level?: number | null
          id?: string
          parent_category_id?: string | null
        }
        Relationships: []
      }
      meli_items_retrieval_log: {
        Row: {
          error_message: string | null
          id: string
          phase: number | null
          platform_ad_id: string
          processed_at: string | null
          seller_id: string | null
          sku: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          phase?: number | null
          platform_ad_id: string
          processed_at?: string | null
          seller_id?: string | null
          sku?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          phase?: number | null
          platform_ad_id?: string
          processed_at?: string | null
          seller_id?: string | null
          sku?: string | null
          status?: string | null
        }
        Relationships: []
      }
      meli_scroll_checkpoints: {
        Row: {
          account_key: string
          batch_num: number | null
          created_at: string | null
          id: string
          phase: number
          scroll_id: string | null
          seller_id: number
          status: string | null
          total_ids_collected: number | null
          total_items_saved: number | null
          updated_at: string | null
        }
        Insert: {
          account_key: string
          batch_num?: number | null
          created_at?: string | null
          id?: string
          phase?: number
          scroll_id?: string | null
          seller_id: number
          status?: string | null
          total_ids_collected?: number | null
          total_items_saved?: number | null
          updated_at?: string | null
        }
        Update: {
          account_key?: string
          batch_num?: number | null
          created_at?: string | null
          id?: string
          phase?: number
          scroll_id?: string | null
          seller_id?: number
          status?: string | null
          total_ids_collected?: number | null
          total_items_saved?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meli_seller_accounts: {
        Row: {
          access_token_vault_secret_id: string | null
          account_description: string | null
          account_metadata: Json | null
          account_status: string | null
          account_type: string | null
          api_call_count: number | null
          api_limits: Json | null
          app_id: number | null
          client_id_vault_secret_id: string | null
          client_secret_vault_secret_id: string | null
          company_id: string | null
          company_name: string
          created_at: string | null
          created_by: string | null
          is_active: boolean | null
          last_api_call: string | null
          market_domain: string | null
          permissions: Json | null
          rate_limit_status: Json | null
          refresh_token_vault_secret_id: string | null
          seller_id: number
          token_expires_at: string | null
          token_last_refreshed: string | null
          token_refresh_count: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_token_vault_secret_id?: string | null
          account_description?: string | null
          account_metadata?: Json | null
          account_status?: string | null
          account_type?: string | null
          api_call_count?: number | null
          api_limits?: Json | null
          app_id?: number | null
          client_id_vault_secret_id?: string | null
          client_secret_vault_secret_id?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          last_api_call?: string | null
          market_domain?: string | null
          permissions?: Json | null
          rate_limit_status?: Json | null
          refresh_token_vault_secret_id?: string | null
          seller_id: number
          token_expires_at?: string | null
          token_last_refreshed?: string | null
          token_refresh_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_token_vault_secret_id?: string | null
          account_description?: string | null
          account_metadata?: Json | null
          account_status?: string | null
          account_type?: string | null
          api_call_count?: number | null
          api_limits?: Json | null
          app_id?: number | null
          client_id_vault_secret_id?: string | null
          client_secret_vault_secret_id?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          last_api_call?: string | null
          market_domain?: string | null
          permissions?: Json | null
          rate_limit_status?: Json | null
          refresh_token_vault_secret_id?: string | null
          seller_id?: number
          token_expires_at?: string | null
          token_last_refreshed?: string | null
          token_refresh_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meli_seller_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      meli_tokens: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          account_name: string
          refresh_token: string
          seller_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_name: string
          refresh_token: string
          seller_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_name?: string
          refresh_token?: string
          seller_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meli_tokens_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      meli_vehicles: {
        Row: {
          api_last_synced: string | null
          brand: string | null
          brand_code: string | null
          catalog_status: string | null
          created_at: string | null
          domain_id: string | null
          doors: string | null
          doors_code: string | null
          engine: string | null
          engine_code: string | null
          fipe_code: string | null
          fipe_code_id: string | null
          fuel_type: string | null
          fuel_type_code: string | null
          id: string
          model: string | null
          model_code: string | null
          molicar_code: string | null
          molicar_code_id: string | null
          raw_attributes: Json | null
          raw_product_data: Json | null
          transmission: string | null
          transmission_code: string | null
          trim: string | null
          trim_code: string | null
          updated_at: string | null
          vehicle_catalog_id: string
          vehicle_name: string | null
          version: string | null
          year: string | null
          year_code: string | null
        }
        Insert: {
          api_last_synced?: string | null
          brand?: string | null
          brand_code?: string | null
          catalog_status?: string | null
          created_at?: string | null
          domain_id?: string | null
          doors?: string | null
          doors_code?: string | null
          engine?: string | null
          engine_code?: string | null
          fipe_code?: string | null
          fipe_code_id?: string | null
          fuel_type?: string | null
          fuel_type_code?: string | null
          id?: string
          model?: string | null
          model_code?: string | null
          molicar_code?: string | null
          molicar_code_id?: string | null
          raw_attributes?: Json | null
          raw_product_data?: Json | null
          transmission?: string | null
          transmission_code?: string | null
          trim?: string | null
          trim_code?: string | null
          updated_at?: string | null
          vehicle_catalog_id: string
          vehicle_name?: string | null
          version?: string | null
          year?: string | null
          year_code?: string | null
        }
        Update: {
          api_last_synced?: string | null
          brand?: string | null
          brand_code?: string | null
          catalog_status?: string | null
          created_at?: string | null
          domain_id?: string | null
          doors?: string | null
          doors_code?: string | null
          engine?: string | null
          engine_code?: string | null
          fipe_code?: string | null
          fipe_code_id?: string | null
          fuel_type?: string | null
          fuel_type_code?: string | null
          id?: string
          model?: string | null
          model_code?: string | null
          molicar_code?: string | null
          molicar_code_id?: string | null
          raw_attributes?: Json | null
          raw_product_data?: Json | null
          transmission?: string | null
          transmission_code?: string | null
          trim?: string | null
          trim_code?: string | null
          updated_at?: string | null
          vehicle_catalog_id?: string
          vehicle_name?: string | null
          version?: string | null
          year?: string | null
          year_code?: string | null
        }
        Relationships: []
      }
      mp_expenses_deprecated: {
        Row: {
          amount: number | null
          auto_categorized: boolean | null
          beneficiary_name: string | null
          business_branch: string | null
          ca_category: string | null
          created_at: string
          date_approved: string | null
          date_created: string | null
          description: string | null
          expense_direction: string | null
          expense_type: string | null
          exported_at: string | null
          external_reference: string | null
          febraban_code: string | null
          id: number
          notes: string | null
          operation_type: string | null
          payment_id: string | null
          payment_method: string | null
          raw_payment: Json | null
          seller_slug: string
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          auto_categorized?: boolean | null
          beneficiary_name?: string | null
          business_branch?: string | null
          ca_category?: string | null
          created_at?: string
          date_approved?: string | null
          date_created?: string | null
          description?: string | null
          expense_direction?: string | null
          expense_type?: string | null
          exported_at?: string | null
          external_reference?: string | null
          febraban_code?: string | null
          id?: number
          notes?: string | null
          operation_type?: string | null
          payment_id?: string | null
          payment_method?: string | null
          raw_payment?: Json | null
          seller_slug: string
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          auto_categorized?: boolean | null
          beneficiary_name?: string | null
          business_branch?: string | null
          ca_category?: string | null
          created_at?: string
          date_approved?: string | null
          date_created?: string | null
          description?: string | null
          expense_direction?: string | null
          expense_type?: string | null
          exported_at?: string | null
          external_reference?: string | null
          febraban_code?: string | null
          id?: number
          notes?: string | null
          operation_type?: string | null
          payment_id?: string | null
          payment_method?: string | null
          raw_payment?: Json | null
          seller_slug?: string
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_expenses_seller_slug_fkey"
            columns: ["seller_slug"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["slug"]
          },
        ]
      }
      n8n_error_log: {
        Row: {
          cause_detailed: string | null
          created_at: string | null
          description_key: string | null
          error_functionality: string | null
          error_level: string | null
          error_message: string | null
          error_name: string | null
          error_stack: string | null
          error_tags: Json | null
          error_timestamp: number | null
          error_type: string | null
          execution_id: string
          execution_mode: string | null
          execution_url: string | null
          id: string
          item_index: number | null
          last_node_executed: string | null
          node_cause: string | null
          raw_data: Json
          run_index: number | null
          workflow_id: string
          workflow_name: string | null
        }
        Insert: {
          cause_detailed?: string | null
          created_at?: string | null
          description_key?: string | null
          error_functionality?: string | null
          error_level?: string | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          error_tags?: Json | null
          error_timestamp?: number | null
          error_type?: string | null
          execution_id: string
          execution_mode?: string | null
          execution_url?: string | null
          id?: string
          item_index?: number | null
          last_node_executed?: string | null
          node_cause?: string | null
          raw_data: Json
          run_index?: number | null
          workflow_id: string
          workflow_name?: string | null
        }
        Update: {
          cause_detailed?: string | null
          created_at?: string | null
          description_key?: string | null
          error_functionality?: string | null
          error_level?: string | null
          error_message?: string | null
          error_name?: string | null
          error_stack?: string | null
          error_tags?: Json | null
          error_timestamp?: number | null
          error_type?: string | null
          execution_id?: string
          execution_mode?: string | null
          execution_url?: string | null
          id?: string
          item_index?: number | null
          last_node_executed?: string | null
          node_cause?: string | null
          raw_data?: Json
          run_index?: number | null
          workflow_id?: string
          workflow_name?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: []
      }
      one_on_one_action_items: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          one_on_one_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          one_on_one_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          one_on_one_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_one_action_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_one_action_items_one_on_one_id_fkey"
            columns: ["one_on_one_id"]
            isOneToOne: false
            referencedRelation: "one_on_ones"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_ones: {
        Row: {
          agenda: string | null
          audio_duration: number | null
          audio_url: string | null
          collaborator_feedback: string | null
          collaborator_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          leader_feedback: string | null
          leader_id: string
          meeting_structure: Json | null
          notes: string | null
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          audio_duration?: number | null
          audio_url?: string | null
          collaborator_feedback?: string | null
          collaborator_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          leader_feedback?: string | null
          leader_id: string
          meeting_structure?: Json | null
          notes?: string | null
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          audio_duration?: number | null
          audio_url?: string | null
          collaborator_feedback?: string | null
          collaborator_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          leader_feedback?: string | null
          leader_id?: string
          meeting_structure?: Json | null
          notes?: string | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_ones_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_on_ones_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          name: string
          payment_active: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_copies_limit: number
          trial_copies_used: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id?: string
          name: string
          payment_active?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_copies_limit?: number
          trial_copies_used?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          payment_active?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_copies_limit?: number
          trial_copies_used?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          competencia_date: string
          created_at: string
          event_date: string
          event_type: string
          id: number
          idempotency_key: string
          metadata: Json | null
          ml_order_id: number | null
          ml_payment_id: number
          reference_id: string | null
          seller_slug: string
          signed_amount: number
          source: string
        }
        Insert: {
          competencia_date: string
          created_at?: string
          event_date: string
          event_type: string
          id?: number
          idempotency_key: string
          metadata?: Json | null
          ml_order_id?: number | null
          ml_payment_id?: number
          reference_id?: string | null
          seller_slug: string
          signed_amount?: number
          source?: string
        }
        Update: {
          competencia_date?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: number
          idempotency_key?: string
          metadata?: Json | null
          ml_order_id?: number | null
          ml_payment_id?: number
          reference_id?: string | null
          seller_slug?: string
          signed_amount?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_seller_slug_fkey"
            columns: ["seller_slug"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["slug"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          ca_evento_id: string | null
          created_at: string | null
          error: string | null
          fee_adjusted: boolean | null
          id: string
          ml_order_id: number | null
          ml_payment_id: number
          ml_status: string | null
          money_release_date: string | null
          net_amount: number | null
          processor_fee: number | null
          processor_shipping: number | null
          raw_payment: Json | null
          seller_slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          ca_evento_id?: string | null
          created_at?: string | null
          error?: string | null
          fee_adjusted?: boolean | null
          id?: string
          ml_order_id?: number | null
          ml_payment_id: number
          ml_status?: string | null
          money_release_date?: string | null
          net_amount?: number | null
          processor_fee?: number | null
          processor_shipping?: number | null
          raw_payment?: Json | null
          seller_slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          ca_evento_id?: string | null
          created_at?: string | null
          error?: string | null
          fee_adjusted?: boolean | null
          id?: string
          ml_order_id?: number | null
          ml_payment_id?: number
          ml_status?: string | null
          money_release_date?: string | null
          net_amount?: number | null
          processor_fee?: number | null
          processor_shipping?: number | null
          raw_payment?: Json | null
          seller_slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_id: string | null
          status: string | null
          task_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_id?: string | null
          status?: string | null
          task_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_id?: string | null
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_logs: {
        Row: {
          created_at: string
          error_count: number
          id: number
          org_id: string | null
          sku: string | null
          source_item_id: string | null
          status: string
          success_count: number
          targets: Json
          total_targets: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_count?: number
          id?: number
          org_id?: string | null
          sku?: string | null
          source_item_id?: string | null
          status?: string
          success_count?: number
          targets?: Json
          total_targets?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_count?: number
          id?: number
          org_id?: string | null
          sku?: string | null
          source_item_id?: string | null
          status?: string
          success_count?: number
          targets?: Json
          total_targets?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          error_message: string | null
          file_name: string | null
          file_size: number | null
          height: number | null
          id: string
          image_type: string | null
          is_primary: boolean | null
          is_published: boolean
          metadata: Json | null
          mime_type: string | null
          processing_metadata: Json | null
          processing_status: string | null
          sku: string
          slot_number: number | null
          source: string
          source_url: string | null
          status: string | null
          storage_path: string | null
          storage_url: string | null
          synced_at: string | null
          tiny_synced: boolean | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          image_type?: string | null
          is_primary?: boolean | null
          is_published?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_metadata?: Json | null
          processing_status?: string | null
          sku: string
          slot_number?: number | null
          source: string
          source_url?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          synced_at?: string | null
          tiny_synced?: boolean | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          image_type?: string | null
          is_primary?: boolean | null
          is_published?: boolean
          metadata?: Json | null
          mime_type?: string | null
          processing_metadata?: Json | null
          processing_status?: string | null
          sku?: string
          slot_number?: number | null
          source?: string
          source_url?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          synced_at?: string | null
          tiny_synced?: boolean | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_images_sku"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["sku"]
          },
        ]
      }
      product_update_buffer: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          timestamp: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          timestamp?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          timestamp?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_update_buffer_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_enriched_at: string | null
          ai_enrichment_status: string | null
          ai_enrichment_type: string[] | null
          ai_processing_time_ms: number | null
          alert_status: boolean | null
          allow_sales_inclusion: boolean | null
          batch_control: boolean | null
          brand: string | null
          category: string | null
          characteristics: string | null
          compatibility: Json | null
          compatibility_v2: Json | null
          complementary_description: string | null
          cost_price: number | null
          created_at: string | null
          deleted_oems: string[] | null
          external_image_urls: Json | null
          gross_weight_kg: number | null
          gtin: string | null
          has_meli_ads: boolean | null
          id: string | null
          is_new: boolean | null
          location: string | null
          location_last_sync: string | null
          location_sync_status: string | null
          manufacturer: string | null
          markup: number | null
          max_stock: number | null
          mean_cost_price: number | null
          min_stock: number | null
          net_weight_kg: number | null
          oem: string[] | null
          oem_count: number | null
          on_demand: boolean | null
          origin: string | null
          package_diameter: number | null
          package_height: number | null
          package_length: number | null
          package_width: number | null
          physical_stock: number | null
          preparation_days: number | null
          price: number | null
          product_attributes: string[] | null
          product_name: string | null
          promotional_price: number | null
          situation: string | null
          sku: string
          source: string | null
          supplier: string | null
          supplier_code: string | null
          tax_classification: string | null
          taxable_gtin_ean: string | null
          tiny_id: string | null
          total_stock: number | null
          unit: string | null
          units_per_box: number | null
          updated_at: string | null
          url_imgs: Json | null
          virtual_stock: number | null
          warranty: string | null
        }
        Insert: {
          ai_enriched_at?: string | null
          ai_enrichment_status?: string | null
          ai_enrichment_type?: string[] | null
          ai_processing_time_ms?: number | null
          alert_status?: boolean | null
          allow_sales_inclusion?: boolean | null
          batch_control?: boolean | null
          brand?: string | null
          category?: string | null
          characteristics?: string | null
          compatibility?: Json | null
          compatibility_v2?: Json | null
          complementary_description?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_oems?: string[] | null
          external_image_urls?: Json | null
          gross_weight_kg?: number | null
          gtin?: string | null
          has_meli_ads?: boolean | null
          id?: string | null
          is_new?: boolean | null
          location?: string | null
          location_last_sync?: string | null
          location_sync_status?: string | null
          manufacturer?: string | null
          markup?: number | null
          max_stock?: number | null
          mean_cost_price?: number | null
          min_stock?: number | null
          net_weight_kg?: number | null
          oem?: string[] | null
          oem_count?: number | null
          on_demand?: boolean | null
          origin?: string | null
          package_diameter?: number | null
          package_height?: number | null
          package_length?: number | null
          package_width?: number | null
          physical_stock?: number | null
          preparation_days?: number | null
          price?: number | null
          product_attributes?: string[] | null
          product_name?: string | null
          promotional_price?: number | null
          situation?: string | null
          sku: string
          source?: string | null
          supplier?: string | null
          supplier_code?: string | null
          tax_classification?: string | null
          taxable_gtin_ean?: string | null
          tiny_id?: string | null
          total_stock?: number | null
          unit?: string | null
          units_per_box?: number | null
          updated_at?: string | null
          url_imgs?: Json | null
          virtual_stock?: number | null
          warranty?: string | null
        }
        Update: {
          ai_enriched_at?: string | null
          ai_enrichment_status?: string | null
          ai_enrichment_type?: string[] | null
          ai_processing_time_ms?: number | null
          alert_status?: boolean | null
          allow_sales_inclusion?: boolean | null
          batch_control?: boolean | null
          brand?: string | null
          category?: string | null
          characteristics?: string | null
          compatibility?: Json | null
          compatibility_v2?: Json | null
          complementary_description?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_oems?: string[] | null
          external_image_urls?: Json | null
          gross_weight_kg?: number | null
          gtin?: string | null
          has_meli_ads?: boolean | null
          id?: string | null
          is_new?: boolean | null
          location?: string | null
          location_last_sync?: string | null
          location_sync_status?: string | null
          manufacturer?: string | null
          markup?: number | null
          max_stock?: number | null
          mean_cost_price?: number | null
          min_stock?: number | null
          net_weight_kg?: number | null
          oem?: string[] | null
          oem_count?: number | null
          on_demand?: boolean | null
          origin?: string | null
          package_diameter?: number | null
          package_height?: number | null
          package_length?: number | null
          package_width?: number | null
          physical_stock?: number | null
          preparation_days?: number | null
          price?: number | null
          product_attributes?: string[] | null
          product_name?: string | null
          promotional_price?: number | null
          situation?: string | null
          sku?: string
          source?: string | null
          supplier?: string | null
          supplier_code?: string | null
          tax_classification?: string | null
          taxable_gtin_ean?: string | null
          tiny_id?: string | null
          total_stock?: number | null
          unit?: string | null
          units_per_box?: number | null
          updated_at?: string | null
          url_imgs?: Json | null
          virtual_stock?: number | null
          warranty?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          full_name: string
          hire_date?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      release_report_fees: {
        Row: {
          coupon_amount: number | null
          created_at: string | null
          description: string | null
          external_reference: string | null
          financing_fee_amount: number | null
          gross_amount: number | null
          id: number
          mp_fee_amount: number | null
          net_credit_amount: number | null
          net_debit_amount: number | null
          order_id: string | null
          payment_method: string | null
          record_type: string | null
          release_date: string
          seller_slug: string
          shipping_fee_amount: number | null
          source_id: string
          taxes_amount: number | null
        }
        Insert: {
          coupon_amount?: number | null
          created_at?: string | null
          description?: string | null
          external_reference?: string | null
          financing_fee_amount?: number | null
          gross_amount?: number | null
          id?: number
          mp_fee_amount?: number | null
          net_credit_amount?: number | null
          net_debit_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          record_type?: string | null
          release_date: string
          seller_slug: string
          shipping_fee_amount?: number | null
          source_id: string
          taxes_amount?: number | null
        }
        Update: {
          coupon_amount?: number | null
          created_at?: string | null
          description?: string | null
          external_reference?: string | null
          financing_fee_amount?: number | null
          gross_amount?: number | null
          id?: number
          mp_fee_amount?: number | null
          net_credit_amount?: number | null
          net_debit_amount?: number | null
          order_id?: string | null
          payment_method?: string | null
          record_type?: string | null
          release_date?: string
          seller_slug?: string
          shipping_fee_amount?: number | null
          source_id?: string
          taxes_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "release_report_fees_seller_slug_fkey"
            columns: ["seller_slug"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["slug"]
          },
        ]
      }
      revenue_lines: {
        Row: {
          active: boolean | null
          created_at: string | null
          empresa: string
          grupo: string
          id: string
          segmento: string
          seller_id: string | null
          source: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          empresa: string
          grupo?: string
          id?: string
          segmento?: string
          seller_id?: string | null
          source?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          empresa?: string
          grupo?: string
          id?: string
          segmento?: string
          seller_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_lines_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          active: boolean | null
          approved_at: string | null
          ca_backfill_completed_at: string | null
          ca_backfill_progress: Json | null
          ca_backfill_started_at: string | null
          ca_backfill_status: string | null
          ca_centro_custo_variavel: string | null
          ca_conta_bancaria: string | null
          ca_contato_ml: string | null
          ca_start_date: string | null
          created_at: string | null
          dashboard_empresa: string | null
          dashboard_grupo: string | null
          dashboard_segmento: string | null
          email: string | null
          extrato_missing: boolean | null
          extrato_uploaded_at: string | null
          id: string
          integration_mode: string
          ml_access_token: string | null
          ml_app_id: string | null
          ml_refresh_token: string | null
          ml_secret_key: string | null
          ml_token_expires_at: string | null
          ml_user_id: number | null
          name: string
          onboarding_status: string | null
          slug: string
          source: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          approved_at?: string | null
          ca_backfill_completed_at?: string | null
          ca_backfill_progress?: Json | null
          ca_backfill_started_at?: string | null
          ca_backfill_status?: string | null
          ca_centro_custo_variavel?: string | null
          ca_conta_bancaria?: string | null
          ca_contato_ml?: string | null
          ca_start_date?: string | null
          created_at?: string | null
          dashboard_empresa?: string | null
          dashboard_grupo?: string | null
          dashboard_segmento?: string | null
          email?: string | null
          extrato_missing?: boolean | null
          extrato_uploaded_at?: string | null
          id?: string
          integration_mode?: string
          ml_access_token?: string | null
          ml_app_id?: string | null
          ml_refresh_token?: string | null
          ml_secret_key?: string | null
          ml_token_expires_at?: string | null
          ml_user_id?: number | null
          name: string
          onboarding_status?: string | null
          slug: string
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          approved_at?: string | null
          ca_backfill_completed_at?: string | null
          ca_backfill_progress?: Json | null
          ca_backfill_started_at?: string | null
          ca_backfill_status?: string | null
          ca_centro_custo_variavel?: string | null
          ca_conta_bancaria?: string | null
          ca_contato_ml?: string | null
          ca_start_date?: string | null
          created_at?: string | null
          dashboard_empresa?: string | null
          dashboard_grupo?: string | null
          dashboard_segmento?: string | null
          email?: string | null
          extrato_missing?: boolean | null
          extrato_uploaded_at?: string | null
          id?: string
          integration_mode?: string
          ml_access_token?: string | null
          ml_app_id?: string | null
          ml_refresh_token?: string | null
          ml_secret_key?: string | null
          ml_token_expires_at?: string | null
          ml_user_id?: number | null
          name?: string
          onboarding_status?: string | null
          slug?: string
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shopee_copy_logs: {
        Row: {
          correction_details: Json | null
          created_at: string
          dest_item_ids: Json | null
          dest_sellers: string[]
          error_details: Json | null
          id: number
          org_id: string | null
          source_item_id: number
          source_item_sku: string | null
          source_item_thumbnail: string | null
          source_item_title: string | null
          source_seller: string
          status: string
          user_id: string | null
        }
        Insert: {
          correction_details?: Json | null
          created_at?: string
          dest_item_ids?: Json | null
          dest_sellers?: string[]
          error_details?: Json | null
          id?: number
          org_id?: string | null
          source_item_id: number
          source_item_sku?: string | null
          source_item_thumbnail?: string | null
          source_item_title?: string | null
          source_seller: string
          status?: string
          user_id?: string | null
        }
        Update: {
          correction_details?: Json | null
          created_at?: string
          dest_item_ids?: Json | null
          dest_sellers?: string[]
          error_details?: Json | null
          id?: number
          org_id?: string | null
          source_item_id?: number
          source_item_sku?: string | null
          source_item_thumbnail?: string | null
          source_item_title?: string | null
          source_seller?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopee_copy_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopee_copy_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shopee_sellers: {
        Row: {
          access_token: string | null
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          refresh_token: string | null
          refresh_token_expires_at: string | null
          shop_id: number
          slug: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          shop_id: number
          slug: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          shop_id?: number
          slug?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopee_sellers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_api_calls: {
        Row: {
          called_at: string
          empresa_id: string | null
          endpoint: string
          filial: string
          id: string
        }
        Insert: {
          called_at?: string
          empresa_id?: string | null
          endpoint: string
          filial: string
          id?: string
        }
        Update: {
          called_at?: string
          empresa_id?: string | null
          endpoint?: string
          filial?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_api_calls_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_configuracoes: {
        Row: {
          atualizado_em: string | null
          chave: string
          valor: string
        }
        Insert: {
          atualizado_em?: string | null
          chave: string
          valor: string
        }
        Update: {
          atualizado_em?: string | null
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      siso_empresas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string
          criado_em: string
          galpao_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj: string
          criado_em?: string
          galpao_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string
          criado_em?: string
          galpao_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_empresas_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_erros: {
        Row: {
          category: string
          correlation_id: string | null
          created_at: string | null
          empresa_id: string | null
          empresa_nome: string | null
          error_code: string | null
          galpao_nome: string | null
          id: string
          message: string
          metadata: Json | null
          pedido_id: string | null
          request_method: string | null
          request_path: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          stack_trace: string | null
          timestamp: string
        }
        Insert: {
          category?: string
          correlation_id?: string | null
          created_at?: string | null
          empresa_id?: string | null
          empresa_nome?: string | null
          error_code?: string | null
          galpao_nome?: string | null
          id?: string
          message: string
          metadata?: Json | null
          pedido_id?: string | null
          request_method?: string | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source: string
          stack_trace?: string | null
          timestamp?: string
        }
        Update: {
          category?: string
          correlation_id?: string | null
          created_at?: string | null
          empresa_id?: string | null
          empresa_nome?: string | null
          error_code?: string | null
          galpao_nome?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          pedido_id?: string | null
          request_method?: string | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          stack_trace?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      siso_fila_execucao: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          decisao: string
          empresa_id: string | null
          erro: string | null
          executado_em: string | null
          filial_execucao: string | null
          id: string
          max_tentativas: number | null
          operador_id: string | null
          operador_nome: string | null
          pedido_id: string
          prioridade: boolean
          proximo_retry_em: string | null
          status: string
          tentativas: number | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          decisao: string
          empresa_id?: string | null
          erro?: string | null
          executado_em?: string | null
          filial_execucao?: string | null
          id?: string
          max_tentativas?: number | null
          operador_id?: string | null
          operador_nome?: string | null
          pedido_id: string
          prioridade?: boolean
          proximo_retry_em?: string | null
          status?: string
          tentativas?: number | null
          tipo?: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          decisao?: string
          empresa_id?: string | null
          erro?: string | null
          executado_em?: string | null
          filial_execucao?: string | null
          id?: string
          max_tentativas?: number | null
          operador_id?: string | null
          operador_nome?: string | null
          pedido_id?: string
          prioridade?: boolean
          proximo_retry_em?: string | null
          status?: string
          tentativas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_fila_execucao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_galpoes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          printnode_printer_id: number | null
          printnode_printer_nome: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          printnode_printer_id?: number | null
          printnode_printer_nome?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          printnode_printer_id?: number | null
          printnode_printer_nome?: string | null
        }
        Relationships: []
      }
      siso_grupo_empresas: {
        Row: {
          criado_em: string
          empresa_id: string
          grupo_id: string
          id: string
          tier: number
        }
        Insert: {
          criado_em?: string
          empresa_id: string
          grupo_id: string
          id?: string
          tier?: number
        }
        Update: {
          criado_em?: string
          empresa_id?: string
          grupo_id?: string
          id?: string
          tier?: number
        }
        Relationships: [
          {
            foreignKeyName: "siso_grupo_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_grupo_empresas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "siso_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_grupos: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      siso_inventario_itens: {
        Row: {
          created_at: string
          ean: string | null
          erro_msg: string | null
          id: string
          inventario_id: string
          localizacao: string
          localizacao_antiga_tiny: string | null
          nome_produto: string | null
          produto_id_tiny: number | null
          quantidade: number
          saldo_anterior_tiny: number | null
          sku: string
          status: string
        }
        Insert: {
          created_at?: string
          ean?: string | null
          erro_msg?: string | null
          id?: string
          inventario_id: string
          localizacao: string
          localizacao_antiga_tiny?: string | null
          nome_produto?: string | null
          produto_id_tiny?: number | null
          quantidade?: number
          saldo_anterior_tiny?: number | null
          sku: string
          status?: string
        }
        Update: {
          created_at?: string
          ean?: string | null
          erro_msg?: string | null
          id?: string
          inventario_id?: string
          localizacao?: string
          localizacao_antiga_tiny?: string | null
          nome_produto?: string | null
          produto_id_tiny?: number | null
          quantidade?: number
          saldo_anterior_tiny?: number | null
          sku?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_inventario_itens_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "siso_inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_inventarios: {
        Row: {
          concluido_em: string | null
          created_at: string
          deposito_id: number | null
          empresa_id: string
          galpao_id: string
          id: string
          manter_localizacao_antiga: boolean
          modo: string
          observacoes: string | null
          processado_em: string | null
          status: string
          tipo_estoque: string | null
          usuario_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          deposito_id?: number | null
          empresa_id: string
          galpao_id: string
          id?: string
          manter_localizacao_antiga?: boolean
          modo: string
          observacoes?: string | null
          processado_em?: string | null
          status?: string
          tipo_estoque?: string | null
          usuario_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          deposito_id?: number | null
          empresa_id?: string
          galpao_id?: string
          id?: string
          manter_localizacao_antiga?: boolean
          modo?: string
          observacoes?: string | null
          processado_em?: string | null
          status?: string
          tipo_estoque?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_inventarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_inventarios_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_inventarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_logs: {
        Row: {
          created_at: string | null
          filial: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          pedido_id: string | null
          source: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          filial?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          pedido_id?: string | null
          source: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          filial?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          pedido_id?: string | null
          source?: string
          timestamp?: string
        }
        Relationships: []
      }
      siso_operadores: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string | null
          filial: Database["public"]["Enums"]["siso_filial"] | null
          id: string
          nome: string
          role: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email?: string | null
          filial?: Database["public"]["Enums"]["siso_filial"] | null
          id?: string
          nome: string
          role?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string | null
          filial?: Database["public"]["Enums"]["siso_filial"] | null
          id?: string
          nome?: string
          role?: string
        }
        Relationships: []
      }
      siso_ordens_compra: {
        Row: {
          comprado_em: string | null
          comprado_por: string | null
          created_at: string
          empresa_id: string | null
          fornecedor: string
          galpao_id: string | null
          id: string
          observacao: string | null
          status: string
        }
        Insert: {
          comprado_em?: string | null
          comprado_por?: string | null
          created_at?: string
          empresa_id?: string | null
          fornecedor: string
          galpao_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
        }
        Update: {
          comprado_em?: string | null
          comprado_por?: string | null
          created_at?: string
          empresa_id?: string | null
          fornecedor?: string
          galpao_id?: string | null
          id?: string
          observacao?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_ordens_compra_comprado_por_fkey"
            columns: ["comprado_por"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_ordens_compra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_ordens_compra_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_pedido_historico: {
        Row: {
          criado_em: string
          detalhes: Json | null
          evento: string
          id: string
          pedido_id: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          criado_em?: string
          detalhes?: Json | null
          evento: string
          id?: string
          pedido_id: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          criado_em?: string
          detalhes?: Json | null
          evento?: string
          id?: string
          pedido_id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siso_pedido_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "siso_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_pedido_item_estoques: {
        Row: {
          criado_em: string
          deposito_id: number | null
          deposito_nome: string | null
          disponivel: number | null
          empresa_id: string
          id: string
          localizacao: string | null
          pedido_id: string
          produto_id: number
          produto_id_na_empresa: number | null
          reservado: number | null
          saldo: number | null
        }
        Insert: {
          criado_em?: string
          deposito_id?: number | null
          deposito_nome?: string | null
          disponivel?: number | null
          empresa_id: string
          id?: string
          localizacao?: string | null
          pedido_id: string
          produto_id: number
          produto_id_na_empresa?: number | null
          reservado?: number | null
          saldo?: number | null
        }
        Update: {
          criado_em?: string
          deposito_id?: number | null
          deposito_nome?: string | null
          disponivel?: number | null
          empresa_id?: string
          id?: string
          localizacao?: string | null
          pedido_id?: string
          produto_id?: number
          produto_id_na_empresa?: number | null
          reservado?: number | null
          saldo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "siso_pedido_item_estoques_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_pedido_itens: {
        Row: {
          bipado_completo: boolean | null
          bipado_em: string | null
          bipado_por: string | null
          compra_cancelado_em: string | null
          compra_cancelado_por: string | null
          compra_cancelamento_motivo: string | null
          compra_cancelamento_solicitado_em: string | null
          compra_cancelamento_solicitado_por: string | null
          compra_equivalente_definido_em: string | null
          compra_equivalente_definido_por: string | null
          compra_equivalente_descricao: string | null
          compra_equivalente_descricao_original: string | null
          compra_equivalente_fornecedor: string | null
          compra_equivalente_gtin: string | null
          compra_equivalente_imagem_url: string | null
          compra_equivalente_observacao: string | null
          compra_equivalente_produto_id_original: number | null
          compra_equivalente_produto_id_tiny: number | null
          compra_equivalente_sku: string | null
          compra_equivalente_sku_original: string | null
          compra_quantidade_comprada: number | null
          compra_quantidade_recebida: number
          compra_quantidade_solicitada: number
          compra_solicitada_em: string | null
          compra_status: string | null
          comprado_em: string | null
          comprado_por: string | null
          comprado_por_nome: string | null
          criado_em: string
          cwb_atende: boolean
          descricao: string
          empresa_deducao_id: string | null
          estoque_cwb_deposito_id: number | null
          estoque_cwb_deposito_nome: string | null
          estoque_cwb_disponivel: number | null
          estoque_cwb_reservado: number | null
          estoque_cwb_saldo: number | null
          estoque_saida_lancada: boolean
          estoque_sp_deposito_id: number | null
          estoque_sp_deposito_nome: string | null
          estoque_sp_disponivel: number | null
          estoque_sp_reservado: number | null
          estoque_sp_saldo: number | null
          fornecedor_oc: string | null
          gtin: string | null
          id: number
          imagem_url: string | null
          localizacao_cwb: string | null
          localizacao_sp: string | null
          ordem_compra_id: string | null
          pedido_id: string
          produto_id: number
          produto_id_suporte: number | null
          produto_id_tiny: number | null
          quantidade_bipada: number | null
          quantidade_pedida: number
          recebido_em: string | null
          recebido_por: string | null
          separacao_marcado: boolean | null
          separacao_marcado_em: string | null
          sku: string
          sp_atende: boolean
        }
        Insert: {
          bipado_completo?: boolean | null
          bipado_em?: string | null
          bipado_por?: string | null
          compra_cancelado_em?: string | null
          compra_cancelado_por?: string | null
          compra_cancelamento_motivo?: string | null
          compra_cancelamento_solicitado_em?: string | null
          compra_cancelamento_solicitado_por?: string | null
          compra_equivalente_definido_em?: string | null
          compra_equivalente_definido_por?: string | null
          compra_equivalente_descricao?: string | null
          compra_equivalente_descricao_original?: string | null
          compra_equivalente_fornecedor?: string | null
          compra_equivalente_gtin?: string | null
          compra_equivalente_imagem_url?: string | null
          compra_equivalente_observacao?: string | null
          compra_equivalente_produto_id_original?: number | null
          compra_equivalente_produto_id_tiny?: number | null
          compra_equivalente_sku?: string | null
          compra_equivalente_sku_original?: string | null
          compra_quantidade_comprada?: number | null
          compra_quantidade_recebida?: number
          compra_quantidade_solicitada?: number
          compra_solicitada_em?: string | null
          compra_status?: string | null
          comprado_em?: string | null
          comprado_por?: string | null
          comprado_por_nome?: string | null
          criado_em?: string
          cwb_atende?: boolean
          descricao: string
          empresa_deducao_id?: string | null
          estoque_cwb_deposito_id?: number | null
          estoque_cwb_deposito_nome?: string | null
          estoque_cwb_disponivel?: number | null
          estoque_cwb_reservado?: number | null
          estoque_cwb_saldo?: number | null
          estoque_saida_lancada?: boolean
          estoque_sp_deposito_id?: number | null
          estoque_sp_deposito_nome?: string | null
          estoque_sp_disponivel?: number | null
          estoque_sp_reservado?: number | null
          estoque_sp_saldo?: number | null
          fornecedor_oc?: string | null
          gtin?: string | null
          id?: never
          imagem_url?: string | null
          localizacao_cwb?: string | null
          localizacao_sp?: string | null
          ordem_compra_id?: string | null
          pedido_id: string
          produto_id: number
          produto_id_suporte?: number | null
          produto_id_tiny?: number | null
          quantidade_bipada?: number | null
          quantidade_pedida?: number
          recebido_em?: string | null
          recebido_por?: string | null
          separacao_marcado?: boolean | null
          separacao_marcado_em?: string | null
          sku: string
          sp_atende?: boolean
        }
        Update: {
          bipado_completo?: boolean | null
          bipado_em?: string | null
          bipado_por?: string | null
          compra_cancelado_em?: string | null
          compra_cancelado_por?: string | null
          compra_cancelamento_motivo?: string | null
          compra_cancelamento_solicitado_em?: string | null
          compra_cancelamento_solicitado_por?: string | null
          compra_equivalente_definido_em?: string | null
          compra_equivalente_definido_por?: string | null
          compra_equivalente_descricao?: string | null
          compra_equivalente_descricao_original?: string | null
          compra_equivalente_fornecedor?: string | null
          compra_equivalente_gtin?: string | null
          compra_equivalente_imagem_url?: string | null
          compra_equivalente_observacao?: string | null
          compra_equivalente_produto_id_original?: number | null
          compra_equivalente_produto_id_tiny?: number | null
          compra_equivalente_sku?: string | null
          compra_equivalente_sku_original?: string | null
          compra_quantidade_comprada?: number | null
          compra_quantidade_recebida?: number
          compra_quantidade_solicitada?: number
          compra_solicitada_em?: string | null
          compra_status?: string | null
          comprado_em?: string | null
          comprado_por?: string | null
          comprado_por_nome?: string | null
          criado_em?: string
          cwb_atende?: boolean
          descricao?: string
          empresa_deducao_id?: string | null
          estoque_cwb_deposito_id?: number | null
          estoque_cwb_deposito_nome?: string | null
          estoque_cwb_disponivel?: number | null
          estoque_cwb_reservado?: number | null
          estoque_cwb_saldo?: number | null
          estoque_saida_lancada?: boolean
          estoque_sp_deposito_id?: number | null
          estoque_sp_deposito_nome?: string | null
          estoque_sp_disponivel?: number | null
          estoque_sp_reservado?: number | null
          estoque_sp_saldo?: number | null
          fornecedor_oc?: string | null
          gtin?: string | null
          id?: never
          imagem_url?: string | null
          localizacao_cwb?: string | null
          localizacao_sp?: string | null
          ordem_compra_id?: string | null
          pedido_id?: string
          produto_id?: number
          produto_id_suporte?: number | null
          produto_id_tiny?: number | null
          quantidade_bipada?: number | null
          quantidade_pedida?: number
          recebido_em?: string | null
          recebido_por?: string | null
          separacao_marcado?: boolean | null
          separacao_marcado_em?: string | null
          sku?: string
          sp_atende?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "siso_pedido_itens_bipado_por_fkey"
            columns: ["bipado_por"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_compra_cancelado_por_fkey"
            columns: ["compra_cancelado_por"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_compra_cancelamento_solicitado_por_fkey"
            columns: ["compra_cancelamento_solicitado_por"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_compra_equivalente_definido_por_fkey"
            columns: ["compra_equivalente_definido_por"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_empresa_deducao_id_fkey"
            columns: ["empresa_deducao_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "siso_ordens_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "siso_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_pedido_observacoes: {
        Row: {
          criado_em: string
          id: string
          pedido_id: string
          texto: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          criado_em?: string
          id?: string
          pedido_id: string
          texto: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          criado_em?: string
          id?: string
          pedido_id?: string
          texto?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_pedido_observacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "siso_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedido_observacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_pedidos: {
        Row: {
          agrupamento_expedicao_id: string | null
          atualizado_em: string
          chave_acesso_nf: string | null
          cliente_cpf_cnpj: string | null
          cliente_nome: string
          compra_estoque_lancado_alerta: boolean
          criado_em: string
          data: string
          decisao_final: Database["public"]["Enums"]["siso_decisao"] | null
          embalagem_concluida_em: string | null
          embalagem_operador_id: string | null
          empresa_origem_id: string | null
          encaminhado_de: string | null
          erro: string | null
          estoque_lancado: boolean
          etiqueta_status: string | null
          etiqueta_url: string | null
          etiqueta_zpl: string | null
          expedicao_id: string | null
          filial_origem: Database["public"]["Enums"]["siso_filial"]
          forma_envio_descricao: string | null
          forma_envio_id: string | null
          forma_frete_id: string | null
          id: string
          id_pedido_ecommerce: string | null
          marcadores: string[] | null
          nf_estoque_lancado: boolean
          nome_ecommerce: string | null
          nota_fiscal_id: number | null
          numero: string
          operador_id: string | null
          operador_nome: string | null
          payload_original: Json | null
          prazo_envio: string | null
          processado_em: string | null
          separacao_concluida_em: string | null
          separacao_galpao_id: string | null
          separacao_iniciada_em: string | null
          separacao_operador_id: string | null
          separacao_tags: string[] | null
          status: Database["public"]["Enums"]["siso_status"]
          status_separacao: string | null
          status_unificado: string | null
          sugestao: Database["public"]["Enums"]["siso_decisao"] | null
          sugestao_motivo: string | null
          tipo_resolucao: Database["public"]["Enums"]["siso_resolucao"] | null
          transportador_id: string | null
          updated_at: string | null
          url_danfe: string | null
        }
        Insert: {
          agrupamento_expedicao_id?: string | null
          atualizado_em?: string
          chave_acesso_nf?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_nome: string
          compra_estoque_lancado_alerta?: boolean
          criado_em?: string
          data: string
          decisao_final?: Database["public"]["Enums"]["siso_decisao"] | null
          embalagem_concluida_em?: string | null
          embalagem_operador_id?: string | null
          empresa_origem_id?: string | null
          encaminhado_de?: string | null
          erro?: string | null
          estoque_lancado?: boolean
          etiqueta_status?: string | null
          etiqueta_url?: string | null
          etiqueta_zpl?: string | null
          expedicao_id?: string | null
          filial_origem: Database["public"]["Enums"]["siso_filial"]
          forma_envio_descricao?: string | null
          forma_envio_id?: string | null
          forma_frete_id?: string | null
          id: string
          id_pedido_ecommerce?: string | null
          marcadores?: string[] | null
          nf_estoque_lancado?: boolean
          nome_ecommerce?: string | null
          nota_fiscal_id?: number | null
          numero: string
          operador_id?: string | null
          operador_nome?: string | null
          payload_original?: Json | null
          prazo_envio?: string | null
          processado_em?: string | null
          separacao_concluida_em?: string | null
          separacao_galpao_id?: string | null
          separacao_iniciada_em?: string | null
          separacao_operador_id?: string | null
          separacao_tags?: string[] | null
          status?: Database["public"]["Enums"]["siso_status"]
          status_separacao?: string | null
          status_unificado?: string | null
          sugestao?: Database["public"]["Enums"]["siso_decisao"] | null
          sugestao_motivo?: string | null
          tipo_resolucao?: Database["public"]["Enums"]["siso_resolucao"] | null
          transportador_id?: string | null
          updated_at?: string | null
          url_danfe?: string | null
        }
        Update: {
          agrupamento_expedicao_id?: string | null
          atualizado_em?: string
          chave_acesso_nf?: string | null
          cliente_cpf_cnpj?: string | null
          cliente_nome?: string
          compra_estoque_lancado_alerta?: boolean
          criado_em?: string
          data?: string
          decisao_final?: Database["public"]["Enums"]["siso_decisao"] | null
          embalagem_concluida_em?: string | null
          embalagem_operador_id?: string | null
          empresa_origem_id?: string | null
          encaminhado_de?: string | null
          erro?: string | null
          estoque_lancado?: boolean
          etiqueta_status?: string | null
          etiqueta_url?: string | null
          etiqueta_zpl?: string | null
          expedicao_id?: string | null
          filial_origem?: Database["public"]["Enums"]["siso_filial"]
          forma_envio_descricao?: string | null
          forma_envio_id?: string | null
          forma_frete_id?: string | null
          id?: string
          id_pedido_ecommerce?: string | null
          marcadores?: string[] | null
          nf_estoque_lancado?: boolean
          nome_ecommerce?: string | null
          nota_fiscal_id?: number | null
          numero?: string
          operador_id?: string | null
          operador_nome?: string | null
          payload_original?: Json | null
          prazo_envio?: string | null
          processado_em?: string | null
          separacao_concluida_em?: string | null
          separacao_galpao_id?: string | null
          separacao_iniciada_em?: string | null
          separacao_operador_id?: string | null
          separacao_tags?: string[] | null
          status?: Database["public"]["Enums"]["siso_status"]
          status_separacao?: string | null
          status_unificado?: string | null
          sugestao?: Database["public"]["Enums"]["siso_decisao"] | null
          sugestao_motivo?: string | null
          tipo_resolucao?: Database["public"]["Enums"]["siso_resolucao"] | null
          transportador_id?: string | null
          updated_at?: string | null
          url_danfe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siso_pedidos_embalagem_operador_id_fkey"
            columns: ["embalagem_operador_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedidos_empresa_origem_id_fkey"
            columns: ["empresa_origem_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedidos_separacao_galpao_id_fkey"
            columns: ["separacao_galpao_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_pedidos_separado_por_fkey"
            columns: ["separacao_operador_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_sessoes: {
        Row: {
          criado_em: string
          expira_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          expira_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          expira_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_sessoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_tiny_connections: {
        Row: {
          access_token: string | null
          api_version: string
          ativo: boolean
          atualizado_em: string
          client_id: string | null
          client_secret: string | null
          cnpj: string
          criado_em: string
          deposito_id: number | null
          deposito_nome: string | null
          empresa_id: string | null
          filial: Database["public"]["Enums"]["siso_filial"]
          id: string
          nome_empresa: string
          oauth_state: string | null
          refresh_token: string | null
          token: string
          token_expires_at: string | null
          ultimo_teste_em: string | null
          ultimo_teste_ok: boolean | null
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          api_version?: string
          ativo?: boolean
          atualizado_em?: string
          client_id?: string | null
          client_secret?: string | null
          cnpj: string
          criado_em?: string
          deposito_id?: number | null
          deposito_nome?: string | null
          empresa_id?: string | null
          filial: Database["public"]["Enums"]["siso_filial"]
          id?: string
          nome_empresa: string
          oauth_state?: string | null
          refresh_token?: string | null
          token: string
          token_expires_at?: string | null
          ultimo_teste_em?: string | null
          ultimo_teste_ok?: boolean | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          api_version?: string
          ativo?: boolean
          atualizado_em?: string
          client_id?: string | null
          client_secret?: string | null
          cnpj?: string
          criado_em?: string
          deposito_id?: number | null
          deposito_nome?: string | null
          empresa_id?: string | null
          filial?: Database["public"]["Enums"]["siso_filial"]
          id?: string
          nome_empresa?: string
          oauth_state?: string | null
          refresh_token?: string | null
          token?: string
          token_expires_at?: string | null
          ultimo_teste_em?: string | null
          ultimo_teste_ok?: boolean | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siso_tiny_connections_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_transferencia_itens: {
        Row: {
          clonado: boolean
          created_at: string
          ean: string | null
          erro_msg: string | null
          id: string
          nome_produto: string | null
          produto_id_tiny_destino: number | null
          produto_id_tiny_origem: number
          quantidade: number
          sku: string
          status: string
          transferencia_id: string
        }
        Insert: {
          clonado?: boolean
          created_at?: string
          ean?: string | null
          erro_msg?: string | null
          id?: string
          nome_produto?: string | null
          produto_id_tiny_destino?: number | null
          produto_id_tiny_origem: number
          quantidade?: number
          sku: string
          status?: string
          transferencia_id: string
        }
        Update: {
          clonado?: boolean
          created_at?: string
          ean?: string | null
          erro_msg?: string | null
          id?: string
          nome_produto?: string | null
          produto_id_tiny_destino?: number | null
          produto_id_tiny_origem?: number
          quantidade?: number
          sku?: string
          status?: string
          transferencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_transferencia_itens_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "siso_transferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_transferencias: {
        Row: {
          concluido_em: string | null
          created_at: string
          deposito_destino_id: number | null
          deposito_origem_id: number | null
          empresa_destino_id: string
          empresa_origem_id: string
          galpao_destino_id: string
          galpao_origem_id: string
          id: string
          observacoes: string | null
          processado_em: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          deposito_destino_id?: number | null
          deposito_origem_id?: number | null
          empresa_destino_id: string
          empresa_origem_id: string
          galpao_destino_id: string
          galpao_origem_id: string
          id?: string
          observacoes?: string | null
          processado_em?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          deposito_destino_id?: number | null
          deposito_origem_id?: number | null
          empresa_destino_id?: string
          empresa_origem_id?: string
          galpao_destino_id?: string
          galpao_origem_id?: string
          id?: string
          observacoes?: string | null
          processado_em?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_transferencias_empresa_destino_id_fkey"
            columns: ["empresa_destino_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_transferencias_empresa_origem_id_fkey"
            columns: ["empresa_origem_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_transferencias_galpao_destino_id_fkey"
            columns: ["galpao_destino_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_transferencias_galpao_origem_id_fkey"
            columns: ["galpao_origem_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_transferencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_usuario_galpoes: {
        Row: {
          criado_em: string
          galpao_id: string
          id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          galpao_id: string
          id?: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          galpao_id?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_usuario_galpoes_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "siso_galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siso_usuario_galpoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "siso_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      siso_usuarios: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          cargo: string
          cargos: string[]
          criado_em: string | null
          id: string
          nome: string
          pin: string
          printnode_printer_id: number | null
          printnode_printer_nome: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cargo: string
          cargos?: string[]
          criado_em?: string | null
          id?: string
          nome: string
          pin: string
          printnode_printer_id?: number | null
          printnode_printer_nome?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cargo?: string
          cargos?: string[]
          criado_em?: string | null
          id?: string
          nome?: string
          pin?: string
          printnode_printer_id?: number | null
          printnode_printer_nome?: string | null
        }
        Relationships: []
      }
      siso_webhook_logs: {
        Row: {
          cnpj: string
          codigo_situacao: string | null
          criado_em: string
          dedup_key: string | null
          empresa_id: string | null
          erro: string | null
          filial: Database["public"]["Enums"]["siso_filial"] | null
          id: string
          payload: Json
          processado_em: string | null
          status: string
          tiny_pedido_id: string
          tipo: string
        }
        Insert: {
          cnpj: string
          codigo_situacao?: string | null
          criado_em?: string
          dedup_key?: string | null
          empresa_id?: string | null
          erro?: string | null
          filial?: Database["public"]["Enums"]["siso_filial"] | null
          id?: string
          payload: Json
          processado_em?: string | null
          status?: string
          tiny_pedido_id: string
          tipo: string
        }
        Update: {
          cnpj?: string
          codigo_situacao?: string | null
          criado_em?: string
          dedup_key?: string | null
          empresa_id?: string | null
          erro?: string | null
          filial?: Database["public"]["Enums"]["siso_filial"] | null
          id?: string
          payload?: Json
          processado_em?: string | null
          status?: string
          tiny_pedido_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "siso_webhook_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "siso_empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_messages: {
        Row: {
          active: boolean
          body_md: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["standard_message_kind_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body_md: string
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["standard_message_kind_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body_md?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["standard_message_kind_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          created_at: string
          deposit_id: string | null
          deposit_name: string
          empresa: string | null
          id: string
          location: string | null
          sku: string
          todays_stock: number | null
          updated_at: string | null
          yesterdays_stock: number | null
        }
        Insert: {
          created_at?: string
          deposit_id?: string | null
          deposit_name: string
          empresa?: string | null
          id?: string
          location?: string | null
          sku: string
          todays_stock?: number | null
          updated_at?: string | null
          yesterdays_stock?: number | null
        }
        Update: {
          created_at?: string
          deposit_id?: string | null
          deposit_name?: string
          empresa?: string | null
          id?: string
          location?: string | null
          sku?: string
          todays_stock?: number | null
          updated_at?: string | null
          yesterdays_stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          adress: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: number | null
          state: string | null
          warehouse_id: string | null
        }
        Insert: {
          adress?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: number | null
          state?: string | null
          warehouse_id?: string | null
        }
        Update: {
          adress?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: number | null
          state?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          ca_action: string | null
          ca_response: Json | null
          created_at: string | null
          error: string | null
          id: string
          operation: string
          reference_id: string | null
          seller_slug: string
          status: string | null
        }
        Insert: {
          ca_action?: string | null
          ca_response?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          operation: string
          reference_id?: string | null
          seller_slug: string
          status?: string | null
        }
        Update: {
          ca_action?: string | null
          ca_response?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          operation?: string
          reference_id?: string | null
          seller_slug?: string
          status?: string | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          created_at: string
          seller_slug: string
          state: Json
          sync_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          seller_slug: string
          state?: Json
          sync_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          seller_slug?: string
          state?: Json
          sync_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          leader_id: string | null
          position: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          leader_id?: string | null
          position?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          leader_id?: string | null
          position?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          leader_id: string | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          leader_id?: string | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          leader_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tiny_locations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location_code: string
          source: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_code: string
          source?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_code?: string
          source?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      user_activity_sessions: {
        Row: {
          api_calls_count: number | null
          created_at: string | null
          events_count: number | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          session_id: string
          started_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_calls_count?: number | null
          created_at?: string | null
          events_count?: number | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          session_id: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_calls_count?: number | null
          created_at?: string | null
          events_count?: number | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          session_id?: string
          started_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_copy_from: boolean
          can_copy_to: boolean
          id: string
          org_id: string
          seller_slug: string
          user_id: string
        }
        Insert: {
          can_copy_from?: boolean
          can_copy_to?: boolean
          id?: string
          org_id: string
          seller_slug: string
          user_id: string
        }
        Update: {
          can_copy_from?: boolean
          can_copy_to?: boolean
          id?: string
          org_id?: string
          seller_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_domain: string
          created_at: string | null
          department: string | null
          email: string
          email_confirmed: boolean | null
          first_login: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_domain: string
          created_at?: string | null
          department?: string | null
          email: string
          email_confirmed?: boolean | null
          first_login?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_domain?: string
          created_at?: string | null
          department?: string | null
          email?: string
          email_confirmed?: boolean | null
          first_login?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          can_run_compat: boolean
          created_at: string | null
          email: string | null
          id: string
          is_super_admin: boolean
          last_login_at: string | null
          org_id: string
          password_hash: string
          role: string
          username: string
        }
        Insert: {
          active?: boolean
          can_run_compat?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          is_super_admin?: boolean
          last_login_at?: string | null
          org_id: string
          password_hash: string
          role?: string
          username: string
        }
        Update: {
          active?: boolean
          can_run_compat?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          is_super_admin?: boolean
          last_login_at?: string | null
          org_id?: string
          password_hash?: string
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          action: string | null
          created_at: string | null
          data_id: string | null
          id: string
          raw_payload: Json | null
          resource: string | null
          seller_slug: string
          status: string | null
          topic: string
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          data_id?: string | null
          id?: string
          raw_payload?: Json | null
          resource?: string | null
          seller_slug: string
          status?: string | null
          topic: string
        }
        Update: {
          action?: string | null
          created_at?: string | null
          data_id?: string | null
          id?: string
          raw_payload?: Json | null
          resource?: string | null
          seller_slug?: string
          status?: string | null
          topic?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_public: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          differentials: string | null
          id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string | null
          overview: string | null
          tagline: string | null
          values_list: string[] | null
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          differentials?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          overview?: string | null
          tagline?: string | null
          values_list?: string[] | null
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          differentials?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string | null
          overview?: string | null
          tagline?: string | null
          values_list?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      cultural_fit_questions_public: {
        Row: {
          id: string | null
          kind: Database["public"]["Enums"]["fit_question_kind_enum"] | null
          options: Json | null
          order_index: number | null
          prompt: string | null
          scale_max: number | null
          scale_min: number | null
          survey_id: string | null
        }
        Insert: {
          id?: string | null
          kind?: Database["public"]["Enums"]["fit_question_kind_enum"] | null
          options?: Json | null
          order_index?: number | null
          prompt?: string | null
          scale_max?: number | null
          scale_min?: number | null
          survey_id?: string | null
        }
        Update: {
          id?: string | null
          kind?: Database["public"]["Enums"]["fit_question_kind_enum"] | null
          options?: Json | null
          order_index?: number | null
          prompt?: string | null
          scale_max?: number | null
          scale_min?: number | null
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultural_fit_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_fit_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_fit_surveys_public: {
        Row: {
          active: boolean | null
          id: string | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      job_descriptions_public: {
        Row: {
          benefits_list: string[] | null
          content_md: string | null
          daily_routine: string | null
          expectations: string | null
          id: string | null
          job_opening_id: string | null
          requirements: string[] | null
          version: number | null
          work_schedule: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_descriptions_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_descriptions_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "jobs_public"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_public: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          benefits: string | null
          company_id: string | null
          contract_type:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cultural_fit_survey_id: string | null
          hours_per_week: number | null
          id: string | null
          num_openings: number | null
          opened_at: string | null
          override_address: boolean | null
          public_slug: string | null
          required_skills: string[] | null
          salary_max_cents: number | null
          salary_min_cents: number | null
          sector: string | null
          shift: string | null
          status: Database["public"]["Enums"]["job_status_enum"] | null
          summary: string | null
          target_deadline: string | null
          title: string | null
          updated_at: string | null
          work_mode: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          benefits?: string | null
          company_id?: string | null
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cultural_fit_survey_id?: string | null
          hours_per_week?: number | null
          id?: string | null
          num_openings?: number | null
          opened_at?: string | null
          override_address?: boolean | null
          public_slug?: string | null
          required_skills?: string[] | null
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          sector?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"] | null
          summary?: string | null
          target_deadline?: string | null
          title?: string | null
          updated_at?: string | null
          work_mode?: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          benefits?: string | null
          company_id?: string | null
          contract_type?:
            | Database["public"]["Enums"]["contract_type_enum"]
            | null
          cultural_fit_survey_id?: string | null
          hours_per_week?: number | null
          id?: string | null
          num_openings?: number | null
          opened_at?: string | null
          override_address?: boolean | null
          public_slug?: string | null
          required_skills?: string[] | null
          salary_max_cents?: number | null
          salary_min_cents?: number | null
          sector?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"] | null
          summary?: string | null
          target_deadline?: string | null
          title?: string | null
          updated_at?: string | null
          work_mode?: Database["public"]["Enums"]["work_mode_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_cultural_fit_survey_id_fkey"
            columns: ["cultural_fit_survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_cultural_fit_survey_id_fkey"
            columns: ["cultural_fit_survey_id"]
            isOneToOne: false
            referencedRelation: "cultural_fit_surveys_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_expenses: {
        Row: {
          amount: number | null
          auto_categorized: boolean | null
          beneficiary_name: string | null
          business_branch: string | null
          ca_category: string | null
          created_at: string | null
          date_approved: string | null
          date_created: string | null
          description: string | null
          expense_direction: string | null
          expense_type: string | null
          external_reference: string | null
          febraban_code: string | null
          id: number | null
          notes: string | null
          operation_type: string | null
          payment_id: string | null
          payment_method: string | null
          raw_payment: Json | null
          seller_slug: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: never
          auto_categorized?: never
          beneficiary_name?: never
          business_branch?: never
          ca_category?: never
          created_at?: string | null
          date_approved?: never
          date_created?: never
          description?: never
          expense_direction?: never
          expense_type?: never
          external_reference?: never
          febraban_code?: never
          id?: number | null
          notes?: never
          operation_type?: never
          payment_id?: string | null
          payment_method?: never
          raw_payment?: never
          seller_slug?: string | null
          source?: never
          status?: never
          updated_at?: string | null
        }
        Update: {
          amount?: never
          auto_categorized?: never
          beneficiary_name?: never
          business_branch?: never
          ca_category?: never
          created_at?: string | null
          date_approved?: never
          date_created?: never
          description?: never
          expense_direction?: never
          expense_type?: never
          external_reference?: never
          febraban_code?: never
          id?: number | null
          notes?: never
          operation_type?: never
          payment_id?: string | null
          payment_method?: never
          raw_payment?: never
          seller_slug?: string | null
          source?: never
          status?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_seller_slug_fkey"
            columns: ["seller_slug"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_hiring_applications_by_stage: {
        Row: {
          company_id: string | null
          count: number | null
          stage: Database["public"]["Enums"]["application_stage_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hiring_avg_time_per_job: {
        Row: {
          avg_days_open: number | null
          company_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hiring_bottlenecks: {
        Row: {
          application_id: string | null
          candidate_name: string | null
          company_id: string | null
          days_in_stage: number | null
          job_opening_id: string | null
          job_title: string | null
          stage: Database["public"]["Enums"]["application_stage_enum"] | null
          stage_entered_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "jobs_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hiring_final_approval_rate: {
        Row: {
          approval_rate: number | null
          aprovados: number | null
          company_id: string | null
          reprovados: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hiring_jobs_by_status: {
        Row: {
          company_id: string | null
          count: number | null
          status: Database["public"]["Enums"]["job_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hiring_stage_conversion: {
        Row: {
          company_id: string | null
          from_stage:
            | Database["public"]["Enums"]["application_stage_enum"]
            | null
          to_stage: Database["public"]["Enums"]["application_stage_enum"] | null
          transitions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ads_meli: { Args: { input_sku: string }; Returns: boolean }
      allowed_companies: { Args: { _profile_id: string }; Returns: string[] }
      anonymize_candidate: {
        Args: { p_candidate_id: string }
        Returns: undefined
      }
      assign_to_master_part: {
        Args: { p_sku: string; p_supplier: string }
        Returns: string
      }
      batch_create_master_parts: {
        Args: { p_batch_size?: number; p_supplier_filter?: string }
        Returns: {
          created_masters: number
          errors: number
          merged_products: number
          processed_count: number
          processing_time: string
        }[]
      }
      batch_migrate_oem_data: {
        Args: { batch_size?: number; dry_run?: boolean }
        Returns: {
          action: string
          new_oem: Json
          old_oem: Json
          sku: string
        }[]
      }
      check_deposit_sync_status: {
        Args: never
        Returns: {
          metric: string
          value: string
        }[]
      }
      check_if_table_exists: { Args: { target_table: string }; Returns: Json[] }
      clean_orphaned_search_entries: { Args: never; Returns: number }
      demonstrate_deposit_sync: {
        Args: { target_deposit: string; target_sku: string }
        Returns: {
          deposit_name: string
          empresa: string
          is_latest: boolean
          sku: string
          todays_stock: number
          updated_at: string
        }[]
      }
      demonstrate_redundancy_handling: {
        Args: { target_sku: string }
        Returns: {
          calculation_note: string
          deposit_name: string
          empresa: string
          step_description: string
          stock_value: number
        }[]
      }
      enable_audit_insert: { Args: never; Returns: undefined }
      end_inactive_sessions: { Args: never; Returns: number }
      exec_sql_with_params: {
        Args: { query_params: string[]; query_text: string }
        Returns: Json
      }
      expand_unified_skus: {
        Args: { filter_sku?: string }
        Returns: {
          base_sku: string
          oem_code: string
          original_sku: string
          product_name: string
        }[]
      }
      extract_ad_compatibilities: {
        Args: { p_ad_id: string }
        Returns: {
          brand_id: string
          model_id: string
          year_id: string
        }[]
      }
      extract_domain: { Args: { email_address: string }; Returns: string }
      extract_oem_codes: { Args: { oem_data: Json }; Returns: string[] }
      find_and_merge_duplicates: {
        Args: { p_confidence_threshold?: number; p_limit?: number }
        Returns: {
          groups_processed: number
          merged_count: number
          products_affected: number
        }[]
      }
      find_conflicting_oems: {
        Args: never
        Returns: {
          master_parts_count: number
          needs_review: boolean
          oem_code: string
          skus: string[]
          suppliers: string[]
        }[]
      }
      find_master_part_candidates: {
        Args: {
          p_compatibility: Json
          p_oems: Json
          p_product_name?: string
          p_references: Json
          p_sku: string
          p_supplier: string
        }
        Returns: {
          confidence: number
          master_id: string
          match_details: Json
          match_reason: string
        }[]
      }
      find_products_by_oem: {
        Args: { oem_codes: string[] }
        Returns: {
          oem_data: Json
          product_name: string
          shared_oems: string[]
          sku: string
        }[]
      }
      find_sku_by_oem: {
        Args: { oem_code: string }
        Returns: {
          oem: string[]
          product_name: string
          sku: string
          supplier: string
        }[]
      }
      get_ads_count_for_seller: {
        Args: { p_seller_id: number; p_sku: string }
        Returns: {
          active_ads: number
          paused_ads: number
          total_ads: number
        }[]
      }
      get_default_compatibilities: {
        Args: { p_limit?: number }
        Returns: number[]
      }
      get_deposit_sync_summary: {
        Args: never
        Returns: {
          details: string
          status: string
          system_component: string
        }[]
      }
      get_enrichment_recommendations: {
        Args: { limit_count?: number }
        Returns: {
          missing_data: string[]
          priority_score: number
          product_name: string
          recommendation: string
          sku: string
        }[]
      }
      get_oem_migration_stats: {
        Args: never
        Returns: {
          needs_migration_count: number
          new_format_count: number
          old_format_count: number
          total_products_with_oem: number
        }[]
      }
      get_or_create_session: {
        Args: {
          p_auth_session_id?: string
          p_browser_info?: Json
          p_ip_address?: unknown
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      get_primary_key_columns: {
        Args: { target_table: string }
        Returns: {
          column_name: string
        }[]
      }
      get_product_compatibility_data: { Args: { p_sku: string }; Returns: Json }
      get_seller_id_by_company: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_seller_id_by_company_name: {
        Args: { p_company_name: string }
        Returns: number
      }
      get_sku_stock_breakdown: {
        Args: { input_sku: string }
        Returns: {
          deposit_id: string
          deposit_name: string
          empresa: string
          location: string
          sku: string
          stock_type: string
          todays_stock: number
        }[]
      }
      get_stock_calculation_status: {
        Args: never
        Returns: {
          metric: string
          value: string
        }[]
      }
      get_stock_type_summary: {
        Args: never
        Returns: {
          metric: string
          physical_count: number
          total_count: number
          virtual_count: number
        }[]
      }
      get_table_columns_info: {
        Args: { target_table: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_table_indexes: { Args: { target_table: string }; Returns: Json[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_meli_ads_for_company_name: {
        Args: { p_company_name: string; p_sku: string }
        Returns: boolean
      }
      has_meli_ads_for_seller: {
        Args: { p_seller_id: number; p_sku: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hiring_cron_interview_reminder: { Args: never; Returns: undefined }
      hiring_cron_invoke_anonymize_expired: { Args: never; Returns: undefined }
      hiring_cron_invoke_expire_fit_links: { Args: never; Returns: undefined }
      hiring_cron_secret: { Args: never; Returns: string }
      hiring_object_company: {
        Args: { p_object_name: string }
        Returns: string
      }
      hiring_supabase_url: { Args: never; Returns: string }
      import_reference_mappings: {
        Args: { p_mappings: Json }
        Returns: {
          errors: number
          imported: number
          skipped: number
        }[]
      }
      initialize_master_parts_system: { Args: never; Returns: string }
      insert_n8n_error_log: { Args: { error_data: Json }; Returns: string }
      insert_product_from_tiny: {
        Args: {
          p_location: string
          p_product_name: string
          p_sku: string
          p_supplier: string
          p_tiny_id: string
          p_total_stock: number
        }
        Returns: Json
      }
      insert_product_from_tiny_complete: {
        Args: {
          p_brand?: string
          p_category?: string
          p_characteristics?: string
          p_complementary_description?: string
          p_cost_price?: number
          p_external_image_urls?: Json
          p_gross_weight_kg?: number
          p_gtin?: string
          p_location: string
          p_manufacturer?: string
          p_max_stock?: number
          p_mean_cost_price?: number
          p_min_stock?: number
          p_net_weight_kg?: number
          p_oem: string[]
          p_on_demand?: boolean
          p_origin?: string
          p_package_diameter?: number
          p_package_height?: number
          p_package_length?: number
          p_package_width?: number
          p_preparation_days?: number
          p_price?: number
          p_product_attributes?: string[]
          p_product_name: string
          p_promotional_price?: number
          p_situation?: string
          p_sku: string
          p_supplier: string
          p_supplier_code?: string
          p_tax_classification?: string
          p_tiny_id: string
          p_total_stock: number
          p_unit?: string
          p_units_per_box?: number
          p_warranty?: string
        }
        Returns: Json
      }
      is_valid_company_domain: {
        Args: { email_address: string }
        Returns: boolean
      }
      log_auth_event: {
        Args: {
          p_error_message?: string
          p_event_type?: string
          p_ip_address?: string
          p_metadata?: Json
          p_success?: boolean
          p_user_agent?: string
          p_user_email?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      manual_update_stock: {
        Args: { target_sku: string }
        Returns: {
          calculation_method: string
          new_total_stock: number
          old_total_stock: number
          sku: string
          unique_deposits_count: number
        }[]
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      merge_duplicate_stock_locations: { Args: never; Returns: undefined }
      merge_master_parts: {
        Args: {
          p_reason?: string
          p_source_master_id: string
          p_target_master_id: string
        }
        Returns: string
      }
      migrate_generic_pattern: { Args: { old_data: Json }; Returns: Json }
      migrate_multiqualita_pattern: { Args: { old_data: Json }; Returns: Json }
      migrate_oem_to_new_format: {
        Args: {
          default_confidence?: number
          default_product_name?: string
          default_source?: string
          old_oem: Json
        }
        Returns: Json
      }
      migrate_pattern_a: { Args: { old_data: Json }; Returns: Json }
      rebuild_master_part_data: {
        Args: { p_master_id: string }
        Returns: undefined
      }
      recalculate_all_total_stock: {
        Args: never
        Returns: {
          operation_summary: string
          products_updated: number
          products_with_stock: number
          products_without_stock: number
          total_stock_locations: number
          unique_deposits: number
        }[]
      }
      safe_insert_stock_location: {
        Args: {
          p_deposit_id: string
          p_deposit_name: string
          p_empresa: string
          p_sku: string
          p_todays_stock: number
        }
        Returns: string
      }
      safe_update_stock_location: {
        Args: {
          p_deposit_id: string
          p_deposit_name: string
          p_empresa: string
          p_sku: string
          p_todays_stock: number
        }
        Returns: boolean
      }
      search_parts: {
        Args: {
          p_limit?: number
          p_search_term: string
          p_search_type?: string
        }
        Returns: {
          all_oems: string[]
          confidence_score: number
          master_part_id: string
          match_type: string
          primary_brand: string
          primary_category: string
          primary_name: string
          status: string
          suppliers: Json
          vehicles: Json
        }[]
      }
      select_sql: { Args: { query: string }; Returns: Json[] }
      set_audit_context: {
        Args: { source_info?: string; user_identifier: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      siso_claim_etiqueta: { Args: { p_pedido_id: string }; Returns: Json }
      siso_claim_pedidos_para_agrupamento: {
        Args: { p_pedido_ids: string[] }
        Returns: {
          empresa_origem_id: string
          forma_envio_id: string
          forma_frete_id: string
          id: string
          nota_fiscal_id: number
          numero: string
          transportador_id: string
        }[]
      }
      siso_consolidar_produtos_separacao: {
        Args: { p_order_by?: string; p_pedido_ids: string[] }
        Returns: {
          descricao: string
          gtin: string
          localizacao: string
          produto_id: string
          quantidade_total: number
          sku: string
          unidade: string
        }[]
      }
      siso_loc_sort_key: { Args: { loc: string }; Returns: string }
      siso_processar_bip: {
        Args: { p_codigo: string; p_galpao_id: string; p_usuario_id: string }
        Returns: Json
      }
      siso_processar_bip_embalagem:
        | {
            Args: { p_galpao_id?: string; p_quantidade?: number; p_sku: string }
            Returns: {
              bipado_completo: boolean
              etiqueta_agrupamento_id: string
              etiqueta_empresa_origem_id: string
              etiqueta_galpao_id: string
              etiqueta_numero: string
              etiqueta_operador_id: string
              etiqueta_url: string
              etiqueta_zpl: string
              pedido_completo: boolean
              pedido_id: string
              produto_id: string
              quantidade_bipada: number
            }[]
          }
        | {
            Args: {
              p_galpao_id?: string
              p_operador_id?: string
              p_quantidade?: number
              p_sku: string
            }
            Returns: {
              bipado_completo: boolean
              etiqueta_agrupamento_id: string
              etiqueta_empresa_origem_id: string
              etiqueta_galpao_id: string
              etiqueta_numero: string
              etiqueta_operador_id: string
              etiqueta_url: string
              etiqueta_zpl: string
              pedido_completo: boolean
              pedido_id: string
              produto_id: string
              quantidade_bipada: number
            }[]
          }
      siso_set_etiqueta_status: {
        Args: { p_pedido_id: string; p_status?: string }
        Returns: undefined
      }
      siso_trigger_worker_heartbeat: { Args: never; Returns: undefined }
      siso_update_pedido_with_etiqueta: {
        Args: { p_pedido_id: string; p_updates: Json }
        Returns: undefined
      }
      split_from_master_part: {
        Args: { p_reason?: string; p_sku: string; p_supplier: string }
        Returns: string
      }
      sync_all_deposit_pairs: {
        Args: never
        Returns: {
          deposits_with_redundancy: number
          operation_summary: string
          records_synchronized: number
        }[]
      }
      unify_duplicate_skus: {
        Args: never
        Returns: {
          base_sku: string
          oem_codes_collected: number
          rows_unified: number
        }[]
      }
      unify_skus_batch: {
        Args: { batch_limit?: number }
        Returns: {
          processed_count: number
          remaining_count: number
        }[]
      }
      update_confidence_scores: { Args: never; Returns: number }
      update_product_stock_totals: { Args: never; Returns: undefined }
      update_total_stock_for_all_products: { Args: never; Returns: undefined }
      update_total_stock_for_sku: {
        Args: { target_sku: string }
        Returns: undefined
      }
      validate_and_consume_fit_token: {
        Args: { p_token_raw: string }
        Returns: {
          application_id: string
          survey_id: string
          token_id: string
        }[]
      }
      validate_oem_structure: { Args: { oem_data: Json }; Returns: Json }
    }
    Enums: {
      anonymization_reason_enum: "solicitacao" | "retencao_expirada"
      app_role: "socio" | "lider" | "rh" | "colaborador" | "admin"
      application_stage_enum:
        | "recebido"
        | "em_interesse"
        | "aguardando_fit_cultural"
        | "sem_retorno"
        | "fit_recebido"
        | "antecedentes_ok"
        | "apto_entrevista_rh"
        | "entrevista_rh_agendada"
        | "entrevista_rh_feita"
        | "apto_entrevista_final"
        | "entrevista_final_agendada"
        | "aguardando_decisao_dos_gestores"
        | "aprovado"
        | "em_admissao"
        | "admitido"
        | "reprovado_pelo_gestor"
        | "recusado"
      background_status_enum:
        | "limpo"
        | "pendencia_leve"
        | "pendencia_grave"
        | "nao_aplicavel"
      contract_type_enum: "clt" | "pj" | "estagio" | "pj_equity"
      description_approval_enum:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "rejeitado"
      document_type_enum: "cpf" | "passport" | "rne" | "other"
      evaluator_decision_enum: "aprovado" | "reprovado" | "pendente"
      fit_question_kind_enum: "scale" | "text" | "multi_choice"
      hiring_outcome_enum: "aprovado" | "reprovado"
      interview_kind_enum: "rh" | "final"
      interview_mode_enum: "presencial" | "remota"
      interview_status_enum: "agendada" | "realizada" | "cancelada"
      job_close_reason_enum: "contratado" | "cancelado" | "congelado"
      job_status_enum:
        | "aguardando_descritivo"
        | "em_ajuste_pelo_rh"
        | "aguardando_aprovacao_do_gestor"
        | "pronta_para_publicar"
        | "publicada"
        | "em_triagem"
        | "encerrada"
      log_action_enum: "view" | "update" | "optimistic_conflict"
      marketplace_ad_change_type:
        | "created"
        | "updated"
        | "deleted"
        | "price_changed"
        | "stock_changed"
        | "status_changed"
        | "title_changed"
        | "description_changed"
        | "images_changed"
        | "attributes_changed"
        | "paused"
        | "resumed"
      product_status: "processing" | "completed" | "failed" | "pending"
      publication_channel_enum: "linkedin" | "indeed" | "instagram" | "outros"
      siso_decisao: "propria" | "transferencia" | "oc"
      siso_filial: "CWB" | "SP"
      siso_resolucao: "auto" | "manual"
      siso_status:
        | "pendente"
        | "executando"
        | "concluido"
        | "erro"
        | "cancelado"
      standard_message_kind_enum:
        | "recusa"
        | "convite_fit"
        | "oferta"
        | "aprovacao_proxima_etapa"
      work_mode_enum: "presencial" | "remoto" | "hibrido"
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
      anonymization_reason_enum: ["solicitacao", "retencao_expirada"],
      app_role: ["socio", "lider", "rh", "colaborador", "admin"],
      application_stage_enum: [
        "recebido",
        "em_interesse",
        "aguardando_fit_cultural",
        "sem_retorno",
        "fit_recebido",
        "antecedentes_ok",
        "apto_entrevista_rh",
        "entrevista_rh_agendada",
        "entrevista_rh_feita",
        "apto_entrevista_final",
        "entrevista_final_agendada",
        "aguardando_decisao_dos_gestores",
        "aprovado",
        "em_admissao",
        "admitido",
        "reprovado_pelo_gestor",
        "recusado",
      ],
      background_status_enum: [
        "limpo",
        "pendencia_leve",
        "pendencia_grave",
        "nao_aplicavel",
      ],
      contract_type_enum: ["clt", "pj", "estagio", "pj_equity"],
      description_approval_enum: [
        "rascunho",
        "enviado",
        "aprovado",
        "rejeitado",
      ],
      document_type_enum: ["cpf", "passport", "rne", "other"],
      evaluator_decision_enum: ["aprovado", "reprovado", "pendente"],
      fit_question_kind_enum: ["scale", "text", "multi_choice"],
      hiring_outcome_enum: ["aprovado", "reprovado"],
      interview_kind_enum: ["rh", "final"],
      interview_mode_enum: ["presencial", "remota"],
      interview_status_enum: ["agendada", "realizada", "cancelada"],
      job_close_reason_enum: ["contratado", "cancelado", "congelado"],
      job_status_enum: [
        "aguardando_descritivo",
        "em_ajuste_pelo_rh",
        "aguardando_aprovacao_do_gestor",
        "pronta_para_publicar",
        "publicada",
        "em_triagem",
        "encerrada",
      ],
      log_action_enum: ["view", "update", "optimistic_conflict"],
      marketplace_ad_change_type: [
        "created",
        "updated",
        "deleted",
        "price_changed",
        "stock_changed",
        "status_changed",
        "title_changed",
        "description_changed",
        "images_changed",
        "attributes_changed",
        "paused",
        "resumed",
      ],
      product_status: ["processing", "completed", "failed", "pending"],
      publication_channel_enum: ["linkedin", "indeed", "instagram", "outros"],
      siso_decisao: ["propria", "transferencia", "oc"],
      siso_filial: ["CWB", "SP"],
      siso_resolucao: ["auto", "manual"],
      siso_status: ["pendente", "executando", "concluido", "erro", "cancelado"],
      standard_message_kind_enum: [
        "recusa",
        "convite_fit",
        "oferta",
        "aprovacao_proxima_etapa",
      ],
      work_mode_enum: ["presencial", "remoto", "hibrido"],
    },
  },
} as const

