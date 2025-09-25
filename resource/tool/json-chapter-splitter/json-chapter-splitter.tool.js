/**
 * JSON文本内容拆分工具 - 将包含text字段的JSON模块拆分为独立文件
 * 
 * 战略意义：
 * 1. 内容管理精细化：将包含实际文本内容的模块提取为独立文件，便于编辑和管理
 * 2. 协作友好性：文本内容可以独立编辑，避免合并冲突，支持并行创作
 * 3. 版本控制优化：Git能精确跟踪文本内容的变更，提升协作效率
 * 
 * 设计理念：
 * 识别并提取所有包含text字段的JSON项目，每个项目生成独立文件。
 * 保持原始数据结构不变，确保提取的内容具有完整的上下文信息。
 * 
 * 为什么重要：
 * 解决了混合结构JSON文档中文本内容难以独立管理的问题，
 * 让内容创作和结构管理实现分离，提升编辑效率。
 */

module.exports = {
  getDependencies() {
    return {
      'path': 'latest',
      'fs': 'latest'
    };
  },

  getMetadata() {
    return {
      id: 'json-chapter-splitter',
      name: 'JSON文本内容拆分工具',
      description: '将包含text字段的JSON模块拆分为独立文件',
      version: '2.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          inputFile: {
            type: 'string',
            description: '输入JSON文件的绝对路径'
          },
          outputDir: {
            type: 'string',
            description: '输出目录的绝对路径'
          },
          filePrefix: {
            type: 'string',
            description: '输出文件名前缀',
            default: 'text-content'
          }
        },
        required: ['inputFile', 'outputDir']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始拆分包含text字段的JSON内容', {
      inputFile: params.inputFile,
      outputDir: params.outputDir
    });

    try {
      const path = await api.importx('path');
      const fs = await api.importx('fs');

      // 路径验证
      if (!path.isAbsolute(params.inputFile)) {
        throw new Error(`输入文件必须是绝对路径：${params.inputFile}`);
      }
      if (!path.isAbsolute(params.outputDir)) {
        throw new Error(`输出目录必须是绝对路径：${params.outputDir}`);
      }

      // 读取JSON文件
      const content = await fs.promises.readFile(params.inputFile, 'utf8');
      const jsonData = JSON.parse(content);
      
      // 检查是否为数组格式
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON文件必须是数组格式');
      }
      
      // 创建输出目录
      await fs.promises.mkdir(params.outputDir, { recursive: true });
      
      // 找到所有包含text字段的项目
      const textItems = this.extractTextItems(jsonData);
      
      api.logger.info(`发现 ${textItems.length} 个包含text字段的项目`);
      
      // 为每个项目创建独立文件
      const createdFiles = [];
      const filePrefix = params.filePrefix || 'text-content';
      
      for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];
        const fileName = `${filePrefix}-${item.id || i + 1}.json`;
        const filePath = path.join(params.outputDir, fileName);
        
        // 保存完整的项目数据
        await fs.promises.writeFile(
          filePath, 
          JSON.stringify(item.data, null, 2), 
          'utf8'
        );
        
        createdFiles.push({
          id: item.id,
          title: item.title,
          fileName: fileName,
          fullPath: filePath,
          textLength: item.textLength
        });
      }
      
      api.logger.info('文本内容拆分完成', {
        totalItems: textItems.length,
        outputDir: params.outputDir
      });
      
      return {
        success: true,
        message: `成功拆分 ${textItems.length} 个包含text字段的项目`,
        totalItems: textItems.length,
        outputDirectory: params.outputDir,
        createdFiles
      };
      
    } catch (error) {
      api.logger.error('拆分失败', error);
      
      return {
        success: false,
        error: error.message,
        suggestion: '请检查输入文件路径是否正确，确保JSON格式有效且为数组结构'
      };
    }
  },
  
  // 提取所有包含text字段的项目
  extractTextItems(jsonArray) {
    const textItems = [];
    
    for (const item of jsonArray) {
      if (item.text && typeof item.text === 'string' && item.text.trim()) {
        textItems.push({
          id: item.id || 'unknown',
          title: item.title || '无标题',
          textLength: item.text.length,
          data: item  // 保存完整数据
        });
      }
    }
    
    return textItems;
  }
};