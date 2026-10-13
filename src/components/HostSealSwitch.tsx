import React from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useHostSealText } from "@/hooks/useHostSealText";

// "I'm also playing" switch for detective-style games (ADR-0158). The state lives with the
// caller (see readHostPlaying/writeHostPlaying in utils/hostSeal); this is only the control.
interface HostSealSwitchProps {
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  id: string;
  isMobile?: boolean;
}

const HostSealSwitch: React.FC<HostSealSwitchProps> = ({ checked, onCheckedChange, id, isMobile }) => {
  const sealText = useHostSealText();
  return (
    <div className={cn("flex items-start gap-3 rounded-md border p-3 mb-4 print:hidden", isMobile && "p-2")}>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <div className="space-y-1">
        <Label htmlFor={id} className="font-semibold cursor-pointer">
          {sealText("label")}
        </Label>
        <p className="text-sm text-muted-foreground">{sealText("description")}</p>
      </div>
    </div>
  );
};

export default HostSealSwitch;
