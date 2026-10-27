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
      profiles: {
        Row: {
          id: string;
          account_type: "company" | "freelancer";
          display_name: string;
          slug: string;
          avatar_path: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "profiles_app_user_role_fkey";
            columns: ["id", "account_type"];
            isOneToOne: true;
            referencedRelation: "app_users";
            referencedColumns: ["id", "role"];
          },
        ];
      };
      freelancer_profiles: {
        Row: {
          user_id: string;
          headline: string | null;
          bio: string | null;
          location_text: string | null;
          years_experience: number | null;
          website_url: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          availability_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          headline?: string | null;
          bio?: string | null;
          location_text?: string | null;
          years_experience?: number | null;
          website_url?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          availability_status?: string | null;
        };
        Update: {
          headline?: string | null;
          bio?: string | null;
          location_text?: string | null;
          years_experience?: number | null;
          website_url?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          availability_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "freelancer_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_profiles: {
        Row: {
          user_id: string;
          company_name: string;
          industry: string;
          country_code: string;
          description: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "company_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      freelancer_skills: {
        Row: {
          id: string;
          freelancer_user_id: string;
          skill_id: string | null;
          custom_name: string | null;
          created_at: string;
        };
        Insert: {
          freelancer_user_id: string;
          skill_id?: string | null;
          custom_name?: string | null;
        };
        Update: {
          skill_id?: string | null;
          custom_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "freelancer_skills_freelancer_user_id_fkey";
            columns: ["freelancer_user_id"];
            isOneToOne: false;
            referencedRelation: "freelancer_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "freelancer_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_projects: {
        Row: {
          id: string;
          freelancer_user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          project_period: string | null;
          external_url: string | null;
          skills_used: string[];
          cover_image_path: string | null;
          sort_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          freelancer_user_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          project_period?: string | null;
          external_url?: string | null;
          skills_used?: string[];
          cover_image_path?: string | null;
          sort_order?: number;
          is_published?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string | null;
          project_period?: string | null;
          external_url?: string | null;
          skills_used?: string[];
          cover_image_path?: string | null;
          sort_order?: number;
          is_published?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_freelancer_user_id_fkey";
            columns: ["freelancer_user_id"];
            isOneToOne: false;
            referencedRelation: "freelancer_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      portfolio_media: {
        Row: {
          id: string;
          project_id: string;
          storage_path: string;
          alt_text: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          project_id: string;
          storage_path: string;
          alt_text?: string;
          sort_order?: number;
        };
        Update: {
          alt_text?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "portfolio_projects";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "business_problems_company_user_id_fkey";
            columns: ["company_user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_my_profile: { Args: Record<string, never>; Returns: Json };
      save_my_profile: { Args: { p_profile: Json }; Returns: Json };
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
