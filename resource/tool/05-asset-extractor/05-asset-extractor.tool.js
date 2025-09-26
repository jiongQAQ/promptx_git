module.exports = {
  getDependencies() {
    return {
      'fs': '^0.0.1-security',
      'path': '^0.12.7'
    };
  },

  getMetadata() {
    return {
      name: '05-asset-extractor',
      description: '从content-plan.json中提取带有imagePath和tablePath的块，并按路径分类保存到对应目录',
      version: '1.0.0',
      category: 'content-processing',
      author: '鲁班',
      tags: ['json', 'extraction', 'assets', 'content-plan'],
      manual: '@manual://05-asset-extractor'
    };
  },

  getSchema() {
    return {
      type: 'object',
      properties: {
        inputPath: {
          type: 'string',
          description: 'content-plan.json文件的路径'
        },
        outputBaseDir: {
          type: 'string',
          description: '输出基础目录路径，默认为当前目录',
          default: '.'
        },
        pathMapping: {
          type: 'object',
          description: '路径映射配置，指定不同类型资源的目标目录',
          default: {
            'pngs': 'pngs',
            'tables': 'tables'
          }
        }
      },
      required: ['inputPath']
    };
  },

  validate(params) {
    if (!params.inputPath) {
      return { valid: false, errors: ['inputPath参数是必需的'] };
    }
    if (typeof params.inputPath !== 'string') {
      return { valid: false, errors: ['inputPath必须是字符串'] };
    }
    if (params.outputBaseDir && typeof params.outputBaseDir !== 'string') {
      return { valid: false, errors: ['outputBaseDir必须是字符串'] };
    }
    return { valid: true, errors: [] };
  },

  async execute(params) {
    const fs = await importx('fs');
    const path = await importx('path');

    try {
      // 读取content-plan.json文件
      const contentData = JSON.parse(fs.readFileSync(params.inputPath, 'utf8'));
      
      if (!Array.isArray(contentData)) {
        throw new Error('content-plan.json必须包含一个数组');
      }

      const outputBaseDir = params.outputBaseDir || '.';
      const pathMapping = params.pathMapping || {
        'pngs': 'pngs',
        'tables': 'tables'
      };

      const results = {
        imageBlocks: [],
        tableBlocks: [],
        totalProcessed: 0
      };

      // 遍历所有条目，查找包含imagePath或tablePath的块
      for (const item of contentData) {
        if (item.imagePath) {
          const result = await this.processAssetBlock(item, 'image', outputBaseDir, pathMapping, fs, path);
          results.imageBlocks.push(result);
          results.totalProcessed++;
        }
        
        if (item.tablePath) {
          const result = await this.processAssetBlock(item, 'table', outputBaseDir, pathMapping, fs, path);
          results.tableBlocks.push(result);
          results.totalProcessed++;
        }
      }

      return {
        success: true,
        message: `成功提取${results.totalProcessed}个资源块`,
        data: results
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: `提取失败: ${error.message}`
        }
      };
    }
  },

  async processAssetBlock(item, assetType, outputBaseDir, pathMapping, fs, path) {
    try {
      // 获取资源路径
      const assetPath = assetType === 'image' ? item.imagePath : item.tablePath;
      
      // 从路径中提取文件名（不含扩展名）
      const fileName = path.basename(assetPath, path.extname(assetPath));
      
      // 确定目标目录
      let targetDir;
      if (assetType === 'image' && assetPath.includes('/pngs/')) {
        targetDir = path.join(outputBaseDir, pathMapping.pngs || 'pngs');
      } else if (assetType === 'table' && assetPath.includes('/tables/')) {
        targetDir = path.join(outputBaseDir, pathMapping.tables || 'tables');
      } else {
        // 默认根据类型分类
        targetDir = path.join(outputBaseDir, assetType === 'image' ? 'pngs' : 'tables');
      }

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 生成输出文件路径
      const outputFileName = `${fileName}.json`;
      const outputPath = path.join(targetDir, outputFileName);

      // 写入JSON文件
      fs.writeFileSync(outputPath, JSON.stringify(item, null, 2), 'utf8');

      return {
        id: item.id,
        title: item.title,
        assetType: assetType,
        originalPath: assetPath,
        extractedTo: outputPath,
        fileName: outputFileName
      };

    } catch (error) {
      return {
        id: item.id || 'unknown',
        title: item.title || 'unknown',
        assetType: assetType,
        error: `处理失败: ${error.message}`
      };
    }
  }
};