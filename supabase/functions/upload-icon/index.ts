import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { filename, data_b64, content_type } = await req.json();
    const bytes = Uint8Array.from(atob(data_b64), (c) => c.charCodeAt(0));
    const up = await sb.storage.from("icons").upload(filename, bytes, { contentType: content_type, upsert: true });
    return new Response(JSON.stringify({ error: up.error?.message ?? null, path: up.data?.path }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
