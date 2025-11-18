/**
 * Vercel环境下的数据存储服务
 * 使用内存存储和JWT token来适应serverless环境
 */

import { User, UserSession } from '@/types/user'
import { ApiConfig, ApiProvider } from '@/types/api-config'

// 内存存储（仅在单个函数调用期间有效）
let memoryUsers: User[] = []
let memoryPasswords: Record<string, string> = {}
let memorySessions: Record<string, UserSession> = {}
let memoryUserConfigs: Record<string, ApiConfig[]> = {}

// 默认用户数据（用于演示）
const DEFAULT_USERS: User[] = [
  {
    id: 'user_1',
    email: 'admin@example.com',
    username: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'user_1763350896899_2805jg92q',
    email: 'liuzmid@gmail.com',
    username: '卷儿哥',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const DEFAULT_PASSWORDS: Record<string, string> = {
  'user_1': 'admin123',
  'user_1763350896899_2805jg92q': 'test123' // 生产环境请使用更安全的密码
}

/**
 * 检查是否在Vercel环境
 */
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
}

/**
 * 确保默认用户存在
 */
function ensureDefaultUsers(): void {
  if (memoryUsers.length === 0) {
    memoryUsers = [...DEFAULT_USERS]
    memoryPasswords = { ...DEFAULT_PASSWORDS }
    console.log('🔧 初始化默认用户数据')
  }
}

/**
 * Vercel环境下的用户数据存储服务
 */
export class UserStorage {
  /**
   * 获取所有用户
   */
  static async getUsers(): Promise<User[]> {
    ensureDefaultUsers()
    return memoryUsers
  }

  /**
   * 保存用户列表
   */
  static async saveUsers(users: User[]): Promise<void> {
    memoryUsers = [...users]
    console.log(`💾 内存中保存 ${users.length} 个用户数据`)
  }

  /**
   * 查找用户
   */
  static async findUser(email: string): Promise<User | null> {
    ensureDefaultUsers()
    return memoryUsers.find(user => user.email === email) || null
  }

  /**
   * 添加用户
   */
  static async addUser(user: User): Promise<void> {
    const users = await this.getUsers()
    const existingUser = users.find(u => u.email === user.email)

    if (existingUser) {
      throw new Error('用户已存在')
    }

    users.push(user)
    await this.saveUsers(users)
    console.log('✅ 新用户注册成功:', user.email)
  }

  /**
   * 更新用户
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const users = await this.getUsers()
    const userIndex = users.findIndex(u => u.id === userId)

    if (userIndex === -1) {
      throw new Error('用户不存在')
    }

    users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date() }
    await this.saveUsers(users)
    console.log('✅ 用户数据更新成功:', userId)
  }
}

/**
 * Vercel环境下的密码存储服务
 */
export class PasswordStorage {
  /**
   * 获取所有密码
   */
  static async getPasswords(): Promise<Record<string, string>> {
    ensureDefaultUsers()
    return memoryPasswords
  }

  /**
   * 保存密码映射
   */
  static async savePasswords(passwords: Record<string, string>): Promise<void> {
    memoryPasswords = { ...passwords }
  }

  /**
   * 设置用户密码
   */
  static async setPassword(userId: string, password: string): Promise<void> {
    memoryPasswords[userId] = password // 实际应用中应存储密码哈希
    console.log('🔐 设置用户密码成功:', userId)
  }

  /**
   * 验证用户密码
   */
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    ensureDefaultUsers()
    const storedPassword = memoryPasswords[userId]
    return storedPassword === password // 简化比较，生产环境应使用密码哈希
  }
}

/**
 * Vercel环境下的会话存储服务（使用内存存储）
 */
export class SessionStorage {
  /**
   * 获取所有会话
   */
  static async getSessions(): Promise<UserSession[]> {
    return Object.values(memorySessions)
  }

  /**
   * 保存会话列表
   */
  static async saveSessions(sessions: UserSession[]): Promise<void> {
    memorySessions = {}
    sessions.forEach(session => {
      memorySessions[session.token] = session
    })
  }

  /**
   * 获取用户会话
   */
  static async getSession(token: string): Promise<UserSession | null> {
    const session = memorySessions[token]

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        delete memorySessions[token] // 清理过期会话
      }
      return null
    }

    return session
  }

  /**
   * 创建会话
   */
  static async createSession(session: UserSession): Promise<void> {
    // 删除该用户的旧会话
    Object.keys(memorySessions).forEach(token => {
      if (memorySessions[token].userId === session.userId) {
        delete memorySessions[token]
      }
    })

    memorySessions[session.token] = session
    console.log('✅ 创建会话成功:', session.token.substring(0, 20) + '...')
  }

  /**
   * 删除会话
   */
  static async deleteSession(token: string): Promise<void> {
    delete memorySessions[token]
    console.log('🗑️ 删除会话成功:', token.substring(0, 20) + '...')
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const now = new Date()
    let cleanedCount = 0

    Object.keys(memorySessions).forEach(token => {
      if (memorySessions[token].expiresAt <= now) {
        delete memorySessions[token]
        cleanedCount++
      }
    })

    if (cleanedCount > 0) {
      console.log(`🧹 清理 ${cleanedCount} 个过期会话`)
    }
  }
}

/**
 * Vercel环境下的用户API配置存储服务
 */
export class UserConfigStorage {
  /**
   * 获取用户API配置
   */
  static async getUserConfigs(userId: string): Promise<ApiConfig[]> {
    // 如果用户配置不存在，确保初始化默认配置
    if (!memoryUserConfigs[userId]) {
      console.log(`🔧 用户 ${userId} 配置不存在，初始化默认配置`)
      ensureDefaultApiConfigs()
    }
    return memoryUserConfigs[userId] || []
  }

  /**
   * 保存用户API配置
   */
  static async saveUserConfigs(userId: string, configs: ApiConfig[]): Promise<void> {
    memoryUserConfigs[userId] = [...configs]
    console.log(`💾 内存中保存用户 ${userId} 的 ${configs.length} 个API配置`)
  }

  /**
   * 更新单个API配置
   */
  static async updateConfig(userId: string, config: ApiConfig): Promise<void> {
    const configs = await this.getUserConfigs(userId)
    const existingIndex = configs.findIndex(c => c.provider === config.provider)

    if (existingIndex >= 0) {
      configs[existingIndex] = { ...config, updatedAt: new Date() }
    } else {
      configs.push(config)
    }

    await this.saveUserConfigs(userId, configs)
    console.log(`✅ 更新用户 ${userId} 的API配置: ${config.provider}`)
  }

  /**
   * 删除API配置
   */
  static async deleteConfig(userId: string, provider: string): Promise<void> {
    const configs = await this.getUserConfigs(userId)
    const filteredConfigs = configs.filter(c => c.provider !== provider)
    await this.saveUserConfigs(userId, filteredConfigs)
    console.log(`🗑️ 删除用户 ${userId} 的API配置: ${provider}`)
  }
}

/**
 * 数据初始化（Vercel环境）
 */
export async function initializeStorage(): Promise<void> {
  ensureDefaultUsers()
  await ensureDefaultApiConfigs()
  console.log('🗄️ Vercel环境数据存储系统初始化完成')
}

/**
 * 确保默认API配置存在
 */
function ensureDefaultApiConfigs(): void {
  const users = ['user_1', 'user_1763350896899_2805jg92q']

  users.forEach(userId => {
    if (!memoryUserConfigs[userId]) {
      console.log(`🔧 初始化用户 ${userId} 的API配置`)

      // 从本地配置文件读取的默认配置
      const defaultConfigs = [
        {
          id: `${userId}-openrouter`,
          provider: ApiProvider.OPENROUTER,
          name: 'OpenRouter',
          description: 'OpenRouter AI 模型服务',
          apiKey: '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',
          apiBase: 'https://openrouter.ai/api/v1',
          model: 'anthropic/claude-3.5-sonnet',
          lastTested: new Date(),
          testStatus: 'success' as const,
          testMessage: '连接成功',
          createdAt: new Date(),
          updatedAt: new Date(),
          isConfigured: true,
          isActive: true
        },
        {
          id: `${userId}-siliconflow`,
          provider: ApiProvider.SILICONFLOW,
          name: 'Silicon Flow',
          description: '硅基流动 AI 图片生成服务',
          apiKey: 'sk-vikxdjnhqciuhqevdvpvirsccidnkpckrehyuupklsxsihup',
          apiBase: 'https://api.siliconflow.cn/v1',
          model: 'deepseek-ai/DeepSeek-V3',
          lastTested: new Date(),
          testStatus: 'success' as const,
          testMessage: '连接成功',
          createdAt: new Date(),
          updatedAt: new Date(),
          isConfigured: true,
          isActive: true
        },
        {
          id: `${userId}-wechat-search`,
          provider: ApiProvider.WECHAT_SEARCH,
          name: '微信公众号搜索',
          description: '微信公众号文章搜索服务',
          apiKey: 'JZL134dc4c7b7886079',
          apiBase: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
          lastTested: new Date(),
          testStatus: 'success' as const,
          testMessage: '连接成功',
          createdAt: new Date(),
          updatedAt: new Date(),
          isConfigured: true,
          isActive: true
        },
        {
          id: `${userId}-wechat-publish`,
          provider: ApiProvider.WECHAT_PUBLISH,
          name: '微信公众号发布',
          description: '微信公众号文章发布服务',
          apiKey: 'xhs_ece2ac77bf86495442d51095ac9ffcc1',
          apiBase: 'https://wx.limyai.com/api/openapi',
          lastTested: new Date(),
          testStatus: 'success' as const,
          testMessage: '连接成功',
          createdAt: new Date(),
          updatedAt: new Date(),
          isConfigured: true,
          isActive: true
        }
      ]

      memoryUserConfigs[userId] = defaultConfigs
      console.log(`✅ 已为用户 ${userId} 初始化 ${defaultConfigs.length} 个默认API配置`)
    }
  })
}