'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Database,
  FileText,
  User,
  Eye,
  Heart,
  Clock,
  Trash2,
  Search,
  Filter,
  Plus,
  Star,
  TrendingUp,
  BarChart3,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { withAuth } from '@/lib/auth-context'
import { extractKeywords } from '@/lib/keyword-extractor'

interface TargetArticle {
  id: number
  title: string
  url: string
  content?: string
  html?: string
  reads: number
  likes: number
  publish_time?: number
  author_name?: string
  avatar?: string
  reason?: string
  key_points: string[]
  tags: string[]
  collected_at: number
}

interface TargetAccount {
  id: number
  name: string
  wxid: string
  avatar: string
  fans: number
  avg_top_read: number
  avg_top_zan: number
  week_articles: number
  suitability_score: number
  tags: string[]
  collected_at: number
}

interface ArticleAnalysis {
  sourceArticle: {
    id: number
    title: string
    reads: number
  }
  analysis: {
    keywords: string[]
    sixMonthsData: {
      articleCount: number
      totalReads: number
      avgReads: number
      maxReads: number
    }
    recentActivity: {
      lastMonth: number
      thisMonth: number
      lastWeek: number
      isActive: boolean
    }
    marketAssessment: {
      competition: 'low' | 'medium' | 'high'
      opportunity: 'poor' | 'average' | 'good'
      suggestion: string
    }
    hotArticles: Array<{
      id: number
      title: string
      reads: number
      publishTime: number
      author: string
    }>
  }
  synced?: boolean // 是否已同步到内容创作
}

function TargetLibraryContent() {
  const [activeTab, setActiveTab] = useState<'articles' | 'accounts'>('articles')
  const [articles, setArticles] = useState<TargetArticle[]>([])
  const [accounts, setAccounts] = useState<TargetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // 新增状态：多选和分析
  const [selectedArticles, setSelectedArticles] = useState<number[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<ArticleAnalysis | null>(null)
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<ArticleAnalysis[]>([])

  // 获取对标文章
  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/target-articles')
      const result = await response.json()

      if (result.success) {
        setArticles(result.data)
      }
    } catch (error) {
      console.error('获取对标文章失败:', error)
    }
  }

  // 获取对标账号
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/target-accounts')
      const result = await response.json()

      if (result.success) {
        setAccounts(result.data)
      }
    } catch (error) {
      console.error('获取对标账号失败:', error)
    }
  }

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    await Promise.all([fetchArticles(), fetchAccounts()])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 处理文章选择
  const handleSelectArticle = (articleId: number, checked: boolean) => {
    if (checked) {
      setSelectedArticles(prev => [...prev, articleId])
    } else {
      setSelectedArticles(prev => prev.filter(id => id !== articleId))
    }
  }

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(filteredArticles.map(article => article.id))
    } else {
      setSelectedArticles([])
    }
  }

  // 清空选择
  const clearSelection = () => {
    setSelectedArticles([])
  }

  // 分析单篇文章
  const analyzeSingleArticle = async (article: TargetArticle) => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/analysis/topic-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: [article.id],
          refresh: false
        })
      })

      const result = await response.json()
      if (result.success && result.data.length > 0) {
        setCurrentAnalysis(result.data[0])
        setShowAnalysisModal(true)
      }
    } catch (error) {
      console.error('分析文章失败:', error)
      alert('分析失败，请重试')
    } finally {
      setAnalyzing(false)
    }
  }

  // 批量分析
  const analyzeSelectedArticles = async () => {
    if (selectedArticles.length === 0) {
      alert('请先选择要分析的文章')
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch('/api/analysis/topic-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds: selectedArticles,
          refresh: false
        })
      })

      const result = await response.json()
      if (result.success && result.data.length > 0) {
        setBatchAnalysisResults(result.data)
        setCurrentAnalysis(null) // 清空当前单篇分析
        setShowAnalysisModal(true)
      }
    } catch (error) {
      console.error('批量分析失败:', error)
      alert('分析失败，请重试')
    } finally {
      setAnalyzing(false)
    }
  }

  // 同步到内容创作
  const syncToCreation = async (articleIds: number[]) => {
    try {
      // 目前暂不传递分析ID，因为分析结果中没有该字段
      const analysisIds = undefined

      console.log('同步到内容创作 - 发送的参数:', { articleIds, analysisIds })

      const response = await fetch('/api/creation/sync-benchmark-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleIds,
          analysisIds
        })
      })

      const result = await response.json()
      console.log('同步到内容创作 - API响应:', result)
      if (result.success) {
        // 显示成功提示
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2'
        toast.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>已同步 ${result.data.length} 个选题到内容创作</span>
        `
        document.body.appendChild(toast)

        // 3秒后自动移除
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast)
          }
        }, 3000)

        // 标记已同步，但不关闭弹窗，让用户继续参考分析结果
        if (currentAnalysis) {
          setCurrentAnalysis(prev => prev ? { ...prev, synced: true } : null)
        } else {
          setBatchAnalysisResults(prev =>
            prev.map(result => ({ ...result, synced: true }))
          )
        }
      }
    } catch (error) {
      console.error('同步失败:', error)
      alert('同步失败，请重试')
    }
  }

  // 删除文章
  const deleteArticle = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return

    try {
      const response = await fetch(`/api/target-articles?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchArticles()
      }
    } catch (error) {
      console.error('删除文章失败:', error)
      alert('删除失败，请重试')
    }
  }

  // 删除账号
  const deleteAccount = async (id: number) => {
    if (!confirm('确定要删除这个账号吗？')) return

    try {
      const response = await fetch(`/api/target-accounts?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAccounts()
      }
    } catch (error) {
      console.error('删除账号失败:', error)
      alert('删除失败，请重试')
    }
  }

  // 获取所有标签
  const getAllTags = () => {
    const articleTags = articles.flatMap(article => article.tags)
    const accountTags = accounts.flatMap(account => account.tags)
    return Array.from(new Set([...articleTags, ...accountTags]))
  }

  // 过滤文章
  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchTerm ||
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => article.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  // 过滤账号
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = !searchTerm ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => account.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN')
  }

  // 获取竞争程度样式
  const getCompetitionStyle = (competition: string) => {
    switch (competition) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // 获取机会样式
  const getOpportunityStyle = (opportunity: string) => {
    switch (opportunity) {
      case 'good': return 'bg-green-100 text-green-800 border-green-300'
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'poor': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // 获取机会文本
  const getOpportunityText = (opportunity: string) => {
    switch (opportunity) {
      case 'good': return '机会好'
      case 'average': return '机会一般'
      case 'poor': return '机会差'
      default: return '未知'
    }
  }

  // 获取竞争文本
  const getCompetitionText = (competition: string) => {
    switch (competition) {
      case 'low': return '低竞争'
      case 'medium': return '中竞争'
      case 'high': return '高竞争'
      default: return '未知'
    }
  }

  // 关闭分析弹窗
  const closeAnalysisModal = () => {
    setShowAnalysisModal(false)
    setCurrentAnalysis(null)
    setBatchAnalysisResults([])
  }

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/target/analysis" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Database className="w-7 h-7 mr-3 text-purple-600" />
              对标库管理
            </h1>
            <p className="text-gray-500 mt-1">
              管理收藏的爆款文章和优质账号，支持市场热度分析
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">收藏文章</p>
              <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">收藏账号</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总阅读量</p>
              <p className="text-2xl font-bold text-gray-900">
                {articles.reduce((sum, article) => sum + article.reads, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总点赞数</p>
              <p className="text-2xl font-bold text-gray-900">
                {articles.reduce((sum, article) => sum + article.likes, 0).toLocaleString()}
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
              placeholder="搜索文章标题或作者名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              multiple
              value={selectedTags}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value)
                setSelectedTags(values)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              size={1}
            >
              {getAllTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 批量操作栏 - 选中文章时显示 */}
      {selectedArticles.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckSquare className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                已选择 {selectedArticles.length} 篇文章
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                清空选择
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                取消全选
              </button>
              <button
                onClick={() => handleSelectAll(true)}
                className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800"
              >
                全选当前
              </button>
              <button
                onClick={analyzeSelectedArticles}
                disabled={analyzing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    <span>分析选中文章</span>
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/creation/sync-benchmark-topics', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        articleIds: selectedArticles
                      })
                    })

                    const result = await response.json()
                    if (result.success) {
                      // 显示成功提示
                      const toast = document.createElement('div')
                      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2'
                      toast.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>成功同步 ${result.data.length} 个选题到内容创作</span>
                      `
                      document.body.appendChild(toast)

                      // 3秒后自动移除
                      setTimeout(() => {
                        if (document.body.contains(toast)) {
                          document.body.removeChild(toast)
                        }
                      }, 3000)

                      clearSelection()
                    }
                  } catch (error) {
                    console.error('同步失败:', error)
                    alert('同步失败，请重试')
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>同步到内容创作</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标签页切换 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('articles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'articles'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>对标文章 ({filteredArticles.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'accounts'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>对标账号 ({filteredAccounts.length})</span>
              </div>
            </button>
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : activeTab === 'articles' ? (
            <div className="space-y-4">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无收藏的文章</p>
                  <Link href="/target/analysis" className="mt-2 inline-flex items-center text-purple-600 hover:text-purple-700">
                    <Plus className="w-4 h-4 mr-1" />
                    去发现爆款文章
                  </Link>
                </div>
              ) : (
                filteredArticles.map(article => (
                  <div key={article.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex items-start space-x-4">
                      {/* 复选框 */}
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={selectedArticles.includes(article.id)}
                          onChange={(e) => handleSelectArticle(article.id, e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex-1">
                            <span className="line-clamp-2">{article.title}</span>
                          </h3>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => analyzeSingleArticle(article)}
                              disabled={analyzing}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {analyzing ? '分析中...' : '分析'}
                            </button>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              查看
                            </a>
                            <button
                              onClick={() => deleteArticle(article.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {article.author_name}
                          </span>
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {article.reads.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {article.likes.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {article.publish_time ? new Date(article.publish_time * 1000).toLocaleDateString() : '未知'}
                          </span>
                        </div>

                        {article.reason && (
                          <p className="text-sm text-gray-600 mb-3">{article.reason}</p>
                        )}

                        {article.key_points.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">关键点：</p>
                            <div className="flex flex-wrap gap-2">
                              {article.key_points.map((point, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {point}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {article.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无收藏的账号</p>
                  <Link href="/target/analysis" className="mt-2 inline-flex items-center text-purple-600 hover:text-purple-700">
                    <Plus className="w-4 h-4 mr-1" />
                    去发现优质账号
                  </Link>
                </div>
              ) : (
                filteredAccounts.map(account => (
                  <div key={account.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        {account.avatar && (
                          <img
                            src={account.avatar}
                            alt={account.name}
                            className="w-16 h-16 rounded-lg"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                          <p className="text-sm text-gray-600">微信ID: {account.wxid}</p>

                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>粉丝: {account.fans.toLocaleString()}</span>
                            <span>平均阅读: {account.avg_top_read.toLocaleString()}</span>
                            <span>周发文: {account.week_articles}</span>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="ml-1 text-sm font-semibold">{account.suitability_score}分</span>
                            </div>
                          </div>

                          {account.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {account.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => deleteAccount(account.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 分析结果弹窗 */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-6xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {currentAnalysis ? '单篇文章分析' : '批量分析结果'}
                {currentAnalysis && `: ${currentAnalysis.sourceArticle.title}`}
              </h2>
              <div className="flex items-center space-x-3">
                {/* 同步到内容创作按钮 */}
                <button
                  onClick={() => {
                    if (currentAnalysis) {
                      syncToCreation([currentAnalysis.sourceArticle.id])
                    } else {
                      // 批量分析结果：直接使用所有分析结果中的文章ID
                      const batchIds = batchAnalysisResults.map(result => result.sourceArticle.id)
                      syncToCreation(batchIds)
                    }
                  }}
                  disabled={currentAnalysis?.synced || (batchAnalysisResults.length > 0 && batchAnalysisResults.every(r => r.synced))}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>
                    {currentAnalysis ?
                      (currentAnalysis.synced ? '已同步' : '同步到内容创作') :
                      (batchAnalysisResults.length > 0 && batchAnalysisResults.every(r => r.synced) ? '已同步' : '同步选中到内容创作')
                    }
                  </span>
                </button>
                <button
                  onClick={closeAnalysisModal}
                  className="text-gray-400 hover:text-gray-600 text-xl font-light px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {currentAnalysis ? (
              /* 单篇文章分析结果 */
              <div>
                {/* 核心数据卡片 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">相关文章</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {currentAnalysis.analysis.sixMonthsData.articleCount}篇
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">平均阅读</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(currentAnalysis.analysis.sixMonthsData.avgReads)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">最高阅读</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatNumber(currentAnalysis.analysis.sixMonthsData.maxReads)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">本月活跃</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {currentAnalysis.analysis.recentActivity.thisMonth}篇
                    </p>
                  </div>
                </div>

                {/* 市场评估 */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium mb-3">市场评估</h4>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-sm text-gray-600">竞争程度:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getCompetitionStyle(currentAnalysis.analysis.marketAssessment.competition)}`}>
                        {getCompetitionText(currentAnalysis.analysis.marketAssessment.competition)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">创作机会:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getOpportunityStyle(currentAnalysis.analysis.marketAssessment.opportunity)}`}>
                        {getOpportunityText(currentAnalysis.analysis.marketAssessment.opportunity)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{currentAnalysis.analysis.marketAssessment.suggestion}</p>
                </div>

                {/* 相关热门文章 */}
                {currentAnalysis.analysis.hotArticles.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">近期热门文章</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentAnalysis.analysis.hotArticles.map((article, index) => (
                        <div key={article.id} className="flex justify-between items-center p-3 bg-white rounded border hover:bg-gray-50 transition-colors group">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate font-medium group-hover:text-blue-600 transition-colors">
                                  {index + 1}. {article.title}
                                </p>
                                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                                    </svg>
                                    {article.author}
                                  </span>
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clip-rule="evenodd"></path>
                                    </svg>
                                    {new Date(article.publishTime * 1000).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center font-medium text-orange-600">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                                    </svg>
                                    {formatNumber(article.reads)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <div className="flex items-center space-x-1">
                                {article.reads >= 100000 && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                    10万+
                                  </span>
                                )}
                                {article.reads >= 50000 && article.reads < 100000 && (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                    5万+
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                // 尝试打开文章链接
                                try {
                                  // 检查是否有有效的文章ID或URL
                                  if (article.id) {
                                    // 微信文章ID通常是字符串格式，可能包含特定前缀
                                    const articleId = article.id.toString()
                                    let link = ''

                                    // 如果ID看起来像URL格式
                                    if (articleId.includes('http')) {
                                      link = articleId
                                    } else if (articleId.length > 20) {
                                      // 长ID通常是微信文章的真实ID
                                      link = `https://mp.weixin.qq.com/s/${articleId}`
                                    } else {
                                      // 尝试搜索该文章
                                      const searchQuery = encodeURIComponent(article.title)
                                      link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                    }

                                    window.open(link, '_blank')
                                  } else {
                                    // 如果没有ID，搜索标题
                                    const searchQuery = encodeURIComponent(article.title)
                                    const link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                    window.open(link, '_blank')
                                  }
                                } catch (error) {
                                  console.error('打开文章链接失败:', error)
                                  // 降级到搜索
                                  const searchQuery = encodeURIComponent(article.title)
                                  const link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                  window.open(link, '_blank')
                                }
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="查看原文"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 批量分析结果 */
              <div>
                {/* 批量统计概览 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">平均相关文章</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(
                        batchAnalysisResults.reduce((sum, a) => sum + a.analysis.sixMonthsData.articleCount, 0) /
                        batchAnalysisResults.length
                      )}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">平均阅读量</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(
                        Math.round(
                          batchAnalysisResults.reduce((sum, a) => sum + a.analysis.sixMonthsData.avgReads, 0) /
                          batchAnalysisResults.length
                        )
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">高机会选题</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {
                        batchAnalysisResults.filter(
                          a => a.analysis.marketAssessment.opportunity === 'good'
                        ).length
                      }
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">推荐创作</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {
                        batchAnalysisResults.filter(
                          a => a.analysis.marketAssessment.opportunity !== 'poor'
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {/* 详细分析结果列表 */}
                <div className="space-y-4">
                  {batchAnalysisResults.map((analysis, index) => (
                    <div key={analysis.sourceArticle.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900 line-clamp-2">
                            {analysis.sourceArticle.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            原阅读: {formatNumber(analysis.sourceArticle.reads)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${getOpportunityStyle(analysis.analysis.marketAssessment.opportunity)}`}>
                            {getOpportunityText(analysis.analysis.marketAssessment.opportunity)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${getCompetitionStyle(analysis.analysis.marketAssessment.competition)}`}>
                            {getCompetitionText(analysis.analysis.marketAssessment.competition)}
                          </span>
                        </div>
                      </div>

                      {/* 详细数据 */}
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600">相关文章</p>
                          <p className="font-bold">
                            {analysis.analysis.sixMonthsData.articleCount}篇
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600">平均阅读</p>
                          <p className="font-bold">
                            {formatNumber(analysis.analysis.sixMonthsData.avgReads)}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600">本月活跃</p>
                          <p className="font-bold">
                            {analysis.analysis.recentActivity.thisMonth}篇
                          </p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600">最高阅读</p>
                          <p className="font-bold">
                            {formatNumber(analysis.analysis.sixMonthsData.maxReads)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{analysis.analysis.marketAssessment.suggestion}</p>

                      {/* 热门文章列表 */}
                      {analysis.analysis.hotArticles.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">相关热门文章</h5>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {analysis.analysis.hotArticles.slice(0, 3).map((article, hotIndex) => (
                              <div key={article.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors group">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-gray-900 truncate font-medium group-hover:text-blue-600 transition-colors">
                                    {hotIndex + 1}. {article.title}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1 text-gray-500">
                                    <span>{article.author}</span>
                                    <span>{formatNumber(article.reads)}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    try {
                                      if (article.id) {
                                        const articleId = article.id.toString()
                                        let link = ''
                                        if (articleId.includes('http')) {
                                          link = articleId
                                        } else if (articleId.length > 20) {
                                          link = `https://mp.weixin.qq.com/s/${articleId}`
                                        } else {
                                          const searchQuery = encodeURIComponent(article.title)
                                          link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                        }
                                        window.open(link, '_blank')
                                      } else {
                                        const searchQuery = encodeURIComponent(article.title)
                                        const link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                        window.open(link, '_blank')
                                      }
                                    } catch (error) {
                                      console.error('打开文章链接失败:', error)
                                      const searchQuery = encodeURIComponent(article.title)
                                      const link = `https://weixin.sogou.com/weixin?query=${searchQuery}&type=2`
                                      window.open(link, '_blank')
                                    }
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  title="查看原文"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            {analysis.analysis.hotArticles.length > 3 && (
                              <div className="text-center text-xs text-gray-500 py-1">
                                还有 {analysis.analysis.hotArticles.length - 3} 篇热门文章...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeAnalysisModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                关闭
              </button>
              {(currentAnalysis?.analysis.marketAssessment.opportunity !== 'poor' ||
                batchAnalysisResults.some(a => a.analysis.marketAssessment.opportunity !== 'poor')) && (
                <button
                  onClick={() => {
                    const ids = currentAnalysis
                      ? [currentAnalysis.sourceArticle.id]
                      : batchAnalysisResults
                          .filter(a => a.analysis.marketAssessment.opportunity !== 'poor')
                          .map(a => a.sourceArticle.id)
                    syncToCreation(ids)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  同步到内容创作
                  ({currentAnalysis ? 1 :
                    batchAnalysisResults.filter(a => a.analysis.marketAssessment.opportunity !== 'poor').length
                  }个)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withAuth(function TargetLibraryPage() {
  return (
    <DashboardLayout>
      <TargetLibraryContent />
    </DashboardLayout>
  )
})