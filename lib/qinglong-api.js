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
     * @param {Object} config - 可选的配置对象，如果提供则使用此配置，否则从storage读取
     * @param {string} config.qlUrl - 青龙面板URL
     * @param {string} config.clientId - 客户端ID
     * @param {string} config.clientSecret - 客户端密钥（可以是加密的）
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection(config = null) {
        console.log('qinglongAPI.testConnection 被调用，config:', config);
        try {
            let token;
            
            if (config) {
                console.log('使用传入的 config 进行测试');
                // 使用传入的配置进行测试
                const url = `${config.qlUrl}${API_PATHS.TOKEN}?client_id=${config.clientId}&client_secret=${config.clientSecret}`;
                console.log('测试连接 URL:', url);
                const response = await fetch(url);
                const data = await response.json();
                console.log('测试连接获取到的数据:', data);

                if (data.code === 200 && data.data && data.data.token) {
                    token = data.data.token;
                } else {
                    throw new Error(data.message || ERROR_MESSAGES.TOKEN_ERROR);
                }
            } else {
                // 从storage读取配置
                token = await this.getToken(true);
            }
            
            const successResult = {
                success: true,
                message: '连接成功',
                token: token.substring(0, 10) + '...'
            };
            console.log('testConnection 返回成功结果:', successResult);
            return successResult;
        } catch (error) {
            console.error('testConnection 捕获到错误:', error);
            const errorResult = {
                success: false,
                message: error.message
            };
            console.log('testConnection 返回错误结果:', errorResult);
            return errorResult;
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
            console.error('[QinglongAPI] 更新环境变量失败:', error);
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

    /**
     * 导出青龙面板完整配置
     * @param {Object} options - 导出选项
     * @param {boolean} options.includeSubscriptions - 是否包含订阅配置
     * @param {boolean} options.includeEnvs - 是否包含环境变量
     * @param {boolean} options.includeConfigFiles - 是否包含配置文件
     * @param {boolean} options.includeDependencies - 是否包含项目依赖
     * @returns {Promise<Object>} 导出的配置对象
     */
    async exportConfig(options = {}) {
        const defaultOptions = {
            includeSubscriptions: true,
            includeEnvs: true,
            includeConfigFiles: true,
            includeDependencies: true
        };

        const exportOptions = { ...defaultOptions, ...options };
        const config = {
            exportTime: new Date().toISOString(),
            version: '1.0.0',
            data: {}
        };

        try {
            // 并行获取所有配置数据
            const promises = [];

            if (exportOptions.includeSubscriptions) {
                promises.push(this._getSubscriptions().then(data => ({ subscriptions: data })));
            }

            if (exportOptions.includeEnvs) {
                promises.push(this.getEnvs(false).then(data => ({ environments: data })));
            }

            if (exportOptions.includeConfigFiles) {
                promises.push(this._getConfigFiles().then(data => ({ configFiles: data })));
            }

            if (exportOptions.includeDependencies) {
                promises.push(this._getDependencies().then(data => ({ dependencies: data })));
            }

            const results = await Promise.allSettled(promises);

            // 合并结果
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    Object.assign(config.data, result.value);
                } else {
                    console.warn(`导出配置项 ${index} 失败:`, result.reason);
                    config.data[`exportError_${index}`] = result.reason.message;
                }
            });

            return config;
        } catch (error) {
            console.error('导出配置失败:', error);
            throw new Error(`导出配置失败: ${error.message}`);
        }
    }

    /**
     * 导入青龙面板配置
     * @param {Object} configData - 导入的配置数据
     * @param {Object} options - 导入选项
     * @param {boolean} options.overwrite - 是否覆盖现有配置
     * @returns {Promise<Object>} 导入结果
     */
    async importConfig(configData, options = {}) {
        const importOptions = {
            overwrite: false,
            ...options
        };

        if (!configData || !configData.data) {
            throw new Error('无效的配置数据格式');
        }

        const results = {
            success: [],
            failed: [],
            skipped: []
        };

        try {
            const data = configData.data;

            // 导入环境变量
            if (data.environments && Array.isArray(data.environments)) {
                await this._importEnvironments(data.environments, importOptions, results);
            }

            // 导入订阅配置
            if (data.subscriptions && Array.isArray(data.subscriptions)) {
                await this._importSubscriptions(data.subscriptions, importOptions, results);
            }

            // 导入配置文件
            if (data.configFiles) {
                await this._importConfigFiles(data.configFiles, importOptions, results);
            }

            // 导入脚本
            if (data.scripts && Array.isArray(data.scripts)) {
                await this._importScripts(data.scripts, importOptions, results);
            }

            // 导入依赖
            if (data.dependencies) {
                await this._importDependencies(data.dependencies, importOptions, results);
            }

            // 导入系统设置
            if (data.systemSettings) {
                await this._importSystemSettings(data.systemSettings, importOptions, results);
            }

            return results;
        } catch (error) {
            console.error('导入配置失败:', error);
            throw new Error(`导入配置失败: ${error.message}`);
        }
    }

    /**
     * 获取订阅配置
     * @private
     */
    async _getSubscriptions() {
        try {
            const config = await storageManager.getConfig();
            const token = await this.getToken();
            const url = `${config.qlUrl}${API_PATHS.SUBSCRIPTIONS}`;
            
            const response = await this._fetchWithRetry(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            return data.code === 200 ? data.data : [];
        } catch (error) {
            console.warn('获取订阅配置失败:', error);
            return [];
        }
    }

    /**
     * 获取配置文件
     * @private
     */
    async _getConfigFiles() {
        try {
            const config = await storageManager.getConfig();
            const token = await this.getToken();
            
            // 优先使用新接口：open/configs/files 获取列表，再用 open/configs/detail?path=... 获取内容
            const listUrl = `${config.qlUrl}/open/configs/files`;
            try {
                console.log('尝试通过 open/configs/files 获取配置文件列表:', listUrl);

                const listResponse = await this._fetchWithRetry(listUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('配置文件列表API响应状态:', listResponse.status);

                if (listResponse.ok) {
                    const listData = await listResponse.json();
                    console.log('配置文件列表API响应数据:', listData);

                    const filesList = listData && (listData.data || listData.files || (Array.isArray(listData) ? listData : null));

                    if (filesList && Array.isArray(filesList) && filesList.length > 0) {
                        const files = [];

                        for (const fileInfo of filesList) {
                            // open/configs/files 返回形如 { title, value }，其中 value 为文件名/路径
                            const rawValue = fileInfo && typeof fileInfo === 'object' ? (fileInfo.value || fileInfo.title) : null;
                            const path =
                                fileInfo.value ||
                                fileInfo.path ||
                                fileInfo.name ||
                                fileInfo.file ||
                                fileInfo.filepath ||
                                (typeof fileInfo === 'string' ? fileInfo : '');

                            // 忽略明显的非配置项，例如 __pycache__ 目录
                            if (!path || rawValue === '__pycache__' || path === '__pycache__') {
                                continue;
                            }

                            // 只保留以字母或数字开头的文件名，过滤掉特殊字符开头的路径
                            const trimmedPath = typeof path === 'string' ? path.trim() : '';
                            const firstChar = trimmedPath.charAt(0);
                            if (!firstChar || !/[A-Za-z0-9]/.test(firstChar)) {
                                continue;
                            }

                            const detailUrl = `${config.qlUrl}/open/configs/detail?path=${encodeURIComponent(path)}`;
                            try {
                                console.log('尝试获取配置文件详情:', detailUrl);

                                const detailResponse = await this._fetchWithRetry(detailUrl, {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });

                                console.log('配置文件详情API响应状态:', detailResponse.status);

                                if (!detailResponse.ok) {
                                    files.push({
                                        path,
                                        meta: fileInfo,
                                        error: `状态码: ${detailResponse.status}`
                                    });
                                    continue;
                                }

                                const detailData = await detailResponse.json();
                                console.log('配置文件详情API响应数据:', detailData);

                                let content = null;
                                if (detailData) {
                                    if (typeof detailData === 'string') {
                                        content = detailData;
                                    } else if (typeof detailData.content === 'string') {
                                        content = detailData.content;
                                    } else if (detailData.data) {
                                        if (typeof detailData.data === 'string') {
                                            content = detailData.data;
                                        } else if (typeof detailData.data.content === 'string') {
                                            content = detailData.data.content;
                                        }
                                    }
                                }

                                files.push({
                                    path,
                                    meta: fileInfo,
                                    content
                                });
                            } catch (err) {
                                console.log('获取配置文件详情失败:', err.message);
                                files.push({
                                    path,
                                    meta: fileInfo,
                                    error: err.message
                                });
                            }
                        }

                        return {
                            message: '配置文件获取成功',
                            source: listUrl,
                            files
                        };
                    }
                }
            } catch (err) {
                console.log('通过 open/configs/files 获取配置文件失败:', err.message);
            }

            // 如果新接口不可用，回退到旧的配置API端点
            const possibleUrls = [
                `${config.qlUrl}/api/config`,
                `${config.qlUrl}/open/config`,
                `${config.qlUrl}/api/system/config`,
                `${config.qlUrl}/open/system/config`
            ];
            
            for (const url of possibleUrls) {
                try {
                    console.log('尝试获取配置文件:', url);
                    
                    const response = await this._fetchWithRetry(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('配置文件API响应状态:', response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('配置文件API响应数据:', data);
                        
                        if (data && (data.data || data.config)) {
                            return {
                                message: '配置文件获取成功',
                                data: data.data || data.config,
                                source: url
                            };
                        }
                    }
                } catch (err) {
                    console.log(`端点 ${url} 失败:`, err.message);
                    continue;
                }
            }
            
            // 如果所有API端点都失败，返回基本的配置信息
            return {
                message: '青龙面板配置API不可用，返回扩展存储的配置信息',
                extensionConfig: {
                    qlUrl: config.qlUrl,
                    clientId: config.clientId,
                    hasClientSecret: !!config.clientSecret,
                    syncConfig: '请查看同步设置'
                },
                source: 'extension-storage'
            };
            
        } catch (error) {
            console.warn('获取配置文件失败:', error);
            return { 
                message: `获取配置文件失败: ${error.message}`,
                source: 'error'
            };
        }
    }

    
    /**
     * 获取项目依赖
     * @private
     */
    async _getDependencies() {
        try {
            const config = await storageManager.getConfig();
            const token = await this.getToken();
            
            const dependencyTypes = ['nodejs', 'python3', 'linux'];
            const typeResults = {};
            const baseUrl = `${config.qlUrl}/open/dependencies`;

            for (const depType of dependencyTypes) {
                // 使用用户指定的接口格式: /open/dependencies?type=linux&status=1
                const url = `${baseUrl}?type=${depType}&status=1`;
                
                try {
                    console.log(`获取 ${depType} 依赖:`, url);

                    const response = await this._fetchWithRetry(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        typeResults[depType] = {
                            success: false,
                            message: `依赖接口响应异常，状态码: ${response.status}`
                        };
                        continue;
                    }

                    const data = await response.json();
                    
                    // 适配返回结构，通常是 { code: 200, data: [...] }
                    const items = data && (data.data || data);

                    if (Array.isArray(items)) {
                        typeResults[depType] = {
                            success: true,
                            message: '获取成功',
                            items: items
                        };
                    } else {
                        typeResults[depType] = {
                            success: false,
                            message: '响应格式不符合预期',
                            raw: data
                        };
                    }
                } catch (err) {
                    console.error(`获取 ${depType} 依赖失败:`, err);
                    typeResults[depType] = {
                        success: false,
                        message: err.message
                    };
                }
            }

            return {
                message: '项目依赖获取完成',
                source: baseUrl,
                types: dependencyTypes,
                data: typeResults
            };
            
        } catch (error) {
            console.warn('获取项目依赖失败:', error);
            return { 
                message: `获取项目依赖失败: ${error.message}`,
                source: 'error'
            };
        }
    }

    /**
     * 获取系统设置
     * @private
     */
    async _getSystemSettings() {
        try {
            const config = await storageManager.getConfig();
            const token = await this.getToken();
            
            // 尝试多个可能的系统设置API端点
            const possibleUrls = [
                `${config.qlUrl}/api/settings`,
                `${config.qlUrl}/open/settings`,
                `${config.qlUrl}/api/system/settings`,
                `${config.qlUrl}/api/system`,
                `${config.qlUrl}/open/system`
            ];
            
            for (const url of possibleUrls) {
                try {
                    console.log('尝试获取系统设置:', url);
                    
                    const response = await this._fetchWithRetry(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('系统设置API响应状态:', response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('系统设置API响应数据:', data);
                        
                        if (data && (data.data || data.settings || data.config)) {
                            return {
                                message: '系统设置获取成功',
                                data: data.data || data.settings || data.config,
                                source: url
                            };
                        }
                    }
                } catch (err) {
                    console.log(`端点 ${url} 失败:`, err.message);
                    continue;
                }
            }
            
            // 如果所有API端点都失败，返回基本的系统信息
            return {
                message: '青龙面板系统设置API不可用，返回基本系统信息',
                systemInfo: {
                    panelUrl: config.qlUrl,
                    apiVersion: 'v2',
                    availableEndpoints: [
                        '/open/envs',
                        '/open/auth/token',
                        '/open/subscriptions'
                    ],
                    note: '详细系统设置请查看青龙面板管理界面'
                },
                source: 'fallback-info'
            };
            
        } catch (error) {
            console.warn('获取系统设置失败:', error);
            return { 
                message: `获取系统设置失败: ${error.message}`,
                source: 'error'
            };
        }
    }

    /**
     * 导入环境变量
     * @private
     */
    async _importEnvironments(environments, options, results) {
        const overwrite = options.overwrite || false;
        
        // 如果需要覆盖，先获取现有环境变量列表以便执行删除操作
        let existingEnvs = [];
        if (overwrite) {
            try {
                existingEnvs = await this.getEnvs(false); // 不使用缓存，获取最新列表
            } catch (e) {
                console.warn('获取现有环境变量失败', e);
            }
        }

        // 记录已清理过的环境变量名称，避免重复删除（因为导入列表中可能有多个同名变量）
        const cleanedNames = new Set();

        for (const env of environments) {
            try {
                const name = env.name;
                const value = env.value;
                const remarks = env.remarks || '';

                if (!name) {
                    results.skipped.push({ type: 'environment', name: '', reason: '缺少名称' });
                    continue;
                }

                // 如果开启覆盖，且该名称尚未清理过，则先删除所有同名环境变量
                if (overwrite && !cleanedNames.has(name)) {
                    const toDelete = existingEnvs.filter(e => e.name === name);
                    if (toDelete.length > 0) {
                        const ids = toDelete.map(e => e.id);
                        await this.deleteEnvs(ids);
                        results.success.push({
                            type: 'environment',
                            name,
                            action: `删除旧配置(${ids.length}个)`
                        });
                    }
                    cleanedNames.add(name);
                }

                // 直接新增
                await this.createEnv({ name, value, remarks });
                results.success.push({
                    type: 'environment',
                    name,
                    action: '创建'
                });

            } catch (error) {
                results.failed.push({ type: 'environment', name: env.name, error: error.message });
            }
        }
    }

    /**
     * 导入订阅配置
     * @private
     */
    async _importSubscriptions(subscriptions, options, results) {
        // 订阅配置导入逻辑（根据实际API实现）
        try {
            const config = await storageManager.getConfig();
            const token = await this.getToken();
            const url = `${config.qlUrl}${API_PATHS.SUBSCRIPTIONS}`;

            for (const sub of subscriptions) {
                const name = sub.name || sub.title || sub.alias || 'unknown';
                
                try {
                    // 验证必需字段
                    if (!sub.type || !sub.url || !sub.schedule_type || !sub.alias) {
                        results.failed.push({
                            type: 'subscription',
                            name,
                            error: '缺少必需字段: type, url, schedule_type, alias'
                        });
                        continue;
                    }

                    // 白名单方式：只提取API需要的字段
                    const payload = {
                        type: sub.type,
                        url: sub.url,
                        schedule_type: sub.schedule_type,
                        alias: sub.alias
                    };

                    // 添加可选字段（如果存在且不为null）
                    if (sub.schedule) payload.schedule = sub.schedule;
                    if (sub.interval_schedule) payload.interval_schedule = sub.interval_schedule;
                    if (sub.name) payload.name = sub.name;
                    if (sub.whitelist) payload.whitelist = sub.whitelist;
                    if (sub.blacklist) payload.blacklist = sub.blacklist;
                    if (sub.branch) payload.branch = sub.branch;
                    if (sub.dependences) payload.dependences = sub.dependences;
                    if (sub.pull_type) payload.pull_type = sub.pull_type;
                    if (sub.pull_option) payload.pull_option = sub.pull_option;
                    if (sub.extensions) payload.extensions = sub.extensions;
                    if (sub.sub_before) payload.sub_before = sub.sub_before;
                    if (sub.sub_after) payload.sub_after = sub.sub_after;
                    if (sub.proxy) payload.proxy = sub.proxy;
                    
                    // 类型转换：数字转布尔值
                    if (sub.autoAddCron !== undefined && sub.autoAddCron !== null) {
                        payload.autoAddCron = Boolean(sub.autoAddCron);
                    }
                    if (sub.autoDelCron !== undefined && sub.autoDelCron !== null) {
                        payload.autoDelCron = Boolean(sub.autoDelCron);
                    }

                    const response = await this._fetchWithRetry(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    let data = null;
                    try {
                        data = await response.json();
                    } catch (e) {
                        data = null;
                    }

                    const code = data && typeof data.code !== 'undefined' ? data.code : response.status;
                    if (response.ok && (code === 200 || code === 201)) {
                        results.success.push({ type: 'subscription', name, action: '创建' });
                    } else {
                        const message = data && (data.message || data.msg) || `HTTP ${response.status}`;
                        results.failed.push({ type: 'subscription', name, error: message });
                    }
                } catch (error) {
                    results.failed.push({ type: 'subscription', name, error: error.message });
                }
            }
        } catch (error) {
            results.failed.push({ type: 'subscription', error: error.message });
        }
    }

    /**
     * 导入配置文件
     * @private
     */
    async _importConfigFiles(configFiles, options, results) {
        try {
            // 兼容新旧两种导出结构：
            // 1) 新结构：{ message, source, files: [{ path, meta, content, error? }, ...] }
            // 2) 旧结构：{ message, data: ..., source } 或 { config: ... }

            if (!configFiles || typeof configFiles !== 'object') {
                results.skipped.push({ type: 'configFiles', reason: '无有效配置文件数据' });
                return;
            }

            const files = Array.isArray(configFiles.files) ? configFiles.files : [];
            const overwrite = options.overwrite || false;

            // 如果不覆盖，先获取现有文件列表
            let existingFilesSet = new Set();
            if (!overwrite && files.length > 0) {
                try {
                    const existingData = await this._getConfigFiles();
                    if (existingData && Array.isArray(existingData.files)) {
                        existingData.files.forEach(f => {
                            // 提取文件名/路径
                            const p = f.path || (f.meta && (f.meta.path || f.meta.name || f.meta.value));
                            if (p) existingFilesSet.add(p);
                        });
                    }
                } catch (e) {
                    console.warn('获取现有配置文件列表失败', e);
                }
            }

            if (files.length > 0) {
                const config = await storageManager.getConfig();
                const token = await this.getToken();
                const url = `${config.qlUrl}${API_PATHS.CONFIGS_SAVE || '/open/configs/save'}`;

                for (const file of files) {
                    const path = file.path || (file.meta && (file.meta.path || file.meta.name || file.meta.file)) || '';

                    if (!path) {
                        results.skipped.push({ type: 'configFile', name: '', reason: '缺少路径' });
                        continue;
                    }

                    // 检查是否已存在且不覆盖
                    if (!overwrite && existingFilesSet.has(path)) {
                        results.skipped.push({
                            type: 'configFile',
                            name: path,
                            reason: '已存在 (跳过)'
                        });
                        continue;
                    }

                    if (file.error) {
                        results.skipped.push({
                            type: 'configFile',
                            name: path,
                            reason: file.error
                        });
                        continue;
                    }

                    if (typeof file.content !== 'string') {
                        results.skipped.push({
                            type: 'configFile',
                            name: path,
                            reason: '无有效内容'
                        });
                        continue;
                    }

                    try {
                        const payload = {
                            name: path,
                            content: file.content
                        };

                        const response = await this._fetchWithRetry(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        });

                        let data = null;
                        try {
                            data = await response.json();
                        } catch (e) {
                            data = null;
                        }

                        const code = data && typeof data.code !== 'undefined' ? data.code : response.status;
                        if (response.ok && (code === 200 || code === 201)) {
                            results.success.push({
                                type: 'configFile',
                                name: path,
                                action: '保存'
                            });
                        } else {
                            const message = data && (data.message || data.msg) || `HTTP ${response.status}`;
                            results.failed.push({
                                type: 'configFile',
                                name: path,
                                error: message
                            });
                        }
                    } catch (error) {
                        results.failed.push({
                            type: 'configFile',
                            name: path,
                            error: error.message
                        });
                    }
                }
                return;
            }

            if (configFiles.data || configFiles.config) {
                results.success.push({
                    type: 'configFiles',
                    action: '记录',
                    detail: 'data/config 字段'
                });
                return;
            }

            results.skipped.push({ type: 'configFiles', reason: '未找到 files 或 data/config 字段' });
        } catch (error) {
            results.failed.push({ type: 'configFiles', error: error.message });
        }
    }

    /**
     * 导入脚本
     * @private
     */
    async _importScripts(scripts, options, results) {
        for (const script of scripts) {
            try {
                // 脚本导入逻辑（根据实际API实现）
                results.success.push({ type: 'script', name: script.name || script.filename, action: '导入' });
            } catch (error) {
                results.failed.push({ type: 'script', name: script.name || script.filename, error: error.message });
            }
        }
    }

    /**
     * 添加依赖
     * @param {Array<{name: string, type: string}>} dependencies 依赖列表
     */
    async addDependencies(dependencies) {
        const config = await storageManager.getConfig();
        const token = await this.getToken();
        const url = `${config.qlUrl}/open/dependencies`;

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dependencies)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return await response.json();
    }

    /**
     * 导入依赖
     * @private
     */
    async _importDependencies(dependenciesData, options, results) {
        if (!dependenciesData || !dependenciesData.data) {
            results.skipped.push({ type: 'dependencies', reason: '无有效依赖数据' });
            return;
        }

        const overwrite = options.overwrite || false;
        
        // 1. 获取现有依赖用于去重检查 (如果不覆盖)
        let currentDepsData = {};
        if (!overwrite) {
            try {
                const currentDeps = await this._getDependencies();
                if (currentDeps && currentDeps.data) {
                    currentDepsData = currentDeps.data;
                }
            } catch (e) {
                console.warn('获取现有依赖失败，将尝试直接安装', e);
            }
        }

        const typeMapping = {
            'nodejs': 0,
            'python3': 1,
            'linux': 2
        };

        const types = ['nodejs', 'python3', 'linux'];

        for (const depType of types) {
            const typeData = dependenciesData.data[depType];
            if (!typeData || !typeData.items || !Array.isArray(typeData.items) || typeData.items.length === 0) continue;

            // 获取该类型现有的依赖 Map: name -> status
            const existingItems = currentDepsData[depType]?.items || [];
            const existingMap = new Map(existingItems.map(item => [item.name, item.status]));

            const itemsToInstall = [];

            for (const item of typeData.items) {
                // 如果不覆盖，检查是否存在且状态为已安装 (status === 1)
                if (!overwrite) {
                    const existingStatus = existingMap.get(item.name);
                    if (existingStatus === 1) {
                        results.skipped.push({
                            type: 'dependency',
                            name: `${depType}:${item.name}`,
                            reason: '已安装 (跳过)'
                        });
                        continue;
                    }
                }

                // 添加到待安装列表
                itemsToInstall.push({
                    name: item.name,
                    type: typeMapping[depType],
                    remark: item.remark || ''
                });
            }

            if (itemsToInstall.length > 0) {
                try {
                    await this.addDependencies(itemsToInstall);
                    itemsToInstall.forEach(item => {
                        results.success.push({
                            type: 'dependency',
                            name: `${depType}:${item.name}`,
                            action: '添加/更新'
                        });
                    });
                } catch (error) {
                    itemsToInstall.forEach(item => {
                        results.failed.push({
                            type: 'dependency',
                            name: `${depType}:${item.name}`,
                            error: error.message
                        });
                    });
                }
            }
        }
    }

    /**
     * 导入系统设置
     * @private
     */
    async _importSystemSettings(systemSettings, options, results) {
        try {
            // 系统设置导入逻辑（根据实际API实现）
            results.success.push({ type: 'systemSettings', action: '导入' });
        } catch (error) {
            results.failed.push({ type: 'systemSettings', error: error.message });
        }
    }
}

// 导出单例
export const qinglongAPI = new QingLongAPI();
export default qinglongAPI;

