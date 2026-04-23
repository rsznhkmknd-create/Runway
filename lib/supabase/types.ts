export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          // Onboarding
          industry?: string | null
          country?: string | null
          employee_count?: string | null
          business_type?: string | null
          website?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean
          // Company profile
          tax_id?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          company_name?: string | null
          currency?: string
          // Onboarding
          industry?: string | null
          country?: string | null
          employee_count?: string | null
          business_type?: string | null
          website?: string | null
          main_goal?: string | null
          onboarding_completed?: boolean
          // Company profile
          tax_id?: string | null
          address?: string | null
          city?: string | null
          logo_url?: string | null
          avatar_url?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
