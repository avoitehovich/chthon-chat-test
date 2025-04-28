export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          image: string | null
          tier: string
          tier_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          image?: string | null
          tier?: string
          tier_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          image?: string | null
          tier?: string
          tier_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics: {
        Row: {
          id: string
          user_id: string | null
          provider: string
          type: string
          timestamp: string
          cost: number
          tokens: number
          processing_time: number
          success: boolean
          error: string | null
          user_tier: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          provider: string
          type: string
          timestamp?: string
          cost?: number
          tokens?: number
          processing_time?: number
          success?: boolean
          error?: string | null
          user_tier?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          provider?: string
          type?: string
          timestamp?: string
          cost?: number
          tokens?: number
          processing_time?: number
          success?: boolean
          error?: string | null
          user_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          name: string
          last_updated: string
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          last_updated?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          image_url: string | null
          timestamp: string
        }
        Insert: {
          id: string
          session_id: string
          role: string
          content: string
          image_url?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: string
          content?: string
          image_url?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          id: string
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id: string
          settings: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_settings_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exec_sql: {
        Args: {
          sql: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
