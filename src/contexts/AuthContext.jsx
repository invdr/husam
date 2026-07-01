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
    const data = await pb.collection("admins").authWithPassword(email, password);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    pb.authStore.clear();
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
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
