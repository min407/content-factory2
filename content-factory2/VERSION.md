# 对标分析功能设计版本记录

## 版本信息
**版本**: 1.0.0-Alpha
**时间**: 2025-01-13
**状态**: 设计完成，API已集成，准备开发

## 🎯 功能概述

对标分析系统是一个独立的微信内容对标和分析工具，旨在帮助内容创作者：
- 发现爆款文章和优质作者
- 深度分析文章结构和成功要素
- 建立个人对标库
- 基于对标内容优化创作

## 📋 核心功能模块

### 1. 🔍 智能对标分析页面
**路由**: `/target/analysis`

**功能特性**:
- 关键词搜索微信文章
- 多维度爆款筛选（阅读量、发布时间、作者规模）
- 文章优先的展示方式（作者信息作为补充）
- 一键收藏对标文章和账号
- 跳转原文和作者详情

**核心界面**:
```
🔍 搜索框 → 🎛️ 筛选器 → 📄 爆款文章列表 → 🎯 操作按钮
```

### 2. 📊 作者详情弹窗
**触发**: 点击文章的"作者详情"按钮

**展示数据**:
- 基本信息：头像、名称、简介、二维码
- 粉丝数据：预计粉丝数、极致了指数
- 内容数据：头条平均阅读/点赞、周发文量
- 活跃度：最新发文时间、活跃度等级
- 对标适合度：综合评分（0-100分）+ 建议理由

### 3. 📄 爆款文章深度分析页面
**路由**: `/target/article/:id`

**分析维度**:
- **爆款因子分析**：标题吸引力、内容价值度、情感共鸣度
- **文章结构拆解**：开头引入 → 核心内容 → 结尾总结
- **优点识别**：选题、结构、标题、价值点分析
- **缺点分析**：不足之处 + 改进机会点
- **二创优化建议**：标题角度、内容优化、人群定位

### 4. 📋 对标库管理页面
**路由**: `/target/library`

**管理模块**:
- **对标文章**：已收藏的爆款文章列表 + 分析报告
- **对标账号**：已收藏的优质作者 + 实时数据
- **分析报告**：自动生成的爆款分析总结
- **一键创作**：基于对标内容直接进入创作流程

### 5. 📈 对标追踪页面
**路由**: `/target/tracking`

**监控功能**:
- **实时监控**：跟踪对标账号最新动态
- **数据变化**：阅读量、点赞数、发布频率变化追踪
- **趋势分析**：对标账号发展态势分析
- **手动更新**：支持手动刷新追踪数据

## 🔧 技术实现方案

### API集成情况

| API类型 | 接口地址 | 功能描述 | 状态 |
|---------|---------|---------|------|
| **文章搜索** | `/fbmain/monitor/v3/kw_search` | 搜索微信文章 | ✅ 已有 |
| **文章详情** | `/fbmain/monitor/v3/article_html` | 获取完整文章内容 | ✅ 新增 |
| **公众号详情** | `/fbmain/monitor/v3/Keyverifycode` | 获取公众号详细信息 | ✅ 新增 |

### 数据库设计

```sql
-- 对标账号表
CREATE TABLE target_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 公众号名称
  wxid TEXT,                            -- 微信ID
  ghid TEXT,                            -- 原始ID
  avatar TEXT,                          -- 头像
  fans INTEGER,                         -- 预计粉丝数
  jzl_index INTEGER,                    -- 极致了指数
  avg_top_read INTEGER,                 -- 头条平均阅读
  avg_top_zan INTEGER,                  -- 头条平均点赞
  week_articles INTEGER,                -- 周发文量
  suitability_score INTEGER,            -- 适合度评分
  activity_level TEXT,                  -- 活跃度等级
  tags TEXT,                           -- 标签 (JSON数组)
  collected_at INTEGER,                -- 收藏时间
  last_updated INTEGER,                -- 最后更新时间
  is_tracking BOOLEAN DEFAULT 1        -- 是否在追踪
);

-- 对标文章表
CREATE TABLE target_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,                  -- 所属账号ID
  title TEXT NOT NULL,                 -- 文章标题
  url TEXT,                           -- 文章链接
  content TEXT,                       -- 文章内容
  reads INTEGER,                      -- 阅读量
  likes INTEGER,                      -- 点赞数
  publish_time INTEGER,               -- 发布时间
  reason TEXT,                        -- 收藏理由
  key_points TEXT,                    -- 学习要点 (JSON数组)
  tags TEXT,                          -- 标签
  analysis_data TEXT,                 -- 分析数据 (JSON)
  collected_at INTEGER,               -- 收藏时间
  FOREIGN KEY (account_id) REFERENCES target_accounts(id)
);

-- 追踪记录表
CREATE TABLE tracking_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,                  -- 账号ID
  fans INTEGER,                        -- 当时的粉丝数
  avg_reads INTEGER,                   -- 当时平均阅读
  week_articles INTEGER,               -- 当时周发文
  jzl_index INTEGER,                   -- 当时极致了指数
  tracked_at INTEGER,                  -- 追踪时间
  changes TEXT,                        -- 变化记录 (JSON)
  FOREIGN KEY (account_id) REFERENCES target_accounts(id)
);
```

### 核心算法

#### 对标适合度评分算法 (100分制)
```typescript
function calculateSuitabilityScore(account: AccountInfo): number {
  let score = 0;

  // 粉丝数量 (25分)
  score += fans > 100000 ? 25 : fans > 50000 ? 20 : fans > 10000 ? 15 : 10;

  // 头条平均阅读量 (25分)
  score += avgRead > 50000 ? 25 : avgRead > 20000 ? 20 : avgRead > 10000 ? 15 : 10;

  // 活跃度 (20分)
  score += activityLevel === 'high' ? 20 : activityLevel === 'medium' ? 15 : 10;

  // 内容产出能力 (15分)
  score += weekArticles >= 7 ? 15 : weekArticles >= 5 ? 12 : weekArticles >= 3 ? 10 : 7;

  // 互动率 (15分)
  score += engagementRate >= 10 ? 15 : engagementRate >= 7 ? 12 : engagementRate >= 5 ? 10 : 7;

  return Math.min(score, 100);
}
```

#### 文章结构分析算法
```typescript
// 标题技巧识别
function analyzeTitleTechniques(title: string) {
  const techniques = [];
  if (/震惊|惊呆|没想到/.test(title)) techniques.push('震惊体');
  if (/\d+个|\d+种|\d+万/.test(title)) techniques.push('数字党');
  if (/赚钱|省钱|增收|理财/.test(title)) techniques.push('利益点');
  // ... 更多技巧识别
  return techniques;
}

// 内容结构解析
function parseContentStructure(html: string) {
  // 解析HTML结构，识别开头、主体、结尾
  // 分析字数分布、段落逻辑
  // 提取关键信息和案例
}
```

## 📁 文件结构

```
/Users/min/content-factory2/
├── app/
│   ├── target/                        # 新增对标分析模块
│   │   ├── analysis/page.tsx         # 智能对标分析页面
│   │   ├── article/[id]/page.tsx     # 文章详情分析页面
│   │   ├── library/page.tsx          # 对标库管理页面
│   │   └── tracking/page.tsx         # 对标追踪页面
│   └── api/                          # 新增API接口
│       ├── target-accounts/route.ts  # 对标账号管理API
│       ├── target-articles/route.ts  # 对标文章管理API
│       └── tracking/route.ts         # 追踪数据API
├── lib/
│   ├── wechat-api.ts                 # 现有：文章搜索API
│   ├── wechat-detail-api.ts          # 新增：文章详情API
│   ├── wechat-account-api.ts         # 新增：公众号详情API
│   └── target-analysis.ts            # 新增：对标分析算法
├── types/
│   ├── wechat-api.ts                 # 现有：微信API类型
│   └── target-analysis.ts            # 新增：对标分析类型
└── VERSION.md                        # 本版本记录文件
```

## 🎯 核心工作流程

### 1. 智能对标流程
```
搜索关键词 → 获取文章列表 → 爆款筛选 → 作者聚合 → 获取作者详情 → 计算适合度 → 排序展示
```

### 2. 深度分析流程
```
选择爆款文章 → 获取完整内容 → 结构分析 → 爆款因子识别 → 优缺点分析 → 二创建议生成
```

### 3. 对标管理流程
```
收藏文章/账号 → 存储到对标库 → 定期追踪更新 → 数据变化提醒 → 基于对标创作
```

### 4. 创作集成流程
```
对标库选择 → 内容提取 → 跳转创作页面 → 自动填充背景 → 应用学习要点 → 开始创作
```

## 📋 待办事项

### Phase 1: 基础功能 (优先级: 高)
- [ ] 扩展菜单栏，添加"对标分析"分组
- [ ] 创建智能对标分析页面 (`/target/analysis`)
- [ ] 实现爆款文章列表展示和筛选功能
- [ ] 集成作者详情弹窗
- [ ] 实现基础的收藏功能

### Phase 2: 深度分析 (优先级: 中)
- [ ] 实现文章结构分析功能
- [ ] 创建爆款文章深度分析页面 (`/target/article/[id]`)
- [ ] 开发对标库管理页面 (`/target/library`)
- [ ] 实现分析报告生成

### Phase 3: 追踪系统 (优先级: 低)
- [ ] 实现对标追踪页面 (`/target/tracking`)
- [ ] 开发数据追踪和变化监控
- [ ] 添加手动/自动更新功能
- [ ] 集成创作模块，实现基于对标的内容创作

## 📝 说明

- 本设计保持了现有功能完全不变，新增独立对标管理系统
- API Key: `JZL134dc4c7b7886079` (所有API通用)
- 数据库采用SQLite，复用现有数据库架构
- 前端继续使用React + TypeScript + Tailwind CSS
- 后端API基于Next.js的API Routes

## 📞 联系信息

如有任何问题或需要调整设计，请联系当前开发者。

---

**保存时间**: 2025-01-13
**保存者**: Claude Code Assistant
**版本**: 1.0.0-Alpha