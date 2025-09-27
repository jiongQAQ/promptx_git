/**
 * Word to Markdown Converter - 智能文档格式转换工具
 * 
 * 战略意义：
 * 1. 架构价值：通过沙箱隔离确保文档转换过程不会影响系统稳定性
 * 2. 平台价值：实现跨平台的文档格式转换能力，不依赖特定Office软件
 * 3. 生态价值：为PromptX生态提供标准化的文档处理能力，支撑内容管理工具链
 * 
 * 设计理念：
 * 基于mammoth.js的强大解析能力，将Word文档(.docx)转换为结构化的Markdown格式，
 * 同时保持原文档的格式特征（标题层级、列表、表格、图片等）。
 * 通过智能的图片提取和路径管理，确保转换后的文档完整可用。
 * 
 * 为什么重要：
 * 解决了Word文档与Markdown生态之间的格式鸿沟，让AI能够处理更多样化的文档输入，
 * 为知识管理、文档处理、内容发布等场景提供了关键的格式转换能力。
 */

module.exports = {
  getDependencies() {
    return {
      'mammoth': '^1.6.0',
      'turndown': '^7.1.2',
      'yauzl': '^2.10.0'
    };
  },

  getMetadata() {
    return {
      id: 'word-to-md',
      name: 'Word转Markdown工具',
      description: '将Word文档转换为Markdown格式，保持格式并提取图片',
      version: '1.1.0',
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
            description: 'Word文档路径(.docx文件)',
            pattern: '\\.(docx)$'
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（可选，默认为当前工作目录）'
          },
          outputName: {
            type: 'string',
            description: '输出文件名（可选，默认使用原文件名）'
          },
          extractImages: {
            type: 'boolean',
            description: '是否提取图片（默认true）',
            default: true
          }
        },
        required: ['wordFile']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始Word转MD转换', { params });
    
    try {
      // 加载依赖（Node.js内置模块直接使用require）
      const mammoth = await api.importx('mammoth');
      const TurndownService = await api.importx('turndown');
      const yauzl = await api.importx('yauzl');
      const path = require('path');
      const fs = require('fs');
      
      // 参数处理
      const wordFile = params.wordFile;
      const outputDir = params.outputDir || process.cwd();
      const baseName = params.outputName || path.basename(wordFile, '.docx');
      const extractImages = params.extractImages !== false;
      
      // 检查Word文件是否存在
      if (!fs.existsSync(wordFile)) {
        throw new Error(`Word文件不存在: ${wordFile}`);
      }
      
      // 确保输出目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        api.logger.info('创建输出目录', { outputDir });
      }
      
      const result = {
        success: true,
        wordFile,
        outputDir,
        files: []
      };
      
      // 图片提取目录
      const imagesDir = path.join(outputDir, `${baseName}_images`);
      let imageMap = new Map();
      let imageIndex = 0; // 图片索引计数器
      
      // 1. 提取图片（如果需要）
      if (extractImages) {
        try {
          imageMap = await this.extractImages(wordFile, imagesDir, { yauzl, fs, path, api });
          api.logger.info('图片提取完成', { count: imageMap.size });
        } catch (error) {
          api.logger.warn('图片提取失败', { error: error.message });
        }
      }
      
      // 2. 转换Word为HTML，带图片处理
      api.logger.info('开始解析Word文档');
      const htmlResult = await mammoth.convertToHtml({ path: wordFile }, {
        convertImage: mammoth.images.imgElement((image) => {
          imageIndex++;
          // 使用按顺序的图片文件名
          const imageName = `image_${imageIndex}.png`;
          const relativePath = path.join(`${baseName}_images`, imageName);
          api.logger.info('处理图片', { imageIndex, imageName, relativePath });
          return { src: relativePath };
        })
      });
      
      const html = htmlResult.value;
      const messages = htmlResult.messages;
      
      if (messages.length > 0) {
        api.logger.info('转换消息', { messages });
      }
      
      // 3. HTML转Markdown
      api.logger.info('开始转换为Markdown');
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced'
      });
      
      // 自定义表格转换规则
      turndownService.addRule('table', {
        filter: 'table',
        replacement: function(content, node) {
          const rows = Array.from(node.querySelectorAll('tr'));
          if (rows.length === 0) return content;
          
          let markdown = '\n';
          
          rows.forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const cellContents = cells.map(cell => cell.textContent.trim().replace(/\n/g, ' '));
            markdown += '| ' + cellContents.join(' | ') + ' |\n';
            
            // 添加表头分隔符
            if (index === 0) {
              markdown += '|' + cells.map(() => ' --- ').join('|') + '|\n';
            }
          });
          
          return markdown + '\n';
        }
      });
      
      let markdown = turndownService.turndown(html);
      
      // 4. 后处理：修复图片引用，确保按正确顺序映射
      if (extractImages && fs.existsSync(imagesDir)) {
        // 获取实际提取的图片文件列表（按文件名排序）
        const extractedImages = fs.readdirSync(imagesDir)
          .filter(file => file.match(/\.(png|jpg|jpeg|gif|bmp|svg|webp)$/i))
          .sort((a, b) => {
            // 按数字排序：image_1.png, image_2.png, ...
            const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
            const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
            return aNum - bNum;
          });
        
        api.logger.info('提取的图片文件', { extractedImages });
        
        // 重新映射图片引用
        markdown = this.fixImageReferences(markdown, extractedImages, baseName, api);
        
        // 添加图片文件到结果
        const imageFiles = extractedImages.map(file => path.join(imagesDir, file));
        result.files.push(...imageFiles);
        result.imagesExtracted = extractedImages.length;
      }
      
      // 5. 写入Markdown文件
      const mdFile = path.join(outputDir, `${baseName}.md`);
      fs.writeFileSync(mdFile, markdown, 'utf8');
      result.files.unshift(mdFile); // 将MD文件放在第一位
      
      api.logger.info('Markdown文件创建成功', { mdFile });
      
      result.markdownFile = mdFile;
      result.message = `转换成功！生成文件: ${result.files.length}个`;
      
      api.logger.info('Word转MD转换完成', result);
      return result;
      
    } catch (error) {
      api.logger.error('Word转MD转换失败', { error: error.message, stack: error.stack });
      return {
        success: false,
        error: error.message,
        suggestion: '请检查Word文件格式和路径，确保是有效的.docx文件'
      };
    }
  },
  
  // 修复图片引用，确保每个图片都正确对应
  fixImageReferences(markdown, extractedImages, baseName, api) {
    let imageIndex = 0;
    
    // 替换所有图片引用
    const fixedMarkdown = markdown.replace(/!\[\]\([^)]+\)/g, (match) => {
      if (imageIndex < extractedImages.length) {
        const imageName = extractedImages[imageIndex];
        const newRef = `![](${baseName}_images/${imageName})`;
        api.logger.info('修复图片引用', { 
          original: match, 
          fixed: newRef, 
          imageIndex: imageIndex + 1,
          imageName 
        });
        imageIndex++;
        return newRef;
      }
      return match;
    });
    
    api.logger.info('图片引用修复完成', { 
      totalImages: extractedImages.length, 
      referencesFixed: imageIndex 
    });
    
    return fixedMarkdown;
  },
  
  // 提取Word文档中的图片
  async extractImages(wordFile, imagesDir, { yauzl, fs, path, api }) {
    return new Promise((resolve, reject) => {
      const imageMap = new Map();
      let imageCounter = 1;
      
      // 确保图片目录存在
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      
      yauzl.open(wordFile, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }
        
        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          // 查找媒体文件
          if (entry.fileName.startsWith('word/media/')) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                api.logger.warn('读取图片失败', { fileName: entry.fileName, error: err.message });
                zipfile.readEntry();
                return;
              }
              
              // 确定文件扩展名
              const originalName = path.basename(entry.fileName);
              const ext = path.extname(originalName) || '.png';
              const newName = `image_${imageCounter}${ext}`;
              imageCounter++;
              
              const imagePath = path.join(imagesDir, newName);
              const writeStream = fs.createWriteStream(imagePath);
              
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                // 根据文件类型映射
                const mimeType = this.getMimeType(ext);
                imageMap.set(mimeType, newName);
                imageMap.set(originalName, newName);
                api.logger.info('图片提取成功', { originalName, newName, imagePath });
                zipfile.readEntry();
              });
              
              writeStream.on('error', (err) => {
                api.logger.warn('图片写入失败', { fileName: entry.fileName, error: err.message });
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });
        
        zipfile.on('end', () => {
          api.logger.info('图片提取完成', { totalImages: imageMap.size });
          resolve(imageMap);
        });
        
        zipfile.on('error', (err) => {
          reject(err);
        });
      });
    });
  },
  
  // 获取MIME类型
  getMimeType(ext) {
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext.toLowerCase()] || 'image/png';
  },

  getBusinessErrors() {
    return [
      {
        code: 'INVALID_DOCX_FILE',
        description: '无效的Word文档文件',
        match: /not a valid zip file|invalid central directory/i,
        solution: '请确保文件是有效的.docx格式',
        retryable: false
      },
      {
        code: 'FILE_NOT_FOUND',
        description: '文件不存在',
        match: /ENOENT|no such file/i,
        solution: '请检查文件路径是否正确',
        retryable: false
      },
      {
        code: 'PERMISSION_DENIED',
        description: '文件访问权限不足',
        match: /EACCES|permission denied/i,
        solution: '请检查文件读写权限',
        retryable: false
      },
      {
        code: 'OUTPUT_DIR_ERROR',
        description: '输出目录创建失败',
        match: /cannot create directory/i,
        solution: '请检查输出目录权限或磁盘空间',
        retryable: true
      }
    ];
  }
};