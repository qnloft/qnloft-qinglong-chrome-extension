// 青龙面板API客户端

import { storageManager } from './storage-manager.js';
import { API_PATHS, SYNC_CONFIG, ERROR_MESSAGES } from './constants.js';

/**
 * 青龙面板API客户端类
 */
class QingLongAPI {
    constructor() {
        this.token = null;
        this.tokenExpiry = 0;
    }

    /**
     * 获取Token（带缓存）
     * @param {boolean} forceRefresh - 是否强制刷新
     * @returns {Promise<string>} Token
     */
    async getToken(forceRefresh = false) {
        // 如果token未过期且不强制刷新，返回缓存的token
        if (!forceRefresh && this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        const config = await storageManager.getConfig();
        
        if (!config.qlUrl || !config.clientId || !config.clientSecret) {
            throw new Error(ERROR_MESSAGES.NO_CONFIG);
        }

        try {
            const url = `${config.qlUrl}${API_PATHS.TOKEN}?client_id=${config.clientId}&client_secret=${config.clientSecret}`;
            console.log('获取Token URL:', url);
            const response = await fetch(url);
            const data = await response.json();

            if (data.code === 200 && data.data && data.data.token) {
                this.token = data.data.token;
                // Token有效期设为1小时（青龙面板默认）
                this.tokenExpiry = Date.now() + 60 * 60 * 1000;
                return this.token;
            } else {
                throw new Error(data.message || ERROR_MESSAGES.TOKEN_ERROR);
            }
        } catch (error) {
            console.error('获取Token失败:', error);
            throw new Error(ERROR_MESSAGES.TOKEN_ERROR);
        }
    }

    /**
     * 测试连接
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection() {
        try {
            const token = await this.getToken(true);
            return {
                success: true,
                message: '连接成功',
                token: token.substring(0, 10) + '...'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * 获取所有环境变量
     * @param {boolean} useCache - 是否使用缓存
     * @returns {Promise<Array>} 环境变量数组
     */
    async getEnvs(useCache = true) {
        // 尝试从缓存获取
        if (useCache) {
            const cache = await storageManager.getEnvCache();
            const cacheAge = Date.now() - cache.timestamp;
            
            // 缓存未过期
            if (cache.data && cacheAge < 5 * 60 * 1000) {
                return cache.data;
            }
        }

        const config = await storageManager.getConfig();
        const token = await this.getToken();

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS}`;
            const response = await this._fetchWithRetry(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.code === 200 && data.data) {
                const envs = Array.isArray(data.data) ? data.data : [];
                
                // 更新缓存
                await storageManager.setEnvCache(envs);
                
                return envs;
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('获取环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 创建环境变量
     * @param {Object} envData - 环境变量数据
     * @param {string} envData.name - 名称
     * @param {string} envData.value - 值
     * @param {string} envData.remarks - 备注
     * @returns {Promise<Object>} 创建的环境变量
     */
    async createEnv(envData) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();

        const payload = [{
            name: envData.name,
            value: envData.value,
            remarks: envData.remarks || ''
        }];

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS}`;
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.code === 200) {
                // 清除缓存
                await storageManager.clearEnvCache();
                return data.data;
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('创建环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 更新环境变量
     * @param {Object} envData - 环境变量数据
     * @param {number} envData.id - ID
     * @param {string} envData.name - 名称
     * @param {string} envData.value - 值
     * @param {string} envData.remarks - 备注
     * @returns {Promise<Object>} 更新结果
     */
    async updateEnv(envData) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();

        const payload = {
            id: envData.id,
            name: envData.name,
            value: envData.value,
            remarks: envData.remarks || ''
        };

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS}`;
            const response = await this._fetchWithRetry(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.code === 200) {
                // 清除缓存
                await storageManager.clearEnvCache();
                return data.data;
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('更新环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 删除环境变量
     * @param {Array<number>} ids - 环境变量ID数组
     * @returns {Promise<Object>} 删除结果
     */
    async deleteEnvs(ids) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS}`;
            const response = await this._fetchWithRetry(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ids)
            });

            const data = await response.json();

            if (data.code === 200) {
                // 清除缓存
                await storageManager.clearEnvCache();
                return { success: true, message: '删除成功' };
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('删除环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 启用环境变量
     * @param {Array<number>} ids - 环境变量ID数组
     * @returns {Promise<Object>} 启用结果
     */
    async enableEnvs(ids) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS_ENABLE}`;
            const response = await this._fetchWithRetry(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ids)
            });

            const data = await response.json();

            if (data.code === 200) {
                // 清除缓存
                await storageManager.clearEnvCache();
                return { success: true, message: '启用成功' };
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('启用环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 禁用环境变量
     * @param {Array<number>} ids - 环境变量ID数组
     * @returns {Promise<Object>} 禁用结果
     */
    async disableEnvs(ids) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();

        try {
            const url = `${config.qlUrl}${API_PATHS.ENVS_DISABLE}`;
            const response = await this._fetchWithRetry(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ids)
            });

            const data = await response.json();

            if (data.code === 200) {
                // 清除缓存
                await storageManager.clearEnvCache();
                return { success: true, message: '禁用成功' };
            } else {
                throw new Error(data.message || ERROR_MESSAGES.API_ERROR);
            }
        } catch (error) {
            console.error('禁用环境变量失败:', error);
            throw error;
        }
    }

    /**
     * 查找环境变量
     * @param {string} name - 环境变量名称
     * @returns {Promise<Object|null>} 环境变量对象或null
     */
    async findEnvByName(name) {
        const envs = await this.getEnvs();
        return envs.find(env => env.name === name) || null;
    }

    /**
     * 更新或创建环境变量（如果不存在则创建）
     * @param {string} name - 环境变量名称
     * @param {string} value - 值
     * @param {string} remarks - 备注
     * @returns {Promise<Object>} 操作结果
     */
    async upsertEnv(name, value, remarks = '') {
        const existingEnv = await this.findEnvByName(name);

        if (existingEnv) {
            // 更新
            return await this.updateEnv({
                id: existingEnv.id,
                name,
                value,
                remarks: remarks || existingEnv.remarks
            });
        } else {
            // 创建
            return await this.createEnv({ name, value, remarks });
        }
    }

    /**
     * 带重试机制的fetch
     * @param {string} url - 请求URL
     * @param {Object} options - fetch选项
     * @param {number} retries - 重试次数
     * @returns {Promise<Response>} 响应
     * @private
     */
    async _fetchWithRetry(url, options, retries = SYNC_CONFIG.RETRY_MAX) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok && i < retries - 1) {
                    // 如果不是最后一次重试，等待后重试
                    await this._delay(SYNC_CONFIG.RETRY_DELAY);
                    continue;
                }
                
                return response;
            } catch (error) {
                if (i === retries - 1) {
                    throw error;
                }
                await this._delay(SYNC_CONFIG.RETRY_DELAY);
            }
        }
    }

    /**
     * 延迟工具函数
     * @param {number} ms - 毫秒
     * @returns {Promise<void>}
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清除Token缓存
     */
    clearTokenCache() {
        this.token = null;
        this.tokenExpiry = 0;
    }
}

// 导出单例
export const qinglongAPI = new QingLongAPI();
export default qinglongAPI;

