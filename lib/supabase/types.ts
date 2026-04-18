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
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          company_name?: string | null
          currency?: string
          updated_at?: string
        }
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
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
