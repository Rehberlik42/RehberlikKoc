import { HeartPulse } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <RouteLoadingIcon
      icon={HeartPulse}
      animation="pulse"
      label="İlerleme hesaplanıyor..."
    />
  );
}
