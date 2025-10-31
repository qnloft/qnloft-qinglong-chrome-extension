// Background Service Worker - 重构版本支持多网站配置

import { storageManager } from './lib/storage-manager.js';
import { qinglongAPI } from './lib/qinglong-api.js';
import { cookieManager } from './lib/cookie-manager.js';
import { logger } from './lib/logger.js';
import jdHandler from './lib/handlers/jd-handler.js';
import {
    ALARM_NAMES,
    BADGE,
    COLORS,
    MESSAGE_TYPES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    SYNC_CONFIG
} from './lib/constants.js';

/**
 * 扩展安装时的处理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('扩展已安装/更新:', details.reason);

    // 首次安装时，打开配置向导
    if (details.reason === 'install') {
        const wizardCompleted = await storageManager.getWizardCompleted();
        if (!wizardCompleted) {
            chrome.tabs.create({ url: 'wizard/wizard.html' });
        }
    }

    // 创建右键菜单
    createContextMenus();

    // 初始化
    await initialize();
});

/**
 * 浏览器启动时的处理
 */
chrome.runtime.onStartup.addListener(async () => {
    console.log('浏览器启动');
    await initialize();
});

/**
 * 创建右键菜单
 */
function createContextMenus() {
    // 清除所有现有菜单
    chrome.contextMenus.removeAll(() => {
        // 1. 打开青龙助手（打开扩展设置页面）
        chrome.contextMenus.create({
            id: 'openAssistant',
            title: '打开青龙助手',
            contexts: ['action']  // 只在扩展图标上显示
        });

        // 2. 打开青龙面板
        chrome.contextMenus.create({
            id: 'openQlPanel',
            title: '打开青龙面板',
            contexts: ['action']
        });

        // 3. 访问青柠官方
        chrome.contextMenus.create({
            id: 'openQnloft',
            title: '访问青柠官方',
            contexts: ['action']
        });

        // 分隔线
        chrome.contextMenus.create({
            id: 'separator1',
            type: 'separator',
            contexts: ['action']
        });

        // 手动同步Cookie
        chrome.contextMenus.create({
            id: 'syncNow',
            title: '手动同步Cookie',
            contexts: ['action']
        });
    });
}

/**
 * 处理右键菜单点击
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('右键菜单点击:', info.menuItemId);

    switch (info.menuItemId) {
        case 'openAssistant':
            // 打开青龙助手设置页面
            chrome.runtime.openOptionsPage();
            break;

        case 'openQlPanel':
            // 打开青龙面板
            const config = await storageManager.getConfig();
            if (config.qlUrl) {
                chrome.tabs.create({ url: config.qlUrl });
            } else {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'assets/icons/icon-128.png',
                    title: 'qnloft-青龙助手',
                    message: '请先配置青龙面板URL'
                });
            }
            break;

        case 'openQnloft':
            // 访问青柠官方网站
            chrome.tabs.create({ url: 'https://qnloft.com/' });
            break;

        case 'syncNow':
            // 手动同步Cookie
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'assets/icons/icon-128.png',
                    title: 'qnloft-青龙助手',
                    message: '开始同步Cookie...'
                });

                await syncAllSites();
            } catch (error) {
                console.error('同步失败:', error);
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'assets/icons/icon-128.png',
                    title: '同步失败',
                    message: error.message || '同步Cookie失败'
                });
            }
            break;
    }
});

/**
 * 初始化扩展
 */
async function initialize() {
    try {
        console.log('初始化扩展...');

        const config = await storageManager.getConfig();
        const sites = await storageManager.getSites();

        // 如果启用了自动同步，设置定时器
        if (config.autoSync && sites.length > 0) {
            await setupSyncAlarm(config.syncInterval);

            // 执行首次同步（仅同步启用的网站）
            await syncAllSites();
        }

        console.log('初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        await updateBadge(BADGE.ERROR, COLORS.ERROR);
    }
}

/**
 * 监听定时器触发
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAMES.SYNC_COOKIE) {
        console.log('定时同步触发');
        await syncAllSites();
    }
});

/**
 * 监听存储变化
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;

    // 配置变化
    if (changes.config) {
        const newConfig = changes.config.newValue;
        const oldConfig = changes.config.oldValue || {};
        
        // 检查是否需要更新定时器
        if (newConfig.autoSync !== oldConfig.autoSync || 
            newConfig.syncInterval !== oldConfig.syncInterval) {
            
            if (newConfig.autoSync) {
                await setupSyncAlarm(newConfig.syncInterval);
            } else {
                await chrome.alarms.clear(ALARM_NAMES.SYNC_COOKIE);
                console.log('自动同步已禁用');
            }
        }
    }

    // 网站配置变化
    if (changes.sites) {
        console.log('网站配置已更新');
        // 可以在这里触发重新同步
    }
});

/**
 * 监听来自Popup和Options的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('收到消息:', request.action);

    // 处理异步消息
    handleMessage(request, sender)
        .then(response => {
            console.log('消息处理成功，准备发送响应:', response);
            sendResponse(response);
        })
        .catch(error => {
            console.error('消息处理失败:', error);
            const errorResponse = {
                success: false,
                error: error.message
            };
            console.log('发送错误响应:', errorResponse);
            sendResponse(errorResponse);
        });

    return true; // 保持消息通道开启以进行异步响应
});

/**
 * 处理消息
 */
async function handleMessage(request, sender) {
    console.log('handleMessage 开始处理:', request.action, 'config:', request.config);
    console.log('handleMessage 完整的 request 对象:', request);
    switch (request.action) {
        case MESSAGE_TYPES.SYNC_NOW:
            return await handleSyncNow();

        case MESSAGE_TYPES.SYNC_SITE:
            return await handleSyncSite(request.siteId);

        case MESSAGE_TYPES.TEST_CONNECTION:
            console.log('进入 TEST_CONNECTION 分支');
            return await handleTestConnection(request.config);

        case MESSAGE_TYPES.CHECK_COOKIE:
            return await handleCheckCookie(request.siteId);

        case MESSAGE_TYPES.GET_ENVS:
            return await handleGetEnvs(request.useCache);

        case MESSAGE_TYPES.ADD_ENV:
            return await handleAddEnv(request.data);

        case MESSAGE_TYPES.UPDATE_ENV:
            return await handleUpdateEnv(request.data);

        case MESSAGE_TYPES.DELETE_ENV:
            return await handleDeleteEnv(request.ids);

        case MESSAGE_TYPES.ENABLE_ENV:
            return await handleEnableEnv(request.ids);

        case MESSAGE_TYPES.DISABLE_ENV:
            return await handleDisableEnv(request.ids);

        case MESSAGE_TYPES.GET_LOGS:
            return await handleGetLogs(request.options);

        case MESSAGE_TYPES.CLEAR_LOGS:
            return await handleClearLogs();

        case MESSAGE_TYPES.SYNC_SELECTED_COOKIES:
            return await handleSyncSelectedCookies(request.siteId, request.cookieNames);

        case MESSAGE_TYPES.DELETE_COOKIES:
            return await handleDeleteCookies(request.siteId);

        default:
            throw new Error(`未知的操作: ${request.action}`);
    }
}

/**
 * 处理：立即同步所有网站
 */
async function handleSyncNow() {
    const result = await syncAllSites();
    return {
        success: result.success,
        message: result.message,
        results: result.results,
        timestamp: Date.now()
    };
}

/**
 * 处理：同步指定网站
 */
async function handleSyncSite(siteId) {
    const site = await storageManager.getSite(siteId);
    if (!site) {
        return {
            success: false,
            error: '网站配置不存在'
        };
    }

    const result = await syncSite(site);
    return {
        success: result.success,
        message: result.message,
        timestamp: Date.now()
    };
}

/**
 * 处理：测试青龙面板连接
 */
async function handleTestConnection(config = null) {
    console.log('handleTestConnection 被调用，config:', config);
    try {
        const result = await qinglongAPI.testConnection(config);
        console.log('handleTestConnection 返回结果:', result);
        return result;
    } catch (error) {
        console.error('handleTestConnection 发生错误:', error);
        throw error;
    }
}

/**
 * 处理：检测Cookie
 */
async function handleCheckCookie(siteId) {
    try {
        const site = await storageManager.getSite(siteId);
        if (!site) {
            return {
                success: false,
                error: '网站配置不存在'
            };
        }

        // 检查是否有Cookie
        const hasCookies = await cookieManager.hasCookies(site.url);
        
        if (!hasCookies) {
            return {
                success: false,
                hasCookies: false,
                message: '未找到Cookie，请先登录该网站',
                cookieCount: 0
            };
        }

        // 获取Cookie详情
        const cookies = await chrome.cookies.getAll({ url: site.url });
        const cookieCount = cookies.length;
        
        // 检查是否有过期的Cookie
        const now = Date.now() / 1000;
        const expiredCookies = cookies.filter(c => c.expirationDate && c.expirationDate < now);
        const validCookies = cookies.filter(c => !c.expirationDate || c.expirationDate >= now);
        
        // 如果是京东域名，额外进行Cookie有效性验证
        const domain = new URL(site.url).hostname;
        if (jdHandler.isJDDomain(domain)) {
            console.log('[检测Cookie] 检测到京东域名，使用京东专用验证');
            
            // 获取Cookie字符串
            const cookieString = await cookieManager.getAllCookies(site.url);
            
            // 调用京东验证接口
            const validation = await jdHandler.validateCookies(cookieString);
            
            if (!validation.valid) {
                return {
                    success: false,
                    hasCookies: true,
                    cookieCount: cookieCount,
                    validCount: 0,
                    expiredCount: expiredCookies.length,
                    isJD: true,
                    jdValidation: validation,
                    message: `京东Cookie验证失败: ${validation.reason}`
                };
            }
            
            // 京东验证成功
            return {
                success: true,
                hasCookies: true,
                cookieCount: cookieCount,
                validCount: validCookies.length,
                expiredCount: expiredCookies.length,
                isJD: true,
                jdValidation: validation,
                message: `京东Cookie有效 (用户: ${validation.data.nickname})`
            };
        }
        
        // 通用Cookie检测结果
        return {
            success: true,
            hasCookies: true,
            cookieCount: cookieCount,
            validCount: validCookies.length,
            expiredCount: expiredCookies.length,
            message: expiredCookies.length > 0 
                ? `找到${cookieCount}个Cookie，其中${expiredCookies.length}个已过期` 
                : `找到${cookieCount}个有效Cookie`
        };
        
    } catch (error) {
        console.error('检测Cookie失败:', error);
        return {
            success: false,
            hasCookies: false,
            error: error.message || '检测Cookie失败'
        };
    }
}

/**
 * 处理：获取环境变量
 */
async function handleGetEnvs(useCache = true) {
    try {
        const envs = await qinglongAPI.getEnvs(useCache);
        return {
            success: true,
            data: envs
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：添加环境变量
 */
async function handleAddEnv(data) {
    try {
        const result = await qinglongAPI.createEnv(data);
        return {
            success: true,
            data: result,
            message: SUCCESS_MESSAGES.ENV_ADDED
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：更新环境变量
 */
async function handleUpdateEnv(data) {
    try {
        const result = await qinglongAPI.updateEnv(data);
        return {
            success: true,
            data: result,
            message: SUCCESS_MESSAGES.ENV_UPDATED
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：删除环境变量
 */
async function handleDeleteEnv(ids) {
    try {
        await qinglongAPI.deleteEnvs(ids);
        return {
            success: true,
            message: SUCCESS_MESSAGES.ENV_DELETED
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：启用环境变量
 */
async function handleEnableEnv(ids) {
    try {
        await qinglongAPI.enableEnvs(ids);
        return {
            success: true,
            message: '环境变量已启用'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：禁用环境变量
 */
async function handleDisableEnv(ids) {
    try {
        await qinglongAPI.disableEnvs(ids);
        return {
            success: true,
            message: '环境变量已禁用'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：获取日志
 */
async function handleGetLogs(options = {}) {
    try {
        const logs = await logger.getLogs(options);
        const stats = await logger.getStats();
        return {
            success: true,
            logs,
            stats
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 处理：清除日志
 */
async function handleClearLogs() {
    try {
        await logger.clearAll();
        return {
            success: true,
            message: '日志已清除'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 同步所有启用的网站
 */
async function syncAllSites() {
    const sites = await storageManager.getSites();
    const enabledSites = sites.filter(site => site.enabled && site.autoSync);

    if (enabledSites.length === 0) {
        console.log('没有启用的网站需要同步');
        return {
            success: true,
            message: '没有启用的网站',
            results: []
        };
    }

    console.log(`开始同步 ${enabledSites.length} 个网站...`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 串行执行同步，避免API限流
    for (const site of enabledSites) {
        const result = await syncSite(site);
        results.push({
            siteId: site.id,
            siteName: site.name,
            ...result
        });

        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }

        // 延迟以避免请求过快
        if (enabledSites.indexOf(site) < enabledSites.length - 1) {
            await delay(SYNC_CONFIG.BATCH_SYNC_DELAY);
        }
    }

    // 更新徽章
    if (failCount > 0) {
        await updateBadge(BADGE.ERROR, COLORS.ERROR);
    } else if (successCount > 0) {
        await updateBadge(BADGE.SUCCESS, COLORS.SUCCESS);
        // 3秒后清除徽章
        setTimeout(async () => {
            await updateBadge(BADGE.EMPTY, COLORS.PRIMARY);
        }, 3000);
    }

    return {
        success: failCount === 0,
        message: `成功: ${successCount}, 失败: ${failCount}`,
        results
    };
}

/**
 * 同步单个网站
 */
async function syncSite(site) {
    console.log(`同步网站: ${site.name}`);

    try {
        // 1. 获取Cookie
        const hasCookies = await cookieManager.hasCookies(site.url);
        if (!hasCookies) {
            throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
        }

        const cookieString = await cookieManager.getAllCookies(site.url);
        if (!cookieString) {
            throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
        }

        console.log(`已获取Cookie，长度: ${cookieString.length}`);

        // 2. 判断是否为京东域名，使用智能匹配
        const domain = new URL(site.url).hostname;
        if (jdHandler.isJDDomain(domain)) {
            console.log(`[同步] 检测到京东域名，使用智能匹配`);
            
            // 2.1 验证Cookie有效性（可选，但建议）
            const validation = await jdHandler.validateCookies(cookieString);
            if (!validation.valid) {
                throw new Error(`京东Cookie无效: ${validation.reason}`);
            }
            console.log(`[同步] Cookie有效，用户: ${validation.data.nickname}`);
            
            // 2.2 获取青龙环境变量列表
            const envList = await qinglongAPI.getEnvs();
            
            // 2.3 智能匹配环境变量
            const match = await jdHandler.matchQLEnv(envList, cookieString);
            
            if (match.matched) {
                // 找到匹配的环境变量，更新它
                console.log(`[同步] 找到匹配的环境变量 (ID: ${match.envId})`);
                
                // 使用完整的环境变量对象，确保包含所有必要字段（id/_id等）
                const updateData = {
                    ...match.env, // 保留原有所有字段
                    value: cookieString, // 更新值
                    remarks: `由Cookie同步助手更新于 ${new Date().toLocaleString()} (智能匹配)` // 更新备注
                };
                
                await qinglongAPI.updateEnv(updateData);
            } else {
                // 未找到匹配，使用通用逻辑创建新的
                console.log(`[同步] 未找到匹配的环境变量，创建新的: ${match.reason}`);
                await qinglongAPI.upsertEnv(
                    site.envName,
                    cookieString,
                    `由Cookie同步助手更新于 ${new Date().toLocaleString()}`
                );
            }
        } else {
            // 非京东网站，使用通用逻辑
            await qinglongAPI.upsertEnv(
                site.envName,
                cookieString,
                `由Cookie同步助手更新于 ${new Date().toLocaleString()}`
            );
        }

        // 3. 更新网站配置
        await storageManager.updateSite(site.id, {
            lastSync: Date.now(),
            lastStatus: 'success'
        });

        // 4. 记录日志
        await logger.logSuccess(site.id, site.name, SUCCESS_MESSAGES.SYNC_SUCCESS);

        console.log(`${site.name} 同步成功`);

        return {
            success: true,
            message: SUCCESS_MESSAGES.SYNC_SUCCESS
        };

    } catch (error) {
        console.error(`${site.name} 同步失败:`, error);

        // 更新网站配置
        await storageManager.updateSite(site.id, {
            lastSync: Date.now(),
            lastStatus: 'failed'
        });

        // 记录日志
        await logger.logError(site.id, site.name, error.message);

        // 显示通知
        await showNotification(
            `${site.name} 同步失败`,
            error.message,
            'error'
        );

        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * 设置同步定时器
 */
async function setupSyncAlarm(intervalMinutes) {
    try {
        await chrome.alarms.clear(ALARM_NAMES.SYNC_COOKIE);

        const interval = Math.max(SYNC_CONFIG.MIN_INTERVAL, intervalMinutes || SYNC_CONFIG.DEFAULT_INTERVAL);
        await chrome.alarms.create(ALARM_NAMES.SYNC_COOKIE, {
            periodInMinutes: interval
        });

        console.log(`已设置定时同步，间隔: ${interval}分钟`);
    } catch (error) {
        console.error('设置定时器失败:', error);
    }
}

/**
 * 更新扩展图标徽章
 */
async function updateBadge(text, color) {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
}

/**
 * 显示通知
 */
async function showNotification(title, message, type = 'info') {
    const iconUrl = type === 'error' ? 'assets/icons/icon-48.png' : 'assets/icons/icon-48.png';

    await chrome.notifications.create({
        type: 'basic',
        iconUrl,
        title,
        message,
        priority: type === 'error' ? 2 : 1
    });
}

/**
 * 延迟函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cookie变化监听 - 带防抖处理
 */
const cookieChangeTimers = new Map(); // 每个网站的防抖计时器

chrome.cookies.onChanged.addListener(async (changeInfo) => {
    try {
        const cookie = changeInfo.cookie;
        const sites = await storageManager.getSites();

        // 检查是否有网站匹配这个Cookie的域名
        for (const site of sites) {
            if (!site.enabled || !site.autoSync) {
                continue;
            }

            const siteDomain = cookieManager.extractDomain(site.url);
            const cookieDomain = cookie.domain.replace(/^\./, '');

            // 检查域名是否匹配
            if (siteDomain.includes(cookieDomain) || cookieDomain.includes(siteDomain)) {
                console.log(`检测到 ${site.name} 的Cookie变化:`, cookie.name);

                // 清除现有的计时器
                if (cookieChangeTimers.has(site.id)) {
                    clearTimeout(cookieChangeTimers.get(site.id));
                }

                // 设置新的防抖计时器
                const timer = setTimeout(async () => {
                    console.log(`防抖延迟后，触发 ${site.name} 的同步`);
                    await syncSite(site);
                    cookieChangeTimers.delete(site.id);
                }, SYNC_CONFIG.DEBOUNCE_DELAY);

                cookieChangeTimers.set(site.id, timer);
            }
        }
    } catch (error) {
        console.error('Cookie变化监听处理失败:', error);
    }
});

/**
 * 处理：同步选中的Cookie
 */
async function handleSyncSelectedCookies(siteId, cookieNames) {
    try {
        console.log(`同步选中Cookie: ${siteId}, Cookie: ${cookieNames.join(', ')}`);

        // 1. 获取网站配置
        const sites = await storageManager.getSites();
        const site = sites.find(s => s.id === siteId);

        if (!site) {
            throw new Error('网站配置不存在');
        }

        if (!site.enabled) {
            throw new Error('网站配置已禁用');
        }

        // 2. 验证配置
        const config = await storageManager.getConfig();
        if (!config.qlUrl || !config.clientId || !config.clientSecret) {
            throw new Error(ERROR_MESSAGES.NO_CONFIG);
        }

        // 3. 获取选中的Cookie
        const cookieString = await cookieManager.getSelectedCookies(site.url, cookieNames);
        if (!cookieString) {
            throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
        }

        console.log(`已获取选中Cookie，长度: ${cookieString.length}`);

        // 4. 判断是否为京东域名，使用智能匹配
        const domain = new URL(site.url).hostname;
        if (jdHandler.isJDDomain(domain)) {
            console.log(`[同步选中Cookie] 检测到京东域名，使用智能匹配`);
            
            // 4.1 验证Cookie有效性
            const validation = await jdHandler.validateCookies(cookieString);
            if (!validation.valid) {
                throw new Error(`京东Cookie无效: ${validation.reason}`);
            }
            console.log(`[同步选中Cookie] Cookie有效，用户: ${validation.data.nickname}`);
            
            // 4.2 获取青龙环境变量列表
            const envList = await qinglongAPI.getEnvs();
            
            // 4.3 智能匹配环境变量
            const match = await jdHandler.matchQLEnv(envList, cookieString);
            
            if (match.matched) {
                // 找到匹配的环境变量，更新它
                console.log(`[同步选中Cookie] 找到匹配的环境变量 (ID: ${match.envId})`);
                
                // 使用完整的环境变量对象，确保包含所有必要字段（id/_id等）
                const updateData = {
                    ...match.env, // 保留原有所有字段
                    value: cookieString, // 更新值
                    remarks: `由Cookie同步助手更新于 ${new Date().toLocaleString()} (选中${cookieNames.length}个Cookie, 智能匹配)` // 更新备注
                };
                
                await qinglongAPI.updateEnv(updateData);
            } else {
                // 未找到匹配，使用通用逻辑创建新的
                console.log(`[同步选中Cookie] 未找到匹配的环境变量，创建新的: ${match.reason}`);
                await qinglongAPI.upsertEnv(
                    site.envName,
                    cookieString,
                    `由Cookie同步助手更新于 ${new Date().toLocaleString()} (选中${cookieNames.length}个Cookie)`
                );
            }
        } else {
            // 非京东网站，使用通用逻辑
            await qinglongAPI.upsertEnv(
                site.envName,
                cookieString,
                `由Cookie同步助手更新于 ${new Date().toLocaleString()} (选中${cookieNames.length}个Cookie)`
            );
        }

        // 5. 更新网站配置
        await storageManager.updateSite(site.id, {
            lastSync: Date.now(),
            lastStatus: 'success'
        });

        // 6. 记录日志
        await logger.logSuccess(site.id, site.name, `同步选中Cookie成功 (${cookieNames.length}个)`);

        console.log(`${site.name} 选中Cookie同步成功`);

        return {
            success: true,
            message: `同步成功，已同步 ${cookieNames.length} 个Cookie`,
            syncedCount: cookieNames.length
        };

    } catch (error) {
        console.error('同步选中Cookie失败:', error);

        // 更新网站配置
        if (siteId) {
            await storageManager.updateSite(siteId, {
                lastSync: Date.now(),
                lastStatus: 'failed'
            });

            // 记录日志
            const sites = await storageManager.getSites();
            const site = sites.find(s => s.id === siteId);
            if (site) {
                await logger.logError(site.id, site.name, error.message);
            }
        }

        // 显示通知
        await showNotification(
            '选中Cookie同步失败',
            error.message,
            'error'
        );

        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * 处理：删除Cookie
 */
async function handleDeleteCookies(siteId) {
    try {
        console.log(`删除Cookie: ${siteId}`);

        // 1. 获取网站配置
        const sites = await storageManager.getSites();
        const site = sites.find(s => s.id === siteId);

        if (!site) {
            throw new Error('网站配置不存在');
        }

        // 2. 删除Cookie
        const deletedCount = await cookieManager.deleteAllCookies(site.url);

        // 3. 记录日志
        await logger.logSuccess(site.id, site.name, `删除Cookie成功 (${deletedCount}个)`);

        console.log(`${site.name} Cookie删除成功，删除了 ${deletedCount} 个Cookie`);

        return {
            success: true,
            message: `删除成功，已删除 ${deletedCount} 个Cookie`,
            deletedCount: deletedCount
        };

    } catch (error) {
        console.error('删除Cookie失败:', error);

        // 记录日志
        if (siteId) {
            const sites = await storageManager.getSites();
            const site = sites.find(s => s.id === siteId);
            if (site) {
                await logger.logError(site.id, site.name, error.message);
            }
        }

        // 显示通知
        await showNotification(
            '删除Cookie失败',
            error.message,
            'error'
        );

        return {
            success: false,
            message: error.message
        };
    }
}

console.log('Background Service Worker已加载');

