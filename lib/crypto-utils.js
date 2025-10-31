// 加密工具 - 使用Web Crypto API加密敏感信息

/**
 * 加密工具类
 * 使用AES-GCM算法加密敏感信息（如Client Secret）
 */
class CryptoUtils {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // GCM推荐12字节
        this.saltLength = 16;
        this.iterations = 100000; // PBKDF2迭代次数
    }

    /**
     * 加密文本
     * @param {string} plaintext - 明文
     * @param {string} password - 密码（可选，默认使用扩展ID）
     * @returns {Promise<string>} Base64编码的加密数据
     */
    async encrypt(plaintext, password = null) {
        try {
            // 如果没有提供密码，使用扩展ID作为密钥源
            const keySource = password || await this._getExtensionId();
            
            // 生成随机盐值
            const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
            
            // 从密码派生密钥
            const key = await this._deriveKey(keySource, salt);
            
            // 生成随机IV
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // 编码明文
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            // 加密
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );
            
            // 组合: salt + iv + ciphertext
            const combined = new Uint8Array(
                salt.length + iv.length + ciphertext.byteLength
            );
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
            
            // 转换为Base64
            return this._arrayBufferToBase64(combined);
            
        } catch (error) {
            console.error('加密失败:', error);
            throw new Error('加密失败');
        }
    }

    /**
     * 解密文本
     * @param {string} encryptedData - Base64编码的加密数据
     * @param {string} password - 密码（可选，默认使用扩展ID）
     * @returns {Promise<string>} 明文
     */
    async decrypt(encryptedData, password = null) {
        try {
            // 验证输入
            if (!encryptedData || typeof encryptedData !== 'string') {
                throw new Error('加密数据无效：输入为空或不是字符串类型');
            }

            // 如果没有提供密码，使用扩展ID作为密钥源
            const keySource = password || await this._getExtensionId();
            
            // 从Base64解码（这里会抛出详细的错误信息）
            const combined = this._base64ToArrayBuffer(encryptedData);
            
            // 验证数据长度是否足够（至少需要salt + iv）
            const minLength = this.saltLength + this.ivLength;
            if (combined.length < minLength) {
                throw new Error(`加密数据长度不足：期望至少${minLength}字节，实际${combined.length}字节`);
            }
            
            // 提取salt、iv和ciphertext
            const salt = combined.slice(0, this.saltLength);
            const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
            const ciphertext = combined.slice(this.saltLength + this.ivLength);
            
            // 验证ciphertext不为空
            if (ciphertext.length === 0) {
                throw new Error('加密数据无效：密文为空');
            }
            
            // 从密码派生密钥
            const key = await this._deriveKey(keySource, salt);
            
            // 解密
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                ciphertext
            );
            
            // 解码为文本
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
            
        } catch (error) {
            // 如果是我们自己的错误，直接抛出
            if (error.message.includes('Base64') || 
                error.message.includes('加密数据') || 
                error.message.includes('无效')) {
                console.error('解密失败:', error.message);
                throw error;
            }
            
            // 其他错误（如解密失败）也抛出更详细的错误
            console.error('解密失败:', error);
            throw new Error(`解密失败: ${error.message || '未知错误'}`);
        }
    }

    /**
     * 从密码派生密钥
     * @param {string} password - 密码
     * @param {Uint8Array} salt - 盐值
     * @returns {Promise<CryptoKey>} 派生的密钥
     * @private
     */
    async _deriveKey(password, salt) {
        // 导入密码作为基础密钥
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        // 使用PBKDF2派生密钥
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            passwordKey,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 获取扩展ID作为密钥源
     * @returns {Promise<string>} 扩展ID
     * @private
     */
    async _getExtensionId() {
        // 在Chrome扩展中，使用扩展ID + 固定字符串作为密钥源
        const extensionId = chrome.runtime.id;
        return `${extensionId}-qinglong-cookie-sync`;
    }

    /**
     * ArrayBuffer转Base64
     * @param {ArrayBuffer|Uint8Array} buffer - 数据
     * @returns {string} Base64字符串
     * @private
     */
    _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64转ArrayBuffer
     * @param {string} base64 - Base64字符串
     * @returns {Uint8Array} 数据
     * @private
     */
    _base64ToArrayBuffer(base64) {
        if (!base64 || typeof base64 !== 'string') {
            throw new Error('Base64字符串无效：输入为空或不是字符串类型');
        }

        // 清理base64字符串：移除空白字符和无效字符
        let cleaned = base64.trim().replace(/[\s\n\r\t]/g, '');
        
        // 验证base64格式（只允许A-Z, a-z, 0-9, +, /, =）
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleaned)) {
            throw new Error(`Base64字符串格式无效：包含非法字符。字符串长度: ${cleaned.length}`);
        }

        // 验证长度（base64长度必须是4的倍数，或者余数为2或3用于padding）
        if (cleaned.length === 0) {
            throw new Error('Base64字符串为空');
        }

        try {
            const binary = atob(cleaned);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        } catch (error) {
            throw new Error(`Base64解码失败: ${error.message}。字符串长度: ${cleaned.length}, 前50个字符: ${cleaned.substring(0, 50)}`);
        }
    }

    /**
     * 生成随机字符串（可用于生成临时密码等）
     * @param {number} length - 长度
     * @returns {string} 随机字符串
     */
    generateRandomString(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 哈希字符串（SHA-256）
     * @param {string} text - 文本
     * @returns {Promise<string>} 哈希值（十六进制）
     */
    async hash(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// 导出单例
export const cryptoUtils = new CryptoUtils();
export default cryptoUtils;

