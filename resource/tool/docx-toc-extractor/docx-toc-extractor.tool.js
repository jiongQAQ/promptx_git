/**
 * DOCX Table of Contents Extractor - Word文档目录智能提取工具
 * 
 * 战略意义：
 * 1. 文档结构化价值：将Word文档的层级结构转换为机器可读的Markdown格式，
 *    为AI提供清晰的文档骨架，提升文档理解和处理效率
 * 2. 跨平台兼容性：解决Word文档在不同平台间目录显示不一致的问题，
 *    确保目录信息的准确传递和标准化展示
 * 3. 工作流集成价值：作为文档处理链的起点，为后续的内容分析、
 *    摘要生成、知识提取等AI任务提供结构化的输入基础
 * 
 * 设计理念：
 * 采用XML解析而非依赖第三方转换库的方案，确保对DOCX内部结构的完全控制。
 * 通过直接解析document.xml中的样式信息，精准识别标题层级，避免因转换过程
 * 丢失格式信息导致的目录结构错乱。设计支持中英文混合文档，自动处理编号
 * 和层级关系，生成标准化的Markdown目录格式。
 * 
 * 为什么重要：
 * 在AI时代，文档的结构化表示比内容本身更加重要。一个清晰的目录不仅能
 * 帮助人类快速理解文档框架，更能为AI提供准确的上下文边界，这是实现
 * 精准文档分析和智能内容处理的基础。
 */

module.exports = {
  getDependencies() {
    return {
      'jszip': '^3.10.1',
      'xml2js': '^0.6.2',
      'path': 'builtin',
      'fs': 'builtin'
    };
  },

  getMetadata() {
    return {
      id: 'docx-toc-extractor',
      name: 'DOCX目录提取器',
      description: '从Word文档中提取标题结构，生成Markdown格式的目录',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          docxPath: {
            type: 'string',
            description: 'Word文档文件路径',
            minLength: 1
          },
          outputPath: {
            type: 'string',
            description: '输出文件路径（可选，默认自动生成）'
          },
          maxLevel: {
            type: 'number',
            description: '最大标题层级（1-9）',
            minimum: 1,
            maximum: 9,
            default: 6
          },
          includeNumbers: {
            type: 'boolean',
            description: '是否保留标题编号',
            default: true
          }
        },
        required: ['docxPath']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    try {
      api.logger.info('开始提取DOCX目录', { params });
      
      // 导入依赖
      const JSZip = await api.importx('jszip');
      const xml2js = await api.importx('xml2js');
      const fs = await api.importx('fs');
      const path = await api.importx('path');
      
      const { docxPath, outputPath, maxLevel = 6, includeNumbers = true } = params;
      
      // 验证文件是否存在
      if (!fs.existsSync(docxPath)) {
        return {
          success: false,
          error: '文件不存在',
          message: `无法找到文件: ${docxPath}`
        };
      }
      
      // 验证文件类型
      if (!docxPath.toLowerCase().endsWith('.docx')) {
        return {
          success: false,
          error: '文件类型错误',
          message: '只支持.docx格式的Word文档'
        };
      }
      
      // 读取DOCX文件
      const docxBuffer = fs.readFileSync(docxPath);
      const zip = await JSZip.loadAsync(docxBuffer);
      
      // 提取document.xml
      const documentXml = await zip.file('word/document.xml').async('text');
      
      // 解析XML
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(documentXml);
      
      // 提取标题
      const headings = this.extractHeadings(result, maxLevel, includeNumbers);
      
      if (headings.length === 0) {
        api.logger.warn('未找到标题');
        return {
          success: true,
          tocMarkdown: '# 未找到标题\n\n此文档中没有找到格式化的标题。',
          headingCount: 0,
          message: '文档中未找到标准格式的标题'
        };
      }
      
      // 生成Markdown目录
      const tocMarkdown = this.generateMarkdownToc(headings);
      
      // 处理输出路径
      let finalOutputPath = outputPath;
      if (!finalOutputPath) {
        const baseName = path.basename(docxPath, '.docx');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-]/g, '');
        finalOutputPath = `${baseName}_目录_${timestamp}.md`;
      }
      
      // 保存到文件
      const fullContent = `# ${path.basename(docxPath, '.docx')} - 文档目录\n\n` +
                         `> 提取时间: ${new Date().toLocaleString('zh-CN')}\n` +
                         `> 源文件: ${docxPath}\n` +
                         `> 标题数量: ${headings.length}\n\n` +
                         tocMarkdown;
      
      fs.writeFileSync(finalOutputPath, fullContent, 'utf8');
      
      api.logger.info('目录提取完成', {
        headingCount: headings.length,
        outputPath: finalOutputPath
      });
      
      return {
        success: true,
        tocMarkdown,
        outputFile: finalOutputPath,
        headingCount: headings.length,
        message: `成功提取${headings.length}个标题，已保存至: ${finalOutputPath}`
      };
      
    } catch (error) {
      api.logger.error('目录提取失败', error);
      return {
        success: false,
        error: error.message,
        message: '处理过程中发生错误，请检查文件格式是否正确'
      };
    }
  },
  
  // 提取标题的核心方法
  extractHeadings(documentXml, maxLevel, includeNumbers) {
    const headings = [];
    
    try {
      const body = documentXml?.['w:document']?.['w:body']?.[0];
      if (!body || !body['w:p']) {
        return [];
      }
      
      const paragraphs = body['w:p'];
      
      for (const para of paragraphs) {
        const pPr = para['w:pPr']?.[0];
        if (!pPr) continue;
        
        const pStyle = pPr['w:pStyle']?.[0];
        if (!pStyle || !pStyle['$'] || !pStyle['$']['w:val']) continue;
        
        const styleName = pStyle['$']['w:val'];
        
        // 匹配标题样式 (Heading1, Heading2, ..., heading1, heading2, 等)
        const headingMatch = styleName.match(/^[Hh]eading(\d+)$/);
        if (!headingMatch) continue;
        
        const level = parseInt(headingMatch[1]);
        if (level > maxLevel) continue;
        
        // 提取文本内容
        const text = this.extractTextFromParagraph(para, includeNumbers);
        if (!text.trim()) continue;
        
        headings.push({
          level,
          text: text.trim(),
          style: styleName
        });
      }
    } catch (error) {
      console.error('提取标题时出错:', error);
    }
    
    return headings;
  },
  
  // 从段落中提取文本
  extractTextFromParagraph(paragraph, includeNumbers) {
    let text = '';
    
    try {
      const runs = paragraph['w:r'] || [];
      
      for (const run of runs) {
        if (run['w:t']) {
          for (const textNode of run['w:t']) {
            if (typeof textNode === 'string') {
              text += textNode;
            } else if (textNode['_']) {
              text += textNode['_'];
            }
          }
        }
      }
      
      // 处理编号
      if (!includeNumbers) {
        // 移除常见的编号格式
        text = text.replace(/^[\d\.\s]+/, ''); // 1. 1.1 等
        text = text.replace(/^[第\d]+[章节]\s*/, ''); // 第1章 第1节
        text = text.replace(/^[（）()\d]+\s*/, ''); // (1) (一)
      }
    } catch (error) {
      console.error('提取文本时出错:', error);
    }
    
    return text;
  },
  
  // 生成Markdown目录
  generateMarkdownToc(headings) {
    let markdown = '';
    
    for (const heading of headings) {
      const indent = '  '.repeat(heading.level - 1);
      const prefix = heading.level === 1 ? '## ' : '### ';
      markdown += `${indent}- ${heading.text}\n`;
    }
    
    return markdown || '无标题内容';
  },
  
  getBusinessErrors() {
    return [
      {
        code: 'FILE_NOT_FOUND',
        description: '文件不存在',
        match: /文件不存在|ENOENT/i,
        solution: '请检查文件路径是否正确',
        retryable: false
      },
      {
        code: 'INVALID_DOCX_FORMAT',
        description: 'DOCX文件格式错误',
        match: /格式错误|corrupt|invalid/i,
        solution: '请检查文件是否为有效的.docx格式',
        retryable: false
      },
      {
        code: 'NO_HEADINGS_FOUND',
        description: '未找到标题',
        match: /未找到标题/i,
        solution: '请确保文档中包含格式化的标题（Heading1-9样式）',
        retryable: false
      }
    ];
  }
};