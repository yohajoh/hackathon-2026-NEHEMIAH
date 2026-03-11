"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchCurrentUser, switchPersona } from "@/lib/api";
import { toast } from "sonner";

type Persona = "ADMIN" | "STUDENT";

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  activePersona?: Persona;
  studentProfileId?: string | null;
  phone?: string | null;
  year?: string | null;
  department?: string | null;
  student_id?: string | null;
} | null;

type PersonaContextValue = {
  user: SessionUser;
  activePersona: Persona;
  roles: Persona[];
  studentProfileId: string | null;
  canSwitchPersona: boolean;
  isLoading: boolean;
  switchPersonaRole: (role: Persona) => Promise<Persona | null>;
  clearSession: () => void;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

const normalizeUser = (user: SessionUser) => {
  if (!user) {
    return {
      user: null,
      roles: [] as Persona[],
      activePersona: "ADMIN" as Persona,
      studentProfileId: null,
    };
  }

  const resolvedRoles = ((user.roles || [user.role]) as Persona[]).filter(
    (role) => role === "ADMIN" || role === "STUDENT",
  );

  return {
    user,
    roles: Array.from(new Set(resolvedRoles)),
    activePersona: (user.activePersona as Persona) || (resolvedRoles.includes("ADMIN") ? "ADMIN" : "STUDENT"),
    studentProfileId: user.studentProfileId || null,
  };
};

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasLoadedSession = useRef(false);
  const [user, setUser] = useState<SessionUser>(null);
  const [activePersona, setActivePersona] = useState<Persona>("ADMIN");
  const [roles, setRoles] = useState<Persona[]>([]);
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUserState = useCallback((nextUser: SessionUser) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized.user);
    setRoles(normalized.roles);
    setActivePersona(normalized.activePersona);
    setStudentProfileId(normalized.studentProfileId);
  }, []);

  const clearSession = useCallback(() => {
    hasLoadedSession.current = false;
    applyUserState(null);
    setIsLoading(false);
  }, [applyUserState]);

  useEffect(() => {
    let mounted = true;
    const isAuthRoute = pathname.startsWith("/auth");

    const loadSession = async () => {
      if (isAuthRoute) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      if (hasLoadedSession.current) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (!mounted) return;
        applyUserState(user);
        hasLoadedSession.current = true;
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, [pathname, applyUserState]);

  const switchPersonaRole = useCallback(
    async (role: Persona) => {
      if (!roles.includes(role)) return;
      try {
        const user = await switchPersona(role);
        if (!user) return null;

        applyUserState(user);
        hasLoadedSession.current = true;
        return (user.activePersona as Persona) || role;
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : "Unable to switch account right now.";
        toast.error(message);

        // If switching fails (expired cookie, stale role payload), resync state from server.
        const refreshedUser = await fetchCurrentUser();
        if (!refreshedUser) {
          clearSession();
          return null;
        }

        applyUserState(refreshedUser);
        hasLoadedSession.current = true;
        return (refreshedUser.activePersona as Persona) || null;
      }
    },
    [roles, applyUserState, clearSession],
  );

  const value = useMemo(
    () => ({
      user,
      activePersona,
      roles,
      studentProfileId,
      canSwitchPersona: roles.includes("ADMIN") && roles.includes("STUDENT"),
      isLoading,
      switchPersonaRole,
      clearSession,
    }),
    [user, activePersona, roles, studentProfileId, isLoading, switchPersonaRole, clearSession],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within PersonaProvider");
  }
  return context;
}
