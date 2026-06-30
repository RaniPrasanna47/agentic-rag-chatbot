import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { LogIn, KeyRound, Sparkles, UserPlus, Fingerprint } from "lucide-react";

interface AuthModalProps {
  onSuccess: (uid: string, email: string | null) => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        onSuccess(userCred.user.uid, userCred.user.email);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(userCred.user.uid, userCred.user.email);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setError("Email/Password auth is not enabled in your Firebase project. Go to your Firebase Console > Authentication > Sign-in method and enable 'Email/Password'. Alternatively, sign in using Google below.");
      } else if (err.code === "auth/admin-restricted-operation" || err.message?.includes("admin-restricted-operation")) {
        setError("This operation is restricted by Firebase rules or is not enabled. Please sign in with Google instead.");
      } else {
        setError(err.message || "Authentication failed. Check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      onSuccess(userCred.user.uid, userCred.user.email);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-blocked" || err.message?.includes("popup-blocked")) {
        setError("Your browser blocked the login popup. Please enable popups, or simply click 'Continue as Guest Operator' below to use the application with local storage persistence!");
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
        setError("Google Sign-In is not enabled. Go to your Firebase Console > Authentication > Sign-in method and enable Google.");
      } else {
        setError("Google login failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const userCred = await signInAnonymously(auth);
      onSuccess(userCred.user.uid, "Guest User");
    } catch (err: any) {
      console.warn("Firebase Anonymous Auth failed, falling back to Local Guest Operator mode:", err);
      let localGuestId = localStorage.getItem("rag_local_guest_id");
      if (!localGuestId) {
        localGuestId = "guest_" + Math.random().toString(36).substring(2, 9);
        localStorage.setItem("rag_local_guest_id", localGuestId);
      }
      onSuccess(localGuestId, "Local Guest Operator");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-container" className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507]/90 backdrop-blur-md p-4">
      <div id="auth-card" className="w-full max-w-md bg-[#0a0a0f] border border-white/5 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col relative overflow-hidden glass-panel">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center gap-1.5 mb-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-2">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white uppercase font-mono">
            GraphRAG Studio
          </span>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold">STATE MACHINE ENGINE</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-1 text-white">
          {isSignUp ? "Create secure account" : "Initialize session"}
        </h2>
        <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">
          {isSignUp ? "Register to save custom knowledge index structures" : "Provide credentials to connect to database nodes"}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg p-3 mb-4 leading-relaxed font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider font-mono">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@system.io"
              required
              className="w-full bg-black/40 border border-white/10 text-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider font-mono">
              Secure Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-black/40 border border-white/10 text-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono placeholder-slate-600"
              />
              <KeyRound className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-600" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm shadow-lg shadow-cyan-600/10 cursor-pointer transition-all duration-150 mt-2 border border-cyan-400/20 font-bold"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                Sign Up
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-600 text-[10px] uppercase tracking-widest font-mono">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* Google Login Option */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 text-slate-200 font-bold py-3 rounded-xl border border-white/10 text-sm cursor-pointer transition-colors duration-150 mb-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Sign In with Google
        </button>

        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/5 text-slate-400 font-medium py-2.5 rounded-xl border border-white/5 text-xs cursor-pointer transition-colors duration-150"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Continue as Guest Operator
        </button>

        <div className="mt-5 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold focus:outline-none hover:underline"
          >
            {isSignUp ? "Already registered? Sign In" : "Need credentials? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
