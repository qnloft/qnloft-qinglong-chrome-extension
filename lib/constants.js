// 全局常量定义

// ==================== 颜色常量 ====================
export const COLORS = {
    PRIMARY: '#FBD6C1',      // 主色：浅桃色
    SUCCESS: '#4CAF50',      // 成功：绿色
    ERROR: '#F44336',        // 错误：红色
    WARNING: '#FF9800',      // 警告：橙色
    PRIMARY_DARK: '#F4C2A7', // 深色主题
    PRIMARY_LIGHT: '#FDEAE0', // 浅色主题
};

// ==================== 存储键常量 ====================
export const STORAGE_KEYS = {
    CONFIG: 'config',                    // 青龙面板配置
    SITES: 'sites',                      // 网站配置列表
    LOGS: 'logs',                        // 同步日志
    WIZARD_COMPLETED: 'wizardCompleted', // 配置向导是否完成
    ENV_CACHE: 'envCache',               // 环境变量缓存
    ENV_CACHE_TIME: 'envCacheTime',      // 环境变量缓存时间
};

// ==================== 青龙面板API路径 ====================
export const API_PATHS = {
    TOKEN: '/open/auth/token',           // 获取Token
    ENVS: '/open/envs',                  // 环境变量列表
    ENVS_ENABLE: '/open/envs/enable',    // 启用环境变量
    ENVS_DISABLE: '/open/envs/disable',  // 禁用环境变量
};

// ==================== 同步设置常量 ====================
export const SYNC_CONFIG = {
    MIN_INTERVAL: 1,                     // 最小同步间隔（分钟）
    DEFAULT_INTERVAL: 60,                // 默认同步间隔（分钟）
    DEBOUNCE_DELAY: 5 * 60 * 1000,      // Cookie变化防抖延迟（5分钟，毫秒）
    RETRY_MAX: 3,                        // 最大重试次数
    RETRY_DELAY: 1000,                   // 重试延迟（毫秒）
    BATCH_SYNC_DELAY: 1000,              // 批量同步间隔（毫秒）
};

// ==================== 日志设置常量 ====================
export const LOG_CONFIG = {
    MAX_LOGS: 1000,                      // 最大日志条目数
    MAX_DAYS: 30,                        // 日志保留天数
};

// ==================== 环境变量缓存设置 ====================
export const CACHE_CONFIG = {
    ENV_CACHE_DURATION: 5 * 60 * 1000,   // 环境变量缓存时长（5分钟，毫秒）
};

// ==================== 分页设置 ====================
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,               // 默认每页显示条目数
    PAGE_SIZE_OPTIONS: [20, 50, 100],    // 可选的每页条目数
};

// ==================== 定时器名称 ====================
export const ALARM_NAMES = {
    SYNC_COOKIE: 'syncCookie',           // Cookie同步定时器
};

// ==================== 徽章文本 ====================
export const BADGE = {
    SUCCESS: '✓',                        // 成功标识
    ERROR: '!',                          // 错误标识
    EMPTY: '',                           // 清空徽章
};

// ==================== 同步状态 ====================
export const SYNC_STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending',
};

// ==================== 环境变量状态 ====================
export const ENV_STATUS = {
    ENABLED: 1,                          // 启用
    DISABLED: 0,                         // 禁用
};

// ==================== 消息类型 ====================
export const MESSAGE_TYPES = {
    SYNC_NOW: 'syncNow',                 // 立即同步
    SYNC_SITE: 'syncSite',               // 同步指定网站
    SYNC_SELECTED_COOKIES: 'syncSelectedCookies', // 同步选中的Cookie
    DELETE_COOKIES: 'deleteCookies',     // 删除Cookie
    TEST_CONNECTION: 'testConnection',    // 测试连接
    CHECK_COOKIE: 'checkCookie',         // 检测Cookie
    GET_ENVS: 'getEnvs',                 // 获取环境变量
    ADD_ENV: 'addEnv',                   // 添加环境变量
    UPDATE_ENV: 'updateEnv',             // 更新环境变量
    DELETE_ENV: 'deleteEnv',             // 删除环境变量
    ENABLE_ENV: 'enableEnv',             // 启用环境变量
    DISABLE_ENV: 'disableEnv',           // 禁用环境变量
    GET_LOGS: 'getLogs',                 // 获取日志
    CLEAR_LOGS: 'clearLogs',             // 清除日志
};

// ==================== 默认配置 ====================
export const DEFAULT_CONFIG = {
    qlUrl: '',
    clientId: '',
    clientSecret: '',
    autoSync: true,
    syncInterval: SYNC_CONFIG.DEFAULT_INTERVAL,
};

// ==================== 默认网站配置 ====================
export const DEFAULT_SITE = {
    id: '',
    name: '',
    url: '',
    envName: '',
    enabled: true,
    autoSync: true,
    lastSync: null,
    lastStatus: null,
};

// ==================== 错误消息 ====================
export const ERROR_MESSAGES = {
    NO_CONFIG: '请先配置青龙面板连接信息',
    NO_SITES: '请先添加网站配置',
    COOKIE_NOT_FOUND: '未找到Cookie，请先登录目标网站',
    NETWORK_ERROR: '网络请求失败，请检查网络连接',
    API_ERROR: '青龙面板API调用失败',
    TOKEN_ERROR: '获取Token失败，请检查Client ID和Secret',
    ENV_NOT_FOUND: '环境变量不存在，请先在青龙面板中创建',
    INVALID_CONFIG: '配置信息不完整或无效',
};

// ==================== 成功消息 ====================
export const SUCCESS_MESSAGES = {
    SYNC_SUCCESS: 'Cookie同步成功',
    CONFIG_SAVED: '配置已保存',
    SITE_ADDED: '网站配置已添加',
    SITE_UPDATED: '网站配置已更新',
    SITE_DELETED: '网站配置已删除',
    ENV_ADDED: '环境变量已添加',
    ENV_UPDATED: '环境变量已更新',
    ENV_DELETED: '环境变量已删除',
    CONNECTION_SUCCESS: '连接测试成功',
    EXPORT_SUCCESS: '配置已导出',
    IMPORT_SUCCESS: '配置已导入',
};

// ==================== UI文本常量 ====================
export const UI_TEXT = {
    LOADING: '加载中...',
    NO_DATA: '暂无数据',
    CONFIRM_DELETE: '确定要删除吗？此操作不可恢复。',
    CONFIRM_CLEAR_LOGS: '确定要清除所有日志吗？',
    MASKED_VALUE: '••••••••',            // 隐藏的值显示
};

// ==================== 时间格式化 ====================
export const TIME_FORMAT = {
    FULL: 'YYYY-MM-DD HH:mm:ss',
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
};

