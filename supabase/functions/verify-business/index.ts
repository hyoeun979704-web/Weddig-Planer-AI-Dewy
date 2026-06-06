import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const NTS_API_KEY = Deno.env.get("NTS_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      business_number,
      business_name,
      representative_name,
      open_date,
      business_type,
      service_category,
      phone,
      address,
    } = body;

    // Validate required fields
    if (!business_number || !business_name || !representative_name || !service_category) {
      return new Response(
        JSON.stringify({ error: "필수 정보를 모두 입력해주세요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanBizNum = business_number.replace(/-/g, "");

    // Verify business number via 국세청 API
    let isVerified = false;
    let verificationMessage = "";
    // NTS 가 명시적으로 "불일치"를 반환한 경우(API 미연결/오류와 구분).
    let verificationFailed = false;

    if (NTS_API_KEY) {
      try {
        const verifyResp = await fetch(
          `https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${encodeURIComponent(NTS_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businesses: [
                {
                  b_no: cleanBizNum,
                  start_dt: open_date?.replace(/-/g, "") || "",
                  p_nm: representative_name,
                  p_nm2: "",
                  b_nm: business_name,
                  corp_no: "",
                  b_sector: "",
                  b_type: "",
                },
              ],
            }),
          }
        );

        if (verifyResp.ok) {
          const verifyData = await verifyResp.json();
          const result = verifyData.data?.[0];
          console.log("NTS verification result:", JSON.stringify(result));

          if (result?.valid === "01") {
            isVerified = true;
            verificationMessage = "사업자 인증이 완료되었습니다!";
          } else {
            verificationFailed = true;
            verificationMessage =
              result?.valid_msg || "사업자 정보가 일치하지 않습니다. 입력 정보를 확인해주세요.";
          }
        } else {
          console.warn("NTS API response not ok:", verifyResp.status);
          verificationMessage = "인증 서버 연결에 실패했습니다. 관리자 확인 후 인증됩니다.";
        }
      } catch (e) {
        console.warn("NTS API call error:", e);
        verificationMessage = "인증 서버 연결에 실패했습니다. 관리자 확인 후 인증됩니다.";
      }
    } else {
      verificationMessage = "사업자 인증 API가 설정되지 않았습니다. 관리자 확인 후 인증됩니다.";
    }

    // If API says invalid, still allow registration but mark as unverified
    // (admin can verify later)

    // 사업자번호가 다른 사용자에게 이미 귀속돼 있으면 차단.
    const { data: bizOwner } = await supabase
      .from("business_profiles")
      .select("id, user_id")
      .eq("business_number", cleanBizNum)
      .maybeSingle();

    if (bizOwner && bizOwner.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "이미 등록된 사업자등록번호입니다" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 본인의 기존 프로필 — 반려 상태면 재신청(업데이트), 그 외엔 중복 차단.
    const { data: myProfile } = await supabase
      .from("business_profiles")
      .select("id, approval_status")
      .eq("user_id", user.id)
      .maybeSingle();

    const profilePayload = {
      business_name,
      business_number: cleanBizNum,
      representative_name,
      business_type: business_type || "",
      service_category,
      phone: phone || "",
      address: address || "",
      is_verified: isVerified,
      verified_at: isVerified ? new Date().toISOString() : null,
    };

    const buildMessage = () =>
      (isVerified
        ? "사업자 인증이 확인되었어요. "
        : (verificationMessage ? verificationMessage + " " : "")) +
      "운영자 검토 후 등록 결과를 알려드릴게요.";

    if (myProfile) {
      if (myProfile.approval_status !== "rejected") {
        return new Response(
          JSON.stringify({ error: "이미 업체가 등록되어 있습니다", approval_status: myProfile.approval_status }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // 반려 → 재신청: 정보 갱신하고 검토 대기로 되돌리며 반려 사유를 비운다.
      const { error: updError } = await supabase
        .from("business_profiles")
        .update({ ...profilePayload, approval_status: "pending", review_note: null })
        .eq("user_id", user.id);
      if (updError) {
        console.error("Business profile re-apply error:", updError);
        return new Response(
          JSON.stringify({ error: "재신청 처리에 실패했습니다: " + updError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          vendor_id: null,
          is_verified: isVerified,
          verification_failed: verificationFailed,
          approval_status: "pending",
          message: buildMessage(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 참고: vendors 테이블은 schema cleanup 으로 삭제되었고, 공개 업체 노출은
    // places + business_profiles 기반으로 재설계 예정. 따라서 여기서는 vendor 를
    // 만들지 않고 business_profiles(회원 정보) + 역할만 생성한다. vendor_id 는 null.

    // Create business profile
    const { error: profileError } = await supabase.from("business_profiles").insert({
      user_id: user.id,
      ...profilePayload,
      vendor_id: null,
    });

    if (profileError) {
      console.error("Business profile creation error:", profileError);
      return new Response(
        JSON.stringify({ error: "사업자 프로필 생성에 실패했습니다: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add business role (using service role bypasses RLS). 실패 시 사용자가 역할
    // 없이 남지 않도록 에러를 확인하고 프로필을 롤백한다.
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "business" });
    if (roleError) {
      console.error("Business role assignment error:", roleError);
      await supabase.from("business_profiles").delete().eq("user_id", user.id);
      return new Response(
        JSON.stringify({ error: "권한 부여에 실패했습니다. 다시 시도해주세요" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove individual role (best effort)
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "individual");

    return new Response(
      JSON.stringify({
        success: true,
        vendor_id: null,
        is_verified: isVerified,
        verification_failed: verificationFailed,
        approval_status: "pending",
        message: buildMessage(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // 내부 에러 상세는 로그로만, 클라에는 제네릭 메시지(스키마/내부정보 누출 방지).
    console.error("verify-business error:", error);
    return new Response(
      JSON.stringify({ error: "사업자 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
