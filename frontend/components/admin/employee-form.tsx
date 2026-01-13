"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createEmployee,
  updateEmployee,
  getErrorMessage,
  listEmployees,
} from "@/lib/api-client";
import {
  type Employee,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from "@/lib/validators";

// Combined form schema that works for both create and edit
const EmployeeFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().optional(),
  role: z.enum(["admin", "receptionist", "cleaner"]),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  full_name: z.string().max(100, "Full name must be 100 characters or less").optional().nullable().or(z.literal("")),
});

type EmployeeFormData = z.infer<typeof EmployeeFormSchema>;

interface EmployeeFormProps {
  employee?: Employee;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function EmployeeForm({
  employee,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!employee;

  // Check if an admin already exists
  const { data: adminCheck } = useQuery({
    queryKey: ["employees", "admin-check"],
    queryFn: async () => {
      const result = await listEmployees({ role: "admin", page: 1, per_page: 1 });
      return result.total > 0;
    },
    staleTime: 30000,
  });

  const adminExists = adminCheck ?? false;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(EmployeeFormSchema),
    defaultValues: {
      username: employee?.username || "",
      password: "",
      role: employee?.role === "guest" ? "receptionist" : (employee?.role || "receptionist"),
      email: employee?.email || "",
      full_name: employee?.full_name || "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const selectedRole = watch("role");

  useEffect(() => {
    if (employee) {
      setValue("username", employee.username || "");
      setValue("role", employee.role === "guest" ? "receptionist" : employee.role);
      setValue("email", employee.email || "");
      setValue("full_name", employee.full_name || "");
    }
  }, [employee, setValue]);

  const onSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true);
    setError(null);

    // Validate password for create mode
    if (!isEditMode && (!data.password || data.password.length < 8)) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    // Additional client-side validation: prevent creating/updating to admin if one exists
    if (data.role === "admin" && adminExists) {
      const isChangingToAdmin = isEditMode && employee?.role !== "admin";
      if (isChangingToAdmin || !isEditMode) {
        setError(
          "Only one admin account is allowed in the system. An admin account already exists."
        );
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isEditMode && employee) {
        const updateData: UpdateEmployeeRequest = {
          username: data.username || null,
          role: data.role,
          email: data.email || null,
          full_name: data.full_name || null,
        };
        await updateEmployee(employee.id, updateData);
      } else {
        const createData: CreateEmployeeRequest = {
          username: data.username,
          password: data.password!,
          role: data.role,
          email: data.email || null,
          full_name: data.full_name || null,
        };
        await createEmployee(createData);
      }
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      if (
        errorMessage.includes("admin") ||
        errorMessage.includes("Only one admin")
      ) {
        setError(errorMessage);
      } else {
        setError(
          errorMessage ||
            `Failed to ${isEditMode ? "update" : "create"} employee`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username" className="text-slate-300">
          Username {!isEditMode && <span className="text-red-400">*</span>}
        </Label>
        <Input
          id="username"
          placeholder="e.g., jdoe"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...register("username")}
          disabled={isLoading}
        />
        {errors.username && (
          <p className="text-sm text-red-400">
            {errors.username.message as string}
          </p>
        )}
      </div>

      {/* Password (only for create mode) */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password <span className="text-red-400">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
            {...register("password")}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-red-400">
              {errors.password.message as string}
            </p>
          )}
        </div>
      )}

      {/* Role */}
      <div className="space-y-2">
        <Label className="text-slate-300">
          Role <span className="text-red-400">*</span>
        </Label>
        <Select
          value={selectedRole}
          onValueChange={(value) => {
            setValue("role", value as "admin" | "receptionist" | "cleaner");
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {(!adminExists || (isEditMode && employee?.role === "admin")) && (
              <SelectItem value="admin" className="text-slate-100">
                Admin
              </SelectItem>
            )}
            <SelectItem value="receptionist" className="text-slate-100">
              Receptionist
            </SelectItem>
            <SelectItem value="cleaner" className="text-slate-100">
              Cleaner
            </SelectItem>
          </SelectContent>
        </Select>
        {adminExists && !isEditMode && (
          <p className="text-sm text-amber-400">
            Only one admin account is allowed. An admin account already exists.
          </p>
        )}
        {adminExists && isEditMode && employee?.role !== "admin" && (
          <p className="text-sm text-amber-400">
            Only one admin account is allowed. An admin account already exists.
          </p>
        )}
        {errors.role && (
          <p className="text-sm text-red-400">
            {errors.role.message as string}
          </p>
        )}
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-slate-300">
          Full Name
        </Label>
        <Input
          id="full_name"
          placeholder="e.g., John Doe"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...register("full_name")}
          disabled={isLoading}
        />
        {errors.full_name && (
          <p className="text-sm text-red-400">
            {errors.full_name.message as string}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="e.g., john.doe@example.com"
          className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          {...register("email")}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="text-sm text-red-400">
            {errors.email.message as string}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
        >
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
            ? "Update Employee"
            : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
