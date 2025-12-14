import { WeChatArticleApiResponse, WeChatArticleSearchParams, WeChatArticle } from '@/types/wechat-api'

// 公众号文章数据接口
export interface AccountArticle {
  title: string
  url: string
  publishTime: number
  reads: number
  likes: number
  forwards: number
  comments: number
  authorName: string
  collectedAt?: number
}

// 公众号文章搜索参数接口
export interface AccountSearchParams {
  accountName: string
  timeRange?: 'recent' | 'all' // recent: 半年内, all: 全部
  maxPages?: number
}
import { ApiConfigManager } from './api-config'
import { ApiProvider } from '@/types/api-config'

/**
 * 获取微信搜索API配置
 */
function getWechatSearchConfig() {
  const apiKey = ApiConfigManager.getApiKey(ApiProvider.WECHAT_SEARCH)
  const apiBase = ApiConfigManager.getApiBase(ApiProvider.WECHAT_SEARCH)

  if (!apiKey) {
    throw new Error('微信搜索API密钥未配置，请在设置中配置API密钥')
  }

  return {
    apiKey,
    apiBase: apiBase || 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'
  }
}

/**
 * 搜索公众号文章
 * @param params 搜索参数
 * @returns Promise<WeChatArticleApiResponse>
 */
export async function searchWeChatArticles(
  params: Omit<WeChatArticleSearchParams, 'key'>
): Promise<WeChatArticleApiResponse> {
  const config = getWechatSearchConfig()

  if (!config.apiKey) {
    throw new Error('微信搜索API密钥未配置，请在设置中配置API密钥')
  }

  const requestBody: WeChatArticleSearchParams = {
    kw: params.kw,
    sort_type: params.sort_type || 1,
    mode: params.mode || 1,
    period: params.period || 7,
    page: params.page || 1,
    key: config.apiKey,
    any_kw: params.any_kw || '',
    ex_kw: params.ex_kw || '',
    verifycode: params.verifycode || '',
    type: params.type || 1,
  }

  try {
    const response = await fetch(config.apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: WeChatArticleApiResponse = await response.json()

    // 检查API返回的状态码（成功时code为0）
    if (data.code !== 0) {
      throw new Error(data.msg || 'API请求失败')
    }

    return data
  } catch (error) {
    console.error('搜索公众号文章失败:', error)
    throw error
  }
}

/**
 * 批量搜索多页文章
 * @param keyword 关键词
 * @param totalPages 总页数
 * @returns Promise<WeChatArticleApiResponse[]>
 */
export async function searchMultiplePages(
  keyword: string,
  totalPages: number = 1
): Promise<WeChatArticleApiResponse[]> {
  const promises: Promise<WeChatArticleApiResponse>[] = []

  for (let page = 1; page <= totalPages; page++) {
    promises.push(
      searchWeChatArticles({
        kw: keyword,
        page,
      })
    )
  }

  return Promise.all(promises)
}

/**
 * 按作者搜索文章
 * @param authorName 作者名称
 * @param maxPages 最大搜索页数
 * @returns Promise<WeChatArticle[]>
 */
export async function searchArticlesByAuthor(
  authorName: string,
  maxPages: number = 10
): Promise<WeChatArticle[]> {
  if (!authorName) {
    throw new Error('作者名称不能为空')
  }

  const allArticles: WeChatArticle[] = []

  try {
    // 搜索多页，获取作者的所有文章
    for (let page = 1; page <= maxPages; page++) {
      const response = await searchWeChatArticles({
        kw: authorName,
        page,
        period: 365, // 搜索近一年的文章
        sort_type: 1, // 按时间排序
      })

      // 如果没有数据了，停止搜索
      if (!response.data || response.data.length === 0) {
        break
      }

      // 过滤出该作者的文章（精确匹配）
      const authorArticles = response.data.filter(article =>
        article.wx_name === authorName
      )

      if (authorArticles.length > 0) {
        allArticles.push(...authorArticles)
      }

      // 如果这一页没有该作者的文章，可能已经搜索完了，停止搜索
      if (authorArticles.length === 0) {
        break
      }

      // 避免API调用过于频繁
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return allArticles
  } catch (error) {
    console.error('按作者搜索文章失败:', error)
    throw new Error(`按作者搜索文章失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 分析作者的爆款文章统计
 * @param authorName 作者名称
 * @returns Promise<{
 *   totalArticles: number;
 *   viralStats: {
 *     reads10k: number;
 *     reads50k: number;
 *     reads100k: number;
 *   };
 *   articles: WeChatArticle[];
 * }>
 */
export async function analyzeAuthorViralStats(authorName: string): Promise<{
  totalArticles: number;
  viralStats: {
    reads10k: number;
    reads50k: number;
    reads100k: number;
  };
  articles: WeChatArticle[];
}> {
  try {
    const articles = await searchArticlesByAuthor(authorName)

    const viralStats = {
      reads10k: 0,
      reads50k: 0,
      reads100k: 0,
    }

    articles.forEach(article => {
      const reads = article.read || 0
      if (reads >= 10000) viralStats.reads10k++
      if (reads >= 50000) viralStats.reads50k++
      if (reads >= 100000) viralStats.reads100k++
    })

    return {
      totalArticles: articles.length,
      viralStats,
      articles
    }
  } catch (error) {
    console.error('分析作者爆款统计失败:', error)
    throw new Error(`分析作者爆款统计失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 根据公众号名称搜索文章
 * @param params 搜索参数
 * @returns Promise<AccountArticle[]>
 */
export async function searchAccountArticles(params: AccountSearchParams): Promise<AccountArticle[]> {
  const config = getWechatSearchConfig()

  if (!config.apiKey) {
    throw new Error('微信搜索API密钥未配置，请在设置中配置API密钥')
  }

  const { accountName, timeRange = 'all', maxPages = 10 } = params

  // 使用现有的按作者搜索功能，但增加时间筛选逻辑
  try {
    const allArticles = await searchArticlesByAuthor(accountName, maxPages)

    // 时间筛选逻辑
    const now = Date.now()
    const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60 * 1000) // 大概6个月前

    const filteredArticles = allArticles.filter(article => {
      const publishTime = (article.timestamp || article.publish_time || 0) * 1000 // 转换为毫秒

      if (timeRange === 'recent') {
        return publishTime >= sixMonthsAgo
      }

      return true // 'all' 模式不过滤时间
    })

    // 转换为 AccountArticle 格式
    const accountArticles: AccountArticle[] = filteredArticles.map(article => ({
      title: article.title,
      url: article.url || article.short_link || '',
      publishTime: (article.timestamp || article.publish_time || 0) * 1000,
      reads: article.read || 0,
      likes: article.praise || 0,
      forwards: article.repost || 0,
      comments: article.comment || 0,
      authorName: accountName,
      collectedAt: Date.now()
    }))

    return accountArticles
  } catch (error) {
    console.error('搜索公众号文章失败:', error)
    throw new Error(`搜索公众号文章失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 获取公众号文章统计信息
 * @param params 搜索参数
 * @returns Promise<{
 *   totalArticles: number;
 *   recentArticles: number; // 半年内文章数
 *   avgReads: number;
 *   maxReads: number;
 *   totalReads: number;
 * }>
 */
export async function getAccountArticleStats(params: AccountSearchParams): Promise<{
  totalArticles: number;
  recentArticles: number;
  avgReads: number;
  maxReads: number;
  totalReads: number;
}> {
  try {
    const allArticles = await searchAccountArticles({ ...params, timeRange: 'all' })
    const recentArticles = await searchAccountArticles({ ...params, timeRange: 'recent' })

    const totalReads = allArticles.reduce((sum, article) => sum + article.reads, 0)
    const maxReads = Math.max(...allArticles.map(article => article.reads))
    const avgReads = allArticles.length > 0 ? Math.round(totalReads / allArticles.length) : 0

    return {
      totalArticles: allArticles.length,
      recentArticles: recentArticles.length,
      avgReads,
      maxReads,
      totalReads
    }
  } catch (error) {
    console.error('获取公众号文章统计失败:', error)
    throw new Error(`获取公众号文章统计失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}
