import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { KeyRound, Mail, Loader2, Sparkles, Eye, EyeOff, Check, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const toast = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Load Remembered Email on Mount
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("teamflow_remember_me") === "true";
    setRememberMe(savedRememberMe);
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem("teamflow_remembered_email");
      if (savedEmail) {
        setValue("email", savedEmail);
      }
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFields) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post("/auth/login", data);
      const { user, accessToken } = response.data.data;

      // Save credentials to store
      setCredentials(user, accessToken);

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem("teamflow_remember_me", "true");
        localStorage.setItem("teamflow_remembered_email", data.email);
      } else {
        localStorage.removeItem("teamflow_remember_me");
        localStorage.removeItem("teamflow_remembered_email");
      }

      toast.success(`Welcome back, ${user.name}!`);
      navigate("/workspaces");
    } catch (err: any) {
      let msg = "Failed to sign in. Please check your credentials.";

      if (err.code === "ERR_NETWORK") {
        msg = "Server unavailable. Please check your connection or try again later.";
      } else if (err.response?.data?.message) {
        // Precise root-level backend error message
        msg = err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        // Fallback nested error format
        msg = err.response.data.error.message;
      }

      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to pre-populate credentials
  const handleQuickFill = (email: string) => {
    setValue("email", email);
    setValue("password", "password123");
    toast.info(`Filled credentials for ${email.split("@")[0]}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-mesh-gradient px-4 py-12">
      {/* Premium low-opacity grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />

      {/* Floating Ambient Blurred Orbs */}
      <div className="absolute top-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-brand-600/15 blur-[120px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[130px] animate-float-medium pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[100px] animate-pulse-subtle pointer-events-none" />

      <div className="relative w-full max-w-[440px] z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 text-white shadow-xl shadow-brand-500/20 border border-brand-400/20 animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white font-display">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              TeamFlow
            </span>
          </h1>
          <p className="mt-3 text-slate-400 text-sm font-medium tracking-wide">
            Plan. Collaborate. Deliver Faster.
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="rounded-[24px] glassmorphism p-8 shadow-2xl transition-all duration-300 hover:border-white/10 relative overflow-hidden group">
          {/* Subtle accent line on top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />

          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 animate-slide-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  {...register("email")}
                  className={`block w-full rounded-xl border ${
                    errors.email
                      ? "border-rose-500/50 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-slate-800/80 bg-slate-950/40 focus:border-brand-500/80 focus:ring-brand-500/10"
                  } py-3 pl-11 pr-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
                  placeholder="name@company.com"
                />
              </div>
              {errors.email && <p className="mt-2 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="h-4 w-4 rounded border border-slate-700 bg-slate-950/50 peer-checked:bg-brand-600 peer-checked:border-brand-500 flex items-center justify-center transition-colors">
                  <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="ml-2.5 text-xs text-slate-400 font-medium">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 transition duration-300 shadow-lg shadow-brand-600/30 overflow-hidden active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Quick-fill Helper for Demos */}
          <div className="mt-6 border-t border-slate-800/60 pt-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Click to Auto-fill Demo Account:
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFill("admin@teamflow.com")}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-800/80 bg-slate-950/30 hover:bg-slate-900/40 hover:border-brand-500/30 transition duration-200 text-left"
              >
                <span className="text-slate-200 font-bold text-xs">Admin Space</span>
                <span className="text-[10px] text-slate-500 truncate w-full">
                  admin@teamflow.com
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("sarah@teamflow.com")}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-800/80 bg-slate-950/30 hover:bg-slate-900/40 hover:border-brand-500/30 transition duration-200 text-left"
              >
                <span className="text-slate-200 font-bold text-xs">Developer Space</span>
                <span className="text-[10px] text-slate-500 truncate w-full">
                  sarah@teamflow.com
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
