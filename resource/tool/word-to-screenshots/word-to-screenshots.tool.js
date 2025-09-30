/**
 * Word to Screenshots - Word文档自动截图工具
 *
 * 战略意义：
 * 1. 架构价值：通过系统命令桥接实现跨平台的文档渲染能力
 * 2. 平台价值：为AI提供将Word文档可视化为图片的能力，支持演示和预览场景
 * 3. 生态价值：补充文档处理工具链，支持论文图表生成、文档预览等高级工作流
 *
 * 设计理念：
 * 采用 Word → PDF → PNG 的转换链，利用 LibreOffice 的 headless 模式和 pdf-poppler
 * 实现无界面的自动化转换。支持高清晰度输出和批量处理，确保图片质量和转换效率。
 *
 * 为什么重要：
 * 解决了AI无法直接预览Word文档内容的问题，让AI能够将文档转换为可视化图片，
 * 支持文档审阅、内容展示、论文排版预览等场景，提升文档处理的完整性。
 */

module.exports = {
  getDependencies() {
    return {
      // 使用Node.js内置模块，无需额外依赖
    };
  },

  getMetadata() {
    return {
      id: 'word-to-screenshots',
      name: 'Word文档截图工具',
      description: '将Word文档每一页转换为高清PNG图片',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          wordFile: {
            type: 'string',
            description: 'Word文档路径(.docx文件)'
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（默认为reference-papers）',
            default: 'reference-papers'
          },
          dpi: {
            type: 'number',
            description: '图片分辨率DPI（默认300）',
            default: 300,
            minimum: 72,
            maximum: 600
          },
          format: {
            type: 'string',
            enum: ['png', 'jpg'],
            description: '输出图片格式（默认png）',
            default: 'png'
          },
          cleanupPdf: {
            type: 'boolean',
            description: '是否清理中间PDF文件（默认true）',
            default: true
          }
        },
        required: ['wordFile']
      },
      environment: {
        type: 'object',
        properties: {
          SOFFICE_PATH: {
            type: 'string',
            description: 'LibreOffice soffice命令路径',
            default: '/Applications/LibreOffice.app/Contents/MacOS/soffice'
          }
        }
      }
    };
  },

  getBridges() {
    return {
      'cmd:soffice': {
        real: async (args, api) => {
          api.logger.info('[Bridge] 执行LibreOffice转换', { args });
          const { execSync } = require('child_process');

          try {
            const result = execSync(args.command, {
              encoding: 'utf8',
              timeout: args.timeout || 60000,
              maxBuffer: 10 * 1024 * 1024
            });
            return { success: true, output: result };
          } catch (error) {
            api.logger.error('[Bridge] LibreOffice转换失败', {
              error: error.message,
              stderr: error.stderr
            });
            throw error;
          }
        },
        mock: async (args, api) => {
          api.logger.info('[Bridge Mock] 模拟LibreOffice转换', { args });
          return { success: true, output: 'Mock conversion completed' };
        }
      },

      'cmd:pdftoppm': {
        real: async (args, api) => {
          api.logger.info('[Bridge] 执行PDF转图片', { args });
          const { execSync } = require('child_process');

          try {
            const result = execSync(args.command, {
              encoding: 'utf8',
              timeout: args.timeout || 120000,
              maxBuffer: 50 * 1024 * 1024
            });
            return { success: true, output: result };
          } catch (error) {
            api.logger.error('[Bridge] PDF转图片失败', {
              error: error.message,
              stderr: error.stderr
            });
            throw error;
          }
        },
        mock: async (args, api) => {
          api.logger.info('[Bridge Mock] 模拟PDF转图片', { args });
          return { success: true, output: 'Mock PDF conversion completed' };
        }
      }
    };
  },

  async execute(params) {
    const { api } = this;

    api.logger.info('开始Word文档截图', { params });

    try {
      const path = require('path');
      const fs = require('fs');

      // 参数处理
      const wordFile = path.resolve(params.wordFile);
      const outputDir = params.outputDir || 'reference-papers';
      const dpi = params.dpi || 300;
      const format = params.format || 'png';
      const cleanupPdf = params.cleanupPdf !== false;

      // 检查Word文件是否存在
      if (!fs.existsSync(wordFile)) {
        throw new Error(`Word文件不存在: ${wordFile}`);
      }

      if (!wordFile.endsWith('.docx')) {
        throw new Error('仅支持.docx格式的Word文档');
      }

      // 准备输出目录
      const baseName = path.basename(wordFile, '.docx');
      const outputPath = path.resolve(outputDir);
      const screenshotsDir = path.join(outputPath, `${baseName}_screenshots`);

      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        api.logger.info('创建输出目录', { screenshotsDir });
      }

      // 临时PDF文件路径
      const tempPdfPath = path.join(screenshotsDir, `${baseName}_temp.pdf`);

      // 第一步：Word → PDF (使用LibreOffice)
      api.logger.info('步骤1: 转换Word为PDF');
      await this.convertWordToPdf(wordFile, screenshotsDir, tempPdfPath, api);

      // 检查PDF是否生成成功
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error('PDF文件生成失败');
      }

      api.logger.info('PDF生成成功', { tempPdfPath });

      // 第二步：PDF → PNG (使用pdftoppm)
      api.logger.info('步骤2: 转换PDF为图片');
      const imageFiles = await this.convertPdfToImages(
        tempPdfPath,
        screenshotsDir,
        baseName,
        dpi,
        format,
        api
      );

      // 清理临时PDF文件
      if (cleanupPdf && fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
        api.logger.info('清理临时PDF文件');
      }

      // 统计信息
      const totalSize = imageFiles.reduce((sum, file) => {
        return sum + fs.statSync(file).size;
      }, 0);

      const result = {
        success: true,
        wordFile,
        screenshotsDir,
        imageFiles,
        statistics: {
          totalPages: imageFiles.length,
          totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
          dpi,
          format
        },
        message: `成功将Word文档转换为${imageFiles.length}张${format.toUpperCase()}图片`
      };

      api.logger.info('Word截图完成', result);
      return result;

    } catch (error) {
      api.logger.error('Word截图失败', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        suggestion: this.getSuggestion(error.message)
      };
    }
  },

  // 转换Word为PDF
  async convertWordToPdf(wordFile, outputDir, pdfPath, api) {
    // 检查LibreOffice是否安装
    const { execSync } = require('child_process');

    try {
      // 尝试使用系统的soffice命令
      const sofficePaths = [
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        '/usr/bin/soffice',
        'soffice'
      ];

      let sofficeCmd = null;
      for (const p of sofficePaths) {
        try {
          execSync(`command -v ${p}`, { stdio: 'ignore' });
          sofficeCmd = p;
          break;
        } catch (e) {
          // 继续尝试下一个路径
        }
      }

      if (!sofficeCmd) {
        throw new Error('未找到LibreOffice，请安装: brew install --cask libreoffice');
      }

      api.logger.info('使用LibreOffice', { sofficeCmd });

      // 执行转换命令
      const command = `"${sofficeCmd}" --headless --convert-to pdf --outdir "${outputDir}" "${wordFile}"`;

      await api.bridge('cmd:soffice', {
        command,
        timeout: 60000
      });

      api.logger.info('Word→PDF转换完成');

    } catch (error) {
      throw new Error(`LibreOffice转换失败: ${error.message}`);
    }
  },

  // 转换PDF为图片
  async convertPdfToImages(pdfPath, outputDir, baseName, dpi, format, api) {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    try {
      // 检查pdftoppm是否安装
      try {
        execSync('which pdftoppm', { stdio: 'ignore' });
      } catch (e) {
        throw new Error('未找到pdftoppm，请安装poppler: brew install poppler');
      }

      // 输出文件名前缀
      const outputPrefix = path.join(outputDir, 'page');

      // 构建转换命令
      const formatFlag = format === 'jpg' ? '-jpeg' : '-png';
      const command = `pdftoppm ${formatFlag} -r ${dpi} "${pdfPath}" "${outputPrefix}"`;

      api.logger.info('执行PDF转图片命令', { command });

      await api.bridge('cmd:pdftoppm', {
        command,
        timeout: 120000
      });

      // 查找生成的图片文件并重命名
      const files = fs.readdirSync(outputDir)
        .filter(f => f.startsWith('page-') && (f.endsWith('.png') || f.endsWith('.jpg')))
        .sort();

      const imageFiles = [];

      // 重命名为统一格式：page-001.png, page-002.png, ...
      files.forEach((file, index) => {
        const oldPath = path.join(outputDir, file);
        const ext = path.extname(file);
        const newName = `page-${String(index + 1).padStart(3, '0')}${ext}`;
        const newPath = path.join(outputDir, newName);

        fs.renameSync(oldPath, newPath);
        imageFiles.push(newPath);
      });

      api.logger.info('PDF→图片转换完成', {
        totalImages: imageFiles.length
      });

      return imageFiles;

    } catch (error) {
      throw new Error(`PDF转图片失败: ${error.message}`);
    }
  },

  // 错误建议
  getSuggestion(errorMessage) {
    if (errorMessage.includes('LibreOffice')) {
      return '请安装LibreOffice: brew install --cask libreoffice';
    }
    if (errorMessage.includes('pdftoppm')) {
      return '请安装Poppler: brew install poppler';
    }
    if (errorMessage.includes('不存在')) {
      return '请检查Word文件路径是否正确';
    }
    if (errorMessage.includes('格式')) {
      return '仅支持.docx格式的Word文档';
    }
    return '请检查系统环境和文件权限';
  },

  getBusinessErrors() {
    return [
      {
        code: 'LIBREOFFICE_NOT_FOUND',
        description: 'LibreOffice未安装',
        match: /LibreOffice|soffice/i,
        solution: '请安装LibreOffice: brew install --cask libreoffice',
        retryable: false
      },
      {
        code: 'POPPLER_NOT_FOUND',
        description: 'Poppler工具未安装',
        match: /pdftoppm|poppler/i,
        solution: '请安装Poppler: brew install poppler',
        retryable: false
      },
      {
        code: 'INVALID_DOCX_FILE',
        description: '无效的Word文档',
        match: /not a valid|invalid format/i,
        solution: '请确保文件是有效的.docx格式',
        retryable: false
      },
      {
        code: 'FILE_NOT_FOUND',
        description: 'Word文件不存在',
        match: /不存在|no such file/i,
        solution: '请检查文件路径是否正确',
        retryable: false
      },
      {
        code: 'CONVERSION_TIMEOUT',
        description: '转换超时',
        match: /timeout|timed out/i,
        solution: '文件可能过大，请尝试减小文件大小或增加超时时间',
        retryable: true
      }
    ];
  }
};