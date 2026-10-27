export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      aggregate_metrics: {
        Row: {
          dims: NonNullable<Json>;
          id: number;
          jurisdiction_id: string;
          metric: string;
          publication_id: string | null;
          published: boolean;
          run_id: string | null;
          suppressed: boolean;
          value: number | null;
        };
        ComputedFields: never;
        Insert: {
          dims?: NonNullable<Json>;
          id?: never;
          jurisdiction_id: string;
          metric: string;
          publication_id?: string | null;
          published?: boolean;
          run_id?: string | null;
          suppressed?: boolean;
          value?: number | null;
        };
        Update: {
          dims?: NonNullable<Json>;
          id?: never;
          jurisdiction_id?: string;
          metric?: string;
          publication_id?: string | null;
          published?: boolean;
          run_id?: string | null;
          suppressed?: boolean;
          value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'aggregate_metrics_jurisdiction_id_fkey';
            columns: ['jurisdiction_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aggregate_metrics_publication_id_fkey';
            columns: ['publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'aggregate_metrics_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'audit_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      anomaly_findings: {
        Row: {
          created_at: string;
          finding: NonNullable<Json>;
          finding_code: string;
          id: string;
          jurisdiction_id: string;
          label: Database['public']['Enums']['content_label'];
          published: boolean;
          restricted_evidence_path: string | null;
          review_status: Database['public']['Enums']['review_decision'];
          rule_id: string;
          rule_version: string;
          run_id: string;
          signal_strength: Database['public']['Enums']['signal_strength'];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          finding: NonNullable<Json>;
          finding_code: string;
          id?: string;
          jurisdiction_id: string;
          label?: Database['public']['Enums']['content_label'];
          published?: boolean;
          restricted_evidence_path?: string | null;
          review_status?: Database['public']['Enums']['review_decision'];
          rule_id: string;
          rule_version: string;
          run_id: string;
          signal_strength: Database['public']['Enums']['signal_strength'];
        };
        Update: {
          created_at?: string;
          finding?: NonNullable<Json>;
          finding_code?: string;
          id?: string;
          jurisdiction_id?: string;
          label?: Database['public']['Enums']['content_label'];
          published?: boolean;
          restricted_evidence_path?: string | null;
          review_status?: Database['public']['Enums']['review_decision'];
          rule_id?: string;
          rule_version?: string;
          run_id?: string;
          signal_strength?: Database['public']['Enums']['signal_strength'];
        };
        Relationships: [
          {
            foreignKeyName: 'anomaly_findings_jurisdiction_id_fkey';
            columns: ['jurisdiction_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'anomaly_findings_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'audit_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_roles: string[];
          at: string;
          details: NonNullable<Json>;
          id: number;
          reason: string | null;
          target_id: string | null;
          target_type: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_roles?: string[];
          at?: string;
          details?: NonNullable<Json>;
          id?: never;
          reason?: string | null;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_roles?: string[];
          at?: string;
          details?: NonNullable<Json>;
          id?: never;
          reason?: string | null;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      audit_runs: {
        Row: {
          baseline_version_id: string;
          created_at: string;
          created_by: string;
          engine_version: string | null;
          error: string | null;
          finished_at: string | null;
          id: string;
          image_digest: string | null;
          input_roots: Json | null;
          methodology_version: string;
          output_hash: string | null;
          params_hash: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['run_status'];
          target_version_id: string;
          tests_in_run: Json | null;
        };
        ComputedFields: never;
        Insert: {
          baseline_version_id: string;
          created_at?: string;
          created_by: string;
          engine_version?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          image_digest?: string | null;
          input_roots?: Json | null;
          methodology_version: string;
          output_hash?: string | null;
          params_hash?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['run_status'];
          target_version_id: string;
          tests_in_run?: Json | null;
        };
        Update: {
          baseline_version_id?: string;
          created_at?: string;
          created_by?: string;
          engine_version?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          image_digest?: string | null;
          input_roots?: Json | null;
          methodology_version?: string;
          output_hash?: string | null;
          params_hash?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['run_status'];
          target_version_id?: string;
          tests_in_run?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_runs_baseline_version_id_fkey';
            columns: ['baseline_version_id'];
            isOneToOne: false;
            referencedRelation: 'dataset_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_runs_methodology_version_fkey';
            columns: ['methodology_version'];
            isOneToOne: false;
            referencedRelation: 'methodology_versions';
            referencedColumns: ['version'];
          },
          {
            foreignKeyName: 'audit_runs_target_version_id_fkey';
            columns: ['target_version_id'];
            isOneToOne: false;
            referencedRelation: 'dataset_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      blockchain_anchors: {
        Row: {
          anchor_type: Database['public']['Enums']['anchor_type'];
          block_number: number | null;
          chain_id: number | null;
          confirmed_at: string | null;
          contract_address: string | null;
          created_at: string;
          id: string;
          last_error: string | null;
          log_index: number | null;
          network: string;
          ots_path: string | null;
          publication_id: string;
          status: Database['public']['Enums']['anchor_status'];
          tx_hash: string | null;
        };
        ComputedFields: never;
        Insert: {
          anchor_type: Database['public']['Enums']['anchor_type'];
          block_number?: number | null;
          chain_id?: number | null;
          confirmed_at?: string | null;
          contract_address?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          log_index?: number | null;
          network: string;
          ots_path?: string | null;
          publication_id: string;
          status?: Database['public']['Enums']['anchor_status'];
          tx_hash?: string | null;
        };
        Update: {
          anchor_type?: Database['public']['Enums']['anchor_type'];
          block_number?: number | null;
          chain_id?: number | null;
          confirmed_at?: string | null;
          contract_address?: string | null;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          log_index?: number | null;
          network?: string;
          ots_path?: string | null;
          publication_id?: string;
          status?: Database['public']['Enums']['anchor_status'];
          tx_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'blockchain_anchors_publication_id_fkey';
            columns: ['publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
        ];
      };
      claim_assessments: {
        Row: {
          assessed_by: string | null;
          claim_id: string;
          created_at: string;
          evidence: NonNullable<Json>;
          explanation: NonNullable<Json>;
          id: string;
          method_version: string;
          publication_id: string | null;
          verdict: Database['public']['Enums']['claim_verdict'];
        };
        ComputedFields: never;
        Insert: {
          assessed_by?: string | null;
          claim_id: string;
          created_at?: string;
          evidence: NonNullable<Json>;
          explanation: NonNullable<Json>;
          id?: string;
          method_version: string;
          publication_id?: string | null;
          verdict: Database['public']['Enums']['claim_verdict'];
        };
        Update: {
          assessed_by?: string | null;
          claim_id?: string;
          created_at?: string;
          evidence?: NonNullable<Json>;
          explanation?: NonNullable<Json>;
          id?: string;
          method_version?: string;
          publication_id?: string | null;
          verdict?: Database['public']['Enums']['claim_verdict'];
        };
        Relationships: [
          {
            foreignKeyName: 'claim_assessments_claim_id_fkey';
            columns: ['claim_id'];
            isOneToOne: false;
            referencedRelation: 'claim_submissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'claim_assessments_publication_id_fkey';
            columns: ['publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
        ];
      };
      claim_submissions: {
        Row: {
          created_at: string;
          id: string;
          ip_hash: string | null;
          language: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_reason: string | null;
          status: Database['public']['Enums']['claim_status'];
          structured: NonNullable<Json>;
          submitter_id: string | null;
          text: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          language: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          structured: NonNullable<Json>;
          submitter_id?: string | null;
          text?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          language?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_reason?: string | null;
          status?: Database['public']['Enums']['claim_status'];
          structured?: NonNullable<Json>;
          submitter_id?: string | null;
          text?: string | null;
        };
        Relationships: [];
      };
      data_sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_public: boolean;
          is_synthetic: boolean;
          licence_note: string | null;
          name: string;
          permission_basis: Database['public']['Enums']['permission_basis'];
          publisher: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_public?: boolean;
          is_synthetic?: boolean;
          licence_note?: string | null;
          name: string;
          permission_basis: Database['public']['Enums']['permission_basis'];
          publisher: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_public?: boolean;
          is_synthetic?: boolean;
          licence_note?: string | null;
          name?: string;
          permission_basis?: Database['public']['Enums']['permission_basis'];
          publisher?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      dataset_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          canonical_path: string | null;
          canonical_root: string | null;
          created_at: string;
          id: string;
          ingestion_report: Json | null;
          is_public: boolean;
          is_synthetic: boolean;
          jurisdiction_id: string;
          kind: Database['public']['Enums']['dataset_kind'];
          label: string;
          original_path: string | null;
          original_sha256: string | null;
          qualifying_date: string | null;
          roll_stage: string | null;
          row_count: number | null;
          salt_path: string | null;
          schema_version: string;
          source_id: string;
          status: Database['public']['Enums']['dataset_status'];
          updated_at: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          canonical_path?: string | null;
          canonical_root?: string | null;
          created_at?: string;
          id?: string;
          ingestion_report?: Json | null;
          is_public?: boolean;
          is_synthetic?: boolean;
          jurisdiction_id: string;
          kind: Database['public']['Enums']['dataset_kind'];
          label: string;
          original_path?: string | null;
          original_sha256?: string | null;
          qualifying_date?: string | null;
          roll_stage?: string | null;
          row_count?: number | null;
          salt_path?: string | null;
          schema_version: string;
          source_id: string;
          status?: Database['public']['Enums']['dataset_status'];
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          canonical_path?: string | null;
          canonical_root?: string | null;
          created_at?: string;
          id?: string;
          ingestion_report?: Json | null;
          is_public?: boolean;
          is_synthetic?: boolean;
          jurisdiction_id?: string;
          kind?: Database['public']['Enums']['dataset_kind'];
          label?: string;
          original_path?: string | null;
          original_sha256?: string | null;
          qualifying_date?: string | null;
          roll_stage?: string | null;
          row_count?: number | null;
          salt_path?: string | null;
          schema_version?: string;
          source_id?: string;
          status?: Database['public']['Enums']['dataset_status'];
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dataset_versions_jurisdiction_id_fkey';
            columns: ['jurisdiction_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dataset_versions_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'data_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      demo_voter_cards: {
        Row: {
          birth_year: number | null;
          card_code: string;
          card_number: string;
          created_at: string;
          failed_attempts: number;
          gender: string | null;
          holder_name: string;
          id: string;
          is_synthetic: boolean;
          locked_until: string | null;
          part_number: number | null;
          participation: NonNullable<Json>;
          pin_hash: string;
          polling_station_id: string;
          serial_number: number | null;
        };
        ComputedFields: never;
        Insert: {
          birth_year?: number | null;
          card_code: string;
          card_number: string;
          created_at?: string;
          failed_attempts?: number;
          gender?: string | null;
          holder_name: string;
          id?: string;
          is_synthetic?: boolean;
          locked_until?: string | null;
          part_number?: number | null;
          participation?: NonNullable<Json>;
          pin_hash: string;
          polling_station_id: string;
          serial_number?: number | null;
        };
        Update: {
          birth_year?: number | null;
          card_code?: string;
          card_number?: string;
          created_at?: string;
          failed_attempts?: number;
          gender?: string | null;
          holder_name?: string;
          id?: string;
          is_synthetic?: boolean;
          locked_until?: string | null;
          part_number?: number | null;
          participation?: NonNullable<Json>;
          pin_hash?: string;
          polling_station_id?: string;
          serial_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'demo_voter_cards_polling_station_id_fkey';
            columns: ['polling_station_id'];
            isOneToOne: false;
            referencedRelation: 'polling_stations';
            referencedColumns: ['id'];
          },
        ];
      };
      finding_reviews: {
        Row: {
          created_at: string;
          decision: Database['public']['Enums']['review_decision'];
          finding_id: string;
          id: string;
          reason: string | null;
          reviewer_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decision: Database['public']['Enums']['review_decision'];
          finding_id: string;
          id?: string;
          reason?: string | null;
          reviewer_id: string;
        };
        Update: {
          created_at?: string;
          decision?: Database['public']['Enums']['review_decision'];
          finding_id?: string;
          id?: string;
          reason?: string | null;
          reviewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'finding_reviews_finding_id_fkey';
            columns: ['finding_id'];
            isOneToOne: false;
            referencedRelation: 'anomaly_findings';
            referencedColumns: ['id'];
          },
        ];
      };
      incident_records: {
        Row: {
          closed_at: string | null;
          created_by: string | null;
          id: string;
          opened_at: string;
          public_note: string | null;
          severity: string;
          status: string;
          summary: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          created_by?: string | null;
          id?: string;
          opened_at?: string;
          public_note?: string | null;
          severity: string;
          status?: string;
          summary: string;
          title: string;
        };
        Update: {
          closed_at?: string | null;
          created_by?: string | null;
          id?: string;
          opened_at?: string;
          public_note?: string | null;
          severity?: string;
          status?: string;
          summary?: string;
          title?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          attempts: number;
          created_at: string;
          created_by: string | null;
          id: string;
          input_hash: string;
          kind: Database['public']['Enums']['job_kind'];
          last_error: string | null;
          locked_by: string | null;
          locked_until: string | null;
          max_attempts: number;
          payload: NonNullable<Json>;
          result: Json | null;
          run_after: string;
          status: Database['public']['Enums']['job_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          input_hash: string;
          kind: Database['public']['Enums']['job_kind'];
          last_error?: string | null;
          locked_by?: string | null;
          locked_until?: string | null;
          max_attempts?: number;
          payload: NonNullable<Json>;
          result?: Json | null;
          run_after?: string;
          status?: Database['public']['Enums']['job_status'];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          input_hash?: string;
          kind?: Database['public']['Enums']['job_kind'];
          last_error?: string | null;
          locked_by?: string | null;
          locked_until?: string | null;
          max_attempts?: number;
          payload?: NonNullable<Json>;
          result?: Json | null;
          run_after?: string;
          status?: Database['public']['Enums']['job_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
      jurisdictions: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          introduced_in: string | null;
          is_synthetic: boolean;
          level: Database['public']['Enums']['jurisdiction_level'];
          name: NonNullable<Json>;
          parent_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          introduced_in?: string | null;
          is_synthetic?: boolean;
          level: Database['public']['Enums']['jurisdiction_level'];
          name: NonNullable<Json>;
          parent_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          introduced_in?: string | null;
          is_synthetic?: boolean;
          level?: Database['public']['Enums']['jurisdiction_level'];
          name?: NonNullable<Json>;
          parent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jurisdictions_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
        ];
      };
      methodology_versions: {
        Row: {
          created_at: string;
          created_by: string | null;
          frozen_at: string | null;
          notes: string | null;
          params: NonNullable<Json>;
          params_hash: string;
          published_at: string | null;
          status: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          frozen_at?: string | null;
          notes?: string | null;
          params: NonNullable<Json>;
          params_hash: string;
          published_at?: string | null;
          status?: string;
          version: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          frozen_at?: string | null;
          notes?: string | null;
          params?: NonNullable<Json>;
          params_hash?: string;
          published_at?: string | null;
          status?: string;
          version?: string;
        };
        Relationships: [];
      };
      polling_stations: {
        Row: {
          ac_id: string;
          accessibility: NonNullable<Json>;
          address: NonNullable<Json>;
          created_at: string;
          dataset_version_id: string | null;
          id: string;
          is_synthetic: boolean;
          lat: number | null;
          lng: number | null;
          name: NonNullable<Json>;
          parts_served: number[];
          public_code: string;
          published: boolean;
          source_url: string | null;
          station_code: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          ac_id: string;
          accessibility?: NonNullable<Json>;
          address: NonNullable<Json>;
          created_at?: string;
          dataset_version_id?: string | null;
          id?: string;
          is_synthetic?: boolean;
          lat?: number | null;
          lng?: number | null;
          name: NonNullable<Json>;
          parts_served: number[];
          public_code: string;
          published?: boolean;
          source_url?: string | null;
          station_code: string;
          verified_at?: string | null;
        };
        Update: {
          ac_id?: string;
          accessibility?: NonNullable<Json>;
          address?: NonNullable<Json>;
          created_at?: string;
          dataset_version_id?: string | null;
          id?: string;
          is_synthetic?: boolean;
          lat?: number | null;
          lng?: number | null;
          name?: NonNullable<Json>;
          parts_served?: number[];
          public_code?: string;
          published?: boolean;
          source_url?: string | null;
          station_code?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'polling_stations_ac_id_fkey';
            columns: ['ac_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'polling_stations_dataset_version_id_fkey';
            columns: ['dataset_version_id'];
            isOneToOne: false;
            referencedRelation: 'dataset_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          notify_email: boolean;
          preferred_language: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          notify_email?: boolean;
          preferred_language?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          notify_email?: boolean;
          preferred_language?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      publication_approvals: {
        Row: {
          approver_id: string;
          created_at: string;
          decision: string;
          id: string;
          manifest_hash: string;
          publication_id: string;
          reason: string | null;
          step: Database['public']['Enums']['approval_step'];
        };
        ComputedFields: never;
        Insert: {
          approver_id: string;
          created_at?: string;
          decision: string;
          id?: string;
          manifest_hash: string;
          publication_id: string;
          reason?: string | null;
          step: Database['public']['Enums']['approval_step'];
        };
        Update: {
          approver_id?: string;
          created_at?: string;
          decision?: string;
          id?: string;
          manifest_hash?: string;
          publication_id?: string;
          reason?: string | null;
          step?: Database['public']['Enums']['approval_step'];
        };
        Relationships: [
          {
            foreignKeyName: 'publication_approvals_publication_id_fkey';
            columns: ['publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
        ];
      };
      publications: {
        Row: {
          aggregates_hash: string | null;
          aggregates_path: string | null;
          approved_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          is_synthetic: boolean;
          manifest: Json | null;
          manifest_hash: string | null;
          previous_publication_id: string | null;
          published_at: string | null;
          report_hash: string | null;
          report_path: string | null;
          retracted_at: string | null;
          retraction_reason: string | null;
          run_id: string | null;
          sequence: number;
          series_id: string;
          status: Database['public']['Enums']['publication_status'];
          submitted_at: string | null;
          supersedes_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aggregates_hash?: string | null;
          aggregates_path?: string | null;
          approved_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          is_synthetic?: boolean;
          manifest?: Json | null;
          manifest_hash?: string | null;
          previous_publication_id?: string | null;
          published_at?: string | null;
          report_hash?: string | null;
          report_path?: string | null;
          retracted_at?: string | null;
          retraction_reason?: string | null;
          run_id?: string | null;
          sequence: number;
          series_id: string;
          status?: Database['public']['Enums']['publication_status'];
          submitted_at?: string | null;
          supersedes_id?: string | null;
          updated_at?: string;
        };
        Update: {
          aggregates_hash?: string | null;
          aggregates_path?: string | null;
          approved_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_synthetic?: boolean;
          manifest?: Json | null;
          manifest_hash?: string | null;
          previous_publication_id?: string | null;
          published_at?: string | null;
          report_hash?: string | null;
          report_path?: string | null;
          retracted_at?: string | null;
          retraction_reason?: string | null;
          run_id?: string | null;
          sequence?: number;
          series_id?: string;
          status?: Database['public']['Enums']['publication_status'];
          submitted_at?: string | null;
          supersedes_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'publications_previous_publication_id_fkey';
            columns: ['previous_publication_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'publications_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'audit_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'publications_supersedes_id_fkey';
            columns: ['supersedes_id'];
            isOneToOne: false;
            referencedRelation: 'publications';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          item_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          item_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      security_events: {
        Row: {
          at: string;
          details: NonNullable<Json>;
          event_type: string;
          id: number;
          ip_hash: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          at?: string;
          details?: NonNullable<Json>;
          event_type: string;
          id?: never;
          ip_hash?: string | null;
          user_id?: string | null;
        };
        Update: {
          at?: string;
          details?: NonNullable<Json>;
          event_type?: string;
          id?: never;
          ip_hash?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      staff_assignments: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          jurisdiction_id: string | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          role: Database['public']['Enums']['staff_role'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          jurisdiction_id?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: Database['public']['Enums']['staff_role'];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          jurisdiction_id?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: Database['public']['Enums']['staff_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_assignments_jurisdiction_id_fkey';
            columns: ['jurisdiction_id'];
            isOneToOne: false;
            referencedRelation: 'jurisdictions';
            referencedColumns: ['id'];
          },
        ];
      };
      user_subscriptions: {
        Row: {
          created_at: string;
          id: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_dataset_version: { Args: { p_id: string }; Returns: undefined };
      approve_publication: {
        Args: {
          p_decision: string;
          p_id: string;
          p_manifest_hash: string;
          p_reason: string;
          p_step: Database['public']['Enums']['approval_step'];
        };
        Returns: Database['public']['Enums']['publication_status'];
      };
      claim_next_job: {
        Args: {
          p_kinds: Database['public']['Enums']['job_kind'][];
          p_lease_seconds?: number;
          p_worker: string;
        };
        Returns: {
          attempts: number;
          created_at: string;
          created_by: string | null;
          id: string;
          input_hash: string;
          kind: Database['public']['Enums']['job_kind'];
          last_error: string | null;
          locked_by: string | null;
          locked_until: string | null;
          max_attempts: number;
          payload: NonNullable<Json>;
          result: Json | null;
          run_after: string;
          status: Database['public']['Enums']['job_status'];
          updated_at: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'jobs';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      complete_ingestion: {
        Args: {
          p_canonical_path: string;
          p_id: string;
          p_original_sha256: string;
          p_report: Json;
          p_root: string;
          p_row_count: number;
          p_salt_path: string;
          p_valid: boolean;
        };
        Returns: undefined;
      };
      complete_job: {
        Args: { p_id: string; p_result: Json; p_worker: string };
        Returns: undefined;
      };
      complete_run: {
        Args: {
          p_error: string;
          p_input_roots: Json;
          p_ok: boolean;
          p_output_hash: string;
          p_run: string;
          p_tests: Json;
        };
        Returns: undefined;
      };
      create_data_source: {
        Args: {
          p_basis: Database['public']['Enums']['permission_basis'];
          p_is_synthetic: boolean;
          p_licence_note: string;
          p_name: string;
          p_publisher: string;
          p_url: string;
        };
        Returns: string;
      };
      create_dataset_version: {
        Args: {
          p_jurisdiction: string;
          p_kind: Database['public']['Enums']['dataset_kind'];
          p_label: string;
          p_qualifying_date: string;
          p_source: string;
          p_stage: string;
        };
        Returns: string;
      };
      create_methodology_draft: {
        Args: { p_notes: string; p_params: Json; p_params_hash: string; p_version: string };
        Returns: undefined;
      };
      create_publication: { Args: { p_run: string }; Returns: string };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      delete_own_unpublished_claims: { Args: Record<PropertyKey, never>; Returns: number };
      demo_voter_card: {
        Args: { p_code: string };
        Returns: {
          booth_code: string;
          card_number: string;
          holder_name: string;
          is_synthetic: boolean;
          part_number: number;
          serial_number: number;
        }[];
      };
      demo_voter_history: { Args: { p_code: string; p_pin: string }; Returns: Json };
      fail_job: {
        Args: { p_error: string; p_id: string; p_worker: string };
        Returns: Database['public']['Enums']['job_status'];
      };
      freeze_methodology: { Args: { p_version: string }; Returns: undefined };
      grant_role: {
        Args: {
          p_jurisdiction: string;
          p_role: Database['public']['Enums']['staff_role'];
          p_user: string;
        };
        Returns: string;
      };
      mark_dataset_uploaded: { Args: { p_id: string; p_original_path: string }; Returns: string };
      mark_published: {
        Args: {
          p_block: number;
          p_chain_id: number;
          p_contract: string;
          p_id: string;
          p_log_index: number;
          p_network: string;
          p_tx_hash: string;
        };
        Returns: undefined;
      };
      moderate_claim: {
        Args: { p_claim: string; p_publish: boolean; p_reason: string };
        Returns: undefined;
      };
      publish_methodology: { Args: { p_version: string }; Returns: undefined };
      request_audit_run: {
        Args: { p_baseline: string; p_methodology: string; p_target: string };
        Returns: string;
      };
      retract_publication: { Args: { p_id: string; p_reason: string }; Returns: undefined };
      review_finding: {
        Args: {
          p_decision: Database['public']['Enums']['review_decision'];
          p_finding: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      revoke_role: { Args: { p_assignment: string; p_reason: string }; Returns: undefined };
      start_run: { Args: { p_engine: string; p_image: string; p_run: string }; Returns: undefined };
      submit_claim: {
        Args: {
          p_evidence: Json;
          p_explanation: Json;
          p_for_moderation: boolean;
          p_ip_hash: string;
          p_language: string;
          p_method_version: string;
          p_publication: string;
          p_structured: Json;
          p_submitter: string;
          p_text: string;
          p_verdict: Database['public']['Enums']['claim_verdict'];
        };
        Returns: string;
      };
      submit_publication: {
        Args: {
          p_aggregates_hash: string;
          p_aggregates_path: string;
          p_id: string;
          p_manifest: Json;
          p_manifest_hash: string;
          p_report_hash: string;
          p_report_path: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      anchor_status: 'pending' | 'submitted' | 'confirmed' | 'upgraded' | 'failed';
      anchor_type: 'evm' | 'ots';
      approval_step: 'review' | 'publish';
      claim_status: 'checked' | 'in_moderation' | 'published' | 'rejected';
      claim_verdict: 'consistent' | 'contradicted' | 'disputed' | 'cannot_establish';
      content_label:
        'source_data' | 'analytical_finding' | 'user_claim' | 'unverified' | 'confirmed_correction';
      dataset_kind: 'electoral_roll' | 'polling_stations';
      dataset_status:
        'uploading' | 'validating' | 'quarantined' | 'validated' | 'approved' | 'superseded';
      job_kind:
        | 'ingest'
        | 'analyze'
        | 'publish_prepare'
        | 'ots_stamp'
        | 'ots_upgrade'
        | 'notify'
        | 'retention'
        | 'benchmark';
      job_status: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead';
      jurisdiction_level: 'state' | 'district' | 'ac' | 'part';
      permission_basis: 'synthetic' | 'public_official' | 'authorised';
      publication_status:
        'draft' | 'preparing' | 'in_review' | 'approved' | 'published' | 'retracted' | 'withdrawn';
      review_decision: 'pending' | 'accepted' | 'downgraded' | 'rejected';
      run_status: 'queued' | 'running' | 'ready_for_review' | 'failed' | 'superseded';
      signal_strength: 'strong' | 'moderate' | 'weak' | 'data_quality';
      staff_role:
        'sysadmin' | 'data_steward' | 'analyst' | 'reviewer' | 'publisher' | 'security_auditor';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      anchor_status: ['pending', 'submitted', 'confirmed', 'upgraded', 'failed'],
      anchor_type: ['evm', 'ots'],
      approval_step: ['review', 'publish'],
      claim_status: ['checked', 'in_moderation', 'published', 'rejected'],
      claim_verdict: ['consistent', 'contradicted', 'disputed', 'cannot_establish'],
      content_label: [
        'source_data',
        'analytical_finding',
        'user_claim',
        'unverified',
        'confirmed_correction',
      ],
      dataset_kind: ['electoral_roll', 'polling_stations'],
      dataset_status: [
        'uploading',
        'validating',
        'quarantined',
        'validated',
        'approved',
        'superseded',
      ],
      job_kind: [
        'ingest',
        'analyze',
        'publish_prepare',
        'ots_stamp',
        'ots_upgrade',
        'notify',
        'retention',
        'benchmark',
      ],
      job_status: ['queued', 'running', 'succeeded', 'failed', 'dead'],
      jurisdiction_level: ['state', 'district', 'ac', 'part'],
      permission_basis: ['synthetic', 'public_official', 'authorised'],
      publication_status: [
        'draft',
        'preparing',
        'in_review',
        'approved',
        'published',
        'retracted',
        'withdrawn',
      ],
      review_decision: ['pending', 'accepted', 'downgraded', 'rejected'],
      run_status: ['queued', 'running', 'ready_for_review', 'failed', 'superseded'],
      signal_strength: ['strong', 'moderate', 'weak', 'data_quality'],
      staff_role: [
        'sysadmin',
        'data_steward',
        'analyst',
        'reviewer',
        'publisher',
        'security_auditor',
      ],
    },
  },
} as const;
