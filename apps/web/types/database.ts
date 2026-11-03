import type { CompanyProposalInteraction, FreelancerProblemInteraction } from "@/types/domain";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ProblemStatus = "draft" | "open" | "paused" | "closed";
type ProposalStatus = "draft" | "submitted" | "withdrawn";
type StoredProblemInteraction = Exclude<FreelancerProblemInteraction, "unseen">;
type StoredCompanyProposalInteraction = Exclude<CompanyProposalInteraction, "unseen">;

export type ChatMessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  client_id: string | null;
};

export type ChatConversationRow = {
  match_id: string;
  problem_title: string;
  counterpart_name: string | null;
  counterpart_role: "company" | "freelancer";
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender_is_me: boolean | null;
  unread_count: number;
};

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
      proposals: {
        Row: {
          id: string; problem_id: string; problem_title_snapshot: string; freelancer_id: string; status: ProposalStatus;
          diagnosis: string; solution: string; deliverables: string; timeline: string;
          price: number | null; currency: "PEN" | "USD"; recurring_costs: string;
          maintenance_warranty: string; related_experience: string; submitted_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "proposals_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "business_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_freelancer_id_fkey";
            columns: ["freelancer_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      freelancer_problem_interactions: {
        Row: {
          freelancer_id: string;
          problem_id: string;
          state: StoredProblemInteraction;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "freelancer_problem_interactions_freelancer_id_fkey";
            columns: ["freelancer_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "freelancer_problem_interactions_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "business_problems";
            referencedColumns: ["id"];
          },
        ];
      };
      company_proposal_interactions: {
        Row: {
          company_user_id: string;
          proposal_id: string;
          state: StoredCompanyProposalInteraction;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "company_proposal_interactions_company_user_id_fkey";
            columns: ["company_user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_proposal_interactions_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: ChatMessageRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_reads: {
        Row: { match_id: string; user_id: string; last_read_at: string | null; last_read_message_id: string | null };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "conversation_reads_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reads_last_read_message_id_fkey";
            columns: ["last_read_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          problem_id: string;
          proposal_id: string;
          company_user_id: string;
          freelancer_id: string;
          status: "matched";
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "matches_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "business_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: true;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_company_user_id_fkey";
            columns: ["company_user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_freelancer_id_fkey";
            columns: ["freelancer_id"];
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
      save_proposal_draft: { Args: { p_problem_id: string; p_data: Json }; Returns: string };
      submit_proposal: { Args: { p_proposal_id: string }; Returns: string };
      withdraw_proposal: { Args: { p_proposal_id: string }; Returns: string };
      set_problem_interaction: {
        Args: { p_problem_id: string; p_next: StoredProblemInteraction | null };
        Returns: StoredProblemInteraction | null;
      };
      list_my_problem_interactions: {
        Args: Record<string, never>;
        Returns: { problem_id: string; state: StoredProblemInteraction; updated_at: string }[];
      };
      list_problem_proposals: {
        Args: { p_problem_id: string };
        Returns: {
          id: string; problem_id: string; freelancer_id: string; freelancer_name: string | null;
          freelancer_slug: string | null; headline: string | null; diagnosis: string; solution: string;
          deliverables: string; timeline: string; price: number | null; currency: "PEN" | "USD";
          recurring_costs: string; maintenance_warranty: string; related_experience: string;
          submitted_at: string; my_state: StoredCompanyProposalInteraction | null; match_id: string | null;
        }[];
      };
      set_proposal_interaction: {
        Args: { p_proposal_id: string; p_next: CompanyProposalInteraction | null };
        Returns: StoredCompanyProposalInteraction | null;
      };
      send_message: {
        Args: { p_match_id: string; p_body: string; p_client_id?: string | null };
        Returns: ChatMessageRow;
      };
      list_conversations: { Args: Record<string, never>; Returns: ChatConversationRow[] };
      list_messages: {
        Args: { p_match_id: string; p_before?: string | null; p_limit?: number };
        Returns: ChatMessageRow[];
      };
      mark_conversation_read: { Args: { p_match_id: string }; Returns: undefined };
      unread_total: { Args: Record<string, never>; Returns: number };
      list_my_matches: {
        Args: Record<string, never>;
        Returns: {
          match_id: string; problem_id: string; proposal_id: string; counterpart_name: string | null;
          problem_title: string; created_at: string;
        }[];
      };
    };
    Enums: {
      user_role: "company" | "freelancer";
      business_problem_status: ProblemStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
