'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import {
  Search,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageSquare,
  BarChart3,
  Loader2,
  ChevronRight,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  Award,
  Zap,
  Hash,
  Clock,
  PenTool,
  AlertCircle,
  Settings,
  ExternalLink,
  History,
  Trash2,
  ChevronDown
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { fetchArticles, formatArticlesForAnalysis, analyzeArticles } from '@/lib/api'
import { saveSearchHistory, getSearchHistory, clearSearchHistory } from '@/lib/history'
import { AIConfigManager } from '@/lib/ai-config'
import { AIService } from '@/lib/ai-service'
import { DeepAIAnalysisResult } from '@/types/article'

// 阅读量分布的固定数据，用于图表展示
const chartData = [
  { name: '0-1k', value: 12 },
  { name: '1k-5k', value: 34 },
  { name: '5k-10k', value: 45 },
  { name: '10k-20k', value: 38 },
  { name: '20k+', value: 27 },
]

export default function AnalysisPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [keyword, setKeyword] = useState('')

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [articleCount, setArticleCount] = useState<string | number>(1)
  const [customCount, setCustomCount] = useState('')
  const [formattedData, setFormattedData] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [searchHistory, setSearchHistory] = useState<any[]>([])
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  // AI相关状态
  const [insightCount, setInsightCount] = useState(5)
  const [deepAnalysisResult, setDeepAnalysisResult] = useState<DeepAIAnalysisResult | null>(null)

  // 加载搜索历史
  useEffect(() => {
    const loadHistory = () => {
      const history = getSearchHistory()
      setSearchHistory(history)
    }
    loadHistory()
  }, [])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHistoryDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.history-dropdown')) {
          setShowHistoryDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistoryDropdown])

  // 深度AI分析函数
  const handleDeepAnalysis = async (articles: any[], topic: string) => {
    try {
      setProgress(20)

      // 设置AI进度回调
      AIService.setProgressCallback((progress) => {
        setProgress(progress.progress)
        console.log('深度分析进度:', progress.currentStep)
      })

      // 执行深度分析
      const result = await AIService.performDeepAnalysis(
        articles,
        topic.trim(),
        insightCount
      )

      setDeepAnalysisResult(result)
      setProgress(100)
    } catch (error) {
      console.error('深度分析失败:', error)
      throw error
    }
  }

  const handleAnalysis = async () => {
    if (!keyword.trim()) return

    setIsAnalyzing(true)
    setProgress(0)
    setShowResult(false)
    setError(null)
    setAnalysisResult(null)
    setDeepAnalysisResult(null)
    setFormattedData([])

    try {
      // 确定要采集的文章数量
      let finalCount: number
      if (articleCount === 'custom') {
        finalCount = parseInt(customCount) || 5
      } else {
        finalCount = parseInt(String(articleCount)) || 1
      }

      setProgress(5)
      console.log(`开始分析关键词: ${keyword.trim()}, 采集数量: ${finalCount}`)

      // 调用API获取文章数据
      const response = await fetchArticles({
        kw: keyword.trim(),
        period: 7,  // 获取7天内的文章
        sort_type: 2,  // 按热度排序获取TOP文章
        mode: 1,  // 精确匹配
      })

      setProgress(15) // 获取文章完成

      console.log('API返回数据:', {
        hasData: !!response.data,
        dataLength: response.data?.length,
        total: response.total
      })

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // 根据选择的数量截取文章数据
        const limitedData = response.data.slice(0, finalCount)
        console.log(`截取前${finalCount}篇文章进行深度分析`)

        // 先格式化文章数据
        const formattedDataResult = formatArticlesForAnalysis(limitedData)
        setFormattedData(formattedDataResult)

        // 直接使用深度AI分析
        setProgress(20)
        await handleDeepAnalysis(limitedData, keyword.trim())

        // 保存搜索历史
        const historyData = {
          keyword: keyword.trim(),
          articleCount: finalCount,
          totalFound: response.total || 0,
          stats: {
            totalArticles: limitedData.length,
            avgReads: Math.round(limitedData.reduce((sum: number, article: any) => sum + (article.read || 0), 0) / limitedData.length),
            avgLikes: Math.round(limitedData.reduce((sum: number, article: any) => sum + (article.praise || 0), 0) / limitedData.length),
            avgEngagement: `${(limitedData.reduce((sum: number, article: any) => sum + ((article.praise || 0) / Math.max(article.read || 1, 1)) * 100, 0) / limitedData.length).toFixed(1)}%`
          },
          summaries: deepAnalysisResult?.summaries || [],
          insights: deepAnalysisResult?.insights || [],
          topArticles: limitedData.slice(0, 5).map((article: any) => ({
            title: article.title,
            reads: article.read || 0,
            likes: article.praise || 0,
            engagement: `${((article.praise || 0) / Math.max(article.read || 1, 1) * 100).toFixed(1)}%`
          }))
        }

        saveSearchHistory(historyData, keyword.trim(), finalCount, response.total || 0)

        // 更新历史记录状态
        const updatedHistory = getSearchHistory()
        setSearchHistory(updatedHistory)

        // 完成进度
        setTimeout(() => {
          setIsAnalyzing(false)
          setShowResult(true)
        }, 500)
      } else {
        throw new Error('未找到相关文章，请尝试其他关键词')
      }
    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试')
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  // 如果未登录，显示加载状态
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
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选题分析</h1>
          <p className="text-gray-500 mt-1">输入关键词，AI智能分析公众号文章，生成选题洞察报告</p>
        </div>
        <div className="relative history-dropdown">
          <button
            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <History className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">历史记录</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* 历史记录下拉菜单 */}
          {showHistoryDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">搜索历史</h3>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('确定要清空所有历史记录吗？')) {
                          clearSearchHistory()
                          setSearchHistory([])
                          setShowHistoryDropdown(false)
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      清空
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchHistory.length > 0 ? (
                  searchHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer"
                      onClick={() => {
                        setKeyword(item.keyword)
                        setArticleCount(item.articleCount)
                        setShowHistoryDropdown(false)
                        // 可以选择自动开始分析
                        // handleAnalysis()
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 truncate">{item.keyword}</h4>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {item.articleCount}篇
                            </span>
                          </div>
                          <div className="flex items-center mt-1 text-xs text-gray-500 space-x-3">
                            <span>{item.searchTimeStr}</span>
                            <span>找到 {item.totalFound.toLocaleString()} 篇</span>
                          </div>
                          {item.stats.totalArticles > 0 && (
                            <div className="flex items-center mt-2 text-xs text-gray-600 space-x-3">
                              <span>均阅: {(item.stats.avgReads || 0).toLocaleString()}</span>
                              <span>均赞: {(item.stats.avgLikes || 0).toLocaleString()}</span>
                              <span>互动率: {item.stats.avgEngagement || '0%'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">暂无搜索历史</p>
                    <p className="text-xs mt-1">开始搜索后历史记录会显示在这里</p>
                  </div>
                )}
              </div>
              {searchHistory.length > 10 && (
                <div className="p-3 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setShowHistoryDropdown(false)
                      setShowHistory(true)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    查看全部 {searchHistory.length} 条记录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="space-y-4">
          {/* 关键词输入 */}
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="输入关键词，如：营销、内容运营、私域流量..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalysis()}
                />
              </div>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>热门关键词：</span>
                {['AI创作', '私域运营', '内容营销', '用户增长'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setKeyword(tag)}
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAnalysis}
              disabled={!keyword || isAnalyzing}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>开始分析</span>
                </>
              )}
            </button>
          </div>

          {/* AI洞察数量设置 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">AI深度分析已启用</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>自动生成结构化洞察</span>
              </div>
            </div>

            {/* 洞察数量选择 */}
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">洞察数量：</span>
              <select
                value={insightCount}
                onChange={(e) => setInsightCount(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={3}>3条</option>
                <option value={5}>5条</option>
                <option value={8}>8条</option>
                <option value={10}>10条</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">采集数量：</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setArticleCount(1);
                  setCustomCount('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1篇
              </button>
              <button
                onClick={() => {
                  setArticleCount(5);
                  setCustomCount('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 5
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                5篇
              </button>
              <button
                onClick={() => {
                  setArticleCount(10);
                  setCustomCount('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 10
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                10篇
              </button>
              <button
                onClick={() => {
                  setArticleCount(20);
                  setCustomCount('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 20
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                20篇
              </button>
              <button
                onClick={() => {
                  setArticleCount(50);
                  setCustomCount('');
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 50
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                50篇
              </button>
              <button
                onClick={() => setArticleCount('custom')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  articleCount === 'custom'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                自定义
              </button>
              {articleCount === 'custom' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    placeholder="输入数量"
                    min="1"
                    max="100"
                    className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-xs text-gray-500">篇</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {articleCount === 'custom'
                ? `将采集 ${customCount || 5} 篇文章`
                : `将采集 ${articleCount} 篇文章`
              }
            </div>
          </div>
        </div>
      </div>

      {/* 分析进度 */}
      {isAnalyzing && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">分析进度</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className={`flex items-center text-sm ${progress >= 20 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 20 && <span className="text-white text-xs">✓</span>}
              </div>
              正在获取公众号文章...
            </div>
            <div className={`flex items-center text-sm ${progress >= 50 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 50 && <span className="text-white text-xs">✓</span>}
              </div>
              AI深度分析文章内容...
            </div>
            <div className={`flex items-center text-sm ${progress >= 80 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 80 && <span className="text-white text-xs">✓</span>}
              </div>
              生成结构化洞察...
            </div>
            <div className={`flex items-center text-sm ${progress >= 100 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 100 && <span className="text-white text-xs">✓</span>}
              </div>
              报告生成完成
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">分析失败</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {showResult && deepAnalysisResult && (
        <div className="space-y-6">
          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">分析文章数</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {deepAnalysisResult.processedArticles}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">共采集 {deepAnalysisResult.totalArticles} 篇</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">总阅读量</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {(deepAnalysisResult.overallMetrics.totalReads / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-400 mt-1">平均 {Math.round(deepAnalysisResult.overallMetrics.totalReads / deepAnalysisResult.processedArticles).toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">总点赞数</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {(deepAnalysisResult.overallMetrics.totalLikes / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-400 mt-1">平均 {Math.round(deepAnalysisResult.overallMetrics.totalLikes / deepAnalysisResult.processedArticles).toLocaleString()}</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">话题潜力</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                    {deepAnalysisResult.overallMetrics.topicPotential}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">互动率 {deepAnalysisResult.overallMetrics.avgEngagement}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 点赞TOP5 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-500" />
                  点赞量TOP5
                </h2>
              </div>
              <div className="space-y-3">
                {deepAnalysisResult.summaries
                  .sort((a, b) => b.keyMetrics.likeCount - a.keyMetrics.likeCount)
                  .slice(0, 5).length > 0 ? (
                  deepAnalysisResult.summaries
                    .sort((a, b) => b.keyMetrics.likeCount - a.keyMetrics.likeCount)
                    .slice(0, 5).map((summary, index) => {
                      // 获取原始文章数据中的链接
                      const originalArticle = formattedData.find(a => a.title === summary.originalTitle);
                      const articleUrl = originalArticle?.url || originalArticle?.shortLink;

                      return (
                        <div key={summary.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 min-w-0">
                                  <span className="text-lg font-bold text-yellow-500 mr-2 flex-shrink-0">#{index + 1}</span>
                                  <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">{summary.originalTitle}</h3>
                                </div>
                                {articleUrl && (
                                  <a
                                    href={articleUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                                    title="查看原文"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <Eye className="w-4 h-4 mr-1" />
                                  {summary.keyMetrics.readCount.toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  <Heart className="w-4 h-4 mr-1 text-red-500" />
                                  {summary.keyMetrics.likeCount.toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                                  {summary.keyMetrics.engagementRate.toFixed(1)}%
                                </span>
                              </div>
                              {/* 显示文章亮点 */}
                              {summary.highlights.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {summary.highlights.slice(0, 2).map((highlight, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                      {highlight}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无数据</p>
                )}
              </div>
            </div>

            {/* 互动率TOP5 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-purple-500" />
                  互动率TOP5
                </h2>
              </div>
              <div className="space-y-3">
                {deepAnalysisResult.summaries
                  .sort((a, b) => b.keyMetrics.engagementRate - a.keyMetrics.engagementRate)
                  .slice(0, 5).length > 0 ? (
                  deepAnalysisResult.summaries
                    .sort((a, b) => b.keyMetrics.engagementRate - a.keyMetrics.engagementRate)
                    .slice(0, 5).map((summary, index) => {
                      // 获取原始文章数据中的链接
                      const originalArticle = formattedData.find(a => a.title === summary.originalTitle);
                      const articleUrl = originalArticle?.url || originalArticle?.shortLink;

                      return (
                        <div key={summary.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 min-w-0">
                                  <span className="text-lg font-bold text-purple-500 mr-2 flex-shrink-0">#{index + 1}</span>
                                  <h3 className="font-medium text-gray-900 line-clamp-2 flex-1">{summary.originalTitle}</h3>
                                </div>
                                {articleUrl && (
                                  <a
                                    href={articleUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                                    title="查看原文"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <Eye className="w-4 h-4 mr-1" />
                                  {summary.keyMetrics.readCount.toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  <Heart className="w-4 h-4 mr-1 text-red-500" />
                                  {summary.keyMetrics.likeCount.toLocaleString()}
                                </span>
                                <span className="flex items-center text-purple-600 font-semibold">
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  {summary.keyMetrics.engagementRate.toFixed(1)}%
                                </span>
                              </div>
                              {/* 显示目标受众 */}
                              {summary.targetAudience.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {summary.targetAudience.slice(0, 2).map((audience, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                      {audience}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无数据</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 高频词云 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Hash className="w-5 h-5 mr-2 text-blue-500" />
                  高频词云
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisResult.wordCloud.length > 0 ? (
                  analysisResult.wordCloud.map((item: any, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                      style={{ fontSize: `${10 + item.size / 4}px` }}
                    >
                      {item.word}
                      <span className="ml-1 text-xs opacity-60">({item.count})</span>
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无数据</p>
                )}
              </div>
            </div>

            {/* 阅读量分布 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-green-500" />
                  阅读量分布
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 时间分布 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-500" />
                  发布时间分布
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  { time: '08:00-10:00', percent: 85, count: 23 },
                  { time: '10:00-12:00', percent: 65, count: 18 },
                  { time: '14:00-16:00', percent: 45, count: 12 },
                  { time: '18:00-20:00', percent: 92, count: 25 },
                  { time: '20:00-22:00', percent: 78, count: 21 }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-24">{item.time}</span>
                    <div className="flex-1 mx-3">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI深度洞察 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
                AI深度洞察 ({deepAnalysisResult.insights.length}条)
              </h2>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  处理时间: {Math.round(deepAnalysisResult.processingStats.totalTime / 1000)}秒
                </div>
                <div className="text-sm text-green-600 font-medium">
                  话题潜力: {deepAnalysisResult.overallMetrics.topicPotential === 'high' ? '高' :
                           deepAnalysisResult.overallMetrics.topicPotential === 'medium' ? '中' : '低'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {deepAnalysisResult.insights.map((insight, index) => {
                const categoryColors = {
                  trend: 'bg-blue-50 text-blue-700 border-blue-200',
                  opportunity: 'bg-green-50 text-green-700 border-green-200',
                  audience: 'bg-purple-50 text-purple-700 border-purple-200',
                  content: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                  monetization: 'bg-red-50 text-red-700 border-red-200'
                };

                const priorityColors = {
                  high: 'bg-red-100 text-red-700',
                  medium: 'bg-yellow-100 text-yellow-700',
                  low: 'bg-gray-100 text-gray-700'
                };

                return (
                  <div key={insight.id} className="p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-lg">{insight.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[insight.category]}`}>
                              {insight.category === 'trend' ? '趋势' :
                               insight.category === 'opportunity' ? '机会' :
                               insight.category === 'audience' ? '受众' :
                               insight.category === 'content' ? '内容' : '变现'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[insight.priority]}`}>
                              {insight.priority === 'high' ? '高优先级' :
                               insight.priority === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 leading-relaxed mb-4">{insight.description}</p>

                    {/* 关键发现 */}
                    {insight.keyFindings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">关键发现：</h4>
                        <ul className="space-y-1">
                          {insight.keyFindings.slice(0, 4).map((finding, idx) => (
                            <li key={idx} className="flex items-start text-sm text-gray-600">
                              <span className="text-blue-500 mr-2">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 目标受众和内容角度 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {insight.targetAudience.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">目标受众：</h4>
                          <div className="flex flex-wrap gap-1">
                            {insight.targetAudience.slice(0, 3).map((audience, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {audience}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {insight.contentAngles.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">内容角度：</h4>
                          <div className="flex flex-wrap gap-1">
                            {insight.contentAngles.slice(0, 3).map((angle, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {angle}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 底部指标 */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>可操作性: <strong className="text-gray-700">{insight.actionability}/10</strong></span>
                        <span>置信度: <strong className="text-gray-700">{insight.supportingData.confidenceScore}%</strong></span>
                        <span>支持文章: <strong className="text-gray-700">{insight.supportingData.articleCount}篇</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {insight.recommendations.length > 0 && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                            {insight.recommendations.length}条建议
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 展开建议 */}
                    {insight.recommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                            查看具体建议
                            <ChevronDown className="w-4 h-4 ml-1 group-open:rotate-180 transition-transform" />
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {insight.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start text-sm text-gray-600 ml-4">
                                <span className="text-green-500 mr-2">✓</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={handleAnalysis}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                重新分析
              </button>
              <button
                onClick={() => console.log('深度分析结果:', deepAnalysisResult)}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center"
              >
                <Target className="w-5 h-5 mr-2" />
                查看数据
              </button>
              <Link href="/create" className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center">
                <PenTool className="w-5 h-5 mr-2" />
                基于洞察创作
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}