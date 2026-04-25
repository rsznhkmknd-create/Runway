export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NotificationSettings = {
  runway_low: boolean
  invoices_overdue: boolean
  weekly_summary: boolean
  monthly_summary: boolean
  expense_spike: boolean
}

export type PlanTier = 'starter' | 'growth' | 'pro'

export type ActivityEventType =
  | 'session.created'
  | 'session.ended'
  | 'session.revoked'
  | 'account.export'
  | 'account.delete_requested'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          clerk_id: string
          email: string
          full_name: string | null
          company_name: string | null
          currency: string
          // Onboarding
          industry: string | null
          country: string | null
          employee_count: string | null
          business_type: string | null
          website: string | null
          main_goal: string | null
          onboarding_completed: boolean
          // Company profile
          tax_id: string | null
          address: string | null
          city: string | null
          logo_url: string | null
          avatar_url: string | null
          // Notifications
          notification_settings: NotificationSettings
          // Plan
          plan: PlanTier
          plan_started_at: string
          plan_renews_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          currency?: string
          industry?: string | null
          country?: string | null
          employee_count?: string | null
          business_type?: string | null
          website?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean
          tax_id?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          avatar_url?: string | null
          notification_settings?: NotificationSettings
          plan?: PlanTier
          plan_started_at?: string
          plan_renews_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          company_name?: string | null
          currency?: string
          industry?: string | null
          country?: string | null
          employee_count?: string | null
          business_type?: string | null
          website?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean
          tax_id?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          avatar_url?: string | null
          notification_settings?: NotificationSettings
          plan?: PlanTier
          plan_started_at?: string
          plan_renews_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          profile_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description?: string | null
          date: string
          created_at?: string
        }
        Update: {
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          description?: string | null
          date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          profile_id: string
          client_name: string
          amount: number
          currency: string
          due_date: string
          status: 'pending' | 'paid' | 'overdue'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          client_name: string
          amount: number
          currency?: string
          due_date: string
          status?: 'pending' | 'paid' | 'overdue'
          created_at?: string
        }
        Update: {
          client_name?: string
          amount?: number
          currency?: string
          due_date?: string
          status?: 'pending' | 'paid' | 'overdue'
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reports: {
        Row: {
          id: string
          profile_id: string
          type: 'weekly' | 'monthly'
          period_start: string
          period_end: string
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type: 'weekly' | 'monthly'
          period_start: string
          period_end: string
          content: Json
          created_at?: string
        }
        Update: {
          type?: 'weekly' | 'monthly'
          period_start?: string
          period_end?: string
          content?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'reports_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      daily_insights: {
        Row: {
          id: string
          profile_id: string
          date: string
          insights: Json
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          insights: Json
          created_at?: string
        }
        Update: {
          date?: string
          insights?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'daily_insights_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      usage_counters: {
        Row: {
          id: string
          profile_id: string
          period_start: string
          imports_count: number
          ai_invoices_count: number
          reports_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          period_start: string
          imports_count?: number
          ai_invoices_count?: number
          reports_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          imports_count?: number
          ai_invoices_count?: number
          reports_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_counters_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      import_staging: {
        Row: {
          id: string
          import_id: string
          profile_id: string
          amount: number | null
          type: 'income' | 'expense' | 'recurring' | 'receivable' | 'loan' | null
          category: string | null
          description: string | null
          date: string | null
          status: 'pending' | 'needs_review' | 'confirmed' | 'rejected'
          review_flags: Json | null
          raw_row: Json
          region_id: string | null
          block_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          import_id: string
          profile_id: string
          amount?: number | null
          type?: 'income' | 'expense' | 'recurring' | 'receivable' | 'loan' | null
          category?: string | null
          description?: string | null
          date?: string | null
          status?: 'pending' | 'needs_review' | 'confirmed' | 'rejected'
          review_flags?: Json | null
          raw_row: Json
          region_id?: string | null
          block_type?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'needs_review' | 'confirmed' | 'rejected'
          amount?: number | null
          type?: 'income' | 'expense' | 'recurring' | 'receivable' | 'loan' | null
          category?: string | null
          description?: string | null
          date?: string | null
          review_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'import_staging_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      import_metrics: {
        Row: {
          id: string
          import_id: string
          profile_id: string
          filename: string | null
          sheets_count: number | null
          regions_detected: number | null
          regions_by_type: Json | null
          transactions_extracted: number | null
          needs_review_count: number | null
          skipped_count: number | null
          receivables_count: number | null
          loans_count: number | null
          tokens_input: number | null
          tokens_output: number | null
          cost_usd: number | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          import_id: string
          profile_id: string
          filename?: string | null
          sheets_count?: number | null
          regions_detected?: number | null
          regions_by_type?: Json | null
          transactions_extracted?: number | null
          needs_review_count?: number | null
          skipped_count?: number | null
          receivables_count?: number | null
          loans_count?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          cost_usd?: number | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: Partial<{
          filename: string | null
        }>
        Relationships: [
          {
            foreignKeyName: 'import_metrics_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      activity_logs: {
        Row: {
          id: string
          profile_id: string
          clerk_user_id: string
          clerk_session_id: string | null
          event_type: ActivityEventType
          ip_address: string | null
          country: string | null
          city: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          clerk_user_id: string
          clerk_session_id?: string | null
          event_type: ActivityEventType
          ip_address?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          event_type?: ActivityEventType
          ip_address?: string | null
          country?: string | null
          city?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
