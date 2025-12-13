/**
 * 微信公众号详情API接口
 * 用于获取公众号详细数据和活跃度分析
 */

// API响应数据结构
export interface AccountInfoResponse {
  code: number;
  data: AccountInfoData;
  msg: string;
}

/**
 * 公众号信息数据结构
 */
export interface AccountInfoData {
  /**
   * 公众号头像
   */
  avatar: string;
  /**
   * 头条平均阅读
   */
  avg_top_read: number;
  /**
   * 头条平均点赞
   */
  avg_top_zan: number;
  /**
   * 预计粉丝数
   */
  fans: number;
  /**
   * 公众号的原始id
   */
  ghid: string;
  /**
   * 极致了指数
   */
  jzl_index: number;
  /**
   * 最新发文时间
   */
  latest_publish_time: string;
  /**
   * 公众号名称
   */
  name: string;
  /**
   * 公众号二维码
   */
  qrcode: string;
  /**
   * 周发文量
   */
  week_articles: number;
  /**
   * 公众号的微信id
   */
  wxid: string;
}

/**
 * 公众号信息（应用层格式）
 */
export interface AccountInfo {
  // 基本信息
  name: string;              // 公众号名称
  wxid: string;              // 微信ID
  ghid: string;              // 原始ID
  avatar: string;            // 头像
  qrcode: string;            // 二维码

  // 粉丝数据
  fans: number;              // 预计粉丝数
  jzlIndex: number;          // 极致了指数

  // 内容数据
  avgTopRead: number;        // 头条平均阅读
  avgTopZan: number;         // 头条平均点赞
  weekArticles: number;      // 周发文量

  // 时间数据
  latestPublishTime: string; // 最新发文时间
  latestPublishDate: Date;   // 最新发文日期对象

  // 计算字段
  engagementRate: number;    // 互动率 (点赞/阅读)
  isActive: boolean;         // 是否活跃
  activityLevel: 'low' | 'medium' | 'high'; // 活跃度等级
}

/**
 * API配置
 */
const API_CONFIG = {
  url: 'https://www.dajiala.com/fbmain/monitor/v3/Keyverifycode',
  key: 'JZL134dc4c7b7886079'
};

/**
 * 获取公众号详细信息
 * @param accountName 公众号名称
 * @returns Promise<AccountInfo>
 */
export async function getAccountInfo(accountName: string): Promise<AccountInfo> {
  if (!accountName) {
    throw new Error('公众号名称不能为空');
  }

  try {
    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: '',
        name: accountName,
        key: API_CONFIG.key,
        verifycode: ''
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const result: AccountInfoResponse = await response.json();

    // 检查API返回状态
    if (result.code !== 0) {
      throw new Error(`API错误: ${result.msg || '未知错误'}`);
    }

    const data = result.data;

    // 解析最新发文时间
    let latestPublishDate = new Date();
    if (data.latest_publish_time) {
      // 尝试解析时间格式
      try {
        latestPublishDate = new Date(data.latest_publish_time);
        if (isNaN(latestPublishDate.getTime())) {
          latestPublishDate = new Date(); // 解析失败时使用当前时间
        }
      } catch (error) {
        latestPublishDate = new Date();
      }
    }

    // 计算互动率
    const engagementRate = data.avg_top_read > 0
      ? (data.avg_top_zan / data.avg_top_read) * 100
      : 0;

    // 判断活跃度
    const daysSinceLastPost = Math.floor(
      (Date.now() - latestPublishDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let isActive = true;
    let activityLevel: 'low' | 'medium' | 'high' = 'medium';

    if (daysSinceLastPost > 30) {
      isActive = false;
      activityLevel = 'low';
    } else if (data.week_articles >= 7) {
      activityLevel = 'high';
    } else if (data.week_articles >= 3) {
      activityLevel = 'medium';
    } else {
      activityLevel = 'low';
    }

    return {
      // 基本信息
      name: data.name || accountName,
      wxid: data.wxid || '',
      ghid: data.ghid || '',
      avatar: data.avatar || '',
      qrcode: data.qrcode || '',

      // 粉丝数据
      fans: data.fans || 0,
      jzlIndex: data.jzl_index || 0,

      // 内容数据
      avgTopRead: data.avg_top_read || 0,
      avgTopZan: data.avg_top_zan || 0,
      weekArticles: data.week_articles || 0,

      // 时间数据
      latestPublishTime: data.latest_publish_time || '',
      latestPublishDate,

      // 计算字段
      engagementRate: Number(engagementRate.toFixed(2)),
      isActive,
      activityLevel
    };

  } catch (error) {
    console.error('获取公众号信息失败:', error);
    throw new Error(`获取公众号信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 批量获取公众号信息
 * @param accountNames 公众号名称数组
 * @param concurrency 并发数（默认2，避免API限制）
 * @returns Promise<AccountInfo[]>
 */
export async function batchGetAccountInfos(
  accountNames: string[],
  concurrency: number = 2
): Promise<AccountInfo[]> {
  const results: AccountInfo[] = [];

  // 分批处理，避免并发过高
  for (let i = 0; i < accountNames.length; i += concurrency) {
    const batch = accountNames.slice(i, i + concurrency);
    const batchPromises = batch.map(async (name) => {
      try {
        return await getAccountInfo(name);
      } catch (error) {
        console.error(`获取公众号信息失败 (${name}):`, error);
        return null; // 失败时返回null
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((item): item is AccountInfo => item !== null));

    // 添加延迟，避免API限制
    if (i + concurrency < accountNames.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * 计算对标适合度评分
 * @param accountInfo 公众号信息
 * @returns 适合度评分 (0-100)
 */
export function calculateSuitabilityScore(accountInfo: AccountInfo): number {
  let score = 0;

  // 粉丝数量评分 (25%)
  if (accountInfo.fans >= 100000) { // 10万+
    score += 25;
  } else if (accountInfo.fans >= 50000) { // 5万+
    score += 20;
  } else if (accountInfo.fans >= 10000) { // 1万+
    score += 15;
  } else if (accountInfo.fans >= 1000) { // 1000+
    score += 10;
  } else {
    score += 5;
  }

  // 头条平均阅读量评分 (25%)
  if (accountInfo.avgTopRead >= 50000) { // 5万+
    score += 25;
  } else if (accountInfo.avgTopRead >= 20000) { // 2万+
    score += 20;
  } else if (accountInfo.avgTopRead >= 10000) { // 1万+
    score += 15;
  } else if (accountInfo.avgTopRead >= 5000) { // 5000+
    score += 10;
  } else {
    score += 5;
  }

  // 活跃度评分 (20%)
  if (accountInfo.activityLevel === 'high' && accountInfo.isActive) {
    score += 20;
  } else if (accountInfo.activityLevel === 'medium' && accountInfo.isActive) {
    score += 15;
  } else if (accountInfo.isActive) {
    score += 10;
  } else {
    score += 5;
  }

  // 内容产出能力评分 (15%)
  if (accountInfo.weekArticles >= 7) { // 每天都有更新
    score += 15;
  } else if (accountInfo.weekArticles >= 5) { // 每周5篇+
    score += 12;
  } else if (accountInfo.weekArticles >= 3) { // 每周3篇+
    score += 10;
  } else if (accountInfo.weekArticles >= 1) { // 每周1篇+
    score += 7;
  } else {
    score += 3;
  }

  // 互动率评分 (15%)
  if (accountInfo.engagementRate >= 10) { // 10%+
    score += 15;
  } else if (accountInfo.engagementRate >= 7) { // 7%+
    score += 12;
  } else if (accountInfo.engagementRate >= 5) { // 5%+
    score += 10;
  } else if (accountInfo.engagementRate >= 3) { // 3%+
    score += 7;
  } else {
    score += 3;
  }

  return Math.min(score, 100);
}

/**
 * 获取对标适合度等级
 * @param score 适合度评分
 * @returns 等级描述
 */
export function getSuitabilityLevel(score: number): {
  level: string;
  description: string;
  color: string;
} {
  if (score >= 85) {
    return {
      level: '强烈推荐',
      description: '优质对标账号，非常适合新手学习',
      color: 'green'
    };
  } else if (score >= 70) {
    return {
      level: '推荐对标',
      description: '不错的对标账号，值得学习参考',
      color: 'blue'
    };
  } else if (score >= 50) {
    return {
      level: '可以参考',
      description: '有一定参考价值，但要选择性学习',
      color: 'yellow'
    };
  } else {
    return {
      level: '谨慎参考',
      description: '对标价值有限，建议寻找更好选择',
      color: 'red'
    };
  }
}

/**
 * 从文章对象中提取公众号名称
 * @param article WeChatArticle对象
 * @returns 公众号名称
 */
export function extractAccountName(article: any): string {
  return article.wx_name || '';
}