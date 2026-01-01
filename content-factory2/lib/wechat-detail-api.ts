/**
 * 微信文章详情API接口
 * 用于获取文章完整内容和作者详细信息
 */

// API响应数据结构
export interface ArticleDetailResponse {
  /**
   * 状态码
   */
  code: number;
  /**
   * 扣除金额
   */
  cost_money: number;
  /**
   * 返回数据
   */
  data: ArticleDetailData;
  /**
   * 消息
   */
  msg: string;
  /**
   * 剩余金额
   */
  remain_money: number;
}

/**
 * 文章详情数据结构
 */
export interface ArticleDetailData {
  /**
   * 文章链接
   */
  article_url: string;
  /**
   * 作者
   */
  author: string;
  /**
   * biz
   */
  biz: string;
  /**
   * 是否原创
   */
  copyright: number;
  /**
   * 文章封面链接
   */
  cover_url: string;
  /**
   * 简介
   */
  desc: string;
  /**
   * 原始ID
   */
  gh_id: string;
  /**
   * 文章正文 (HTML格式)
   */
  html: string;
  /**
   * 公众号头像链接
   */
  mp_head_img: string;
  /**
   * 昵称
   */
  nickname: string;
  /**
   * 发文时间 时间戳
   */
  post_time: number;
  /**
   * 发文时间 字符串格式
   */
  post_time_str: string;
  /**
   * 公众号简介
   */
  signature: string;
  source_url: string;
  /**
   * 标题
   */
  title: string;
  /**
   * 微信ID
   */
  wxid: string;
}

/**
 * 文章详情（简化版，用于应用层）
 */
export interface ArticleDetail {
  // 基本信息
  title: string;
  content: string;           // 纯文本内容
  html: string;             // HTML格式内容
  description: string;

  // 作者信息
  author: string;
  nickname: string;         // 公众号昵称
  avatar: string;           // 公众号头像
  signature: string;        // 公众号简介
  wxid: string;
  gh_id: string;

  // 其他信息
  coverUrl: string;
  isOriginal: boolean;
  publishTime: Date;
  postTimeStr: string;

  // 链接
  articleUrl: string;
  sourceUrl: string;
}

/**
 * API配置
 */
const API_CONFIG = {
  url: 'https://www.dajiala.com/fbmain/monitor/v3/article_html',
  key: 'JZLb9f5ef936c56e41f'
};

/**
 * 获取文章详情
 * @param articleUrl 文章URL（使用WeChatArticle中的url或short_link）
 * @returns Promise<ArticleDetail>
 */
export async function getArticleDetail(articleUrl: string): Promise<ArticleDetail> {
  if (!articleUrl) {
    throw new Error('文章URL不能为空');
  }

  try {
    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: articleUrl,
        key: API_CONFIG.key,
        verifycode: ''
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const result: ArticleDetailResponse = await response.json();

    // 检查API返回状态
    if (result.code !== 0) {
      throw new Error(`API错误: ${result.msg || '未知错误'}`);
    }

    const data = result.data;

    // 转换为应用层格式
    return {
      // 基本信息
      title: data.title || '',
      content: await htmlToText(data.html || ''),
      html: data.html || '',
      description: data.desc || '',

      // 作者信息
      author: data.author || '',
      nickname: data.nickname || '',
      avatar: data.mp_head_img || '',
      signature: data.signature || '',
      wxid: data.wxid || '',
      gh_id: data.gh_id || '',

      // 其他信息
      coverUrl: data.cover_url || '',
      isOriginal: data.copyright === 1,
      publishTime: new Date(data.post_time * 1000),
      postTimeStr: data.post_time_str || '',

      // 链接
      articleUrl: data.article_url || articleUrl,
      sourceUrl: data.source_url || ''
    };

  } catch (error) {
    console.error('获取文章详情失败:', error);
    throw new Error(`获取文章详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * HTML转纯文本
 * @param html HTML字符串
 * @returns Promise<string> 纯文本
 */
async function htmlToText(html: string): Promise<string> {
  if (!html) return '';

  try {
    // 简单的HTML标签移除
    let text = html
      .replace(/<[^>]*>/g, '') // 移除所有HTML标签
      .replace(/&nbsp;/g, ' ')  // 替换空格实体
      .replace(/&lt;/g, '<')     // 替换小于号
      .replace(/&gt;/g, '>')     // 替换大于号
      .replace(/&amp;/g, '&')    // 替换和号
      .replace(/&quot;/g, '"')   // 替换引号
      .replace(/&#39;/g, "'");   // 替换单引号

    // 清理多余的空白字符
    text = text
      .replace(/\s+/g, ' ')     // 多个空格合并为一个
      .replace(/\n+/g, '\n')    // 多个换符合并
      .trim();

    return text;
  } catch (error) {
    console.error('HTML转文本失败:', error);
    return html; // 失败时返回原始HTML
  }
}

/**
 * 批量获取文章详情
 * @param urls 文章URL数组
 * @param concurrency 并发数（默认3）
 * @returns Promise<ArticleDetail[]>
 */
export async function batchGetArticleDetails(
  urls: string[],
  concurrency: number = 3
): Promise<ArticleDetail[]> {
  const results: ArticleDetail[] = [];

  // 分批处理，避免并发过高
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(async (url) => {
      try {
        return await getArticleDetail(url);
      } catch (error) {
        console.error(`获取文章详情失败 (${url}):`, error);
        return null; // 失败时返回null
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((item): item is ArticleDetail => item !== null));

    // 添加延迟，避免API限制
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * 检查文章URL是否有效
 * @param url 文章URL
 * @returns boolean
 */
export function isValidArticleUrl(url: string): boolean {
  if (!url) return false;

  // 检查是否为微信文章链接
  const wechatPatterns = [
    /mp\.weixin\.qq\.com/,
    /weixin\.qq\.com/,
    /www\.mp\.weixin\.qq\.com/
  ];

  return wechatPatterns.some(pattern => pattern.test(url));
}

/**
 * 从搜索结果文章对象中提取有效的URL
 * @param article WeChatArticle对象
 * @returns string | null 有效的URL
 */
export function extractValidUrl(article: any): string | null {
  // 优先使用url，其次使用short_link
  const urls = [
    article.url,
    article.short_link,
    article.article_url
  ].filter(Boolean);

  for (const url of urls) {
    if (isValidArticleUrl(url)) {
      return url;
    }
  }

  return null;
}