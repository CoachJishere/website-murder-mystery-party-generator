import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ProfileSettingsProps {
  initialName: string;
  email: string;
}

const ProfileSettings = ({ initialName, email }: ProfileSettingsProps) => {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const validateName = (value: string) => {
    if (!value.trim()) {
      return "Name is required";
    }
    if (value.trim().length < 2) {
      return "Name must be at least 2 characters";
    }
    if (value.trim().length > 50) {
      return "Name must be less than 50 characters";
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
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
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
          <span>Profile Information</span>
        </CardTitle>
        <CardDescription>
          Update your personal information and how it appears on your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder="Your name"
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
                Name looks good!
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your email address is used for login and cannot be changed
            </p>
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
