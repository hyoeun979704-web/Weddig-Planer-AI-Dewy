import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WeddyService = "invitation" | "photoshoot" | "video" | "speech";

interface WeddyOptions {
  style?: string;
  format?: string;
  duration?: number;
  [key: string]: unknown;
}

interface WeddyResponse {
  success: boolean;
  data?: {
    id: string;
    content?: string;
    imageUrl?: string;
    videoUrl?: string;
    status?: string;
  };
  error?: string;
}

export const useWeddyStudio = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WeddyResponse | null>(null);
  const { toast } = useToast();

  const generate = async (
    service: WeddyService,
    prompt: string,
    options?: WeddyOptions
  ): Promise<WeddyResponse | null> => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("weddy-studio", {
        body: { service, prompt, options },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast({
          title: "생성 실패",
          description: data.error,
          variant: "destructive",
        });
        return { success: false, error: data.error };
      }

      const response: WeddyResponse = {
        success: true,
        data: data,
      };

      setResult(response);
      toast({
        title: "생성 완료",
        description: "콘텐츠가 성공적으로 생성되었습니다.",
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast({
        title: "오류 발생",
        description: message,
        variant: "destructive",
      });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvitation = (prompt: string, options?: WeddyOptions) =>
    generate("invitation", prompt, options);

  const generatePhotoshoot = (prompt: string, options?: WeddyOptions) =>
    generate("photoshoot", prompt, options);

  const generateVideo = (prompt: string, options?: WeddyOptions) =>
    generate("video", prompt, options);

  const generateSpeech = (prompt: string, options?: WeddyOptions) =>
    generate("speech", prompt, options);

  return {
    isLoading,
    result,
    generate,
    generateInvitation,
    generatePhotoshoot,
    generateVideo,
    generateSpeech,
  };
};
