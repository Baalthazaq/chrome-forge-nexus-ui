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
          summary: string | null
          tags: string[] | null
          updated_at: string
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
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
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
          summary?: string | null
          tags?: string[] | null
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
          completed_at: string | null
          created_at: string
          final_payment: number | null
          id: string
          notes: string | null
          quest_id: string
          status: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          final_payment?: number | null
          id?: string
          notes?: string | null
          quest_id: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          final_payment?: number | null
          id?: string
          notes?: string | null
          quest_id?: string
          status?: string | null
          submitted_at?: string | null
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
          client: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          reward: number
          status: string | null
          tags: string[] | null
          time_limit: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          reward?: number
          status?: string | null
          tags?: string[] | null
          time_limit?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          reward?: number
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
      tome_entries: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
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
      is_active_stone_participant: {
        Args: { _stone_id: string; _user_id: string }
        Returns: boolean
      }
      is_stone_participant: {
        Args: { _stone_id: string; _user_id: string }
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
