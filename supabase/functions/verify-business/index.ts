import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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

    // ── 사업자 인증 강제 게이트 ──────────────────────────────
    // 국세청(NTS) 인증에 성공한 경우에만 가입(신청)을 받는다.
    // 정책 변경(260612): 과거에는 인증 실패도 미인증(pending)으로 접수했지만,
    // 사업자등록이 확인되지 않으면 기업회원 신청 자체를 차단한다.
    //  - 불일치(명시적 invalid) → 400 거절 (프로필·역할 미생성)
    //  - API 미설정/장애 → 503 "잠시 후 재시도" (정상 사업자 오인 차단 방지 —
    //    무인증 통과는 정책상 불가하므로 복구까지 신청이 일시 중단된다)
    if (!NTS_API_KEY) {
      console.error("verify-business: NTS_API_KEY not configured — registrations are blocked");
      return new Response(
        JSON.stringify({ error: "사업자 인증 서비스 점검 중이에요. 잠시 후 다시 시도해 주세요." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let isVerified = false;
    let invalidMessage = "";
    try {
      // 공공데이터포털 키는 Encoding(이미 %로 URL 인코딩됨)/Decoding(원문) 두 형식이 있고,
      // 개편된 포털은 한 가지만 보여준다. 어느 쪽을 등록했는지 추정이 틀리면 NTS 가 키 오류로
      // 응답해 503 이 났다(흔한 원인). → 두 형식을 모두 시도해 자동 보정한다.
      const hasPct = /%[0-9A-Fa-f]{2}/.test(NTS_API_KEY);
      const encoded = encodeURIComponent(NTS_API_KEY);
      // 추정이 맞을 가능성이 높은 형식을 먼저, 실패 시 반대도 시도.
      const candidates = hasPct ? [NTS_API_KEY, encoded] : [encoded, NTS_API_KEY];
      const payload = JSON.stringify({
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
      });

      let result: { valid?: string; valid_msg?: string } | undefined;
      let lastDiag = "";
      const tried = new Set<string>();
      for (const key of candidates) {
        if (tried.has(key)) continue;
        tried.add(key);
        let resp: Response;
        try {
          resp = await fetch(
            `https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey=${key}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }
          );
        } catch (e) {
          lastDiag = `fetch error: ${e}`;
          continue;
        }
        if (!resp.ok) {
          // 실제 NTS 응답을 로그로 남겨 원인(키 미등록/미승인/형식 등)을 진단 가능하게.
          lastDiag = `NTS ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 300)}`;
          console.warn("verify-business NTS non-ok:", lastDiag);
          continue;
        }
        const verifyData = await resp.json();
        result = verifyData.data?.[0];
        break;
      }

      if (result === undefined) {
        console.error("verify-business: NTS 호출 실패(모든 키 형식 시도):", lastDiag);
        return new Response(
          JSON.stringify({ error: "사업자 인증 서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("NTS verification result:", JSON.stringify(result));
      if (result?.valid === "01") {
        isVerified = true;
      } else {
        invalidMessage =
          result?.valid_msg || "사업자 정보가 일치하지 않습니다. 입력 정보를 확인해주세요.";
      }
    } catch (e) {
      console.warn("NTS API call error:", e);
      return new Response(
        JSON.stringify({ error: "사업자 인증 서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isVerified) {
      // 사업자등록 미확인 → 신청 자체를 거절 (프로필·역할 미생성).
      return new Response(
        JSON.stringify({
          error: `사업자 인증에 실패했어요. ${invalidMessage} 사업자등록번호·상호명·대표자명·개업일자를 확인해 주세요.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const verificationMessage = "사업자 인증이 완료되었습니다!";
    const verificationFailed = false;

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
