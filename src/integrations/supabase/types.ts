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
      case_timeline: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          event_type: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          event_type: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      client_payment_details: {
        Row: {
          created_at: string
          customer_id: string
          details: Json
          id: string
          is_active: boolean
          method: Database["public"]["Enums"]["payment_method"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          details?: Json
          id?: string
          is_active?: boolean
          method: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          details?: Json
          id?: string
          is_active?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_balances: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          customer_id: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          customer_id: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          customer_id?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          updated_at: string | null
          visible_to_client: boolean | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          updated_at?: string | null
          visible_to_client?: boolean | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          platform: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          platform?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          platform?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_validation_logs: {
        Row: {
          action: string
          created_at: string
          email: string | null
          id: string
          ipv4_address: string | null
          ipv6_address: string | null
          matched_rule_id: string | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          email?: string | null
          id?: string
          ipv4_address?: string | null
          ipv6_address?: string | null
          matched_rule_id?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          email?: string | null
          id?: string
          ipv4_address?: string | null
          ipv6_address?: string | null
          matched_rule_id?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_validation_logs_matched_rule_id_fkey"
            columns: ["matched_rule_id"]
            isOneToOne: false
            referencedRelation: "ip_whitelist"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_whitelist: {
        Row: {
          action: Database["public"]["Enums"]["ip_action"]
          created_at: string | null
          group_id: string | null
          id: string
          ip_address: string
          ip_version: string
          subject: string
          user_id: string | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["ip_action"]
          created_at?: string | null
          group_id?: string | null
          id?: string
          ip_address: string
          ip_version?: string
          subject?: string
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["ip_action"]
          created_at?: string | null
          group_id?: string | null
          id?: string
          ip_address?: string
          ip_version?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_whitelist_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          new_password_hash: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_by: string
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_password_hash: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_by: string
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_password_hash?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_by?: string
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          crypto_id: string
          crypto_name: string
          crypto_symbol: string
          id: string
          purchase_date: string | null
          purchase_price: number
          quantity: number
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          crypto_id: string
          crypto_name: string
          crypto_symbol: string
          id?: string
          purchase_date?: string | null
          purchase_price: number
          quantity: number
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          crypto_id?: string
          crypto_name?: string
          crypto_symbol?: string
          id?: string
          purchase_date?: string | null
          purchase_price?: number
          quantity?: number
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_to: string | null
          birthdate: string | null
          case_number: string | null
          case_phase: string | null
          created_at: string | null
          created_by: string | null
          display_currency: string
          display_email: string | null
          email: string | null
          first_name: string | null
          group_id: string | null
          id: string
          is_archived: boolean
          is_super: boolean | null
          last_login: string | null
          last_name: string | null
          phone: string | null
          platform: string | null
          preferred_currency: string | null
          recovery_completed_at: string | null
          recovery_result_details: Json
          recovery_result_type: string | null
          recovery_search_duration_minutes: number
          recovery_search_scope: string
          recovery_search_started_at: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          subscription: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          assigned_to?: string | null
          birthdate?: string | null
          case_number?: string | null
          case_phase?: string | null
          created_at?: string | null
          created_by?: string | null
          display_currency?: string
          display_email?: string | null
          email?: string | null
          first_name?: string | null
          group_id?: string | null
          id: string
          is_archived?: boolean
          is_super?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          platform?: string | null
          preferred_currency?: string | null
          recovery_completed_at?: string | null
          recovery_result_details?: Json
          recovery_result_type?: string | null
          recovery_search_duration_minutes?: number
          recovery_search_scope?: string
          recovery_search_started_at?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          assigned_to?: string | null
          birthdate?: string | null
          case_number?: string | null
          case_phase?: string | null
          created_at?: string | null
          created_by?: string | null
          display_currency?: string
          display_email?: string | null
          email?: string | null
          first_name?: string | null
          group_id?: string | null
          id?: string
          is_archived?: boolean
          is_super?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          platform?: string | null
          preferred_currency?: string | null
          recovery_completed_at?: string | null
          recovery_result_details?: Json
          recovery_result_type?: string | null
          recovery_search_duration_minutes?: number
          recovery_search_scope?: string
          recovery_search_started_at?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          subscription?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      promocodes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          role_type: Database["public"]["Enums"]["app_role"]
          times_used: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          role_type?: Database["public"]["Enums"]["app_role"]
          times_used?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          role_type?: Database["public"]["Enums"]["app_role"]
          times_used?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promocodes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_requests: {
        Row: {
          amount: number
          balance_applied_at: string | null
          created_at: string | null
          crypto_id: string | null
          crypto_name: string | null
          crypto_symbol: string | null
          currency: string
          customer_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_details: Json | null
          payment_instructions_snapshot: Json | null
          processed_at: string | null
          processed_by: string | null
          quantity: number | null
          review_message: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price: number | null
        }
        Insert: {
          amount: number
          balance_applied_at?: string | null
          created_at?: string | null
          crypto_id?: string | null
          crypto_name?: string | null
          crypto_symbol?: string | null
          currency?: string
          customer_id: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_details?: Json | null
          payment_instructions_snapshot?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          quantity?: number | null
          review_message?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
        }
        Update: {
          amount?: number
          balance_applied_at?: string | null
          created_at?: string | null
          crypto_id?: string | null
          crypto_name?: string | null
          crypto_symbol?: string | null
          currency?: string
          customer_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_details?: Json | null
          payment_instructions_snapshot?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          quantity?: number | null
          review_message?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          unit_price?: number | null
        }
        Relationships: []
      }
      user_mfa: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean
          totp_secret: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          totp_secret: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          totp_secret?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
          access_token: string | null
          id: string
          is_active: boolean | null
          login_ip: string | null
          login_time: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          id?: string
          is_active?: boolean | null
          login_ip?: string | null
          login_time?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          id?: string
          is_active?: boolean | null
          login_ip?: string | null
          login_time?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          created_at: string | null
          crypto_id: string
          crypto_name: string
          crypto_symbol: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crypto_id: string
          crypto_name: string
          crypto_symbol: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          crypto_id?: string
          crypto_name?: string
          crypto_symbol?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_group: { Args: { _user_id: string }; Returns: string }
      get_user_platform: { Args: { _user_id: string }; Returns: string }
      get_user_platform_self: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_sessions_for_staff: {
        Args: { target_user_id: string }
        Returns: {
          access_token: string
          id: string
          is_active: boolean
          login_ip: string
          login_time: string
          user_agent: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_same_group: {
        Args: { _user_id_1: string; _user_id_2: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "agent" | "user" | "group_admin"
      ip_action: "ALLOW" | "DENY"
      payment_method:
        | "crypto_wallet"
        | "wire_transfer"
        | "credit_card"
        | "bank_transfer"
      transaction_status: "pending" | "approved" | "rejected" | "processing"
      transaction_type: "deposit" | "withdraw"
      user_status: "active" | "inactive" | "suspended" | "invalid_language"
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
      app_role: ["admin", "supervisor", "agent", "user", "group_admin"],
      ip_action: ["ALLOW", "DENY"],
      payment_method: [
        "crypto_wallet",
        "wire_transfer",
        "credit_card",
        "bank_transfer",
      ],
      transaction_status: ["pending", "approved", "rejected", "processing"],
      transaction_type: ["deposit", "withdraw"],
      user_status: ["active", "inactive", "suspended", "invalid_language"],
    },
  },
} as const
