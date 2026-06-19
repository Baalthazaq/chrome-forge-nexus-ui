import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { items } = await req.json() as {
      items: { user_id: string; filename: string; data_b64: string; content_type: string }[];
    };
    const results: any[] = [];
    for (const it of items) {
      const bytes = Uint8Array.from(atob(it.data_b64), (c) => c.charCodeAt(0));
      const path = `${it.user_id}/${it.filename}`;
      const up = await supabase.storage.from("avatars").upload(path, bytes, {
        contentType: it.content_type,
        upsert: true,
      });
      if (up.error) { results.push({ user_id: it.user_id, error: up.error.message }); continue; }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const upd = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", it.user_id);
      results.push({ user_id: it.user_id, url, update_error: upd.error?.message });
    }
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
