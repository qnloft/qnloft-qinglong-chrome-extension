// 日志系统 - 记录同步操作历史

import { storageManager } from './storage-manager.js';
import { LOG_CONFIG, SYNC_STATUS } from './constants.js';

/**
 * 日志管理器类
 */
class Logger {
    /**
     * 记录成功的同步日志
     * @param {string} siteId - 网站ID
     * @param {string} siteName - 网站名称
     * @param {string} message - 成功消息
     * @returns {Promise<void>}
     */
    async logSuccess(siteId, siteName, message = '同步成功') {
        await this._addLog({
            siteId,
            siteName,
            status: SYNC_STATUS.SUCCESS,
            message
        });
    }

    /**
     * 记录失败的同步日志
     * @param {string} siteId - 网站ID
     * @param {string} siteName - 网站名称
     * @param {string} error - 错误信息
     * @returns {Promise<void>}
     */
    async logError(siteId, siteName, error) {
        await this._addLog({
            siteId,
            siteName,
            status: SYNC_STATUS.FAILED,
            message: error
        });
    }

    /**
     * 记录一般信息日志
     * @param {string} siteId - 网站ID
     * @param {string} siteName - 网站名称
     * @param {string} message - 消息
     * @returns {Promise<void>}
     */
    async logInfo(siteId, siteName, message) {
        await this._addLog({
            siteId,
            siteName,
            status: SYNC_STATUS.PENDING,
            message
        });
    }

    /**
     * 获取所有日志
     * @param {Object} options - 查询选项
     * @param {string} options.siteId - 按网站ID过滤
     * @param {string} options.status - 按状态过滤
     * @param {number} options.limit - 限制返回数量
     * @param {number} options.offset - 偏移量
     * @returns {Promise<Array>} 日志数组
     */
    async getLogs(options = {}) {
        let logs = await storageManager.getLogs();
        
        // 按网站ID过滤
        if (options.siteId) {
            logs = logs.filter(log => log.siteId === options.siteId);
        }
        
        // 按状态过滤
        if (options.status) {
            logs = logs.filter(log => log.status === options.status);
        }
        
        // 分页
        if (options.offset !== undefined || options.limit !== undefined) {
            const offset = options.offset || 0;
            const limit = options.limit || logs.length;
            logs = logs.slice(offset, offset + limit);
        }
        
        return logs;
    }

    /**
     * 获取最近的N条日志
     * @param {number} count - 数量
     * @returns {Promise<Array>} 日志数组
     */
    async getRecentLogs(count = 10) {
        return this.getLogs({ limit: count });
    }

    /**
     * 获取指定网站的日志
     * @param {string} siteId - 网站ID
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 日志数组
     */
    async getSiteLogs(siteId, limit = 100) {
        return this.getLogs({ siteId, limit });
    }

    /**
     * 获取成功的日志
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 日志数组
     */
    async getSuccessLogs(limit = 100) {
        return this.getLogs({ status: SYNC_STATUS.SUCCESS, limit });
    }

    /**
     * 获取失败的日志
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 日志数组
     */
    async getErrorLogs(limit = 100) {
        return this.getLogs({ status: SYNC_STATUS.FAILED, limit });
    }

    /**
     * 获取日志统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getStats() {
        const logs = await storageManager.getLogs();
        
        const stats = {
            total: logs.length,
            success: 0,
            failed: 0,
            pending: 0,
            today: 0,
            lastSync: null
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        logs.forEach(log => {
            // 统计状态
            if (log.status === SYNC_STATUS.SUCCESS) {
                stats.success++;
            } else if (log.status === SYNC_STATUS.FAILED) {
                stats.failed++;
            } else {
                stats.pending++;
            }
            
            // 统计今日日志
            if (log.timestamp >= todayTimestamp) {
                stats.today++;
            }
            
            // 记录最后同步时间
            if (!stats.lastSync || log.timestamp > stats.lastSync) {
                stats.lastSync = log.timestamp;
            }
        });
        
        return stats;
    }

    /**
     * 清除所有日志
     * @returns {Promise<void>}
     */
    async clearAll() {
        await storageManager.clearLogs();
    }

    /**
     * 清除指定网站的日志
     * @param {string} siteId - 网站ID
     * @returns {Promise<void>}
     */
    async clearSiteLogs(siteId) {
        const logs = await storageManager.getLogs();
        const filteredLogs = logs.filter(log => log.siteId !== siteId);
        await storageManager.saveLogs(filteredLogs);
    }

    /**
     * 清除过期日志（根据配置的保留天数）
     * @returns {Promise<number>} 清除的日志数量
     */
    async clearOldLogs() {
        const logs = await storageManager.getLogs();
        const now = Date.now();
        const maxAge = LOG_CONFIG.MAX_DAYS * 24 * 60 * 60 * 1000;
        
        const filteredLogs = logs.filter(log => {
            return (now - log.timestamp) < maxAge;
        });
        
        const removedCount = logs.length - filteredLogs.length;
        
        if (removedCount > 0) {
            await storageManager.saveLogs(filteredLogs);
        }
        
        return removedCount;
    }

    /**
     * 清理日志（保留最近的N条记录）
     * @returns {Promise<number>} 清除的日志数量
     */
    async trimLogs() {
        const logs = await storageManager.getLogs();
        
        if (logs.length <= LOG_CONFIG.MAX_LOGS) {
            return 0;
        }
        
        // 保留最近的记录
        const trimmedLogs = logs.slice(0, LOG_CONFIG.MAX_LOGS);
        await storageManager.saveLogs(trimmedLogs);
        
        return logs.length - trimmedLogs.length;
    }

    /**
     * 自动清理日志（同时执行过期清理和数量限制）
     * @returns {Promise<Object>} 清理结果
     */
    async autoCleanup() {
        const oldCount = await this.clearOldLogs();
        const trimCount = await this.trimLogs();
        
        return {
            removedByAge: oldCount,
            removedByCount: trimCount,
            total: oldCount + trimCount
        };
    }

    /**
     * 导出日志为JSON
     * @param {Object} options - 导出选项
     * @returns {Promise<string>} JSON字符串
     */
    async exportLogs(options = {}) {
        const logs = await this.getLogs(options);
        const stats = await this.getStats();
        
        const exportData = {
            logs,
            stats,
            exportTime: Date.now(),
            version: '1.0.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 搜索日志
     * @param {string} keyword - 关键词
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 匹配的日志
     */
    async searchLogs(keyword, limit = 100) {
        const logs = await storageManager.getLogs();
        
        const lowerKeyword = keyword.toLowerCase();
        const results = logs.filter(log => {
            return (
                log.siteName.toLowerCase().includes(lowerKeyword) ||
                log.message.toLowerCase().includes(lowerKeyword)
            );
        });
        
        return results.slice(0, limit);
    }

    /**
     * 添加日志记录（内部方法）
     * @param {Object} logData - 日志数据
     * @returns {Promise<void>}
     * @private
     */
    async _addLog(logData) {
        await storageManager.addLog(logData);
        
        // 自动清理（避免日志过多）
        await this.autoCleanup();
    }

    /**
     * 格式化日志消息
     * @param {Object} log - 日志对象
     * @returns {string} 格式化的消息
     */
    formatLog(log) {
        const date = new Date(log.timestamp);
        const timeStr = date.toLocaleString('zh-CN');
        const statusIcon = log.status === SYNC_STATUS.SUCCESS ? '✓' : 
                          log.status === SYNC_STATUS.FAILED ? '✗' : '○';
        
        return `[${timeStr}] ${statusIcon} ${log.siteName}: ${log.message}`;
    }

    /**
     * 获取日志的相对时间描述
     * @param {number} timestamp - 时间戳
     * @returns {string} 相对时间描述
     */
    getRelativeTime(timestamp) {
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
}

// 导出单例
export const logger = new Logger();
export default logger;

