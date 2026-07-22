import { CalendarCheck } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <RouteLoadingIcon
      icon={CalendarCheck}
      animation="pulse"
      label="Müsaitlik yükleniyor..."
    />
  );
}
