/**
 * AI分析服务层
 * 提供与OpenAI兼容API的调用服务
 */

import {
  ArticleSummary,
  TopicInsight,
  TopicWithHistory,
  GeneratedArticle,
  CreationParams
} from '@/types/ai-analysis'

// OpenAI配置从环境变量读取
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

/**
 * 调用OpenAI API
 */
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 未配置')
  }

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature,
      response_format: { type: 'text' },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(`OpenAI API错误: ${error.error?.message || response.statusText}`)
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
  }>
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
  ], 0.3)

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
        console.warn(`文章${index + 1}缺少关键字段: targetAudience/scenario/painPoint`)
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
  }
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
  ], 0.4)

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
      console.log(`AI生成了${insights.length}条选题洞察，截取前10条`)
      insights = insights.slice(0, 10)
    } else {
      console.log(`AI生成了${insights.length}条选题洞察`)
    }

    // 验证关键字段
    insights.forEach((insight: any, index: number) => {
      if (!insight.keywords?.scene || !insight.keywords?.audience || !insight.keywords?.need) {
        console.warn(`洞察${index + 1}缺少必需的关键词字段`)
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

**决策阶段**: ${decisionStage.stage} - ${decisionStage.reason}
**目标人群**: ${audienceScene.audience}
**使用场景**: ${audienceScene.scene}
**情绪痛点**: ${demandPainPoint.emotionalPain}
**现实需求**: ${demandPainPoint.realisticPain}
**期望获得**: ${demandPainPoint.expectation}

请根据以上分析，采用最适合的：
- 语气风格：${getRecommendedTone(decisionStage.stage, demandPainPoint.emotionalPain)}
- 内容结构：${getRecommendedStructure(decisionStage.stage)}
- 案例类型：${getRecommendedCaseType(audienceScene.audience)}
- 互动方式：${getRecommendedInteraction(demandPainPoint.expectation)}
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
  return toneMap[stage] || '专业客观'
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
  return structureMap[stage] || '标准结构'
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
 * 生成单个AI文章
 */
export async function generateSingleArticle(params: CreationParams): Promise<GeneratedArticle> {
  const { topic, length, style, imageCount, uniqueAngle } = params

  // 1. 生成智能写作提示词
  const stylePrompt = generateWritingStylePrompt(topic)

  // 2. 获取字数范围
  const wordCount = getWordCountRange(length)

  // 3. 构建完整文章生成提示词
  const articlePrompt = `
请基于以下选题洞察，生成一篇高质量的文章：

**选题**: ${topic.title}
**描述**: ${topic.description}
**重要指数**: ${topic.confidence}%
${uniqueAngle ? `**独特角度**: ${uniqueAngle}` : ''}

${stylePrompt}

**写作要求**:
- 字数：${wordCount}字
- 风格：${style}
- 结构：包含引人入胜的开头、主体内容、实用建议、总结展望
- 内容：基于三维度分析提供有价值的内容
- 语言：中文，流畅自然，适合微信公众号发布

请生成完整的文章内容（包含标题）。
`

  // 4. 调用OpenAI生成文章
  const articleContent = await callOpenAI([
    { role: 'system', content: '你是专业的文章创作者，擅长基于深度洞察生成高质量内容。你的文章结构清晰，内容实用，语言优美。' },
    { role: 'user', content: articlePrompt }
  ], 0.7)

  // 5. 生成配图
  const images = await generateArticleImages(topic, imageCount)

  // 6. 构建返回对象
  return {
    id: generateId(),
    title: extractTitleFromContent(articleContent),
    content: articleContent,
    images,
    wordCount: countWords(articleContent),
    readingTime: calculateReadingTime(articleContent),
    topicId: topic.id,
    createdAt: new Date(),
    parameters: params
  }
}

/**
 * 根据文章长度参数获取字数范围
 */
function getWordCountRange(length: string): string {
  const lengthMap = {
    '500-800': '600-800',
    '800-1200': '900-1200',
    '1000-1500': '1200-1500',
    '1500-2000': '1600-2000',
    '2000+': '2000-2500'
  }
  return lengthMap[length] || '1200-1500'
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
      return trimmed.replace(/^#+\s*/, '')
    } else if (trimmed.length > 10 && trimmed.length < 50) {
      return trimmed
    }
  }

  // 如果没有找到合适的标题，使用内容的前30个字符
  const firstLine = lines[0]?.trim() || ''
  return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine || '未命名文章'
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
 * 生成AI配图
 */
export async function generateArticleImages(topic: TopicWithHistory, imageCount: number): Promise<string[]> {
  if (imageCount === 0) return []

  const prompts = generateImagePrompts(topic, imageCount)
  const images = []

  for (const prompt of prompts) {
    try {
      const image = await generateSingleImage(prompt)
      images.push(image)
    } catch (error) {
      console.error('图片生成失败:', error)
      // 使用fallback图片
      images.push(getFallbackImage(prompt))
    }
  }

  return images
}

/**
 * 根据选题内容生成图片提示词
 */
function generateImagePrompts(topic: TopicWithHistory, count: number): string[] {
  const basePrompts = [
    `${topic.audienceScene.audience}在${topic.audienceScene.scene}的场景插画，简洁现代风格，商务插画`,
    `${topic.title}相关的概念图，信息图表风格，蓝色调`,
    `${topic.demandPainPoint.expectation}的视觉化表达，积极向上风格，温暖色调`,
    '现代办公场景插画，简洁扁平化设计',
    '学习和成长主题插画，励志风格'
  ]
  return basePrompts.slice(0, count)
}

/**
 * 生成单个AI图片（使用SiliconFlow API）
 */
async function generateSingleImage(prompt: string): Promise<string> {
  const apiKey = process.env.SILICONFLOW_API_KEY
  const apiBase = process.env.SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1'
  const model = process.env.SILICONFLOW_MODEL || 'Kwai-Kolors/Kolors'

  if (!apiKey) {
    throw new Error('SiliconFlow API key not configured')
  }

  const response = await fetch(`${apiBase}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: `${prompt}, high quality, professional illustration style, no text`,
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(`SiliconFlow API错误: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.data[0]?.url || ''
}

/**
 * 获取fallback图片
 */
function getFallbackImage(prompt: string): string {
  // 根据prompt关键词返回相关的Unsplash图片
  const keywords = prompt.toLowerCase().match(/[\u4e00-\u9fa5]+|[a-z]+/gi) || []

  if (keywords.some(k => k.includes('办公') || k.includes('工作'))) {
    return 'https://source.unsplash.com/1024x1024/?office,workspace'
  } else if (keywords.some(k => k.includes('学习') || k.includes('教育'))) {
    return 'https://source.unsplash.com/1024x1024/?education,learning'
  } else if (keywords.some(k => k.includes('创业') || k.includes('商业'))) {
    return 'https://source.unsplash.com/1024x1024/?business,startup'
  } else if (keywords.some(k => k.includes('家庭') || k.includes('生活'))) {
    return 'https://source.unsplash.com/1024x1024/?family,lifestyle'
  }

  return 'https://source.unsplash.com/1024x1024/?technology,innovation'
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
      console.error(`第${i + 1}篇文章生成失败:`, error)
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
  return `从${angles[index % angles.length]}，结合第${Math.floor(index / angles.length) + 1}个维度分析`
}
