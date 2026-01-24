/**
 * Database types for Bickqr
 * These types mirror the Supabase schema defined in supabase/migrations/0001_init.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export type BickStatus = 'processing' | 'live' | 'failed' | 'removed';

export type AssetType = 
  | 'original' 
  | 'audio' 
  | 'waveform_json' 
  | 'og_image' 
  | 'teaser_mp4' 
  | 'thumbnail';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bick {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: BickStatus;
  duration_ms: number | null;
  play_count: number;
  share_count: number;
  original_filename: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface BickAsset {
  id: string;
  bick_id: string;
  asset_type: AssetType;
  storage_key: string | null;
  cdn_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  bick_count: number;
  created_at: string;
}

export interface BickTag {
  bick_id: string;
  tag_id: string;
}

export interface Report {
  id: string;
  bick_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export interface ProfileInsert {
  id: string; // Must match auth.users id
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface BickInsert {
  owner_id: string;
  slug: string;
  title: string;
  description?: string | null;
  status?: BickStatus;
  original_filename?: string | null;
}

export interface BickAssetInsert {
  bick_id: string;
  asset_type: AssetType;
  storage_key?: string | null;
  cdn_url?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface TagInsert {
  name: string;
  slug: string;
}

export interface BickTagInsert {
  bick_id: string;
  tag_id: string;
}

export interface ReportInsert {
  bick_id: string;
  reporter_id?: string | null;
  reason: string;
  details?: string | null;
}

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface BickUpdate {
  slug?: string;
  title?: string;
  description?: string | null;
  status?: BickStatus;
  duration_ms?: number | null;
  play_count?: number;
  share_count?: number;
}

export interface ReportUpdate {
  status?: ReportStatus;
}

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================

export interface BickWithAssets extends Bick {
  assets: BickAsset[];
}

export interface BickWithTags extends Bick {
  tags: Tag[];
}

export interface BickWithOwner extends Bick {
  owner: Profile;
}

export interface BickFull extends Bick {
  owner: Profile;
  assets: BickAsset[];
  tags: Tag[];
}

export interface TagWithBicks extends Tag {
  bicks: Bick[];
}

// ============================================================================
// SUPABASE DATABASE TYPE (for typed client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      bicks: {
        Row: Bick;
        Insert: BickInsert;
        Update: BickUpdate;
      };
      bick_assets: {
        Row: BickAsset;
        Insert: BickAssetInsert;
        Update: Partial<BickAssetInsert>;
      };
      tags: {
        Row: Tag;
        Insert: TagInsert;
        Update: Partial<TagInsert>;
      };
      bick_tags: {
        Row: BickTag;
        Insert: BickTagInsert;
        Update: never;
      };
      reports: {
        Row: Report;
        Insert: ReportInsert;
        Update: ReportUpdate;
      };
    };
  };
}
