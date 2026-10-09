export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProblemStatus = "draft" | "open" | "paused" | "closed";

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: { id: string; full_name: string; role: "company" | "freelancer"; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      company_profiles: {
        Row: { user_id: string; company_name: string; industry: string; country_code: string; created_at: string; updated_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      business_problems: {
        Row: {
          id: string; company_user_id: string; status: ProblemStatus; current_step: number; title: string; description: string;
          impacts: string[]; industry_snapshot: string; locations_count: number | null; people_affected: number | null;
          current_process: string; current_tools: string; special_conditions: string; objectives: string[];
          success_criteria: string; budget_choice: string; currency: string; deadline_choice: string;
          show_company_name: boolean; reviewed_and_consented: boolean; created_at: string; updated_at: string;
          published_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_company_profile: { Args: Record<string, never>; Returns: Json };
      save_company_profile: { Args: { p_profile: Json }; Returns: Json };
      get_my_company_problems: { Args: Record<string, never>; Returns: Json };
      get_my_company_problem: { Args: { p_problem_id: string }; Returns: Json };
      list_open_business_problems: { Args: Record<string, never>; Returns: Json };
      save_business_problem_draft: { Args: { p_problem_id: string | null; p_data: Json }; Returns: string };
      publish_business_problem: { Args: { p_problem_id: string }; Returns: string };
      begin_business_problem_edit: { Args: { p_problem_id: string }; Returns: string };
      transition_business_problem: { Args: { p_problem_id: string; p_action: string }; Returns: string };
    };
    Enums: {
      user_role: "company" | "freelancer";
      business_problem_status: ProblemStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
