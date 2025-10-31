// 存储管理器 - 封装Chrome Storage API

import { STORAGE_KEYS, DEFAULT_CONFIG, DEFAULT_SITE } from './constants.js';
import { cryptoUtils } from './crypto-utils.js';

/**
 * 存储管理器类
 */
class StorageManager {
    /**
     * 获取青龙面板配置
     * @returns {Promise<Object>} 青龙面板配置对象
     */
    /**
     * 检查字符串是否是有效的加密数据格式
     * @param {string} str - 待检查的字符串
     * @returns {boolean} 是否看起来像是加密的数据
     * @private
     */
    _isEncryptedFormat(str) {
        if (!str || typeof str !== 'string') {
            return false;
        }
        
        // 清理字符串
        const cleaned = str.trim().replace(/[\s\n\r\t]/g, '');
        
        // 加密后的数据至少需要 salt(16) + iv(12) = 28字节
        // base64编码后：28 * 4 / 3 ≈ 37.3，至少需要38个字符
        // 为了安全，我们设置一个保守的阈值：32个字符
        if (cleaned.length < 32) {
            return false;
        }
        
        // 检查是否是有效的base64格式（只允许A-Z, a-z, 0-9, +, /, =）
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(cleaned);
    }

    async getConfig() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
        const config = result[STORAGE_KEYS.CONFIG] || { ...DEFAULT_CONFIG };
        
        // 如果clientSecret存在且看起来已加密，则尝试解密
        if (config.clientSecret && this._isEncryptedFormat(config.clientSecret)) {
            try {
                config.clientSecret = await cryptoUtils.decrypt(config.clientSecret);
            } catch (error) {
                // 如果解密失败，可能是数据损坏或格式不正确
                // 保持原样，可能是旧的未加密值或其他格式
                console.warn('解密clientSecret失败，保持原值。这可能是未加密的值或数据格式不正确:', error.message || error);
                // 保持原样，不做修改
            }
        }
        // 如果长度较短或不是有效的base64格式，假设它是明文，直接使用
        
        return config;
    }

    /**
     * 保存青龙面板配置
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async saveConfig(config) {
        // 克隆配置以避免修改原对象
        const configToSave = { ...config };
        
        // 如果clientSecret存在且不为空，则加密
        if (configToSave.clientSecret && configToSave.clientSecret.trim()) {
            try {
                // 如果看起来还没加密（不是加密格式），则加密
                if (!this._isEncryptedFormat(configToSave.clientSecret)) {
                    configToSave.clientSecret = await cryptoUtils.encrypt(configToSave.clientSecret);
                }
                // 如果已经是加密格式，保持不变（避免重复加密）
            } catch (error) {
                console.error('加密clientSecret失败:', error);
                throw new Error('保存配置失败：加密出错');
            }
        }
        
        await chrome.storage.local.set({
            [STORAGE_KEYS.CONFIG]: configToSave
        });
    }

    /**
     * 更新青龙面板配置（部分更新）
     * @param {Object} updates - 需要更新的字段
     * @returns {Promise<Object>} 更新后的完整配置
     */
    async updateConfig(updates) {
        const currentConfig = await this.getConfig();
        const newConfig = { ...currentConfig, ...updates };
        await this.saveConfig(newConfig);
        return newConfig;
    }

    /**
     * 获取所有网站配置
     * @returns {Promise<Array>} 网站配置数组
     */
    async getSites() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.SITES);
        return result[STORAGE_KEYS.SITES] || [];
    }

    /**
     * 保存所有网站配置
     * @param {Array} sites - 网站配置数组
     * @returns {Promise<void>}
     */
    async saveSites(sites) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SITES]: sites
        });
    }

    /**
     * 获取指定网站配置
     * @param {string} siteId - 网站ID
     * @returns {Promise<Object|null>} 网站配置对象或null
     */
    async getSite(siteId) {
        const sites = await this.getSites();
        return sites.find(site => site.id === siteId) || null;
    }

    /**
     * 添加网站配置
     * @param {Object} siteData - 网站配置数据
     * @returns {Promise<Object>} 添加的网站配置（含ID）
     */
    async addSite(siteData) {
        const sites = await this.getSites();
        const newSite = {
            ...DEFAULT_SITE,
            ...siteData,
            id: this._generateId(),
        };
        sites.push(newSite);
        await this.saveSites(sites);
        return newSite;
    }

    /**
     * 更新网站配置
     * @param {string} siteId - 网站ID
     * @param {Object} updates - 需要更新的字段
     * @returns {Promise<Object|null>} 更新后的网站配置或null
     */
    async updateSite(siteId, updates) {
        const sites = await this.getSites();
        const index = sites.findIndex(site => site.id === siteId);
        
        if (index === -1) {
            return null;
        }

        sites[index] = { ...sites[index], ...updates };
        await this.saveSites(sites);
        return sites[index];
    }

    /**
     * 删除网站配置
     * @param {string} siteId - 网站ID
     * @returns {Promise<boolean>} 是否成功删除
     */
    async deleteSite(siteId) {
        const sites = await this.getSites();
        const filteredSites = sites.filter(site => site.id !== siteId);
        
        if (filteredSites.length === sites.length) {
            return false; // 未找到要删除的网站
        }

        await this.saveSites(filteredSites);
        return true;
    }

    /**
     * 获取所有日志
     * @returns {Promise<Array>} 日志数组
     */
    async getLogs() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
        return result[STORAGE_KEYS.LOGS] || [];
    }

    /**
     * 添加日志记录
     * @param {Object} logData - 日志数据
     * @returns {Promise<void>}
     */
    async addLog(logData) {
        const logs = await this.getLogs();
        const newLog = {
            id: this._generateId(),
            timestamp: Date.now(),
            ...logData
        };
        
        logs.unshift(newLog); // 添加到开头（最新的在前）
        await this.saveLogs(logs);
    }

    /**
     * 保存日志（会自动清理过期和过多的日志）
     * @param {Array} logs - 日志数组
     * @returns {Promise<void>}
     */
    async saveLogs(logs) {
        // 这里会在logger.js中实现清理逻辑
        await chrome.storage.local.set({
            [STORAGE_KEYS.LOGS]: logs
        });
    }

    /**
     * 清除所有日志
     * @returns {Promise<void>}
     */
    async clearLogs() {
        await chrome.storage.local.set({
            [STORAGE_KEYS.LOGS]: []
        });
    }

    /**
     * 获取配置向导完成状态
     * @returns {Promise<boolean>}
     */
    async getWizardCompleted() {
        const result = await chrome.storage.local.get(STORAGE_KEYS.WIZARD_COMPLETED);
        return result[STORAGE_KEYS.WIZARD_COMPLETED] || false;
    }

    /**
     * 设置配置向导完成状态
     * @param {boolean} completed - 是否完成
     * @returns {Promise<void>}
     */
    async setWizardCompleted(completed) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.WIZARD_COMPLETED]: completed
        });
    }

    /**
     * 获取环境变量缓存
     * @returns {Promise<Object>} 缓存对象 { data: Array, timestamp: number }
     */
    async getEnvCache() {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.ENV_CACHE,
            STORAGE_KEYS.ENV_CACHE_TIME
        ]);
        
        return {
            data: result[STORAGE_KEYS.ENV_CACHE] || null,
            timestamp: result[STORAGE_KEYS.ENV_CACHE_TIME] || 0
        };
    }

    /**
     * 设置环境变量缓存
     * @param {Array} envs - 环境变量数组
     * @returns {Promise<void>}
     */
    async setEnvCache(envs) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.ENV_CACHE]: envs,
            [STORAGE_KEYS.ENV_CACHE_TIME]: Date.now()
        });
    }

    /**
     * 清除环境变量缓存
     * @returns {Promise<void>}
     */
    async clearEnvCache() {
        await chrome.storage.local.remove([
            STORAGE_KEYS.ENV_CACHE,
            STORAGE_KEYS.ENV_CACHE_TIME
        ]);
    }

    /**
     * 导出所有配置（不包含敏感信息）
     * @returns {Promise<Object>} 导出的配置对象
     */
    async exportConfig() {
        const config = await this.getConfig();
        const sites = await this.getSites();
        
        // 移除敏感信息
        const exportData = {
            config: {
                ...config,
                clientSecret: '' // 不导出Client Secret
            },
            sites: sites,
            exportTime: Date.now(),
            version: '1.0.0'
        };
        
        return exportData;
    }

    /**
     * 导入配置
     * @param {Object} importData - 导入的配置对象
     * @param {boolean} mergeMode - 是否合并模式（true=合并，false=覆盖）
     * @returns {Promise<Object>} 导入结果
     */
    async importConfig(importData, mergeMode = false) {
        const result = {
            success: false,
            message: '',
            needsClientSecret: false
        };

        try {
            // 验证导入数据
            if (!importData || !importData.config) {
                result.message = '导入数据格式无效';
                return result;
            }

            if (mergeMode) {
                // 合并模式
                const currentConfig = await this.getConfig();
                const currentSites = await this.getSites();
                
                // 合并配置（保留当前的clientSecret）
                const mergedConfig = {
                    ...importData.config,
                    clientSecret: currentConfig.clientSecret || ''
                };
                await this.saveConfig(mergedConfig);
                
                // 合并网站配置（重新生成ID避免冲突）
                const newSites = importData.sites.map(site => ({
                    ...site,
                    id: this._generateId()
                }));
                await this.saveSites([...currentSites, ...newSites]);
            } else {
                // 覆盖模式
                await this.saveConfig(importData.config);
                
                // 重新生成ID
                const newSites = importData.sites.map(site => ({
                    ...site,
                    id: this._generateId()
                }));
                await this.saveSites(newSites);
            }

            result.success = true;
            result.message = '配置导入成功';
            result.needsClientSecret = !importData.config.clientSecret;
            
        } catch (error) {
            result.message = `导入失败: ${error.message}`;
        }

        return result;
    }

    /**
     * 清除所有数据（慎用）
     * @returns {Promise<void>}
     */
    async clearAll() {
        await chrome.storage.local.clear();
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     * @private
     */
    _generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 导出单例
export const storageManager = new StorageManager();
export default storageManager;

