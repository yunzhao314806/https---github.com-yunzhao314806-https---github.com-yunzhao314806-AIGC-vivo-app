// 创建管理员账号脚本
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('缺少环境变量 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ADMIN_USERNAME = 'admin_zhipin';
const ADMIN_PASSWORD = 'Zp@2026!Adm#Secure';
const ADMIN_EMAIL = `${ADMIN_USERNAME}@miaoda.com`;

async function createAdmin() {
  console.log('正在创建管理员账号...');

  // 1. 注册账号
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    options: {
      data: {
        username: ADMIN_USERNAME,
        display_name: '系统管理员',
        user_type: 'admin',
      }
    }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      console.log('管理员账号已存在，跳过创建');
    } else {
      console.error('创建账号失败:', signUpError.message);
      return;
    }
  }

  // 2. 更新role为admin
  if (authData?.user) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', user_type: 'admin' })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('更新角色失败:', updateError.message);
    } else {
      console.log('===========================================');
      console.log('管理员账号创建成功！');
      console.log('用户名:', ADMIN_USERNAME);
      console.log('密码:', ADMIN_PASSWORD);
      console.log('===========================================');
    }
  } else {
    // 账号已存在，尝试更新role
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', ADMIN_USERNAME)
      .maybeSingle();

    if (existingProfile) {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', user_type: 'admin' })
        .eq('id', existingProfile.id);
      console.log('管理员账号信息:');
      console.log('用户名:', ADMIN_USERNAME);
      console.log('密码:', ADMIN_PASSWORD);
    }
  }
}

createAdmin().catch(console.error);
