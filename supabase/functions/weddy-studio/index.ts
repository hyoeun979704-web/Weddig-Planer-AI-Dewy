import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeddyRequest {
  service: "invitation" | "photoshoot" | "video" | "speech";
  prompt: string;
  options?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WEDDY_API_KEY = Deno.env.get("WEDDY_STUDIO_API_KEY");
    const WEDDY_API_URL = Deno.env.get("WEDDY_STUDIO_API_URL");

    if (!WEDDY_API_KEY || !WEDDY_API_URL) {
      throw new Error("Weddy Studio API credentials are not configured");
    }

    const { service, prompt, options } = await req.json() as WeddyRequest;

    if (!service || !prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: service, prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map service to API endpoint
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

    console.log(`Calling Weddy Studio API: ${service} with prompt: ${prompt.substring(0, 100)}...`);

    const apiResponse = await fetch(`${WEDDY_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WEDDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        ...options,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Weddy API error: ${apiResponse.status} - ${errorText}`);
      
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
        JSON.stringify({ error: "Weddy Studio API 오류가 발생했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await apiResponse.json();
    console.log("Weddy Studio API response received successfully");

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weddy Studio function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
