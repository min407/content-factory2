/**
 * AI分析服务层
 * 提供与OpenAI兼容API的调用服务
 */

import {
  ArticleSummary,
  TopicInsight,
  TopicWithHistory,
  GeneratedArticle,
  CreationParams,
  ImageStyle,
  ArticleCover,
  CoverTemplate
} from '@/types/ai-analysis'
import { ContentCache, IMAGE_STYLES, IMAGE_RATIOS, COVER_TEMPLATES, ContentUtils } from './content-cache'

import { UserApiConfigManager } from './user-api-config'
import { ApiProvider } from '@/types/api-config'

// 获取文章结构类型的提示词模板
const getStructurePromptTemplate = (structureType: string): string => {
  const templates: Record<string, string> = {
    'auto': '请根据内容特点和目标读者，自动选择最适合的公众号文章结构。',

    'checklist': `
请采用**清单体结构**创作，要求：
1. 开头：明确说明清单主题和核心价值（3-5句话）
2. 主体：以"1、2、3……"数字列点形式展开，每个要点包含：
   - 简洁有力的小标题
   - 具体说明（2-3句话）
   - 案例/数据/工具推荐（1个）
3. 结尾：总结要点，给出行动建议或推荐工具
4. 风格：条理清晰，信息密度适中，易于快速阅读`,

    'knowledge_parallel': `
请采用**干货体-并列式结构**创作，要求：
1. 开头：提出核心问题或主题，引出多个观点
2. 主体：按"观点1+案例1+小结+观点2+案例2+小结……"结构：
   - 每个观点独立成段，逻辑并列
   - 每个观点搭配真实案例或数据支撑
   - 观点之间保持平衡，避免主次不分
3. 结尾：总结观点之间的关系，给出综合建议
4. 风格：逻辑严谨，论证充分，专业性强`,

    'knowledge_progressive': `
请采用**干货体-递进式结构**创作，要求：
1. 开头：明确概念定义或问题现状（是什么）
2. 主体：按"现状分析→原因拆解→解决方案"递进：
   - 深入分析问题的根本原因（为什么）
   - 逐步给出解决方案的层次和步骤（怎么办）
   - 每个层次都要建立在前一层次基础上
3. 结尾：总结解决路径，给出可操作的建议
4. 风格：深度思考，逻辑严密，层层递进`,

    'story': `
请采用**故事体结构**创作，要求：
1. 开头：制造冲突或悬念，快速吸引注意力
2. 主体：按"起因→经过→转折→结果"推进：
   - 展开具体细节，营造画面感和代入感
   - 描述挑战、挣扎和突破的关键时刻
   - 融入真实情感，引发读者共鸣
3. 结尾：升华情绪，提炼感悟或金句
4. 风格：情感真挚，画面感强，有温度的叙事`,

    'scqa': `
请采用**SCQA结构**创作，要求：
1. 情境(Situation)：描述背景或现状，建立共识
2. 冲突(Complication)：指出问题或矛盾，引发关注
3. 疑问(Question)：提出核心问题，引导思考
4. 答案(Answer)：给出解决方案，提供价值
5. 风格：条理清晰，逻辑严密，适合分析类内容`,

    'staircase': `
请采用**爬楼梯结构**创作，要求：
1. 起点：现状描述或问题引入
2. 楼梯1：第一层观点/情节发展
3. 楼梯2：第二层深入/情节推进
4. 楼梯3：更高层次/情节高潮
5. 终点：总结升华/结局收尾
6. 每一层都要比前一层更有深度或强度
7. 风格：逐步升级，层层深入，引导情绪`,

    'assorted': `
请采用**拼盘式结构**创作，要求：
1. 开头：明确主题方向，建立统一框架
2. 主体：按时间、空间、类型等关键词串联：
   - 多个素材模块，形式多样
   - 每个模块相对独立但服务于统一主题
   - 用过渡句自然连接不同模块
3. 结尾：整合各模块要点，给出整体建议
4. 风格：内容丰富，形式多样，信息量大`
  }

  return templates[structureType] || templates['auto']
}

/**
 * 获取OpenAI配置
 */
async function getOpenAIConfig(userConfig?: { apiKey: string; apiBase: string; model: string }) {
  try {
    // 直接使用环境变量中的API配置
    const envApiKey = process.env.OPENAI_API_KEY || ''
    const envApiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1'
    const envModel = process.env.OPENAI_MODEL || 'openai/gpt-4o'

    if (envApiKey) {
      console.log(`🔑 [AI服务] 使用环境变量API密钥: ${envApiKey.substring(0, 8)}...`)
      console.log(`🌐 [AI服务] 使用环境变量API地址: ${envApiBase}`)
      console.log(`🤖 [AI服务] 使用模型: ${envModel}`)

      return {
        apiKey: envApiKey,
        apiBase: envApiBase,
        model: envModel
      }
    } else {
      throw new Error('环境变量中未找到OpenAI API配置')
    }
  } catch (error) {
    console.error('获取AI配置失败:', error)
    return {
      apiKey: process.env.OPENAI_API_KEY || '',
      apiBase: process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1',
      model: process.env.OPENAI_MODEL || 'openai/gpt-4o'
    }
  }
}

/**
 * 调用OpenAI API
 */
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7,
  userConfig?: { apiKey: string; apiBase: string; model: string }
): Promise<string> {
  const config = await getOpenAIConfig(userConfig)

  if (!config.apiKey) {
    throw new Error('API密钥未配置，请在设置中配置OpenRouter API密钥')
  }

  // OpenRouter 需要特殊的请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + config.apiKey,
  }

  // 如果是 OpenRouter，添加额外的请求头
  if (config.apiBase.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'http://localhost:3000'
    headers['X-Title'] = 'Content Factory'
  }

  // 添加调试信息
  console.log('🔍 [DEBUG] 实际使用的API密钥:', config.apiKey)
  console.log('🔍 [DEBUG] 请求URL:', config.apiBase + '/chat/completions')
  console.log('🔍 [DEBUG] 请求头:', headers)

  const response = await fetch(config.apiBase + '/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      response_format: { type: 'text' },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error('OpenAI API错误: ' + (error.error?.message || response.statusText));
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * 深度文章分析（阶段1增强版）
 * 对每篇文章进行深入的内容和用户分析
 */
export async function deepAnalyzeArticles(
  articles: Array<{
    title: string
    content?: string
    likes: number
    reads: number
    url: string
  }>,
  userConfig?: { apiKey: string; apiBase: string; model: string }
): Promise<ArticleSummary[]> {
  if (!articles || articles.length === 0) {
    return []
  }

  // 构建详细的文章数据
  const articlesJson = JSON.stringify(
    articles.map((a, i) => ({
      index: i + 1,
      title: a.title,
      content: (a.content || '').substring(0, 3000), // 增加内容长度以获得更好分析
      likes: a.likes,
      reads: a.reads,
      engagement: a.reads > 0 ? ((a.likes / a.reads) * 100).toFixed(1) : '0',
    }))
  )

  const prompt = `你是一个资深的内容分析专家。请对以下${articles.length}篇微信公众号文章进行深度分析，提取结构化信息。

文章数据：
${articlesJson}

请为每篇文章输出以下JSON格式：
{
  "summaries": [
    {
      "index": 1,
      "keyPoints": ["要点1", "要点2", "要点3"],
      "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5", "关键词6"],
      "highlights": ["亮点1", "亮点2"],
      "engagementAnalysis": "互动表现分析（50字以内）",

      // 新增的深度分析字段（必须填写）
      "targetAudience": "明确的目标人群，如：职场新人、宝妈、大学生、创业者等",
      "scenario": "具体使用场景，如：工作日早晨、周末休息、睡前阅读、通勤路上等",
      "painPoint": "解决的痛点需求，如：时间紧张、选择困难、技能缺失、信息焦虑等",
      "contentAngle": "内容角度，如：实用教程、经验分享、趋势分析、产品评测等",
      "emotionType": "情感类型，如：激励鼓舞、温暖治愈、理性分析、幽默轻松等",
      "writingStyle": "写作风格，如：干货满满、故事性强、数据驱动、观点鲜明等"
    }
  ]
}

核心要求：
1. **targetAudience、scenario、painPoint 这三个字段必须准确填写**，这是后续选题洞察的关键
2. keyPoints: 3-5个最有价值的要点
3. keywords: 至少5个关键词，包含主题词、人群词、场景词、痛点词
4. highlights: 1-2个最有特色的内容亮点
5. engagementAnalysis: 基于互动数据分析内容受欢迎的原因

只输出JSON格式，不要任何解释文字。`

  const response = await callOpenAI([
    { role: 'system', content: '你是一个专业的内容深度分析专家，擅长从文章中提取结构化信息，只输出JSON格式数据。' },
    { role: 'user', content: prompt },
  ], 0.3, userConfig)

  // 解析JSON响应
  try {
    // 清理响应中的markdown标记
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace('```json', '').replace('```', '').trim()
    }

    const parsed = JSON.parse(cleanResponse)
    const summaries = parsed.summaries || []

    // 验证关键字段是否完整
    summaries.forEach((summary: any, index: number) => {
      if (!summary.targetAudience || !summary.scenario || !summary.painPoint) {
        console.warn('文章' + (index + 1) + '缺少关键字段: targetAudience/scenario/painPoint');
      }
    })

    return summaries
  } catch (error) {
    console.error('解析AI响应失败:', response)
    throw new Error('深度文章分析失败')
  }
}

/**
 * 生成高质量选题洞察（阶段2增强版）
 * 基于深度文章分析生成不限制数量的选题洞察，按重要指数排序
 */
export async function generateSmartTopicInsights(
  summaries: ArticleSummary[],
  stats: {
    totalArticles: number
    avgReads: number
    avgLikes: number
    avgEngagement: string
  },
  userConfig?: { apiKey: string; apiBase: string; model: string }
): Promise<TopicInsight[]> {
  if (!summaries || summaries.length === 0) {
    return []
  }

  const summariesJson = JSON.stringify(summaries)

  const prompt = `你是一个顶级的内容选题策划专家，专门为微信公众号创作者提供精准的选题洞察。基于对${summaries.length}篇高质量文章的深度分析，请生成尽可能多的具有商业价值的选题洞察。

文章深度分析数据：
${summariesJson}

统计数据：
- 总文章数: ${stats.totalArticles}
- 平均阅读量: ${stats.avgReads}
- 平均点赞数: ${stats.avgLikes}
- 平均互动率: ${stats.avgEngagement}

请严格按照以下三维度分析框架，生成高质量选题洞察（不限制数量）：

**三维度分析框架说明：**

1. **决策阶段**：基于用户旅程觉察阶段，深度分析用户心理状态和行为阶段
   - **觉察期**：用户刚意识到问题存在，处于困惑迷茫阶段，如"为什么我总是效率低下"、"大家都在用AI我不懂怎么办"
   - **认知期**：用户开始主动了解概念和基础信息，如"什么是私域流量"、"AI工具有哪些类型"
   - **调研期**：用户在比较和收集信息，处于选择困难阶段，如"哪个副业最适合我"、"AI写作工具哪个好用"
   - **决策期**：用户准备开始行动，需要具体指导和信心，如"如何开始第一个副业项目"、"AI写作具体步骤"
   - **行动期**：用户已经在执行中，遇到具体问题需要解决，如"副业没效果怎么办"、"AI写作质量不高怎么提升"
   - **成果期**：用户有了初步结果，想要优化和展示，如"副业收入如何提升"、"AI写作效率提升案例"

2. **人群场景**：必须基于文章内容深度分析，精准定位具体人群和使用场景
   - **人群分析**：从文章内容中提取具体的人群特征，如：30岁职场妈妈、二三线城市的程序员、刚毕业的设计师、创业公司老板等，要尽可能具体
   - **场景分析**：结合人群特征分析具体使用场景，如：深夜加班时、地铁通勤路上、带娃间隙时间、周末充电学习、工作中遇到瓶颈时等，要与人群高度匹配
   - **组合分析**：人群+场景的精准匹配，如"深夜加班的程序员想要提升效率"、"带娃间隙的宝妈想学习新技能"

3. **需求痛点**：深度分析用户产生这个问题的根本原因和核心诉求
   - **情绪痛点**：分析用户的情感状态，如：对未来感到焦虑、对现状不满、渴望被认可、害怕落后、想要改变现状等
   - **现实痛点**：分析用户遇到的实际问题，如：收入不够用、工作遇到瓶颈、技能跟不上时代、时间管理困难、选择太多无从下手等
   - **期望需求**：分析用户希望通过内容获得什么，如：找到可行解决方案、获得心理安慰和鼓励、了解行业趋势、学习具体技能、避坑少走弯路等

JSON格式输出：
{
  "insights": [
    {
      "title": "洞察标题（15-20字，简洁有力）",
      "description": "详细分析（120-180字，包含市场分析、用户价值、可行性）",
      "confidence": 85,
      "evidence": ["文章1标题", "文章2标题", "文章3标题"],

      // 关键词分析
      "keywords": {
        "primary": ["核心关键词1", "核心关键词2", "核心关键词3"],
        "secondary": ["次要关键词1", "次要关键词2", "次要关键词3"],
        "category": "关键词分类（如：职场发展、副业创业、技能提升、生活效率等）"
      },

      // 三维度分析
      "decisionStage": {
        "stage": "觉察期/认知期/调研期/决策期/行动期/成果期",
        "reason": "基于文章内容判断用户心理状态和行为阶段的理由（1-2句话）"
      },
      "audienceScene": {
        "audience": "从文章内容分析出的具体人群特征（如：30岁职场妈妈、二三线程序员等）",
        "scene": "与人群匹配的具体使用场景（如：深夜加班、带娃间隙等）",
        "reason": "基于文章内容分析人群场景匹配度的理由（1-2句话）"
      },
      "demandPainPoint": {
        "emotionalPain": "用户的情绪痛点（如：对未来焦虑、害怕落后、渴望被认可等）",
        "realisticPain": "用户的现实痛点（如：收入不足、技能落后、时间管理等）",
        "expectation": "用户的期望需求（如：解决方案、心理安慰、技能学习等）",
        "reason": "基于文章内容分析用户产生问题根本原因的理由（1-2句话）"
      },

      // 其他字段
      "tags": ["标签1", "标签2", "标签3"],
      "marketPotential": "high",          // high/medium/low
      "contentSaturation": 65,            // 0-100的内容饱和度
      "recommendedFormat": "教程类/经验分享/案例分析",
      "keyDifferentiators": ["差异化点1", "差异化点2"]
    }
  ]
}

**核心要求：**
1. **生成多条洞察**（建议5-10条，最多不超过10条）
2. **三维度分析必须深度基于文章内容**：
   - decisionStage.stage 必须准确分析用户心理状态和行为阶段
   - audienceScene.audience/scene 必须从文章内容中提取具体人群特征和使用场景
   - demandPainPoint.emotionalPain/realisticPain/expectation 必须深度分析用户的痛点和需求
3. **每个维度都要有reason字段**，详细说明基于文章内容的判断理由
4. **人群场景要具体化**：避免泛泛而谈，要基于文章内容分析出精准的人群画像和场景
5. **需求痛点要深入**：不能简单分类，要分析用户为什么会产生这个问题的根本原因
6. **confidence 基于证据强度设定**，范围70-95，这是重要指数
7. **evidence 至少引用2-3篇相关文章标题**
8. **确保洞察的多样性和精准性**，覆盖不同用户旅程阶段和具体人群场景

只输出JSON格式，不要任何解释。`

  const response = await callOpenAI([
    { role: 'system', content: '你是顶级的内容选题策划专家，擅长从数据分析中提炼出具有商业价值的选题洞察，只输出JSON格式数据。' },
    { role: 'user', content: prompt },
  ], 0.4, userConfig)

  try {
    // 清理响应中的markdown标记
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace('```json', '').replace('```', '').trim()
    }

    const parsed = JSON.parse(cleanResponse)
    let insights = parsed.insights || []

    // 限制洞察数量最多不超过10条
    if (insights.length === 0) {
      console.warn('AI未能生成任何洞察')
    } else if (insights.length > 10) {
      console.log('AI生成了' + insights.length + '条选题洞察，截取前10条');
      insights = insights.slice(0, 10)
    } else {
      console.log('AI生成了' + insights.length + '条选题洞察');
    }

    // 验证关键字段
    insights.forEach((insight: any, index: number) => {
      if (!insight.title || !insight.description) {
        console.warn('洞察' + (index + 1) + '缺少必需的标题或描述字段');
      }
      if (!insight.confidence || insight.confidence < 60 || insight.confidence > 100) {
        console.warn('洞察' + (index + 1) + '的置信度数值异常，期望60-100之间');
      }
    })

    // 按重要指数（置信度）从高到低排序，置信度就是重要指数
    return insights.sort((a: TopicInsight, b: TopicInsight) => {
      return b.confidence - a.confidence
    })
  } catch (error) {
    console.error('解析洞察失败:', response)
    throw new Error('智能选题洞察生成失败')
  }
}

/**
 * 生成词云数据（基于摘要）
 */
export async function generateWordCloud(summaries: ArticleSummary[]): Promise<Array<{ word: string; count: number; size: number }>> {
  const allKeywords = summaries.flatMap(s => s.keywords || [])

  // 统计词频
  const wordCount: Record<string, number> = {}
  allKeywords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  // 转换为数组并排序
  const sorted = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20) // 前20个
    .map(([word, count], index) => {
      const size = Math.max(20, 48 - index * 2) // 递减大小
      return { word, count, size }
    })

  return sorted
}

/**
 * 基于选题三维度分析生成智能写作风格提示词
 */
export function generateWritingStylePrompt(topic: TopicWithHistory): string {
  const { decisionStage, audienceScene, demandPainPoint } = topic

  return `
基于以下选题分析，自动调整写作风格：

**决策阶段**: ${decisionStage?.stage || '未知'} - ${decisionStage?.reason || '暂无分析'}
**目标人群**: ${audienceScene?.audience || '大众用户'}
**使用场景**: ${audienceScene?.scene || '日常使用'}
**情绪痛点**: ${demandPainPoint?.emotionalPain || '无明显痛点'}
**现实需求**: ${demandPainPoint?.realisticPain || '基本需求'}
**期望获得**: ${demandPainPoint?.expectation || '解决问题'}

请根据以上分析，采用最适合的：
- 语气风格：${getRecommendedTone(decisionStage?.stage || '考虑', demandPainPoint?.emotionalPain || '无明显痛点')}
- 内容结构：${getRecommendedStructure(decisionStage?.stage || '考虑')}
- 案例类型：${getRecommendedCaseType(audienceScene?.audience || '大众用户')}
- 互动方式：${getRecommendedInteraction(demandPainPoint?.expectation || '解决问题')}
`
}

/**
 * 根据决策阶段和情绪痛点推荐语气风格
 */
function getRecommendedTone(stage: string, emotionalPain: string): string {
  const toneMap = {
    '觉察期': '温和引导，富有同理心',
    '认知期': '专业权威，条理清晰',
    '调研期': '客观对比，数据支撑',
    '决策期': '鼓励行动，给予信心',
    '行动期': '实用指导，步骤清晰',
    '成果期': '激励分享，展示价值'
  }
  return toneMap[stage as keyof typeof toneMap] || '专业客观'
}

/**
 * 根据决策阶段推荐内容结构
 */
function getRecommendedStructure(stage: string): string {
  const structureMap = {
    '觉察期': '问题引入 → 现状分析 → 启发思考',
    '认知期': '概念解释 → 核心要点 → 实用建议',
    '调研期': '对比分析 → 优缺点总结 → 选择指导',
    '决策期': '目标设定 → 行动步骤 → 激励鼓舞',
    '行动期': '问题识别 → 解决方案 → 注意事项',
    '成果期': '成果展示 → 经验总结 → 提升方向'
  }
  return structureMap[stage as keyof typeof structureMap] || '标准结构'
}

/**
 * 根据目标人群推荐案例类型
 */
function getRecommendedCaseType(audience: string): string {
  if (audience.includes('职场妈妈') || audience.includes('宝妈')) {
    return '真实故事案例，生活化场景'
  } else if (audience.includes('程序员') || audience.includes('技术')) {
    return '技术实践案例，数据驱动'
  } else if (audience.includes('设计师') || audience.includes('创作')) {
    return '设计作品案例，视觉展示'
  } else if (audience.includes('创业') || audience.includes('老板')) {
    return '商业实战案例，ROI导向'
  }
  return '通用实用案例'
}

/**
 * 根据期望需求推荐互动方式
 */
function getRecommendedInteraction(expectation: string): string {
  if (expectation.includes('解决方案') || expectation.includes('指导')) {
    return '提供可操作步骤，引导实践'
  } else if (expectation.includes('心理安慰') || expectation.includes('鼓励')) {
    return '情感共鸣，积极引导'
  } else if (expectation.includes('学习') || expectation.includes('技能')) {
    return '知识讲解，技能训练'
  }
  return '信息分享，启发思考'
}

/**
 * 生成单个AI文章（增强版，支持缓存和智能图片生成）
 */
export async function generateSingleArticle(params: CreationParams): Promise<GeneratedArticle> {
  const startTime = Date.now()
  const {
    topic,
    length,
    style,
    imageCount,
    uniqueAngle,
    imageStyle = 'auto',
    imageRatio = '4:3',
    creationMode = 'original',
    originalInspiration = '',
    referenceArticles = []
  } = params

  // 获取用户配置的API
  console.log('🔍 [内容创作] 开始获取用户配置...')
  const userConfig = await UserApiConfigManager.getConfig(ApiProvider.OPENROUTER)
  console.log('🔍 [内容创作] 获取到的用户配置:', userConfig ? {
    hasApiKey: !!userConfig.apiKey,
    apiKeyPrefix: userConfig.apiKey?.substring(0, 8) + '...',
    hasApiBase: !!userConfig.apiBase,
    model: userConfig.model
  } : 'null')

  // 修复：优先使用环境变量中的新API密钥
  const openaiUserConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    apiBase: process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1',
    model: process.env.OPENAI_MODEL || 'openai/gpt-4o'
  }

  console.log('🔍 [内容创作] 使用API配置:', {
    apiKeyPrefix: openaiUserConfig.apiKey?.substring(0, 8) + '...',
    apiBase: openaiUserConfig.apiBase,
    model: openaiUserConfig.model
  })

  // 1. 检查缓存
  const cacheKey = ContentCache.generateCacheKey(params)
  const cachedContent = await ContentCache.getCachedContent(cacheKey)
  if (cachedContent) {
    console.log('使用缓存内容，跳过生成')
    return cachedContent
  }

  // 2. 生成智能写作提示词
  const stylePrompt = generateWritingStylePrompt(topic)

  // 3. 获取字数范围
  const wordCount = getWordCountRange(length)

  // 4. 根据创作模式生成不同的提示词
  let modeSpecificPrompt = ''
  let referenceContent = ''

  if (creationMode === 'reference' && referenceArticles.length > 0) {
    // 对标模式
    const articlesInfo = referenceArticles.map((article, index) =>
      '**对标文章' + (index + 1) + '**:\n标题：' + article.title + '\n摘要：' + article.summary + '\n数据：' + (article.reads || 'N/A') + '阅读，' + (article.likes || 'N/A') + '点赞'
    ).join('\n\n')

    referenceContent = `
**对标分析要求**：
请深入分析以下对标爆文，提取其爆点和优质内容要素：

${articlesInfo}

**深度分析任务**：
1. **爆点分析**：这些文章为什么会火？标题吸引力、内容价值、情感共鸣点
2. **结构分析**：文章的结构安排、段落布局、逻辑递进
3. **表达特色**：语言风格、用词特点、表达方式
4. **价值点**：为读者提供的实用价值和收获

**二创创作要求**：
- 深度吸收对标文章的优点和亮点
- 在原文基础上进行创新性改写和提升
- 保持核心价值但加入独特观点和见解
- 避免直接抄袭，确保原创性和差异化
- 学习其爆款逻辑但表达方式要不同
`
  } else if (creationMode === 'original' && originalInspiration) {
    // 原创模式
    referenceContent = `
**原创灵感输入**：
${originalInspiration}

**原创创作要求**：
- 深度理解和融入用户的原创灵感和观点
- 将用户的核心思想作为文章的主线和灵魂
- 围绕原创灵感展开，确保文章主题统一
- 发挥创意空间，用更丰富的内容和表达来丰富灵感
- 保持用户观点的完整性和一致性
- 在用户灵感基础上进行专业化和深度化处理
`
  } else {
    // 默认模式
    referenceContent = ''
  }

  // 5. 获取文章结构类型提示词（如果选择了对标模式）
  const structurePrompt = creationMode === 'reference' && params.articleStructure
    ? getStructurePromptTemplate(params.articleStructure)
    : ''

  // 6. 构建完整文章生成提示词
  const articlePrompt = `
请基于以下信息，生成一篇高质量的微信公众号文章：

**创作模式**: ${creationMode === 'reference' ? '对标创作模式' : '原创创作模式'}

**基础信息**：
**选题**: ${topic.title}
**描述**: ${topic.description}
**重要指数**: ${topic.confidence}%
${uniqueAngle ? '**独特角度**: ' + uniqueAngle : ''}

${stylePrompt}

${structurePrompt}

${referenceContent}

**核心写作要求**:
- 字数：${wordCount}字
- 风格：${style}
- 语言：中文，流畅自然，适合微信公众号发布
- 标题：直接输出干净的标题，不要"主标题"、"副标题"等标识，不要多余符号（如：·、•、：、#等），标题要简洁有力，可直接发布

**排版要求**（非常重要）:
1. **标题结构**:
   - 主标题明确吸引人
   - 使用2-3级小标题分割内容
   - 每个小标题控制在15字以内

2. **段落优化**:
   - 每段控制在3-5行，避免大段文字
   - 段落之间用空行分隔
   - 每句话长度控制在25字以内
   - 使用短句，避免复杂长句

3. **内容结构**:
   - 开头：3秒内抓住读者注意力，点明核心价值
   - 主体：分3-5个部分，每个部分有小标题，逻辑清晰
   - 结尾：总结要点，提供实用建议或引发思考

4. **阅读体验**:
   - 使用列表符号（• 或 1. 2. 3.）列举要点
   - 适当使用粗体强调重点
   - 使用问句引起思考
   - 加入具体案例、数据和场景

5. **爆款文章特征**:
   - 开头吸引力强，价值点明确
   - 内容实用有价值，解决读者痛点
   - 结构清晰易读，逻辑递进自然
   - 结尾有共鸣点或行动指引

请按照以上要求生成完整的文章内容（包含标题）。
`

  // 5. 调用OpenAI生成文章
  const articleContent = await callOpenAI([
    { role: 'system', content: '你是专业的文章创作者，擅长基于深度洞察生成高质量内容。你的文章结构清晰，内容实用，语言优美。' },
    { role: 'user', content: articlePrompt }
  ], 0.7, openaiUserConfig)

  // 6. 提取标题和统计字数
  // 对标模式下直接使用第一篇对标文章的标题
  let title: string
  if (creationMode === 'reference' && referenceArticles.length > 0) {
    title = referenceArticles[0].title
    console.log('对标模式：使用原文章标题:', title)
  } else {
    title = extractTitleFromContent(articleContent)
    console.log('原创模式：生成新标题:', title)
  }

  const wordCountActual = countWords(articleContent)
  const readingTime = calculateReadingTime(articleContent)

  // 7. 根据文章实际长度智能调整图片数量
  const actualImageCount = imageStyle === 'auto'
    ? ContentUtils.calculateImageCount(wordCountActual)
    : Math.min(imageCount, ContentUtils.calculateImageCount(wordCountActual))

  // 8. 生成配图（使用新的智能图片生成系统）
  const images = await generateSmartArticleImages(articleContent, title, actualImageCount, imageStyle, topic, imageRatio, openaiUserConfig)

  // 9. 构建返回对象
  // 9. 生成封面图片
  let cover: ArticleCover | undefined
  try {
    console.log('开始生成文章封面...')
    cover = await generateArticleCover(title, articleContent)
    console.log('文章封面生成成功')
  } catch (error) {
    console.error('封面生成失败:', error)
    // 封面生成失败不影响文章本身
  }

  const generatedArticle: GeneratedArticle = {
    id: generateId(),
    title,
    content: articleContent,
    images,
    cover,
    wordCount: wordCountActual,
    readingTime,
    topicId: topic.id,
    createdAt: new Date(),
    parameters: params
  }

  // 10. 保存到缓存（历史记录由客户端处理）
  const generationTime = Date.now() - startTime
  await ContentCache.saveToCache(cacheKey, generatedArticle, params)

  console.log('文章生成完成，耗时 ' + generationTime + 'ms，字数 ' + wordCountActual + '，图片 ' + images.length + ' 张' + (cover ? '，包含封面' : ''));

  return generatedArticle
}

/**
 * 根据文章长度参数获取字数范围
 */
function getWordCountRange(length: string): string {
  const lengthMap = {
    '500': '400-500',
    '500-800': '600-800',
    '800-1200': '900-1200',
    '1000-1500': '1200-1500',
    '1500-2000': '1600-2000',
    '2000+': '2000-2500'
  }
  return lengthMap[length as keyof typeof lengthMap] || '1200-1500'
}

/**
 * 从文章内容中提取标题
 */
function extractTitleFromContent(content: string): string {
  const lines = content.split('\n').filter(line => line.trim())

  // 查找第一个可能的标题（不包含#的行或者第一行#标题）
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      let title = trimmed.replace(/^#+\s*/, '')
      title = cleanTitle(title)
      if (title.length >= 8 && title.length <= 50) {
        return title
      }
    } else if (trimmed.length > 10 && trimmed.length < 50) {
      const title = cleanTitle(trimmed)
      return title
    }
  }

  // 如果没有找到合适的标题，使用内容的前30个字符
  const firstLine = lines[0]?.trim() || ''
  const cleanedFirstLine = cleanTitle(firstLine)
  return cleanedFirstLine.length > 30 ? cleanedFirstLine.substring(0, 30) + '...' : cleanedFirstLine || '未命名文章'
}

/**
 * 清理标题，移除不需要的字符和格式
 */
function cleanTitle(title: string): string {
  return title
    // 移除Markdown粗体标记
    .replace(/\*\*/g, '')
    // 移除常见的标题标识符
    .replace(/^(主标题|副标题|标题|小标题)[：:]\s*/i, '')
    .replace(/^(（主标题）|【主标题】|《主标题》|（副标题）|【副标题】|《副标题》)/gi, '')
    // 移除多余的符号
    .replace(/[·••·]/g, '')
    .replace(/[:：]\s*$/, '') // 移除末尾的冒号
    .replace(/^\s*[#【】《》()\[\]{}]\s*/, '') // 移除开头和结尾的括号类符号
    .replace(/\s*[#【】《》()\[\]{}]\s*$/, '')
    // 清理多余空格
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 统计文章字数
 */
function countWords(content: string): number {
  // 中文字符计数 + 英文单词计数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
}

/**
 * 计算阅读时间（分钟）
 */
function calculateReadingTime(content: string): number {
  const wordCount = countWords(content)
  // 假设每分钟阅读500字
  return Math.max(1, Math.ceil(wordCount / 500))
}

/**
 * 智能文章图片生成系统（基于文章内容生成图片提示词）
 */
export async function generateSmartArticleImages(
  articleContent: string,
  articleTitle: string,
  imageCount: number,
  imageStyle: string,
  topic?: TopicWithHistory,
  imageRatio?: string,
  userConfig?: { apiKey: string; apiBase: string; model: string }
): Promise<string[]> {
  if (imageCount === 0) return []

  try {
    // 1. 基于文章内容生成图片提示词
    const imagePrompts = await generateImagePromptsFromContent(articleContent, articleTitle, imageCount, topic, userConfig)

    // 2. 获取图片风格配置
    const styleConfig = IMAGE_STYLES.find(style => style.value === imageStyle) || IMAGE_STYLES[0]

    // 3. 并行生成图片
    const imagePromises = imagePrompts.map(async (prompt, index) => {
      try {
        // 3.1 为每个提示词添加风格修饰
        const styledPrompt = applyImageStyle(prompt, styleConfig, index)

        // 3.2 生成图片
        const imageUrl = await generateSingleImageWithRetry(styledPrompt)

        return imageUrl
      } catch (error) {
        console.error('第 ' + (index + 1) + ' 张图片生成失败:', error);
        // 3.3 使用fallback图片
        return getFallbackImageWithStyle(prompt, styleConfig, index)
      }
    })

    // 4. 等待所有图片生成完成（使用 allSettled 确保部分失败不影响其他图片）
    const results = await Promise.allSettled(imagePromises)

    // 5. 提取成功的图片URL
    const images = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value)

    console.log('成功生成 ' + images.length + '/' + imageCount + ' 张图片，风格: ' + styleConfig.label);

    return images

  } catch (error) {
    console.error('智能图片生成系统失败:', error)
    // 如果整个系统失败，返回基础fallback图片
    return Array.from({ length: imageCount }, (_, i) => getFallbackImageWithStyle('', IMAGE_STYLES[0], i))
  }
}

/**
 * 基于文章内容生成图片提示词
 */
async function generateImagePromptsFromContent(
  articleContent: string,
  articleTitle: string,
  count: number,
  topic?: TopicWithHistory,
  userConfig?: { apiKey: string; apiBase: string; model: string }
): Promise<string[]> {
  try {
    // 截取文章关键段落用于分析
    const contentForAnalysis = articleContent.length > 2000
      ? articleContent.substring(0, 2000) + '...'
      : articleContent

    const prompt = '请基于以下文章内容，生成 ' + count + ' 个完全不同的插画提示词，每张图都必须有独特的视觉识别。\n\n文章标题：' + articleTitle + '\n文章内容：' + contentForAnalysis + '\n\n🔥 **严格禁止重复命令** - 违者零分：\n1. **绝对禁止重复**: 任何两个提示词都不能有相似的场景、人物、动作、构图\n2. **绝对禁止相似**: 避免使用同义词、相似的描述方式、重复的元素\n3. **强制视觉差异**: 每张图都要让人一眼就能区分，完全不同\n\n🎯 **差异化具体要求**:\n第1张图：**引入场景** - 矛盾/问题的初始状态，冷色调，单人，室内\n第2张图：**转折过程** - 思考/寻找解决方案，暖色调，多人，室外\n第3张图：**行动实践** - 具体执行的关键时刻，中性色调，双人，特写\n第4张图：**成果展示** - 成功改变的瞬间，明亮色调，群体，远景\n\n📋 **每张图必须包含的差异化元素**：\n- **时间**: 早晨/午后/傍晚/深夜（全部分配不同的时间）\n- **地点**: 办公室/咖啡馆/公园/会议室/家里（5个不同地点循环）\n- **人物**: 年轻人/中年人/老人/男/女/混合（不同角色）\n- **视角**: 仰视/俯视/平视/侧视/特写（完全不同视角）\n- **情绪**: 困惑/专注/兴奋/满足/期待（不同情感状态）\n- **动作**: 思考/讨论/实践/庆祝/展望（不同行为）\n\n🎨 **风格统一性要求**:\n- 统一的插画风格（扁平化、现代简约）\n- 一致的色彩体系（每张图有主色调但保持整体协调）\n- 相同的艺术表现手法（线条、光影、质感）\n\n请直接输出 ' + count + ' 行提示词，每行一个，不要编号。确保每行都是完全不同的场景描述：\n\n示例（仅供参考结构，不要抄袭）：\n清晨办公室窗边，年轻人低头沉思的侧脸特写，冷蓝色调\n下午咖啡馆里，两人在笔记本前激烈讨论的热烈场景，暖橙色调\n黄昏公园长椅上，中年人望着远方思考的孤独背影，中性灰色调\n夜晚城市夜景中，团队在落地窗前庆祝成功的欢乐剪影，明亮金色调\n...'

    const response = await callOpenAI([
      {
        role: 'system',
        content: '你是顶级插画提示词专家，专门生成完全不同的场景描述。你的核心原则是：每张图片都必须有独特的视觉识别，绝对不能有相似或重复的场景。严格遵循用户的差异化要求，确保时间、地点、人物、视角、情绪、动作都完全不同。只输出简洁的提示词，不要解释。'
      },
      { role: 'user', content: prompt }
    ], 0.7, userConfig)

    // 解析响应中的提示词
    let prompts = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10) // 过滤掉太短的行
      .slice(0, count) // 确保数量正确

    // 后处理验证：检查并修复重复或相似的提示词
    prompts = validateAndFixPrompts(prompts, count, topic)

    // 如果AI生成的提示词不足，补充基础提示词
    while (prompts.length < count) {
      prompts.push(generateFallbackPrompt(topic, prompts.length))
    }

    console.log('生成的' + count + '个提示词，已确保完全不同');
    return prompts

  } catch (error) {
    console.error('基于内容生成图片提示词失败:', error)
    // 降级到基础提示词生成
    return Array.from({ length: count }, (_, i) => generateFallbackPrompt(topic, i))
  }
}

/**
 * 验证并修复重复或相似的提示词
 */
function validateAndFixPrompts(prompts: string[], targetCount: number, topic?: TopicWithHistory): string[] {
  const validatedPrompts = [...prompts]
  const duplicateIndices: number[] = []

  // 检查重复或相似的提示词
  for (let i = 0; i < validatedPrompts.length; i++) {
    for (let j = i + 1; j < validatedPrompts.length; j++) {
      if (arePromptsSimilar(validatedPrompts[i], validatedPrompts[j])) {
        duplicateIndices.push(j)
      }
    }
  }

  // 替换重复的提示词
  const uniqueIndices = [...Array(targetCount)].map((_, i) => i)
  const cleanIndices = uniqueIndices.filter(index => !duplicateIndices.includes(index))

  for (const duplicateIndex of duplicateIndices) {
    if (validatedPrompts[duplicateIndex]) {
      validatedPrompts[duplicateIndex] = generateUniqueFallbackPrompt(topic, duplicateIndex, validatedPrompts)
    }
  }

  return validatedPrompts.slice(0, targetCount)
}

/**
 * 判断两个提示词是否相似
 */
function arePromptsSimilar(prompt1: string, prompt2: string): boolean {
  // 移除标点符号和空格，转换为小写进行比较
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '')

  const norm1 = normalize(prompt1)
  const norm2 = normalize(prompt2)

  // 如果完全相同，肯定相似
  if (norm1 === norm2) return true

  // 检查关键元素重复
  const elements1 = extractKeyElements(prompt1)
  const elements2 = extractKeyElements(prompt2)

  // 如果有3个以上相同的关键元素，认为是相似的
  const commonElements = elements1.filter(el => elements2.includes(el))
  return commonElements.length >= 3
}

/**
 * 提取提示词中的关键元素
 */
function extractKeyElements(prompt: string): string[] {
  const elements: string[] = []

  // 提取地点相关词汇
  const locations = ['办公室', '会议室', '咖啡馆', '公园', '家里', '室外', '室内', '城市', '街道']
  // 提取时间相关词汇
  const times = ['清晨', '早晨', '下午', '傍晚', '夜晚', '深夜', '白天', '黑夜']
  // 提取人物相关词汇
  const people = ['年轻人', '中年人', '老人', '男人', '女人', '团队', '群体', '单人', '双人']
  // 提取动作相关词汇
  const actions = ['思考', '讨论', '工作', '学习', '庆祝', '休息', '交流', '合作', '创新']
  // 提取视角相关词汇
  const perspectives = ['特写', '远景', '近景', '俯视', '仰视', '平视', '侧视']

  const allKeywords = [...locations, ...times, ...people, ...actions, ...perspectives]

  for (const keyword of allKeywords) {
    if (prompt.includes(keyword)) {
      elements.push(keyword)
    }
  }

  return elements
}

/**
 * 生成独特的备用提示词
 */
function generateUniqueFallbackPrompt(topic: TopicWithHistory | undefined, index: number, existingPrompts: string[] = []): string {
  const baseScenarios = [
    { time: '清晨', location: '办公室', person: '年轻职员', action: '沉思', perspective: '特写', mood: '冷蓝色调' },
    { time: '下午', location: '咖啡馆', person: '两位创业者', action: '讨论', perspective: '中景', mood: '暖橙色调' },
    { time: '傍晚', location: '公园', person: '思考者', action: '散步', perspective: '远景', mood: '中性灰色调' },
    { time: '夜晚', location: '会议室', person: '团队成员', action: '庆祝', perspective: '仰视', mood: '明亮金色调' },
    { time: '深夜', location: '家里', person: '创作者', action: '写作', perspective: '俯视', mood: '柔和紫色调' }
  ]

  // 生成基础提示词
  let scenario = baseScenarios[index % baseScenarios.length]
  let prompt = scenario.time + scenario.location + '里，' + scenario.person + scenario.action + '的' + scenario.perspective + '场景，' + scenario.mood;

  // 确保与现有提示词不重复
  let attempts = 0
  while (existingPrompts.some(existing => arePromptsSimilar(existing, prompt)) && attempts < 10) {
    // 修改场景使其独特
    const modifiers = ['安静地', '专注地', '热烈地', '轻松地', '认真地']
    const randomModifier = modifiers[(index + attempts) % modifiers.length]
    prompt = scenario.time + scenario.location + '里，' + scenario.person + randomModifier + scenario.action + '的' + scenario.perspective + '场景，' + scenario.mood;
    attempts++
  }

  return prompt
}

/**
 * 为图片提示词应用风格
 */
function applyImageStyle(basePrompt: string, styleConfig: ImageStyle, index: number): string {
  // 如果是智能选择风格，根据提示词内容自动选择
  if (styleConfig.value === 'auto') {
    return basePrompt + ', professional illustration style, high quality, consistent visual style'
  }

  // 应用指定风格
  return basePrompt + ', ' + styleConfig.promptTemplate + ', high quality, professional illustration, consistent style'
}

/**
 * 生成单个图片（带重试机制）
 */
async function generateSingleImageWithRetry(prompt: string, maxRetries = 2): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateSingleImage(prompt)
    } catch (error) {
      console.error('图片生成尝试 ' + (attempt + 1) + '/' + (maxRetries + 1) + ' 失败:', error);

      if (attempt === maxRetries) {
        throw error
      }

      // 重试前稍作延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  throw new Error('图片生成重试次数耗尽')
}

/**
 * 生成fallback提示词
 */
function generateFallbackPrompt(topic?: TopicWithHistory, index = 0): string {
  const fallbackPrompts = [
    '现代办公场景插画，简洁专业风格',
    '学习和成长主题插画，励志温暖风格',
    '团队协作场景插画，现代扁平化设计',
    '创新思维概念图，抽象艺术风格',
    '目标达成场景插画，积极向上风格'
  ]

  // 如果有主题信息，生成相关提示词
  if (topic) {
    return [
      (topic.audienceScene?.audience || '用户') + '在' + (topic.audienceScene?.scene || '场景') + '的场景插画，简洁现代风格',
      topic.title + '相关的概念图，信息图表风格',
      (topic.demandPainPoint?.expectation || '需求') + '的视觉化表达，积极风格',
      ...fallbackPrompts
    ][index % 5];
  }

  return fallbackPrompts[index % fallbackPrompts.length]
}

/**
 * 生成带风格的fallback图片
 */
function getFallbackImageWithStyle(prompt: string, styleConfig: ImageStyle, index: number): string {
  // 使用不同seed确保图片多样性
  const seed = Date.now() + '_' + index + '_' + Math.random().toString(36).substring(7);
  return 'https://picsum.photos/seed/' + seed + '/1024/1024.jpg';
}

/**
 * 获取推荐的图片风格（基于主题分析）
 */
export function getRecommendedImageStyle(topic: TopicWithHistory): string {
  return ContentUtils.getRecommendedImageStyle(topic)
}

/**
 * 智能调整图片数量（基于文章长度）
 */
export function calculateOptimalImageCount(wordCount: number, userPreference: number): number {
  const recommendedCount = ContentUtils.calculateImageCount(wordCount)
  return Math.min(userPreference, recommendedCount)
}

/**
 * 清理过期缓存和历史记录
 */
export async function cleanupExpiredData(): Promise<void> {
  await ContentCache.cleanupExpiredCache()
  console.log('数据清理完成')
}

/**
 * 生成单个AI图片（使用SiliconFlow API）
 */
async function generateSingleImage(prompt: string): Promise<string> {
  // 优先使用用户配置的API密钥
  const userConfig = await UserApiConfigManager.getConfig(ApiProvider.SILICONFLOW)
  const apiKey = userConfig?.apiKey || process.env.SILICONFLOW_API_KEY || ''
  const apiBase = userConfig?.apiBase || process.env.SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1'
  const model = userConfig?.model || process.env.SILICONFLOW_MODEL || 'Kwai-Kolors/Kolors'

  // 如果没有API key，直接使用fallback图片
  if (!apiKey) {
    console.log('SiliconFlow API key not configured, using fallback image')
    return getFallbackImage(prompt)
  }

  const response = await fetch(apiBase + '/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      prompt: prompt + ', high quality, professional illustration style, no text',
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error('SiliconFlow API错误: ' + (error.error?.message || response.statusText));
  }

  const data = await response.json()
  return data.data[0]?.url || ''
}

/**
 * 获取fallback图片 - 使用更高质量的占位图服务
 */
function getFallbackImage(prompt: string): string {
  // 使用picsum.photos，它提供更稳定的图片服务和更好的图片质量
  const seed = Math.random().toString(36).substring(7)
  return 'https://picsum.photos/seed/' + seed + '/1024/1024.jpg';
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 批量生成文章
 */
export async function generateBatchArticles(
  topic: TopicWithHistory,
  params: Omit<CreationParams, 'topic'> & { count: number },
  onProgress?: (progress: number) => void
): Promise<GeneratedArticle[]> {
  const articles = []

  for (let i = 0; i < params.count; i++) {
    try {
      // 为每篇文章生成独特的角度
      const uniqueAngle = generateUniqueAnglePrompt(topic, i, params.count)

      const article = await generateSingleArticle({
        ...params,
        topic,
        uniqueAngle
      })

      articles.push(article)

      // 更新进度
      if (onProgress) {
        onProgress(((i + 1) / params.count) * 100)
      }

      // 添加小延迟避免API限制
      if (i < params.count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error('第' + (i + 1) + '篇文章生成失败:', error);
    }
  }

  return articles
}

/**
 * 为每篇文章生成独特的角度
 */
function generateUniqueAnglePrompt(topic: TopicWithHistory, index: number, total: number): string {
  const angles = [
    '从实际案例角度分析',
    '从理论框架角度阐述',
    '从操作步骤角度说明',
    '从常见问题角度解答',
    '从未来趋势角度展望'
  ]

  if (total <= angles.length) {
    return angles[index % angles.length]
  }

  // 如果批量数量大，生成变体
  return '从' + angles[index % angles.length] + '，结合第' + (Math.floor(index / angles.length) + 1) + '个维度分析';
}

/**
 * 生成文章封面图片
 */
export async function generateArticleCover(
  title: string,
  content: string,
  templateId?: string
): Promise<ArticleCover> {
  try {
    // 选择模板
    let selectedTemplate: CoverTemplate
    if (templateId) {
      selectedTemplate = COVER_TEMPLATES.find(t => t.id === templateId) || COVER_TEMPLATES[0]
    } else {
      // 根据内容自动选择模板
      selectedTemplate = selectCoverTemplate(title, content)
    }

    // 提取关键词和主题
    const keywords = extractContentKeywords(title, content)
    const mainTheme = identifyContentTheme(title, content)

    // 构建封面生成提示词
    const coverPrompt = 'Create a professional WeChat official account cover image with the following specifications: Article Title: ' + title + ', Main Theme: ' + mainTheme + ', Keywords: ' + keywords.slice(0, 3).join(', ') + ', Template Style: ' + selectedTemplate.name + ', Requirements: - Aspect ratio: 2.35:1 (900x383px recommended), - Style: ' + selectedTemplate.promptTemplate + ', - Background: ' + selectedTemplate.backgroundColor + ', - Text placement: ' + selectedTemplate.layout + ', - Include the article title: "' + title + '", - Clean, professional, eye-catching design, - High resolution, suitable for social media, - Text should be clearly readable and well-positioned. Generate a stunning cover image that effectively represents the article content and attracts readers\' attention.';

    // 调用图片生成API（这里使用DALL-E或其他图片生成服务）
    const imageUrl = await callImageGenerationAPI(coverPrompt)

    // 创建封面对象
    const cover: ArticleCover = {
      url: imageUrl,
      template: selectedTemplate.id,
      title: title,
      description: 'AI生成的封面 - ' + selectedTemplate.name + '风格',
      prompt: coverPrompt,
      generatedAt: new Date()
    }

    return cover
  } catch (error) {
    console.error('生成封面失败:', error)
    throw new Error('封面生成失败')
  }
}

/**
 * 根据内容自动选择封面模板
 */
function selectCoverTemplate(title: string, content: string): CoverTemplate {
  const lowerTitle = title.toLowerCase()
  const lowerContent = content.toLowerCase()

  // 商务类关键词
  if (lowerTitle.includes('商业') || lowerTitle.includes('职场') ||
      lowerTitle.includes('管理') || lowerTitle.includes('创业') ||
      lowerContent.includes('商业') || lowerContent.includes('职场')) {
    return COVER_TEMPLATES.find(t => t.id === 'professional')!
  }

  // 技术类关键词
  if (lowerTitle.includes('科技') || lowerTitle.includes('技术') ||
      lowerTitle.includes('AI') || lowerTitle.includes('数字化') ||
      lowerContent.includes('科技') || lowerContent.includes('技术')) {
    return COVER_TEMPLATES.find(t => t.id === 'tech')!
  }

  // 设计类关键词
  if (lowerTitle.includes('设计') || lowerTitle.includes('创意') ||
      lowerTitle.includes('艺术') || lowerTitle.includes('美学') ||
      lowerContent.includes('设计') || lowerContent.includes('创意')) {
    return COVER_TEMPLATES.find(t => t.id === 'creative')!
  }

  // 生活类关键词
  if (lowerTitle.includes('生活') || lowerTitle.includes('情感') ||
      lowerTitle.includes('健康') || lowerTitle.includes('故事') ||
      lowerContent.includes('生活') || lowerContent.includes('情感')) {
    return COVER_TEMPLATES.find(t => t.id === 'lifestyle')!
  }

  // 默认使用商务模板
  return COVER_TEMPLATES[0]
}

/**
 * 提取内容关键词
 */
function extractContentKeywords(title: string, content: string): string[] {
  const allText = title + ' ' + content;

  // 简单的关键词提取（实际项目中可以使用更复杂的NLP算法）
  const keywords = allText
    .split(/[，。！？；：\s]+/)
    .filter(word => word.length >= 2)
    .slice(0, 10) // 取前10个关键词

  return keywords
}

/**
 * 识别内容主题
 */
function identifyContentTheme(title: string, content: string): string {
  const allText = (title + ' ' + content).toLowerCase();

  if (allText.includes('科技') || allText.includes('技术') || allText.includes('AI')) {
    return 'technology'
  }
  if (allText.includes('商业') || allText.includes('职场') || allText.includes('管理')) {
    return 'business'
  }
  if (allText.includes('生活') || allText.includes('健康') || allText.includes('情感')) {
    return 'lifestyle'
  }
  if (allText.includes('设计') || allText.includes('创意') || allText.includes('艺术')) {
    return 'creative'
  }

  return 'general'
}

/**
 * 调用图片生成API
 */
async function callImageGenerationAPI(prompt: string): Promise<string> {
  // 这里应该调用实际的图片生成API
  // 可以是DALL-E、Midjourney、Stable Diffusion等

  try {
    const openaiConfig = await getOpenAIConfig()

    // 检查API Key是否配置
    if (!openaiConfig.apiKey) {
      console.warn('OpenAI API Key未配置，使用占位图片')
      return generatePlaceholderImage(prompt)
    }

    // 调用DALL-E API
    const response = await fetch(openaiConfig.apiBase + '/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openaiConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792', // 接近2.35:1比例
        quality: 'standard',
        response_format: 'url'
      })
    })

    if (!response.ok) {
      console.warn('图片生成API错误 (' + response.status + '): ' + response.statusText + '，使用占位图片');
      return generatePlaceholderImage(prompt)
    }

    const data = await response.json()
    if (!data.data || !data.data[0] || !data.data[0].url) {
      console.warn('图片生成API返回数据格式错误，使用占位图片')
      return generatePlaceholderImage(prompt)
    }

    return data.data[0].url
  } catch (error) {
    console.error('图片生成API调用失败:', error)
    return generatePlaceholderImage(prompt)
  }
}

/**
 * 生成占位图片 - 修复为可用的URL格式
 */
function generatePlaceholderImage(prompt: string): string {
  // 使用一个真实的占位图片服务，而不是SVG data URL
  // 这样可以确保图片能够被img标签正确加载
  const colors = ['667eea', '764ba2', 'f093fb', 'f5576c', '4facfe', '00f2fe', '43e97b', '38f9d7']
  const bgColor = colors[Math.floor(Math.random() * colors.length)]
  const textColor = 'ffffff'

  // 使用picsum.photos - 一个稳定的图片占位符服务
  // 900x383 是 2.35:1 的比例
  return `https://picsum.photos/seed/${encodeURIComponent(prompt.substring(0, 50))}/900/383.jpg?blur=2`
}
