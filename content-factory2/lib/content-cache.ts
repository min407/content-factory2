/**
 * 内容缓存和历史记录管理服务
 * 负责智能缓存、历史记录管理和数据持久化
 */

import { GeneratedArticle, CreationParams, ContentHistoryItem, CacheItem, ImageStyle, ImageRatio, CoverTemplate } from '@/types/ai-analysis'

/**
 * 图片风格配置
 */
export const IMAGE_STYLES: ImageStyle[] = [
  {
    value: 'auto',
    label: '智能选择',
    description: '根据文章内容自动匹配风格',
    promptTemplate: '根据文章内容自动选择最适合的插画风格，确保与主题高度相关'
  },
  {
    value: 'business',
    label: '商务专业',
    description: '适合商业、职场类内容',
    promptTemplate: 'professional business illustration, clean design, corporate colors, modern office setting, professional attire'
  },
  {
    value: 'creative',
    label: '创意插画',
    description: '适合创意、艺术类内容',
    promptTemplate: 'creative artistic illustration, vibrant colors, imaginative style, artistic elements, creative concept'
  },
  {
    value: 'minimalist',
    label: '简约现代',
    description: '适合科技、设计类内容',
    promptTemplate: 'minimalist modern illustration, clean lines, simple colors, modern aesthetic, professional design'
  },
  {
    value: 'tech',
    label: '科技未来',
    description: '适合科技、未来感内容',
    promptTemplate: 'tech futuristic illustration, digital aesthetic, technology elements, innovative design, sci-fi influence'
  },
  {
    value: 'lifestyle',
    label: '生活温馨',
    description: '适合生活、情感类内容',
    promptTemplate: 'warm lifestyle illustration, cozy atmosphere, natural lighting, human elements, emotional connection'
  }
]

/**
 * 图片比例配置
 */
export const IMAGE_RATIOS: ImageRatio[] = [
  {
    value: '2.35:1',
    label: '封面 2.35:1（推荐）',
    description: '适合公众号封面、横幅',
    aspectRatio: '2.35:1'
  },
  {
    value: '1:1',
    label: '正方形 1:1',
    description: '适合社交媒体头像、封面',
    aspectRatio: '1:1'
  },
  {
    value: '4:3',
    label: '标准 4:3',
    description: '适合传统展示、文章插图',
    aspectRatio: '4:3'
  },
  {
    value: '16:9',
    label: '宽屏 16:9',
    description: '适合横幅、演示文稿',
    aspectRatio: '16:9'
  },
  {
    value: '3:4',
    label: '竖版 3:4',
    description: '适合移动端展示、故事',
    aspectRatio: '3:4'
  },
  {
    value: '9:16',
    label: '手机屏 9:16',
    description: '适合短视频、手机壁纸',
    aspectRatio: '9:16'
  }
]

/**
 * 公众号封面模板配置
 */
export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'professional',
    name: '商务专业',
    description: '适合商业、职场、技术类内容',
    preview: '/templates/cover-professional.jpg',
    promptTemplate: 'Professional WeChat official account cover image, clean design, business style, 2.35:1 aspect ratio, elegant typography, modern layout, suitable for business content',
    titleFont: 'PingFang SC Bold',
    titleColor: '#ffffff',
    backgroundColor: '#1a365d',
    layout: 'center'
  },
  {
    id: 'creative',
    name: '创意设计',
    description: '适合设计、创意、艺术类内容',
    preview: '/templates/cover-creative.jpg',
    promptTemplate: 'Creative WeChat cover design, artistic style, vibrant colors, 2.35:1 aspect ratio, modern typography, creative layout, suitable for design and art content',
    titleFont: 'PingFang SC Medium',
    titleColor: '#2d3748',
    backgroundColor: '#f7fafc',
    layout: 'bottom'
  },
  {
    id: 'lifestyle',
    name: '生活温馨',
    description: '适合生活、情感、故事类内容',
    preview: '/templates/cover-lifestyle.jpg',
    promptTemplate: 'Warm lifestyle WeChat cover, cozy atmosphere, soft colors, 2.35:1 aspect ratio, friendly typography, inviting layout, suitable for lifestyle and emotional content',
    titleFont: 'PingFang SC Regular',
    titleColor: '#2d3748',
    backgroundColor: '#fef5e7',
    layout: 'center'
  },
  {
    id: 'tech',
    name: '科技未来',
    description: '适合科技、数字化、未来类内容',
    preview: '/templates/cover-tech.jpg',
    promptTemplate: 'Tech futuristic WeChat cover, digital aesthetic, blue tones, 2.35:1 aspect ratio, modern typography, innovative layout, suitable for technology and digital content',
    titleFont: 'PingFang SC Bold',
    titleColor: '#ffffff',
    backgroundColor: '#2b6cb0',
    layout: 'center'
  },
  {
    id: 'minimal',
    name: '简约极简',
    description: '适合极简、现代、高端内容',
    preview: '/templates/cover-minimal.jpg',
    promptTemplate: 'Minimalist WeChat cover, clean design, monochrome palette, 2.35:1 aspect ratio, elegant typography, simple layout, suitable for premium and minimalist content',
    titleFont: 'PingFang SC Light',
    titleColor: '#1a202c',
    backgroundColor: '#ffffff',
    layout: 'top'
  }
]

/**
 * 内容缓存管理类
 */
export class ContentCache {
  // 生成内容缓存键
  static generateCacheKey(params: CreationParams): string {
    const keyParts = [
      params.topic.id,
      params.length,
      params.style,
      params.imageCount,
      params.imageStyle || 'auto',
      params.imageRatio || '4:3',
      params.uniqueAngle || ''
    ]
    return `content_${keyParts.join('_')}`
  }

  // 生成历史记录ID
  static generateHistoryId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 检查缓存
  static async getCachedContent(cacheKey: string): Promise<GeneratedArticle | null> {
    if (typeof window === 'undefined') return null

    try {
      const cacheData = localStorage.getItem('content-cache')
      if (!cacheData) return null

      const cache: Record<string, CacheItem> = JSON.parse(cacheData)
      const item = cache[cacheKey]

      if (!item || new Date(item.expiresAt) < new Date()) {
        // 缓存过期，删除
        delete cache[cacheKey]
        localStorage.setItem('content-cache', JSON.stringify(cache))
        return null
      }

      return item.content
    } catch (error) {
      console.error('获取缓存失败:', error)
      return null
    }
  }

  // 保存到缓存
  static async saveToCache(cacheKey: string, content: GeneratedArticle, params: CreationParams): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const cacheData = localStorage.getItem('content-cache')
      const cache: Record<string, CacheItem> = cacheData ? JSON.parse(cacheData) : {}

      // 缓存7天
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      cache[cacheKey] = {
        content,
        expiresAt,
        parameters: params
      }

      localStorage.setItem('content-cache', JSON.stringify(cache))
      console.log(`内容已缓存，有效期7天`)
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  // 清理过期缓存
  static async cleanupExpiredCache(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const cacheData = localStorage.getItem('content-cache')
      if (!cacheData) return

      const cache: Record<string, CacheItem> = JSON.parse(cacheData)
      const now = new Date()

      let cleanedCount = 0
      Object.keys(cache).forEach(key => {
        if (new Date(cache[key].expiresAt) < now) {
          delete cache[key]
          cleanedCount++
        }
      })

      if (cleanedCount > 0) {
        localStorage.setItem('content-cache', JSON.stringify(cache))
        console.log(`清理了 ${cleanedCount} 个过期缓存`)
      }
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }
}

/**
 * 内容历史记录管理类
 */
export class ContentHistory {
  // 保存到历史记录
  static async saveToHistory(
    content: GeneratedArticle,
    params: CreationParams,
    generationTime: number
  ): Promise<ContentHistoryItem> {
    if (typeof window === 'undefined') {
      throw new Error('历史记录功能仅在客户端可用')
    }

    try {
      const historyItem: ContentHistoryItem = {
        id: ContentCache.generateHistoryId(),
        type: 'article',
        title: content.title,
        content: content.content,
        images: content.images,
        parameters: params,
        createdAt: new Date(),
        cacheKey: ContentCache.generateCacheKey(params),
        topic: params.topic,
        wordCount: content.wordCount,
        imageStyle: params.imageStyle,
        generationTime
      }

      const history = this.getHistory()
      history.unshift(historyItem)

      // 限制最多保存100条
      const limitedHistory = history.slice(0, 100)

      localStorage.setItem('content-history', JSON.stringify(limitedHistory))
      console.log(`内容已保存到历史记录，共 ${limitedHistory.length} 条`)

      return historyItem
    } catch (error) {
      console.error('保存历史记录失败:', error)
      throw error
    }
  }

  // 获取历史记录
  static getHistory(): ContentHistoryItem[] {
    if (typeof window === 'undefined') return []

    try {
      const historyData = localStorage.getItem('content-history')
      if (!historyData) return []

      const history: ContentHistoryItem[] = JSON.parse(historyData)

      // 修复日期反序列化
      return history.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt)
      }))
    } catch (error) {
      console.error('获取历史记录失败:', error)
      return []
    }
  }

  // 获取历史记录（分页）
  static async getHistoryPage(page: number = 1, limit: number = 20): Promise<{
    items: ContentHistoryItem[]
    total: number
    hasMore: boolean
  }> {
    const history = this.getHistory()
    const total = history.length
    const startIndex = (page - 1) * limit
    const items = history.slice(startIndex, startIndex + limit)
    const hasMore = startIndex + limit < total

    return { items, total, hasMore }
  }

  // 按类型筛选历史记录
  static getHistoryByType(type: 'article' | 'image'): ContentHistoryItem[] {
    return this.getHistory().filter(item => item.type === type)
  }

  // 搜索历史记录
  static searchHistory(query: string): ContentHistoryItem[] {
    const history = this.getHistory()
    const lowerQuery = query.toLowerCase()

    return history.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.content?.toLowerCase().includes(lowerQuery) ||
      item.parameters.topic.title.toLowerCase().includes(lowerQuery)
    )
  }

  // 删除历史记录
  static deleteFromHistory(historyId: string): boolean {
    if (typeof window === 'undefined') return false

    try {
      const history = this.getHistory()
      const filteredHistory = history.filter(item => item.id !== historyId)

      if (filteredHistory.length < history.length) {
        localStorage.setItem('content-history', JSON.stringify(filteredHistory))
        return true
      }

      return false
    } catch (error) {
      console.error('删除历史记录失败:', error)
      return false
    }
  }

  // 清空历史记录
  static clearHistory(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem('content-history')
      console.log('历史记录已清空')
    } catch (error) {
      console.error('清空历史记录失败:', error)
    }
  }

  // 导出历史记录为Markdown
  static exportToMarkdown(historyId?: string): string {
    const history = historyId
      ? this.getHistory().filter(item => item.id === historyId)
      : this.getHistory()

    if (history.length === 0) return '# 暂无历史记录\n\n---'

    let markdown = '# 内容生成历史记录\n\n'
    markdown += `导出时间：${new Date().toLocaleString()}\n`
    markdown += `总计：${history.length} 条记录\n\n`

    history.forEach((item, index) => {
      markdown += `## ${index + 1}. ${item.title}\n\n`
      markdown += `**生成时间**: ${item.createdAt.toLocaleString()}\n`
      markdown += `**字数**: ${item.wordCount} 字\n`
      markdown += `**图片风格**: ${item.imageStyle || '智能选择'}\n`
      markdown += `**生成耗时**: ${item.generationTime}ms\n`
      markdown += `**参数配置**:\n`
      markdown += `- 文章长度: ${item.parameters.length}\n`
      markdown += `- 写作风格: ${item.parameters.style}\n`
      markdown += `- 配图数量: ${item.parameters.imageCount}\n`
      markdown += `- 图片风格: ${item.parameters.imageStyle || '智能选择'}\n\n`

      if (item.content) {
        markdown += `### 文章内容\n\n`
        markdown += `${item.content}\n\n`
      }

      if (item.images && item.images.length > 0) {
        markdown += `### 配图\n\n`
        item.images.forEach((image, imgIndex) => {
          markdown += `![配图${imgIndex + 1}](${image})\n\n`
        })
      }

      markdown += `---\n\n`
    })

    return markdown
  }
}

/**
 * 工具函数
 */
export class ContentUtils {
  // 根据文章长度计算图片数量
  static calculateImageCount(wordCount: number): number {
    if (wordCount < 800) return 1        // 短文章：1张配图
    if (wordCount < 1500) return 2       // 中等文章：2张配图
    if (wordCount < 2500) return 3       // 长文章：3张配图
    return Math.min(4, Math.floor(wordCount / 800)) // 超长文章：最多4张
  }

  // 统计字数
  static countWords(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
    return chineseChars + englishWords
  }

  // 计算阅读时间（分钟）
  static calculateReadingTime(content: string): number {
    const wordCount = this.countWords(content)
    return Math.max(1, Math.ceil(wordCount / 500))
  }

  // 获取推荐的图片风格
  static getRecommendedImageStyle(topic: any): string {
    // 基于三维度分析推荐图片风格
    const { decisionStage, audienceScene, demandPainPoint } = topic

    if (audienceScene.audience.includes('创业') || audienceScene.audience.includes('老板')) {
      return 'business'
    }
    if (audienceScene.audience.includes('设计师') || audienceScene.audience.includes('创作')) {
      return 'creative'
    }
    if (audienceScene.audience.includes('程序员') || audienceScene.audience.includes('技术')) {
      return 'tech'
    }
    if (audienceScene.audience.includes('妈妈') || audienceScene.audience.includes('宝妈')) {
      return 'lifestyle'
    }

    return 'auto'
  }
}