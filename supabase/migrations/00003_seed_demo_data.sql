
-- 插入示例行业能力树数据（用于展示）
-- 插入示例职位数据将在企业账号创建后进行，这里先创建能力树模板参考数据表
CREATE TABLE public.industry_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL UNIQUE,
  label text NOT NULL,
  radar_axes jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_tree jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.industry_templates (industry, label, radar_axes, skill_tree) VALUES
('tech', '互联网/科技', 
  '["编程技能","系统设计","数据分析","项目管理","沟通协作","学习能力"]'::jsonb,
  '{"name":"技术能力","children":[{"name":"编程语言","children":[{"name":"Python"},{"name":"Java"},{"name":"JavaScript"},{"name":"Go"}]},{"name":"框架工具","children":[{"name":"React"},{"name":"Vue"},{"name":"Spring"},{"name":"FastAPI"}]},{"name":"数据库","children":[{"name":"MySQL"},{"name":"PostgreSQL"},{"name":"Redis"},{"name":"MongoDB"}]},{"name":"云原生","children":[{"name":"Docker"},{"name":"Kubernetes"},{"name":"CI/CD"}]}]}'::jsonb
),
('finance', '金融/投资',
  '["财务分析","风险管理","投资研究","数据建模","合规知识","市场洞察"]'::jsonb,
  '{"name":"金融能力","children":[{"name":"基础技能","children":[{"name":"财务分析"},{"name":"估值建模"},{"name":"Excel/VBA"}]},{"name":"专业领域","children":[{"name":"股票研究"},{"name":"固定收益"},{"name":"衍生品"}]},{"name":"监管合规","children":[{"name":"风险控制"},{"name":"合规管理"}]}]}'::jsonb
),
('manufacturing', '制造业',
  '["生产管理","质量控制","供应链","技术工艺","安全管理","成本控制"]'::jsonb,
  '{"name":"制造能力","children":[{"name":"生产运营","children":[{"name":"精益生产"},{"name":"Six Sigma"},{"name":"ERP系统"}]},{"name":"质量管理","children":[{"name":"ISO认证"},{"name":"SPC统计"},{"name":"检测技术"}]}]}'::jsonb
),
('education', '教育培训',
  '["课程设计","教学技巧","学员管理","内容研发","评估反馈","技术工具"]'::jsonb,
  '{"name":"教育能力","children":[{"name":"教学能力","children":[{"name":"课程开发"},{"name":"培训设计"},{"name":"互动教学"}]},{"name":"管理能力","children":[{"name":"班级管理"},{"name":"绩效评估"}]}]}'::jsonb
),
('medical', '医疗健康',
  '["临床技能","医学知识","患者沟通","科研能力","法规遵从","团队协作"]'::jsonb,
  '{"name":"医疗能力","children":[{"name":"临床技能","children":[{"name":"诊断治疗"},{"name":"手术技能"},{"name":"急救处理"}]},{"name":"专业知识","children":[{"name":"医学基础"},{"name":"药理学"},{"name":"病理学"}]}]}'::jsonb
),
('other', '其他行业',
  '["专业技能","沟通表达","团队协作","问题解决","学习能力","执行力"]'::jsonb,
  '{"name":"通用能力","children":[{"name":"核心技能","children":[{"name":"沟通协作"},{"name":"项目管理"},{"name":"数据分析"}]},{"name":"软技能","children":[{"name":"领导力"},{"name":"创新思维"}]}]}'::jsonb
);
