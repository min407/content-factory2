import { NextRequest, NextResponse } from 'next/server'

// 极致了平台API配置
const JIZHILE_CONFIG = {
  baseUrl: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
  name: '极致了',
  description: '微信公众号文章数据平台'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求参数
    if (!body.kw || typeof body.kw !== 'string') {
      return NextResponse.json(
        { error: '关键词参数缺失或无效' },
        { status: 400 }
      )
    }

    // 获取用户API Key
    const userApiKey = body.userApiKey

    // 验证API Key
    if (!userApiKey) {
      return NextResponse.json(
        { error: 'API Key未配置，请在设置中配置您的极致了API Key' },
        { status: 400 }
      )
    }

    // 构建极致了API请求参数
    const requestData = {
      kw: body.kw.trim(),
      sort_type: body.sort_type || 1,    // 排序方式：1-最新，2-最热
      mode: body.mode || 1,             // 匹配模式：1-精确，2-模糊
      period: body.period || 7,         // 时间周期（天）
      page: body.page || 1,             // 页码
      key: userApiKey,                  // 用户API Key
      any_kw: body.any_kw || '',       // 包含关键词
      ex_kw: body.ex_kw || '',          // 排除关键词
      verifycode: body.verifycode || '', // 验证码
      type: body.type || 1,            // 内容类型：1-文章，2-视频
      limit: body.limit || 20          // 每页数量限制
    }

    console.log(`正在调用${JIZHILE_CONFIG.name}API:`, JIZHILE_CONFIG.baseUrl)
    console.log('请求参数:', { ...requestData, key: '***' })

    // 调用极致了API
    const response = await fetch(JIZHILE_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      console.error('API请求失败:', response.status, response.statusText)
      return NextResponse.json(
        { error: `API请求失败: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 安全地记录响应数据
    const sampleData = Array.isArray(data.data) && data.data.length > 0
      ? data.data.slice(0, 2).map((item: any) => ({
          title: item.title,
          reads: item.read,
          likes: item.praise,
          wx_name: item.wx_name,
          publish_time: item.publish_time_str
        }))
      : []

    console.log(`${JIZHILE_CONFIG.name} API响应:`, {
      code: data.code,
      msg: data.msg,
      dataCount: Array.isArray(data.data) ? data.data.length : 0,
      total: data.total,
      dataType: typeof data.data,
      sampleData
    })

    // 检查API响应状态
    if (data.code !== 0) {
      // 对于测试连接，某些错误码实际上表示连接成功
      const successCodes = [20001]; // 金额不足等表示API Key有效
      const isTestConnection = body.limit === 1 && body.kw === 'test';

      if (isTestConnection && successCodes.includes(data.code)) {
        return NextResponse.json({
          success: true,
          data: data,
          message: `API连接成功 (${data.msg})`,
          isTestSuccess: true
        })
      }

      console.error('API返回错误:', data.msg)
      return NextResponse.json(
        { error: `API错误: ${data.msg || '未知错误'}` },
        { status: 400 }
      )
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: data,
      message: `成功获取 ${Array.isArray(data.data) ? data.data.length : 0} 篇文章`
    })

  } catch (error) {
    console.error('搜索文章时发生错误:', error)

    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}