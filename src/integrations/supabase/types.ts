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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: Database["public"]["Enums"]["app_role"]
          archived_at: string | null
          details: string
          entity_id: string | null
          entity_type: string
          id: string
          inserted_at: string
          occurred_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          actor_role: Database["public"]["Enums"]["app_role"]
          archived_at?: string | null
          details?: string
          entity_id?: string | null
          entity_type: string
          id: string
          inserted_at?: string
          occurred_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          actor_role?: Database["public"]["Enums"]["app_role"]
          archived_at?: string | null
          details?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          inserted_at?: string
          occurred_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      aircraft: {
        Row: {
          archived_at: string | null
          grounded: boolean
          hourly_rate: number
          id: string
          inserted_at: string
          last_service: string | null
          reg: string
          tach_hours: number
          tenant_id: string
          total_hours: number
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          grounded?: boolean
          hourly_rate?: number
          id: string
          inserted_at?: string
          last_service?: string | null
          reg: string
          tach_hours?: number
          tenant_id: string
          total_hours?: number
          type: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          grounded?: boolean
          hourly_rate?: number
          id?: string
          inserted_at?: string
          last_service?: string | null
          reg?: string
          tach_hours?: number
          tenant_id?: string
          total_hours?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aircraft_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          aircraft_id: string | null
          approval_status: string
          archived_at: string | null
          decision_notes: string | null
          ends_at: string
          id: string
          inserted_at: string
          instructor_id: string | null
          lesson_id: string | null
          notes: string | null
          requested_at: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          route: string | null
          starts_at: string
          status: string
          student_id: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          aircraft_id?: string | null
          approval_status?: string
          archived_at?: string | null
          decision_notes?: string | null
          ends_at: string
          id: string
          inserted_at?: string
          instructor_id?: string | null
          lesson_id?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          starts_at: string
          status?: string
          student_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          aircraft_id?: string | null
          approval_status?: string
          archived_at?: string | null
          decision_notes?: string | null
          ends_at?: string
          id?: string
          inserted_at?: string
          instructor_id?: string | null
          lesson_id?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route?: string | null
          starts_at?: string
          status?: string
          student_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_tenant_id_aircraft_id_fkey"
            columns: ["tenant_id", "aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          archived_at: string | null
          booking_id: string
          created_at: string
          details: string
          id: string
          inserted_at: string
          instructor_id: string | null
          notes: string | null
          proposed_end: string
          proposed_start: string
          reason: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          booking_id: string
          created_at?: string
          details?: string
          id: string
          inserted_at?: string
          instructor_id?: string | null
          notes?: string | null
          proposed_end: string
          proposed_start: string
          reason: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          booking_id?: string
          created_at?: string
          details?: string
          id?: string
          inserted_at?: string
          instructor_id?: string | null
          notes?: string | null
          proposed_end?: string
          proposed_start?: string
          reason?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          archived_at: string | null
          capacity: number
          id: string
          inserted_at: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          capacity: number
          id: string
          inserted_at?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          capacity?: number
          id?: string
          inserted_at?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      completions: {
        Row: {
          archived_at: string | null
          date: string
          flight_id: string | null
          grade: number | null
          id: string
          inserted_at: string
          instructor_id: string | null
          lesson_id: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          date: string
          flight_id?: string | null
          grade?: number | null
          id: string
          inserted_at?: string
          instructor_id?: string | null
          lesson_id: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          date?: string
          flight_id?: string | null
          grade?: number | null
          id?: string
          inserted_at?: string
          instructor_id?: string | null
          lesson_id?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_records: {
        Row: {
          archived_at: string | null
          ends_at: string | null
          id: string
          inserted_at: string
          instructor_id: string
          starts_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          ends_at?: string | null
          id: string
          inserted_at?: string
          instructor_id: string
          starts_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          ends_at?: string | null
          id?: string
          inserted_at?: string
          instructor_id?: string
          starts_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "duty_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          archived_at: string | null
          date: string
          id: string
          inserted_at: string
          passed: boolean
          score: number
          signed_by: string
          student_id: string
          subject_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          date: string
          id: string
          inserted_at?: string
          passed: boolean
          score: number
          signed_by: string
          student_id: string
          subject_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          date?: string
          id?: string
          inserted_at?: string
          passed?: boolean
          score?: number
          signed_by?: string
          student_id?: string
          subject_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          aircraft_id: string
          archived_at: string | null
          booking_id: string | null
          date: string
          from_icao: string
          grade: number | null
          id: string
          ifr_minutes: number | null
          inserted_at: string
          instructor_id: string | null
          kind: string | null
          landings: number
          lesson_id: string | null
          minutes: number
          night_landings: number | null
          off_block: string
          on_block: string
          pilot_id: string
          remarks: string | null
          tach_end: number | null
          tach_start: number | null
          tenant_id: string
          to_icao: string
          updated_at: string
        }
        Insert: {
          aircraft_id: string
          archived_at?: string | null
          booking_id?: string | null
          date: string
          from_icao: string
          grade?: number | null
          id: string
          ifr_minutes?: number | null
          inserted_at?: string
          instructor_id?: string | null
          kind?: string | null
          landings?: number
          lesson_id?: string | null
          minutes: number
          night_landings?: number | null
          off_block: string
          on_block: string
          pilot_id: string
          remarks?: string | null
          tach_end?: number | null
          tach_start?: number | null
          tenant_id: string
          to_icao: string
          updated_at?: string
        }
        Update: {
          aircraft_id?: string
          archived_at?: string | null
          booking_id?: string | null
          date?: string
          from_icao?: string
          grade?: number | null
          id?: string
          ifr_minutes?: number | null
          inserted_at?: string
          instructor_id?: string | null
          kind?: string | null
          landings?: number
          lesson_id?: string | null
          minutes?: number
          night_landings?: number | null
          off_block?: string
          on_block?: string
          pilot_id?: string
          remarks?: string | null
          tach_end?: number | null
          tach_start?: number | null
          tenant_id?: string
          to_icao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_tenant_id_aircraft_id_fkey"
            columns: ["tenant_id", "aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "flights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flights_tenant_id_pilot_id_fkey"
            columns: ["tenant_id", "pilot_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      learning_records: {
        Row: {
          answers: Json
          archived_at: string | null
          bookmarked: boolean
          chapter_id: string
          completed: boolean
          id: string
          inserted_at: string
          notes: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          archived_at?: string | null
          bookmarked?: boolean
          chapter_id: string
          completed?: boolean
          id: string
          inserted_at?: string
          notes?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          archived_at?: string | null
          bookmarked?: boolean
          chapter_id?: string
          completed?: boolean
          id?: string
          inserted_at?: string
          notes?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          archived_at: string | null
          attended: string[]
          ends_at: string
          enrolled: string[]
          id: string
          inserted_at: string
          instructor_id: string
          room_id: string
          signed_off: boolean
          starts_at: string
          subject_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          attended?: string[]
          ends_at: string
          enrolled?: string[]
          id: string
          inserted_at?: string
          instructor_id: string
          room_id: string
          signed_off?: boolean
          starts_at: string
          subject_id: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          attended?: string[]
          ends_at?: string
          enrolled?: string[]
          id?: string
          inserted_at?: string
          instructor_id?: string
          room_id?: string
          signed_off?: boolean
          starts_at?: string
          subject_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_items: {
        Row: {
          aircraft_id: string
          archived_at: string | null
          completed_at: string | null
          due_date: string | null
          due_hours: number | null
          id: string
          inserted_at: string
          interval_hours: number | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          aircraft_id: string
          archived_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          due_hours?: number | null
          id: string
          inserted_at?: string
          interval_hours?: number | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          aircraft_id?: string
          archived_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          due_hours?: number | null
          id?: string
          inserted_at?: string
          interval_hours?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_items_tenant_id_aircraft_id_fkey"
            columns: ["tenant_id", "aircraft_id"]
            isOneToOne: false
            referencedRelation: "aircraft"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "maintenance_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          archived_at: string | null
          id: string
          inserted_at: string
          member_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          id: string
          inserted_at?: string
          member_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          inserted_at?: string
          member_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_tenant_id_member_id_fkey"
            columns: ["tenant_id", "member_id"]
            isOneToOne: true
            referencedRelation: "tenant_members"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          archived_at: string | null
          id: string
          inserted_at: string
          member_id: string
          notification_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          id: string
          inserted_at?: string
          member_id: string
          notification_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          inserted_at?: string
          member_id?: string
          notification_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_requests: {
        Row: {
          archived_at: string | null
          before_values: Json
          changes: Json
          created_at: string
          id: string
          inserted_at: string
          notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitted_by: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          before_values?: Json
          changes?: Json
          created_at?: string
          id: string
          inserted_at?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          before_values?: Json
          changes?: Json
          created_at?: string
          id?: string
          inserted_at?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_by?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_lessons: {
        Row: {
          archived_at: string | null
          id: string
          inserted_at: string
          kind: string
          minutes: number
          name: string
          position: number
          program_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          id: string
          inserted_at?: string
          kind: string
          minutes: number
          name: string
          position?: number
          program_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          inserted_at?: string
          kind?: string
          minutes?: number
          name?: string
          position?: number
          program_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lessons_tenant_id_program_id_fkey"
            columns: ["tenant_id", "program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      programs: {
        Row: {
          archived_at: string | null
          id: string
          inserted_at: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          id: string
          inserted_at?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          id?: string
          inserted_at?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          address: string | null
          admin_note: string | null
          archived_at: string | null
          caa_ref: string | null
          callsign: string | null
          city: string | null
          country: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          gender: string | null
          icao_level: number | null
          id: string
          inserted_at: string
          instructor_id: string | null
          instructor_note: string | null
          licence: string | null
          medical_class: number | null
          medical_expiry: string | null
          name: string
          phone: string | null
          photo_url: string | null
          place_of_birth: string | null
          post_code: string | null
          prior_minutes: number | null
          profile_id: string | null
          program_id: string | null
          public_note: string | null
          rating_expiry: string | null
          speciality: string | null
          stage: string | null
          status: string
          status_reason: string | null
          tenant_id: string
          updated_at: string
          user_reference: string | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          archived_at?: string | null
          caa_ref?: string | null
          callsign?: string | null
          city?: string | null
          country?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          gender?: string | null
          icao_level?: number | null
          id: string
          inserted_at?: string
          instructor_id?: string | null
          instructor_note?: string | null
          licence?: string | null
          medical_class?: number | null
          medical_expiry?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          post_code?: string | null
          prior_minutes?: number | null
          profile_id?: string | null
          program_id?: string | null
          public_note?: string | null
          rating_expiry?: string | null
          speciality?: string | null
          stage?: string | null
          status?: string
          status_reason?: string | null
          tenant_id: string
          updated_at?: string
          user_reference?: string | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          archived_at?: string | null
          caa_ref?: string | null
          callsign?: string | null
          city?: string | null
          country?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          gender?: string | null
          icao_level?: number | null
          id?: string
          inserted_at?: string
          instructor_id?: string | null
          instructor_note?: string | null
          licence?: string | null
          medical_class?: number | null
          medical_expiry?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          post_code?: string | null
          prior_minutes?: number | null
          profile_id?: string | null
          program_id?: string | null
          public_note?: string | null
          rating_expiry?: string | null
          speciality?: string | null
          stage?: string | null
          status?: string
          status_reason?: string | null
          tenant_id?: string
          updated_at?: string
          user_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          time_zone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          time_zone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          time_zone?: string
          updated_at?: string
        }
        Relationships: []
      }
      theory_subjects: {
        Row: {
          archived_at: string | null
          code: string
          id: string
          inserted_at: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          id: string
          inserted_at?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          id?: string
          inserted_at?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theory_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_member_id: { Args: { _tenant: string }; Returns: string }
      is_tenant_admin: { Args: { _tenant: string }; Returns: boolean }
      is_tenant_member: { Args: { _tenant: string }; Returns: boolean }
      register_member: {
        Args: {
          p_first: string
          p_last: string
          p_master?: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "ground" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "instructor", "ground", "student"],
    },
  },
} as const
