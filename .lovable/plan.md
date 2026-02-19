

# BHoldR: In-World YouTube Platform

## Overview
Transform BHoldR from a static mock page into a functional in-world video sharing platform where players can create channels, post YouTube video links that embed directly, and interact with ratings and comments.

## Database Tables

### `beholdr_channels`
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `channel_name` (text, not null)
- `created_at`, `updated_at` (timestamps)

One channel per user. Players name their own channel.

### `beholdr_videos`
- `id` (uuid, PK)
- `channel_id` (uuid, FK to beholdr_channels)
- `user_id` (uuid) -- the uploader
- `title` (text, not null)
- `youtube_url` (text, not null)
- `description` (text, nullable)
- `tags` (text[], nullable)
- `created_at`, `updated_at` (timestamps)

### `beholdr_ratings`
- `id` (uuid, PK)
- `video_id` (uuid, FK to beholdr_videos)
- `user_id` (uuid)
- `rating` (integer) -- e.g. 1 = thumbs up, -1 = thumbs down
- unique constraint on (video_id, user_id)
- `created_at`

### `beholdr_comments`
- `id` (uuid, PK)
- `video_id` (uuid, FK to beholdr_videos)
- `user_id` (uuid)
- `content` (text, not null)
- `created_at`, `updated_at`

### RLS Policies
- All authenticated users can view all channels, videos, ratings, and comments (it's a public-facing in-world platform)
- Users can create/update/delete their own channels, videos, and comments
- Users can create/update their own ratings (one per video)
- Admins get full access to everything

## Frontend: Player-Facing (`/beholdr`)

### Main Feed
- Shows all videos from all channels, sorted by newest first
- Each video card shows: YouTube thumbnail (extracted from URL), title, channel name, time ago, rating summary (thumbs up/down counts)
- Clicking a video opens an expanded view with the embedded YouTube player

### Video Detail View
- Embedded YouTube iframe using the standard `https://www.youtube.com/embed/{videoId}` format
- Title, channel name, description, tags
- Thumbs up / Thumbs down buttons with counts -- clicking toggles your rating
- Comments section below: list of comments with character name and timestamp, plus an input to add a new comment

### "My Channel" Section
- Set/edit channel name
- List of your uploaded videos with edit/delete options
- "Upload Video" form: title, YouTube URL, description, tags

## Frontend: Admin (`/admin/beholdr`)

### Admin Panel
- Dropdown to select any character
- Create/edit channels for any character, assign channel names
- Add videos to any character's channel (title, URL, description, tags)
- Manage all videos: edit/delete any video
- Moderate comments: delete any comment

## Technical Details

### YouTube URL Parsing
Extract video ID from various YouTube URL formats (`youtube.com/watch?v=`, `youtu.be/`, etc.) and convert to embed URL. Thumbnail extraction: `https://img.youtube.com/vi/{videoId}/mqdefault.jpg`.

### File Changes
1. **New migration**: Create the 4 tables with RLS policies
2. **`src/pages/BeholdR.tsx`**: Complete rewrite -- replace static mock with real data, video feed, video detail view, channel management
3. **`src/pages/BeholdRAdmin.tsx`**: New admin page for managing channels/videos/comments across all users
4. **`src/App.tsx`**: Add routes for `/admin/beholdr` and import the admin page

### Routing
- `/beholdr` -- main feed + video viewing
- `/admin/beholdr` -- admin management panel

