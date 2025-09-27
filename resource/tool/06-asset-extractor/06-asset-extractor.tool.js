/**
 * 06-asset-extractor - 智能资源提取器
 * 
 * 战略意义：
 * 1. 架构价值：通过递归扫描确保论文项目中的所有图表资源都被正确提取和分类
 * 2. 平台价值：为后续的图表生成、内容处理工具提供标准化的资源索引
 * 3. 生态价值：作为论文工作流的关键节点，连接内容规划与资源生成环节
 * 
 * 设计理念：
 * 不仅处理 content-plan.json 的顶层资源，更要深入挖掘 chapter 文件中
 * 嵌套的资源引用。通过智能递归扫描，确保无遗漏地提取所有 imagePath 
 * 和 tablePath 资源，为完整的论文资源管理奠定基础。
 * 
 * 为什么重要：
 * 论文项目的资源分散在多层结构中，手动管理容易遗漏。这个工具确保
 * 资源提取的完整性和一致性，是论文自动化流程的重要基础设施。
 */

module.exports = {
  getDependencies() {
    return {
      'fs': '^0.0.1-security',
      'path': '^0.12.7'
    };
  },

  getMetadata() {
    return {
      id: '06-asset-extractor',
      name: '智能资源提取器',
      description: '递归提取 content-plan.json 和所有 chapter 文件中的图片、表格资源，按类型分类存储',
      version: '2.0.0',
      category: 'content-processing',
      author: '鲁班',
      tags: ['json', 'extraction', 'assets', 'recursive', 'content-plan', 'chapters']
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          inputPath: {
            type: 'string',
            description: 'content-plan.json 文件的路径或项目根目录路径'
          },
          chaptersDir: {
            type: 'string',
            description: 'chapter 文件目录路径，默认为 inputPath 同级的 chapters 目录',
            default: 'auto'
          },
          outputBaseDir: {
            type: 'string',
            description: '输出基础目录路径，默认为 inputPath 的父目录',
            default: 'auto'
          },
          pathMapping: {
            type: 'object',
            description: '路径映射配置',
            default: {
              'pngs': 'pngs',
              'tables': 'tables'
            }
          }
        },
        required: ['inputPath']
      }
    };
  },

  validate(params) {
    if (!params.inputPath) {
      return { valid: false, errors: ['inputPath参数是必需的'] };
    }
    if (typeof params.inputPath !== 'string') {
      return { valid: false, errors: ['inputPath必须是字符串'] };
    }
    return { valid: true, errors: [] };
  },

  async execute(params) {
    const { api } = this;
    const fs = await api.importx('fs');
    const path = await api.importx('path');

    try {
      api.logger.info('开始智能资源提取', { params });
      
      // 确定工作路径
      const inputPath = params.inputPath;
      const isDirectory = fs.statSync(inputPath).isDirectory();
      
      let contentPlanPath, baseDir, chaptersDir;
      
      if (isDirectory) {
        // 输入是目录，查找 content-plan.json
        baseDir = inputPath;
        contentPlanPath = path.join(baseDir, 'content.plan.json');
        if (!fs.existsSync(contentPlanPath)) {
          contentPlanPath = path.join(baseDir, 'content-plan.json');
        }
        chaptersDir = path.join(baseDir, 'chapters');
        if (!fs.existsSync(chaptersDir)) {
          chaptersDir = path.join(baseDir, 'chapter');
        }
      } else {
        // 输入是文件
        baseDir = path.dirname(inputPath);
        contentPlanPath = inputPath;
        chaptersDir = path.join(baseDir, 'chapters');
        if (!fs.existsSync(chaptersDir)) {
          chaptersDir = path.join(baseDir, 'chapter');
        }
      }

      // 覆盖默认设置
      if (params.chaptersDir && params.chaptersDir !== 'auto') {
        chaptersDir = params.chaptersDir;
      }
      if (params.outputBaseDir && params.outputBaseDir !== 'auto') {
        baseDir = params.outputBaseDir;
      }

      const pathMapping = params.pathMapping || {
        'pngs': 'pngs',
        'tables': 'tables'
      };

      const results = {
        contentPlanBlocks: { imageBlocks: [], tableBlocks: [] },
        chapterBlocks: { imageBlocks: [], tableBlocks: [] },
        totalProcessed: 0
      };

      // 第一步：处理 content-plan.json
      if (fs.existsSync(contentPlanPath)) {
        api.logger.info('处理 content-plan.json', { path: contentPlanPath });
        const contentPlanResults = await this.processContentPlan(contentPlanPath, baseDir, pathMapping, fs, path);
        results.contentPlanBlocks = contentPlanResults;
        results.totalProcessed += contentPlanResults.imageBlocks.length + contentPlanResults.tableBlocks.length;
        api.logger.info('content-plan.json 处理完成', { 
          images: contentPlanResults.imageBlocks.length,
          tables: contentPlanResults.tableBlocks.length
        });
      } else {
        api.logger.warn('未找到 content-plan.json', { searchPath: contentPlanPath });
      }

      // 第二步：递归处理 chapter 文件
      if (fs.existsSync(chaptersDir)) {
        api.logger.info('开始处理 chapter 文件', { dir: chaptersDir });
        const chapterResults = await this.processChapterDirectory(chaptersDir, baseDir, pathMapping, fs, path);
        results.chapterBlocks = chapterResults;
        results.totalProcessed += chapterResults.imageBlocks.length + chapterResults.tableBlocks.length;
        api.logger.info('chapter 文件处理完成', { 
          images: chapterResults.imageBlocks.length,
          tables: chapterResults.tableBlocks.length
        });
      } else {
        api.logger.warn('未找到 chapters 目录', { searchPath: chaptersDir });
      }

      const totalImages = results.contentPlanBlocks.imageBlocks.length + results.chapterBlocks.imageBlocks.length;
      const totalTables = results.contentPlanBlocks.tableBlocks.length + results.chapterBlocks.tableBlocks.length;

      api.logger.info('资源提取完成', { 
        total: results.totalProcessed,
        images: totalImages,
        tables: totalTables
      });

      return {
        success: true,
        message: `成功提取 ${results.totalProcessed} 个资源 (${totalImages} 图片, ${totalTables} 表格)`,
        data: {
          ...results,
          summary: {
            totalImages,
            totalTables,
            totalResources: results.totalProcessed
          }
        }
      };

    } catch (error) {
      api.logger.error('资源提取失败', error);
      return {
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: `提取失败: ${error.message}`
        }
      };
    }
  },

  async processContentPlan(contentPlanPath, baseDir, pathMapping, fs, path) {
    const results = { imageBlocks: [], tableBlocks: [] };
    
    try {
      const contentData = JSON.parse(fs.readFileSync(contentPlanPath, 'utf8'));
      
      if (!Array.isArray(contentData)) {
        throw new Error('content-plan.json 必须包含一个数组');
      }

      for (const item of contentData) {
        if (item.imagePath) {
          const result = await this.processAssetBlock(item, 'image', baseDir, pathMapping, fs, path, 'content-plan');
          results.imageBlocks.push(result);
        }
        
        if (item.tablePath) {
          const result = await this.processAssetBlock(item, 'table', baseDir, pathMapping, fs, path, 'content-plan');
          results.tableBlocks.push(result);
        }
      }
    } catch (error) {
      throw new Error(`处理 content-plan.json 失败: ${error.message}`);
    }

    return results;
  },

  async processChapterDirectory(chaptersDir, baseDir, pathMapping, fs, path) {
    const results = { imageBlocks: [], tableBlocks: [] };
    
    try {
      const files = fs.readdirSync(chaptersDir)
        .filter(file => file.endsWith('.json'))
        .sort();

      for (const file of files) {
        const filePath = path.join(chaptersDir, file);
        const chapterResults = await this.processChapterFile(filePath, baseDir, pathMapping, fs, path);
        results.imageBlocks.push(...chapterResults.imageBlocks);
        results.tableBlocks.push(...chapterResults.tableBlocks);
      }
    } catch (error) {
      throw new Error(`处理 chapters 目录失败: ${error.message}`);
    }

    return results;
  },

  async processChapterFile(filePath, baseDir, pathMapping, fs, path) {
    const results = { imageBlocks: [], tableBlocks: [] };
    
    try {
      const chapterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const chapterFileName = path.basename(filePath);
      
      // 检查章节顶层的资源
      if (chapterData.imagePath) {
        const result = await this.processAssetBlock(chapterData, 'image', baseDir, pathMapping, fs, path, chapterFileName);
        results.imageBlocks.push(result);
      }
      
      if (chapterData.tablePath) {
        const result = await this.processAssetBlock(chapterData, 'table', baseDir, pathMapping, fs, path, chapterFileName);
        results.tableBlocks.push(result);
      }

      // 递归处理 items 数组中的资源
      if (chapterData.items && Array.isArray(chapterData.items)) {
        for (let i = 0; i < chapterData.items.length; i++) {
          const item = chapterData.items[i];
          
          // 为 items 中的子项生成唯一 ID
          const itemWithId = {
            ...item,
            id: item.id || `${chapterData.id}.${i + 1}`,
            parentChapter: chapterData.id,
            sourceFile: chapterFileName
          };
          
          if (item.imagePath) {
            const result = await this.processAssetBlock(itemWithId, 'image', baseDir, pathMapping, fs, path, chapterFileName);
            results.imageBlocks.push(result);
          }
          
          if (item.tablePath) {
            const result = await this.processAssetBlock(itemWithId, 'table', baseDir, pathMapping, fs, path, chapterFileName);
            results.tableBlocks.push(result);
          }
        }
      }
    } catch (error) {
      throw new Error(`处理章节文件 ${filePath} 失败: ${error.message}`);
    }

    return results;
  },

  async processAssetBlock(item, assetType, baseDir, pathMapping, fs, path, sourceFile) {
    try {
      const assetPath = assetType === 'image' ? item.imagePath : item.tablePath;
      const fileName = path.basename(assetPath, path.extname(assetPath));
      
      // 确定目标目录 - 输出到项目根目录的上级目录
      const outputBaseDir = path.dirname(baseDir);
      const targetDir = path.join(outputBaseDir, assetType === 'image' ? pathMapping.pngs || 'pngs' : pathMapping.tables || 'tables');

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 生成输出文件路径
      const outputFileName = `${fileName}.json`;
      const outputPath = path.join(targetDir, outputFileName);
      const relativeOutputPath = path.relative(outputBaseDir, outputPath);

      // 准备输出数据
      const outputData = {
        ...item,
        sourceFile,
        extractedAt: new Date().toISOString()
      };

      // 写入JSON文件
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

      return {
        id: item.id,
        title: item.title,
        assetType: assetType,
        originalPath: assetPath,
        extractedTo: relativeOutputPath,
        fileName: outputFileName,
        sourceFile
      };

    } catch (error) {
      return {
        id: item.id || 'unknown',
        title: item.title || 'unknown',
        assetType: assetType,
        sourceFile,
        error: `处理失败: ${error.message}`
      };
    }
  }
};