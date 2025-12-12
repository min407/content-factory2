'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, History, AlertCircle, Award, BarChart3, Eye, Heart, TrendingUp, Users, Zap, Hash, Clock, Sparkles, RefreshCw, Download, PenTool, ChevronRight, X, ExternalLink, BarChart, Check } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { withAuth } from '@/lib/auth-context'
import { searchWeChatArticles } from '@/lib/wechat-api'
import { WeChatArticle } from '@/types/wechat-api'
import { ArticleSummary, TopicInsight } from '@/types/ai-analysis'
import * as XLSX from 'xlsx'

// 时间范围选项
const timeRangeOptions = [
  { label: '不限', value: 365 },
  { label: '近7天', value: 7 },
  { label: '近1个月', value: 30 },
  { label: '近3个月', value: 90 },
  { label: '近6个月', value: 180 },
]

// 历史记录类型定义
interface SearchHistory {
  id: number
  keyword: string
  timestamp: number
  resultCount: number
  timeRange: number
  articlesData?: any
  apiResponse?: any
}

// 模拟的分析结果数据
const mockAnalysisResult = {
  topLikesArticles: [
    { title: '公众号运营实战技巧', likes: 5200, reads: 15000, engagement: '34.7%', url: '#' },
    { title: '内容创作的10个误区', likes: 4800, reads: 12000, engagement: '40.0%', url: '#' },
    { title: '私域流量增长策略', likes: 3500, reads: 9800, engagement: '35.7%', url: '#' },
    { title: '短视频内容营销指南', likes: 3200, reads: 8900, engagement: '36.0%', url: '#' },
    { title: '用户画像分析方法', likes: 2800, reads: 7500, engagement: '37.3%', url: '#' },
  ],
  topEngagementArticles: [
    { title: '公众号运营实战技巧', reads: 15000, likes: 5200, engagement: '34.7%', url: '#' },
    { title: '内容创作的10个误区', reads: 12000, likes: 4800, engagement: '40.0%', url: '#' },
    { title: '私域流量增长策略', reads: 9800, likes: 3500, engagement: '35.7%', url: '#' },
    { title: '短视频内容营销指南', reads: 8900, likes: 3200, engagement: '36.0%', url: '#' },
    { title: '用户画像分析方法', reads: 7500, likes: 2800, engagement: '37.3%', url: '#' },
  ],
  wordCloud: [
    { word: '运营', count: 25, size: 48 },
    { word: '内容', count: 20, size: 44 },
    { word: '用户', count: 18, size: 40 },
    { word: '增长', count: 15, size: 36 },
    { word: '营销', count: 12, size: 32 },
  ],
  insights: [
    {
      title: '30岁职场妈妈如何开启副业增加收入',
      description: '针对30岁左右的职场妈妈群体，平衡工作与家庭的同时寻求额外收入来源的需求强烈，建议提供适合宝妈的副业选择和时间管理方案。',
      confidence: 92,

      // 三维度分析
      decisionStage: {
        stage: '调研期',
        reason: '用户意识到收入不够用，开始主动寻找副业信息，处于比较和选择阶段'
      },
      audienceScene: {
        audience: '30岁职场妈妈',
        scene: '深夜带娃间隙',
        reason: '文章内容聚焦职场妈妈的时间管理和增收需求，指向宝妈在照顾孩子后的碎片化时间'
      },
      demandPainPoint: {
        emotionalPain: '对未来财务状况感到焦虑，担心无法给孩子更好的生活',
        realisticPain: '家庭支出压力大，工作时间固定缺乏弹性，技能单一导致收入增长有限',
        expectation: '找到适合的副业项目，获得具体操作指导，避免踩坑浪费时间',
        reason: '基于文章中对职场妈妈困境的描述，分析出用户在平衡工作家庭与增收之间的核心痛点'
      },

      tags: ['副业', '职场妈妈', '增收']
    },
    {
      title: '二三线城市程序员如何突破职业瓶颈',
      description: '二三线城市的程序员面临技术更新快、机会相对较少的问题，建议提供远程工作机会和技能提升路径，帮助突破地域限制。',
      confidence: 88,

      // 三维度分析
      decisionStage: {
        stage: '觉察期',
        reason: '用户刚意识到自己的职业发展遇到瓶颈，对现状感到困惑和迷茫'
      },
      audienceScene: {
        audience: '二三线城市程序员',
        scene: '深夜加班后',
        reason: '文章描述程序员在加班结束后的反思时刻，指向对职业发展的深度思考'
      },
      demandPainPoint: {
        emotionalPain: '害怕技能落后被淘汰，对在大城市工作的同学感到羡慕和焦虑',
        realisticPain: '本地技术岗位少，薪资增长缓慢，接触不到前沿技术和项目',
        expectation: '了解远程工作机会，获得技能提升指导，找到突破地域限制的方法',
        reason: '基于文章中程序员的现状描述，分析出地域限制和职业发展的核心矛盾'
      },

      tags: ['程序员', '职业发展', '远程工作']
    },
    {
      title: '刚毕业设计师如何快速提升作品集质量',
      description: '刚毕业的设计师普遍面临作品集质量不高、缺乏实战项目经验的问题，建议提供作品集优化方法和接单技巧。',
      confidence: 85,

      // 三维度分析
      decisionStage: {
        stage: '行动期',
        reason: '用户已经开始找工作但效果不佳，遇到具体问题需要解决方案'
      },
      audienceScene: {
        audience: '刚毕业的设计师',
        scene: '周末在宿舍',
        reason: '文章描述学生在周末时间主动提升技能，指向毕业生的学习和求职准备场景'
      },
      demandPainPoint: {
        emotionalPain: '对就业前景感到焦虑，担心自己的能力不足找到好工作',
        realisticPain: '作品集缺乏亮点，没有商业项目经验，不知道如何展示自己的能力',
        expectation: '获得作品集优化的具体方法，学习接单技巧，快速积累实战经验',
        reason: '基于文章中对设计师求职困境的分析，提炼出提升就业竞争力的核心需求'
      },

      tags: ['设计师', '作品集', '求职']
    },
    {
      title: '创业公司老板如何有效管理团队提高效率',
      description: '创业公司老板通常缺乏管理经验，面临团队效率低下、执行力不足的问题，建议提供实用的管理工具和方法。',
      confidence: 82,

      // 三维度分析
      decisionStage: {
        stage: '决策期',
        reason: '用户意识到团队管理有问题，准备采取行动但需要具体方案和信心'
      },
      audienceScene: {
        audience: '创业公司老板',
        scene: '办公室加班时',
        reason: '文章描述老板在独自加班时反思团队管理，指向创业者的工作压力场景'
      },
      demandPainPoint: {
        emotionalPain: '对团队执行力感到失望，担心公司发展缓慢被竞争对手超越',
        realisticPain: '缺乏管理经验，不知道如何制定有效制度，员工积极性不高',
        expectation: '学习实用的管理方法，获得可落地的工具，快速提升团队效率',
        reason: '基于文章中对创业管理难题的描述，分析出从技术到管理转型的核心挑战'
      },

      tags: ['创业', '团队管理', '效率']
    },
    {
      title: '传统行业从业者如何转型到AI领域',
      description: '传统行业从业者面临职业转型的压力，AI领域成为热门选择，建议提供转型路径规划和学习资源推荐。',
      confidence: 78,

      // 三维度分析
      decisionStage: {
        stage: '认知期',
        reason: '用户刚开始了解AI转型可能性，需要基础信息和方向指导'
      },
      audienceScene: {
        audience: '传统行业从业者',
        scene: '通勤路上看手机',
        reason: '文章描述通勤时间的学习场景，指向上班族利用碎片化时间进行自我提升'
      },
      demandPainPoint: {
        emotionalPain: '担心自己被时代淘汰，对新技术感到恐惧但又充满期待',
        realisticPain: '不知道从何开始学习，缺乏技术背景，担心转型成本太高',
        expectation: '了解AI领域的入行门槛，获得学习路径指导，找到适合自己的转型方向',
        reason: '基于文章中对转型焦虑的描述，分析出传统行业从业者面对技术变革的心理状态'
      },

      tags: ['AI转型', '职业规划', '学习']
    },
  ]
}

const chartData = [
  { name: '0-1k', value: 12 },
  { name: '1k-5k', value: 34 },
  { name: '5k-10k', value: 45 },
  { name: '10k-20k', value: 38 },
  { name: '20k+', value: 27 },
]

function AnalysisPageContent() {
  const [keyword, setKeyword] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [progress, setProgress] = useState(0)
  const [articles, setArticles] = useState<WeChatArticle[]>([])
  const [error, setError] = useState<string>('')
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [articleCount, setArticleCount] = useState<number>(5)
  const [timeRange, setTimeRange] = useState<number>(365) // 默认不限
  const [customArticleCount, setCustomArticleCount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [aiInsights, setAiInsights] = useState<TopicInsight[]>([])
  const [aiSummaries, setAiSummaries] = useState<ArticleSummary[]>([])
  const [selectedInsights, setSelectedInsights] = useState<Set<number>>(new Set())

  // 排行榜维度选择状态
  const [rankingDimension, setRankingDimension] = useState<'reads' | 'likes' | 'shares' | 'engagement'>('likes')

  // 保存选中的洞察到localStorage
  const saveSelectedInsights = useCallback(() => {
    if (aiInsights.length === 0) {
      alert('暂无洞察数据可保存')
      return
    }

    const selectedData = Array.from(selectedInsights).map(index => ({
      insight: aiInsights[index],
      index
    }))

    localStorage.setItem('selected-topics', JSON.stringify(selectedData))
    console.log('已保存选中的洞察:', selectedData.length, '个')
  }, [aiInsights, selectedInsights])

  // 从localStorage恢复最近的分析结果
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('ai-analysis-results')
    if (savedAnalysis) {
      try {
        const analysisData = JSON.parse(savedAnalysis)
        if (analysisData.insights && analysisData.insights.length > 0) {
          setAiInsights(analysisData.insights)
        }
        if (analysisData.summaries && analysisData.summaries.length > 0) {
          setAiSummaries(analysisData.summaries)
        }
        if (analysisData.keyword) {
          setKeyword(analysisData.keyword)
        }
        if (analysisData.articles) {
          setArticles(analysisData.articles)
        }
        setShowResult(true)
        console.log('已恢复上次分析结果')
      } catch (error) {
        console.error('恢复分析结果失败:', error)
      }
    }
  }, [])

  // 切换洞察选中状态
  const toggleInsightSelection = useCallback((index: number) => {
    setSelectedInsights(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  // 从数据库加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/history?limit=50')
        const data = await response.json()
        if (data.success && data.history) {
          setSearchHistory(data.history)
        }
      } catch (error) {
        console.error('加载历史记录失败:', error)
      }
    }
    loadHistory()
  }, [])

  // 保存历史记录到数据库
  const saveSearchHistory = async (historyData: {
    keyword: string
    resultCount: number
    timeRange: number
    articlesData?: any
    apiResponse?: any
  }) => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyData),
      })
      const data = await response.json()

      if (data.success) {
        // 重新加载历史记录
        const historyResponse = await fetch('/api/history?limit=50')
        const historyData = await historyResponse.json()
        if (historyData.success && historyData.history) {
          setSearchHistory(historyData.history)
        }
      }
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  // 处理点击文章
  const handleItemClick = (item: any) => {
    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank')
    }
  }

  const handleAnalysis = async () => {
    if (!keyword) return

    setIsAnalyzing(true)
    setProgress(0)
    setShowResult(false)
    setError('')

    try {
      setProgress(10)

      // 调用API获取公众号文章
      const response = await searchWeChatArticles({
        kw: keyword,
        sort_type: 1,
        mode: 1,
        period: timeRange,
        page: 1,
        type: 1,
      })

      setProgress(30)

      if (response.data && response.data.length > 0) {
        const articlesData = response.data.slice(0, articleCount)
        setArticles(articlesData)
        setProgress(50)

        // AI分析文章 - 通过API调用
        const aiAnalysisResponse = await fetch('/api/ai-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword: keyword,
            count: articleCount,
          }),
        })

        if (!aiAnalysisResponse.ok) {
          const errorData = await aiAnalysisResponse.json()
          throw new Error(errorData.message || 'AI分析失败')
        }

        const aiResult = await aiAnalysisResponse.json()

        if (aiResult.success) {
          setAiSummaries(aiResult.data.summaries)
          setAiInsights(aiResult.data.insights)

          // 保存AI分析结果到localStorage，供创作页面使用
          const analysisData = {
            keyword,
            articles: articlesData,
            summaries: aiResult.data.summaries,
            insights: aiResult.data.insights,
            stats: aiResult.data.stats,
            analysisTime: aiResult.data.analysisTime || Date.now()
          }
          localStorage.setItem('ai-analysis-results', JSON.stringify(analysisData))
          console.log('AI分析结果已保存到localStorage')
        } else {
          throw new Error('AI分析返回失败结果')
        }

        setProgress(70)
        setProgress(90)

        // 完成
        setProgress(100)
        setIsAnalyzing(false)
        setShowResult(true)

        // 保存搜索历史
        await saveSearchHistory({
          keyword,
          resultCount: articlesData.length,
          timeRange,
          articlesData: articlesData,
          apiResponse: response,
        })
      } else {
        throw new Error('未找到相关文章')
      }
    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请重试')
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  // 计算真实统计数据
  const calculateStats = () => {
    if (!articles || articles.length === 0) {
      return {
        totalArticles: 0,
        avgReads: 0,
        avgLikes: 0,
        avgEngagement: '0%'
      }
    }

    const totalArticles = articles.length
    const totalReads = articles.reduce((sum, article) => sum + (article.read || 0), 0)
    const totalLikes = articles.reduce((sum, article) => sum + (article.praise || 0), 0)
    const avgReads = Math.round(totalReads / totalArticles)
    const avgLikes = Math.round(totalLikes / totalArticles)
    const avgEngagement = totalReads > 0 ? ((totalLikes / totalReads) * 100).toFixed(1) + '%' : '0%'

    return {
      totalArticles,
      avgReads,
      avgLikes,
      avgEngagement,
    }
  }

  // 获取阅读量TOP10文章
  const getTopReadsArticles = () => {
    if (!articles || articles.length === 0) {
      return []
    }

    return [...articles]
      .sort((a, b) => (b.read || 0) - (a.read || 0))
      .slice(0, 10)
      .map(article => ({
        title: article.title,
        reads: article.read || 0,
        likes: article.praise || 0,
        shares: article.shares || 0,
        engagement: article.read > 0 ? ((article.praise || 0) / article.read * 100).toFixed(1) + '%' : '0%',
        url: article.url || article.short_link || '',
        publishTime: article.publish_time_str || '',
        wxName: article.wx_name || '',
      }))
  }

  // 获取点赞TOP10文章
  const getTopLikesArticles = () => {
    if (!articles || articles.length === 0) {
      return []
    }

    return [...articles]
      .sort((a, b) => (b.praise || 0) - (a.praise || 0))
      .slice(0, 10)
      .map(article => ({
        title: article.title,
        reads: article.read || 0,
        likes: article.praise || 0,
        shares: article.shares || 0,
        engagement: article.read > 0 ? ((article.praise || 0) / article.read * 100).toFixed(1) + '%' : '0%',
        url: article.url || article.short_link || '',
        publishTime: article.publish_time_str || '',
        wxName: article.wx_name || '',
      }))
  }

  // 获取转发TOP10文章（预留功能，由于API可能不提供转发数据）
  const getTopSharesArticles = () => {
    if (!articles || articles.length === 0) {
      return []
    }

    return [...articles]
      .filter(article => (article.shares || 0) > 0) // 只显示有转发数据的文章
      .sort((a, b) => (b.shares || 0) - (a.shares || 0))
      .slice(0, 10)
      .map(article => ({
        title: article.title,
        reads: article.read || 0,
        likes: article.praise || 0,
        shares: article.shares || 0,
        engagement: article.read > 0 ? ((article.praise || 0) / article.read * 100).toFixed(1) + '%' : '0%',
        url: article.url || article.short_link || '',
        publishTime: article.publish_time_str || '',
        wxName: article.wx_name || '',
      }))
  }

  // 获取互动率TOP10文章
  const getTopEngagementArticles = () => {
    if (!articles || articles.length === 0) {
      return []
    }

    return [...articles]
      .filter(article => article.read > 0)
      .sort((a, b) => {
        const engagementA = (a.praise || 0) / a.read
        const engagementB = (b.praise || 0) / b.read
        return engagementB - engagementA
      })
      .slice(0, 10)
      .map(article => ({
        title: article.title,
        reads: article.read || 0,
        likes: article.praise || 0,
        shares: article.shares || 0,
        engagement: ((article.praise || 0) / article.read * 100).toFixed(1) + '%',
        url: article.url || article.short_link || '',
        publishTime: article.publish_time_str || '',
        wxName: article.wx_name || '',
      }))
  }

  // 根据选择的维度获取排行榜数据
  const getRankingData = () => {
    switch (rankingDimension) {
      case 'reads':
        return getTopReadsArticles()
      case 'likes':
        return getTopLikesArticles()
      case 'shares':
        return getTopSharesArticles()
      case 'engagement':
        return getTopEngagementArticles()
      default:
        return getTopLikesArticles()
    }
  }

  // 获取排行榜维度配置
  const getRankingDimensionConfig = () => {
    const configs = {
      reads: {
        label: '阅读量TOP10',
        icon: <Eye className="w-5 h-5 mr-2 text-blue-500" />,
        valueKey: 'reads',
        unit: '阅读',
        color: 'blue'
      },
      likes: {
        label: '点赞量TOP10',
        icon: <Heart className="w-5 h-5 mr-2 text-red-500" />,
        valueKey: 'likes',
        unit: '点赞',
        color: 'red'
      },
      shares: {
        label: '转发量TOP10',
        icon: <ExternalLink className="w-5 h-5 mr-2 text-green-500" />,
        valueKey: 'shares',
        unit: '转发',
        color: 'green'
      },
      engagement: {
        label: '互动率TOP10',
        icon: <Zap className="w-5 h-5 mr-2 text-purple-500" />,
        valueKey: 'engagement',
        unit: '互动',
        color: 'purple'
      }
    }
    return configs[rankingDimension]
  }

  // 下载洞察报告
  const downloadInsightReport = () => {
    if (aiInsights.length === 0) {
      alert('暂无洞察数据可下载')
      return
    }

    const reportData = {
      keyword: keyword,
      generatedAt: new Date().toLocaleString('zh-CN'),
      articles: {
        total: stats.totalArticles,
        avgReads: stats.avgReads,
        avgLikes: stats.avgLikes
      },
      insights: aiInsights.map((insight, index) => ({
        rank: index + 1,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        tags: insight.tags || [],
        decisionStage: insight.decisionStage?.stage || '',
        audience: insight.audienceScene?.audience || '',
        scene: insight.audienceScene?.scene || '',
        emotionalPain: insight.demandPainPoint?.emotionalPain || '',
        realisticPain: insight.demandPainPoint?.realisticPain || '',
        expectation: insight.demandPainPoint?.expectation || ''
      })),
      topArticles: {
        ranking: {
          dimension: rankingConfig.label,
          articles: rankingData
        }
      }
    }

    // 创建文本内容
    let content = `公众号选题洞察报告\n`
    content += `关键词：${reportData.keyword}\n`
    content += `生成时间：${reportData.generatedAt}\n\n`

    content += `【文章统计概览】\n`
    content += `总文章数：${reportData.articles.total}篇\n`
    content += `平均阅读量：${reportData.articles.avgReads}\n`
    content += `平均点赞数：${reportData.articles.avgLikes}\n\n`

    content += `【选题洞察】\n`
    reportData.insights.forEach(insight => {
      content += `\n${insight.rank}. ${insight.title}\n`
      content += `   置信度：${insight.confidence}%\n`
      content += `   描述：${insight.description}\n`
      if (insight.tags.length > 0) {
        content += `   标签：${insight.tags.join(', ')}\n`
      }
      content += `   决策阶段：${insight.decisionStage}\n`
      content += `   目标人群：${insight.audience}\n`
      content += `   使用场景：${insight.scene}\n`
      content += `   情感痛点：${insight.emotionalPain}\n`
      content += `   现实痛点：${insight.realisticPain}\n`
      content += `   期望需求：${insight.expectation}\n`
    })

    content += `\n【热门文章分析】\n`
    content += `${reportData.topArticles.ranking.dimension}：\n`
    reportData.topArticles.ranking.articles.forEach((article, index) => {
      content += `${index + 1}. ${article.title}\n`
      content += `   阅读：${article.reads.toLocaleString()} | 点赞：${article.likes.toLocaleString()} | 互动率：${article.engagement}\n`
      if (article.shares > 0) {
        content += `   转发：${article.shares.toLocaleString()}\n`
      }
    })

    // 创建下载
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `选题洞察报告_${keyword}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 下载文章原始数据
  const downloadRawData = () => {
    const allArticles = articles || []

    if (allArticles.length === 0) {
      alert('暂无数据可下载')
      return
    }

    // 创建Excel数据
    const headers = ['序号', '标题', '公众号名称', '作者', '内容摘要', '阅读量', '点赞数', '互动率', '发布时间', '链接']
    const excelData = [
      headers,
      ...allArticles.map((article, index) => [
        index + 1,
        article.title || '',
        article.wx_name || '',
        '', // 作者字段留空，因为API中没有提供作者名称数据
        article.content || '',
        article.read || 0,
        article.praise || 0,
        article.read > 0 ? `${((article.praise || 0) / article.read * 100).toFixed(1)}%` : '0%',
        article.publish_time ? new Date(article.publish_time * 1000).toLocaleString('zh-CN') : '',
        article.url || article.short_link || ''
      ])
    ]

    // 创建工作簿和工作表
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '公众号文章数据')

    // 设置列宽
    const colWidths = [
      { wch: 8 },   // 序号
      { wch: 50 },  // 标题
      { wch: 20 },  // 公众号名称
      { wch: 15 },  // 作者
      { wch: 80 },  // 内容摘要
      { wch: 12 },  // 阅读量
      { wch: 12 },  // 点赞数
      { wch: 12 },  // 互动率
      { wch: 20 },  // 发布时间
      { wch: 50 }   // 链接
    ]
    ws['!cols'] = colWidths

    // 生成Excel文件并下载
    const fileName = `公众号文章数据_${keyword}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const stats = calculateStats()
  const rankingData = getRankingData()
  const rankingConfig = getRankingDimensionConfig()

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">公众号选题分析</h1>
          <p className="text-gray-500 mt-1">
            输入关键词，AI智能分析公众号文章，生成高质量选题洞察报告
          </p>
        </div>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-colors"
        >
          <History className="w-5 h-5" />
          <span>历史记录</span>
          {searchHistory.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {searchHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 font-medium">专注于公众号文章分析</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">分析文章数：</span>
            {[5, 10, 20].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setArticleCount(count)
                  setShowCustomInput(false)
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !showCustomInput && articleCount === count
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {count}篇
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="100"
              value={showCustomInput ? customArticleCount : ''}
              onChange={(e) => {
                setCustomArticleCount(e.target.value)
                const value = parseInt(e.target.value)
                if (value > 0 && value <= 100) {
                  setArticleCount(value)
                  setShowCustomInput(true)
                }
              }}
              placeholder="自定义"
              onFocus={() => setShowCustomInput(true)}
              className={`w-16 px-2 py-2 text-center border rounded-lg text-sm transition-colors ${
                showCustomInput
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
              }`}
            />
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="输入关键词，如：营销、内容运营、私域流量..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAnalysis()}
              />
            </div>
            <div className="mt-3 flex items-center space-x-4">
              <span className="text-sm text-gray-500">采集时间：</span>
              <div className="flex space-x-2">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      timeRange === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>热门关键词：</span>
              {['AI创作', '私域运营', '内容营销', '用户增长'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setKeyword(tag)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAnalysis}
            disabled={!keyword || isAnalyzing}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>分析中...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>开始分析</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">请求失败</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 分析进度 */}
      {isAnalyzing && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">分析进度</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className={`flex items-center text-sm ${progress >= 20 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 20 && <span className="text-white text-xs">✓</span>}
              </div>
              {'正在获取公众号文章...'}
            </div>
            <div className={`flex items-center text-sm ${progress >= 50 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 50 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 50 && <span className="text-white text-xs">✓</span>}
              </div>
              {'AI分析文章内容...'}
            </div>
            <div className={`flex items-center text-sm ${progress >= 80 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 80 && <span className="text-white text-xs">✓</span>}
              </div>
              生成选题洞察...
            </div>
            <div className={`flex items-center text-sm ${progress >= 100 ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}>
                {progress >= 100 && <span className="text-white text-xs">✓</span>}
              </div>
              报告生成完成
            </div>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {showResult && (
        <div className="space-y-6">
          {/* 统计概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">分析文章数</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalArticles}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">平均阅读量</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgReads.toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">平均点赞数</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgLikes.toLocaleString()}</p>
                </div>
                <Heart className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">平均互动率</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgEngagement}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* 多维度排行榜TOP10 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-500" />
                文章排行榜
              </h2>

              {/* 维度选择按钮 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 mr-2">排序维度：</span>
                {[
                  { value: 'reads', label: '阅读量', color: 'blue' },
                  { value: 'likes', label: '点赞量', color: 'red' },
                  { value: 'shares', label: '转发量', color: 'green' },
                  { value: 'engagement', label: '互动率', color: 'purple' }
                ].map((dimension) => (
                  <button
                    key={dimension.value}
                    onClick={() => setRankingDimension(dimension.value as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      rankingDimension === dimension.value
                        ? `bg-${dimension.color}-500 text-white shadow-sm`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dimension.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 当前维度标签 */}
            <div className="mb-4 flex items-center justify-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-lg bg-${rankingConfig.color}-50 border border-${rankingConfig.color}-200`}>
                {rankingConfig.icon}
                <span className={`font-semibold text-${rankingConfig.color}-700`}>{rankingConfig.label}</span>
              </div>
            </div>

            {/* 排行榜内容 */}
            <div className="space-y-3">
              {rankingData.length > 0 ? rankingData.map((article, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-${rankingConfig.color}-50 hover:to-gray-100 transition-all duration-200 group ${article.url ? 'cursor-pointer' : ''}`}
                  onClick={() => handleItemClick(article)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`text-lg font-bold text-${rankingConfig.color}-500 mr-3 min-w-[30px]`}>
                          #{index + 1}
                        </span>
                        <h3 className={`font-medium text-gray-900 line-clamp-2 transition-colors flex-1 ${article.url ? 'group-hover:text-blue-600' : ''}`}>
                          {article.title}
                        </h3>
                        {article.url && <ExternalLink className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />}
                      </div>

                      {/* 文章信息行 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1 text-blue-500" />
                            {article.reads.toLocaleString()}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-4 h-4 mr-1 text-red-500" />
                            {article.likes.toLocaleString()}
                          </span>
                          {rankingDimension === 'shares' && article.shares > 0 && (
                            <span className="flex items-center">
                              <ExternalLink className="w-4 h-4 mr-1 text-green-500" />
                              {article.shares.toLocaleString()}
                            </span>
                          )}
                          <span className={`flex items-center font-medium ${rankingDimension === 'engagement' ? `text-${rankingConfig.color}-600` : ''}`}>
                            <TrendingUp className="w-4 h-4 mr-1" />
                            {article.engagement}
                          </span>
                        </div>

                        {article.publishTime && (
                          <span className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {article.publishTime}
                          </span>
                        )}
                      </div>

                      {/* 公众号名称 */}
                      {article.wxName && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                            {article.wxName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 排名徽章 */}
                    {index < 3 && (
                      <div className={`ml-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        'bg-gradient-to-br from-orange-400 to-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">暂无数据</p>
                  <p className="text-sm mt-2">
                    {rankingDimension === 'shares'
                      ? '当前数据中没有转发量信息，请尝试其他维度'
                      : '搜索关键词并分析文章后，这里将显示排行榜数据'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* 数据统计信息 */}
            {rankingData.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>显示 {rankingData.length} 篇文章</span>
                  <span>基于 {articles.length} 篇分析文章</span>
                </div>
              </div>
            )}
          </div>

          {/* 选题洞察 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
                AI选题洞察
              </h2>
              <div className="flex space-x-2">
                <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </button>
                <button
                  onClick={downloadInsightReport}
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载报告
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiInsights.length > 0 ? aiInsights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border transition-all ${
                  selectedInsights.has(index)
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold transition-colors ${
                        selectedInsights.has(index)
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <button
                        onClick={() => toggleInsightSelection(index)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedInsights.has(index)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        title={selectedInsights.has(index) ? '已选中' : '选中此选题'}
                      >
                        {selectedInsights.has(index) && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
                      <div className="mt-2 flex items-center">
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">重要指数：</span>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="ml-2 font-semibold text-blue-600">{insight.confidence}%</span>
                        </div>
                      </div>

                      {/* 三维度分析标签 */}
                      <div className="mt-3 space-y-3">
                        {/* 决策阶段 */}
                        {insight.decisionStage && (
                          <div className="flex items-start text-xs">
                            <span className="text-gray-500 mr-2 font-medium mt-0.5">决策阶段：</span>
                            <div className="flex-1">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{insight.decisionStage.stage}</span>
                              {insight.decisionStage.reason && (
                                <p className="text-gray-500 mt-1 text-xs leading-relaxed">{insight.decisionStage.reason}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 人群场景 */}
                        {insight.audienceScene && (
                          <div className="flex items-start text-xs">
                            <span className="text-gray-500 mr-2 font-medium mt-0.5">人群场景：</span>
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-1 mb-2">
                                {insight.audienceScene.audience && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{insight.audienceScene.audience}</span>
                                )}
                                {insight.audienceScene.scene && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{insight.audienceScene.scene}</span>
                                )}
                              </div>
                              {insight.audienceScene.reason && (
                                <p className="text-gray-500 text-xs leading-relaxed">{insight.audienceScene.reason}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 需求痛点 */}
                        {insight.demandPainPoint && (
                          <div className="flex items-start text-xs">
                            <span className="text-gray-500 mr-2 font-medium mt-0.5">需求痛点：</span>
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {insight.demandPainPoint.emotionalPain && (
                                  <div className="flex items-center">
                                    <span className="text-gray-400 mr-1">情绪:</span>
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">{insight.demandPainPoint.emotionalPain}</span>
                                  </div>
                                )}
                                {insight.demandPainPoint.realisticPain && (
                                  <div className="flex items-center">
                                    <span className="text-gray-400 mr-1">现实:</span>
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">{insight.demandPainPoint.realisticPain}</span>
                                  </div>
                                )}
                                {insight.demandPainPoint.expectation && (
                                  <div className="flex items-center">
                                    <span className="text-gray-400 mr-1">期望:</span>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">{insight.demandPainPoint.expectation}</span>
                                  </div>
                                )}
                              </div>
                              {insight.demandPainPoint.reason && (
                                <p className="text-gray-500 text-xs leading-relaxed">{insight.demandPainPoint.reason}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 主要关键词标签 */}
                      {insight.tags && insight.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {insight.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )) : (
              <div className="col-span-2 text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无选题洞察数据</h3>
                  <p className="text-gray-500 text-sm">
                    搜索关键词并分析文章后，这里将显示AI生成的选题洞察和内容创作建议
                  </p>
                </div>
              </div>
            )}
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex justify-center space-x-4">
              <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center">
                <RefreshCw className="w-5 h-5 mr-2" />
                重新分析
              </button>
              <button
                onClick={() => {
                  saveSelectedInsights()
                  window.location.href = '/create'
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center"
              >
                <PenTool className="w-5 h-5 mr-2" />
                基于洞察创作
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          {/* 文章原始数据下载模块 */}
          {articles && articles.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Download className="w-5 h-5 mr-2 text-green-500" />
                  文章原始数据
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    共 {articles.length} 篇文章
                  </span>
                  <button
                    onClick={downloadRawData}
                    className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    下载Excel
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                下载所有公众号文章的详细数据，包括标题、作者、阅读量、点赞数、发布时间等信息，支持Excel打开。
              </p>

              {/* 数据预览表格 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        标题
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        公众号
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        作者
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        内容摘要
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        阅读量
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        点赞数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        互动率
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        发布时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {articles.slice(0, 10).map((article, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate" title={article.title}>
                            <span className="text-sm font-medium text-gray-900">
                              {article.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {article.wx_name || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {'-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate" title={article.content || ''}>
                            <span className="text-sm text-gray-600">
                              {article.content ? article.content.substring(0, 100) + (article.content.length > 100 ? '...' : '') : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">
                            {(article.read || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">
                            {(article.praise || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900">
                            {article.read > 0
                              ? `${((article.praise || 0) / article.read * 100).toFixed(1)}%`
                              : '-'
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {article.publish_time
                              ? new Date(article.publish_time * 1000).toLocaleDateString('zh-CN')
                              : '-'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {articles.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    仅显示前10条数据，完整数据请下载Excel文件查看
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 历史记录弹窗 */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">搜索历史记录</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              {searchHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">暂无搜索历史记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        setKeyword(item.keyword)
                        setTimeRange(item.timeRange || 7) // 恢复时间范围
                        setShowHistoryModal(false)
                        if (item.articlesData && item.articlesData.length > 0) {
                          setArticles(item.articlesData)
                          setShowResult(true)
                        }
                      }}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.keyword}</h3>
                        <p className="text-sm text-gray-500">
                          {item.resultCount} 篇文章 · {timeRangeOptions.find(opt => opt.value === item.timeRange)?.label || '近7天'} · {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <p>💡 点击历史记录可快速填充关键词</p>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 包装需要登录的页面
export default withAuth(function AnalysisPage() {
  return (
    <DashboardLayout>
      <AnalysisPageContent />
    </DashboardLayout>
  )
})