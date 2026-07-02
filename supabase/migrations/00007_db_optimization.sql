-- ============================================================
-- 00007_db_optimization.sql
-- 数据库性能与完整性优化
--   1. 索引（高频查询字段 + 复合索引）
--   2. capability_data 的 updated_at 触发器
--   3. mock_interview_messages 的 DELETE 策略
--   4. mock_interview_reports 的 UPDATE 策略
-- ============================================================

-- ============================================================
-- 1. 索引优化
-- ============================================================
-- 注：主键和外键 Supabase 已自动建索引，这里补充业务查询字段

-- resumes：按用户查简历（高频）
CREATE INDEX IF NOT EXISTS idx_resumes_profile_id ON resumes (profile_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes (is_primary);

-- jobs：企业查自己职位（高频）
CREATE INDEX IF NOT EXISTS idx_jobs_enterprise_id ON jobs (enterprise_id);
-- jobs：求职者按状态+行业+地点搜职位（最高频，复合索引）
CREATE INDEX IF NOT EXISTS idx_jobs_status_industry ON jobs (status, industry);
CREATE INDEX IF NOT EXISTS idx_jobs_status_location ON jobs (status, location);
-- jobs：按薪资范围筛选
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs (salary_min, salary_max);
-- jobs：按创建时间排序（最新职位）
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);

-- applications：企业查自己职位的申请（高频）
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);
-- applications：求职者查自己的申请（高频）
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications (applicant_id);
-- applications：按状态筛选（看板视图）
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

-- messages：聊天列表（高频）
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages (receiver_id);
-- messages：按时间排序 + 未读筛选
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages (receiver_id, is_read, created_at DESC);

-- mock_interviews：查面试历史（中频）
CREATE INDEX IF NOT EXISTS idx_mock_interviews_profile_id ON mock_interviews (profile_id);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_status ON mock_interviews (status);

-- mock_interview_messages：查面试对话（中频）
CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_interview_id ON mock_interview_messages (interview_id);
-- 复合索引：按题号+追问轮次排序
CREATE INDEX IF NOT EXISTS idx_mock_interview_messages_q_followup ON mock_interview_messages (interview_id, question_index, follow_up_round);

-- mock_interview_reports：查报告
CREATE INDEX IF NOT EXISTS idx_mock_interview_reports_interview_id ON mock_interview_reports (interview_id);
CREATE INDEX IF NOT EXISTS idx_mock_interview_reports_profile_id ON mock_interview_reports (profile_id);

-- favorites：收藏列表（中频）
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

-- ai_conversations：AI 对话历史（中频）
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_type ON ai_conversations (session_type);

-- capability_data：查能力数据（已 UNIQUE(profile_id)，但补一个显式索引）
-- UNIQUE 约束会自动建索引，这里跳过

-- ============================================================
-- 2. 补 capability_data 的 updated_at 触发器
-- ============================================================
CREATE TRIGGER update_capability_data_updated_at
  BEFORE UPDATE ON capability_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. 补 mock_interview_messages 的 DELETE 策略
-- ============================================================
-- 原来只有 SELECT 和 INSERT，用户无法手动删除面试消息
CREATE POLICY "用户可删除自己面试的消息" ON mock_interview_messages
  FOR DELETE TO authenticated
  USING (can_access_interview(interview_id));

-- ============================================================
-- 4. 补 mock_interview_reports 的 UPDATE 策略
-- ============================================================
-- 原来只有 SELECT 和 INSERT，重新生成报告会失败
CREATE POLICY "用户可更新自己的报告" ON mock_interview_reports
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================================
-- 5. 补充：mock_interview_reports 的 DELETE 策略
-- ============================================================
-- 允许用户删除自己的报告（配合重新生成场景）
CREATE POLICY "用户可删除自己的报告" ON mock_interview_reports
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());
