import { useEffect } from "react";
import { installPreviewHostBridge } from "@/lib/preview-host-bridge";

export function PreviewHostBridge() {
  useEffect(() => installPreviewHostBridge(), []);
  return null;
}
