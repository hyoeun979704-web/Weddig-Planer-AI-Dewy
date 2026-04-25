import { ImageOff } from "lucide-react";

interface HanbokPhotoTabProps {
  images?: string[];
}

const HanbokPhotoTab = ({ images = [] }: HanbokPhotoTabProps) => {
  if (images.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">등록된 사진이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-lg">한복 갤러리</h3>
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={url} alt={`한복 사진 ${i + 1}`} className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default HanbokPhotoTab;
