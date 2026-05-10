import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, BrainCircuit, Users, Building2 } from 'lucide-react';
import { UserType } from '@/types/types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();

  // 登录状态
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // 注册状态
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUserType, setRegUserType] = useState<UserType>('jobseeker');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // 已认证时用 useEffect 跳转，避免在 render 期间调用导航副作用
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.user_type === 'admin') {
        navigate('/admin/users', { replace: true });
      } else if (user.user_type === 'enterprise') {
        navigate('/enterprise/home', { replace: true });
      } else {
        navigate('/jobseeker/home', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // 认证中或已认证时不渲染表单
  if (isAuthenticated && user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    if (!regUsername || !regPassword || !regDisplayName) return;
    if (regUserType === 'enterprise' && !regCompanyName) return;
    setRegLoading(true);
    try {
      await register({
        username: regUsername,
        password: regPassword,
        display_name: regDisplayName,
        user_type: regUserType,
        company_name: regCompanyName,
      });
      // 注册成功后自动登录
      await login(regUsername, regPassword);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-primary">
            <BrainCircuit className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance">智聘未来</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">Agent驱动的岗位智能匹配与能力图谱系统</p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-balance">欢迎使用</CardTitle>
            <CardDescription className="text-pretty">登录或注册以使用智能招聘服务</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>

              {/* 登录Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-sm font-normal">用户名</Label>
                    <Input
                      id="login-username"
                      placeholder="请输入用户名"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      required
                      autoComplete="username"
                      className="px-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-normal">密码</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPwd ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="px-3 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowLoginPwd(v => !v)}
                        tabIndex={-1}
                      >
                        {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-9" disabled={loginLoading}>
                    {loginLoading ? '登录中...' : '登录'}
                  </Button>
                </form>
              </TabsContent>

              {/* 注册Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-normal">账号类型</Label>
                    <RadioGroup
                      value={regUserType}
                      onValueChange={v => setRegUserType(v as UserType)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2 min-h-12">
                        <RadioGroupItem value="jobseeker" id="type-jobseeker" />
                        <Label htmlFor="type-jobseeker" className="flex items-center gap-1.5 cursor-pointer font-normal">
                          <Users className="w-4 h-4 text-primary" />
                          求职者
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 min-h-12">
                        <RadioGroupItem value="enterprise" id="type-enterprise" />
                        <Label htmlFor="type-enterprise" className="flex items-center gap-1.5 cursor-pointer font-normal">
                          <Building2 className="w-4 h-4 text-primary" />
                          企业用户
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-sm font-normal">用户名</Label>
                    <Input
                      id="reg-username"
                      placeholder="仅支持字母、数字和下划线"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      required
                      className="px-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-display-name" className="text-sm font-normal">
                      {regUserType === 'enterprise' ? '联系人姓名' : '真实姓名'}
                    </Label>
                    <Input
                      id="reg-display-name"
                      placeholder={regUserType === 'enterprise' ? '联系人姓名' : '您的真实姓名'}
                      value={regDisplayName}
                      onChange={e => setRegDisplayName(e.target.value)}
                      required
                      className="px-3"
                    />
                  </div>

                  {regUserType === 'enterprise' && (
                    <div className="space-y-2">
                      <Label htmlFor="reg-company" className="text-sm font-normal">公司名称</Label>
                      <Input
                        id="reg-company"
                        placeholder="请输入公司名称"
                        value={regCompanyName}
                        onChange={e => setRegCompanyName(e.target.value)}
                        required
                        className="px-3"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-normal">密码</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPwd ? 'text' : 'password'}
                        placeholder="至少8位密码"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        minLength={8}
                        required
                        className="px-3 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowRegPwd(v => !v)}
                        tabIndex={-1}
                      >
                        {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 min-h-12">
                    <Checkbox
                      id="agree"
                      checked={agreed}
                      onCheckedChange={v => setAgreed(!!v)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="agree" className="text-sm font-normal cursor-pointer text-muted-foreground leading-relaxed">
                      我已阅读并同意
                      <button type="button" className="text-primary hover:underline mx-1">用户协议</button>
                      和
                      <button type="button" className="text-primary hover:underline mx-1">隐私政策</button>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full h-9" disabled={regLoading || !agreed}>
                    {regLoading ? '注册中...' : '立即注册'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
