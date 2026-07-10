import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { pb } from "@/lib/pocketbase";

/* eslint-disable react-refresh/only-export-components */

const AuthContext = createContext(null);

const initialAuth = { session: null, user: null, loading: true };

function getMfaId(error) {
  const mfaId = error?.response?.mfaId;
  return typeof mfaId === "string" && mfaId.trim() ? mfaId : null;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(initialAuth);
  const { session, user, loading } = auth;

  useEffect(() => {
    setAuth({
      session: pb.authStore.token ? { token: pb.authStore.token } : null,
      user: pb.authStore.record ?? null,
      loading: false,
    });

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setAuth({
        session: pb.authStore.token ? { token: pb.authStore.token } : null,
        user: model ?? null,
        loading: false,
      });
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const admins = pb.collection("admins");

    try {
      return await admins.authWithPassword(email, password);
    } catch (error) {
      const mfaId = getMfaId(error);
      if (!mfaId) throw error;

      const { otpId } = await admins.requestOTP(email);
      if (typeof otpId !== "string" || !otpId) {
        throw new Error("Не удалось запросить код подтверждения.");
      }

      // Keep the short-lived MFA challenge only in component state.
      return { requiresMfa: true, mfaId, otpId };
    }
  }, []);

  const completeMfaSignIn = useCallback(async (challenge, code) => {
    const mfaId = challenge?.mfaId;
    const otpId = challenge?.otpId;
    const otp = String(code ?? "").trim();

    if (!mfaId || !otpId || !otp) {
      throw new Error("Код подтверждения недействителен. Войдите заново.");
    }

    return pb.collection("admins").authWithOTP(otpId, otp, { mfaId });
  }, []);

  const signOut = useCallback(async () => {
    pb.authStore.clear();
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
    completeMfaSignIn,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
