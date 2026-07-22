import { Settings } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <RouteLoadingIcon
      icon={Settings}
      animation="spin"
      label="Ayarlar yükleniyor..."
    />
  );
}
