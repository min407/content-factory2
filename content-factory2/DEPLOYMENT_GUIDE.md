# Content Factory 部署指南

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
复制并配置环境变量：
```bash
cp .env.local.example .env.local
```

**必须配置的环境变量：**
```env
# OpenRouter API 配置
OPENAI_API_KEY=sk-or-v1-你的密钥
OPENAI_API_BASE=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o

# 微信公众号发布 API
WECHAT_API_KEY=你的密钥
WECHAT_API_BASE=https://wx.limyai.com/api/openapi

# AI图片生成 API
SILICONFLOW_API_KEY=你的密钥
SILICONFLOW_API_BASE=https://api.siliconflow.cn/v1/images/generations
SILICONFLOW_MODEL=Kwai-Kolors/Kolors

# 小红书搜索 API
NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY=你的密钥
NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_BASE=https://www.dajiala.com/fbmain/monitor/v3/xhs
```

### 3. 启动项目
```bash
npm run dev
```

访问 http://localhost:3000

## 功能说明

✅ **已修复的问题：**
- OpenRouter API "User not found" 错误
- 内容创作模块正常工作
- 公众号发布功能正常
- 图片生成功能支持用户配置

✅ **当前功能状态：**
- 选题分析：正常
- 内容创作：正常
- 批量发布：正常
- 单篇发布：正常
- 图片生成：使用 fallback 图片

## 部署注意事项

1. **环境变量完整性**：确保所有必需的 API 密钥都已配置
2. **端口占用**：默认使用 3000 端口，如果被占用会自动切换
3. **数据库**：项目使用本地存储，无需额外数据库配置
4. **用户认证**：通过本地存储管理用户状态

## 故障排除

如果遇到 "User not found" 错误：
1. 检查 OpenRouter API 密钥是否正确
2. 确认网络连接正常
3. 查看 `OPENAI_API_BASE` 是否设置为 `https://openrouter.ai/api/v1`

## 技术栈

- Next.js 16.0.3 (Turbopack)
- TypeScript
- OpenRouter API
- 本地存储数据库
- 响应式设计