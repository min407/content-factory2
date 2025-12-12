import { NextRequest, NextResponse } from 'next/server'

/**
 * 提示词测试API
 * 用于测试和调整AI提示词的效果
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: '提示词不能为空' },
        { status: 400 }
      )
    }

    // 获取OpenAI配置
    const apiKey = process.env.OPENAI_API_KEY
    const apiBase = process.env.OPENAI_API_BASE || 'https://openrouter.ai/api/v1'
    const model = process.env.OPENAI_MODEL || 'openai/gpt-4o'

    if (!apiKey) {
      // 如果没有配置API Key，返回模拟结果
      return NextResponse.json({
        success: true,
        result: `提示词测试结果：

输入提示词：
${prompt}

=== 模拟响应 ===
您还没有配置OpenAI API密钥。

请先在 .env.local 文件中配置：
OPENAI_API_KEY=your_api_key_here

当前测试功能只返回模拟结果。配置API后，可以进行真实的AI测试。`
      })
    }

    // 调用OpenAI API测试提示词
    try {
      const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API错误: ${response.status}`)
      }

      const data = await response.json()
      const result = data.choices[0]?.message?.content || '无响应'

      return NextResponse.json({
        success: true,
        result: result,
        model: model,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('OpenAI API调用失败:', error)
      return NextResponse.json({
        success: false,
        error: `API调用失败: ${error instanceof Error ? error.message : '未知错误'}`
      })
    }

  } catch (error) {
    console.error('提示词测试API错误:', error)
    return NextResponse.json(
      {
        error: '测试失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}