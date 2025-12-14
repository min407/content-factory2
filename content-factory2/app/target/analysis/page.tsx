'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Loader2,
  Filter,
  ExternalLink,
  Plus,
  Trophy,
  Eye,
  Heart,
  Clock,
  User,
  TrendingUp,
  Star
} from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { withAuth } from '@/lib/auth-context'
import { searchWeChatArticles, analyzeAuthorViralStats, searchAccountArticles, getAccountArticleStats, AccountArticle } from '@/lib/wechat-api'
import { getArticleDetail, isValidArticleUrl, extractValidUrl } from '@/lib/wechat-detail-api'
import { getAccountInfo, calculateSuitabilityScore, getSuitabilityLevel } from '@/lib/wechat-account-api'
import { WeChatArticle } from '@/types/wechat-api'
import { ArticleDetail } from '@/lib/wechat-detail-api'
import { AccountInfo } from '@/lib/wechat-account-api'

// 时间范围选项
const timeRangeOptions = [
  { label: '不限', value: 365 },
  { label: '近7天', value: 7 },
  { label: '近1个月', value: 30 },
  { label: '近3个月', value: 90 },
  { label: '近6个月', value: 180 },
]

// 爆款文章定义标准
const VIRAL_THRESHOLDS = {
  ENTRY: 10000,    // 入门级爆款：1万+阅读
  POPULAR: 50000,  // 热门爆款：5万+阅读
  SUPER: 100000    // 超级爆款：10万+阅读
}

// 阅读量筛选选项
const readCountFilters = [
  { label: '不限', value: 0 },
  { label: '1万+ (入门爆款)', value: 10000 },
  { label: '5万+ (热门爆款)', value: 50000 },
  { label: '10万+ (超级爆款)', value: 100000 },
]

// 账号规模筛选选项
const accountScaleFilters = [
  { label: '不限', value: 'all' },
  { label: '新手友好(<100篇)', value: 'beginner' },
  { label: '中级(<300篇)', value: 'intermediate' },
  { label: '专业级(<500篇)', value: 'professional' },
  { label: '终极(>500篇)', value: 'ultimate' },
]

// 文章数据扩展接口
interface ExtendedArticle extends WeChatArticle {
  authorDetail?: AccountInfo
  articleDetail?: ArticleDetail
  isCollected?: boolean
  authorCollected?: boolean
}

// 作者聚合数据接口
interface AuthorData {
  name: string
  wxid: string
  avatar: string
  totalArticles: number
  viralArticles: {
    reads10k: number
    reads50k: number
    reads100k: number
  }
  articles: ExtendedArticle[]
  accountInfo?: AccountInfo
  suitabilityScore?: number
  hasFullAnalysis?: boolean  // 是否已经进行了完整的作者分析
  isAnalyzing?: boolean      // 是否正在分析中
}

function TargetAnalysisContent() {
  // 搜索模式
  const [searchMode, setSearchMode] = useState<'keyword' | 'account'>('keyword')

  // 关键词搜索状态
  const [keyword, setKeyword] = useState('')
  const [articles, setArticles] = useState<WeChatArticle[]>([])
  const [extendedArticles, setExtendedArticles] = useState<ExtendedArticle[]>([])

  // 公众号搜索状态
  const [accountName, setAccountName] = useState('')
  const [accountArticles, setAccountArticles] = useState<AccountArticle[]>([])
  const [accountStats, setAccountStats] = useState<any>(null)

  // 通用状态
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchError, setSearchError] = useState('')

  // 筛选状态
  const [timeRange, setTimeRange] = useState<number>(365)
  const [minReadCount, setMinReadCount] = useState<number>(10000)
  const [accountScale, setAccountScale] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'reads' | 'likes' | 'engagement'>('reads')

  // 公众号搜索时间筛选
  const [accountTimeRange, setAccountTimeRange] = useState<'recent' | 'all'>('all')

  // 作者数据
  const [authorsData, setAuthorsData] = useState<Map<string, AuthorData>>(new Map())
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [loadingAuthor, setLoadingAuthor] = useState<string | null>(null)

  // 收藏状态
  const [collectedArticles, setCollectedArticles] = useState<Set<string>>(new Set())
  const [collectedAuthors, setCollectedAuthors] = useState<Set<string>>(new Set())

  // 文章删除检测关键词
  const deletedKeywords = [
    '内容已被作者删除',
    '该内容已被删除',
    '内容无法查看',
    'the content has been deleted',
    'content has been deleted by author',
    '此内容已被删除',
    '文章已删除',
    '内容已失效',
    '页面不存在'
  ]

  // 验证文章链接有效性
  const validateArticleUrl = async (article: WeChatArticle): Promise<boolean> => {
    const url = extractValidUrl(article)
    if (!url) {
      console.log('文章无有效链接:', article.title)
      return false
    }

    try {
      // 尝试获取文章详情来验证文章是否有效
      const articleDetail = await getArticleDetail(url)

      // 检查文章详情是否有内容
      if (!articleDetail || !articleDetail.content || articleDetail.content.trim().length < 50) {
        console.log('文章内容为空或过短，可能已删除:', article.title)
        return false
      }

      // 检查是否包含作者删除的常见提示文本
      const hasDeletedKeyword = deletedKeywords.some(keyword =>
        articleDetail.content.toLowerCase().includes(keyword.toLowerCase()) ||
        articleDetail.title.toLowerCase().includes(keyword.toLowerCase())
      )

      if (hasDeletedKeyword) {
        console.log('文章包含删除提示文本:', article.title)
        return false
      }

      return true
    } catch (error) {
      // 检查错误消息中是否包含删除提示
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
      if (deletedKeywords.some(keyword => errorMessage.includes(keyword.toLowerCase()))) {
        console.log('API返回删除提示:', article.title, error)
        return false
      }

      console.log('文章验证失败:', article.title, error)
      return false
    }
  }

  // 批量验证文章有效性
  const validateArticles = async (articleList: WeChatArticle[]): Promise<WeChatArticle[]> => {
    const validArticles: WeChatArticle[] = []

    for (const article of articleList) {
      const isValid = await validateArticleUrl(article)
      if (isValid) {
        validArticles.push(article)
      } else {
        console.log('过滤无效文章:', article.title, 'URL:', article.url || article.short_link)
      }
    }

    return validArticles
  }

  // 关键词搜索文章
  const handleKeywordSearch = async () => {
    if (!keyword.trim()) {
      setSearchError('请输入搜索关键词')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setShowResults(false)

    try {
      const response = await searchWeChatArticles({
        kw: keyword,
        sort_type: 1,
        mode: 1,
        period: timeRange,
        page: 1,
        type: 1,
      })

      if (response.data && response.data.length > 0) {
        // 先验证文章有效性
        setSearchError('正在验证文章有效性...')
        const validArticles = await validateArticles(response.data)

        if (validArticles.length === 0) {
          setSearchError('找到的文章均已失效，请尝试其他关键词')
          return
        }

        if (validArticles.length < response.data.length) {
          setSearchError(`找到 ${response.data.length} 篇文章，其中 ${validArticles.length} 篇有效`)
        }

        setArticles(validArticles)

        // 扩展文章数据
        const extended = validArticles.map(article => ({
          ...article,
          isCollected: false,
          authorCollected: false
        }))
        setExtendedArticles(extended)

        // 处理作者数据聚合
        await processAuthorData(extended)

        // 自动触发前3个作者的完整分析（异步执行，不阻塞界面）
        setTimeout(() => {
          const uniqueAuthors = Array.from(new Set(extended.map(article => article.wx_name))).slice(0, 3)
          uniqueAuthors.forEach(authorName => {
            if (authorName) {
              const authorData = authorsData.get(authorName)
              if (authorData && !authorData.hasFullAnalysis && !authorData.isAnalyzing) {
                performFullAuthorAnalysis(authorName).catch(console.error)
              }
            }
          })
        }, 1000) // 1秒后开始分析

        setShowResults(true)
        setSearchError('') // 清除错误提示
      } else {
        setSearchError('未找到相关文章')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      setSearchError(error instanceof Error ? error.message : '搜索失败，请重试')
    } finally {
      setIsSearching(false)
    }
  }

  // 公众号搜索文章
  const handleAccountSearch = async () => {
    if (!accountName.trim()) {
      setSearchError('请输入公众号名称')
      return
    }

    setIsSearching(true)
    setSearchError('')
    setShowResults(false)

    try {
      // 搜索公众号文章
      const articles = await searchAccountArticles({
        accountName: accountName.trim(),
        timeRange: accountTimeRange,
        maxPages: 10
      })

      if (articles && articles.length > 0) {
        setAccountArticles(articles)

        // 获取公众号统计信息
        const stats = await getAccountArticleStats({
          accountName: accountName.trim(),
          timeRange: 'all'
        })
        setAccountStats(stats)

        setShowResults(true)
        setSearchError('')
      } else {
        setSearchError('未找到该公众号的文章')
      }
    } catch (error) {
      console.error('公众号搜索失败:', error)
      setSearchError(error instanceof Error ? error.message : '公众号搜索失败，请重试')
    } finally {
      setIsSearching(false)
    }
  }

  // 统一的搜索处理函数
  const handleSearch = () => {
    if (searchMode === 'keyword') {
      handleKeywordSearch()
    } else {
      handleAccountSearch()
    }
  }

  // 处理作者数据聚合
  const processAuthorData = async (articleList: ExtendedArticle[]) => {
    const authorsMap = new Map<string, AuthorData>()

    // 聚合文章按作者
    articleList.forEach(article => {
      const authorName = article.wx_name || '未知作者'

      if (!authorsMap.has(authorName)) {
        authorsMap.set(authorName, {
          name: authorName,
          wxid: article.wx_id || '',
          avatar: article.avatar || '',
          totalArticles: 0,
          viralArticles: {
            reads10k: 0,
            reads50k: 0,
            reads100k: 0
          },
          articles: [],
          hasFullAnalysis: false,
          isAnalyzing: false
        })
      }

      const authorData = authorsMap.get(authorName)!
      authorData.totalArticles++
      authorData.articles.push(article)

      // 统计爆款文章
      const reads = article.read || 0
      if (reads >= 10000) authorData.viralArticles.reads10k++
      if (reads >= 50000) authorData.viralArticles.reads50k++
      if (reads >= 100000) authorData.viralArticles.reads100k++
    })

    setAuthorsData(authorsMap)
  }

  // 进行完整的作者分析
  const performFullAuthorAnalysis = async (authorName: string) => {
    if (!authorName) return

    // 标记为正在分析
    setAuthorsData(prev => {
      const newMap = new Map(prev)
      const existingAuthorData = newMap.get(authorName)
      if (existingAuthorData) {
        const updatedAuthorData = {
          ...existingAuthorData,
          isAnalyzing: true
        }
        newMap.set(authorName, updatedAuthorData)
      }
      return newMap
    })

    try {
      console.log('开始完整分析作者:', authorName)
      const viralStats = await analyzeAuthorViralStats(authorName)

      console.log('作者分析结果:', viralStats)

      // 更新作者数据
      setAuthorsData(prev => {
        const newMap = new Map(prev)
        const existingAuthorData = newMap.get(authorName)
        if (existingAuthorData) {
          // 创建新对象来确保React重新渲染
          const updatedAuthorData = {
            ...existingAuthorData,
            totalArticles: viralStats.totalArticles,
            viralArticles: viralStats.viralStats,
            hasFullAnalysis: true,
            isAnalyzing: false
          }
          newMap.set(authorName, updatedAuthorData)
        }
        return newMap
      })
    } catch (error) {
      console.error('完整作者分析失败:', error)

      // 分析失败，移除分析标记
      setAuthorsData(prev => {
        const newMap = new Map(prev)
        const existingAuthorData = newMap.get(authorName)
        if (existingAuthorData) {
          const updatedAuthorData = {
            ...existingAuthorData,
            isAnalyzing: false
          }
          newMap.set(authorName, updatedAuthorData)
        }
        return newMap
      })
    }
  }

  // 获取作者详情
  const fetchAuthorDetail = async (authorName: string) => {
    if (!authorName) return

    setLoadingAuthor(authorName)

    try {
      // 并行执行：获取账号信息 + 完整作者分析（如果还没有做过）
      const [accountInfo] = await Promise.all([
        getAccountInfo(authorName),
        // 如果还没有做过完整分析，则执行分析
        (() => {
          const authorData = authorsData.get(authorName)
          if (authorData && !authorData.hasFullAnalysis && !authorData.isAnalyzing) {
            return performFullAuthorAnalysis(authorName)
          }
          return Promise.resolve()
        })()
      ])

      const score = calculateSuitabilityScore(accountInfo)

      // 更新作者数据
      setAuthorsData(prev => {
        const newMap = new Map(prev)
        const existingAuthorData = newMap.get(authorName)
        if (existingAuthorData) {
          const updatedAuthorData = {
            ...existingAuthorData,
            accountInfo,
            suitabilityScore: score
          }
          newMap.set(authorName, updatedAuthorData)
        }
        return newMap
      })

      setSelectedAuthor(authorName)
      setShowAuthorModal(true)
    } catch (error) {
      console.error('获取作者详情失败:', error)
      alert('获取作者详情失败，请重试')
    } finally {
      setLoadingAuthor(null)
    }
  }

  // 筛选文章
  const getFilteredArticles = () => {
    return extendedArticles
      .filter(article => {
        // 阅读量筛选
        if (minReadCount > 0 && (article.read || 0) < minReadCount) {
          return false
        }

        // 账号规模筛选
        if (accountScale !== 'all') {
          const authorData = authorsData.get(article.wx_name || '')
          if (!authorData) {
            console.log(`筛选: 作者 ${article.wx_name} 没有数据`)
            return false
          }

          let shouldInclude = false
          switch (accountScale) {
            case 'beginner':
              shouldInclude = authorData.totalArticles < 100
              break
            case 'intermediate':
              shouldInclude = authorData.totalArticles < 300
              break
            case 'professional':
              shouldInclude = authorData.totalArticles < 500
              break
            case 'ultimate':
              shouldInclude = authorData.totalArticles >= 500
              break
          }

          // 添加调试日志
          if (accountScale === 'intermediate') {
            console.log(`筛选检查: ${article.wx_name} - 总文章数: ${authorData.totalArticles}, 是否包含: ${shouldInclude}, 是否全量分析: ${authorData.hasFullAnalysis}`)
          }

          return shouldInclude
        }

        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'reads':
            return (b.read || 0) - (a.read || 0)
          case 'likes':
            return (b.praise || 0) - (a.praise || 0)
          case 'engagement':
            const engagementA = (a.read || 0) > 0 ? (a.praise || 0) / (a.read || 0) : 0
            const engagementB = (b.read || 0) > 0 ? (b.praise || 0) / (b.read || 0) : 0
            return engagementB - engagementA
          default:
            return 0
        }
      })
  }

  // 收藏文章
  const collectArticle = async (article: ExtendedArticle) => {
    try {
      const articleUrl = extractValidUrl(article)
      if (!articleUrl) {
        alert('无法获取文章链接，跳过收藏')
        return
      }

      console.log('准备收藏文章:', article.title, articleUrl)

      const articleDetail = await getArticleDetail(articleUrl)
      console.log('获取文章详情成功:', articleDetail.title)

      // 准备请求数据
      const requestData = {
        title: article.title,
        url: articleUrl,
        content: articleDetail.content,
        html: articleDetail.html,
        reads: article.read,
        likes: article.praise,
        publishTime: article.publish_time,
        authorName: article.wx_name,
        avatar: articleDetail.avatar,
        reason: '爆款文章，值得对标学习',
        keyPoints: [`阅读量: ${article.read}`, `点赞数: ${article.praise}`],
        tags: ['爆款', article.wx_name]
      }

      console.log('发送请求数据:', requestData)

      // 保存到数据库
      const response = await fetch('/api/target-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      console.log('收到响应状态:', response.status, response.statusText)

      if (!response.ok) {
        // 如果HTTP状态码不是2xx，尝试解析错误信息
        try {
          const errorData = await response.json()
          console.error('API返回错误:', errorData)
          alert(errorData.message || `请求失败 (${response.status})`)
        } catch (parseError) {
          console.error('解析错误响应失败:', parseError)
          alert(`请求失败 (${response.status}): ${response.statusText}`)
        }
        return
      }

      const result = await response.json()
      console.log('API响应结果:', result)

      if (result.success) {
        setCollectedArticles(prev => new Set(prev).add(article.title))
        // 显示成功消息
        const successMessage = result.message || '文章已收藏到对标库'

        // 创建并显示成功提示
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2'
        toast.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>${successMessage}</span>
        `
        document.body.appendChild(toast)

        // 3秒后自动移除
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast)
          }
        }, 3000)
      } else {
        // 处理API返回的错误
        const errorMessage = result.message || '收藏失败，请重试'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('收藏文章失败:', error)
      alert('收藏失败，请检查网络连接或重试')
    }
  }

  // 收藏作者
  const collectAuthor = async (authorName: string) => {
    const authorData = authorsData.get(authorName)
    if (!authorData || !authorData.accountInfo) return

    try {
      const response = await fetch('/api/target-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authorData.name,
          wxid: authorData.wxid,
          avatar: authorData.accountInfo.avatar,
          fans: authorData.accountInfo.fans,
          avgTopRead: authorData.accountInfo.avgTopRead,
          avgTopZan: authorData.accountInfo.avgTopZan,
          weekArticles: authorData.accountInfo.weekArticles,
          suitabilityScore: authorData.suitabilityScore || 0,
          tags: ['对标账号', authorData.name]
        })
      })

    const result = await response.json()

      if (result.success) {
        setCollectedAuthors(prev => new Set(prev).add(authorName))
        // 显示成功消息
        const successMessage = result.message || '作者已收藏到对标库'

        // 创建并显示成功提示
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2'
        toast.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>${successMessage}</span>
        `
        document.body.appendChild(toast)

        // 3秒后自动移除
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast)
          }
        }, 3000)
      } else {
        // 处理API返回的错误
        const errorMessage = result.message || '收藏失败，请重试'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('收藏作者失败:', error)
      alert('收藏失败，请检查网络连接或重试')
    }
  }

  // 获取适合度等级样式
  const getSuitabilityLevelStyle = (score: number) => {
    const level = getSuitabilityLevel(score)
    switch (level.level) {
      case '强烈推荐':
        return 'bg-green-100 text-green-800 border-green-300'
      case '推荐对标':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case '可以参考':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // 获取爆款等级信息
  const getViralLevel = (reads: number) => {
    if (reads >= VIRAL_THRESHOLDS.SUPER) {
      return {
        label: '超级爆款',
        badge: '🔥',
        color: 'bg-red-100 text-red-800 border-red-300'
      }
    } else if (reads >= VIRAL_THRESHOLDS.POPULAR) {
      return {
        label: '热门爆款',
        badge: '⭐',
        color: 'bg-orange-100 text-orange-800 border-orange-300'
      }
    } else if (reads >= VIRAL_THRESHOLDS.ENTRY) {
      return {
        label: '入门爆款',
        badge: '📈',
        color: 'bg-blue-100 text-blue-800 border-blue-300'
      }
    } else {
      return {
        label: '普通文章',
        badge: '',
        color: 'bg-gray-100 text-gray-800 border-gray-300'
      }
    }
  }

  const filteredArticles = getFilteredArticles()

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Trophy className="w-7 h-7 mr-3 text-purple-600" />
          对标分析
        </h1>
        <p className="text-gray-500 mt-1">
          发现爆款文章，分析优质作者，建立个人对标库
        </p>
      </div>

      {/* 页签导航 */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSearchMode('keyword')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
              searchMode === 'keyword'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-4 h-4 mr-2" />
            关键词检索
          </button>
          <button
            onClick={() => setSearchMode('account')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
              searchMode === 'account'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4 mr-2" />
            公众号检索
          </button>
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        {/* 爆款定义说明 - 只在关键词模式显示 */}
        {searchMode === 'keyword' && (
          <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-2">
            <p className="text-xs text-purple-700">
              <strong>爆款标准：</strong>
              <span className="ml-2">🔥 10万+ | ⭐ 5万+ | 📈 1万+阅读</span>
            </p>
          </div>
        )}

        {/* 关键词搜索界面 */}
        {searchMode === 'keyword' && (
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="输入关键词，如：赚钱、副业、理财..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || isSearching}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
            >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>搜索中...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>开始搜索</span>
              </>
            )}
          </button>
        </div>
        )}

        {/* 筛选器 - 只在关键词模式显示 */}
        {searchMode === 'keyword' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-gray-700 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              爆款筛选
            </span>

            {/* 阅读量筛选 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">阅读量:</span>
              <div className="flex space-x-1">
                {readCountFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMinReadCount(filter.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      minReadCount === filter.value
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 时间范围 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">时间:</span>
              <div className="flex space-x-1">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      timeRange === option.value
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* 账号规模筛选 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">账号规模:</span>
              <div className="flex space-x-1">
                {accountScaleFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setAccountScale(filter.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      accountScale === filter.value
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 排序方式 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">排序:</span>
              <div className="flex space-x-1">
                {[
                  { value: 'reads', label: '阅读量' },
                  { value: 'likes', label: '点赞数' },
                  { value: 'engagement', label: '互动率' }
                ].map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() => setSortBy(sort.value as any)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      sortBy === sort.value
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 公众号搜索界面 */}
        {searchMode === 'account' && (
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="输入公众号名称，如：洞见、人民日报..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={!accountName.trim() || isSearching}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>搜索中...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>开始搜索</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{searchError}</p>
        </div>
      )}

      {/* 搜索结果 */}
      {showResults && (
        <div>
          {/* 结果统计 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                发现 {filteredArticles.length} 篇爆款文章
              </h2>
              <p className="text-sm text-gray-500">
                来自 {authorsData.size} 个不同作者
              </p>
            </div>
          </div>

          {/* 文章列表 */}
          <div className="space-y-4">
            {filteredArticles.map((article, index) => {
              const authorData = authorsData.get(article.wx_name || '')
              const isCollected = collectedArticles.has(article.title)
              const isAuthorCollected = collectedAuthors.has(article.wx_name || '')

              return (
                <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* 文章信息 */}
                    <div className="flex-1">
                      {/* 标题 */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-start">
                        <span className="text-purple-600 mr-3 flex-shrink-0">#{index + 1}</span>
                        <a
                          href={article.url || article.short_link || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-purple-600 transition-colors flex-1"
                        >
                          {article.title}
                        </a>
                        {article.url && (
                          <ExternalLink className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
                        )}
                      </h3>

                      {/* 数据指标 */}
                      <div className="flex items-center space-x-6 mb-3">
                        {/* 阅读量 + 爆款等级 */}
                        <span className="flex items-center text-sm text-gray-600">
                          <Eye className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="font-medium">{(article.read || 0).toLocaleString()}</span>
                          {(article.read || 0) >= VIRAL_THRESHOLDS.ENTRY && (
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full border ${getViralLevel(article.read || 0).color}`}>
                              {getViralLevel(article.read || 0).badge} {getViralLevel(article.read || 0).label}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center text-sm text-gray-600">
                          <Heart className="w-4 h-4 mr-1 text-red-500" />
                          <span className="font-medium">{(article.praise || 0).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {article.publish_time_str || ''}
                        </span>
                      </div>

                      {/* 作者信息 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{article.wx_name}</span>
                          </div>

                          {authorData && (
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                总{authorData.totalArticles}篇
                                {authorData.isAnalyzing && (
                                  <span className="ml-1 text-blue-500 text-xs">📊分析中...</span>
                                )}
                                {!authorData.hasFullAnalysis && !authorData.isAnalyzing && (
                                  <span className="ml-1 text-gray-400 text-xs">(当前)</span>
                                )}
                                {authorData.hasFullAnalysis && (
                                  <span className="ml-1 text-green-500 text-xs">(全量)</span>
                                )}
                              </span>
                              {/* 简化爆款统计 */}
                              {(authorData.viralArticles.reads100k > 0 || authorData.viralArticles.reads50k > 0 || authorData.viralArticles.reads10k > 0) && (
                                <span className="text-purple-600 font-medium">
                                  {authorData.viralArticles.reads100k > 0 && (
                                    <>
                                      🔥{authorData.viralArticles.reads100k}篇{authorData.viralArticles.reads50k > 0 && '+'}{authorData.viralArticles.reads10k > 0 && '+'}
                                    </>
                                  )}
                                  {authorData.viralArticles.reads100k === 0 && authorData.viralArticles.reads50k > 0 && (
                                    <>
                                      ⭐{authorData.viralArticles.reads50k}篇{authorData.viralArticles.reads10k > 0 && '+'}
                                    </>
                                  )}
                                  {authorData.viralArticles.reads100k === 0 && authorData.viralArticles.reads50k === 0 && authorData.viralArticles.reads10k > 0 && (
                                    <>
                                      📈{authorData.viralArticles.reads10k}篇
                                    </>
                                  )}
                                </span>
                              )}
                              {authorData.accountInfo && (
                                <span className={`px-2 py-1 rounded-full text-xs border ${getSuitabilityLevelStyle(authorData.suitabilityScore || 0)}`}>
                                  {authorData.suitabilityScore}分
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => fetchAuthorDetail(article.wx_name || '')}
                            disabled={loadingAuthor === article.wx_name}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {loadingAuthor === article.wx_name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              '作者详情'
                            )}
                          </button>

                          <button
                            onClick={() => collectArticle(article)}
                            disabled={isCollected}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            <Plus className="w-4 h-4 inline mr-1" />
                            {isCollected ? '已收藏' : '加入对标'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 作者详情弹窗 */}
      {showAuthorModal && selectedAuthor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowAuthorModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">作者分析报告</h2>
              <button
                onClick={() => setShowAuthorModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6">
              {(() => {
                const authorData = authorsData.get(selectedAuthor)
                if (!authorData || !authorData.accountInfo) return null

                const { accountInfo } = authorData
                const level = getSuitabilityLevel(authorData.suitabilityScore || 0)

                return (
                  <div className="space-y-6">
                    {/* 基本信息 */}
                    <div className="flex items-start space-x-4">
                      <img
                        src={accountInfo.avatar || ''}
                        alt={authorData.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{authorData.name}</h3>
                        <p className="text-gray-600 mt-1">公众号名称: {accountInfo.name}</p>

                        {/* 适合度评分 */}
                        <div className="mt-3 flex items-center space-x-3">
                          <span className="px-3 py-1 rounded-full text-sm border font-medium"
                                style={{ backgroundColor: level.color === 'green' ? '#dcfce7' : level.color === 'blue' ? '#dbeafe' : '#fef3c7', borderColor: level.color === 'green' ? '#86efac' : level.color === 'blue' ? '#93c5fd' : '#fcd34d', color: level.color === 'green' ? '#15803d' : level.color === 'blue' ? '#1e40af' : '#92400e' }}>
                            {level.level}
                          </span>
                          <span className="text-lg font-bold text-purple-600">
                            {authorData.suitabilityScore}分
                          </span>
                          <span className="text-sm text-gray-500">{level.description}</span>
                        </div>
                      </div>
                    </div>

                    {/* 数据统计 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm">预计粉丝</span>
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                          {(accountInfo.fans || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm">头条平均阅读</span>
                          <Eye className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                          {(accountInfo.avgTopRead || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm">周发文量</span>
                          <Star className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                          {accountInfo.weekArticles || 0}篇
                        </p>
                      </div>

                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm">极致了指数</span>
                          <Trophy className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                          {accountInfo.jzlIndex || 0}
                        </p>
                      </div>
                    </div>

                    {/* 爆款文章TOP5 */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">爆款文章TOP5</h4>
                      <div className="space-y-3">
                        {authorData.articles
                          .sort((a, b) => (b.read || 0) - (a.read || 0))
                          .slice(0, 5)
                          .map((article, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 line-clamp-1">{article.title}</h5>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <span>阅读: {(article.read || 0).toLocaleString()}</span>
                                  <span>点赞: {(article.praise || 0).toLocaleString()}</span>
                                  <span>{article.publish_time_str}</span>
                                </div>
                              </div>
                              <a
                                href={article.url || article.short_link || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          collectAuthor(selectedAuthor)
                          setShowAuthorModal(false)
                        }}
                        disabled={collectedAuthors.has(selectedAuthor)}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:bg-gray-400"
                      >
                        {collectedAuthors.has(selectedAuthor) ? '已收藏账号' : '收藏到对标库'}
                      </button>
                      <button
                        onClick={() => setShowAuthorModal(false)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 包装需要登录的页面
export default withAuth(function TargetAnalysisPage() {
  return (
    <DashboardLayout>
      <TargetAnalysisContent />
    </DashboardLayout>
  )
})