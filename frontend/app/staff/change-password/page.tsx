"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
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
import { getErrorMessage, changeMyPassword } from "@/lib/api-client";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_new_password: z
      .string()
      .min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    path: ["confirm_new_password"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export default function StaffChangePasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  if (!isLoading && !isAuthenticated) {
    router.push("/staff/login");
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    try {
      await changeMyPassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      setSuccess("Password updated successfully.");
      reset();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Change Password</CardTitle>
          <CardDescription className="text-slate-400">
            Update your staff account password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                {success}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="current_password" className="text-slate-200">
                Current password
              </Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                className="bg-slate-700/60 border-slate-600 text-slate-100"
                {...register("current_password")}
              />
              {errors.current_password && (
                <p className="text-sm text-red-400">
                  {errors.current_password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="new_password" className="text-slate-200">
                New password
              </Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                className="bg-slate-700/60 border-slate-600 text-slate-100"
                {...register("new_password")}
              />
              {errors.new_password && (
                <p className="text-sm text-red-400">
                  {errors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm_new_password" className="text-slate-200">
                Confirm new password
              </Label>
              <Input
                id="confirm_new_password"
                type="password"
                autoComplete="new-password"
                className="bg-slate-700/60 border-slate-600 text-slate-100"
                {...register("confirm_new_password")}
              />
              {errors.confirm_new_password && (
                <p className="text-sm text-red-400">
                  {errors.confirm_new_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

