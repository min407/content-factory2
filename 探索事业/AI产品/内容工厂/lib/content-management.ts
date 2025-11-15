/**
 * 内容管理服务
 * 负责历史记录管理和草稿管理
 */

import { GeneratedArticle, Draft, ArticleHistoryRecord } from '@/types/ai-analysis'

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 历史记录管理
 */
export class HistoryManager {
  /**
   * 保存文章到历史记录
   */
  static saveToHistory(article: GeneratedArticle): void {
    try {
      const history = this.getHistory()
      const newRecord: ArticleHistoryRecord = {
        id: generateId(),
        article,
        createdAt: new Date(),
        topicId: article.topicId
      }

      const updatedHistory = [newRecord, ...history]
      localStorage.setItem('article-history', JSON.stringify(updatedHistory))

      console.log('文章已保存到历史记录')
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  /**
   * 获取历史记录
   */
  static getHistory(): ArticleHistoryRecord[] {
    try {
      const data = localStorage.getItem('article-history')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('获取历史记录失败:', error)
      return []
    }
  }

  /**
   * 获取最近7天的历史记录
   */
  static getRecentHistory(days: number = 7): ArticleHistoryRecord[] {
    const history = this.getHistory()
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return history.filter(record =>
      new Date(record.createdAt) > cutoffDate
    )
  }

  /**
   * 清理过期历史记录
   */
  static cleanupHistory(days: number = 7): void {
    try {
      const history = this.getHistory()
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const validHistory = history.filter(record =>
        new Date(record.createdAt) > cutoffDate
      )

      localStorage.setItem('article-history', JSON.stringify(validHistory))

      if (validHistory.length < history.length) {
        console.log(`清理了 ${history.length - validHistory.length} 条过期历史记录`)
      }
    } catch (error) {
      console.error('清理历史记录失败:', error)
    }
  }

  /**
   * 删除特定历史记录
   */
  static deleteFromHistory(recordId: string): boolean {
    try {
      const history = this.getHistory()
      const updatedHistory = history.filter(record => record.id !== recordId)

      if (updatedHistory.length < history.length) {
        localStorage.setItem('article-history', JSON.stringify(updatedHistory))
        return true
      }

      return false
    } catch (error) {
      console.error('删除历史记录失败:', error)
      return false
    }
  }

  /**
   * 清空所有历史记录
   */
  static clearHistory(): void {
    try {
      localStorage.removeItem('article-history')
      console.log('已清空所有历史记录')
    } catch (error) {
      console.error('清空历史记录失败:', error)
    }
  }
}

/**
 * 草稿管理
 */
export class DraftManager {
  /**
   * 保存草稿
   */
  static async saveToDraft(article: GeneratedArticle): Promise<Draft> {
    try {
      const draft: Draft = {
        id: generateId(),
        title: article.title,
        content: article.content,
        images: article.images,
        topicId: article.topicId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft'
      }

      // 保存到本地
      const drafts = this.getDrafts()
      const updatedDrafts = [draft, ...drafts]
      localStorage.setItem('drafts', JSON.stringify(updatedDrafts))

      // 尝试同步到发布管理API
      await this.syncToPublishAPI(draft)

      console.log('草稿已保存')
      return draft
    } catch (error) {
      console.error('保存草稿失败:', error)
      throw error
    }
  }

  /**
   * 获取所有草稿
   */
  static getDrafts(): Draft[] {
    try {
      const data = localStorage.getItem('drafts')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('获取草稿失败:', error)
      return []
    }
  }

  /**
   * 根据ID获取特定草稿
   */
  static getDraft(draftId: string): Draft | null {
    try {
      const drafts = this.getDrafts()
      return drafts.find(draft => draft.id === draftId) || null
    } catch (error) {
      console.error('获取草稿失败:', error)
      return null
    }
  }

  /**
   * 更新草稿
   */
  static updateDraft(draftId: string, updates: Partial<Draft>): boolean {
    try {
      const drafts = this.getDrafts()
      const draftIndex = drafts.findIndex(draft => draft.id === draftId)

      if (draftIndex === -1) return false

      drafts[draftIndex] = {
        ...drafts[draftIndex],
        ...updates,
        updatedAt: new Date()
      }

      localStorage.setItem('drafts', JSON.stringify(drafts))

      // 同步到发布管理API
      this.syncToPublishAPI(drafts[draftIndex])

      return true
    } catch (error) {
      console.error('更新草稿失败:', error)
      return false
    }
  }

  /**
   * 删除草稿
   */
  static deleteDraft(draftId: string): boolean {
    try {
      const drafts = this.getDrafts()
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId)

      if (updatedDrafts.length < drafts.length) {
        localStorage.setItem('drafts', JSON.stringify(updatedDrafts))
        return true
      }

      return false
    } catch (error) {
      console.error('删除草稿失败:', error)
      return false
    }
  }

  /**
   * 同步草稿到发布管理API
   */
  private static async syncToPublishAPI(draft: Draft): Promise<void> {
    try {
      // 这里可以调用发布管理的API
      // 目前先模拟，后续可以接入真实的API
      console.log('同步草稿到发布管理API:', draft.id)

      // 示例API调用
      const response = await fetch('/api/publish/drafts', {
        method: draft.id.includes('temp-') ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      })

      if (!response.ok) {
        console.warn('同步到发布管理API失败:', response.statusText)
      }
    } catch (error) {
      console.warn('同步到发布管理API出错:', error)
      // 不抛出错误，避免影响本地保存
    }
  }

  /**
   * 从发布管理API获取草稿
   */
  static async fetchDraftsFromAPI(): Promise<Draft[]> {
    try {
      const response = await fetch('/api/publish/drafts')
      if (!response.ok) {
        throw new Error('获取草稿失败')
      }

      const apiDrafts = await response.json()

      // 合并本地和API的草稿（以API为主，去重）
      const localDrafts = this.getDrafts()
      const mergedDrafts = this.mergeDrafts(apiDrafts, localDrafts)

      localStorage.setItem('drafts', JSON.stringify(mergedDrafts))
      return mergedDrafts
    } catch (error) {
      console.error('从API获取草稿失败:', error)
      return this.getDrafts()
    }
  }

  /**
   * 合并草稿（去重，以最新的为准）
   */
  private static mergeDrafts(apiDrafts: Draft[], localDrafts: Draft[]): Draft[] {
    const draftMap = new Map<string, Draft>()

    // 先添加API草稿
    apiDrafts.forEach(draft => {
      draftMap.set(draft.id, draft)
    })

    // 再添加本地草稿，如果ID相同则比较更新时间
    localDrafts.forEach(draft => {
      const existing = draftMap.get(draft.id)
      if (!existing || new Date(draft.updatedAt) > new Date(existing.updatedAt)) {
        draftMap.set(draft.id, draft)
      }
    })

    // 转换为数组并按更新时间倒序排列
    return Array.from(draftMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  /**
   * 清空所有草稿
   */
  static clearDrafts(): void {
    try {
      localStorage.removeItem('drafts')
      console.log('已清空所有草稿')
    } catch (error) {
      console.error('清空草稿失败:', error)
    }
  }
}

/**
 * 内容统计信息
 */
export class ContentStats {
  /**
   * 获取内容统计
   */
  static getStats() {
    const history = HistoryManager.getRecentHistory(7)
    const drafts = DraftManager.getDrafts()

    return {
      recentArticles: history.length,
      totalDrafts: drafts.length,
      publishedDrafts: drafts.filter(d => d.status === 'published').length,
      draftDrafts: drafts.filter(d => d.status === 'draft').length,
      averageWordCount: history.length > 0
        ? Math.round(history.reduce((sum, record) => sum + record.article.wordCount, 0) / history.length)
        : 0,
      lastCreated: history.length > 0 ? history[0].createdAt : null
    }
  }
}