
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

interface PasswordRequirement {
  labelKey: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { labelKey: "accountSettings.password.reqLength", test: (p) => p.length >= 8 },
  { labelKey: "accountSettings.password.reqUpper", test: (p) => /[A-Z]/.test(p) },
  { labelKey: "accountSettings.password.reqLower", test: (p) => /[a-z]/.test(p) },
  { labelKey: "accountSettings.password.reqNumber", test: (p) => /\d/.test(p) },
  { labelKey: "accountSettings.password.reqSpecial", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const PasswordSettings = ({ email }: { email: string }) => {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time password strength checking
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, requirements: [] };

    const metRequirements = passwordRequirements.map((req) => ({
      ...req,
      met: req.test(newPassword),
    }));

    const score = metRequirements.filter((r) => r.met).length;

    return { score, requirements: metRequirements };
  }, [newPassword]);

  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const isPasswordValid = passwordStrength.score >= 4; // At least 4 of 5 requirements

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error(t("accountSettings.password.allRequired"));
      return;
    }

    if (!isPasswordValid) {
      toast.error(t("accountSettings.password.meetReqs"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("accountSettings.password.newNoMatch"));
      return;
    }

    setLoading(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });

      if (signInError) throw new Error(t("accountSettings.password.currentWrong"));

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("accountSettings.password.updated"));
    } catch (error: any) {
      toast.error(error.message || t("accountSettings.password.failed"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <span>{t("accountSettings.password.title")}</span>
        </CardTitle>
        <CardDescription>
          {t("accountSettings.password.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">{t("accountSettings.password.current")}</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("accountSettings.password.new")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={newPassword && !isPasswordValid ? "border-amber-500" : ""}
            />

            {/* Real-time password strength checklist */}
            {newPassword && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t("accountSettings.password.requirementsTitle")}
                </p>
                {passwordStrength.requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={req.met ? "text-green-700" : "text-muted-foreground"}>
                      {t(req.labelKey)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("accountSettings.password.confirm")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={
                confirmPassword
                  ? passwordsMatch
                    ? "border-green-500"
                    : "border-red-500"
                  : ""
              }
            />
            {confirmPassword && (
              <div className="flex items-center gap-2 text-sm mt-1">
                {passwordsMatch ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">{t("accountSettings.password.match")}</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-red-700">{t("common.validation.passwordMismatch")}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? t("accountSettings.password.updating") : t("accountSettings.password.update")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordSettings;
