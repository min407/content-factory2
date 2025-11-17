'use client'

/**
 * 用户认证上下文
 * 提供全局的用户状态管理和认证功能
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, UserSession, AuthState, LoginFormData, RegisterFormData } from '@/types/user'
import { AuthResponse, AuthErrorCode } from '@/types/user'

interface AuthContextType extends AuthState {
  // 认证操作
  login: (credentials: LoginFormData) => Promise<{ success: boolean; message: string }>
  register: (userData: RegisterFormData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<{ success: boolean; message: string }>
  checkAuth: () => Promise<void>

  // 用户操作
  updateProfile: (userData: Partial<User>) => Promise<{ success: boolean; message: string }>

  // 会话管理
  refreshSession: () => Promise<void>
  isSessionExpired: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
    isAuthenticated: false
  })

  /**
   * 检查当前认证状态
   */
  const checkAuth = async () => {
    try {
      console.log('🔐 [AuthContext] 检查认证状态...')
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      // 添加超时机制，防止长时间阻塞
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

      const response = await fetch('/api/auth/login', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data: AuthResponse = await response.json()

      if (data.success && data.data) {
        const { user, session } = data.data
        setAuthState({
          user,
          session,
          isLoading: false,
          error: null,
          isAuthenticated: true
        })
        console.log('✅ [AuthContext] 用户已登录:', { userId: user.id, email: user.email })
      } else {
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
          isAuthenticated: false
        })
        console.log('🔓 [AuthContext] 用户未登录')
      }
    } catch (error) {
      console.error('❌ [AuthContext] 检查认证状态失败:', error)
      // 即使认证检查失败，也要停止loading状态，避免页面卡住
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null, // 清除错误，不影响用户使用
        isAuthenticated: false
      })
    }
  }

  /**
   * 用户登录
   */
  const login = async (credentials: LoginFormData): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🔐 [AuthContext] 开始登录流程...')
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data: AuthResponse = await response.json()

      if (data.success && data.data) {
        const { user, session } = data.data
        setAuthState({
          user,
          session,
          isLoading: false,
          error: null,
          isAuthenticated: true
        })

        console.log('🎉 [AuthContext] 登录成功:', { userId: user.id, email: user.email })
        return { success: true, message: '登录成功' }
      } else {
        const errorMessage = data.error?.message || '登录失败'
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }))

        console.log('❌ [AuthContext] 登录失败:', errorMessage)
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))

      console.error('❌ [AuthContext] 登录异常:', error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 用户注册
   */
  const register = async (userData: RegisterFormData): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('📝 [AuthContext] 开始注册流程...')
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const data: AuthResponse = await response.json()

      if (data.success && data.data) {
        const { user, session } = data.data
        setAuthState({
          user,
          session,
          isLoading: false,
          error: null,
          isAuthenticated: true
        })

        console.log('🎉 [AuthContext] 注册成功:', { userId: user.id, email: user.email })
        return { success: true, message: '注册成功' }
      } else {
        const errorMessage = data.error?.message || '注册失败'
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }))

        console.log('❌ [AuthContext] 注册失败:', errorMessage)
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))

      console.error('❌ [AuthContext] 注册异常:', error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 用户登出
   */
  const logout = async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('🚪 [AuthContext] 开始登出流程...')

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      const data: AuthResponse = await response.json()

      // 无论服务器响应如何，都清除本地状态
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: false
      })

      if (data.success) {
        console.log('✅ [AuthContext] 登出成功')
        return { success: true, message: '登出成功' }
      } else {
        console.log('⚠️ [AuthContext] 登出请求失败，但本地状态已清除')
        return { success: true, message: '已登出' }
      }
    } catch (error) {
      // 即使网络请求失败，也清除本地状态
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isAuthenticated: false
      })

      console.log('⚠️ [AuthContext] 登出请求异常，但本地状态已清除:', error)
      return { success: true, message: '已登出' }
    }
  }

  /**
   * 更新用户资料
   */
  const updateProfile = async (userData: Partial<User>): Promise<{ success: boolean; message: string }> => {
    try {
      if (!authState.user) {
        return { success: false, message: '用户未登录' }
      }

      console.log('👤 [AuthContext] 更新用户资料...')

      // 这里暂时只在本地更新，实际项目中应该调用API
      const updatedUser = { ...authState.user, ...userData, updatedAt: new Date() }
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }))

      console.log('✅ [AuthContext] 用户资料更新成功')
      return { success: true, message: '资料更新成功' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新失败'
      console.error('❌ [AuthContext] 更新用户资料失败:', error)
      return { success: false, message: errorMessage }
    }
  }

  /**
   * 刷新会话
   */
  const refreshSession = async (): Promise<void> => {
    await checkAuth()
  }

  /**
   * 检查会话是否过期
   */
  const isSessionExpired = (): boolean => {
    if (!authState.session) {
      return true
    }

    return new Date() > authState.session.expiresAt
  }

  /**
   * 初始化时检查认证状态
   */
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    // 添加超时保护，确保不会永远卡在加载状态
    const initializeAuth = async () => {
      await checkAuth()

      // 如果10秒后仍在加载，强制停止
      if (mounted) {
        timeoutId = setTimeout(() => {
          if (authState.isLoading) {
            console.warn('⚠️ [AuthContext] 认证检查超时，强制停止loading')
            setAuthState(prev => ({
              ...prev,
              isLoading: false,
              error: null,
              isAuthenticated: false
            }))
          }
        }, 10000)
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  /**
   * 定期检查会话状态
   */
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return
    }

    const interval = setInterval(() => {
      if (isSessionExpired()) {
        console.log('⏰ [AuthContext] 会话已过期，自动登出')
        logout()
      }
    }, 60000) // 每分钟检查一次

    return () => clearInterval(interval)
  }, [authState.isAuthenticated, authState.session])

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    refreshSession,
    isSessionExpired
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 使用认证上下文的Hook
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * 高阶组件：保护需要认证的路由
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">检查登录状态...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">需要登录</h2>
            <p className="text-gray-600 mb-6">请先登录以访问此页面</p>
            <button
              onClick={() => (window.location.href = '/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              前往登录
            </button>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

/**
 * 认证状态指示器组件
 */
export function AuthStatus() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">检查中...</span>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="text-sm font-medium text-gray-900">{user.username}</span>
      </div>
      <button
        onClick={() => logout()}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        登出
      </button>
    </div>
  )
}