/**
 * AI分析相关类型定义
 */

// 增强的文章分析（阶段1输出）
export interface ArticleSummary {
  index?: number
  keyPoints: string[]        // 关键要点（3-5个）
  keywords: string[]         // 关键词（5个以上）
  highlights: string[]       // 内容亮点（1-2个）
  engagementAnalysis: string // 互动表现分析

  // 新增深度分析字段
  targetAudience: string     // 目标人群（必须）
  scenario: string          // 使用场景（必须）
  painPoint: string         // 痛点需求（必须）
  contentAngle: string      // 内容角度
  emotionType: string       // 情感类型
  writingStyle: string      // 写作风格
}

// 增强的选题洞察（阶段2输出）
export interface TopicInsight {
  title: string              // 洞察标题
  description: string        // 详细描述
  confidence: number         // 置信度（60-100）
  evidence: string[]         // 证据（引用文章标题）
  tags: string[]            // 额外标签

  // 三维度分析字段
  decisionStage: {
    stage: '觉察期' | '认知期' | '调研期' | '决策期' | '行动期' | '成果期'
    reason: string           // 基于文章内容判断用户心理状态和行为阶段的理由
  }
  audienceScene: {
    audience: string         // 从文章内容分析出的具体人群特征
    scene: string           // 与人群匹配的具体使用场景
    reason: string          // 基于文章内容分析人群场景匹配度的理由
  }
  demandPainPoint: {
    emotionalPain: string   // 用户的情绪痛点
    realisticPain: string   // 用户的现实痛点
    expectation: string     // 用户的期望需求
    reason: string          // 基于文章内容分析用户产生问题根本原因的理由
  }

  // 其他分析字段
  marketPotential: 'high' | 'medium' | 'low'  // 市场潜力
  contentSaturation: number                    // 内容饱和度 0-100
  recommendedFormat: string                    // 推荐内容形式
  keyDifferentiators: string[]                 // 关键差异化点
}

// 带历史信息的选题洞察
export interface TopicWithHistory extends TopicInsight {
  id: string
  createdAt: Date
  sourceAnalysis: string  // 来源分析记录标识
}

// 生成的文章类型
export interface GeneratedArticle {
  id: string
  title: string
  content: string
  images: string[]
  wordCount: number
  readingTime: number
  topicId: string
  createdAt: Date
  parameters: CreationParams
}

// 文章生成参数
export interface CreationParams {
  topic: TopicWithHistory
  length: string
  style: string
  imageCount: number
  uniqueAngle?: string
}

// 文章历史记录
export interface ArticleHistoryRecord {
  id: string
  article: GeneratedArticle
  createdAt: Date
  topicId: string
}

// 草稿类型
export interface Draft {
  id: string
  title: string
  content: string
  images: string[]
  topicId: string
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'published' | 'archived'
}

// 用户偏好设置
export interface CreationPreferences {
  defaultLength: string
  defaultStyle: string
  defaultImageCount: string
  autoSave: boolean
}

// 完整的AI分析结果
export interface AIAnalysisResult {
  summaries: ArticleSummary[]  // 文章摘要
  insights: TopicInsight[]     // 选题洞察
  wordCloud?: Array<{          // 词云数据
    word: string
    count: number
    size: number
  }>
  analysisTime?: number        // 分析耗时（毫秒）
  aiModel?: string            // AI模型版本
}

// AI服务配置
export interface AIServiceConfig {
  apiKey: string
  apiBase: string
  model: string
  temperature?: number
}
