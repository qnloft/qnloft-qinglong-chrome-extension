// 配置向导逻辑

import { storageManager } from '../lib/storage-manager.js';
import { cryptoUtils } from '../lib/crypto-utils.js';
import { MESSAGE_TYPES } from '../lib/constants.js';

// 当前步骤
let currentStep = 1;
const totalSteps = 4;

// 配置数据
let configData = {
    qinglong: {
        qlUrl: '',
        clientId: '',
        clientSecret: ''
    },
    site: {
        name: '',
        url: '',
        envName: '',
        enabled: true,
        autoSync: true
    }
};

// DOM元素
const elements = {
    // 步骤指示器
    steps: document.querySelectorAll('.step'),
    wizardSteps: document.querySelectorAll('.wizard-step'),
    
    // 导航按钮
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    finishBtn: document.getElementById('finishBtn'),
    
    // 青龙面板表单
    qinglongForm: document.getElementById('qinglongForm'),
    qlUrl: document.getElementById('qlUrl'),
    clientId: document.getElementById('clientId'),
    clientSecret: document.getElementById('clientSecret'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    connectionResult: document.getElementById('connectionResult'),
    
    // 网站表单
    siteForm: document.getElementById('siteForm'),
    siteName: document.getElementById('siteName'),
    siteUrl: document.getElementById('siteUrl'),
    envName: document.getElementById('envName'),
    siteEnabled: document.getElementById('siteEnabled'),
    autoSync: document.getElementById('autoSync'),
    
    // 完成页面
    summaryQlUrl: document.getElementById('summaryQlUrl'),
    summarySiteName: document.getElementById('summarySiteName'),
    summaryEnvName: document.getElementById('summaryEnvName'),
    syncNow: document.getElementById('syncNow'),
    
    // 通用
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    
    // 跳过按钮
    skipWizardBtn: document.getElementById('skipWizardBtn')
};

/**
 * 初始化
 */
function init() {
    console.log('配置向导初始化...');
    
    // 绑定事件
    bindEvents();
    
    // 显示第一步
    goToStep(1);
    
    console.log('配置向导初始化完成');
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 导航按钮
    elements.prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
    elements.nextBtn.addEventListener('click', handleNext);
    elements.finishBtn.addEventListener('click', handleFinish);
    
    // 跳过向导
    elements.skipWizardBtn.addEventListener('click', handleSkipWizard);
    
    // 测试连接
    elements.testConnectionBtn.addEventListener('click', handleTestConnection);
    
    // 表单输入监听
    elements.qlUrl.addEventListener('input', updateQinglongData);
    elements.clientId.addEventListener('input', updateQinglongData);
    elements.clientSecret.addEventListener('input', updateQinglongData);
    
    elements.siteName.addEventListener('input', updateSiteData);
    elements.siteUrl.addEventListener('input', updateSiteData);
    elements.envName.addEventListener('input', updateSiteData);
    elements.siteEnabled.addEventListener('change', updateSiteData);
    elements.autoSync.addEventListener('change', updateSiteData);
}

/**
 * 跳转到指定步骤
 */
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    
    currentStep = step;
    
    // 更新步骤指示器
    elements.steps.forEach((stepEl, index) => {
        const stepNum = index + 1;
        if (stepNum < currentStep) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (stepNum === currentStep) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });
    
    // 更新内容
    elements.wizardSteps.forEach((stepEl, index) => {
        if (index + 1 === currentStep) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
    
    // 更新导航按钮
    updateNavButtons();
}

/**
 * 更新导航按钮状态
 */
function updateNavButtons() {
    // 上一步按钮
    if (currentStep === 1) {
        elements.prevBtn.style.visibility = 'hidden';
    } else {
        elements.prevBtn.style.visibility = 'visible';
    }
    
    // 下一步/完成按钮
    if (currentStep === totalSteps) {
        elements.nextBtn.classList.add('hidden');
        elements.finishBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.finishBtn.classList.add('hidden');
    }
}

/**
 * 处理下一步
 */
async function handleNext() {
    // 验证当前步骤
    if (!await validateStep(currentStep)) {
        return;
    }
    
    // 跳转到下一步
    if (currentStep < totalSteps) {
        // 如果是步骤3（网站配置），更新摘要
        if (currentStep === 3) {
            updateSummary();
        }
        
        goToStep(currentStep + 1);
    }
}

/**
 * 验证步骤
 */
async function validateStep(step) {
    switch (step) {
        case 1:
            // 欢迎页面，无需验证
            return true;
            
        case 2:
            // 验证青龙面板配置
            if (!configData.qinglong.qlUrl || !configData.qinglong.clientId || !configData.qinglong.clientSecret) {
                showToast('请填写所有必填项');
                return false;
            }
            
            // 建议测试连接
            if (!elements.connectionResult.classList.contains('success')) {
                const confirm = window.confirm('建议先测试连接，确定要继续吗？');
                return confirm;
            }
            
            return true;
            
        case 3:
            // 验证网站配置
            if (!configData.site.name || !configData.site.url || !configData.site.envName) {
                showToast('请填写所有必填项');
                return false;
            }
            
            return true;
            
        default:
            return true;
    }
}

/**
 * 更新青龙面板数据
 */
function updateQinglongData() {
    configData.qinglong.qlUrl = elements.qlUrl.value.trim();
    configData.qinglong.clientId = elements.clientId.value.trim();
    configData.qinglong.clientSecret = elements.clientSecret.value.trim();
}

/**
 * 更新网站数据
 */
function updateSiteData() {
    configData.site.name = elements.siteName.value.trim();
    configData.site.url = elements.siteUrl.value.trim();
    configData.site.envName = elements.envName.value.trim();
    configData.site.enabled = elements.siteEnabled.checked;
    configData.site.autoSync = elements.autoSync.checked;
}

/**
 * 测试连接
 */
async function handleTestConnection() {
    updateQinglongData();
    
    if (!configData.qinglong.qlUrl || !configData.qinglong.clientId || !configData.qinglong.clientSecret) {
        showToast('请先填写所有必填项');
        return;
    }
    
    try {
        showLoading(true);
        hideAlert();
        
        // 先保存配置（临时）
        const encryptedSecret = await cryptoUtils.encrypt(configData.qinglong.clientSecret);
        await storageManager.updateConfig({
            qlUrl: configData.qinglong.qlUrl,
            clientId: configData.qinglong.clientId,
            clientSecret: encryptedSecret
        });
        
        // 测试连接
        const response = await sendMessage({
            action: MESSAGE_TYPES.TEST_CONNECTION
        });
        
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

/**
 * 更新摘要
 */
function updateSummary() {
    elements.summaryQlUrl.textContent = configData.qinglong.qlUrl;
    elements.summarySiteName.textContent = configData.site.name;
    elements.summaryEnvName.textContent = configData.site.envName;
}

/**
 * 跳过向导
 */
async function handleSkipWizard() {
    try {
        showLoading(true);
        
        // 显示确认对话框
        const confirmed = confirm('确定要跳过配置向导吗？\n\n跳过后将直接进入扩展设置页面，您可以稍后手动配置。');
        
        if (!confirmed) {
            showLoading(false);
            return;
        }
        
        // 标记向导已完成（避免再次显示）
        await storageManager.setWizardCompleted(true);
        
        // 关闭向导页面，打开设置页面
        chrome.runtime.openOptionsPage();
        
        // 关闭当前标签页
        window.close();
        
    } catch (error) {
        console.error('跳过向导失败:', error);
        showToast('跳过向导失败，请重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 完成配置
 */
async function handleFinish() {
    try {
        showLoading(true);
        
        // 保存青龙面板配置
        const encryptedSecret = await cryptoUtils.encrypt(configData.qinglong.clientSecret);
        await storageManager.updateConfig({
            qlUrl: configData.qinglong.qlUrl,
            clientId: configData.qinglong.clientId,
            clientSecret: encryptedSecret,
            autoSync: true,
            syncInterval: 60
        });
        
        // 保存网站配置
        await storageManager.addSite(configData.site);
        
        // 标记向导已完成
        await storageManager.setWizardCompleted(true);
        
        // 是否立即同步
        if (elements.syncNow.checked) {
            await sendMessage({ action: MESSAGE_TYPES.SYNC_NOW });
        }
        
        showToast('配置完成！');
        
        // 延迟后关闭向导，打开popup
        setTimeout(() => {
            // 关闭当前标签页
            chrome.tabs.getCurrent((tab) => {
                chrome.tabs.remove(tab.id);
            });
        }, 1500);
        
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存失败，请重试');
    } finally {
        showLoading(false);
    }
}

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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', init);

