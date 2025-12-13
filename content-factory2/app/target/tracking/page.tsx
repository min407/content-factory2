'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  User,
  Eye,
  Heart,
  Clock,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle,
  Star,
  Calendar
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { withAuth } from '@/lib/auth-context'

interface TrackedAccount {
  id: number
  name: string
  wxid: string
  avatar: string
  fans: number
  avg_top_read: number
  avg_top_zan: number
  week_articles: number
  suitability_score: number
  last_update: string
  recent_articles: {
    id: number
    title: string
    reads: number
    likes: number
    publish_time: number
    url: string
  }[]
  status: 'active' | 'inactive' | 'error'
}

function TargetTrackingContent() {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all')
  const [updatingAccounts, setUpdatingAccounts] = useState<Set<number>>(new Set())

  // 获取追踪账号数据
  const fetchTrackedAccounts = async () => {
    try {
      const response = await fetch('/api/target-accounts')
      const result = await response.json()

      if (result.success) {
        // 转换数据结构并添加模拟的追踪信息
        const trackedAccounts = result.data.map((account: any) => ({
          ...account,
          last_update: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          recent_articles: generateMockArticles(account.name),
          status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'inactive' : 'error')
        }))

        setAccounts(trackedAccounts)
      }
    } catch (error) {
      console.error('获取追踪账号失败:', error)
    }
  }

  // 生成模拟文章数据
  const generateMockArticles = (authorName: string) => {
    const articles = []
    const count = Math.floor(Math.random() * 5) + 1

    for (let i = 0; i < count; i++) {
      articles.push({
        id: i + 1,
        title: `${authorName}的最新文章 ${i + 1}`,
        reads: Math.floor(Math.random() * 100000) + 1000,
        likes: Math.floor(Math.random() * 5000) + 100,
        publish_time: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        url: `https://mp.weixin.qq.com/s/mock_${Date.now()}_${i}`
      })
    }

    return articles
  }

  // 更新单个账号的数据
  const updateAccountData = async (accountId: number) => {
    setUpdatingAccounts(prev => new Set(prev).add(accountId))

    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 更新账号的最后更新时间和状态
      setAccounts(prev => prev.map(account => {
        if (account.id === accountId) {
          return {
            ...account,
            last_update: new Date().toISOString(),
            recent_articles: generateMockArticles(account.name),
            status: 'active'
          }
        }
        return account
      }))
    } catch (error) {
      console.error('更新账号数据失败:', error)

      // 更新状态为错误
      setAccounts(prev => prev.map(account => {
        if (account.id === accountId) {
          return { ...account, status: 'error' }
        }
        return account
      }))
    } finally {
      setUpdatingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  // 批量更新所有账号
  const updateAllAccounts = async () => {
    const accountIds = accounts.map(account => account.id)
    await Promise.all(accountIds.map(id => updateAccountData(id)))
  }

  useEffect(() => {
    fetchTrackedAccounts()
  }, [])

  // 过滤账号
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = !searchTerm ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || account.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'inactive':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'inactive':
        return '不活跃'
      case 'error':
        return '错误'
      default:
        return '未知'
    }
  }

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number'
      ? new Date(timestamp * 1000)
      : new Date(timestamp)
    return date.toLocaleDateString('zh-CN')
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays}天前`
    } else if (diffHours > 0) {
      return `${diffHours}小时前`
    } else {
      return '刚刚'
    }
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/target/analysis" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-7 h-7 mr-3 text-purple-600" />
                对标追踪
              </h1>
              <p className="text-gray-500 mt-1">
                实时监控对标账号的动态和表现
              </p>
            </div>
          </div>

          <button
            onClick={updateAllAccounts}
            disabled={updatingAccounts.size > 0}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${updatingAccounts.size > 0 ? 'animate-spin' : ''}`} />
            <span>全部更新</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">活跃账号</p>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">不活跃账号</p>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.status === 'inactive').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">错误账号</p>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.status === 'error').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">本周文章</p>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.reduce((sum, account) => sum + account.week_articles, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索账号名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="active">活跃</option>
              <option value="inactive">不活跃</option>
              <option value="error">错误</option>
            </select>
          </div>
        </div>
      </div>

      {/* 账号列表 */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500 mb-2">暂无追踪的账号</p>
            <Link href="/target/analysis" className="inline-flex items-center text-purple-600 hover:text-purple-700">
              去添加对标账号
            </Link>
          </div>
        ) : (
          filteredAccounts.map(account => (
            <div key={account.id} className="bg-white rounded-xl p-6 border border-gray-200">
              {/* 账号信息头部 */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  {account.avatar && (
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="w-16 h-16 rounded-lg"
                    />
                  )}
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                      {getStatusIcon(account.status)}
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {getStatusText(account.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">微信ID: {account.wxid}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>粉丝: {account.fans.toLocaleString()}</span>
                      <span>平均阅读: {account.avg_top_read.toLocaleString()}</span>
                      <span>周发文: {account.week_articles}</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="ml-1">{account.suitability_score}分</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">最后更新</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTimeAgo(account.last_update)}
                    </p>
                  </div>
                  <button
                    onClick={() => updateAccountData(account.id)}
                    disabled={updatingAccounts.has(account.id)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${updatingAccounts.has(account.id) ? 'animate-spin' : ''}`} />
                    <span>更新</span>
                  </button>
                </div>
              </div>

              {/* 最新文章 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    最新文章
                  </h4>
                  <span className="text-sm text-gray-500">
                    共 {account.recent_articles.length} 篇
                  </span>
                </div>

                {account.recent_articles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>暂无最近文章</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {account.recent_articles.map(article => (
                      <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-gray-900 truncate">{article.title}</h5>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {article.reads.toLocaleString()}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              {article.likes.toLocaleString()}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(article.publish_time)}
                            </span>
                          </div>
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          查看
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default withAuth(function TargetTrackingPage() {
  return (
    <DashboardLayout>
      <TargetTrackingContent />
    </DashboardLayout>
  )
})