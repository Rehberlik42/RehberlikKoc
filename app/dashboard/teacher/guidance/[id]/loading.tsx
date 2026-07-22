import { Compass } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <RouteLoadingIcon
      icon={Compass}
      animation="spin"
      label="İçerik yükleniyor..."
    />
  );
}
