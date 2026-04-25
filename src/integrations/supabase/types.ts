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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          impersonated_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          impersonated_user_id?: string
        }
        Relationships: []
      }
      beholdr_channels: {
        Row: {
          channel_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beholdr_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beholdr_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "beholdr_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      beholdr_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beholdr_ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "beholdr_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      beholdr_videos: {
        Row: {
          channel_id: string
          created_at: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          youtube_url: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          youtube_url: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "beholdr_videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "beholdr_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      bestiary_creatures: {
        Row: {
          attack_modifier: number | null
          created_at: string
          creature_type: string
          damage: string | null
          description: string | null
          difficulty: number | null
          experience: string | null
          features: Json | null
          horde_value: number | null
          hp: number | null
          id: string
          image_url: string | null
          is_custom: boolean | null
          motives_tactics: string | null
          name: string
          stress: number | null
          thresholds: Json | null
          tier: number
          updated_at: string
          weapon_name: string | null
          weapon_range: string | null
        }
        Insert: {
          attack_modifier?: number | null
          created_at?: string
          creature_type?: string
          damage?: string | null
          description?: string | null
          difficulty?: number | null
          experience?: string | null
          features?: Json | null
          horde_value?: number | null
          hp?: number | null
          id?: string
          image_url?: string | null
          is_custom?: boolean | null
          motives_tactics?: string | null
          name: string
          stress?: number | null
          thresholds?: Json | null
          tier?: number
          updated_at?: string
          weapon_name?: string | null
          weapon_range?: string | null
        }
        Update: {
          attack_modifier?: number | null
          created_at?: string
          creature_type?: string
          damage?: string | null
          description?: string | null
          difficulty?: number | null
          experience?: string | null
          features?: Json | null
          horde_value?: number | null
          hp?: number | null
          id?: string
          image_url?: string | null
          is_custom?: boolean | null
          motives_tactics?: string | null
          name?: string
          stress?: number | null
          thresholds?: Json | null
          tier?: number
          updated_at?: string
          weapon_name?: string | null
          weapon_range?: string | null
        }
        Relationships: []
      }
      bestiary_features: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          tier: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          tier?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          tier?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          due_date: string | null
          from_user_id: string | null
          id: string
          is_recurring: boolean
          metadata: Json | null
          next_due_date: string | null
          recurring_count: number | null
          recurring_interval: string | null
          status: string
          times_repeated: number
          to_user_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description: string
          due_date?: string | null
          from_user_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json | null
          next_due_date?: string | null
          recurring_count?: number | null
          recurring_interval?: string | null
          status?: string
          times_repeated?: number
          to_user_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          due_date?: string | null
          from_user_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json | null
          next_due_date?: string | null
          recurring_count?: number | null
          recurring_interval?: string | null
          status?: string
          times_repeated?: number
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_event_shares: {
        Row: {
          created_at: string
          event_id: string
          id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          event_day: number
          event_day_end: number | null
          event_month: number
          event_year: number | null
          id: string
          is_holiday: boolean
          is_recurring: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_day: number
          event_day_end?: number | null
          event_month: number
          event_year?: number | null
          id?: string
          is_holiday?: boolean
          is_recurring?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_day?: number
          event_day_end?: number | null
          event_month?: number
          event_year?: number | null
          id?: string
          is_holiday?: boolean
          is_recurring?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      casts: {
        Row: {
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message: string
          original_message: string | null
          read_at: string | null
          sender_id: string
          stone_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message: string
          original_message?: string | null
          read_at?: string | null
          sender_id: string
          stone_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message?: string
          original_message?: string | null
          read_at?: string | null
          sender_id?: string
          stone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "casts_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      character_sheets: {
        Row: {
          ancestry: string | null
          armor_current: number
          armor_modifier: number
          armor_purchase_id: string | null
          backpack_ids: Json | null
          class: string | null
          community: string | null
          created_at: string
          domain_vault_ids: Json | null
          evasion_modifier: number
          experiences: Json | null
          hope_current: number
          hope_max: number
          hp_current: number
          hp_modifier: number
          id: string
          level: number
          level_up_choices: Json | null
          major_threshold_modifier: number
          personality: string | null
          physical_description: Json | null
          primary_weapon_purchase_id: string | null
          secondary_weapon_purchase_id: string | null
          selected_card_ids: Json | null
          severe_threshold_modifier: number
          stress_current: number
          stress_max: number
          subclass: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ancestry?: string | null
          armor_current?: number
          armor_modifier?: number
          armor_purchase_id?: string | null
          backpack_ids?: Json | null
          class?: string | null
          community?: string | null
          created_at?: string
          domain_vault_ids?: Json | null
          evasion_modifier?: number
          experiences?: Json | null
          hope_current?: number
          hope_max?: number
          hp_current?: number
          hp_modifier?: number
          id?: string
          level?: number
          level_up_choices?: Json | null
          major_threshold_modifier?: number
          personality?: string | null
          physical_description?: Json | null
          primary_weapon_purchase_id?: string | null
          secondary_weapon_purchase_id?: string | null
          selected_card_ids?: Json | null
          severe_threshold_modifier?: number
          stress_current?: number
          stress_max?: number
          subclass?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ancestry?: string | null
          armor_current?: number
          armor_modifier?: number
          armor_purchase_id?: string | null
          backpack_ids?: Json | null
          class?: string | null
          community?: string | null
          created_at?: string
          domain_vault_ids?: Json | null
          evasion_modifier?: number
          experiences?: Json | null
          hope_current?: number
          hope_max?: number
          hp_current?: number
          hp_modifier?: number
          id?: string
          level?: number
          level_up_choices?: Json | null
          major_threshold_modifier?: number
          personality?: string | null
          physical_description?: Json | null
          primary_weapon_purchase_id?: string | null
          secondary_weapon_purchase_id?: string | null
          selected_card_ids?: Json | null
          severe_threshold_modifier?: number
          stress_current?: number
          stress_max?: number
          subclass?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          personal_rating: number | null
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          personal_rating?: number | null
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          personal_rating?: number | null
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dice_roll_log: {
        Row: {
          equation: string
          id: string
          individual_dice: Json
          result: number
          rolled_at: string
          user_id: string
        }
        Insert: {
          equation?: string
          id?: string
          individual_dice?: Json
          result?: number
          rolled_at?: string
          user_id: string
        }
        Update: {
          equation?: string
          id?: string
          individual_dice?: Json
          result?: number
          rolled_at?: string
          user_id?: string
        }
        Relationships: []
      }
      downtime_activities: {
        Row: {
          activities_chosen: Json | null
          activity_type: string
          created_at: string
          game_day: number | null
          game_month: number | null
          game_year: number | null
          hours_spent: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activities_chosen?: Json | null
          activity_type: string
          created_at?: string
          game_day?: number | null
          game_month?: number | null
          game_year?: number | null
          hours_spent: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activities_chosen?: Json | null
          activity_type?: string
          created_at?: string
          game_day?: number | null
          game_month?: number | null
          game_year?: number | null
          hours_spent?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      downtime_balances: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      downtime_config: {
        Row: {
          hours_per_day: number
          id: string
          updated_at: string
        }
        Insert: {
          hours_per_day?: number
          id?: string
          updated_at?: string
        }
        Update: {
          hours_per_day?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      encounters: {
        Row: {
          created_at: string
          creatures: Json
          description: string | null
          environments: Json
          id: string
          name: string
          notes: string | null
          npcs: Json
          tier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creatures?: Json
          description?: string | null
          environments?: Json
          id?: string
          name: string
          notes?: string | null
          npcs?: Json
          tier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creatures?: Json
          description?: string | null
          environments?: Json
          id?: string
          name?: string
          notes?: string | null
          npcs?: Json
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      environment_features: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          tier: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          tier?: number | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          tier?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      environments: {
        Row: {
          created_at: string
          difficulty: string | null
          environment_type: string
          features: Json | null
          id: string
          image_url: string | null
          impulses: string[] | null
          is_specific: boolean
          name: string
          potential_adversaries: string | null
          tier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          environment_type?: string
          features?: Json | null
          id?: string
          image_url?: string | null
          impulses?: string[] | null
          is_specific?: boolean
          name: string
          potential_adversaries?: string | null
          tier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          environment_type?: string
          features?: Json | null
          id?: string
          image_url?: string | null
          impulses?: string[] | null
          is_specific?: boolean
          name?: string
          potential_adversaries?: string | null
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      evolution_edges: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_edges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "evolution_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_edges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "evolution_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_nodes: {
        Row: {
          color: string | null
          created_at: string
          host_required_tags: string[]
          host_tag_match_mode: string
          id: string
          identity_overwrites_host: boolean
          is_carrier: boolean
          label: string
          mate_up_probability: number
          mate_variant_lock_tags: string[]
          origin_mode: string
          reproduction_mode: string
          tags: string[]
          type: string
          updated_at: string
          variant_inheritance: string
          weight: number
          x: number
          y: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          host_required_tags?: string[]
          host_tag_match_mode?: string
          id?: string
          identity_overwrites_host?: boolean
          is_carrier?: boolean
          label: string
          mate_up_probability?: number
          mate_variant_lock_tags?: string[]
          origin_mode?: string
          reproduction_mode?: string
          tags?: string[]
          type?: string
          updated_at?: string
          variant_inheritance?: string
          weight?: number
          x?: number
          y?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          host_required_tags?: string[]
          host_tag_match_mode?: string
          id?: string
          identity_overwrites_host?: boolean
          is_carrier?: boolean
          label?: string
          mate_up_probability?: number
          mate_variant_lock_tags?: string[]
          origin_mode?: string
          reproduction_mode?: string
          tags?: string[]
          type?: string
          updated_at?: string
          variant_inheritance?: string
          weight?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      evolution_transformations: {
        Row: {
          acquisition: string
          carrier_node_id: string | null
          chance: number
          created_at: string
          description: string | null
          forbidden_tags: string[]
          granted_tags: string[]
          host_required_tags: string[]
          host_tag_match_mode: string
          id: string
          label: string
          stackable: boolean
          stage: number
          updated_at: string
        }
        Insert: {
          acquisition?: string
          carrier_node_id?: string | null
          chance?: number
          created_at?: string
          description?: string | null
          forbidden_tags?: string[]
          granted_tags?: string[]
          host_required_tags?: string[]
          host_tag_match_mode?: string
          id?: string
          label: string
          stackable?: boolean
          stage?: number
          updated_at?: string
        }
        Update: {
          acquisition?: string
          carrier_node_id?: string | null
          chance?: number
          created_at?: string
          description?: string | null
          forbidden_tags?: string[]
          granted_tags?: string[]
          host_required_tags?: string[]
          host_tag_match_mode?: string
          id?: string
          label?: string
          stackable?: boolean
          stage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_transformations_carrier_node_id_fkey"
            columns: ["carrier_node_id"]
            isOneToOne: false
            referencedRelation: "evolution_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_calendar: {
        Row: {
          current_day: number
          current_month: number
          current_year: number
          id: string
          updated_at: string
        }
        Insert: {
          current_day?: number
          current_month?: number
          current_year?: number
          id?: string
          updated_at?: string
        }
        Update: {
          current_day?: number
          current_month?: number
          current_year?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_cards: {
        Row: {
          card_type: string
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string
          source: string | null
          updated_at: string
        }
        Insert: {
          card_type: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          card_type?: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      map_area_reviews: {
        Row: {
          area_id: string
          content: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_area_reviews_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "map_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      map_areas: {
        Row: {
          created_at: string
          description: string | null
          environment_card: Json | null
          id: string
          image_url: string | null
          name: string
          polygon_points: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment_card?: Json | null
          id?: string
          image_url?: string | null
          name: string
          polygon_points?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          environment_card?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          polygon_points?: Json
          updated_at?: string
        }
        Relationships: []
      }
      map_location_reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          location_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          location_id: string
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          location_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_location_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "map_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      map_locations: {
        Row: {
          created_at: string
          description: string | null
          environment_card: Json | null
          icon_type: string
          id: string
          image_url: string | null
          is_public: boolean
          marker_color: string
          name: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment_card?: Json | null
          icon_type?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          marker_color?: string
          name: string
          updated_at?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          description?: string | null
          environment_card?: Json | null
          icon_type?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          marker_color?: string
          name?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      map_notes: {
        Row: {
          area_id: string | null
          content: string
          created_at: string
          id: string
          location_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          content?: string
          created_at?: string
          id?: string
          location_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          content?: string
          created_at?: string
          id?: string
          location_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_notes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "map_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "map_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      map_route_edges: {
        Row: {
          created_at: string
          from_node_id: string
          id: string
          to_node_id: string
        }
        Insert: {
          created_at?: string
          from_node_id: string
          id?: string
          to_node_id: string
        }
        Update: {
          created_at?: string
          from_node_id?: string
          id?: string
          to_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_route_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "map_route_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_route_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "map_route_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      map_route_nodes: {
        Row: {
          created_at: string
          id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          content: string | null
          created_at: string
          headline: string
          id: string
          image_url: string | null
          is_breaking: boolean | null
          is_published: boolean | null
          publish_date: string | null
          publish_day: number | null
          publish_month: number | null
          publish_year: number | null
          summary: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          headline: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          publish_day?: number | null
          publish_month?: number | null
          publish_year?: number | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_breaking?: boolean | null
          is_published?: boolean | null
          publish_date?: string | null
          publish_day?: number | null
          publish_month?: number | null
          publish_year?: number | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          notes: string | null
          quick_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          notes?: string | null
          quick_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          notes?: string | null
          quick_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          agility: number | null
          alias: string | null
          aliases: string[] | null
          ancestry: string | null
          avatar_url: string | null
          bio: string | null
          character_class: string | null
          character_name: string | null
          charisma_score: number | null
          company: string | null
          created_at: string
          credit_rating: number | null
          credits: number | null
          education: string | null
          employer: string | null
          finesse: number | null
          fitness_rating: number | null
          has_succubus_profile: boolean | null
          id: string
          instinct: number | null
          is_dead: boolean | null
          is_npc: boolean | null
          is_searchable: boolean | null
          job: string | null
          knowledge: number | null
          level: number
          neural_rating: number | null
          notes: string | null
          presence: number | null
          security_rating: string | null
          stealth_index: number | null
          strength: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          agility?: number | null
          alias?: string | null
          aliases?: string[] | null
          ancestry?: string | null
          avatar_url?: string | null
          bio?: string | null
          character_class?: string | null
          character_name?: string | null
          charisma_score?: number | null
          company?: string | null
          created_at?: string
          credit_rating?: number | null
          credits?: number | null
          education?: string | null
          employer?: string | null
          finesse?: number | null
          fitness_rating?: number | null
          has_succubus_profile?: boolean | null
          id?: string
          instinct?: number | null
          is_dead?: boolean | null
          is_npc?: boolean | null
          is_searchable?: boolean | null
          job?: string | null
          knowledge?: number | null
          level?: number
          neural_rating?: number | null
          notes?: string | null
          presence?: number | null
          security_rating?: string | null
          stealth_index?: number | null
          strength?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          agility?: number | null
          alias?: string | null
          aliases?: string[] | null
          ancestry?: string | null
          avatar_url?: string | null
          bio?: string | null
          character_class?: string | null
          character_name?: string | null
          charisma_score?: number | null
          company?: string | null
          created_at?: string
          credit_rating?: number | null
          credits?: number | null
          education?: string | null
          employer?: string | null
          finesse?: number | null
          fitness_rating?: number | null
          has_succubus_profile?: boolean | null
          id?: string
          instinct?: number | null
          is_dead?: boolean | null
          is_npc?: boolean | null
          is_searchable?: boolean | null
          job?: string | null
          knowledge?: number | null
          level?: number
          neural_rating?: number | null
          notes?: string | null
          presence?: number | null
          security_rating?: string | null
          stealth_index?: number | null
          strength?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          quantity: number | null
          shop_item_id: string
          subscription_created: boolean | null
          total_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number | null
          shop_item_id: string
          subscription_created?: boolean | null
          total_cost: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number | null
          shop_item_id?: string
          subscription_created?: boolean | null
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_acceptances: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          final_payment: number | null
          hours_logged: number
          id: string
          notes: string | null
          quest_id: string
          roll_result: number | null
          roll_type: string | null
          status: string | null
          submitted_at: string | null
          submitted_game_day: number | null
          submitted_game_month: number | null
          submitted_game_year: number | null
          times_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          final_payment?: number | null
          hours_logged?: number
          id?: string
          notes?: string | null
          quest_id: string
          roll_result?: number | null
          roll_type?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_game_day?: number | null
          submitted_game_month?: number | null
          submitted_game_year?: number | null
          times_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          final_payment?: number | null
          hours_logged?: number
          id?: string
          notes?: string | null
          quest_id?: string
          roll_result?: number | null
          roll_type?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_game_day?: number | null
          submitted_game_month?: number | null
          submitted_game_year?: number | null
          times_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_acceptances_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          available_quantity: number | null
          client: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          downtime_cost: number
          id: string
          job_type: string
          pay_interval: string | null
          posted_by_user_id: string | null
          posted_game_day: number | null
          posted_game_month: number | null
          posted_game_year: number | null
          reward: number
          reward_min: number
          status: string | null
          tags: string[] | null
          time_limit: string | null
          title: string
          updated_at: string
        }
        Insert: {
          available_quantity?: number | null
          client?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          downtime_cost?: number
          id?: string
          job_type?: string
          pay_interval?: string | null
          posted_by_user_id?: string | null
          posted_game_day?: number | null
          posted_game_month?: number | null
          posted_game_year?: number | null
          reward?: number
          reward_min?: number
          status?: string | null
          tags?: string[] | null
          time_limit?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          available_quantity?: number | null
          client?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          downtime_cost?: number
          id?: string
          job_type?: string
          pay_interval?: string | null
          posted_by_user_id?: string | null
          posted_game_day?: number | null
          posted_game_month?: number | null
          posted_game_year?: number | null
          reward?: number
          reward_min?: number
          status?: string | null
          tags?: string[] | null
          time_limit?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          layout_column: number | null
          layout_position: number | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          layout_column?: number | null
          layout_position?: number | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          layout_column?: number | null
          layout_position?: number | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          accumulated_amount: number
          amount: number
          created_at: string
          currency: string
          description: string
          from_user_id: string | null
          id: string
          interval_type: string
          is_active: boolean
          last_sent_at: string | null
          max_cycles: number | null
          metadata: Json | null
          next_send_at: string
          remaining_cycles: number | null
          status: string
          to_user_id: string
          total_times_sent: number
          updated_at: string
        }
        Insert: {
          accumulated_amount?: number
          amount: number
          created_at?: string
          currency?: string
          description: string
          from_user_id?: string | null
          id?: string
          interval_type: string
          is_active?: boolean
          last_sent_at?: string | null
          max_cycles?: number | null
          metadata?: Json | null
          next_send_at: string
          remaining_cycles?: number | null
          status?: string
          to_user_id: string
          total_times_sent?: number
          updated_at?: string
        }
        Update: {
          accumulated_amount?: number
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          from_user_id?: string | null
          id?: string
          interval_type?: string
          is_active?: boolean
          last_sent_at?: string | null
          max_cycles?: number | null
          metadata?: Json | null
          next_send_at?: string
          remaining_cycles?: number | null
          status?: string
          to_user_id?: string
          total_times_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      reputation_tags: {
        Row: {
          created_at: string | null
          id: string
          tag: string
          tagger_user_id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
          tagger_user_id: string
          target_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
          tagger_user_id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          quantity_available: number | null
          specifications: Json | null
          subscription_fee: number | null
          subscription_interval: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number
          quantity_available?: number | null
          specifications?: Json | null
          subscription_fee?: number | null
          subscription_interval?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          quantity_available?: number | null
          specifications?: Json | null
          subscription_fee?: number | null
          subscription_interval?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stone_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          stone_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          stone_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          stone_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stone_participants_stone_id_fkey"
            columns: ["stone_id"]
            isOneToOne: false
            referencedRelation: "stones"
            referencedColumns: ["id"]
          },
        ]
      }
      stones: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_cast_at: string | null
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_cast_at?: string | null
          name?: string | null
          participant_one_id?: string | null
          participant_two_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_cast_at?: string | null
          name?: string | null
          participant_one_id?: string | null
          participant_two_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      succubus_profiles: {
        Row: {
          age: number | null
          ancestry: string | null
          avatar_url: string | null
          bio: string | null
          character_name: string
          community: string | null
          compatibility: number | null
          created_at: string
          created_by: string
          id: string
          job: string | null
          promoted_to_npc_id: string | null
          search_purpose: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          ancestry?: string | null
          avatar_url?: string | null
          bio?: string | null
          character_name: string
          community?: string | null
          compatibility?: number | null
          created_at?: string
          created_by: string
          id?: string
          job?: string | null
          promoted_to_npc_id?: string | null
          search_purpose?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          ancestry?: string | null
          avatar_url?: string | null
          bio?: string | null
          character_name?: string
          community?: string | null
          compatibility?: number | null
          created_at?: string
          created_by?: string
          id?: string
          job?: string | null
          promoted_to_npc_id?: string | null
          search_purpose?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          related_app: string | null
          screenshot_url: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          related_app?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          related_app?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tome_collaborators: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          role: string
          tome_entry_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          role?: string
          tome_entry_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          role?: string
          tome_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tome_collaborators_tome_entry_id_fkey"
            columns: ["tome_entry_id"]
            isOneToOne: false
            referencedRelation: "tome_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tome_entries: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          last_edited_by: string | null
          pages: number | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          last_edited_by?: string | null
          pages?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          last_edited_by?: string | null
          pages?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tome_shares: {
        Row: {
          created_at: string
          id: string
          message: string | null
          recipient_id: string
          sender_id: string
          share_type: string
          status: string | null
          tome_entry_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          recipient_id: string
          sender_id: string
          share_type?: string
          status?: string | null
          tome_entry_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
          share_type?: string
          status?: string | null
          tome_entry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tome_shares_tome_entry_id_fkey"
            columns: ["tome_entry_id"]
            isOneToOne: false
            referencedRelation: "tome_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tome_versions: {
        Row: {
          content: string | null
          created_at: string
          edited_by: string | null
          editor_name: string | null
          id: string
          title: string | null
          tome_entry_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_by?: string | null
          editor_name?: string | null
          id?: string
          title?: string | null
          tome_entry_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_by?: string | null
          editor_name?: string | null
          id?: string
          title?: string | null
          tome_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tome_versions_tome_entry_id_fkey"
            columns: ["tome_entry_id"]
            isOneToOne: false
            referencedRelation: "tome_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          from_user_id: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          status: string
          to_user_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          status?: string
          to_user_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          from_user_id?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          status?: string
          to_user_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_description: string
          activity_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_description: string
          activity_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_description?: string
          activity_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_augmentations: {
        Row: {
          category: string
          efficiency_percent: number | null
          id: string
          installed_at: string | null
          last_maintenance: string | null
          metadata: Json | null
          name: string
          status: string | null
          user_id: string
        }
        Insert: {
          category: string
          efficiency_percent?: number | null
          id?: string
          installed_at?: string | null
          last_maintenance?: string | null
          metadata?: Json | null
          name: string
          status?: string | null
          user_id: string
        }
        Update: {
          category?: string
          efficiency_percent?: number | null
          id?: string
          installed_at?: string | null
          last_maintenance?: string | null
          metadata?: Json | null
          name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price: number | null
          shop_item_id: string | null
          specifications: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number | null
          shop_item_id?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number | null
          shop_item_id?: string | null
          specifications?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tome_access: {
        Args: { _entry_id: string; _user_id: string }
        Returns: boolean
      }
      is_active_stone_participant: {
        Args: { _stone_id: string; _user_id: string }
        Returns: boolean
      }
      is_stone_participant: {
        Args: { _stone_id: string; _user_id: string }
        Returns: boolean
      }
      is_tome_owner: {
        Args: { _entry_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
