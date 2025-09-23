/**
 * TXT Creator - 简单快速的文本文件创建工具
 *
 * 设计理念：
 * 提供最简洁的接口来创建文本文件，解决日常开发中频繁需要创建临时文件、
 * 测试数据、笔记记录等场景的痛点。通过最少的参数实现最直接的功能。
 *
 * 核心价值：
 * - 简单性：只需文件名即可创建文件
 * - 便利性：支持自定义内容和时间戳
 * - 安全性：自动处理文件名冲突和路径安全
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'txt-creator',
      name: 'TXT文件创建器',
      description: '快速在当前目录创建文本文件，支持自定义内容和时间戳',
      version: '1.0.0',
      author: '鲁班',
      category: 'file-utility',
      manual: '@manual://txt-creator'
    };
  },

  getSchema() {
    return {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: '文件名（不需要.txt扩展名，会自动添加）',
          minLength: 1,
          pattern: '^[^<>:"/\\|?*]+$'  // 禁止文件名中的非法字符
        },
        content: {
          type: 'string',
          description: '文件内容（可选，默认为空文件）',
          default: ''
        },
        timestamp: {
          type: 'boolean',
          description: '是否在文件名后添加时间戳（避免重名冲突）',
          default: false
        }
      },
      required: ['filename']
    };
  },

  validate(params) {
    const errors = [];
    
    // 验证文件名
    if (!params.filename || typeof params.filename !== 'string') {
      errors.push('filename 参数是必需的且必须是字符串');
    } else {
      // 检查文件名中的非法字符
      const invalidChars = /[<>:"/\\|?*]/;
      if (invalidChars.test(params.filename)) {
        errors.push('文件名包含非法字符: < > : " / \\ | ? *');
      }
      
      // 检查文件名长度
      if (params.filename.length > 200) {
        errors.push('文件名过长（最大200字符）');
      }
    }
    
    // 验证内容
    if (params.content && typeof params.content !== 'string') {
      errors.push('content 参数必须是字符串');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  async execute(params) {
    try {
      // 🚀 使用importx统一导入模块
      const fs = await importx('fs');
      const path = await importx('path');
      
      const { filename, content = '', timestamp = false } = params;
      
      // 构建完整的文件名
      let fullFilename = filename;
      
      // 如果没有.txt扩展名，自动添加
      if (!fullFilename.toLowerCase().endsWith('.txt')) {
        fullFilename += '.txt';
      }
      
      // 如果启用时间戳，在文件名中插入时间戳
      if (timestamp) {
        const now = new Date();
        const timeStr = now.toISOString()
          .replace(/[:.]/g, '')
          .replace('T', '_')
          .slice(0, 15); // YYYYMMDD_HHMMSS
        
        const ext = path.extname(fullFilename);
        const name = path.basename(fullFilename, ext);
        fullFilename = `${name}_${timeStr}${ext}`;
      }
      
      // 获取当前工作目录
      const currentDir = process.cwd();
      const fullPath = path.join(currentDir, fullFilename);
      
      // 检查文件是否已存在（当未启用时间戳时）
      if (!timestamp && fs.existsSync(fullPath)) {
        return {
          success: false,
          error: '文件已存在',
          message: `文件 ${fullFilename} 已存在。可使用 timestamp: true 避免冲突。`,
          suggestion: '设置 timestamp: true 或使用不同的文件名'
        };
      }
      
      // 创建文件内容（如果没有内容，创建带时间戳的默认内容）
      let fileContent = content;
      if (!content && content !== '') {
        const now = new Date().toLocaleString('zh-CN');
        fileContent = `# ${filename}\n\n创建时间: ${now}\n\n`;
      }
      
      // 写入文件
      await fs.promises.writeFile(fullPath, fileContent, 'utf8');
      
      // 获取文件信息
      const stats = await fs.promises.stat(fullPath);
      
      return {
        success: true,
        message: `成功创建文件: ${fullFilename}`,
        filePath: fullPath,
        filename: fullFilename,
        size: stats.size,
        contentLength: fileContent.length,
        timestamp: timestamp,
        directory: currentDir
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: '文件创建失败',
        suggestion: '请检查文件名是否有效，以及是否有写入权限'
      };
    }
  }
};