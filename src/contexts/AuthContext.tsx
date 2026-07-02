import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { AuthContextType, Profile, RegisterData } from '@/types/types';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

const MOCK_ADMIN_PROFILE: Profile = {
  id: 'mock-admin-1',
  username: 'admin',
  email: 'admin@miaoda.com',
  display_name: '管理员',
  user_type: 'admin',
  role: 'admin',
  avatar_url: null,
  bio: null,
  location: null,
  website: null,
  phone: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_JOBSEEKER_PROFILE: Profile = {
  id: 'mock-jobseeker-1',
  username: 'jobseeker',
  email: 'jobseeker@miaoda.com',
  display_name: '求职者',
  user_type: 'jobseeker',
  role: 'user',
  avatar_url: null,
  bio: '积极寻找工作机会',
  location: '北京',
  website: null,
  phone: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_ENTERPRISE_PROFILE: Profile = {
  id: 'mock-enterprise-1',
  username: 'enterprise',
  email: 'enterprise@miaoda.com',
  display_name: '智聘科技有限公司',
  user_type: 'enterprise',
  role: 'user',
  avatar_url: null,
  bio: '专注于人工智能领域的创新企业',
  location: '上海',
  website: 'https://www.example.com',
  phone: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_USERS: Record<string, { password: string; profile: Profile }> = {
  'admin': { password: 'admin123', profile: MOCK_ADMIN_PROFILE },
  'jobseeker': { password: 'jobseeker123', profile: MOCK_JOBSEEKER_PROFILE },
  'enterprise': { password: 'enterprise123', profile: MOCK_ENTERPRISE_PROFILE },
};

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
    const storedUser = localStorage.getItem('mock_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('mock_user');
      }
    }

    try {
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

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        setSession(s);
        if (s?.user) {
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
    } catch {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = async (username: string, password: string) => {
    const mockUser = MOCK_USERS[username];
    const isMockAccount = !!(mockUser && mockUser.password === password);

    const storedUsers = JSON.parse(localStorage.getItem('registered_users') || '{}');
    const storedUser = storedUsers[username];
    const isStoredAccount = !!(storedUser && storedUser.password === password);

    // 统一构造 email，mock 账号和注册账号都尝试真实 auth
    const email = mockUser
      ? mockUser.profile.email
      : storedUser
        ? storedUser.profile.email
        : `${username}@miaoda.com`;

    // 优先尝试真实 Supabase auth 登录（拿到 session 后写操作才能通过 RLS）
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.user) {
        // 真实登录成功，等 onAuthStateChange 回调设置 user（会 fetchProfile）
        toast.success('登录成功');
        return;
      }
      // 真实登录失败，根据错误类型决定是否降级
      const msg = error?.message || '';
      const isBackendDown = msg.includes('Service temporarily unavailable')
        || msg.includes('network')
        || msg.includes('Failed to fetch')
        || msg.includes('SupabaseNotReady')
        || msg.includes('暂停');
      const isInvalidCreds = msg.includes('Invalid login credentials') || msg.includes('invalid_credentials');

      if (isInvalidCreds && (isMockAccount || isStoredAccount)) {
        // mock/stored 账号在 Supabase 里不存在 → 自动注册后登录
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                display_name: mockUser?.profile.display_name || storedUser?.profile.display_name || username,
                user_type: mockUser?.profile.user_type || storedUser?.profile.user_type || 'jobseeker',
              },
            },
          });
          if (!signUpError && signUpData?.user) {
            // 注册成功（邮件验证已关闭，直接登录）
            toast.success('登录成功');
            return;
          }
        } catch {
          // 注册也失败，走降级
        }
      }

      if (!isBackendDown && !isMockAccount && !isStoredAccount) {
        // 非降级场景且非 mock 账号，真实登录失败要报错
        if (msg.includes('Email not confirmed')) {
          toast.error('账号邮箱尚未验证，请联系管理员');
        } else {
          toast.error('用户名或密码错误，请重新输入');
        }
        throw error;
      }
      // isBackendDown 或 mock/stored 账号 → 继续走降级
    } catch (authErr) {
      // 网络异常等情况，mock/stored 账号继续降级；其他账号抛出
      if (!isMockAccount && !isStoredAccount) {
        console.error('登录失败:', authErr);
        throw authErr;
      }
    }

    // 降级：mock 账号或已注册的本地账号，走 localStorage
    if (isMockAccount) {
      setUser(mockUser.profile);
      localStorage.setItem('mock_user', JSON.stringify(mockUser.profile));
      toast.success('登录成功（演示模式）');
      return;
    }
    if (isStoredAccount) {
      const profile = storedUser.profile as Profile;
      setUser(profile);
      localStorage.setItem('mock_user', JSON.stringify(profile));
      toast.success('登录成功（演示模式）');
      return;
    }

    // 兜底：既不是 mock 也不是 stored，真实 auth 又失败了
    toast.error('登录失败，请检查账号或使用演示账号');
    throw new Error('Login failed');
  };

  const register = async (data: RegisterData) => {
    const mockUser = MOCK_USERS[data.username];
    if (mockUser) {
      const err = new Error('注册失败：用户名已存在');
      toast.error(err.message);
      throw err;
    }

    const storedUsers = JSON.parse(localStorage.getItem('registered_users') || '{}');
    if (storedUsers[data.username]) {
      const err = new Error('注册失败：用户名已存在');
      toast.error(err.message);
      throw err;
    }

    const newProfile: Profile = {
      id: `user-${Date.now()}`,
      username: data.username,
      email: `${data.username}@miaoda.com`,
      display_name: data.display_name,
      user_type: data.user_type,
      role: data.user_type === 'admin' ? 'admin' : 'user',
      avatar_url: null,
      bio: null,
      location: null,
      website: null,
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    storedUsers[data.username] = { password: data.password, profile: newProfile };
    localStorage.setItem('registered_users', JSON.stringify(storedUsers));

    toast.success('注册成功，欢迎加入！');
  };

  const logout = async () => {
    localStorage.removeItem('mock_user');
    try {
      await supabase.auth.signOut();
    } catch {
    }
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
