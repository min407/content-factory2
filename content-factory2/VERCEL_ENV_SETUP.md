# Vercel 环境变量配置指南

## 🚨 重要提醒
在 Vercel 部署时，只有以 `NEXT_PUBLIC_` 开头的环境变量会在客户端（浏览器）中可用。
服务器端环境变量不需要此前缀。

## 📋 需要在 Vercel 中配置的环境变量

### 🔑 OpenAI API (OpenRouter)
```
OPENAI_API_KEY=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
OPENAI_API_BASE=https://openrouter.ai/api/v1
```

### 🎨 SiliconFlow (AI图片生成)
```
SILICONFLOW_API_KEY=sk-vikxdjnhqciuhqevdvpvirsccidnkpckrehyuupklsxsihup
SILICONFLOW_API_BASE=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Kwai-Kolors/Kolors
```

### 📱 小红书搜索API
```
NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_KEY=JZL134dc4c7b7886079
NEXT_PUBLIC_XIAOHONGSHU_SEARCH_API_BASE=https://www.dajiala.com/fbmain/monitor/v3/xhs
```

### 📱 小红书详情API (如果需要)
```
NEXT_PUBLIC_XIAOHONGSHU_DETAIL_API_KEY=
NEXT_PUBLIC_XIAOHONGSHU_DETAIL_API_BASE=https://api.meowload.net/openapi/extract/post
```

### 📧 微信公众号发布API
```
WECHAT_API_KEY=xhs_ece2ac77bf86495442d51095ac9ffcc1
WECHAT_API_BASE=https://wx.limyai.com/api/openapi
```

## 🔧 Vercel 配置步骤

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的项目设置
3. 点击 "Environment Variables"
4. 逐个添加上面的环境变量

## 🚀 部署命令

确保你的 vercel.json 配置正确：

```json
{
  "buildCommand": "NODE_OPTIONS='--max-old-space-size=4096' npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## ⚠️ 常见问题解决

### 1. API调用失败
- 检查环境变量是否正确复制（不要有多余的空格）
- 确认API密钥是否有效且未过期

### 2. 构建失败
- 检查 package.json 中的构建脚本
- 确认所有依赖都已安装

### 3. 图片生成失败
- 确认 SiliconFlow API密钥配置正确
- 检查模型名称是否匹配

## 🎯 验证部署

部署成功后，访问你的 Vercel URL，检查：
- [ ] 页面正常加载
- [ ] API设置页面能正常访问
- [ ] 测试API连接功能
- [ ] 尝试生成文章或分析