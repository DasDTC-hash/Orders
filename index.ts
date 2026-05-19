// Supabase Edge Function: track-shipment
// Securely calls EasyPost API and returns tracking status.
// The EasyPost API key lives in Supabase's environment variables — never exposed to the browser.

// @ts-ignore - Deno standard library import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tracking_number, item_id } = await req.json();

    if (!tracking_number || typeof tracking_number !== "string" || tracking_number.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "tracking_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("EASYPOST_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "EASYPOST_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call EasyPost — let them auto-detect carrier from the tracking number format
    const ep = await fetch("https://api.easypost.com/v2/trackers", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(apiKey + ":"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracker: {
          tracking_code: tracking_number.trim(),
          // carrier omitted — EasyPost auto-detects
        },
      }),
    });

    const data = await ep.json();

    if (!ep.ok) {
      console.error("EasyPost error:", data);
      return new Response(
        JSON.stringify({
          status: "unknown",
          carrier: null,
          error: data?.error?.message || "Could not look up tracking",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: data.status || "unknown",
        carrier: data.carrier || null,
        public_url: data.public_url || null,
        item_id: item_id || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ status: "unknown", error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
