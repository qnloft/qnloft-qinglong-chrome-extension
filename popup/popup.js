// Popup 页面逻辑

import { MESSAGE_TYPES } from '../lib/constants.js';

// 状态管理
let sites = [];
let logs = [];
let stats = {};
let config = {}; // 添加配置状态
let isLoading = false;

// DOM 元素
const elements = {
    // 按钮
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    syncAllBtn: document.getElementById('syncAllBtn'),
    addSiteBtn: document.getElementById('addSiteBtn'),
    
    // 状态显示
    statusIndicator: document.getElementById('statusIndicator'),
    lastSyncTime: document.getElementById('lastSyncTime'),
    successCount: document.getElementById('successCount'),
    
    // 网站列表
    sitesCount: document.getElementById('sitesCount'),
    emptyState: document.getElementById('emptyState'),
    sitesList: document.getElementById('sitesList'),
    
    // 统计
    todayCount: document.getElementById('todayCount'),
    successRate: document.getElementById('successRate'),
    
    // 其他
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage')
};

/**
 * 初始化
 */
async function init() {
    console.log('Popup 初始化...');
    
    // 绑定事件
    bindEvents();
    
    // 加载数据
    await loadData();
    
    console.log('Popup 初始化完成');
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 刷新按钮
    elements.refreshBtn.addEventListener('click', async () => {
        await loadData();
        showToast('已刷新');
    });
    
    // 设置按钮
    elements.settingsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'options/options.html' });
    });
    
    // 立即同步所有按钮
    elements.syncAllBtn.addEventListener('click', async () => {
        await syncAll();
    });
    
    // 添加网站按钮
    elements.addSiteBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'options/options.html#sites' });
    });
}

/**
 * 加载所有数据
 */
async function loadData() {
    try {
        showLoading(true);
        
        // 从 storage 加载网站配置和全局配置
        const result = await chrome.storage.local.get(['sites', 'config']);
        sites = result.sites || [];
        config = result.config || {};
        
        // 获取日志和统计
        const response = await sendMessage({
            action: MESSAGE_TYPES.GET_LOGS,
            options: { limit: 100 }
        });
        
        if (response.success) {
            logs = response.logs || [];
            stats = response.stats || {};
        }
        
        // 更新UI
        updateUI();
        
    } catch (error) {
        console.error('加载数据失败:', error);
        showToast('加载数据失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 更新整个UI
 */
function updateUI() {
    updateStatusCard();
    updateSitesList();
    updateFooterStats();
}

/**
 * 更新状态卡片
 */
function updateStatusCard() {
    // 计算启用的网站中成功的数量
    const enabledSites = sites.filter(site => site.enabled);
    const successSites = enabledSites.filter(site => 
        site.lastStatus === 'success'
    ).length;
    
    elements.successCount.textContent = `${successSites}/${enabledSites.length}`;
    
    // 最后同步时间
    if (stats.lastSync) {
        const date = new Date(stats.lastSync);
        elements.lastSyncTime.textContent = formatRelativeTime(stats.lastSync);
    } else {
        elements.lastSyncTime.textContent = '-';
    }
    
    // 状态指示器
    updateStatusIndicator();
}

/**
 * 更新状态指示器
 */
function updateStatusIndicator() {
    const indicator = elements.statusIndicator;
    
    // 移除所有状态类
    indicator.classList.remove('success', 'error', 'pending', 'syncing');
    
    // 检查全局同步是否被禁用
    if (config.autoSync === false) {
        indicator.classList.add('pending');
        indicator.querySelector('.status-text').textContent = '自动同步已禁用';
        return;
    }
    
    // 检查是否有启用的网站
    const enabledSites = sites.filter(site => site.enabled);
    if (enabledSites.length === 0) {
        indicator.classList.add('pending');
        indicator.querySelector('.status-text').textContent = '无启用网站';
        return;
    }
    
    // 检查是否有失败的网站
    const hasError = enabledSites.some(site => site.lastStatus === 'failed');
    const hasSuccess = enabledSites.some(site => site.lastStatus === 'success');
    
    if (isLoading) {
        indicator.classList.add('syncing');
        indicator.querySelector('.status-text').textContent = '同步中';
    } else if (hasError) {
        indicator.classList.add('error');
        indicator.querySelector('.status-text').textContent = '同步失败';
    } else if (hasSuccess) {
        indicator.classList.add('success');
        indicator.querySelector('.status-text').textContent = '同步成功';
    } else {
        indicator.classList.add('pending');
        indicator.querySelector('.status-text').textContent = '待同步';
    }
}

/**
 * 更新网站列表
 */
function updateSitesList() {
    // 更新计数
    elements.sitesCount.textContent = sites.length;
    
    // 显示/隐藏空状态
    if (sites.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.sitesList.classList.add('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.sitesList.classList.remove('hidden');
    
    // 生成网站列表
    elements.sitesList.innerHTML = sites.map(site => createSiteItem(site)).join('');
    
    // 绑定网站项事件
    bindSiteEvents();
}

/**
 * 创建网站列表项
 */
function createSiteItem(site) {
    const statusText = getStatusText(site);
    const isDisabled = !site.enabled ? 'disabled' : '';
    
    return `
        <div class="site-item ${isDisabled}" data-site-id="${site.id}">
            <div class="site-info">
                <div class="site-name">${escapeHtml(site.name)}</div>
                <div class="site-status">${statusText}</div>
            </div>
            <div class="site-actions">
                <button class="sync-btn" data-action="sync" ${!site.enabled ? 'disabled' : ''}>
                    同步
                </button>
            </div>
        </div>
    `;
}

/**
 * 获取网站状态文本
 */
function getStatusText(site) {
    if (!site.enabled) {
        return '已禁用';
    }
    
    if (!site.lastSync) {
        return '未同步';
    }
    
    const timeText = formatRelativeTime(site.lastSync);
    
    if (site.lastStatus === 'success') {
        return `✓ ${timeText}`;
    } else if (site.lastStatus === 'failed') {
        return `✗ ${timeText}`;
    }
    
    return timeText;
}

/**
 * 绑定网站项事件
 */
function bindSiteEvents() {
    // 同步按钮
    document.querySelectorAll('[data-action="sync"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const siteItem = e.target.closest('.site-item');
            const siteId = siteItem.dataset.siteId;
            await syncSite(siteId);
        });
    });
    
    // 点击网站项跳转到设置
    document.querySelectorAll('.site-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('sync-btn')) {
                chrome.tabs.create({ url: 'options/options.html#sites' });
            }
        });
    });
}

/**
 * 更新底部统计
 */
function updateFooterStats() {
    // 今日同步次数
    elements.todayCount.textContent = stats.today || 0;
    
    // 成功率
    if (stats.total > 0) {
        const rate = ((stats.success / stats.total) * 100).toFixed(0);
        elements.successRate.textContent = `${rate}%`;
    } else {
        elements.successRate.textContent = '-';
    }
}

/**
 * 同步所有网站
 */
async function syncAll() {
    if (sites.length === 0) {
        showToast('没有可同步的网站');
        return;
    }
    
    try {
        showLoading(true);
        updateStatusIndicator(); // 更新为同步中状态
        
        const response = await sendMessage({
            action: MESSAGE_TYPES.SYNC_NOW
        });
        
        if (response.success) {
            showToast(response.message || '同步完成');
            await loadData(); // 重新加载数据
        } else {
            showToast(response.error || '同步失败');
        }
        
    } catch (error) {
        console.error('同步失败:', error);
        showToast('同步失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 同步单个网站
 */
async function syncSite(siteId) {
    try {
        showLoading(true);
        
        const response = await sendMessage({
            action: MESSAGE_TYPES.SYNC_SITE,
            siteId
        });
        
        if (response.success) {
            showToast(response.message || '同步成功');
            await loadData();
        } else {
            showToast(response.error || '同步失败');
        }
        
    } catch (error) {
        console.error('同步失败:', error);
        showToast('同步失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 发送消息到 background
 */
function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response || {});
            }
        });
    });
}

/**
 * 显示/隐藏加载状态
 */
function showLoading(show) {
    isLoading = show;
    
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
        elements.syncAllBtn.disabled = true;
    } else {
        elements.loadingOverlay.classList.add('hidden');
        elements.syncAllBtn.disabled = false;
    }
}

/**
 * 显示 Toast 提示
 */
function showToast(message, duration = 2000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
        return '刚刚';
    } else if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN');
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 监听存储变化
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        // 网站配置或全局配置变化时重新加载
        if (changes.sites || changes.config) {
            loadData();
        }
    }
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);

