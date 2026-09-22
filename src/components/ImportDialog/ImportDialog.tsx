import { useState, useRef } from 'preact/hooks';
import { useApp } from '@/store/context';
import { Modal } from '../Modal/Modal';
import { PasswordPrompt } from '../PasswordPrompt/PasswordPrompt';
import { parseFile, previewImport, applyImport, type ImportPreview, type ConflictStrategy } from '@/services/importer';
import { toast } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';
import './ImportDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: Props) {
  const { canEdit } = useAuth();
  const { state, dispatch } = useApp();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [strategy, setStrategy] = useState<ConflictStrategy>('skip');
  const [dragOver, setDragOver] = useState(false);
  const [pwPromptOpen, setPwPromptOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (open && !canEdit) {
    return (
      <Modal open={open} title="批量导入" onClose={onClose} width={600}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <div style={{ marginTop: 12 }}>批量导入为管理员功能</div>
        </div>
      </Modal>
    );
  }

  // ✅ 使用 useRef 持久化 resolver，跨渲染稳定
  const pwResolverRef = useRef<((v: string | null) => void) | null>(null);

  const promptPassword = (): Promise<string | null> => {
    return new Promise(resolve => {
      pwResolverRef.current = resolve;
      setPwPromptOpen(true);
    });
  };

  const handlePwSubmit = (pw: string) => {
    const resolver = pwResolverRef.current;
    pwResolverRef.current = null;
    setPwPromptOpen(false);
    resolver?.(pw);
  };

  const handlePwCancel = () => {
    const resolver = pwResolverRef.current;
    pwResolverRef.current = null;
    setPwPromptOpen(false);
    resolver?.(null);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseFile(file, promptPassword);
      const pv = previewImport(parsed, state.sites, state.categories);
      setPreview(pv);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    const result = applyImport(preview, strategy);

    if (result.newCategories.length > 0) {
      for (const c of result.newCategories) {
        dispatch({ type: 'ADD_CATEGORY', payload: c });
      }
    }
    if (result.addedSites.length > 0) {
      dispatch({ type: 'BATCH_ADD_SITES', payload: result.addedSites });
    }
    if (result.updatedSites.length > 0) {
      dispatch({ type: 'BATCH_UPDATE_SITES', payload: result.updatedSites });
    }
    toast.success(`导入完成：新增 ${result.addedSites.length}，更新 ${result.updatedSites.length}，新分类 ${result.newCategories.length}`);
    setPreview(null);
    onClose();
  };

  const reset = () => setPreview(null);

  const handleClose = () => {
    // 关闭主对话框时如果还有挂起的密码 promise，取消掉
    if (pwResolverRef.current) {
      pwResolverRef.current(null);
      pwResolverRef.current = null;
    }
    setPreview(null);
    setPwPromptOpen(false);
    onClose();
  };

  return (
    <>
      <Modal open={open} title="批量导入" onClose={handleClose} width={600}
        footer={preview ? (
          <>
            <button class="btn btn-ghost" onClick={reset}>重新选择</button>
            <button class="btn btn-primary" onClick={handleConfirm}>确认导入</button>
          </>
        ) : null}>
        {!preview ? (
          <>
            <div
              class={`drop-zone ${dragOver ? 'drag-over' : ''} ${parsing ? 'parsing' : ''}`}
              onClick={() => !parsing && inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div class="drop-icon">{parsing ? '⏳' : '📥'}</div>
              <div class="drop-title">{parsing ? '解析中...' : '点击选择或拖入文件'}</div>
              <div class="drop-hint">支持 JSON / Excel (.xlsx) / CSV（自动识别加密备份）</div>
              <input
                ref={inputRef}
                type="file"
                accept=".json,.xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                  (e.target as HTMLInputElement).value = ''; // 允许重复选择同一文件
                }}
              />
            </div>
            <div class="format-hint">
              <strong>格式说明：</strong>
              <ul>
                <li><b>JSON</b>：<code>{`{"categories":[...], "sites":[...]}`}</code> 或简单数组，加密备份会自动提示输入密码</li>
                <li><b>Excel/CSV</b>：列名支持「名称/网址/分类/描述/标签/评分/图标」或英文</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div class="preview-stats">
              <div class="stat"><span class="stat-num">{preview.toAdd.length}</span><span>新增</span></div>
              <div class="stat"><span class="stat-num">{preview.duplicates.length}</span><span>重复</span></div>
              <div class="stat"><span class="stat-num">{preview.newCategories.length}</span><span>新分类</span></div>
              {preview.invalidCount > 0 && (
                <div class="stat error"><span class="stat-num">{preview.invalidCount}</span><span>无效</span></div>
              )}
            </div>

            {preview.duplicates.length > 0 && (
              <div class="strategy-group">
                <div class="strategy-title">重复项处理方式：</div>
                {[
                  { v: 'skip', label: '跳过', desc: '保留原有数据' },
                  { v: 'overwrite', label: '覆盖', desc: '使用新数据替换' },
                  { v: 'keepBoth', label: '保留两者', desc: '新增为副本' },
                ].map(o => (
                  <label key={o.v} class="strategy-option">
                    <input type="radio" name="strategy" value={o.v}
                      checked={strategy === o.v}
                      onChange={() => setStrategy(o.v as ConflictStrategy)} />
                    <span><b>{o.label}</b> - {o.desc}</span>
                  </label>
                ))}
              </div>
            )}

            <div class="preview-list">
              <div class="preview-title">新增预览（前 10 条）：</div>
              {preview.toAdd.slice(0, 10).map(s => (
                <div key={s.id} class="preview-item">
                  <span class="preview-name">{s.name}</span>
                  <span class="preview-url">{s.url}</span>
                </div>
              ))}
              {preview.duplicates.length > 0 && (
                <>
                  <div class="preview-title">重复项（前 5 条）：</div>
                  {preview.duplicates.slice(0, 5).map((d, i) => (
                    <div key={i} class="preview-item dup">
                      <span class="preview-name">{d.imported.name}</span>
                      <span class="preview-url">{d.imported.url}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </Modal>

      <PasswordPrompt
        open={pwPromptOpen}
        title="输入解密密码"
        hint="此备份文件已加密，请输入创建时使用的密码"
        onSubmit={handlePwSubmit}
        onCancel={handlePwCancel}
      />
    </>
  );
}