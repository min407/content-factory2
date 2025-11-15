'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PenTool,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Loader2,
  ChevronRight,
  RefreshCw,
  Save,
  Send,
  Eye,
  Wand2,
  Settings,
  Hash,
  Type,
  AlignLeft,
  Palette,
  Target,
  BookOpen,
  Lightbulb,
  Copy,
  Check,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Filter,
  X
} from 'lucide-react'
import Link from 'next/link'

// 导入新的类型和服务
import { TopicWithHistory, GeneratedArticle } from '@/types/ai-analysis'
import { generateSingleArticle, generateBatchArticles } from '@/lib/ai-service'
import {
  mergeTopicsWithHistory,
  refreshTopicsData,
  setupDataSyncListener,
  getLastSyncTime
} from '@/lib/data-sync'
import { HistoryManager, DraftManager } from '@/lib/content-management'

// 格式化时间
const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

export default function CreatePage() {
  // 选题相关状态
  const [selectedSource, setSelectedSource] = useState<'insights' | 'custom'>('insights')
  const [selectedTopic, setSelectedTopic] = useState<TopicWithHistory | null>(null)
  const [topics, setTopics] = useState<TopicWithHistory[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // 创作参数状态
  const [customTopic, setCustomTopic] = useState('')
  const [contentLength, setContentLength] = useState('1000-1500')
  const [writingStyle, setWritingStyle] = useState('professional')
  const [imageCount, setImageCount] = useState('3')

  // 批量创作状态
  const [batchCount, setBatchCount] = useState(1)
  const [enableBatch, setEnableBatch] = useState(false)

  // 生成和预览状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([])
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  // 错误和提示状态
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 初始化数据同步
  useEffect(() => {
    // 加载初始数据
    const initialTopics = mergeTopicsWithHistory()
    setTopics(initialTopics)
    setLastSyncTime(getLastSyncTime())

    // 设置实时监听
    const cleanup = setupDataSyncListener((updatedTopics) => {
      setTopics(updatedTopics)
      setLastSyncTime(new Date())
      setSuccess('已同步最新选题数据')
      setTimeout(() => setSuccess(null), 3000)
    })

    // 清理过期历史记录
    HistoryManager.cleanupHistory(7)

    return cleanup
  }, [])

  // 手动刷新选题数据
  const handleRefreshTopics = useCallback(() => {
    setIsSyncing(true)
    setError(null)

    try {
      const refreshedTopics = refreshTopicsData()
      setTopics(refreshedTopics)
      setLastSyncTime(new Date())
      setSuccess('选题数据已刷新')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError('刷新选题数据失败')
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  // 选择选题
  const handleTopicSelect = useCallback((topic: TopicWithHistory) => {
    setSelectedTopic(topic)
    setError(null)
  }, [])

  // 清空选题选择
  const handleTopicClear = useCallback(() => {
    setSelectedTopic(null)
  }, [])

  // 生成文章
  const handleGenerate = useCallback(async () => {
    if (selectedSource === 'insights' && !selectedTopic) {
      setError('请选择一个选题')
      return
    }
    if (selectedSource === 'custom' && !customTopic.trim()) {
      setError('请输入自定义选题')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setError(null)
    setSuccess(null)

    try {
      if (enableBatch && batchCount > 1) {
        // 批量生成
        const articles = await generateBatchArticles(
          selectedTopic!,
          {
            length: contentLength,
            style: writingStyle,
            imageCount: parseInt(imageCount),
            count: batchCount
          },
          (progress) => setGenerationProgress(progress)
        )
        setGeneratedArticles(articles)
        setSuccess(`成功生成 ${articles.length} 篇文章`)
      } else {
        // 单篇生成
        const article = await generateSingleArticle({
          topic: selectedTopic!,
          length: contentLength,
          style: writingStyle,
          imageCount: parseInt(imageCount)
        })
        setGeneratedArticles([article])
        setSuccess('文章生成成功')
      }

      // 保存到历史记录
      generatedArticles.forEach(article => {
        HistoryManager.saveToHistory(article)
      })

      setShowPreview(true)
      setCurrentArticleIndex(0)

    } catch (error) {
      console.error('生成文章失败:', error)
      setError(error instanceof Error ? error.message : '生成文章失败')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }, [
    selectedSource,
    selectedTopic,
    customTopic,
    contentLength,
    writingStyle,
    imageCount,
    enableBatch,
    batchCount
  ])

  // 复制文章内容
  const handleCopy = useCallback(() => {
    const currentArticle = generatedArticles[currentArticleIndex]
    if (!currentArticle) return

    navigator.clipboard.writeText(currentArticle.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedArticles, currentArticleIndex])

  // 保存到草稿
  const handleSave = useCallback(async () => {
    const currentArticle = generatedArticles[currentArticleIndex]
    if (!currentArticle) return

    try {
      await DraftManager.saveToDraft(currentArticle)
      setSuccess('文章已保存到草稿')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError('保存草稿失败')
      setTimeout(() => setError(null), 3000)
    }
  }, [generatedArticles, currentArticleIndex])

  // 切换文章（批量模式下）
  const handleSwitchArticle = useCallback((index: number) => {
    setCurrentArticleIndex(index)
    setCopied(false)
  }, [])

  
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">内容创作</h1>
        <p className="text-gray-500 mt-1">基于AI智能生成高质量文章，自动配图，支持批量创作</p>
      </div>

      {/* 错误和成功提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <X className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <Check className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：创作设置 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 选题来源 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                选题来源
              </h2>
              {lastSyncTime && (
                <div className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  最后同步: {formatTime(lastSyncTime)}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  value="insights"
                  checked={selectedSource === 'insights'}
                  onChange={(e) => setSelectedSource(e.target.value as 'insights' | 'custom')}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium">从洞察报告选择</p>
                  <p className="text-sm text-gray-500">基于分析结果创作 ({topics.length}个可选)</p>
                </div>
                <button
                  onClick={handleRefreshTopics}
                  disabled={isSyncing}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                  title="刷新选题"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </label>
              <label className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="source"
                  value="custom"
                  checked={selectedSource === 'custom'}
                  onChange={(e) => setSelectedSource(e.target.value as 'insights' | 'custom')}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">自定义输入</p>
                  <p className="text-sm text-gray-500">输入自己的选题</p>
                </div>
              </label>
            </div>
          </div>

          {/* 选题列表或自定义输入 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-500" />
                {selectedSource === 'insights' ? '可用选题' : '自定义选题'}
              </h2>
              {selectedSource === 'insights' && selectedTopic && (
                <button
                  onClick={handleTopicClear}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  清空选择
                </button>
              )}
            </div>
            {selectedSource === 'insights' ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {topics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无选题数据</p>
                    <p className="text-xs mt-1">请先在分析页面生成选题洞察</p>
                  </div>
                ) : (
                  topics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => handleTopicSelect(topic)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTopic?.id === topic.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="w-4 h-4 rounded-full border-2 mt-0.5 mr-3 flex-shrink-0">
                          {selectedTopic?.id === topic.id && (
                            <div className="w-full h-full rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{topic.title}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{topic.description}</p>
                          <div className="flex items-center mt-2 text-xs">
                            <span className="text-blue-600 font-medium">重要指数 {topic.confidence}%</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-500">{formatTime(topic.createdAt)}</span>
                          </div>
                          {/* 三维度分析标签 */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {topic.decisionStage.stage}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {topic.audienceScene.audience}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              {topic.audienceScene.scene}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <textarea
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="请输入您的选题内容..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
              />
            )}
          </div>

          {/* 创作参数 */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-500" />
              创作参数
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlignLeft className="w-4 h-4 inline mr-1" />
                  文章长度
                </label>
                <select
                  value={contentLength}
                  onChange={(e) => setContentLength(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="500-800">500-800字</option>
                  <option value="800-1200">800-1200字</option>
                  <option value="1000-1500">1000-1500字</option>
                  <option value="1500-2000">1500-2000字</option>
                  <option value="2000+">2000字以上</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  写作风格
                </label>
                <select
                  value={writingStyle}
                  onChange={(e) => setWritingStyle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="professional">专业严谨</option>
                  <option value="casual">轻松活泼</option>
                  <option value="storytelling">故事叙述</option>
                  <option value="educational">教育科普</option>
                  <option value="emotional">情感共鸣</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" />
                  图片数量
                </label>
                <select
                  value={imageCount}
                  onChange={(e) => setImageCount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">不插入图片</option>
                  <option value="1">1张</option>
                  <option value="2">2张</option>
                  <option value="3">3张</option>
                  <option value="5">5张</option>
                </select>
              </div>

              {/* 批量创作选项 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableBatch}
                      onChange={(e) => setEnableBatch(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">批量创作</span>
                  </label>
                  {enableBatch && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Beta
                    </span>
                  )}
                </div>

                {enableBatch && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Target className="w-4 h-4 inline mr-1" />
                      创作数量
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setBatchCount(1)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          batchCount === 1
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        1篇
                      </button>
                      <button
                        onClick={() => setBatchCount(3)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          batchCount === 3
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        3篇
                      </button>
                      <button
                        onClick={() => setBatchCount(5)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          batchCount === 5
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        5篇
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="自定义"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      批量创作会基于不同角度生成多篇文章，建议不超过5篇
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (selectedSource === 'insights' ? !selectedTopic : !customTopic.trim())}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {enableBatch ? `批量生成中...` : '生成中...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  {enableBatch ? `开始批量创作 (${batchCount}篇)` : '开始创作'}
                </>
              )}
            </button>

            {/* 生成进度 */}
            {isGenerating && enableBatch && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>生成进度</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  正在生成第 {Math.ceil(generationProgress / 100 * batchCount)} 篇文章...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：预览区 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 h-full">
            {!showPreview && !isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无内容</h3>
                <p className="text-gray-500 max-w-sm">
                  选择选题并设置参数后，点击"开始创作"生成文章
                </p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full p-12">
                <div className="relative">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-500" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                  {enableBatch ? 'AI正在批量创作中' : 'AI正在创作中'}
                </h3>
                <p className="text-gray-500">请稍候，正在为您生成优质内容...</p>
                <div className="mt-6 space-y-2 text-sm text-gray-500">
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                    分析选题要点...
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                    生成文章大纲...
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                    撰写正文内容...
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                    插入相关图片...
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* 批量创作时显示文章切换器 */}
                {generatedArticles.length > 1 && (
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        批量创作结果 ({generatedArticles.length}篇)
                      </h3>
                      <div className="flex items-center space-x-2">
                        {generatedArticles.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => handleSwitchArticle(index)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              currentArticleIndex === index
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            第{index + 1}篇
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 预览头部 */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {generatedArticles.length > 1 ? `文章预览 (${currentArticleIndex + 1}/${generatedArticles.length})` : '文章预览'}
                    </h3>
                    {generatedArticles[currentArticleIndex] && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Type className="w-4 h-4" />
                        <span>{generatedArticles[currentArticleIndex].wordCount}字</span>
                        <span className="text-gray-300">•</span>
                        <BookOpen className="w-4 h-4" />
                        <span>约{generatedArticles[currentArticleIndex].readingTime}分钟</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5 text-green-500" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1.5" />
                          复制
                        </>
                      )}
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      重新生成
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      保存草稿
                    </button>
                  </div>
                </div>

                {/* 预览内容 */}
                {generatedArticles[currentArticleIndex] && (
                  <>
                    <div className="flex-1 overflow-y-auto p-6">
                      <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        {generatedArticles[currentArticleIndex].title}
                      </h1>

                      <div className="prose prose-lg max-w-none">
                        {generatedArticles[currentArticleIndex].content.split('\n\n').map((paragraph, index) => {
                          // 检查是否是标题
                          if (paragraph.startsWith('##')) {
                            const level = paragraph.match(/^#+/)?.[0].length || 2
                            const text = paragraph.replace(/^#+\s/, '')
                            const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
                            return (
                              <HeadingTag key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">
                                {text}
                              </HeadingTag>
                            )
                          }

                          // 检查是否是列表项
                          if (paragraph.startsWith('- ')) {
                            const items = paragraph.split('\n').map(item => item.replace(/^- /, ''))
                            return (
                              <ul key={index} className="list-disc list-inside space-y-2 my-4 text-gray-700">
                                {items.map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )
                          }

                          // 插入图片（在适当位置）
                          const imageIndex = Math.floor(index / 3) // 每3段插入一张图片
                          if (imageIndex < generatedArticles[currentArticleIndex].images.length &&
                              index === imageIndex * 3 + 2) {
                            return (
                              <div key={`img-${index}`}>
                                <p className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>
                                <img
                                  src={generatedArticles[currentArticleIndex].images[imageIndex]}
                                  alt="配图"
                                  className="w-full rounded-lg mb-4"
                                />
                              </div>
                            )
                          }

                          // 普通段落
                          return (
                            <p key={index} className="text-gray-700 leading-relaxed mb-4">
                              {paragraph}
                            </p>
                          )
                        })}
                      </div>
                    </div>

                    {/* 预览底部操作 */}
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        生成时间：{new Date(generatedArticles[currentArticleIndex].createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link
                          href="/publish"
                          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          发布管理
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}