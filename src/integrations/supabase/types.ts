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
          added_to_talent_pool: boolean
          candidate_id: string
          closed_at: string | null
          created_at: string
          discard_notes: string | null
          discard_reason:
            | Database["public"]["Enums"]["discard_reason_enum"]
            | null
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
          added_to_talent_pool?: boolean
          candidate_id: string
          closed_at?: string | null
          created_at?: string
          discard_notes?: string | null
          discard_reason?:
            | Database["public"]["Enums"]["discard_reason_enum"]
            | null
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
          added_to_talent_pool?: boolean
          candidate_id?: string
          closed_at?: string | null
          created_at?: string
          discard_notes?: string | null
          discard_reason?:
            | Database["public"]["Enums"]["discard_reason_enum"]
            | null
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
      candidate_conversations: {
        Row: {
          anonymized_at: string | null
          candidate_id: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["candidate_conversation_kind_enum"]
          occurred_at: string
          summary: string | null
          title: string | null
          transcript_path: string | null
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          candidate_id: string
          created_at?: string
          created_by: string
          id?: string
          kind?: Database["public"]["Enums"]["candidate_conversation_kind_enum"]
          occurred_at?: string
          summary?: string | null
          title?: string | null
          transcript_path?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["candidate_conversation_kind_enum"]
          occurred_at?: string
          summary?: string | null
          title?: string | null
          transcript_path?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_conversations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          group_id: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          overview: string | null
          performance_enabled: boolean
          rs_enabled: boolean
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
          group_id?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          overview?: string | null
          performance_enabled?: boolean
          rs_enabled?: boolean
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
          group_id?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          overview?: string | null
          performance_enabled?: boolean
          rs_enabled?: boolean
          tagline?: string | null
          updated_at?: string
          values_list?: string[]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "company_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      company_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
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
            foreignKeyName: "job_openings_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      org_unit_members: {
        Row: {
          created_at: string
          is_primary: boolean
          org_unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          org_unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          org_unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_unit_members_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_unit_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_units: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: string | null
          name: string
          parent_id: string | null
          position: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          parent_id?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          parent_id?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
        ]
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
      socio_company_memberships: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socio_company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socio_company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socio_company_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      unit_leaders: {
        Row: {
          created_at: string
          org_unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_leaders_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_leaders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_hard_delete_user: { Args: { _user_id: string }; Returns: undefined }
      allowed_companies: { Args: { _profile_id: string }; Returns: string[] }
      anonymize_candidate: {
        Args: { p_candidate_id: string }
        Returns: undefined
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      global_search: {
        Args: { max_per_kind?: number; q: string }
        Returns: {
          id: string
          kind: string
          subtitle: string
          title: string
          url: string
        }[]
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
      is_people_manager: { Args: { _user_id: string }; Returns: boolean }
      org_unit_descendants: { Args: { _unit_id: string }; Returns: string[] }
      resolve_default_scope: { Args: { _uid: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_and_consume_fit_token: {
        Args: { p_token_raw: string }
        Returns: {
          application_id: string
          survey_id: string
          token_id: string
        }[]
      }
      visible_companies: { Args: { _uid: string }; Returns: string[] }
      visible_org_units: { Args: { _uid: string }; Returns: string[] }
    }
    Enums: {
      anonymization_reason_enum: "solicitacao" | "retencao_expirada"
      app_role: "socio" | "lider" | "rh" | "colaborador" | "admin" | "liderado"
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
      candidate_conversation_kind_enum:
        | "discovery"
        | "followup"
        | "referencia"
        | "alinhamento"
        | "outro"
      contract_type_enum: "clt" | "pj" | "estagio" | "pj_equity"
      description_approval_enum:
        | "rascunho"
        | "enviado"
        | "aprovado"
        | "rejeitado"
      discard_reason_enum:
        | "antecedentes_reprovados"
        | "perfil_desalinhado"
        | "experiencia_insuficiente"
        | "expectativa_salarial"
        | "candidato_desistiu"
        | "sem_retorno_candidato"
        | "reprovado_entrevista_rh"
        | "reprovado_entrevista_final"
        | "avaliacao_rh_negativa"
        | "posicao_preenchida"
        | "outro"
      document_type_enum: "cpf" | "passport" | "rne" | "other"
      evaluator_decision_enum: "aprovado" | "reprovado" | "pendente"
      fit_question_kind_enum: "scale" | "text" | "multi_choice"
      hiring_outcome_enum: "aprovado" | "reprovado"
      interview_kind_enum: "rh" | "final"
      interview_mode_enum: "presencial" | "remota"
      interview_status_enum: "agendada" | "realizada" | "cancelada"
      job_close_reason_enum: "contratado" | "cancelado" | "congelado"
      job_status_enum: "aguardando_publicacao" | "publicada" | "fechada"
      log_action_enum: "view" | "update" | "optimistic_conflict"
      publication_channel_enum: "linkedin" | "indeed" | "instagram" | "outros"
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
      app_role: ["socio", "lider", "rh", "colaborador", "admin", "liderado"],
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
      candidate_conversation_kind_enum: [
        "discovery",
        "followup",
        "referencia",
        "alinhamento",
        "outro",
      ],
      contract_type_enum: ["clt", "pj", "estagio", "pj_equity"],
      description_approval_enum: [
        "rascunho",
        "enviado",
        "aprovado",
        "rejeitado",
      ],
      discard_reason_enum: [
        "antecedentes_reprovados",
        "perfil_desalinhado",
        "experiencia_insuficiente",
        "expectativa_salarial",
        "candidato_desistiu",
        "sem_retorno_candidato",
        "reprovado_entrevista_rh",
        "reprovado_entrevista_final",
        "avaliacao_rh_negativa",
        "posicao_preenchida",
        "outro",
      ],
      document_type_enum: ["cpf", "passport", "rne", "other"],
      evaluator_decision_enum: ["aprovado", "reprovado", "pendente"],
      fit_question_kind_enum: ["scale", "text", "multi_choice"],
      hiring_outcome_enum: ["aprovado", "reprovado"],
      interview_kind_enum: ["rh", "final"],
      interview_mode_enum: ["presencial", "remota"],
      interview_status_enum: ["agendada", "realizada", "cancelada"],
      job_close_reason_enum: ["contratado", "cancelado", "congelado"],
      job_status_enum: ["aguardando_publicacao", "publicada", "fechada"],
      log_action_enum: ["view", "update", "optimistic_conflict"],
      publication_channel_enum: ["linkedin", "indeed", "instagram", "outros"],
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
