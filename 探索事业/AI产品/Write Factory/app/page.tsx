'use client'

import { useState } from 'react'
import {
  TrendingUp,
  FileText,
  Send,
  Clock,
  ArrowUp,
  ArrowDown,
  Users,
  Eye,
  Heart,
  MessageSquare,
  Activity,
  Target,
  Sparkles,
  ChevronRight,
  Search,
  PenTool
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'

// 模拟数据
const statsData = [
  {
    title: '今日分析',
    value: '23',
    change: '+12%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-blue-500'
  },
  {
    title: '生成文章',
    value: '15',
    change: '+8%',
    trend: 'up',
    icon: FileText,
    color: 'bg-green-500'
  },
  {
    title: '已发布',
    value: '12',
    change: '+5%',
    trend: 'up',
    icon: Send,
    color: 'bg-purple-500'
  },
  {
    title: '待审核',
    value: '7',
    change: '-2%',
    trend: 'down',
    icon: Clock,
    color: 'bg-orange-500'
  }
]

const chartData = [
  { name: '周一', 分析: 12, 创作: 8, 发布: 5 },
  { name: '周二', 分析: 15, 创作: 10, 发布: 7 },
  { name: '周三', 分析: 18, 创作: 12, 发布: 8 },
  { name: '周四', 分析: 20, 创作: 15, 发布: 10 },
  { name: '周五', 分析: 25, 创作: 18, 发布: 12 },
  { name: '周六', 分析: 22, 创作: 16, 发布: 11 },
  { name: '周日', 分析: 23, 创作: 15, 发布: 12 },
]

const platformData = [
  { name: '小红书', value: 45, color: '#FF2E63' },
  { name: '公众号', value: 55, color: '#07C160' },
]

const recentArticles = [
  {
    id: 1,
    title: '2024年内容营销趋势分析',
    status: '已发布',
    platform: '小红书',
    views: 1234,
    likes: 89,
    time: '2小时前'
  },
  {
    id: 2,
    title: '如何打造爆款内容的10个技巧',
    status: '待审核',
    platform: '公众号',
    views: 0,
    likes: 0,
    time: '3小时前'
  },
  {
    id: 3,
    title: 'AI在内容创作中的应用',
    status: '已发布',
    platform: '公众号',
    views: 2341,
    likes: 156,
    time: '5小时前'
  },
  {
    id: 4,
    title: '社交媒体运营策略指南',
    status: '草稿',
    platform: '-',
    views: 0,
    likes: 0,
    time: '1天前'
  },
  {
    id: 5,
    title: '用户增长黑客技巧分享',
    status: '已发布',
    platform: '小红书',
    views: 3456,
    likes: 234,
    time: '2天前'
  }
]

const hotTopics = [
  { keyword: 'AI创作', heat: 98, trend: 'up' },
  { keyword: '私域运营', heat: 92, trend: 'up' },
  { keyword: '短视频营销', heat: 88, trend: 'down' },
  { keyword: '内容变现', heat: 85, trend: 'up' },
  { keyword: 'ChatGPT应用', heat: 82, trend: 'up' },
]

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('week')

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
          <p className="text-muted-foreground mt-1">欢迎回来！这是您的内容工厂数据概览</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-4 py-2 rounded-lg ${timeRange === 'day' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border'}`}
          >
            今日
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg ${timeRange === 'week' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border'}`}
          >
            本周
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg ${timeRange === 'month' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border'}`}
          >
            本月
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.trend === 'up' ? (
                      <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">vs 昨日</span>
                  </div>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 趋势图表 */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">内容生产趋势</h2>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="分析" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="创作" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="发布" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 平台分布 */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">发布平台分布</h2>
            <Target className="w-5 h-5 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {platformData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {platformData.map((platform, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: platform.color }} />
                  <span className="text-sm text-muted-foreground">{platform.name}</span>
                </div>
                <span className="font-semibold text-foreground">{platform.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最新文章 */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">最新文章</h2>
            <Link href="/publish" className="text-primary hover:text-primary/80 text-sm flex items-center">
              查看全部
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{article.title}</h3>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-muted-foreground">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      article.status === '已发布' ? 'bg-green-100 text-green-700' :
                      article.status === '待审核' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {article.status}
                    </span>
                    {article.platform !== '-' && (
                      <span>{article.platform}</span>
                    )}
                    <span>{article.time}</span>
                  </div>
                </div>
                {article.status === '已发布' && (
                  <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {article.views}
                    </div>
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      {article.likes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 热门话题 */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">热门话题</h2>
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {hotTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-muted-foreground w-6">#{index + 1}</span>
                  <span className="ml-3 text-foreground">{topic.keyword}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden mr-2">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                      style={{ width: `${topic.heat}%` }}
                    />
                  </div>
                  {topic.trend === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}