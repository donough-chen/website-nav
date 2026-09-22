# Nav - 个人网址导航

一个功能完整的**纯前端**个人网址分类聚合导航平台，支持云端同步、公开发布、访问权限控制、深链接分享、PWA 离线使用。

零后端 · 数据自控 · 加密同步 · 一键部署


---

## ✨ 核心特性

### 📚 网址管理

- 卡片 / 列表 / 紧凑三种布局
- 分类聚合，支持拖拽排序
- 标签系统 + 评分 + 置顶 + 访问计数
- 自定义 Favicon 源（Google / DuckDuckGo / 自定义）
- 卡片支持长按、右滑置顶、左滑删除（移动端）
- 大数据量自动启用**虚拟滚动**（>100 项）

### 🔍 强大搜索

- 全局快捷键 `Ctrl+K` 唤起
- 模糊匹配（fuse.js）+ 高亮显示
- 拼音搜索友好
- 高级筛选：分类 / 标签 / 评分
- 搜索结果一键定位到卡片位置

### 🔐 访问权限控制

- **三种身份模式**：开放 / 访客（只读） / 管理员
- **隐蔽入口**：连续点击 Logo 10 次唤起密码框
- **会话管理**：支持记住 15 分钟 ~ 4 小时
- **空闲自动锁定**：可配置 5/15/30/60 分钟
- 密码错误 5 次锁定 30 秒
- 紧急重置机制（`delete-all-my-data` 校验）

### ☁ 云端同步

- 支持 **GitHub Gist** / **WebDAV** 两种后端
- 增量同步 + 冲突自动合并（tombstone 删除追踪）
- 凭证 **AES-GCM 加密**存储（主密码派生）
- 自动同步（30 秒防抖） + 手动同步

### 🌐 公开数据源

- Admin 可将数据发布到**公开 Gist**
- 访客**匿名拉取**（无需 Token，GitHub 60 次/小时限流）
- 支持**排除标签**（打上"私人"标签不公开）
- 三级配置：URL 参数 → 环境变量 → localStorage
- 自动发布（60 秒防抖） + ETag 缓存优化

### 📤 导入导出

- 支持格式：**JSON / Excel / CSV**
- 智能字段映射与冲突处理（跳过 / 覆盖 / 保留双份）
- **加密备份**：AES-GCM 加密的 JSON 文件
- 导入预览：显示新增 / 重复 / 无效数量

### 🔗 深链接分享

- 单个网址生成短链，通过 URL Hash 传递
- 二维码分享
- 接收方一键收藏，自动创建"收到的分享"分类
- 访客也可接收（不影响只读保护）

### 📊 数据统计

- 访问次数排行
- 分类分布饼图
- 标签词云
- 评分分布

### 📱 PWA 支持

- 离线可用（Service Worker 缓存）
- 可添加到主屏幕
- 自适应图标（Maskable Icon）
- 快捷方式（Shortcuts）

### 🎨 主题与国际化

- 明亮 / 暗黑 / 跟随系统
- 完全响应式（桌面 / 平板 / 移动端）
- 支持 `prefers-reduced-motion` 减弱动画

### ⚡ 性能优化

- Preact 极小体积（~10KB gzip）
- 组件级 memo + 图标懒加载（IntersectionObserver）
- 大列表虚拟滚动
- `content-visibility` 分类块懒渲染
- LocalStorage 写入 `requestIdleCallback` 空闲调度

---

## 🚀 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/donough-chen/website-nav.git
cd website-nav

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → 访问 http://localhost:5173

# 生成图标资源（首次或修改 assets/icon-source.svg 后）
npm run icons

# 构建生产版本
npm run build

# 本地预览生产版本
npm run preview
```

### 环境要求

- Node.js ≥ 18
- npm / pnpm / yarn 任一

---

## 📦 部署到 GitHub Pages

### 1. Fork 或克隆本仓库到你的 GitHub

### 2. 修改 `vite.config.ts` 的 base 路径

```typescript
export default defineConfig({
  base: '/your-repo-name/',  // 改为你的仓库名，末尾保留斜杠
  // ...
});
```

### 3. 配置 GitHub Pages

Settings → Pages → Source 选择 **GitHub Actions**

### 4. 配置工作流权限

Settings → Actions → General → Workflow permissions 选择 **Read and write permissions**

### 5. 创建部署工作流

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_PUBLIC_GIST_ID: ${{ vars.VITE_PUBLIC_GIST_ID }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

### 6. 推送触发部署

```bash
git add .
git commit -m "chore: setup deploy"
git push origin main
```

访问 `https://<your-username>.github.io/<your-repo-name>/`

---

## 🌐 公开数据源配置

若希望访客访问站点时能自动看到你发布的数据，有三种配置方式：

### 方式 A：URL 参数（临时分享）

管理员在应用内发布后，直接生成分享链接：

```
https://<your-username>.github.io/<your-repo-name>/?src=<GIST_ID>
```

**优点**：无需重新部署，可分发给指定人群
**缺点**：需带参数才能访问

### 方式 B：环境变量（推荐，永久生效）

1. 部署应用并访问，通过点击 Logo 10 次唤起密码框，设置管理员密码
2. 添加一些数据 → 打开设置 → 数据 → 配置云同步（GitHub Token 需 `gist` 权限）
3. 设置 → 数据 → 🌐 公开发布 → 点击「立即发布」
4. 复制生成的 **Gist ID**
5. 在仓库 **Settings → Secrets and variables → Actions → Variables** 新建变量：
   - Name：`VITE_PUBLIC_GIST_ID`
   - Value：`<GIST_ID>`
6. 推送任意提交触发重新部署
7. 访客访问根路径即可自动加载数据

> ⚠ 使用 **Variables** 而非 Secrets，因为构建产物本身会包含此值且公开

### 方式 C：本地存储（仅个人使用）

Admin 首次发布后，Gist ID 会自动存入 localStorage，同一浏览器再次访问会自动加载。

### 数据源解析优先级

```
URL 参数（?src=xxx） > 环境变量（VITE_PUBLIC_GIST_ID） > localStorage
```

---

## 🔐 使用指南：权限模式

### 三种模式对照

| 模式 | 触发条件 | 权限 | 适用场景 |
|------|---------|------|---------|
| **🔓 开放** | 未设置密码 | 完全开放 | 本地私人使用 |
| **👁 访客** | 已设密码，未解锁 | 只读浏览 + 访问计数 | 分享给他人查看 |
| **👑 管理员** | 密码解锁后 | 完全权限 | 编辑与配置 |

### 首次使用流程

1. **首次访问**：顶部显示欢迎横幅，可选：
   
   - 🔐 **设置密码**：立即进入管理员模式，之后需解锁
   - **跳过**：保持开放模式（适合本地私人使用）
2. **添加数据**：点击右上角 `+ 新增` 或右下角悬浮按钮
3. **设置云同步**（可选）：设置 → 数据 → 云同步
4. **发布公开数据源**（可选）：设置 → 数据 → 🌐 公开发布

### 唤起管理员密码框

设置密码后，需通过以下方式解锁：

- **主入口**（隐蔽）：连续点击左上角 Logo **10 次**（20 秒内）
- **备用入口**：设置 → 顶部访客区 → 🔓 解锁 按钮

### 会话管理

- **不记住会话**：关闭标签页即失效
- **记住 15/30/60/240 分钟**：sessionStorage 保存，窗口保持解锁状态
- **空闲自动锁定**：默认 30 分钟无操作自动锁定
- **主动锁定**：设置面板 → 立即锁定 或 Header 中 🔒 按钮

### 忘记密码

密码无法找回，可通过紧急重置清空所有数据重新开始：

1. 唤起解锁框 → 点击"忘记密码？"
2. 输入校验字符：`delete-all-my-data`
3. 确认后清空所有本地数据

---

## ☁ 云同步配置

### GitHub Gist（推荐）

1. 生成 Token：[GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 权限选择：仅需 `gist` 权限
3. 应用内 → 设置 → 数据 → 云同步 → GitHub Gist
4. 填入 Token（首次会要求主密码加密）
5. Gist ID 可留空，首次同步自动创建

### WebDAV

支持坚果云、Nextcloud、ownCloud 等：

1. 应用内 → 设置 → 数据 → 云同步 → WebDAV
2. 填入服务器 URL、用户名、密码
3. 建议使用应用专用密码（如坚果云需在账户设置中生成）

### 同步策略

- 数据变更后 **30 秒防抖**自动同步
- 主动触发：设置面板中的"立即同步"按钮
- 冲突解决：基于 `updatedAt` 时间戳的 last-write-wins
- 删除追踪：通过 tombstone 机制在多设备间同步删除

---

## 🎯 环境变量说明

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| `VITE_PUBLIC_GIST_ID` | 公开数据源 Gist ID | 否 |

### 使用方式

**本地开发**：复制 `.env.example` 为 `.env.local`

```bash
cp .env.example .env.local
```

**生产部署**：通过 GitHub Actions Variables 注入（见部署章节）

---

## ⌨ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` / `Cmd+K` | 打开搜索面板 |
| `Ctrl+Shift+A` / `Cmd+Shift+A` | 新增网址（访客会弹解锁框）|
| `ESC` | 关闭当前弹窗 |
| 长按卡片（移动端）| 弹出操作菜单 |
| 左滑卡片 | 删除（Admin，移动端）|
| 右滑卡片 | 置顶（Admin，移动端）|
| 点击 Logo × 10（20 秒内）| 唤起解锁框 |

---

## 📁 项目结构

```
nav/
├── assets/                    # 图标源文件
│   ├── icon-source.svg
│   ├── icon-maskable.svg
│   └── logo.svg
├── public/                    # 静态资源（自动生成）
│   ├── icons/
│   ├── favicon.ico
│   └── og-image.png
├── scripts/
│   └── generate-icons.mjs     # 图标生成脚本
├── src/
│   ├── adapters/
│   │   └── storage.ts         # LocalStorage / SessionStorage 封装
│   ├── components/            # 所有 UI 组件
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── SiteCard/
│   │   ├── SiteGrid/
│   │   ├── SiteForm/
│   │   ├── CategoryForm/
│   │   ├── SearchPanel/
│   │   ├── SettingsPanel/
│   │   ├── ImportDialog/
│   │   ├── SyncPanel/
│   │   ├── StatsPanel/
│   │   ├── ShareDialog/
│   │   ├── UnlockDialog/
│   │   ├── PasswordSetupDialog/
│   │   ├── PasswordPrompt/
│   │   ├── WelcomeBanner/
│   │   ├── AuthBadge/
│   │   ├── PublicPublishPanel/
│   │   ├── PublicSourceInfo/
│   │   ├── EmptyState/
│   │   ├── LazyIcon/
│   │   ├── LazySection/
│   │   ├── VirtualGrid/
│   │   ├── TagBar/
│   │   ├── Modal/
│   │   ├── Toast/
│   │   └── PWAPrompt/
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useIdleLock.ts
│   │   ├── useSecretTrigger.ts
│   │   ├── usePublicSource.ts
│   │   ├── useTheme.ts
│   │   ├── useShortcut.ts
│   │   ├── useGesture.ts
│   │   ├── useDragSort.ts
│   │   ├── useDragSite.ts
│   │   ├── useDropCategory.ts
│   │   ├── useLazyLoad.ts
│   │   └── useResponsive.ts
│   ├── services/              # 业务服务层
│   │   ├── authService.ts
│   │   ├── masterPassword.ts
│   │   ├── crypto.ts
│   │   ├── importer.ts
│   │   ├── exporter.ts
│   │   ├── share.ts
│   │   ├── publicSource.ts
│   │   └── sync/
│   │       ├── gist.ts
│   │       ├── webdav.ts
│   │       ├── merger.ts
│   │       └── scheduler.ts
│   ├── store/                 # 状态管理
│   │   ├── context.tsx
│   │   ├── reducer.ts
│   │   └── actions.ts
│   ├── styles/
│   │   └── global.css
│   ├── types/
│   │   └── index.ts
│   ├── utils/                 # 工具函数
│   │   ├── url.ts
│   │   ├── color.ts
│   │   ├── favicon.ts
│   │   ├── toast.ts
│   │   └── qrcode.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| **UI 框架** | [Preact](https://preactjs.com/) 10.x（React 兼容层） |
| **语言** | TypeScript 5.x |
| **构建工具** | [Vite](https://vitejs.dev/) 5.x |
| **PWA** | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| **状态管理** | useReducer + Context |
| **搜索** | [fuse.js](https://fusejs.io/) |
| **Excel 处理** | [SheetJS](https://sheetjs.com/) |
| **加密** | Web Crypto API（AES-GCM + PBKDF2） |
| **图标生成** | [sharp](https://sharp.pixelplumbing.com/) |
| **同步后端** | GitHub Gist API / WebDAV |

---

## 🔒 安全性说明

### 已实现的防护

- ✅ 访问权限 UI 层拦截（隐藏危险操作按钮）
- ✅ Action 层守卫（`requireAdmin` 拦截非法调用）
- ✅ 密码 AES-GCM 加密验证 + PBKDF2 密钥派生（10 万次迭代）
- ✅ 云同步凭证加密存储
- ✅ 失败次数限制 + 锁定倒计时
- ✅ 空闲自动锁定 + 会话过期

### 无法防御的场景

- ❌ 通过 DevTools 直接修改 LocalStorage
- ❌ 通过 Console 手动构造 dispatch 调用绕过 Action 守卫（部分场景）
- ❌ 恶意用户 Fork 代码本地修改运行

**本方案定位：** 防止普通访问者的误操作与恶意点击，属于**前端 UI 层保护**。适用于个人导航站分享场景，不适合高安全性需求。高安全场景请配合后端使用。

---

## 💾 数据模型

### Site 网址

```typescript
interface Site {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
  tags?: string[];
  rating?: number;         // 0-5
  pinned?: boolean;
  categoryId: string;
  createdAt: number;
  updatedAt: number;
  visitCount?: number;
}
```

### Category 分类

```typescript
interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
```

### 存储位置

| 数据 | 存储位置 | 加密 |
|------|---------|------|
| sites / categories | LocalStorage | ❌ |
| 用户偏好 settings | LocalStorage | ❌ |
| tombstones（删除追踪） | LocalStorage | ❌ |
| 云同步凭证 | LocalStorage | ✅ AES-GCM |
| 会话状态 | SessionStorage | ❌ |
| 密码 verifier | LocalStorage | ✅ AES-GCM |

---

## 🐛 常见问题

### Q: 部署后页面空白？

A: 检查 `vite.config.ts` 中的 `base` 是否与仓库名一致（如 `/nav/`）

### Q: 忘记密码怎么办？

A: 唤起解锁框 → 忘记密码？→ 输入 `delete-all-my-data` 清空数据

### Q: 云同步失败？

A: 检查 Token 权限是否包含 `gist`，WebDAV 检查 URL 是否以 `/` 结尾

### Q: 访客看不到我的数据？

A: 确保已在设置 → 数据 → 🌐 公开发布 中点击"立即发布"，或访问链接带上 `?src=<GIST_ID>`

### Q: 数据丢失了？

A: 数据存储在浏览器 LocalStorage，清除浏览器数据会丢失。建议开启云同步或定期导出备份

### Q: 图标不显示？

A: 部分域名的 Favicon 无法通过 Google/DuckDuckGo 服务获取，可手动指定图标 URL

### Q: 移动端加载慢？

A: 首次访问需下载图标，请稍等；再次访问会走 Service Worker 缓存

### Q: 如何自定义 Logo？

A: 替换 `assets/logo.svg` 文件即可，构建后自动应用

### Q: 如何自定义 PWA 图标？

A: 修改 `assets/icon-source.svg` 和 `assets/icon-maskable.svg`，运行 `npm run icons`

---

## 📝 开发脚本

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建（含图标自动生成）
npm run preview      # 本地预览生产版本
npm run icons        # 手动生成图标资源
npm run deploy       # 部署到 GitHub Pages（gh-pages 分支方式）
```

---

## 🗺 版本路线

### ✅ 已完成

- [x] 基础网址与分类管理
- [x] 搜索与筛选
- [x] 导入导出（JSON/Excel/CSV）
- [x] 云同步（Gist/WebDAV）
- [x] 深链接分享
- [x] PWA 支持
- [x] 访问权限控制
- [x] 公开数据源发布

### 🔮 未来可能

- [ ] Web Worker 分担搜索/加密计算
- [ ] 图标本地 IndexedDB 缓存
- [ ] 骨架屏优化
- [ ] 更多主题（自定义色彩）
- [ ] 多语言 i18n
- [ ] E2E 测试
- [ ] 数据版本历史与回滚

---

## 🤝 贡献

欢迎提 Issue 与 PR。开发前请：

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交更改：`git commit -m 'feat: add xxx'`
4. 推送到分支：`git push origin feature/xxx`
5. 提交 Pull Request

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Preact](https://preactjs.com/) - 极小体积的 React 兼容框架
- [Vite](https://vitejs.dev/) - 极速的构建工具
- [fuse.js](https://fusejs.io/) - 优秀的模糊搜索库
- [SheetJS](https://sheetjs.com/) - Excel 解析利器
- 灵感来源：各类开源导航站项目

---

<div align="center">

**如果本项目对你有帮助，欢迎 Star ⭐**

</div>
