/**
 * 单体ER图生成器 - 基于JSON表结构生成中文ER图表
 * 
 * 战略意义：
 * 1. 架构可视化：将抽象的JSON表结构转化为直观的ER图，提升数据建模的可理解性
 * 2. 中文友好：专门优化中文表名和字段名的显示效果，适应国内开发环境
 * 3. 精准连线：实现从矩形边缘到椭圆边缘的精确连接，避传统工具的中心点连线问题
 * 
 * 设计理念：
 * 采用SVG技术栈生成高质量矢量图像，严格遵循ER图标准：中心矩形表示实体，
 * 周围椭圆表示属性，连接线从形状边缘精确连接。通过几何计算确保连线的
 * 专业性和美观性，让复杂的表结构变得一目了然。
 * 
 * 重要更新：
 * - 使用绝对路径参数，不再依赖沙箱环境
 * - 直接操作用户指定的项目文件系统
 * - 支持任意绝对路径的输入和输出
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: '1-1-single-er',
      name: '单体ER图生成器',
      description: '根据JSON表结构生成单体ER图，支持中文表名和字段名，边到边精确连线，使用绝对路径',
      version: '1.1.1',
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
            description: 'JSON表结构文件的绝对路径或包含多个JSON文件的目录绝对路径',
            minLength: 1
          },
          outputDir: {
            type: 'string',
            description: '输出目录的绝对路径，如未指定则使用输入文件所在目录'
          }
        },
        required: ['inputPath']
      }
    };
  },

  async execute(params) {
    console.log('开始生成单体ER图', { inputPath: params.inputPath, outputDir: params.outputDir });

    try {
      // 使用 importx 导入所需模块
      const fs = await importx('fs');
      const path = await importx('path');
      
      // 验证输入路径是绝对路径
      if (!path.isAbsolute(params.inputPath)) {
        throw new Error(`输入路径必须是绝对路径：${params.inputPath}`);
      }
      
      // 处理输入路径
      const inputPath = params.inputPath;
      const outputDir = params.outputDir || this.getOutputDir(inputPath, fs, path);
      
      // 验证输出路径是绝对路径
      if (!path.isAbsolute(outputDir)) {
        throw new Error(`输出路径必须是绝对路径：${outputDir}`);
      }
      
      // 检查输入路径是否存在
      if (!fs.existsSync(inputPath)) {
        throw new Error(`输入路径不存在：${inputPath}`);
      }
      
      // 确保输出目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建输出目录：${outputDir}`);
      }
      
      // 判断是文件还是目录
      const isDirectory = await this.isDirectory(inputPath, fs);
      
      let processedFiles = [];
      
      if (isDirectory) {
        // 批量处理目录下的JSON文件
        const jsonFiles = await this.getJsonFiles(inputPath, fs, path);
        console.log(`发现${jsonFiles.length}个JSON文件`, { files: jsonFiles });
        
        for (const jsonFile of jsonFiles) {
          try {
            const result = await this.processJsonFile(jsonFile, outputDir, fs, path);
            processedFiles.push(result);
            console.log(`成功处理: ${result.tableName}`);
          } catch (error) {
            console.error(`处理失败: ${jsonFile}`, error);
            processedFiles.push({
              inputFile: jsonFile,
              status: 'error',
              error: error.message
            });
          }
        }
      } else {
        // 处理单个文件
        const result = await this.processJsonFile(inputPath, outputDir, fs, path);
        processedFiles.push(result);
        console.log(`成功处理: ${result.tableName}`);
      }

      const successCount = processedFiles.filter(f => f.status !== 'error').length;
      console.log('批量处理完成', { total: processedFiles.length, success: successCount });
      
      return {
        success: true,
        message: `成功生成${successCount}个ER图`,
        total: processedFiles.length,
        files: processedFiles,
        outputDir: outputDir
      };

    } catch (error) {
      console.error('ER图生成失败', error);
      throw new Error(`生成失败: ${error.message}`);
    }
  },

  // 获取输出目录
  getOutputDir(inputPath, fs, path) {
    if (fs.statSync(inputPath).isDirectory()) {
      return inputPath;
    } else {
      return path.dirname(inputPath);
    }
  },

  // 判断是否为目录
  async isDirectory(filePath, fs) {
    try {
      const stats = fs.statSync(filePath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  },

  // 获取目录下的JSON文件
  async getJsonFiles(dir, fs, path) {
    const files = fs.readdirSync(dir);
    return files
      .filter(file => file.endsWith('.json'))
      .filter(file => !file.includes('_analysis') && !file.includes('_input'))
      .map(file => path.join(dir, file));
  },

  // 处理单个JSON文件
  async processJsonFile(jsonFilePath, outputDir, fs, path) {
    // 读取JSON文件
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const { tableName, tableCnName, columns } = jsonData;
    
    if (!tableName || !tableCnName || !columns) {
      throw new Error(`JSON文件格式不正确，缺少必要字段：${jsonFilePath}`);
    }
    
    // 生成输出文件路径
    const fileName = path.parse(jsonFilePath).name;
    const outputPath = path.join(outputDir, `${fileName}.svg`);
    
    // 生成ER图
    await this.generateERDiagram(tableName, tableCnName, columns, outputPath, fs);
    
    return {
      tableName: tableCnName,
      englishName: tableName,
      inputFile: jsonFilePath,
      outputPath: outputPath,
      status: 'success'
    };
  },

  // 生成ER图核心逻辑（SVG版本）
  async generateERDiagram(tableName, tableCnName, columns, outputPath, fs) {
    // 扩大SVG画布以容纳更多内容
    const svgWidth = 1200;
    const svgHeight = 900;
    const tableX = svgWidth / 2;
    const tableY = svgHeight / 2;
    const tableWidth = 180;
    const tableHeight = 80;

    // 开始构建SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">\n`;

    // 背景
    svg += `  <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>\n`;

    // 表格矩形
    svg += `  <rect x="${tableX - tableWidth/2}" y="${tableY - tableHeight/2}" width="${tableWidth}" height="${tableHeight}" fill="#fff" stroke="#333" stroke-width="3"/>\n`;

    // 表名文本 - 增大字体
    const safeTableName = tableCnName.replace(/[<>&"']/g, (char) => {
      const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
      return escapeMap[char];
    });
    svg += `  <text x="${tableX}" y="${tableY + 6}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial" font-size="18" font-weight="bold" fill="#333">${safeTableName}</text>\n`;

    // 绘制字段椭圆和连线
    // 支持两种格式：二维数组格式和对象数组格式
    let validColumns = [];

    if (Array.isArray(columns) && columns.length > 0) {
      if (Array.isArray(columns[0])) {
        // 二维数组格式：[[字段名, 字段中文名, ...], ...]
        validColumns = columns.filter(col => col && col.length >= 2);
      } else if (typeof columns[0] === 'object') {
        // 对象数组格式：[{fieldName, fieldCnName, ...}, ...]
        validColumns = columns.filter(col => col && (col.fieldName || col.fieldCnName));
      }
    }

    if (validColumns.length === 0) {
      console.warn(`表 ${tableName} 没有有效的列定义`);
      // 仍然生成基本的表格矩形
    } else {
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
        svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="2"/>\n`;

        // 更大的椭圆
        svg += `  <ellipse cx="${fieldX}" cy="${fieldY}" rx="${ellipseRx}" ry="${ellipseRy}" fill="#fff" stroke="#666" stroke-width="2"/>\n`;

        // 字段名 - 支持两种格式，XML转义
        let fieldName = '';
        if (Array.isArray(col)) {
          // 二维数组格式：使用第二列（中文名）或第一列（英文名）
          fieldName = col[1] || col[0] || '';
        } else {
          // 对象格式：优先使用中文名，否则使用英文名
          fieldName = col.fieldCnName || col.fieldName || '';
        }

        const safeFieldName = fieldName.replace(/[<>&"']/g, (char) => {
          const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
          return escapeMap[char];
        });
        svg += `  <text x="${fieldX}" y="${fieldY + 6}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial" font-size="14" fill="#333">${safeFieldName}</text>\n`;
      });
    }

    svg += `</svg>`;

    // 保存SVG文件到绝对路径
    fs.writeFileSync(outputPath, svg, 'utf8');
    console.log(`生成SVG文件：${outputPath}`);
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
        code: 'INVALID_ABSOLUTE_PATH',
        description: '路径必须是绝对路径',
        match: /路径必须是绝对路径/i,
        solution: '请提供完整的绝对路径，以/开头（Linux/Mac）或C:\\开头（Windows）',
        retryable: false
      },
      {
        code: 'INVALID_JSON_FORMAT',
        description: 'JSON格式错误或缺少必要字段',
        match: /JSON文件格式不正确/i,
        solution: '检查JSON文件格式，确保包含tableName、tableCnName和columns字段',
        retryable: false
      },
      {
        code: 'FILE_NOT_ACCESSIBLE',
        description: '无法访问输入文件或输出目录',
        match: /ENOENT|EACCES|输入路径不存在/i,
        solution: '检查文件路径是否正确，确保有读写权限',
        retryable: false
      }
    ];
  }
};