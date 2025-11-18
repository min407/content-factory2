'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Key, Eye, EyeOff, Save, CheckCircle, AlertCircle, ExternalLink, TestTube } from 'lucide-react'

export default function ApiKeySettings() {
  const { user, updateApiKey } = useAuth()
  const [apiKey, setApiKey] = useState(user?.apiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isTesting, setIsTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const success = updateApiKey(apiKey.trim())
      if (success) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
      return
    }

    setIsTesting(true)
    setTestStatus('idle')

    try {
      const response = await fetch('/api/search-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kw: 'test',
          userApiKey: apiKey.trim(),
          limit: 1
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTestStatus('success')
          setTimeout(() => setTestStatus('idle'), 3000)
        } else {
          setTestStatus('error')
          setTimeout(() => setTestStatus('idle'), 3000)
        }
      } else {
        setTestStatus('error')
        setTimeout(() => setTestStatus('idle'), 3000)
      }
    } catch (error) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">极致了API配置</h2>
        </div>
        {saveStatus === 'success' && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            已保存
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            保存失败
          </div>
        )}
        {testStatus === 'success' && (
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            连接成功
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            连接失败
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* 平台信息 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">极致了 数据平台</h3>
              <p className="text-sm text-gray-600">微信公众号文章数据采集与分析平台</p>
              <div className="mt-2">
                <a
                  href="https://dajiala.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  访问官网获取API Key
                </a>
              </div>
            </div>
            <Key className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* API Key 输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            极致了 API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入您的极致了API Key"
              className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            API Key 用于调用极致了平台的数据采集接口，请确保您有有效的访问权限。
          </p>
        </div>

        {/* 状态信息 */}
        {user?.apiKey ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">极致了 API Key 已配置</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              您可以使用选题分析功能，通过极致了平台进行数据采集和分析。
            </p>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">极致了 API Key 未配置</span>
            </div>
            <p className="text-yellow-600 text-sm mt-1">
              请配置您的极致了API Key才能使用选题分析功能。
            </p>
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {isTesting ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span>测试中...</span>
              </>
            ) : (
              <>
                <TestTube className="w-3 h-3" />
                <span>测试连接</span>
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>保存</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 帮助信息 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">如何获取极致了API Key？</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>访问 <a href="https://dajiala.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">极致了官网</a></li>
          <li>注册并登录极致了平台</li>
          <li>在个人中心或API管理页面找到API Key</li>
          <li>复制您的专属API Key</li>
          <li>将API Key填入上方输入框并保存</li>
        </ol>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>极致了API Key 用于访问微信公众号文章数据库，支持阅读量、点赞数、互动率等数据分析。
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          API Key 仅用于个人账户的数据访问，请妥善保管，不要分享给他人。
        </p>
      </div>
    </div>
  )
}