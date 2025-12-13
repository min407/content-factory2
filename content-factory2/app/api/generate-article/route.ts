import { NextRequest, NextResponse } from 'next/server'
import { generateSingleArticle, generateBatchArticles } from '@/lib/ai-service'
import { TopicWithHistory, CreationParams } from '@/types/ai-analysis'

export async function POST(request: NextRequest) {
  try {
    const {
      topic,
      length,
      style,
      imageCount,
      imageStyle,
      uniqueAngle,
      creationMode,
      originalInspiration,
      referenceArticles,
      articleStructure,
      isBatch,
      count,
      hasCover,
      coverRatio,
      imagePromptContext,
      benchmarkReference, // 新增：对标选题的参考内容
      enhancedAnalysis // 增强的二创分析数据
    } = await request.json()

    if (!topic) {
      return NextResponse.json(
        { error: '选题不能为空' },
        { status: 400 }
      )
    }

    // 构建创作参数
    const creationParams: CreationParams = {
      topic,
      length,
      style,
      imageCount,
      imageStyle,
      uniqueAngle,
      creationMode,
      originalInspiration,
      referenceArticles,
      articleStructure,
      hasCover,
      coverRatio,
      imagePromptContext,
      benchmarkReference, // 传递对标选题的参考内容
      enhancedAnalysis // 传递增强分析数据
    }

    let result

    if (isBatch && count > 1) {
      // 批量生成
      result = await generateBatchArticles(
        topic,
        {
          length,
          style,
          imageCount,
          imageStyle,
          count
        }
      )
    } else {
      // 单篇生成
      result = await generateSingleArticle(creationParams)
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: isBatch ? `成功生成 ${count} 篇文章` : '文章生成成功'
    })

  } catch (error) {
    console.error('文章生成API错误:', error)
    return NextResponse.json(
      {
        error: '生成失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}