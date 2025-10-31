// 京东Cookie处理工具
// 提供京东Cookie验证和青龙环境变量匹配功能

/**
 * 京东Cookie处理类
 * 支持Cookie有效性验证和智能环境变量匹配
 */
class JDHandler {
    constructor() {
        // 京东API配置
        this.API_URL = 'https://me-api.jd.com/user_new/info/GetJDUserInfoUnion';
        this.REFERER = 'https://home.m.jd.com/';
        this.CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
        this.cache = new Map();
    }

    /**
     * 验证Cookie有效性
     * 通过调用京东API检查Cookie是否有效且未过期
     * 
     * @param {string} cookieString - Cookie字符串
     * @returns {Promise<Object>} 验证结果 { valid: boolean, reason?: string, data?: object }
     */
    async validateCookies(cookieString) {
        console.log('[JD] 开始验证京东Cookie');

        try {
            // 1. 检查必要的Cookie字段
            const ptKey = this._getCookieValue(cookieString, 'pt_key');
            const ptPin = this._getCookieValue(cookieString, 'pt_pin');

            if (!ptKey || !ptPin) {
                console.warn('[JD] Cookie中缺少pt_key或pt_pin');
                return {
                    valid: false,
                    reason: 'Cookie中缺少必要字段（pt_key或pt_pin）',
                };
            }

            // 2. 检查缓存
            const cacheKey = `validate:${ptPin}`;
            const cached = this._getCache(cacheKey);
            
            if (cached) {
                console.log('[JD] 使用缓存的验证结果');
                return cached;
            }

            // 3. 调用京东API验证
            console.log('[JD] 调用京东API验证Cookie');
            const response = await fetch(this.API_URL, {
                method: 'GET',
                headers: {
                    'Cookie': cookieString,
                    'Referer': this.REFERER,
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                },
            });

            // 4. 解析响应
            if (!response.ok) {
                console.error(`[JD] API请求失败: ${response.status} ${response.statusText}`);
                return {
                    valid: false,
                    reason: `API请求失败: ${response.status}`,
                };
            }

            const data = await response.json();
            console.log('[JD] API响应:', data);

            // 5. 判断Cookie是否有效
            // retcode === '0' 或 0 表示登录有效
            // retcode === '1001' 表示未登录或Cookie失效
            const isValid = data.retcode === '0' || data.retcode === 0;
            
            const result = {
                valid: isValid,
                reason: isValid ? '验证成功' : `验证失败: ${data.retcode}`,
                data: isValid ? {
                    nickname: data.data?.userInfo?.baseInfo?.nickname || '',
                    headImageUrl: data.data?.userInfo?.baseInfo?.headImageUrl || '',
                    ptPin: ptPin,
                } : null,
            };

            // 6. 缓存结果
            if (isValid) {
                this._setCache(cacheKey, result);
                console.log(`[JD] Cookie验证成功，已缓存结果（用户: ${result.data.nickname}）`);
            } else {
                console.warn(`[JD] Cookie验证失败: ${result.reason}`);
            }

            return result;

        } catch (error) {
            console.error('[JD] Cookie验证异常:', error);
            return {
                valid: false,
                reason: `验证过程出错: ${error.message}`,
            };
        }
    }

    /**
     * 匹配青龙面板环境变量
     * 根据pt_pin智能匹配对应的JD_COOKIE环境变量
     * 
     * @param {Array} envList - 青龙面板环境变量列表
     * @param {string} cookieString - Cookie字符串
     * @returns {Promise<Object>} 匹配结果 { matched: boolean, envId?: number, reason?: string }
     */
    async matchQLEnv(envList, cookieString) {
        console.log('[JD] 开始匹配青龙环境变量');

        try {
            // 1. 从Cookie中提取pt_pin
            const ptPin = this._extractPtPin(cookieString);

            if (!ptPin) {
                console.warn('[JD] Cookie中未找到pt_pin');
                return {
                    matched: false,
                    reason: 'Cookie中未找到pt_pin',
                };
            }

            console.log(`[JD] 当前pt_pin: ${ptPin}`);

            // 2. 过滤出所有JD_COOKIE环境变量
            const jdCookies = envList.filter(env => 
                env.name === 'JD_COOKIE' && env.status !== undefined
            );

            if (jdCookies.length === 0) {
                console.warn('[JD] 青龙面板中未找到JD_COOKIE环境变量');
                return {
                    matched: false,
                    reason: '青龙面板中未找到JD_COOKIE环境变量',
                };
            }

            console.log(`[JD] 找到 ${jdCookies.length} 个JD_COOKIE环境变量`);

            // 3. 遍历查找匹配的环境变量
            for (const env of jdCookies) {
                const envPtPin = this._extractPtPin(env.value);

                if (envPtPin && envPtPin === ptPin) {
                    console.log(`[JD] 找到匹配的环境变量 (ID: ${env.id}, pt_pin: ${envPtPin})`);
                    return {
                        matched: true,
                        envId: env.id,
                        env: env, // 返回完整的环境变量对象
                    };
                }
            }

            // 4. 未找到匹配
            console.log(`[JD] 未找到匹配的环境变量 (pt_pin: ${ptPin})`);
            return {
                matched: false,
                reason: `未找到pt_pin为 ${ptPin} 的环境变量`,
            };

        } catch (error) {
            console.error('[JD] 匹配环境变量异常:', error);
            return {
                matched: false,
                reason: `匹配过程出错: ${error.message}`,
            };
        }
    }

    /**
     * 判断域名是否为京东域名
     * @param {string} domain - 域名
     * @returns {boolean}
     */
    isJDDomain(domain) {
        if (!domain) return false;
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
        return normalizedDomain === 'jd.com' || normalizedDomain.endsWith('.jd.com');
    }

    /**
     * 从Cookie字符串中提取pt_pin值
     * @param {string} cookieString - Cookie字符串
     * @returns {string|null} pt_pin值（已解码）或null
     * @private
     */
    _extractPtPin(cookieString) {
        if (!cookieString) {
            return null;
        }

        try {
            const ptPin = this._getCookieValue(cookieString, 'pt_pin');
            
            if (!ptPin) {
                return null;
            }

            // pt_pin通常是URL编码的，需要解码
            // 例如：%E4%BA%AC%E4%B8%9C%E7%94%A8%E6%88%B7 => 京东用户
            return decodeURIComponent(ptPin);
        } catch (error) {
            console.error('[JD] 解析pt_pin失败:', error);
            return null;
        }
    }

    /**
     * 从Cookie字符串中获取指定名称的Cookie值
     * @param {string} cookieString - Cookie字符串（格式：name1=value1; name2=value2）
     * @param {string} name - Cookie名称
     * @returns {string|null}
     * @private
     */
    _getCookieValue(cookieString, name) {
        if (!cookieString || !name) {
            return null;
        }

        const cookies = cookieString.split(';').map(c => c.trim());
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=');
            if (cookieName === name) {
                return cookieValue || '';
            }
        }

        return null;
    }

    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @returns {any|null}
     * @private
     */
    _getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now > cached.expireAt) {
            this.cache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @private
     */
    _setCache(key, value) {
        this.cache.set(key, {
            value,
            expireAt: Date.now() + this.CACHE_DURATION,
        });
    }
}

// 导出单例
const jdHandler = new JDHandler();
export default jdHandler;
export { JDHandler };
