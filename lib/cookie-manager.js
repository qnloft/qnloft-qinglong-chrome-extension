// Cookie管理器 - 获取和处理Cookie

import { ERROR_MESSAGES } from './constants.js';

/**
 * Cookie管理器类
 */
class CookieManager {
    /**
     * 获取指定URL的所有Cookie
     * @param {string} url - 目标URL
     * @returns {Promise<string>} Cookie字符串（格式：name1=value1;name2=value2;...）
     */
    async getAllCookies(url) {
        try {
            // 获取URL对应的所有Cookie
            const cookies = await chrome.cookies.getAll({ url });

            if (!cookies || cookies.length === 0) {
                throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
            }

            // 转换为Cookie字符串
            const cookieString = this._cookiesToString(cookies);

            if (!cookieString) {
                throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
            }

            return cookieString;
        } catch (error) {
            console.error('获取Cookie失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定URL的特定Cookie
     * @param {string} url - 目标URL
     * @param {string} name - Cookie名称
     * @returns {Promise<Object|null>} Cookie对象或null
     */
    async getCookie(url, name) {
        try {
            const cookie = await chrome.cookies.get({ url, name });
            return cookie;
        } catch (error) {
            console.error('获取Cookie失败:', error);
            return null;
        }
    }

    /**
     * 获取指定域名的所有Cookie
     * @param {string} domain - 域名（如：.jd.com）
     * @returns {Promise<Array>} Cookie数组
     */
    async getCookiesByDomain(domain) {
        try {
            const cookies = await chrome.cookies.getAll({ domain });
            return cookies || [];
        } catch (error) {
            console.error('获取域名Cookie失败:', error);
            return [];
        }
    }

    /**
     * 检查指定URL是否有Cookie
     * @param {string} url - 目标URL
     * @returns {Promise<boolean>} 是否有Cookie
     */
    async hasCookies(url) {
        try {
            const cookies = await chrome.cookies.getAll({ url });
            return cookies && cookies.length > 0;
        } catch (error) {
            console.error('检查Cookie失败:', error);
            return false;
        }
    }

    /**
     * 获取指定URL的Cookie数量
     * @param {string} url - 目标URL
     * @returns {Promise<number>} Cookie数量
     */
    async getCookieCount(url) {
        try {
            const cookies = await chrome.cookies.getAll({ url });
            return cookies ? cookies.length : 0;
        } catch (error) {
            console.error('获取Cookie数量失败:', error);
            return 0;
        }
    }

    /**
     * 监听Cookie变化
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消监听的函数
     */
    onCookieChanged(callback) {
        const listener = (changeInfo) => {
            callback(changeInfo);
        };

        chrome.cookies.onChanged.addListener(listener);

        // 返回取消监听的函数
        return () => {
            chrome.cookies.onChanged.removeListener(listener);
        };
    }

    /**
     * 监听特定URL的Cookie变化
     * @param {string} url - 目标URL
     * @param {Function} callback - 回调函数，参数为(cookie, removed)
     * @returns {Function} 取消监听的函数
     */
    onUrlCookieChanged(url, callback) {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        const listener = (changeInfo) => {
            // 检查Cookie是否属于目标域名
            if (changeInfo.cookie.domain.includes(domain) || 
                domain.includes(changeInfo.cookie.domain.replace(/^\./, ''))) {
                callback(changeInfo.cookie, changeInfo.removed);
            }
        };

        chrome.cookies.onChanged.addListener(listener);

        return () => {
            chrome.cookies.onChanged.removeListener(listener);
        };
    }

    /**
     * 获取Cookie的详细信息
     * @param {string} url - 目标URL
     * @returns {Promise<Object>} Cookie详细信息
     */
    async getCookieDetails(url) {
        try {
            const cookies = await chrome.cookies.getAll({ url });

            return {
                url,
                count: cookies.length,
                cookies: cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite,
                    expirationDate: cookie.expirationDate,
                    session: cookie.session
                })),
                cookieString: this._cookiesToString(cookies),
                totalSize: this._calculateCookieSize(cookies)
            };
        } catch (error) {
            console.error('获取Cookie详情失败:', error);
            throw error;
        }
    }

    /**
     * 从URL提取域名
     * @param {string} url - URL
     * @returns {string} 域名
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            console.error('提取域名失败:', error);
            return '';
        }
    }

    /**
     * 验证Cookie是否有效（未过期）
     * @param {Object} cookie - Cookie对象
     * @returns {boolean} 是否有效
     */
    isCookieValid(cookie) {
        if (!cookie) {
            return false;
        }

        // 会话Cookie没有过期时间，被认为是有效的
        if (cookie.session) {
            return true;
        }

        // 检查是否过期
        if (cookie.expirationDate) {
            const expirationTime = cookie.expirationDate * 1000;
            return Date.now() < expirationTime;
        }

        return true;
    }

    /**
     * 过滤有效的Cookie
     * @param {Array} cookies - Cookie数组
     * @returns {Array} 有效的Cookie数组
     */
    filterValidCookies(cookies) {
        return cookies.filter(cookie => this.isCookieValid(cookie));
    }

    /**
     * Cookie数组转换为字符串
     * @param {Array} cookies - Cookie数组
     * @returns {string} Cookie字符串
     * @private
     */
    _cookiesToString(cookies) {
        if (!cookies || cookies.length === 0) {
            return '';
        }

        // 只使用有效的Cookie
        const validCookies = this.filterValidCookies(cookies);

        const cookieString = validCookies
            .map(cookie => `${cookie.name}=${cookie.value}`)
            .join(';');

        // 确保Cookie字符串以分号结尾
        return cookieString ? cookieString + ';' : '';
    }

    /**
     * 计算Cookie总大小（字节）
     * @param {Array} cookies - Cookie数组
     * @returns {number} 总大小（字节）
     * @private
     */
    _calculateCookieSize(cookies) {
        if (!cookies || cookies.length === 0) {
            return 0;
        }

        return cookies.reduce((total, cookie) => {
            const size = (cookie.name.length + cookie.value.length);
            return total + size;
        }, 0);
    }

    /**
     * 格式化Cookie大小为可读字符串
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    formatCookieSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    /**
     * 获取Cookie的过期时间描述
     * @param {Object} cookie - Cookie对象
     * @returns {string} 过期时间描述
     */
    getCookieExpiry(cookie) {
        if (!cookie) {
            return '未知';
        }

        if (cookie.session) {
            return '会话结束时';
        }

        if (cookie.expirationDate) {
            const expirationTime = cookie.expirationDate * 1000;
            const now = Date.now();

            if (expirationTime < now) {
                return '已过期';
            }

            const diff = expirationTime - now;
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

            if (days > 0) {
                return `${days}天后`;
            } else if (hours > 0) {
                return `${hours}小时后`;
            } else {
                return '即将过期';
            }
        }

        return '永久';
    }

    /**
     * 比较两个Cookie字符串是否相同
     * @param {string} cookie1 - Cookie字符串1
     * @param {string} cookie2 - Cookie字符串2
     * @returns {boolean} 是否相同
     */
    compareCookies(cookie1, cookie2) {
        if (!cookie1 && !cookie2) {
            return true;
        }

        if (!cookie1 || !cookie2) {
            return false;
        }

        // 将Cookie字符串转换为对象以便比较
        const obj1 = this._parseCookieString(cookie1);
        const obj2 = this._parseCookieString(cookie2);

        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();

        if (keys1.length !== keys2.length) {
            return false;
        }

        return keys1.every((key, index) => {
            return key === keys2[index] && obj1[key] === obj2[key];
        });
    }

    /**
     * 获取指定URL的特定Cookie
     * @param {string} url - 目标URL
     * @param {Array<string>} cookieNames - 要获取的Cookie名称数组
     * @returns {Promise<string>} Cookie字符串（格式：name1=value1;name2=value2;...）
     */
    async getSelectedCookies(url, cookieNames) {
        try {
            // 获取URL对应的所有Cookie
            const cookies = await chrome.cookies.getAll({ url });

            if (!cookies || cookies.length === 0) {
                throw new Error(ERROR_MESSAGES.COOKIE_NOT_FOUND);
            }

            // 过滤出指定的Cookie
            const selectedCookies = cookies.filter(cookie => 
                cookieNames.includes(cookie.name)
            );

            if (selectedCookies.length === 0) {
                throw new Error('未找到指定的Cookie');
            }

            // 转换为Cookie字符串
            const cookieString = this._cookiesToString(selectedCookies);

            if (!cookieString) {
                throw new Error('Cookie转换失败');
            }

            return cookieString;
        } catch (error) {
            console.error('获取选中Cookie失败:', error);
            throw error;
        }
    }

    /**
     * 删除指定URL的所有Cookie
     * @param {string} url - 目标URL
     * @returns {Promise<number>} 删除的Cookie数量
     */
    async deleteAllCookies(url) {
        try {
            // 获取URL对应的所有Cookie
            const cookies = await chrome.cookies.getAll({ url });

            if (!cookies || cookies.length === 0) {
                return 0;
            }

            let deletedCount = 0;

            // 逐个删除Cookie
            for (const cookie of cookies) {
                try {
                    await chrome.cookies.remove({
                        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                        name: cookie.name
                    });
                    deletedCount++;
                } catch (error) {
                    console.warn(`删除Cookie失败: ${cookie.name}`, error);
                }
            }

            console.log(`已删除 ${deletedCount} 个Cookie`);
            return deletedCount;
        } catch (error) {
            console.error('删除Cookie失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定Cookie名称的Cookie数量（重载版本）
     * @param {string} url - 目标URL
     * @param {Array<string>} cookieNames - Cookie名称数组
     * @returns {Promise<number>} 指定Cookie的数量
     */
    async getCookieCount(url, cookieNames = null) {
        try {
            const cookies = await chrome.cookies.getAll({ url });
            
            if (!cookies || cookies.length === 0) {
                return 0;
            }

            // 如果指定了Cookie名称，则只计算这些Cookie的数量
            if (cookieNames && cookieNames.length > 0) {
                return cookies.filter(cookie => 
                    cookieNames.includes(cookie.name)
                ).length;
            }

            // 否则返回所有Cookie的数量
            return cookies.length;
        } catch (error) {
            console.error('获取Cookie数量失败:', error);
            return 0;
        }
    }

    /**
     * 解析Cookie字符串为对象
     * @param {string} cookieString - Cookie字符串
     * @returns {Object} Cookie对象
     * @private
     */
    _parseCookieString(cookieString) {
        const obj = {};
        cookieString.split(';').forEach(pair => {
            const [name, value] = pair.trim().split('=');
            if (name && value) {
                obj[name] = value;
            }
        });
        return obj;
    }
}

// 导出单例
export const cookieManager = new CookieManager();
export default cookieManager;

