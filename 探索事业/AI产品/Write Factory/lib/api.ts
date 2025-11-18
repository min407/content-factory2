import { ArticleSearchParams, ArticleSearchResponse } from '@/types/article';
import { UserManager } from './auth';

const API_BASE_URL = 'https://www.dajiala.com/fbmain/monitor/v3/kw_search';

/**
 * 获取用户的API Key
 * @returns 用户的API Key
 * @throws Error 如果用户未配置API Key
 */
function getUserApiKey(): string {
  // 服务端环境：直接从环境变量获取
  if (typeof process !== 'undefined' && process.env && process.env.JIZHILE_API_KEY) {
    return process.env.JIZHILE_API_KEY;
  }

  // 客户端环境：尝试从UserManager获取
  try {
    const userApiKey = UserManager.getUserApiKey();
    if (userApiKey) {
      return userApiKey;
    }
  } catch (error) {
    // UserManager不可用，继续下一步
  }

  throw new Error('请在设置中配置您的极致了API Key或在环境变量中设置JIZHILE_API_KEY');
}

/**
 * 获取公众号文章
 * @param params 搜索参数
 * @returns 文章搜索结果
 */
export async function fetchArticles(params: Omit<ArticleSearchParams, 'key'>): Promise<ArticleSearchResponse> {
  try {
    // 获取用户API Key
    const userApiKey = getUserApiKey();

    // 调用我们自己的API路由，而不是直接调用第三方API
    const response = await fetch('/api/search-articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kw: params.kw,
        sort_type: params.sort_type || 1,    // 默认最新排序
        mode: params.mode || 1,             // 默认精确匹配
        period: params.period || 7,         // 默认7天内
        page: params.page || 1,             // 默认第一页
        type: params.type || 1,             // 默认文章类型
        any_kw: params.any_kw || '',
        ex_kw: params.ex_kw || '',
        verifycode: params.verifycode || '',
        userApiKey: userApiKey,              // 传递用户的API Key
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || '搜索失败');
    }

    const data: ArticleSearchResponse = result.data;
    return data;
  } catch (error) {
    console.error('获取公众号文章失败:', error);
    throw error;
  }
}

/**
 * 格式化文章数据，用于分析展示
 * @param articles 原始文章数据
 * @returns 格式化后的文章数据
 */
export function formatArticlesForAnalysis(articles: ArticleSearchResponse['data']) {
  console.log('格式化前的原始文章数据:', articles[0]); // 调试输出
  return articles.map(article => {
    const formatted: any = {
      title: article.title || '未知标题',
      content: article.content || '',
      wxName: article.wx_name || '未知公众号',
      reads: typeof article.read === 'number' ? article.read : parseInt(article.read) || 0,
      likes: typeof article.praise === 'number' ? article.praise : parseInt(article.praise) || 0,
      looking: typeof article.looking === 'number' ? article.looking : parseInt(article.looking) || 0,
      publishTime: article.publish_time || 0,
      publishTimeStr: article.publish_time_str || '',
      url: article.url || '',
      shortLink: article.short_link || '',
      avatar: article.avatar || '',
      isOriginal: article.is_original || 0,
      classify: article.classify || '',
    };

    // 计算互动率
    if (formatted.reads > 0) {
      formatted.engagement = ((formatted.likes + formatted.looking) / formatted.reads * 100).toFixed(2);
    } else {
      formatted.engagement = '0';
    }

    console.log('格式化后的文章数据:', formatted); // 调试输出
    return formatted;
  });
}

/**
 * 分析文章数据并生成洞察
 * @param articles 文章数据
 * @returns 分析结果
 */
export function analyzeArticles(articles: ReturnType<typeof formatArticlesForAnalysis>) {
  console.log('开始分析文章数据，文章数量:', articles.length);
  console.log('前3篇文章样本:', articles.slice(0, 3));

  if (!articles || articles.length === 0) {
    console.log('没有文章数据，返回空结果');
    return {
      stats: {
        totalArticles: 0,
        avgReads: 0,
        avgLikes: 0,
        avgEngagement: '0%',
      },
      topLikesArticles: [],
      topEngagementArticles: [],
      insights: [],
      wordCloud: [],
    };
  }

  // 计算统计数据
  const totalArticles = articles.length;
  const validReads = articles.filter(a => typeof a.reads === 'number' && a.reads >= 0);
  const validLikes = articles.filter(a => typeof a.likes === 'number' && a.likes >= 0);
  const validEngagement = articles.filter(a => a.engagement && !isNaN(parseFloat(a.engagement)));

  console.log('数据验证:', {
    totalArticles,
    validReads: validReads.length,
    validLikes: validLikes.length,
    validEngagement: validEngagement.length,
    sampleLikes: validLikes.slice(0, 3).map(a => ({ title: a.title, likes: a.likes })),
    sampleEngagement: validEngagement.slice(0, 3).map(a => ({ title: a.title, engagement: a.engagement }))
  });

  const avgReads = validReads.length > 0 ?
    Math.round(validReads.reduce((sum, article) => sum + article.reads, 0) / validReads.length) : 0;
  const avgLikes = validLikes.length > 0 ?
    Math.round(validLikes.reduce((sum, article) => sum + article.likes, 0) / validLikes.length) : 0;
  const avgEngagement = validEngagement.length > 0 ?
    `${(validEngagement.reduce((sum, article) => sum + parseFloat(article.engagement), 0) / validEngagement.length).toFixed(1)}%` :
    '0%';

  // 按点赞数排序（TOP5）- 确保数据安全
  const likesFiltered = articles.filter(article => {
    const isValid = typeof article.likes === 'number' && article.likes >= 0 && article.title;
    if (!isValid && article.title) {
      console.log('文章被过滤(点赞):', { title: article.title, likes: article.likes, typeofLikes: typeof article.likes });
    }
    return isValid;
  });

  console.log('点赞筛选后的文章:', likesFiltered.length);
  const topLikesArticles = likesFiltered
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5)
    .map(article => ({
      title: article.title,
      likes: article.likes || 0,
      reads: article.reads || 0,
      engagement: article.engagement || '0%',
    }));

  console.log('TOP5点赞文章:', topLikesArticles);

  // 按互动率排序（TOP5）- 确保数据安全
  const engagementFiltered = articles.filter(article => {
    const isValid = article.engagement && !isNaN(parseFloat(article.engagement)) && article.title;
    if (!isValid && article.title) {
      console.log('文章被过滤(互动率):', { title: article.title, engagement: article.engagement });
    }
    return isValid;
  });

  console.log('互动率筛选后的文章:', engagementFiltered.length);
  const topEngagementArticles = engagementFiltered
    .sort((a, b) => parseFloat(b.engagement) - parseFloat(a.engagement))
    .slice(0, 5)
    .map(article => ({
      title: article.title,
      likes: article.likes || 0,
      reads: article.reads || 0,
      engagement: article.engagement || '0%',
    }));

  console.log('TOP5互动率文章:', topEngagementArticles);

  // 生成词云数据（基于真实文章标题和内容）
  const generateWordCloud = (articles: ReturnType<typeof formatArticlesForAnalysis>) => {
    const wordCount: { [key: string]: number } = {};
    const commonWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '为', '与', '之', '用', '等', '及', '来', '从', '后', '而', '前', '其', '他', '她', '它', '们', '们'];

    articles.forEach(article => {
      // 优先分析标题，因为标题包含核心关键词
      const text = (article.title || '') + ' ' + (article.content || '');
      const words = text.match(/[\u4e00-\u9fa5]+/g) || [];

      words.forEach(word => {
        if (word.length >= 2 && !commonWords.includes(word)) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({
        word,
        count,
        size: Math.max(20, Math.min(48, count * 2)),
      }));
  };

  // 生成真实的选题洞察
  const generateInsights = (articles: ReturnType<typeof formatArticlesForAnalysis>) => {
    const insights = [];

    // 分析阅读量分布
    const avgReads = validReads.length > 0 ? validReads.reduce((sum, a) => sum + a.reads, 0) / validReads.length : 0;
    const highReadArticles = articles.filter(article => article.reads > avgReads * 2);
    if (highReadArticles.length > 0) {
      insights.push({
        title: `${((highReadArticles.length / totalArticles) * 100).toFixed(1)}% 的文章表现突出`,
        description: `有 ${highReadArticles.length} 篇文章阅读量超过平均值的2倍，说明该话题存在爆款潜力。重点关注这些高表现文章的标题和内容特点。`,
        confidence: Math.min(95, 50 + highReadArticles.length * 10),
      });
    }

    // 分析互动率
    const highEngagementArticles = articles.filter(article => parseFloat(article.engagement) > 3);
    if (highEngagementArticles.length > 0) {
      insights.push({
        title: `用户参与度较高，${highEngagementArticles.length} 篇文章互动率超3%`,
        description: `该话题内容能引发用户强烈共鸣，建议创作更多引导互动的内容形式，如提问式标题、争议性观点等。`,
        confidence: Math.min(90, 55 + highEngagementArticles.length * 6),
      });
    }

    // 分析公众号分布
    const wxNames = articles.map(a => a.wxName).filter(Boolean);
    const uniqueWxNames = [...new Set(wxNames)];
    if (uniqueWxNames.length > 5) {
      insights.push({
        title: `多元化内容生态，${uniqueWxNames.length} 个公众号参与讨论`,
        description: `该话题受到广泛关注，涉及多个领域的创作者。建议结合不同角度创作内容，避免同质化竞争。`,
        confidence: 80,
      });
    }

    // 分析原创情况
    const originalArticles = articles.filter(article => article.isOriginal === 1);
    if (originalArticles.length > articles.length * 0.5) {
      insights.push({
        title: `原创内容占主导，比例达 ${((originalArticles.length / totalArticles) * 100).toFixed(1)}%`,
        description: `该话题创作者更倾向于分享原创观点和深度分析，说明有足够的原创空间，适合产出差异化内容。`,
        confidence: 85,
      });
    }

    // 分析标题特征
    const titleLengths = articles.map(a => a.title.length).filter(l => l > 0);
    const avgTitleLength = titleLengths.length > 0 ? titleLengths.reduce((sum, l) => sum + l, 0) / titleLengths.length : 0;
    if (avgTitleLength > 20) {
      insights.push({
        title: '标题偏向详细描述，平均长度 ' + avgTitleLength.toFixed(1) + ' 个字',
        description: '该话题适合使用信息量丰富的标题，建议在标题中包含具体数字、方法或结果，提高点击率。',
        confidence: 75,
      });
    }

    // 分析发布时间
    const publishHours = articles.map(article => new Date(article.publishTime * 1000).getHours());
    const morningArticles = publishHours.filter(hour => hour >= 6 && hour < 12);
    const eveningArticles = publishHours.filter(hour => hour >= 18 && hour < 24);

    if (eveningArticles.length > morningArticles.length * 1.5) {
      insights.push({
        title: '晚间发布效果更佳，' + eveningArticles.length + ' 篇集中在18:00后',
        description: '用户在该时间段对相关内容关注度更高，建议安排在晚间发布，可获得更好的曝光效果。',
        confidence: 80,
      });
    }

    // 默认洞察
    if (insights.length === 0) {
      insights.push({
        title: `发现 ${totalArticles} 篇相关内容，话题热度稳定`,
        description: '该话题有持续的内容产出，建议分析热门文章的共同点，找到适合的创作角度和表达方式。',
        confidence: 70,
      });
    }

    return insights;
  };

  return {
    stats: {
      totalArticles,
      avgReads,
      avgLikes,
      avgEngagement,
    },
    topLikesArticles,
    topEngagementArticles,
    insights: generateInsights(articles),
    wordCloud: generateWordCloud(articles),
  };
}