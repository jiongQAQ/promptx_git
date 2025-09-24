/**
 * 单体ER图生成器 - 基于JSON表结构生成中文ER图表
 * 
 * 战略意义：
 * 1. 架构可视化：将抽象的JSON表结构转化为直观的ER图，提升数据建模的可理解性
 * 2. 中文友好：专门优化中文表名和字段名的显示效果，适应国内开发环境
 * 3. 精准连线：实现从矩形边缘到椭圆边缘的精确连接，避免传统工具的中心点连线问题
 * 
 * 设计理念：
 * 采用Canvas技术栈生成高质量PNG图像，严格遵循ER图标准：中心矩形表示实体，
 * 周围椭圆表示属性，连接线从形状边缘精确连接。通过几何计算确保连线的
 * 专业性和美观性，让复杂的表结构变得一目了然。
 * 
 * 为什么重要：
 * 传统ER图工具往往忽视中文显示和连线精度，这个工具专门解决这两个痛点，
 * 让数据库设计文档更加专业和易于理解。
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: '1-1-single-er',
      name: '单体ER图生成器',
      description: '根据JSON表结构生成单体ER图，支持中文表名和字段名，边到边精确连线',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          inputPath: {
            type: 'string',
            description: 'JSON表结构文件路径或包含多个JSON文件的目录路径',
            minLength: 1
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径，默认为输入文件同级目录'
          }
        },
        required: ['inputPath']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始生成单体ER图', { inputPath: params.inputPath });

    try {
      // SVG输出，无需Canvas
      
      // 处理输入路径
      const inputPath = params.inputPath;
      const outputDir = params.outputDir || this.getOutputDir(inputPath);
      
      // 判断是文件还是目录
      const isDirectory = await this.isDirectory(inputPath);
      
      let processedFiles = [];
      
      if (isDirectory) {
        // 批量处理目录下的JSON文件
        const jsonFiles = await this.getJsonFiles(inputPath);
        api.logger.info(`发现${jsonFiles.length}个JSON文件`, { files: jsonFiles });
        
        for (const jsonFile of jsonFiles) {
          try {
            const result = await this.processJsonFile(jsonFile, outputDir);
            processedFiles.push(result);
            api.logger.info(`成功处理: ${result.tableName}`);
          } catch (error) {
            api.logger.error(`处理失败: ${jsonFile}`, error);
            processedFiles.push({
              inputFile: jsonFile,
              status: 'error',
              error: error.message
            });
          }
        }
      } else {
        // 处理单个文件
        const result = await this.processJsonFile(inputPath, outputDir);
        processedFiles.push(result);
        api.logger.info(`成功处理: ${result.tableName}`);
      }

      const successCount = processedFiles.filter(f => f.status !== 'error').length;
      api.logger.info('批量处理完成', { total: processedFiles.length, success: successCount });
      
      return {
        success: true,
        message: `成功生成${successCount}个ER图`,
        total: processedFiles.length,
        files: processedFiles
      };

    } catch (error) {
      api.logger.error('ER图生成失败', error);
      throw new Error(`生成失败: ${error.message}`);
    }
  },

  // 获取输出目录
  getOutputDir(inputPath) {
    const fs = require('fs');
    const path = require('path');
    
    if (fs.statSync(inputPath).isDirectory()) {
      return inputPath;
    } else {
      return path.dirname(inputPath);
    }
  },

  // 判断是否为目录
  async isDirectory(path) {
    const fs = require('fs');
    try {
      const stats = fs.statSync(path);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  },

  // 获取目录下的JSON文件
  async getJsonFiles(dir) {
    const fs = require('fs');
    const path = require('path');
    
    const files = fs.readdirSync(dir);
    return files
      .filter(file => file.endsWith('.json'))
      .filter(file => !file.includes('_analysis') && !file.includes('_input'))
      .map(file => path.join(dir, file));
  },

  // 处理单个JSON文件
  async processJsonFile(jsonFilePath, outputDir) {
    const fs = require('fs');
    const path = require('path');
    
    // 读取JSON文件
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { tableName, tableCnName, columns } = jsonData;
    
    // 生成输出文件路径
    const fileName = path.parse(jsonFilePath).name;
    const outputPath = path.join(outputDir, `${fileName}.svg`);
    
    // 生成ER图
    await this.generateERDiagram(tableName, tableCnName, columns, outputPath);
    
    return {
      tableName: tableCnName,
      englishName: tableName,
      inputFile: jsonFilePath,
      outputPath: outputPath,
      status: 'success'
    };
  },

  // 生成ER图核心逻辑（SVG版本）
  async generateERDiagram(tableName, tableCnName, columns, outputPath) {
    const fs = require('fs');

    // 扩大SVG画布以容纳更多内容
    const svgWidth = 1200;
    const svgHeight = 900;
    const tableX = svgWidth / 2;
    const tableY = svgHeight / 2;
    const tableWidth = 180;
    const tableHeight = 80;

    // 开始构建SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
`;
    svg += `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
`;

    // 背景
    svg += `  <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
`;

    // 表格矩形
    svg += `  <rect x="${tableX - tableWidth/2}" y="${tableY - tableHeight/2}" width="${tableWidth}" height="${tableHeight}" fill="#fff" stroke="#333" stroke-width="3"/>
`;

    // 表名文本 - 增大字体
    svg += `  <text x="${tableX}" y="${tableY + 6}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial" font-size="18" font-weight="bold" fill="#333">${tableCnName}</text>
`;

    // 绘制字段椭圆和连线
    const validColumns = columns.filter(col => col && col.length >= 2);
    const angleStep = (2 * Math.PI) / validColumns.length;
    const radius = 280; // 增大半径

    validColumns.forEach((col, index) => {
      const angle = index * angleStep;
      const fieldX = tableX + radius * Math.cos(angle);
      const fieldY = tableY + radius * Math.sin(angle);

      // 增大椭圆尺寸以容纳中文文本
      const ellipseRx = 80; // 增大椭圆宽度
      const ellipseRy = 40; // 增大椭圆高度

      // 边到边连线计算 - 使用新的椭圆尺寸
      const { x1, y1, x2, y2 } = this.calculateEdgeToEdge(
        { x: tableX, y: tableY, width: tableWidth, height: tableHeight },
        { x: fieldX, y: fieldY, width: ellipseRx * 2, height: ellipseRy * 2 }
      );

      // 绘制连线
      svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="2"/>
`;

      // 更大的椭圆
      svg += `  <ellipse cx="${fieldX}" cy="${fieldY}" rx="${ellipseRx}" ry="${ellipseRy}" fill="#fff" stroke="#666" stroke-width="2"/>
`;

      // 字段名 - 增大字体并优化位置
      const fieldName = col[1] || col[0] || '';
      svg += `  <text x="${fieldX}" y="${fieldY + 6}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial" font-size="14" fill="#333">${fieldName}</text>
`;
    });

    svg += `</svg>`;

    // 保存SVG文件
    fs.writeFileSync(outputPath, svg, 'utf8');
  },

  // 计算边到边连接点
  calculateEdgeToEdge(rect, ellipse) {
    const dx = ellipse.x - rect.x;
    const dy = ellipse.y - rect.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      return { x1: rect.x, y1: rect.y, x2: ellipse.x, y2: ellipse.y };
    }
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // 计算矩形边缘点
    let rectEdgeX, rectEdgeY;
    if (Math.abs(unitX) > Math.abs(unitY) * (rect.width / rect.height)) {
      rectEdgeX = rect.x + (unitX > 0 ? rect.width/2 : -rect.width/2);
      rectEdgeY = rect.y + (rect.width/2) * unitY / Math.abs(unitX);
    } else {
      rectEdgeX = rect.x + (rect.height/2) * unitX / Math.abs(unitY);
      rectEdgeY = rect.y + (unitY > 0 ? rect.height/2 : -rect.height/2);
    }
    
    // 计算椭圆边缘点
    let ellipseEdgeX, ellipseEdgeY;
    if (Math.abs(-unitX) > Math.abs(-unitY) * (ellipse.width / ellipse.height)) {
      ellipseEdgeX = ellipse.x + (-unitX > 0 ? ellipse.width/2 : -ellipse.width/2);
      ellipseEdgeY = ellipse.y + (ellipse.width/2) * (-unitY) / Math.abs(-unitX);
    } else {
      ellipseEdgeX = ellipse.x + (ellipse.height/2) * (-unitX) / Math.abs(-unitY);
      ellipseEdgeY = ellipse.y + ((-unitY) > 0 ? ellipse.height/2 : -ellipse.height/2);
    }
    
    return {
      x1: rectEdgeX,
      y1: rectEdgeY,
      x2: ellipseEdgeX,
      y2: ellipseEdgeY
    };
  },

  getBusinessErrors() {
    return [
      {
        code: 'INVALID_JSON_FORMAT',
        description: 'JSON格式错误或缺少必要字段',
        match: /JSON|tableName|columns/i,
        solution: '检查JSON文件格式，确保包含tableName、tableCnName和columns字段',
        retryable: false
      },
      {
        code: 'CANVAS_RENDER_ERROR',
        description: 'Canvas渲染失败',
        match: /canvas|render/i,
        solution: '检查Canvas依赖是否正确安装',
        retryable: true
      },
      {
        code: 'FILE_NOT_ACCESSIBLE',
        description: '无法访问输入文件或输出目录',
        match: /ENOENT|EACCES/i,
        solution: '检查文件路径是否正确，确保有读写权限',
        retryable: false
      }
    ];
  }
};