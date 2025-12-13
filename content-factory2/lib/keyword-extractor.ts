/**
 * 关键词提取工具
 * 用于从文章标题中提取核心关键词
 */

// 停用词列表
const STOP_WORDS = [
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', '上', '也', '很',
  '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '她',
  '他', '它', '们', '吗', '呢', '啊', '呀', '哦', '吧', '啦', '呗', '呵', '哈', '嗯', '唉',
  '了', '吗', '呢', '啊', '吧', '么', '呢', '啊', '啦', '呀', '哦', '吧', '嗯', '唉'
]

/**
 * 从标题中提取关键词
 * @param title 文章标题
 * @returns 关键词数组
 */
export function extractKeywords(title: string): string[] {
  // 移除标点符号，保留中文、英文、数字和空格
  const cleanTitle = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 分词并过滤停用词
  const words = cleanTitle
    .split(' ')
    .filter(word => word.length > 1 && !STOP_WORDS.includes(word))

  // 去重并返回前5个最长的关键词
  const uniqueWords = Array.from(new Set(words))
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)

  return uniqueWords
}

/**
 * 生成搜索关键词组合
 * @param keywords 关键词数组
 * @returns 搜索关键词组合
 */
export function generateSearchKeywords(keywords: string[]): string[] {
  const searchKeywords: string[] = []

  // 单个关键词
  keywords.forEach(keyword => {
    searchKeywords.push(keyword)
  })

  // 两词组合
  for (let i = 0; i < keywords.length - 1; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      searchKeywords.push(`${keywords[i]} ${keywords[j]}`)
    }
  }

  // 三词组合（最多前3个）
  if (keywords.length >= 3) {
    searchKeywords.push(`${keywords[0]} ${keywords[1]} ${keywords[2]}`)
  }

  return searchKeywords.slice(0, 10) // 最多返回10个组合
}

/**
 * 分析标题的主题类别
 * @param title 文章标题
 * @returns 主题类别
 */
export function analyzeTitleTheme(title: string): {
  category: string;
  topics: string[];
  suggestions: string[];
} {
  const lowerTitle = title.toLowerCase()

  // 定义常见主题类别和关键词
  const themes = {
    '健康养生': {
      keywords: ['健康', '养生', '疾病', '治疗', '保健', '中医', '西医', '营养', '运动', '减肥', '健身'],
      category: '健康养生'
    },
    '职场发展': {
      keywords: ['职场', '工作', '求职', '面试', '职业', '升职', '加薪', '创业', '管理', '领导'],
      category: '职场发展'
    },
    '情感心理': {
      keywords: ['情感', '心理', '恋爱', '婚姻', '家庭', '教育', '孩子', '亲子', '沟通', '关系'],
      category: '情感心理'
    },
    '财经理财': {
      keywords: ['理财', '投资', '股票', '基金', '买房', '保险', '贷款', '信用卡', '省钱', '赚钱'],
      category: '财经理财'
    },
    '科技数码': {
      keywords: ['科技', '数码', '手机', '电脑', 'APP', '软件', '编程', 'AI', '人工智能', '互联网'],
      category: '科技数码'
    },
    '生活美食': {
      keywords: ['美食', '菜谱', '旅游', '购物', '穿搭', '美妆', '生活', '家居', '装修', '宠物'],
      category: '生活美食'
    },
    '娱乐文化': {
      keywords: ['电影', '音乐', '游戏', '明星', '娱乐', '文化', '艺术', '书籍', '阅读', '写作'],
      category: '娱乐文化'
    }
  }

  // 匹配主题
  let matchedTheme = null
  let maxScore = 0

  for (const [themeName, themeData] of Object.entries(themes)) {
    const score = themeData.keywords.filter(keyword => lowerTitle.includes(keyword)).length
    if (score > maxScore) {
      maxScore = score
      matchedTheme = themeData
    }
  }

  if (matchedTheme) {
    return {
      category: matchedTheme.category,
      topics: matchedTheme.keywords.filter(k => lowerTitle.includes(k)),
      suggestions: generateSuggestions(matchedTheme.category, lowerTitle)
    }
  }

  return {
    category: '综合',
    topics: [],
    suggestions: ['建议补充更具体的关键词', '考虑目标读者的兴趣点']
  }
}

/**
 * 生成内容建议
 * @param category 主题类别
 * @param title 标题
 * @returns 建议列表
 */
function generateSuggestions(category: string, title: string): string[] {
  const suggestions = {
    '健康养生': [
      '可以结合季节性内容，如夏季养生、冬季保暖等',
      '考虑目标人群：年轻人、中年人、老年人',
      '建议提供实用的健康小贴士和方法'
    ],
    '职场发展': [
      '可以分享职场经验或行业洞察',
      '考虑不同职业阶段的痛点需求',
      '建议提供具体可行的解决方案'
    ],
    '情感心理': [
      '注重情感共鸣和实用性',
      '考虑不同人生阶段的情感问题',
      '建议保持专业性和同理心'
    ],
    '财经理财': [
      '注重数据准确性和时效性',
      '考虑不同风险偏好的读者需求',
      '建议提供清晰的投资建议'
    ],
    '科技数码': [
      '保持技术内容的准确性',
      '考虑普通用户的技术水平',
      '建议提供实用的使用技巧'
    ],
    '生活美食': [
      '注重内容的生活实用性',
      '考虑季节性和地域差异',
      '建议提供详细的制作方法'
    ],
    '娱乐文化': [
      '注重个人观点的独特性',
      '考虑目标受众的兴趣点',
      '建议保持内容的新鲜感'
    ]
  }

  return suggestions[category as keyof typeof suggestions] || ['建议深入了解该领域的用户需求']
}