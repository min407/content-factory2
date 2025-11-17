/**
 * API配置管理类型定义
 * 用于统一管理系统中使用的各种API密钥和配置
 */

/**
 * API服务提供商枚举
 */
export enum ApiProvider {
  OPENROUTER = 'openrouter',
  SILICONFLOW = 'siliconflow',
  WECHAT_SEARCH = 'wechat_search',
  XIAOHONGSHU_SEARCH = 'xiaohongshu_search',
  XIAOHONGSHU_DETAIL = 'xiaohongshu_detail',
  WECHAT_PUBLISH = 'wechat_publish'
}

/**
 * API配置接口
 */
export interface ApiConfig {
  id: string
  provider: ApiProvider
  name: string
  description: string
  apiKey: string
  apiBase?: string
  model?: string
  serviceProvider?: string  // 新增：API服务商ID
  isActive: boolean
  isConfigured: boolean
  lastTested?: Date
  testStatus?: 'success' | 'error' | 'pending'
  testMessage?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * API配置模板
 */
export interface ApiConfigTemplate {
  provider: ApiProvider
  name: string
  description: string
  requiredFields: ApiConfigField[]
  defaultValues: Record<string, string>
  documentation: {
    url?: string
    apiKeyHelp: string
    setupGuide?: string[]
  }
}

/**
 * API配置字段
 */
export interface ApiConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'select' | 'service_provider'
  required: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string; description?: string; isRecommended?: boolean }>
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    message?: string
  }
  helpText?: string
}

/**
 * API服务商信息
 */
export interface ApiServiceProvider {
  id: string
  name: string
  description: string
  baseUrl: string
  documentation?: string
  features?: string[]
  pricing?: string
  isRecommended?: boolean
  isCustom?: boolean
}

/**
 * API测试结果
 */
export interface ApiTestResult {
  success: boolean
  message: string
  responseTime?: number
  details?: any
  timestamp: Date
}

/**
 * API使用统计
 */
export interface ApiUsageStats {
  provider: ApiProvider
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastUsed: Date
}

/**
 * 用户API配置概览
 */
export interface UserApiConfigOverview {
  totalConfigs: number
  activeConfigs: number
  configuredProviders: ApiProvider[]
  needsAttention: Array<{
    provider: ApiProvider
    issue: string
    severity: 'low' | 'medium' | 'high'
  }>
}

/**
 * API配置导入/导出
 */
export interface ApiConfigExport {
  version: string
  timestamp: Date
  configs: Array<{
    provider: ApiProvider
    name: string
    apiBase?: string
    model?: string
    // 注意：导出时不包含实际的apiKey
    hasApiKey: boolean
  }>
}

/**
 * API配置验证结果
 */
export interface ApiConfigValidation {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
  }>
  warnings: Array<{
    field: string
    message: string
  }>
}

/**
 * API服务商定义
 */
export const API_SERVICE_PROVIDERS: Record<ApiProvider, ApiServiceProvider[]> = {
  [ApiProvider.OPENROUTER]: [
    {
      id: 'openrouter-official',
      name: 'OpenRouter 官方',
      description: 'OpenRouter官方API服务，稳定可靠',
      baseUrl: 'https://openrouter.ai/api/v1',
      documentation: 'https://openrouter.ai/docs',
      features: ['多模型支持', '高可用性', '官方技术支持'],
      pricing: '按使用量付费',
      isRecommended: true,
      isCustom: false
    },
    {
      id: 'openrouter-proxy',
      name: 'OpenRouter 代理服务',
      description: '第三方代理服务，可能更便宜',
      baseUrl: 'https://api.openai-proxy.com/v1',
      features: ['价格优惠', '基本功能'],
      pricing: '按使用量付费，价格更低',
      isRecommended: false,
      isCustom: false
    }
  ],

  [ApiProvider.SILICONFLOW]: [
    {
      id: 'siliconflow-official',
      name: 'SiliconFlow 官方',
      description: 'SiliconFlow官方API服务',
      baseUrl: 'https://api.siliconflow.cn/v1',
      documentation: 'https://siliconflow.cn/docs',
      features: ['多模型支持', '图片生成', '视频生成'],
      pricing: '按使用量付费',
      isRecommended: true,
      isCustom: false
    },
    {
      id: 'siliconflow-proxy',
      name: 'SiliconFlow 代理',
      description: '第三方代理服务',
      baseUrl: 'https://proxy.siliconflow-api.com/v1',
      features: ['价格优惠', '基本功能'],
      pricing: '更便宜的按量付费',
      isRecommended: false,
      isCustom: false
    }
  ],

  [ApiProvider.WECHAT_SEARCH]: [
    {
      id: 'dajiala-wechat',
      name: '极致了 API',
      description: '当前使用的第三方API服务',
      baseUrl: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search',
      features: ['微信公众号搜索', '文章列表获取'],
      pricing: '按次付费',
      isRecommended: true,
      isCustom: false
    },
    {
      id: 'custom-wechat',
      name: '自定义API',
      description: '自定义微信搜索API地址',
      baseUrl: '',
      features: ['完全自定义'],
      pricing: '取决于服务商',
      isRecommended: false,
      isCustom: true
    }
  ],

  [ApiProvider.XIAOHONGSHU_SEARCH]: [
    {
      id: 'dajiala-xiaohongshu',
      name: '极致了 API (小红书)',
      description: '当前使用的小红书搜索API',
      baseUrl: 'https://www.dajiala.com/fbmain/monitor/v3/xhs',
      features: ['小红书笔记搜索', '热门内容获取'],
      pricing: '按次付费',
      isRecommended: true,
      isCustom: false
    },
    {
      id: 'custom-xiaohongshu',
      name: '自定义API',
      description: '自定义小红书搜索API地址',
      baseUrl: '',
      features: ['完全自定义'],
      pricing: '取决于服务商',
      isRecommended: false,
      isCustom: true
    }
  ],

  [ApiProvider.XIAOHONGSHU_DETAIL]: [
    {
      id: 'meowload-xiaohongshu',
      name: '哼哼猫 API',
      description: '当前使用的小红书详情API',
      baseUrl: 'https://api.meowload.net/openapi/extract/post',
      features: ['笔记详情获取', '图片下载'],
      pricing: '按次付费',
      isRecommended: true,
      isCustom: false
    },
    {
      id: 'custom-xiaohongshu-detail',
      name: '自定义API',
      description: '自定义小红书详情API地址',
      baseUrl: '',
      features: ['完全自定义'],
      pricing: '取决于服务商',
      isRecommended: false,
      isCustom: true
    }
  ],

  [ApiProvider.WECHAT_PUBLISH]: [
    {
      id: 'custom-wechat-publish',
      name: '自定义发布API',
      description: '自定义微信公众号发布API',
      baseUrl: '',
      features: ['文章发布', '草稿管理'],
      pricing: '取决于服务商',
      isRecommended: false,
      isCustom: true
    }
  ]
}

/**
 * 支持的API配置模板
 */
export const API_CONFIG_TEMPLATES: Record<ApiProvider, ApiConfigTemplate> = {
  [ApiProvider.OPENROUTER]: {
    provider: ApiProvider.OPENROUTER,
    name: 'OpenRouter',
    description: '大语言模型API服务，用于文章生成和内容分析',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        validation: {
          pattern: '^sk-?or-v1-[a-zA-Z0-9]{32,}$',
          message: '请输入有效的OpenRouter API Key格式（应以sk-or-v1-开头，至少32位字符）'
        },
        helpText: '在OpenRouter官网获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API Base URL',
        type: 'url',
        required: false,
        placeholder: 'https://openrouter.ai/api/v1',
        helpText: '默认使用OpenRouter官方API地址'
      },
      {
        key: 'model',
        label: '模型',
        type: 'select',
        required: false,
        options: [
          { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
          { value: 'openai/gpt-4o', label: 'GPT-4o' },
          { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
          { value: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' }
        ],
        helpText: '选择用于文章生成的AI模型'
      }
    ],
    defaultValues: {
      apiBase: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-3.5-sonnet'
    },
    documentation: {
      url: 'https://openrouter.ai/docs',
      apiKeyHelp: '访问OpenRouter官网注册账户并获取API密钥',
      setupGuide: [
        '1. 访问 https://openrouter.ai 注册账户',
        '2. 在控制台中生成新的API密钥',
        '3. 复制API密钥到此处',
        '4. 选择合适的AI模型',
        '5. 点击测试连接验证配置'
      ]
    }
  },

  [ApiProvider.SILICONFLOW]: {
    provider: ApiProvider.SILICONFLOW,
    name: 'Silicon Flow',
    description: 'AI图片生成服务，用于生成文章配图',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        validation: {
          pattern: '^sk-[a-zA-Z0-9]{15,}$',
          message: '请输入有效的Silicon Flow API Key格式（应以sk-开头，至少15位字符）'
        },
        helpText: '在SiliconFlow官网获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API Base URL',
        type: 'url',
        required: false,
        placeholder: 'https://api.siliconflow.cn/v1',
        helpText: '默认使用SiliconFlow官方API地址'
      },
      {
        key: 'model',
        label: '图片模型',
        type: 'select',
        required: false,
        options: [
          { value: 'Kwai-Kolors/Kolors', label: 'Kolors' },
          { value: 'stabilityai/stable-diffusion-3-5-large', label: 'Stable Diffusion 3.5 Large' },
          { value: 'black-forest-labs/FLUX.1-dev', label: 'FLUX.1 Dev' },
          { value: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell' }
        ],
        helpText: '选择用于图片生成的AI模型'
      }
    ],
    defaultValues: {
      apiBase: 'https://api.siliconflow.cn/v1',
      model: 'Kwai-Kolors/Kolors'
    },
    documentation: {
      url: 'https://siliconflow.cn/docs',
      apiKeyHelp: '访问SiliconFlow官网注册账户并获取API密钥',
      setupGuide: [
        '1. 访问 https://siliconflow.cn 注册账户',
        '2. 在控制台中生成新的API密钥',
        '3. 复制API密钥到此处',
        '4. 选择合适的图片生成模型',
        '5. 点击测试连接验证配置'
      ]
    }
  },

  [ApiProvider.WECHAT_SEARCH]: {
    provider: ApiProvider.WECHAT_SEARCH,
    name: '微信公众号搜索',
    description: '微信公众号文章搜索API服务',
    requiredFields: [
      {
        key: 'serviceProvider',
        label: 'API服务商',
        type: 'service_provider',
        required: true,
        options: [
          {
            value: 'dajiala-wechat',
            label: '极致了 API',
            description: '当前使用的第三方API服务，价格实惠',
            isRecommended: true
          },
          {
            value: 'custom-wechat',
            label: '自定义API',
            description: '使用自己的API服务地址',
            isRecommended: false
          }
        ],
        helpText: '选择API服务商，推荐使用当前正在使用的服务商'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '微信公众号搜索API密钥',
        helpText: '从所选服务提供商获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API地址',
        type: 'url',
        required: true,
        placeholder: '自动根据服务商选择填充',
        helpText: 'API服务地址，选择服务商后会自动填充'
      }
    ],
    defaultValues: {
      serviceProvider: 'dajiala-wechat',
      apiBase: 'https://www.dajiala.com/fbmain/monitor/v3/kw_search'
    },
    documentation: {
      apiKeyHelp: '需要联系第三方服务提供商获取API访问权限',
      setupGuide: [
        '1. 联系API服务提供商获取访问权限',
        '2. 获取API密钥和访问地址',
        '3. 填写API密钥和地址',
        '4. 点击测试连接验证配置'
      ]
    }
  },

  [ApiProvider.XIAOHONGSHU_SEARCH]: {
    provider: ApiProvider.XIAOHONGSHU_SEARCH,
    name: '小红书搜索',
    description: '小红书笔记搜索API服务',
    requiredFields: [
      {
        key: 'serviceProvider',
        label: 'API服务商',
        type: 'service_provider',
        required: true,
        options: [
          {
            value: 'dajiala-xiaohongshu',
            label: '极致了 API (小红书)',
            description: '当前使用的小红书搜索API，价格实惠',
            isRecommended: true
          },
          {
            value: 'custom-xiaohongshu',
            label: '自定义API',
            description: '使用自己的API服务地址',
            isRecommended: false
          }
        ],
        helpText: '选择API服务商，推荐使用当前正在使用的服务商'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '小红书搜索API密钥',
        helpText: '从所选服务提供商获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API地址',
        type: 'url',
        required: true,
        placeholder: '自动根据服务商选择填充',
        helpText: 'API服务地址，选择服务商后会自动填充'
      }
    ],
    defaultValues: {
      serviceProvider: 'dajiala-xiaohongshu',
      apiBase: 'https://www.dajiala.com/fbmain/monitor/v3/xhs'
    },
    documentation: {
      apiKeyHelp: '需要联系第三方服务提供商获取API访问权限',
      setupGuide: [
        '1. 联系API服务提供商获取访问权限',
        '2. 获取API密钥和访问地址',
        '3. 填写API密钥和地址',
        '4. 点击测试连接验证配置'
      ]
    }
  },

  [ApiProvider.XIAOHONGSHU_DETAIL]: {
    provider: ApiProvider.XIAOHONGSHU_DETAIL,
    name: '小红书详情',
    description: '小红书笔记详情获取API服务',
    requiredFields: [
      {
        key: 'serviceProvider',
        label: 'API服务商',
        type: 'service_provider',
        required: true,
        options: [
          {
            value: 'meowload-xiaohongshu',
            label: '哼哼猫 API',
            description: '当前使用的小红书详情API，功能稳定',
            isRecommended: true
          },
          {
            value: 'custom-xiaohongshu-detail',
            label: '自定义API',
            description: '使用自己的API服务地址',
            isRecommended: false
          }
        ],
        helpText: '选择API服务商，推荐使用当前正在使用的服务商'
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '小红书详情API密钥',
        helpText: '从所选服务提供商获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API地址',
        type: 'url',
        required: true,
        placeholder: '自动根据服务商选择填充',
        helpText: 'API服务地址，选择服务商后会自动填充'
      }
    ],
    defaultValues: {
      serviceProvider: 'meowload-xiaohongshu',
      apiBase: 'https://api.meowload.net/openapi/extract/post'
    },
    documentation: {
      apiKeyHelp: '需要联系哼哼猫等服务提供商获取API访问权限',
      setupGuide: [
        '1. 联系哼哼猫等服务提供商获取访问权限',
        '2. 获取API密钥和访问地址',
        '3. 填写API密钥和地址',
        '4. 点击测试连接验证配置'
      ]
    }
  },

  [ApiProvider.WECHAT_PUBLISH]: {
    provider: ApiProvider.WECHAT_PUBLISH,
    name: '微信公众号发布',
    description: '微信公众号文章发布API服务',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '微信公众号发布API密钥',
        helpText: '从第三方服务提供商获取API密钥'
      },
      {
        key: 'apiBase',
        label: 'API地址',
        type: 'url',
        required: false,
        placeholder: 'https://wx.limyai.com/api/openapi',
        helpText: '微信公众号发布API地址'
      }
    ],
    defaultValues: {
      apiBase: 'https://wx.limyai.com/api/openapi'
    },
    documentation: {
      apiKeyHelp: '需要联系第三方服务提供商获取API访问权限',
      setupGuide: [
        '1. 联系API服务提供商获取访问权限',
        '2. 获取API密钥和访问地址',
        '3. 填写API密钥和地址',
        '4. 点击测试连接验证配置'
      ]
    }
  }
}