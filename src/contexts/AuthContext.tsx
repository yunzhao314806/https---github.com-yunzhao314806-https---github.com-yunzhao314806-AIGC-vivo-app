import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { AuthContextType, Profile, RegisterData } from '@/types/types';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 从 auth.User 元数据中构建兜底 profile，避免 fetchProfile 失败时用户卡在登录页 */
function buildFallbackProfile(authUser: User): Profile {
  const meta = authUser.user_metadata ?? {};
  const email = authUser.email ?? '';
  const username = meta.username ?? email.split('@')[0] ?? authUser.id;
  return {
    id: authUser.id,
    username,
    email,
    display_name: meta.display_name ?? username,
    user_type: meta.user_type ?? 'jobseeker',
    role: meta.role ?? 'user',
    avatar_url: meta.avatar_url ?? null,
    bio: null,
    location: null,
    website: null,
    phone: null,
    created_at: authUser.created_at ?? new Date().toISOString(),
    updated_at: authUser.updated_at ?? new Date().toISOString(),
  } as unknown as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
    return data as Profile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      const profile = await fetchProfile(currentSession.user.id);
      setUser(profile);
    }
  }, [fetchProfile]);

  useEffect(() => {
    // 初始化获取session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).then(profile => {
          setUser(profile ?? buildFallbackProfile(s.user!));
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 监听auth状态变化（回调必须是同步的，异步 await 会阻塞 signInWithPassword 返回）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        // 用 .then() 异步更新 profile，不阻塞 auth 回调
        fetchProfile(s.user.id).then(profile => {
          setUser(profile ?? buildFallbackProfile(s.user!));
        });
      } else {
        setUser(null);
      }
      if (event === 'SIGNED_IN') {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (username: string, password: string) => {
    const email = `${username}@miaoda.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('登录失败：' + (error.message.includes('Invalid') ? '用户名或密码错误' : error.message));
      throw error;
    }
    toast.success('登录成功');
  };

  const register = async (data: RegisterData) => {
    const email = `${data.username}@miaoda.com`;
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          display_name: data.display_name,
          user_type: data.user_type,
        }
      }
    });
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('unique')) {
        toast.error('注册失败：用户名已存在');
      } else {
        toast.error('注册失败：' + error.message);
      }
      throw error;
    }

    // 如果是企业用户，创建企业信息
    if (data.user_type === 'enterprise' && data.company_name && authData.user) {
      await supabase.from('enterprise_profiles').insert({
        profile_id: authData.user.id,
        company_name: data.company_name,
      });
    }

    toast.success('注册成功，欢迎加入！');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    toast.success('已退出登录');
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
