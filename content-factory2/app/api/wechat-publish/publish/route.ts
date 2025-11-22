import { NextRequest, NextResponse } from 'next/server'
import { publishToWechat, formatPublishParams, validatePublishParams } from '@/lib/wechat-publish'
import { DraftManager } from '@/lib/content-management'

/**
 * 发布文章到公众号API
 * POST /api/wechat-publish/publish
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { draftId, wechatAppid, articleType, draftData } = body

    console.log('开始发布文章到公众号:', { draftId, wechatAppid, articleType })

    // 参数验证
    if (!draftId && !draftData) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少草稿ID或草稿数据'
        },
        { status: 400 }
      )
    }

    if (!wechatAppid) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少公众号AppID'
        },
        { status: 400 }
      )
    }

    if (!articleType || !['news', 'newspic'].includes(articleType)) {
      return NextResponse.json(
        {
          success: false,
          error: '文章类型无效，必须是 news 或 newspic'
        },
        { status: 400 }
      )
    }

    // 获取草稿数据（优先使用传入的draftData，否则尝试从服务器端获取）
    let draft
    if (draftData) {
      draft = draftData
    } else {
      // 如果没有传入draftData，尝试从服务器端获取（仅作为备用）
      try {
        draft = DraftManager.getDraft(draftId)
      } catch (error) {
        console.warn('服务器端无法获取草稿，依赖客户端数据:', error)
        draft = null
      }
    }

    if (!draft) {
      return NextResponse.json(
        {
          success: false,
          error: '草稿不存在，请确保传递了完整的草稿数据'
        },
        { status: 404 }
      )
    }

    // 记录草稿数据的完整结构（移到 draft 初始化之后）
    console.log('完整草稿数据:', {
      title: draft.title?.substring(0, 50) + '...',
      hasContent: !!draft.content,
      contentLength: draft.content?.length || 0,
      cover: draft.cover,
      imagesCount: draft.images?.length || 0,
      images: draft.images,
      parameters: draft.parameters
    })

    // 格式化发布参数
    const publishParams = formatPublishParams(draft, wechatAppid, articleType)

    // 验证发布参数
    const validation = validatePublishParams(publishParams)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: '参数验证失败',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    console.log('发布参数验证通过，开始调用发布API...')

    // 调用发布API
    const publishResult = await publishToWechat(publishParams)

    console.log('文章发布成功:', publishResult)

    // 注意：服务器端无法直接更新客户端localStorage
    // 草稿状态更新需要由客户端处理
    console.log('发布成功，请在客户端更新草稿状态')

    return NextResponse.json({
      success: true,
      data: publishResult,
      message: '文章发布成功'
    })

  } catch (error) {
    console.error('发布文章失败:', error)

    // 根据错误类型返回不同的状态码
    let statusCode = 500
    let errorMessage = '发布文章失败'

    if (error instanceof Error) {
      if (error.message.includes('HTTP error! status: 401')) {
        statusCode = 401
        errorMessage = 'API密钥无效或已过期'
      } else if (error.message.includes('HTTP error! status: 403')) {
        statusCode = 403
        errorMessage = 'API访问被拒绝'
      } else if (error.message.includes('HTTP error! status: 404')) {
        statusCode = 404
        errorMessage = '公众号不存在或未授权'
      } else if (error.message.includes('HTTP error! status: 429')) {
        statusCode = 429
        errorMessage = '请求频率过高，请稍后重试'
      } else if (error.message.includes('公众号授权已过期')) {
        statusCode = 401
        errorMessage = '公众号授权已过期，请重新授权'
      } else if (error.message.includes('HTTP error!')) {
        statusCode = 502
        errorMessage = '外部API服务不可用'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: statusCode }
    )
  }
}

/**
 * 预留GET方法用于获取发布状态
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    error: '方法不支持',
    message: '请使用POST方法发布文章'
  }, { status: 405 })
}