import { MapPin, Clock, Car, Phone, Globe } from "lucide-react";

interface VenueInfoTabProps {
  address: string;
  phone?: string;
  website?: string;
  operatingHours?: string;
  parking?: string;
}

const VenueInfoTab = ({ 
  address, 
  phone = "02-1234-5678",
  website,
  operatingHours = "10:00 ~ 19:00",
  parking = "자체 주차장 이용 가능"
}: VenueInfoTabProps) => {
  return (
    <div className="p-4 space-y-4">
      {/* Address */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주소</p>
          <p className="font-medium text-foreground">{address}</p>
          <button className="text-primary text-sm mt-1 underline underline-offset-2">
            지도보기
          </button>
        </div>
      </div>

      {/* Phone */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">전화번호</p>
          <a href={`tel:${phone}`} className="font-medium text-foreground">
            {phone}
          </a>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">운영시간</p>
          <p className="font-medium text-foreground">{operatingHours}</p>
        </div>
      </div>

      {/* Parking */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주차</p>
          <p className="font-medium text-foreground">{parking}</p>
        </div>
      </div>

      {/* Website */}
      {website && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">웹사이트</p>
            <a 
              href={website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              홈페이지 방문
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueInfoTab;
