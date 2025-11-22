import { NextRequest, NextResponse } from 'next/server'
import { getWechatPublishConfig, formatPublishParams } from '@/lib/wechat-publish'

export async function POST(request: NextRequest) {
  try {
    const { draftIds, wechatAppid, articleType, drafts } = await request.json()

    if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供要发布的草稿ID列表'
      }, { status: 400 })
    }

    if (!wechatAppid) {
      return NextResponse.json({
        success: false,
        error: '请选择要发布的公众号'
      }, { status: 400 })
    }

    // 获取微信发布配置
    const wechatConfig = getWechatPublishConfig()
    if (!wechatConfig || !wechatConfig.apiKey || !wechatConfig.apiBase) {
      return NextResponse.json({
        success: false,
        error: '微信公众号发布配置未找到或配置不完整'
      }, { status: 400 })
    }

    const results = []
    let successCount = 0
    let failedCount = 0

    // 逐个发布草稿
    for (const draftId of draftIds) {
      try {
        console.log(`开始批量发布草稿: ${draftId}`)

        // 从传入的草稿数据中查找
        let draftData = drafts?.find((draft: any) => draft.id === draftId)

        if (!draftData) {
          throw new Error('无法找到草稿信息')
        }

        console.log(`获取到草稿信息:`, { id: draftData.id, title: draftData.title })

        // 使用 formatPublishParams 格式化发布参数（会自动处理封面和图片嵌入）
        const publishParams = formatPublishParams(draftData, wechatAppid, articleType || 'news')

        console.log(`草稿 ${draftId} 格式化后的参数:`, {
          hasCoverImage: !!publishParams.coverImage,
          coverImage: publishParams.coverImage,
          contentLength: publishParams.content.length,
          contentHasImages: /!\[.*?\]\(.*?\)/.test(publishParams.content)
        })

        const publishResponse = await fetch(`${wechatConfig.apiBase}/wechat-publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': wechatConfig.apiKey
          },
          body: JSON.stringify(publishParams)
        })

        const publishData = await publishResponse.json()
        console.log(`发布响应 ${draftId}:`, {
          status: publishResponse.status,
          ok: publishResponse.ok,
          data: publishData
        })

        if (publishResponse.ok && publishData.success) {
          // 更新草稿状态为已发布
          try {
            const updateResponse = await fetch(`${request.nextUrl.origin}/api/publish/drafts`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: draftId,
                status: 'published',
                publishedAt: new Date(),
                publishedTo: {
                  platform: 'wechat',
                  accountId: wechatAppid,
                  articleType: articleType || 'news',
                  publicationId: publishData.data?.publicationId,
                  mediaId: publishData.data?.mediaId
                }
              })
            })

            if (!updateResponse.ok) {
              console.error(`更新草稿 ${draftId} 状态失败:`, updateResponse.status)
            } else {
              console.log(`✅ 草稿 ${draftId} 状态更新成功`)
            }
          } catch (updateError) {
            console.error(`更新草稿 ${draftId} 状态失败:`, updateError)
          }

          successCount++
          results.push({
            draftId,
            status: 'success',
            publicationId: publishData.data?.publicationId,
            message: '发布成功'
          })
        } else {
          failedCount++
          results.push({
            draftId,
            status: 'failed',
            error: publishData.error || '发布失败'
          })
        }
      } catch (error) {
        console.error(`发布草稿 ${draftId} 失败:`, error)
        failedCount++
        results.push({
          draftId,
          status: 'failed',
          error: error instanceof Error ? error.message : '发布过程中发生错误'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: draftIds.length,
        successCount,
        failedCount,
        results
      },
      message: `批量发布完成：成功 ${successCount} 个，失败 ${failedCount} 个`
    })

  } catch (error) {
    console.error('批量发布处理失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '批量发布处理失败'
    }, { status: 500 })
  }
}