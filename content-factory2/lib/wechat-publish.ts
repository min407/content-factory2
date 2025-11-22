import {
  WechatAccount,
  WechatAccountsResponse,
  WechatPublishResponse,
  PublishParams,
  PublishResult
} from '@/types/wechat-publish'
import { ApiConfigManager } from './api-config'
import { ApiProvider } from '@/types/api-config'

/**
 * 获取微信发布API配置
 */
export function getWechatPublishConfig() {
  const apiKey = ApiConfigManager.getApiKey(ApiProvider.WECHAT_PUBLISH)
  const apiBase = ApiConfigManager.getApiBase(ApiProvider.WECHAT_PUBLISH) || 'https://wx.limyai.com/api/openapi'

  // 如果没有用户配置，则使用默认配置
  return {
    apiKey: apiKey || 'xhs_ece2ac77bf86495442d51095ac9ffcc1',
    apiBase: apiBase
  }
}

/**
 * 获取公众号列表
 * @returns Promise<WechatAccount[]>
 */
export async function getWechatAccounts(): Promise<WechatAccount[]> {
  const config = getWechatPublishConfig()

  try {
    const response = await fetch(`${config.apiBase}/wechat-accounts`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: WechatAccountsResponse = await response.json()

    if (!data.success) {
      throw new Error('获取公众号列表失败')
    }

    return data.data.accounts
  } catch (error) {
    console.error('获取公众号列表失败:', error)
    throw error
  }
}

/**
 * 发布文章到公众号
 * @param params 发布参数
 * @returns Promise<PublishResult>
 */
export async function publishToWechat(params: PublishParams): Promise<PublishResult> {
  const config = getWechatPublishConfig()

  try {
    const response = await fetch(`${config.apiBase}/wechat-publish`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: WechatPublishResponse = await response.json()

    if (!data.success) {
      throw new Error(data.error || '发布失败')
    }

    if (!data.data) {
      throw new Error('发布响应数据异常')
    }

    return data.data
  } catch (error) {
    console.error('发布文章失败:', error)
    throw error
  }
}

/**
 * 获取发布状态（轮询用）
 * @param publicationId 发布ID
 * @returns Promise<PublishResult>
 */
export async function getPublishStatus(publicationId: string): Promise<PublishResult> {
  const config = getWechatPublishConfig()

  try {
    const response = await fetch(`${config.apiBase}/wechat-publish/status`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicationId })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: WechatPublishResponse = await response.json()

    if (!data.success) {
      throw new Error(data.error || '获取发布状态失败')
    }

    if (!data.data) {
      throw new Error('状态响应数据异常')
    }

    return data.data
  } catch (error) {
    console.error('获取发布状态失败:', error)
    throw error
  }
}

/**
 * 验证发布参数
 * @param params 发布参数
 * @returns 验证结果
 */
export function validatePublishParams(params: PublishParams): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!params.wechatAppid) {
    errors.push('请选择要发布的公众号')
  }

  if (!params.title || params.title.trim().length === 0) {
    errors.push('文章标题不能为空')
  }

  if (params.title && params.title.length > 64) {
    errors.push('文章标题不能超过64个字符')
  }

  if (!params.content || params.content.trim().length === 0) {
    errors.push('文章内容不能为空')
  }

  if (params.summary && params.summary.length > 120) {
    errors.push('文章摘要不能超过120个字符')
  }

  // 小绿书特殊验证
  if (params.articleType === 'newspic') {
    // 检查是否包含图片
    const imageRegex = /!\[.*?\]\(.*?\)/g
    const images = params.content.match(imageRegex) || []

    if (images.length === 0) {
      errors.push('小绿书发布必须包含至少1张图片')
    }

    if (images.length > 20) {
      errors.push('小绿书发布最多支持20张图片')
    }

    // 检查文字长度（移除图片标记后的纯文本）
    const plainText = params.content.replace(imageRegex, '').trim()
    if (plainText.length > 1000) {
      errors.push('小绿书文字内容不能超过1000个字符')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 格式化发布参数
 * @param draft 草稿数据
 * @param wechatAppid 公众号AppID
 * @param articleType 文章类型
 * @returns 格式化后的发布参数
 */
export function formatPublishParams(
  draft: any,
  wechatAppid: string,
  articleType: 'news' | 'newspic'
): PublishParams {
  let content = draft.content || ''

  console.log('📝 formatPublishParams 开始处理:', {
    title: draft.title,
    contentLength: content.length,
    hasCover: !!draft.cover,
    imagesCount: draft.images?.length || 0,
    coverData: draft.cover,
    firstImage: draft.images?.[0]
  })

  // 如果草稿中有图片，但内容中没有嵌入图片，则将图片嵌入到内容中
  if (draft.images && draft.images.length > 0) {
    // 检查内容中是否已经包含图片
    const hasImageInContent = /!\[.*?\]\(.*?\)/.test(content) || /<img[^>]+src=/.test(content)
    console.log('📝 检查内容中是否已有图片:', hasImageInContent)

    if (!hasImageInContent) {
      console.log('📝 内容中未检测到图片，自动嵌入图片到Markdown内容中...')

      // 在文章开头或适当位置嵌入图片
      // 根据文章类型选择嵌入方式
      if (articleType === 'newspic') {
        // 小绿书格式：图片优先，放在前面
        const imageMarkdown = draft.images.map((img: any, index: number) => {
          const url = typeof img === 'object' ? img.url : img
          const desc = typeof img === 'object' ? (img.description || `图片${index + 1}`) : `图片${index + 1}`
          return `![${desc}](${url})`
        }).join('\n\n')

        content = imageMarkdown + '\n\n' + content
      } else {
        // 公众号文章：在内容中均匀分布图片
        const paragraphs = content.split('\n\n')
        const imageCount = draft.images.length
        const paragraphCount = paragraphs.length

        // 计算图片分布间隔
        const interval = Math.max(1, Math.floor(paragraphCount / (imageCount + 1)))

        // 插入图片到内容中
        let imageIndex = 0
        for (let i = interval; i < paragraphs.length && imageIndex < imageCount; i += interval + 1) {
          const img = draft.images[imageIndex]
          const url = typeof img === 'object' ? img.url : img
          const desc = typeof img === 'object' ? (img.description || `配图${imageIndex + 1}`) : `配图${imageIndex + 1}`

          paragraphs.splice(i, 0, `![${desc}](${url})`)
          imageIndex++
        }

        content = paragraphs.join('\n\n')
      }

      console.log('✅ 图片已嵌入到内容中，共嵌入', draft.images.length, '张图片')
    } else {
      console.log('✅ 内容中已包含图片，无需嵌入')
    }
  }

  const params: PublishParams = {
    wechatAppid,
    title: draft.title,
    content: content,
    articleType,
    contentFormat: 'markdown'
  }

  // 添加摘要（如果没有提供，使用内容前100字符）
  if (!params.summary && draft.content) {
    const plainText = draft.content
      .replace(/[#*`>]/g, '') // 移除markdown符号
      .replace(/\n+/g, ' ') // 换行符转为空格
      .trim()

    params.summary = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')
  }

  // 设置封面图（优先使用专门的封面图片，如果没有则使用第一张正文图片）
  if (!params.coverImage) {
    // 优先使用 draft.cover（专门的封面图片）
    if (draft.cover) {
      if (typeof draft.cover === 'object' && draft.cover.url) {
        params.coverImage = draft.cover.url
      } else if (typeof draft.cover === 'string') {
        params.coverImage = draft.cover
      }
    }
    // 如果没有封面图，则使用第一张正文图片作为备用
    else if (draft.images && draft.images.length > 0) {
      params.coverImage = draft.images[0].url || draft.images[0]
      console.log('📝 使用第一张正文图片作为封面:', params.coverImage)
    }
  }

  // 设置作者（可选）
  if (draft.author) {
    params.author = draft.author
  }

  console.log('✅ formatPublishParams 返回的参数:', {
    title: params.title,
    hasCoverImage: !!params.coverImage,
    coverImage: params.coverImage,
    contentLength: params.content.length,
    contentSample: params.content.substring(0, 200)
  })

  return params
}