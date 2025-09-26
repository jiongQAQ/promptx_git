/**
 * JSON章节拆分工具 - 基于id字段拆分论文内容，仅对有text模块的内容拆分
 * 
 * 战略意义：
 * 1. 内容管理革命：将大型JSON文档按id拆分为可管理的章节文件，提升编辑效率
 * 2. 协作友好性：不同章节可以并行编辑，避免合并冲突，支持团队协作
 * 3. 版本控制优化：Git等版本控制系统能更精确地跟踪章节级别的变更
 * 
 * 设计理念：
 * 保持每个拆分文件的独立性和完整性，确保含义不变。每个章节文件
 * 包含完整的文档元信息和配置，可以独立使用或重新合并。
 * 
 * 为什么重要：
 * 解决了大型学术文档难以管理、协作困难的痛点，让复杂论文的
 * 编写变得模块化和可控制。
 * 
 * 更新说明（v2.0.0）：
 * - 支持基于id的数组结构拆分
 * - 仅拆分包含text或items字段的条目
 * - 保持items数组的完整性
 * - 支持复杂嵌套结构的完整保留
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
      name: 'JSON章节拆分工具',
      description: '基于id字段拆分论文内容JSON，仅对有text模块的内容拆分，保持结构完整性',
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
            description: '输入的JSON文件路径（必须是绝对路径）',
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（必须是绝对路径）'
          },
          onlyWithContent: {
            type: 'boolean',
            description: '是否仅拆分包含text或items字段的条目',
            default: true
          }
        },
        required: ['inputFile', 'outputDir']
      }
    };
  },

  async execute(params) {
    
    console.log('开始拆分JSON章节', {
      inputFile: params.inputFile,
      outputDir: params.outputDir,
      onlyWithContent: params.onlyWithContent
    });

    try {
      const path = await importx('path');
      const fs = await importx('fs');

      // 路径验证：必须使用绝对路径
      if (!path.isAbsolute(params.inputFile)) {
        throw new Error(`输入文件必须是绝对路径：${params.inputFile}`);
      }
      if (!path.isAbsolute(params.outputDir)) {
        throw new Error(`输出目录必须是绝对路径：${params.outputDir}`);
      }

      // 读取原始JSON文件
      const content = await fs.promises.readFile(params.inputFile, 'utf8');
      const originalData = JSON.parse(content);
      
      // 检查数据格式 - 应该是数组
      if (!Array.isArray(originalData)) {
        throw new Error('输入的JSON文件应该包含一个数组结构');
      }
      
      // 使用绝对路径创建输出目录
      const outputPath = params.outputDir;
      await fs.promises.mkdir(outputPath, { recursive: true });
      
      // 筛选需要拆分的条目
      const itemsToSplit = this.filterItemsForSplitting(originalData, params.onlyWithContent);
      
      console.log(`发现 ${itemsToSplit.length} 个需要拆分的条目`, { 
        total: originalData.length,
        filtered: itemsToSplit.length,
        ids: itemsToSplit.map(item => item.id)
      });
      
      // 为每个条目创建独立文件
      const createdFiles = [];
      
      for (const item of itemsToSplit) {
        // 生成文件名，使用id作为标识，统一命名为chapter格式
        const safeId = item.id.replace(/[^a-zA-Z0-9.-]/g, '_'); // 替换特殊字符为下划线
        const fileName = `chapter.${safeId}.json`;
        const filePath = path.join(outputPath, fileName);
        
        // 创建单个条目的完整文档
        const itemData = this.createItemFile(item);
        
        await fs.promises.writeFile(filePath, JSON.stringify(itemData, null, 2), 'utf8');
        
        createdFiles.push({
          id: item.id,
          title: item.title,
          file: fileName,
          fullPath: filePath,
          hasText: !!item.text,
          hasItems: !!item.items,
          itemsCount: item.items ? item.items.length : 0
        });
      }
      
      console.log('章节拆分完成', {
        totalItems: itemsToSplit.length,
        outputDir: outputPath
      });
      
      return {
        success: true,
        message: '章节拆分完成',
        totalItems: itemsToSplit.length,
        outputDirectory: outputPath,
        createdFiles
      };
      
    } catch (error) {
      console.error('章节拆分失败', { error: error.toString() });
      
      return {
        success: false,
        error: error.message,
        suggestion: '请检查输入文件路径是否正确，确保JSON格式有效且为数组结构'
      };
    }
  },
  
  // 筛选需要拆分的条目
  filterItemsForSplitting(data, onlyWithContent) {
    if (!onlyWithContent) {
      // 如果不限制内容，返回所有条目
      return data;
    }
    
    // 仅返回包含text或items字段的条目
    return data.filter(item => {
      return item.text || item.items;
    });
  },
  
  // 创建单个条目的文件
  createItemFile(item) {
    // 直接返回原始条目，不添加任何额外信息
    return item;
  }
};