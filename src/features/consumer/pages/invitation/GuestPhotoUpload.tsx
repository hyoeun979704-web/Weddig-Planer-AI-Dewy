import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ImagePlus, Check, Heart } from "lucide-react";
import {
  fetchPublishedInvitationBySlug,
  uploadGuestPhoto,
  insertGuestPhoto,
  removeGuestPhoto,
} from "@/features/consumer/data/invitation";
import { toast } from "sonner";

/**
 * 하객 사진 업로드 (공개). 식 후 하객이 청첩장 링크로 사진을 올린다.
 * RLS: 발행된 청첩장에만 익명 업로드 허용(storage + invitation_guest_photos).
 */

interface Invitation {
  id: string;
  groom_name: string;
  bride_name: string;
}

const MAX_BYTES = 20 * 1024 * 1024; // 버킷 제한과 동일(20MB)
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

const extOf = (file: File) => {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[file.type] ?? "jpg";
};

const GuestPhotoUpload = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const data = await fetchPublishedInvitationBySlug(slug);
      if (!data) {
        setNotFound(true);
      } else {
        setInvitation({
          id: data.id,
          groom_name: data.user_data?.groom_name ?? "신랑",
          bride_name: data.user_data?.bride_name ?? "신부",
        });
      }
      setLoading(false);
    })();
  }, [slug]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !invitation) return;
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      toast.error("20MB 이하 사진만 올릴 수 있어요", { description: tooBig.name });
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: list.length });
    const trimmedName = name.trim().slice(0, 40) || null;
    let ok = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const path = `${invitation.id}/${crypto.randomUUID()}.${extOf(file)}`;
        await uploadGuestPhoto(path, file);
        try {
          await insertGuestPhoto({
            invitationId: invitation.id,
            uploaderName: trimmedName,
            storagePath: path,
            contentType: file.type || null,
            sizeBytes: file.size,
          });
        } catch (rowErr) {
          // 행 등록 실패 시 올린 파일 정리(고아 방지).
          await removeGuestPhoto(path);
          throw rowErr;
        }
        ok += 1;
        setProgress({ done: ok, total: list.length });
      }
      setUploadedCount((c) => c + ok);
      toast.success(`사진 ${ok}장을 보냈어요. 감사합니다! 💕`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error("업로드 중 일부가 실패했어요", {
        description: msg.includes("guest_photo_limit_reached")
          ? "사진이 너무 많이 모여 잠시 마감됐어요."
          : `${ok}장 성공. 나머지는 다시 시도해 주세요.`,
      });
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EC]">
        <Loader2 className="w-6 h-6 animate-spin text-[#C98B8B]" />
      </div>
    );
  }
  if (notFound || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8 text-center bg-[#F7F2EC]">
        <p className="text-sm text-[#9A8C80]">청첩장을 찾을 수 없어요. 링크를 다시 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EC] app-col mx-auto px-6 py-12 flex flex-col">
      <div className="text-center mb-8">
        <Heart className="w-7 h-7 mx-auto text-[#C98B8B] mb-3" />
        <h1 className="text-[22px] font-semibold text-[#3A322C]" style={{ fontFamily: "'Gowun Batang', serif" }}>
          {invitation.groom_name} · {invitation.bride_name}
        </h1>
        <p className="text-[14px] text-[#9A8C80] mt-2 leading-relaxed">
          결혼식에서 찍어주신 사진을<br />신랑·신부에게 보내주세요.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="text-[13px] text-[#6B5B53] mb-1.5 block">보내는 분 (선택)</label>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="성함을 적어주세요"
            className="w-full h-11 px-3 rounded-lg border border-[#EBD9D3] text-sm focus:outline-none focus:ring-2 focus:ring-[#C98B8B]/40"
          />
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-14 rounded-xl flex items-center justify-center gap-2 text-white text-[15px] font-semibold active:scale-[0.99] transition-transform disabled:opacity-60"
          style={{ background: "#C98B8B" }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {progress ? `보내는 중 ${progress.done}/${progress.total}` : "보내는 중…"}
            </>
          ) : (
            <>
              <ImagePlus className="w-5 h-5" />
              사진 선택해서 보내기
            </>
          )}
        </button>
        <p className="text-[11px] text-[#9A8C80] text-center">
          여러 장을 한 번에 선택할 수 있어요 · 사진당 최대 20MB
        </p>
      </div>

      {uploadedCount > 0 && (
        <div className="mt-5 bg-[#EBD9D3]/50 rounded-xl p-4 flex items-center gap-2 justify-center text-[14px] text-[#6B5B53]">
          <Check className="w-4 h-4 text-[#C98B8B]" />
          지금까지 {uploadedCount}장을 보내주셨어요. 감사합니다!
        </div>
      )}

      <p className="text-[11px] text-[#B8A89E] text-center mt-auto pt-10">
        보내주신 사진은 신랑·신부에게만 전달됩니다.
      </p>
    </div>
  );
};

export default GuestPhotoUpload;
