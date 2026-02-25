import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DewyRequest {
  service: "invitation" | "photoshoot" | "video" | "speech";
  prompt: string;
  options?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub;

    const DEWY_API_KEY = Deno.env.get("DEWY_STUDIO_API_KEY") || Deno.env.get("WEDDY_STUDIO_API_KEY");
    const DEWY_API_URL = Deno.env.get("DEWY_STUDIO_API_URL") || Deno.env.get("WEDDY_STUDIO_API_URL");

    if (!DEWY_API_KEY || !DEWY_API_URL) {
      throw new Error("Dewy Studio API credentials are not configured");
    }

    const { service, prompt, options } = await req.json() as DewyRequest;

    if (!service || !prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: service, prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpointMap: Record<string, string> = {
      invitation: "/api/v1/invitation/generate",
      photoshoot: "/api/v1/photoshoot/generate",
      video: "/api/v1/video/generate",
      speech: "/api/v1/speech/generate",
    };

    const endpoint = endpointMap[service];
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: `Unknown service: ${service}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Calling Dewy Studio API: ${service} for user: ${userId}, prompt: ${prompt.substring(0, 100)}...`);

    const apiResponse = await fetch(`${DEWY_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEWY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, ...options }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Dewy API error: ${apiResponse.status} - ${errorText}`);
      
      if (apiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (apiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 충전 후 이용해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Dewy Studio API 오류가 발생했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await apiResponse.json();
    console.log("Dewy Studio API response received successfully");

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dewy Studio function error:", error);
    return new Response(
      JSON.stringify({ error: "서비스 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
