'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-500 mt-1">管理您的账户和系统配置</p>
      </div>

      <div className="space-y-6">
        {/* API配置指导 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API配置指导</h2>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">重要提示</h3>
              <p className="text-yellow-700 text-sm">
                本应用已简化配置管理，所有API密钥通过环境变量文件 .env.local 进行配置。
                请在项目根目录的 .env.local 文件中设置您的API密钥。
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">配置步骤</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>在项目根目录找到或创建 <code className="bg-gray-100 px-1 rounded">.env.local</code> 文件</li>
                <li>添加以下配置项并替换为您的实际API密钥：</li>
              </ol>
            </div>

            {/* 配置示例 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">配置示例</h4>
              <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`# OpenAI API Configuration (用于AI分析)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# 极致了API Configuration (用于公众号文章采集)
JIZHILE_API_KEY=your_jizhile_api_key_here
JIZHILE_API_BASE=https://www.dajiala.com/fbmain/monitor/v3/kw_search`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">如何获取API密钥</h3>
              <div className="space-y-3 text-sm">
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-1">OpenAI API密钥</h4>
                  <p className="text-gray-600">
                    访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI API Keys页面</a>，
                    登录后创建新的API密钥。用于AI智能分析功能。
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-1">极致了API密钥</h4>
                  <p className="text-gray-600">
                    联系极致了数据平台管理员申请访问权限，或登录对应的数据服务平台获取API密钥。
                    用于公众号文章数据采集功能。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 账户信息 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">账户信息</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <p className="text-gray-900">{user.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">注册时间</label>
              <p className="text-gray-900">
                {new Date(user.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            {user.lastLoginAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最后登录</label>
                <p className="text-gray-900">
                  {new Date(user.lastLoginAt).toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 系统信息 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">系统信息</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">版本</span>
              <span className="text-gray-900">v1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">配置方式</span>
              <span className="text-gray-900">环境变量</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">AI分析</span>
              <span className="text-gray-900">OpenAI GPT支持</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">数据源</span>
              <span className="text-gray-900">极致了公众号数据</span>
            </div>
          </div>
        </div>

        {/* 使用帮助 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">使用帮助</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">配置完成后如何生效？</h3>
              <p>修改 .env.local 文件后，需要重启应用服务才能生效：</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>停止当前运行的服务 (Ctrl+C)</li>
                <li>重新运行 <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                <li>等待服务启动完成即可使用</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">安全提示</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>请勿将 .env.local 文件提交到版本控制系统</li>
                <li>妥善保管您的API密钥，不要分享给他人</li>
                <li>建议定期更换API密钥以确保安全</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">常见问题</h3>
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-gray-900">Q: AI分析功能无法使用？</p>
                  <p>A: 请检查OpenAI API密钥是否正确配置，并确保账户有足够的余额。</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Q: 无法获取公众号文章？</p>
                  <p>A: 请确认极致了API密钥是否正确，以及网络连接是否正常。</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Q: 配置修改后没有生效？</p>
                  <p>A: 重启应用服务，确保环境变量被正确加载。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}