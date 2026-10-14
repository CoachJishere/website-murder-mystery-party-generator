import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

interface ProfileSettingsProps {
  initialName: string;
  email: string;
}

const ProfileSettings = ({ initialName, email }: ProfileSettingsProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const validateName = (value: string) => {
    if (!value.trim()) {
      return t("accountSettings.profile.nameRequired");
    }
    if (value.trim().length < 2) {
      return t("accountSettings.profile.nameTooShort");
    }
    if (value.trim().length > 50) {
      return t("accountSettings.profile.nameTooLong");
    }
    return "";
  };

  const handleNameBlur = () => {
    setNameTouched(true);
    const error = validateName(name);
    setNameError(error);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    // Clear error immediately when user fixes the issue
    if (nameTouched) {
      const error = validateName(value);
      setNameError(error);
    }
  };

  const isNameValid = name.trim().length >= 2 && name.trim().length <= 50;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate on submit
    const error = validateName(name);
    if (error) {
      setNameTouched(true);
      setNameError(error);
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      // Ensure the data object is properly typed with an index signature
      const { error } = await supabase.auth.updateUser({
        data: { name } as { [key: string]: string }
      });
      
      if (error) throw error;
      
      toast.success(t("accountSettings.profile.updated"));
    } catch (error: any) {
      toast.error(t("accountSettings.profile.updateFailed", { message: error.message }));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <span>{t("accountSettings.profile.title")}</span>
        </CardTitle>
        <CardDescription>
          {t("accountSettings.profile.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("accountSettings.profile.fullName")}</Label>
            <div className="relative">
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder={t("accountSettings.profile.namePlaceholder")}
                className={
                  nameTouched
                    ? nameError
                      ? "border-red-500 pr-10"
                      : "border-green-500 pr-10"
                    : ""
                }
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameTouched && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameError ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              )}
            </div>
            {nameError && nameTouched && (
              <p id="name-error" className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
            {!nameError && nameTouched && (
              <p className="text-sm text-green-700 flex items-center gap-1">
                <Check className="h-3 w-3" />
                {t("accountSettings.profile.nameGood")}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">{t("accountSettings.profile.email")}</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t("accountSettings.profile.emailNote")}
            </p>
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? t("accountSettings.profile.saving") : t("accountSettings.profile.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
