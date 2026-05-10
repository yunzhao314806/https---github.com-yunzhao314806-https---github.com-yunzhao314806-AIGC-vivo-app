import React, { useCallback, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// 支持的文件格式
const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/csv': 'CSV',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
};
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.csv', '.xls', '.xlsx', '.txt'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  fileName: string;
  errorMsg: string;
}

interface ResumeUploaderProps {
  resumeId: string;
  onUploadComplete: (fileUrl: string, fileName: string, fileSize: number, fileType: string) => void;
}

export function ResumeUploader({ resumeId, onUploadComplete }: ResumeUploaderProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle', progress: 0, fileName: '', errorMsg: '',
  });

  const validateFile = (file: File): string | null => {
    const mimeOk = Object.keys(ACCEPTED_TYPES).includes(file.type);
    const extOk = ACCEPTED_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!mimeOk && !extOk) {
      return `不支持该文件格式，请上传 ${ACCEPTED_EXTENSIONS.join(' / ')} 格式的文件`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `文件大小不能超过 ${MAX_SIZE_MB}MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({ status: 'error', progress: 0, fileName: file.name, errorMsg: validationError });
      return;
    }

    setUploadState({ status: 'uploading', progress: 5, fileName: file.name, errorMsg: '' });

    // 构造文件路径：user_id/resume_id/filename（保证唯一性）
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const safeName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_');
    const filePath = `${user.id}/${resumeId}/${Date.now()}_${safeName}`;

    // 模拟进度 - Supabase 客户端上传不暴露进度回调，用定时器模拟
    let fakeProgress = 5;
    const progressTimer = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 15, 85);
      setUploadState(prev => ({ ...prev, progress: Math.round(fakeProgress) }));
    }, 200);

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    clearInterval(progressTimer);

    if (uploadError) {
      setUploadState({
        status: 'error', progress: 0, fileName: file.name,
        errorMsg: uploadError.message || '文件上传失败，请重试',
      });
      toast.error('文件上传失败');
      return;
    }

    // 获取私有文件的签名 URL（有效期1年）
    const { data: urlData, error: urlError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (urlError || !urlData) {
      setUploadState({
        status: 'error', progress: 0, fileName: file.name,
        errorMsg: '获取文件链接失败',
      });
      return;
    }

    setUploadState({ status: 'success', progress: 100, fileName: file.name, errorMsg: '' });
    toast.success('文件上传成功');

    const fileType = ACCEPTED_TYPES[file.type] || ext.replace('.', '').toUpperCase();
    onUploadComplete(urlData.signedUrl, file.name, file.size, fileType);
  }, [user, resumeId, onUploadComplete]);

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // 清空 input 以允许重复选同一文件
    e.target.value = '';
  };

  const handleReset = () => {
    setUploadState({ status: 'idle', progress: 0, fileName: '', errorMsg: '' });
  };

  return (
    <div className="space-y-3">
      {/* 拖拽区域 */}
      {uploadState.status === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors select-none',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
        >
          <Upload className={cn(
            'w-8 h-8 mx-auto mb-3 transition-colors',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
          <p className="text-sm font-medium text-foreground">
            {isDragging ? '松开鼠标上传文件' : '拖拽文件至此，或点击选择文件'}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            支持 PDF · Word（DOC/DOCX）· CSV · Excel · TXT，最大 {MAX_SIZE_MB}MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* 上传中 */}
      {uploadState.status === 'uploading' && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground truncate flex-1 min-w-0">
              {uploadState.fileName}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{uploadState.progress}%</span>
          </div>
          <Progress value={uploadState.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">正在上传，请稍候…</p>
        </div>
      )}

      {/* 上传成功 */}
      {uploadState.status === 'success' && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{uploadState.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">上传成功</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            title="重新上传"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 上传失败 */}
      {uploadState.status === 'error' && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
              {uploadState.fileName || '文件上传失败'}
            </p>
          </div>
          <p className="text-xs text-destructive pl-8">{uploadState.errorMsg}</p>
          <div className="pl-8">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReset}>
              重新选择
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
