// Options 页面逻辑

import { storageManager } from '../lib/storage-manager.js';
import { cryptoUtils } from '../lib/crypto-utils.js';
import { MESSAGE_TYPES } from '../lib/constants.js';

// 当前标签页
let currentTab = 'qinglong';

// 环境变量数据
let envs = [];
let filteredEnvs = [];

// 网站配置数据
let sites = [];

// 日志数据
let logs = [];
let stats = {};

// DOM元素（会在DOMContentLoaded时初始化）
let elements = {};

/**
 * 初始化
 */
async function init() {
    console.log('Options 页面初始化...');
    
    // 初始化DOM元素
    initElements();
    
    // 绑定事件
    bindEvents();
    
    // 处理URL hash
    handleHash();
    
    // 加载数据
    await loadAllData();
    
    console.log('Options 页面初始化完成');
}

/**
 * 初始化DOM元素
 */
function initElements() {
    elements = {
        // 导航
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.section'),
        
        // 青龙面板配置
        qinglongForm: document.getElementById('qinglongForm'),
        qlUrl: document.getElementById('qlUrl'),
        clientId: document.getElementById('clientId'),
        clientSecret: document.getElementById('clientSecret'),
        openQlPanelBtn: document.getElementById('openQlPanelBtn'),
        testConnectionBtn: document.getElementById('testConnectionBtn'),
        connectionResult: document.getElementById('connectionResult'),
        
        // 网站配置
        addSiteBtn: document.getElementById('addSiteBtn'),
        sitesContainer: document.getElementById('sitesContainer'),
        
        // 环境变量
        envSearch: document.getElementById('envSearch'),
        envFilter: document.getElementById('envFilter'),
        envSort: document.getElementById('envSort'),
        refreshEnvsBtn: document.getElementById('refreshEnvsBtn'),
        addEnvBtn: document.getElementById('addEnvBtn'),
        envsTableContainer: document.getElementById('envsTableContainer'),
        batchActions: document.getElementById('batchActions'),
        selectedCount: document.getElementById('selectedCount'),
        batchEnableBtn: document.getElementById('batchEnableBtn'),
        batchDisableBtn: document.getElementById('batchDisableBtn'),
        batchDeleteBtn: document.getElementById('batchDeleteBtn'),
        
        // 同步设置
        syncForm: document.getElementById('syncForm'),
        autoSync: document.getElementById('autoSync'),
        syncInterval: document.getElementById('syncInterval'),
        
        // 日志
        clearLogsBtn: document.getElementById('clearLogsBtn'),
        totalLogs: document.getElementById('totalLogs'),
        successLogs: document.getElementById('successLogs'),
        failedLogs: document.getElementById('failedLogs'),
        todayLogs: document.getElementById('todayLogs'),
        logsContainer: document.getElementById('logsContainer'),
        
        // 安全设置
        exportConfigBtn: document.getElementById('exportConfigBtn'),
        importConfigBtn: document.getElementById('importConfigBtn'),
        importFileInput: document.getElementById('importFileInput'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        
        // 通用
        modalContainer: document.getElementById('modalContainer'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage'),
        loadingOverlay: document.getElementById('loadingOverlay')
    };
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 导航切换
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // 青龙面板配置
    elements.qinglongForm.addEventListener('submit', handleQinglongFormSubmit);
    elements.openQlPanelBtn.addEventListener('click', handleOpenQlPanel);
    elements.testConnectionBtn.addEventListener('click', handleTestConnection);
    
    // 网站配置
    elements.addSiteBtn.addEventListener('click', () => showSiteModal());
    
    // 环境变量
    elements.envSearch.addEventListener('input', handleEnvSearch);
    elements.envFilter.addEventListener('change', handleEnvFilter);
    elements.envSort.addEventListener('change', handleEnvSort);
    elements.refreshEnvsBtn.addEventListener('click', () => loadEnvs(false));
    elements.addEnvBtn.addEventListener('click', () => showEnvModal());
    elements.batchEnableBtn.addEventListener('click', () => handleBatchEnvAction('enable'));
    elements.batchDisableBtn.addEventListener('click', () => handleBatchEnvAction('disable'));
    elements.batchDeleteBtn.addEventListener('click', () => handleBatchEnvAction('delete'));
    
    // 同步设置
    elements.syncForm.addEventListener('submit', handleSyncFormSubmit);
    
    // 日志
    elements.clearLogsBtn.addEventListener('click', handleClearLogs);
    
    // 安全设置
    elements.exportConfigBtn.addEventListener('click', handleExportConfig);
    elements.importConfigBtn.addEventListener('click', () => elements.importFileInput.click());
    elements.importFileInput.addEventListener('change', handleImportConfig);
    elements.clearAllBtn.addEventListener('click', handleClearAll);
    
    // 监听hash变化
    window.addEventListener('hashchange', handleHash);
}

/**
 * 处理URL hash
 */
function handleHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        switchTab(hash);
    }
}

/**
 * 切换标签页
 */
function switchTab(tab) {
    currentTab = tab;
    
    // 更新导航状态
    elements.navItems.forEach(item => {
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 显示对应section
    elements.sections.forEach(section => {
        if (section.id === `${tab}-section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    // 更新hash
    window.location.hash = tab;
    
    // 加载对应数据
    loadTabData(tab);
}

/**
 * 加载所有数据
 */
async function loadAllData() {
    await Promise.all([
        loadQinglongConfig(),
        loadSites(),
        loadSyncConfig(),
        loadLogs()
    ]);
}

/**
 * 加载标签页数据
 */
async function loadTabData(tab) {
    switch (tab) {
        case 'qinglong':
            await loadQinglongConfig();
            break;
        case 'sites':
            await loadSites();
            break;
        case 'envs':
            await loadEnvs();
            break;
        case 'sync':
            await loadSyncConfig();
            break;
        case 'logs':
            await loadLogs();
            break;
    }
}

// ========== 青龙面板配置 ==========

/**
 * 加载青龙面板配置
 */
async function loadQinglongConfig() {
    const config = await storageManager.getConfig();
    
    elements.qlUrl.value = config.qlUrl || '';
    elements.clientId.value = config.clientId || '';
    
    // Client Secret处理
    // 注意：storageManager.getConfig() 已经尝试解密了，如果成功则已经是明文
    // 如果解密失败或不是加密格式，会保持原值（可能是旧的明文）
    if (config.clientSecret) {
        // 直接使用配置中的值（可能是已解密的明文，也可能是旧的明文格式）
        elements.clientSecret.value = config.clientSecret;
        
        // 如果看起来像是加密格式但getConfig没有解密成功，可能是损坏的数据
        // 这里不再尝试解密，因为getConfig已经处理过了
        // 如果确实是损坏的加密数据，用户需要重新输入
    }
}

/**
 * 处理青龙面板表单提交
 */
async function handleQinglongFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const qlUrl = elements.qlUrl.value.trim();
        const clientId = elements.clientId.value.trim();
        const clientSecret = elements.clientSecret.value.trim();
        
        // 加密Client Secret
        const encryptedSecret = await cryptoUtils.encrypt(clientSecret);
        
        // 保存配置
        await storageManager.updateConfig({
            qlUrl,
            clientId,
            clientSecret: encryptedSecret
        });
        
        showToast('配置已保存');
        hideAlert();
        
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 访问青龙面板
 */
function handleOpenQlPanel() {
    const qlUrl = elements.qlUrl.value.trim();
    
    if (!qlUrl) {
        showToast('请先配置青龙面板URL');
        return;
    }
    
    // 在新标签页中打开青龙面板
    chrome.tabs.create({ url: qlUrl });
}

/**
 * 测试连接
 */
async function handleTestConnection() {
    // 从输入框读取值（可能用户修改了但还没保存）
    const qlUrl = elements.qlUrl.value.trim();
    const clientId = elements.clientId.value.trim();
    const clientSecret = elements.clientSecret.value.trim();
    
    if (!qlUrl || !clientId || !clientSecret) {
        showAlert('请先填写所有必填项', 'error');
        return;
    }
    
    try {
        showLoading(true);
        hideAlert();
        
        // 使用输入框的值进行测试，不保存到storage
        const messageData = {
            action: MESSAGE_TYPES.TEST_CONNECTION,
            config: {
                qlUrl: qlUrl,
                clientId: clientId,
                clientSecret: clientSecret
            }
        };
        const response = await sendMessage(messageData);
        
        if (response.success) {
            showAlert('✓ 连接成功！', 'success');
        } else {
            showAlert(`✗ 连接失败: ${response.message}`, 'error');
        }
        
    } catch (error) {
        console.error('测试连接失败:', error);
        showAlert('✗ 测试连接失败', 'error');
    } finally {
        showLoading(false);
    }
}

// ========== 网站配置管理 ==========

/**
 * 加载网站列表
 */
async function loadSites() {
    sites = await storageManager.getSites();
    renderSites();
}

/**
 * 渲染网站列表
 */
function renderSites() {
    if (sites.length === 0) {
        elements.sitesContainer.innerHTML = `
            <div class="empty-state">
                <p>还没有配置网站，点击上方"添加网站"按钮开始配置</p>
            </div>
        `;
        return;
    }
    
    elements.sitesContainer.innerHTML = sites.map(site => `
        <div class="site-card ${!site.enabled ? 'disabled' : ''}" data-site-id="${site.id}">
            <!-- 卡片头部 -->
            <div class="site-card-header">
                <div class="site-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                </div>
                <h3 class="site-card-title">${escapeHtml(site.name)}</h3>
                <div class="site-card-status">
                    ${site.enabled ? '<span class="status-dot active"></span>' : '<span class="status-dot inactive"></span>'}
                </div>
            </div>
            
            <!-- 卡片内容区 -->
            <div class="site-card-body">
                <div class="card-info-item">
                    <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <a href="${site.url}" target="_blank" class="info-link" title="${escapeHtml(site.url)}">${escapeHtml(site.url)}</a>
                </div>
                
                <div class="card-info-item">
                    <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                        <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                    </svg>
                    <span class="info-text">${escapeHtml(site.envName)}</span>
                </div>
                
                <div class="card-meta">
                    ${site.autoSync ? '<span class="meta-tag auto-sync">自动同步</span>' : ''}
                    ${site.lastSync ? `<span class="meta-time">${formatTime(site.lastSync)}</span>` : '<span class="meta-time">未同步</span>'}
                </div>
                
                <div class="card-info-item cookie-status-field" style="display: none;">
                    <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    <span class="cookie-status-value"></span>
                </div>
            </div>
            
            <!-- 卡片底部：操作按钮 -->
            <div class="site-card-footer">
                <!-- Cookie操作组 -->
                <div class="action-group cookie-actions">
                    <button class="btn btn-sm btn-success btn-check-cookie" data-site-id="${site.id}" title="检测Cookie是否有效">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        检测
                    </button>
                    <button class="btn btn-sm btn-primary btn-sync-cookie" data-site-id="${site.id}" title="同步Cookie到青龙面板">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        同步
                    </button>
                    <button class="btn btn-sm btn-info btn-view-cookie" data-site-id="${site.id}" title="查看Cookie详情">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        查看
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-cookie" data-site-id="${site.id}" title="删除青龙面板中的Cookie">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        删除Cookie
                    </button>
                </div>
                
                <!-- 管理操作组 -->
                <div class="action-group manage-actions">
                    <button class="btn btn-sm btn-secondary btn-edit-site" data-site-id="${site.id}" title="编辑网站配置">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        编辑
                    </button>
                    <button class="btn btn-sm btn-warning btn-delete-site" data-site-id="${site.id}" title="删除网站配置">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        删除
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // 绑定检测Cookie按钮
    document.querySelectorAll('.btn-check-cookie').forEach(btn => {
        btn.addEventListener('click', async function() {
            const siteId = this.getAttribute('data-site-id');
            const card = document.querySelector(`.site-card[data-site-id="${siteId}"]`);
            const statusField = card.querySelector('.cookie-status-field');
            const statusValue = card.querySelector('.cookie-status-value');
            
            // 显示检测中状态
            this.disabled = true;
            this.textContent = '检测中...';
            
            try {
                const response = await sendMessage({
                    action: MESSAGE_TYPES.CHECK_COOKIE,
                    siteId: siteId
                });
                
                // 显示Cookie状态区域
                statusField.style.display = 'flex';
                
                if (response.success && response.hasCookies) {
                    // 有Cookie
                    const statusHTML = `
                        <span class="badge success">✓ 有效</span>
                        <span style="margin-left: 8px; font-size: 12px;">
                            ${response.validCount}个有效${response.expiredCount > 0 ? `, ${response.expiredCount}个已过期` : ''}
                        </span>
                    `;
                    statusValue.innerHTML = statusHTML;
                    showToast(response.message);
                } else {
                    // 无Cookie
                    statusValue.innerHTML = '<span class="badge badge-warning">⚠ 未找到</span>';
                    showToast(response.message || '未找到Cookie', 3000);
                }
                
            } catch (error) {
                console.error('检测Cookie失败:', error);
                statusField.style.display = 'flex';
                statusValue.innerHTML = '<span class="badge badge-error">✗ 检测失败</span>';
                showToast('检测Cookie失败');
            } finally {
                this.disabled = false;
                this.textContent = '检测Cookie';
            }
        });
    });
    
    // 绑定编辑按钮
    document.querySelectorAll('.btn-edit-site').forEach(btn => {
        btn.addEventListener('click', function() {
            const siteId = this.getAttribute('data-site-id');
            showSiteModal(siteId);
        });
    });
    
    // 绑定删除按钮
    document.querySelectorAll('.btn-delete-site').forEach(btn => {
        btn.addEventListener('click', async function() {
            const siteId = this.getAttribute('data-site-id');
            if (!confirm('确定要删除这个网站配置吗？')) {
                return;
            }
            
            try {
                showLoading(true);
                await storageManager.deleteSite(siteId);
                await loadSites();
                showToast('网站已删除');
            } catch (error) {
                console.error('删除网站失败:', error);
                showToast('删除失败');
            } finally {
                showLoading(false);
            }
        });
    });
    
    // 绑定删除Cookie按钮
    document.querySelectorAll('.btn-delete-cookie').forEach(btn => {
        btn.addEventListener('click', async function() {
            const siteId = this.getAttribute('data-site-id');
            const site = sites.find(s => s.id === siteId);
            
            if (!site) {
                showToast('网站配置不存在');
                return;
            }
            
            // 显示确认对话框
            const confirmed = confirm(`确定要删除 "${site.name}" 的所有Cookie吗？\n\n此操作将删除该网站的所有Cookie，但不会影响青龙面板中的环境变量。\n\n此操作不可恢复！`);
            
            if (!confirmed) {
                return;
            }
            
            try {
                // 禁用按钮并显示加载状态
                this.disabled = true;
                this.textContent = '删除中...';
                
                const response = await sendMessage({
                    action: MESSAGE_TYPES.DELETE_COOKIES,
                    siteId: siteId
                });
                
                if (response.success) {
                    showToast(response.message);
                } else {
                    showToast(response.message || '删除失败');
                }
                
            } catch (error) {
                console.error('删除Cookie失败:', error);
                showToast('删除失败');
            } finally {
                // 恢复按钮状态
                this.disabled = false;
                this.textContent = '删除Cookie';
            }
        });
    });
    
    // 绑定查看Cookie按钮
    document.querySelectorAll('.btn-view-cookie').forEach(btn => {
        btn.addEventListener('click', async function() {
            const siteId = this.getAttribute('data-site-id');
            await showCookieModal(siteId);
        });
    });
    
    // 绑定同步Cookie按钮
    document.querySelectorAll('.btn-sync-cookie').forEach(btn => {
        btn.addEventListener('click', async function() {
            const siteId = this.getAttribute('data-site-id');
            const site = sites.find(s => s.id === siteId);
            
            if (!site) {
                showToast('网站配置不存在');
                return;
            }
            
            if (!site.enabled) {
                showToast('网站配置已禁用，请先启用');
                return;
            }
            
            try {
                // 禁用按钮并显示加载状态
                this.disabled = true;
                this.textContent = '同步中...';
                
                const response = await sendMessage({
                    action: MESSAGE_TYPES.SYNC_SITE,
                    siteId: siteId
                });
                
                if (response.success) {
                    showToast(response.message || 'Cookie同步成功');
                } else {
                    showToast(response.message || '同步失败');
                }
                
            } catch (error) {
                console.error('同步Cookie失败:', error);
                showToast('同步失败');
            } finally {
                // 恢复按钮状态
                this.disabled = false;
                this.textContent = '同步Cookie';
            }
        });
    });
    
}

/**
 * 显示网站模态框
 */
function showSiteModal(siteId = null) {
    const site = siteId ? sites.find(s => s.id === siteId) : null;
    const isEdit = !!site;
    
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? '编辑网站' : '添加网站'}</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <form id="siteForm" class="form">
                        <div class="form-group">
                            <label class="form-label">网站名称 *</label>
                            <input type="text" id="siteName" class="form-input" 
                                   value="${site ? escapeHtml(site.name) : ''}" 
                                   placeholder="例如: 京东" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">目标URL *</label>
                            <input type="url" id="siteUrl" class="form-input" 
                                   value="${site ? escapeHtml(site.url) : ''}" 
                                   placeholder="https://example.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">环境变量名称 *</label>
                            <input type="text" id="siteEnvName" class="form-input" 
                                   value="${site ? escapeHtml(site.envName) : ''}" 
                                   placeholder="例如: JD_COOKIE" required>
                        </div>
                        <div class="form-group">
                            <div class="switch-group">
                                <label class="switch">
                                    <input type="checkbox" id="siteEnabled" ${site ? (site.enabled ? 'checked' : '') : 'checked'}>
                                    <span class="slider"></span>
                                </label>
                                <div class="switch-label">
                                    <span class="switch-title">启用此网站</span>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="switch-group">
                                <label class="switch">
                                    <input type="checkbox" id="siteAutoSync" ${site ? (site.autoSync ? 'checked' : '') : 'checked'}>
                                    <span class="slider"></span>
                                </label>
                                <div class="switch-label">
                                    <span class="switch-title">自动同步</span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-modal-cancel">取消</button>
                    <button class="btn btn-primary btn-modal-save-site" data-site-id="${siteId || ''}">保存</button>
                </div>
            </div>
        </div>
    `;
    
    elements.modalContainer.innerHTML = modalHTML;
    
    // 绑定模态框事件
    bindModalEvents(async (saveBtn) => {
        const siteId = saveBtn.getAttribute('data-site-id');
        await saveSiteHandler(siteId);
    }, '.btn-modal-save-site');
}

/**
 * 保存网站的处理函数
 */
async function saveSiteHandler(siteId) {
    const name = document.getElementById('siteName').value.trim();
    const url = document.getElementById('siteUrl').value.trim();
    const envName = document.getElementById('siteEnvName').value.trim();
    const enabled = document.getElementById('siteEnabled').checked;
    const autoSync = document.getElementById('siteAutoSync').checked;
    
    if (!name || !url || !envName) {
        showToast('请填写所有必填项');
        return;
    }
    
    try {
        showLoading(true);
        
        if (siteId) {
            await storageManager.updateSite(siteId, { name, url, envName, enabled, autoSync });
        } else {
            await storageManager.addSite({ name, url, envName, enabled, autoSync });
        }
        
        await loadSites();
        closeModal();
        showToast(siteId ? '网站已更新' : '网站已添加');
        
    } catch (error) {
        console.error('保存网站失败:', error);
        showToast('保存失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 显示Cookie查看模态框
 */
async function showCookieModal(siteId) {
    const site = sites.find(s => s.id === siteId);
    if (!site) {
        showToast('网站配置不存在');
        return;
    }
    
    // 显示加载模态框
    const loadingModalHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Cookie列表 - ${escapeHtml(site.name)}</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="empty-state">
                        <p>加载中...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    elements.modalContainer.innerHTML = loadingModalHTML;
    
    // 绑定关闭按钮
    setTimeout(() => {
        bindModalEvents(null, null);
    }, 0);
    
    try {
        // 获取Cookie
        const cookies = await chrome.cookies.getAll({ url: site.url });
        
        if (cookies.length === 0) {
            const emptyModalHTML = `
                <div class="modal-overlay">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Cookie列表 - ${escapeHtml(site.name)}</h3>
                            <button class="modal-close">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="empty-state">
                                <p>未找到Cookie</p>
                                <p style="font-size: 12px; color: #888;">请先登录该网站</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary btn-modal-cancel">关闭</button>
                        </div>
                    </div>
                </div>
            `;
            elements.modalContainer.innerHTML = emptyModalHTML;
            setTimeout(() => {
                bindModalEvents(null, null);
            }, 0);
            return;
        }
        
        // 检查Cookie是否过期
        const now = Date.now() / 1000;
        const cookiesWithStatus = cookies.map(cookie => ({
            ...cookie,
            isExpired: cookie.expirationDate && cookie.expirationDate < now,
            isSession: !cookie.expirationDate
        }));
        
        // 计算统计信息
        const totalCount = cookies.length;
        const expiredCount = cookiesWithStatus.filter(c => c.isExpired).length;
        const validCount = totalCount - expiredCount;
        const sessionCount = cookiesWithStatus.filter(c => c.isSession).length;
        
        // 生成Cookie列表HTML
        const cookieListHTML = `
            <div class="cookie-list">
                <!-- 统计摘要 -->
                <div class="cookie-summary">
                    <strong>📊 Cookie统计</strong>
                    <div class="stat-item">
                        <span>总数:</span>
                        <span style="color: #2E7D32; font-weight: 700;">${totalCount}</span>
                    </div>
                    <div class="stat-item">
                        <span>有效:</span>
                        <span style="color: #66BB6A; font-weight: 700;">${validCount}</span>
                    </div>
                    ${expiredCount > 0 ? `
                        <div class="stat-item" style="color: #EF5350;">
                            <span>⚠️ 已过期:</span>
                            <span style="font-weight: 700;">${expiredCount}</span>
                        </div>
                    ` : ''}
                    ${sessionCount > 0 ? `
                        <div class="stat-item" style="color: #42A5F5;">
                            <span>会话:</span>
                            <span style="font-weight: 700;">${sessionCount}</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- 选择控制区域 -->
                <div class="cookie-selection-controls">
                    <div class="selection-buttons">
                        <button class="btn btn-sm btn-secondary" id="selectAllCookies">全选</button>
                        <button class="btn btn-sm btn-secondary" id="deselectAllCookies">取消全选</button>
                    </div>
                    <div class="selection-count">
                        已选择 <span id="selectedCookieCount">0</span> 个Cookie
                    </div>
                </div>
                
                <table class="data-table cookie-table">
                    <thead>
                        <tr>
                            <th width="50"><input type="checkbox" id="selectAllCookiesCheckbox" title="全选/取消全选"></th>
                            <th width="160">🏷️ Cookie名称</th>
                            <th>🔐 Cookie值</th>
                            <th width="120">🌐 域名</th>
                            <th width="100">📂 路径</th>
                            <th width="130">⏰ 过期时间</th>
                            <th width="90">📊 状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cookiesWithStatus.map(cookie => `
                            <tr class="${cookie.isExpired ? 'cookie-expired' : ''}">
                                <td><input type="checkbox" class="cookie-checkbox" value="${escapeHtml(cookie.name)}"></td>
                                <td title="${escapeHtml(cookie.name)}">
                                    <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${escapeHtml(cookie.name)}
                                    </div>
                                </td>
                                <td>
                                    <div class="cookie-value-container">
                                        <span class="env-value masked" data-value="${escapeHtml(cookie.value)}">••••••</span>
                                        <button class="btn-icon btn-toggle-cookie-value" data-value="${escapeHtml(cookie.value)}" title="显示/隐藏值">👁️</button>
                                        <button class="btn-icon btn-copy-cookie-value" data-value="${escapeHtml(cookie.value)}" title="复制到剪贴板">📋</button>
                                    </div>
                                </td>
                                <td title="${escapeHtml(cookie.domain)}">
                                    <div style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${escapeHtml(cookie.domain)}
                                    </div>
                                </td>
                                <td title="${escapeHtml(cookie.path)}">${escapeHtml(cookie.path)}</td>
                                <td>
                                    ${cookie.isSession ? 
                                        '<span class="badge">会话</span>' : 
                                        `<span style="font-size: 11px;">${formatTime(cookie.expirationDate * 1000)}</span>`
                                    }
                                </td>
                                <td>
                                    ${cookie.isExpired ? 
                                        '<span class="badge badge-error">已过期</span>' : 
                                        '<span class="badge success">有效</span>'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal modal-large">
                    <div class="modal-header" style="background: linear-gradient(135deg, #66BB6A 0%, #43A047 100%); color: white; padding: 20px 24px;">
                        <h3 class="modal-title" style="color: white; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                            🍪 Cookie列表 - ${escapeHtml(site.name)}
                        </h3>
                        <button class="modal-close" style="color: white; font-size: 24px;">✕</button>
                    </div>
                    <div class="modal-body" style="max-height: 650px; overflow-y: auto; padding: 24px;">
                        ${cookieListHTML}
                    </div>
                    <div class="modal-footer" style="padding: 16px 24px; background: #f5f7fa; border-top: 2px solid #e8eef3;">
                        <button class="btn btn-primary" id="syncSelectedCookiesBtn" disabled style="font-weight: 600;">
                            <span style="font-size: 16px;">🔄</span>
                            同步选中Cookie
                        </button>
                        <button class="btn btn-secondary btn-modal-cancel" style="font-weight: 600;">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        elements.modalContainer.innerHTML = modalHTML;
        
        // 等待DOM更新
        setTimeout(() => {
            // 绑定模态框事件
            bindModalEvents(null, null);
            
            // 初始化Cookie选择状态管理
            initCookieSelection(siteId);
            
            // 绑定显示/隐藏Cookie值按钮
            document.querySelectorAll('.btn-toggle-cookie-value').forEach(btn => {
                btn.addEventListener('click', function() {
                    const value = this.getAttribute('data-value');
                    const valueSpan = this.previousElementSibling;
                    if (valueSpan.classList.contains('masked')) {
                        valueSpan.textContent = value;
                        valueSpan.classList.remove('masked');
                        this.textContent = '🙈';
                    } else {
                        valueSpan.textContent = '••••••';
                        valueSpan.classList.add('masked');
                        this.textContent = '👁️';
                    }
                });
            });
            
            // 绑定复制Cookie值按钮
            document.querySelectorAll('.btn-copy-cookie-value').forEach(btn => {
                btn.addEventListener('click', function() {
                    const value = this.getAttribute('data-value');
                    navigator.clipboard.writeText(value).then(() => {
                        showToast('已复制到剪贴板');
                    }).catch(() => {
                        showToast('复制失败');
                    });
                });
            });
        }, 0);
        
    } catch (error) {
        console.error('获取Cookie失败:', error);
        showToast('获取Cookie失败');
        closeModal();
    }
}

// 注意：saveSite, editSite, deleteSite 已经通过事件监听器处理，不再需要全局函数

// ========== 环境变量管理 ==========

/**
 * 加载环境变量
 */
async function loadEnvs(useCache = true) {
    try {
        showLoading(true);
        
        const response = await sendMessage({
            action: MESSAGE_TYPES.GET_ENVS,
            useCache
        });
        
        if (response.success) {
            envs = response.data || [];
            
            // 标记关联的环境变量
            const siteEnvNames = sites.map(s => s.envName);
            envs.forEach(env => {
                env.isLinked = siteEnvNames.includes(env.name);
            });
            
            filteredEnvs = [...envs];
            renderEnvs();
        } else {
            showToast('加载环境变量失败');
        }
        
    } catch (error) {
        console.error('加载环境变量失败:', error);
        showToast('加载环境变量失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 渲染环境变量表格
 */
function renderEnvs() {
    if (filteredEnvs.length === 0) {
        elements.envsTableContainer.innerHTML = `
            <div class="empty-state">
                <p>没有找到环境变量</p>
            </div>
        `;
        return;
    }
    
    elements.envsTableContainer.innerHTML = `
        <div class="env-select-all">
            <label class="select-all-label">
                <input type="checkbox" id="selectAll">
                <span>全选</span>
            </label>
            <span class="env-total-count">共 ${filteredEnvs.length} 个环境变量</span>
        </div>
        <div class="env-cards-container">
            ${filteredEnvs.map(env => `
                <div class="env-card ${env.status !== 0 ? 'disabled' : ''}">
                    <!-- 卡片头部 -->
                    <div class="env-card-header">
                        <input type="checkbox" class="env-checkbox" value="${env.id}">
                        <div class="env-card-title">
                            <svg class="env-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                                <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                            </svg>
                            <h4>${escapeHtml(env.name)}</h4>
                        </div>
                        <div class="env-badges">
                            ${env.isLinked ? '<span class="badge badge-primary">已关联</span>' : ''}
                            ${env.status === 0 ? '<span class="badge badge-success">已启用</span>' : '<span class="badge badge-secondary">已禁用</span>'}
                        </div>
                    </div>
                    
                    <!-- 卡片内容 -->
                    <div class="env-card-body">
                        <div class="env-value-section">
                            <label>环境变量值</label>
                            <div class="env-value-wrapper">
                                <span class="env-value masked" data-value="${escapeHtml(env.value)}">••••••••••••••••••</span>
                                <button class="btn-icon-small btn-toggle-value" data-value="${escapeHtml(env.value)}" title="显示/隐藏">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </button>
                                <button class="btn-icon-small btn-copy-value" data-value="${escapeHtml(env.value)}" title="复制">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        ${env.remarks ? `
                            <div class="env-remarks">
                                <svg class="remark-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                <span>${escapeHtml(env.remarks)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="env-meta">
                            <span class="meta-time">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 6v6l4 2"/>
                                </svg>
                                ${formatTime(env.updatedAt)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- 卡片操作按钮 -->
                    <div class="env-card-footer">
                        <button class="btn btn-sm btn-secondary btn-edit-env" data-id="${env.id}">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            编辑
                        </button>
                        ${env.status === 0 
                            ? `<button class="btn btn-sm btn-warning btn-disable-env" data-id="${env.id}">
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                                禁用
                            </button>` 
                            : `<button class="btn btn-sm btn-success btn-enable-env" data-id="${env.id}">
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                启用
                            </button>`
                        }
                        <button class="btn btn-sm btn-danger btn-delete-env" data-id="${env.id}">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            删除
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // 绑定全选
    document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);
    
    // 绑定复选框变化
    document.querySelectorAll('.env-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBatchActions);
    });
    
    // 绑定环境变量操作按钮
    document.querySelectorAll('.btn-toggle-value').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const wrapper = this.closest('.env-value-wrapper');
            const valueSpan = wrapper.querySelector('.env-value');
            if (valueSpan.classList.contains('masked')) {
                valueSpan.textContent = value;
                valueSpan.classList.remove('masked');
            } else {
                valueSpan.textContent = '••••••••••••••••••';
                valueSpan.classList.add('masked');
            }
        });
    });
    
    document.querySelectorAll('.btn-copy-value').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            navigator.clipboard.writeText(value).then(() => {
                showToast('已复制到剪贴板');
            }).catch(() => {
                showToast('复制失败');
            });
        });
    });
    
    document.querySelectorAll('.btn-enable-env').forEach(btn => {
        btn.addEventListener('click', async function() {
            const envId = parseInt(this.getAttribute('data-id'));
            
            try {
                this.disabled = true;
                this.textContent = '启用中...';
                
                const response = await sendMessage({
                    action: MESSAGE_TYPES.ENABLE_ENV,
                    ids: [envId]
                });
                
                if (response.success) {
                    await loadEnvs(false);
                    showToast('已启用');
                } else {
                    showToast(response.error || '启用失败');
                }
                
            } catch (error) {
                console.error('启用环境变量失败:', error);
                showToast('启用失败');
            } finally {
                this.disabled = false;
                this.textContent = '启用';
            }
        });
    });
    
    document.querySelectorAll('.btn-disable-env').forEach(btn => {
        btn.addEventListener('click', async function() {
            const envId = parseInt(this.getAttribute('data-id'));
            
            try {
                this.disabled = true;
                this.textContent = '禁用中...';
                
                const response = await sendMessage({
                    action: MESSAGE_TYPES.DISABLE_ENV,
                    ids: [envId]
                });
                
                if (response.success) {
                    await loadEnvs(false);
                    showToast('已禁用');
                } else {
                    showToast(response.error || '禁用失败');
                }
                
            } catch (error) {
                console.error('禁用环境变量失败:', error);
                showToast('禁用失败');
            } finally {
                this.disabled = false;
                this.textContent = '禁用';
            }
        });
    });
    
    document.querySelectorAll('.btn-edit-env').forEach(btn => {
        btn.addEventListener('click', function() {
            const envId = parseInt(this.getAttribute('data-id'));
            showEnvModal(envId);
        });
    });
    
    document.querySelectorAll('.btn-delete-env').forEach(btn => {
        btn.addEventListener('click', async function() {
            const envId = parseInt(this.getAttribute('data-id'));
            if (!confirm('确定要删除这个环境变量吗？')) {
                return;
            }
            
            try {
                showLoading(true);
                
                const response = await sendMessage({
                    action: MESSAGE_TYPES.DELETE_ENV,
                    ids: [envId]
                });
                
                if (response.success) {
                    await loadEnvs(false);
                    showToast(response.message);
                } else {
                    showToast(response.error || '删除失败');
                }
                
            } catch (error) {
                console.error('删除环境变量失败:', error);
                showToast('删除失败');
            } finally {
                showLoading(false);
            }
        });
    });
}

/**
 * 搜索环境变量
 */
function handleEnvSearch() {
    const keyword = elements.envSearch.value.toLowerCase();
    applyEnvFilters();
}

/**
 * 过滤环境变量
 */
function handleEnvFilter() {
    applyEnvFilters();
}

/**
 * 排序环境变量
 */
function handleEnvSort() {
    applyEnvFilters();
}

/**
 * 应用所有过滤条件
 */
function applyEnvFilters() {
    const keyword = elements.envSearch.value.toLowerCase();
    const filter = elements.envFilter.value;
    const sort = elements.envSort.value;
    
    // 过滤
    filteredEnvs = envs.filter(env => {
        // 搜索
        if (keyword && !env.name.toLowerCase().includes(keyword) && 
            !(env.remarks && env.remarks.toLowerCase().includes(keyword))) {
            return false;
        }
        
        // 状态过滤
        if (filter === 'enabled' && env.status !== 0) return false;
        if (filter === 'disabled' && env.status === 0) return false;
        
        return true;
    });
    
    // 排序
    filteredEnvs.sort((a, b) => {
        switch (sort) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'created':
                return (b.createdAt || 0) - (a.createdAt || 0);
            case 'updated':
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            default:
                return 0;
        }
    });
    
    renderEnvs();
}

/**
 * 显示环境变量模态框
 */
function showEnvModal(envId = null) {
    const env = envId ? envs.find(e => e.id === envId) : null;
    const isEdit = !!env;
    
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? '编辑环境变量' : '添加环境变量'}</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <form id="envForm" class="form">
                        <div class="form-group">
                            <label class="form-label">名称 *</label>
                            <input type="text" id="envName" class="form-input" 
                                   value="${env ? escapeHtml(env.name) : ''}" 
                                   placeholder="环境变量名称" ${isEdit ? 'readonly' : ''} required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">值 *</label>
                            <textarea id="envValue" class="form-input" rows="4" 
                                      placeholder="环境变量值" required>${env ? escapeHtml(env.value) : ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">备注</label>
                            <input type="text" id="envRemarks" class="form-input" 
                                   value="${env ? escapeHtml(env.remarks || '') : ''}" 
                                   placeholder="备注信息">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-modal-cancel">取消</button>
                    <button class="btn btn-primary btn-modal-save-env" data-env-id="${envId || ''}">保存</button>
                </div>
            </div>
        </div>
    `;
    
    elements.modalContainer.innerHTML = modalHTML;
    
    // 绑定模态框事件
    bindModalEvents(async (saveBtn) => {
        const envId = saveBtn.getAttribute('data-env-id');
        await saveEnvHandler(envId || null);
    }, '.btn-modal-save-env');
}

/**
 * 保存环境变量的处理函数
 */
async function saveEnvHandler(envId) {
    const name = document.getElementById('envName').value.trim();
    const value = document.getElementById('envValue').value.trim();
    const remarks = document.getElementById('envRemarks').value.trim();
    
    if (!name || !value) {
        showToast('请填写所有必填项');
        return;
    }
    
    try {
        showLoading(true);
        
        let response;
        if (envId) {
            response = await sendMessage({
                action: MESSAGE_TYPES.UPDATE_ENV,
                data: { id: parseInt(envId), name, value, remarks }
            });
        } else {
            response = await sendMessage({
                action: MESSAGE_TYPES.ADD_ENV,
                data: { name, value, remarks }
            });
        }
        
        if (response.success) {
            await loadEnvs(false);
            closeModal();
            showToast(response.message);
        } else {
            showToast(response.error || '保存失败');
        }
        
    } catch (error) {
        console.error('保存环境变量失败:', error);
        showToast('保存失败');
    } finally {
        showLoading(false);
    }
}

// 注意：saveEnv 已移动到 saveEnvHandler 函数

// 注意：editEnv, deleteEnv, toggleEnvValue, copyEnvValue 现在通过事件监听器处理，不再需要全局函数

/**
 * 全选/取消全选
 */
function handleSelectAll(e) {
    const checked = e.target.checked;
    document.querySelectorAll('.env-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateBatchActions();
}

/**
 * 更新批量操作按钮状态
 */
function updateBatchActions() {
    const selectedIds = getSelectedEnvIds();
    elements.selectedCount.textContent = selectedIds.length;
    
    if (selectedIds.length > 0) {
        elements.batchActions.classList.remove('hidden');
    } else {
        elements.batchActions.classList.add('hidden');
    }
}

/**
 * 获取选中的环境变量ID
 */
function getSelectedEnvIds() {
    return Array.from(document.querySelectorAll('.env-checkbox:checked'))
        .map(cb => parseInt(cb.value));
}

/**
 * 批量操作
 */
async function handleBatchEnvAction(action) {
    const ids = getSelectedEnvIds();
    if (ids.length === 0) return;
    
    if (action === 'delete' && !confirm(`确定要删除选中的 ${ids.length} 个环境变量吗？`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        let response;
        switch (action) {
            case 'enable':
                response = await sendMessage({ action: MESSAGE_TYPES.ENABLE_ENV, ids });
                break;
            case 'disable':
                response = await sendMessage({ action: MESSAGE_TYPES.DISABLE_ENV, ids });
                break;
            case 'delete':
                response = await sendMessage({ action: MESSAGE_TYPES.DELETE_ENV, ids });
                break;
        }
        
        if (response.success) {
            await loadEnvs(false);
            showToast(response.message);
        } else {
            showToast(response.error || '操作失败');
        }
        
    } catch (error) {
        console.error('批量操作失败:', error);
        showToast('操作失败');
    } finally {
        showLoading(false);
    }
}

// ========== 同步设置 ==========

/**
 * 加载同步配置
 */
async function loadSyncConfig() {
    const config = await storageManager.getConfig();
    elements.autoSync.checked = config.autoSync !== false;
    elements.syncInterval.value = config.syncInterval || 60;
}

/**
 * 保存同步配置
 */
async function handleSyncFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const autoSync = elements.autoSync.checked;
        const syncInterval = parseInt(elements.syncInterval.value);
        
        await storageManager.updateConfig({ autoSync, syncInterval });
        
        showToast('设置已保存');
        
    } catch (error) {
        console.error('保存设置失败:', error);
        showToast('保存失败');
    } finally {
        showLoading(false);
    }
}

// ========== 日志 ==========

/**
 * 加载日志
 */
async function loadLogs() {
    try {
        showLoading(true);
        
        const response = await sendMessage({
            action: MESSAGE_TYPES.GET_LOGS
        });
        
        if (response.success) {
            logs = response.logs || [];
            stats = response.stats || {};
            renderLogs();
        }
        
    } catch (error) {
        console.error('加载日志失败:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * 渲染日志
 */
function renderLogs() {
    // 更新统计
    elements.totalLogs.textContent = stats.total || 0;
    elements.successLogs.textContent = stats.success || 0;
    elements.failedLogs.textContent = stats.failed || 0;
    elements.todayLogs.textContent = stats.today || 0;
    
    // 渲染日志列表
    if (logs.length === 0) {
        elements.logsContainer.innerHTML = `
            <div class="empty-state">
                <p>暂无日志记录</p>
            </div>
        `;
        return;
    }
    
    elements.logsContainer.innerHTML = logs.map(log => `
        <div class="log-item ${log.status}">
            <div class="log-info">
                <div class="log-site">${escapeHtml(log.siteName)}</div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
            <div class="log-time">${formatTime(log.timestamp)}</div>
        </div>
    `).join('');
}

/**
 * 清除日志
 */
async function handleClearLogs() {
    if (!confirm('确定要清除所有日志吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await sendMessage({
            action: MESSAGE_TYPES.CLEAR_LOGS
        });
        
        if (response.success) {
            await loadLogs();
            showToast('日志已清除');
        }
        
    } catch (error) {
        console.error('清除日志失败:', error);
        showToast('清除失败');
    } finally {
        showLoading(false);
    }
}

// ========== 安全设置 ==========

/**
 * 导出配置
 */
async function handleExportConfig() {
    try {
        showLoading(true);
        
        const exportData = await storageManager.exportConfig();
        
        // 创建下载
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qinglong-sync-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('配置已导出');
        
    } catch (error) {
        console.error('导出配置失败:', error);
        showToast('导出失败');
    } finally {
        showLoading(false);
    }
}

/**
 * 导入配置
 */
async function handleImportConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        showLoading(true);
        
        const text = await file.text();
        const importData = JSON.parse(text);
        
        const result = await storageManager.importConfig(importData, false);
        
        if (result.success) {
            if (result.needsClientSecret) {
                alert('导入成功！请在青龙面板配置中补充Client Secret。');
            } else {
                showToast('配置已导入');
            }
            await loadAllData();
        } else {
            showToast(result.message);
        }
        
    } catch (error) {
        console.error('导入配置失败:', error);
        showToast('导入失败：文件格式错误');
    } finally {
        showLoading(false);
        elements.importFileInput.value = '';
    }
}

/**
 * 清除所有数据
 */
async function handleClearAll() {
    const confirmed = confirm('⚠️ 警告：此操作将清除所有配置和数据，不可恢复！\n\n确定要继续吗？');
    if (!confirmed) return;
    
    const doubleConfirm = confirm('再次确认：确定要清除所有数据吗？');
    if (!doubleConfirm) return;
    
    try {
        showLoading(true);
        
        await storageManager.clearAll();
        
        showToast('所有数据已清除');
        
        // 重新加载
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('清除数据失败:', error);
        showToast('清除失败');
    } finally {
        showLoading(false);
    }
}

// ========== 工具函数 ==========

/**
 * 发送消息到background
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
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

/**
 * 显示Toast
 */
function showToast(message, duration = 2000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
}

/**
 * 显示Alert
 */
function showAlert(message, type = 'success') {
    elements.connectionResult.textContent = message;
    elements.connectionResult.className = `alert ${type}`;
    elements.connectionResult.classList.remove('hidden');
}

/**
 * 隐藏Alert
 */
function hideAlert() {
    elements.connectionResult.classList.add('hidden');
}

/**
 * 绑定模态框事件
 * @param {Function} onSave - 保存按钮的回调函数
 * @param {string} saveButtonSelector - 保存按钮的选择器
 */
function bindModalEvents(onSave, saveButtonSelector) {
    // 检查modalContainer是否存在
    if (!elements.modalContainer) {
        console.error('modalContainer not found');
        return;
    }
    
    const overlay = elements.modalContainer.querySelector('.modal-overlay');
    const modal = elements.modalContainer.querySelector('.modal');
    
    // 检查必要的元素是否存在
    if (!overlay || !modal) {
        console.error('Modal elements not found:', { overlay, modal });
        return;
    }
    
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.btn-modal-cancel');
    const saveBtn = saveButtonSelector ? modal.querySelector(saveButtonSelector) : null;
    
    // 点击遮罩层关闭（点击modal本身不关闭）
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
    
    // 点击关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // 点击取消按钮
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // 点击保存按钮
    if (saveBtn && onSave) {
        saveBtn.addEventListener('click', () => onSave(saveBtn));
    }
}

/**
 * 关闭模态框
 */
function closeModal() {
    elements.modalContainer.innerHTML = '';
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);

// 添加模态框和表格样式
const style = document.createElement('style');
style.textContent = `
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.modal-body {
    padding: 24px;
}

.modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.site-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    border: 2px solid transparent;
}

.site-card.disabled {
    opacity: 0.6;
}

.site-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.site-card-title {
    font-size: 16px;
    font-weight: 600;
}

.site-card-actions {
    display: flex;
    gap: 8px;
}

.site-card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.site-field {
    display: flex;
    font-size: 13px;
}

.field-label {
    color: #666;
    width: 80px;
    flex-shrink: 0;
}

.field-value {
    color: #333;
    word-break: break-all;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    background: #e0e0e0;
    color: #666;
    margin-left: 4px;
}

.badge.success {
    background: #E8F5E9;
    color: #2E7D32;
}

.badge.primary {
    background: #E3F2FD;
    color: #1976D2;
}

.badge-warning {
    background: #FFF3E0;
    color: #E65100;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    display: inline-block;
}

.badge-error {
    background: #FFEBEE;
    color: #C62828;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    display: inline-block;
}

.btn-success {
    background: #4CAF50;
    color: white;
}

.btn-success:hover {
    background: #45a049;
}

.btn-warning {
    background: #FF9800;
    color: white;
}

.btn-warning:hover {
    background: #F57C00;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.data-table th {
    background: #f5f5f5;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e0e0e0;
}

.data-table td {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
}

.data-table tr:hover {
    background: #f9f9f9;
}

.env-value {
    font-family: monospace;
}

.env-value.masked {
    font-family: inherit;
}

.btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #999;
}
`;
document.head.appendChild(style);

// ========== Cookie选择状态管理 ==========

/**
 * 初始化Cookie选择状态管理
 */
function initCookieSelection(siteId) {
    const selectAllCheckbox = document.getElementById('selectAllCookiesCheckbox');
    const selectAllBtn = document.getElementById('selectAllCookies');
    const deselectAllBtn = document.getElementById('deselectAllCookies');
    const syncSelectedBtn = document.getElementById('syncSelectedCookiesBtn');
    const selectedCountSpan = document.getElementById('selectedCookieCount');
    const cookieCheckboxes = document.querySelectorAll('.cookie-checkbox');

    // 更新选择状态
    function updateSelectionState() {
        const checkedBoxes = document.querySelectorAll('.cookie-checkbox:checked');
        const totalBoxes = cookieCheckboxes.length;
        const checkedCount = checkedBoxes.length;

        // 更新计数显示
        selectedCountSpan.textContent = checkedCount;

        // 更新全选复选框状态
        if (checkedCount === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedCount === totalBoxes) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }

        // 更新同步按钮状态
        syncSelectedBtn.disabled = checkedCount === 0;
    }

    // 全选复选框事件
    selectAllCheckbox.addEventListener('change', function() {
        const isChecked = this.checked;
        cookieCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateSelectionState();
    });

    // 全选按钮事件
    selectAllBtn.addEventListener('click', function() {
        cookieCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        updateSelectionState();
    });

    // 取消全选按钮事件
    deselectAllBtn.addEventListener('click', function() {
        cookieCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSelectionState();
    });

    // 单个复选框事件
    cookieCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectionState);
    });

    // 同步选中Cookie按钮事件
    syncSelectedBtn.addEventListener('click', async function() {
        const selectedCookies = Array.from(document.querySelectorAll('.cookie-checkbox:checked'))
            .map(checkbox => checkbox.value);

        if (selectedCookies.length === 0) {
            showToast('请先选择要同步的Cookie');
            return;
        }

        try {
            // 禁用按钮并显示加载状态
            this.disabled = true;
            this.innerHTML = '<span class="btn-icon">⏳</span>同步中...';

            const response = await sendMessage({
                action: MESSAGE_TYPES.SYNC_SELECTED_COOKIES,
                siteId: siteId,
                cookieNames: selectedCookies
            });

            if (response.success) {
                showToast(response.message);
                // 关闭模态框
                closeModal();
            } else {
                showToast(response.message || '同步失败');
            }

        } catch (error) {
            console.error('同步选中Cookie失败:', error);
            showToast('同步失败');
        } finally {
            // 恢复按钮状态
            this.disabled = false;
            this.innerHTML = '<span class="btn-icon">🔄</span>同步选中Cookie';
        }
    });

    // 初始化状态
    updateSelectionState();
}

