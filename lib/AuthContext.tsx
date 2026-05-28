'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type UserRole = 'STUDENT' | 'STAFF' | 'PROFESSOR';

export type AuthUser = {
  userId: string;
  authUuid: string;
  name: string;
  role: UserRole;
  isWorkStudy: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error || !authData.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase
      .from('User')
      .select('user_id, name, role')
      .eq('user_uuid', authData.user.id)
      .single();

    if (!userData) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isWorkStudy = false;
    if (userData.role === 'STUDENT') {
      const { data: studentData } = await supabase
        .from('student')
        .select('is_work_study')
        .eq('user_id', userData.user_id)
        .maybeSingle();
      isWorkStudy = studentData?.is_work_study ?? false;
    }

    setUser({
      userId: userData.user_id,
      authUuid: authData.user.id,
      name: userData.name,
      role: userData.role as UserRole,
      isWorkStudy,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
