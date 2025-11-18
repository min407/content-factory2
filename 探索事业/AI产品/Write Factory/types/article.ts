// API响应类型定义
export interface ArticleSearchResponse {
  code: number;
  cost_money: number;
  cut_words: string;
  data: ArticleData[];
  data_number: number;
  msg: string;
  page: number;
  remain_money: number;
  total: number;
  total_page: number;
  [property: string]: any;
}

export interface ArticleData {
  /**
   * 封面
   */
  avatar: string;
  /**
   * 分类
   */
  classify: string;
  /**
   * 正文
   */
  content: string;
  /**
   * 原始id
   */
  ghid: string;
  /**
   * 发布地址
   */
  ip_wording: string;
  /**
   * 是否原创
   */
  is_original: number;
  /**
   * 再看数
   */
  looking: number;
  /**
   * 点赞数
   */
  praise: number;
  /**
   * 发布时间
   */
  publish_time: number;
  publish_time_str: string;
  /**
   * 阅读数
   */
  read: number;
  /**
   * 文章原始短链接
   */
  short_link: string;
  /**
   * 文章标题
   */
  title: string;
  /**
   * 更新时间
   */
  update_time: number;
  update_time_str: string;
  /**
   * 文章长连接
   */
  url: string;
  /**
   * wxid
   */
  wx_id: string;
  /**
   * 公众号名字
   */
  wx_name: string;
  [property: string]: any;
}

// API请求参数类型定义
export interface ArticleSearchParams {
  kw: string;              // 关键词
  sort_type?: number;      // 排序类型 1-最新 2-最热
  mode?: number;           // 模式 1-精确 2-模糊
  period?: number;         // 时间范围（天） 1,7,30,90
  page?: number;           // 页码
  key: string;             // API密钥
  any_kw?: string;         // 任意关键词
  ex_kw?: string;          // 排除关键词
  verifycode?: string;     // 验证码
  type?: number;           // 类型 1-文章 2-视频
}

// AI配置类型定义
export interface AIConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'qwen' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// AI摘要结果类型
export interface ArticleSummary {
  title: string;
  originalTitle: string;
  summary: string;
  keywords: string[];
  highlights: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  targetAudience: string;
  coreInsights: string[];
  emotionalTone: string;
  readability: 'easy' | 'medium' | 'hard';
  estimatedReadTime: number; // 分钟
  contentCategories: string[];
  callToAction?: string;
  dataPoints?: {
    statistics?: string[];
    examples?: string[];
    quotes?: string[];
  };
  generatedAt: string;
}

// AI深度洞察类型
export interface TopicInsight {
  id: string;
  title: string;
  description: string;
  actionableAdvice: string[];
  confidence: number; // 0-100
  dataSupport: string;
  trendingTopics: string[];
  targetKeywords: string[];
  suggestedAngles: string[];
  potentialChallenges: string[];
  recommendedContentTypes: string[];
  bestPostingTimes: string[];
  estimatedEngagement: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high';
  generatedAt: string;
}

// AI分析结果类型
export interface AIAnalysisResult {
  summaries: ArticleSummary[];
  insights: TopicInsight[];
  costEstimate: {
    tokensUsed: number;
    estimatedCost: number;
    currency: string;
  };
  processingTime: number; // 毫秒
  aiModelUsed: string;
  cacheHit: boolean;
  recommendations: {
    contentType: string;
    tone: string;
    length: string;
    frequency: string;
  };
}

// 分析进度状态
export interface AnalysisProgress {
  stage: 'fetching' | 'summarizing' | 'analyzing' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  error?: string;
}

// 结构化文章摘要 - 从文章中提取的关键信息
export interface StructuredArticleSummary {
  id: string;
  title: string;
  originalTitle: string;
  contentSummary: string;          // 内容概述
  scenarios: string[];             // 场景关键词 (至少3个)
  targetAudience: string[];        // 人群关键词 (至少3个)
  coreNeeds: string[];            // 需求关键词 (至少3个)
  highlights: string[];           // 文章亮点/核心观点
  emotionalValue: string;         // 情绪价值
  practicalValue: string;         // 实用价值
  commercialPotential: 'high' | 'medium' | 'low';  // 商业潜力
  viralElements: string[];        // 爆款元素
  keyMetrics: {
    readCount: number;
    likeCount: number;
    engagementRate: number;
  };
  generatedAt: string;
}

// 深度选题洞察
export interface DeepTopicInsight {
  id: string;
  title: string;                    // 洞察标题
  category: 'trend' | 'opportunity' | 'audience' | 'content' | 'monetization';  // 洞察类别
  priority: 'high' | 'medium' | 'low';  // 优先级
  description: string;             // 详细描述
  keyFindings: string[];           // 关键发现
  targetAudience: string[];        // 目标受众
  contentAngles: string[];         // 内容角度建议
  commercialValue: string;         // 商业价值
  actionability: number;           // 可操作性评分 1-10
  supportingData: {
    articleCount: number;          // 支持文章数量
    totalReads: number;           // 总阅读量
    avgEngagement: number;        // 平均互动率
    confidenceScore: number;      // 置信度分数
  };
  recommendations: string[];       // 具体建议
  relatedTopics: string[];         // 相关话题
  generatedAt: string;
}

// 深度AI分析结果
export interface DeepAIAnalysisResult {
  topic: string;
  totalArticles: number;
  processedArticles: number;
  summaries: StructuredArticleSummary[];
  insights: DeepTopicInsight[];
  overallMetrics: {
    totalReads: number;
    totalLikes: number;
    avgEngagement: number;
    topicPotential: 'high' | 'medium' | 'low';
  };
  generatedAt: string;
  processingStats: {
    totalTime: number;
    tokensUsed: number;
    estimatedCost: number;
  };
}

// AI处理统计
export interface AIProcessingStats {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  totalTokensUsed: number;
  totalCost: number;
  averageProcessingTime: number;
  mostUsedModel: string;
  lastAnalysisDate: string;
}