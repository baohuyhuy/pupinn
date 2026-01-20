"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChangePasswordRequestSchema,
  type ChangePasswordRequest,
} from "@/lib/validators";
import { getErrorMessage } from "@/lib/api-client";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  userType: "staff" | "guest";
}

export function ChangePasswordForm({ onSuccess, userType }: ChangePasswordFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && countdown === 0) {
      const loginPath = userType === "staff" ? "/staff/login" : "/guest/login";
      router.push(loginPath);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSuccess, countdown, router, userType]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordRequest>({
    resolver: zodResolver(ChangePasswordRequestSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: ChangePasswordRequest) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      if (userType === "staff") {
        const { changePassword, logout } = await import("@/lib/auth");
        await changePassword(data.current_password, data.new_password);
        // Force logout to ensure redirection to login page
        logout();
      } else {
        const { changePasswordGuest, logoutGuest } = await import("@/lib/guest-auth");
        await changePasswordGuest(data.current_password, data.new_password);
        // Force logout to ensure redirection to login page
        logoutGuest();
      }
      
      setIsSuccess(true);
      reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to change password. Please check your current password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-100">Password Changed Successfully</h3>
              <p className="text-slate-400">
                Your password has been updated. You will be redirected to the login page in{" "}
                <span className="font-bold text-amber-500">{countdown}</span> seconds.
              </p>
            </div>
            <Button 
              onClick={() => {
                const loginPath = userType === "staff" ? "/staff/login" : "/guest/login";
                router.push(loginPath);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              Go to Login Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Change Password</CardTitle>
        <CardDescription className="text-slate-400">
          Update your account password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 flex items-start gap-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password" className="text-slate-300">
              Current Password
            </Label>
            <Input
              id="current_password"
              type="password"
              placeholder="••••••••"
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="text-sm text-red-400">{errors.current_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password" className="text-slate-300">
              New Password
            </Label>
            <Input
              id="new_password"
              type="password"
              placeholder="••••••••"
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="text-sm text-red-400">{errors.new_password.message}</p>
            )}
            <p className="text-xs text-slate-500">
              {userType === "guest" 
                ? "Must be at least 8 characters and contain at least one letter and one number."
                : "Must be at least 8 characters."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-slate-300">
              Confirm New Password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-sm text-red-400">{errors.confirm_password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
