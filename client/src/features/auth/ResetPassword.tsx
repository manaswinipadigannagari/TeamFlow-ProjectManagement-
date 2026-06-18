import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { KeyRound, Loader2, Sparkles, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFields = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFields>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFields) => {
    if (!token || !userId) {
      setErrorMsg("Reset request parameters are missing or invalid.");
      toast.error("Reset request parameters are missing or invalid.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/auth/reset-password", {
        token,
        userId,
        password: data.password,
      });
      setSuccess(true);
      toast.success("Password updated successfully!");
    } catch (err: any) {
      let msg = "Failed to reset password. The link may have expired.";

      if (err.code === "ERR_NETWORK") {
        msg = "Server unavailable. Please check your connection or try again later.";
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }

      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mesh-gradient px-4 py-12">
      {/* Premium low-opacity grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

      {/* Floating Ambient Blurred Orbs */}
      <div className="absolute top-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-brand-600/15 blur-[120px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[130px] animate-float-medium pointer-events-none" />

      <div className="relative w-full max-w-[440px] z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-500/20 border border-brand-400/20 animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white font-display">
            Set New Password
          </h1>
          <p className="mt-3 text-slate-400 text-sm font-medium tracking-wide">
            Plan. Collaborate. Deliver Faster.
          </p>
        </div>

        {/* Glassmorphic Card */}
        <div className="rounded-[24px] glassmorphism p-8 shadow-2xl transition-all duration-300 hover:border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

          {!token || !userId ? (
            <div className="text-center py-4 animate-slide-in">
              <p className="text-sm text-rose-400 leading-relaxed mb-6">
                Invalid or missing reset token parameters in the link. Please request a new password
                reset link.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition duration-300 shadow-lg shadow-brand-600/30 active:scale-[0.98]"
              >
                Forgot Password
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-4 animate-slide-in">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-white mb-2">Password Updated</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Your password has been successfully reset. You can now log in with your new
                password.
              </p>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition duration-300 shadow-lg shadow-brand-600/30 active:scale-[0.98]"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {errorMsg && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 animate-slide-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className={`block w-full rounded-xl border ${
                      errors.password
                        ? "border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-800/80 bg-slate-950/40 focus:border-brand-500/80 focus:ring-brand-500/10"
                    } py-3 pl-11 pr-11 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-xs text-rose-400">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    className={`block w-full rounded-xl border ${
                      errors.confirmPassword
                        ? "border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-800/80 bg-slate-950/40 focus:border-brand-500/80 focus:ring-brand-500/10"
                    } py-3 pl-11 pr-11 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-rose-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 transition duration-300 shadow-lg shadow-brand-600/30 overflow-hidden active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
