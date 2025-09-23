module.exports = {
  getDependencies() {
    return {
      'docx': '^8.5.0'
    };
  },
  
  getMetadata() {
    return {
      name: 'luban-word',
      description: '专业论文Word文档生成器，基于JSON数据和大纲结构生成标准DOCX格式论文文档',
      version: '1.0.0',
      category: 'document',
      author: '鲁班',
      tags: ['word', 'docx', 'document', 'export', 'academic'],
      manual: '@manual://luban-word'
    };
  },
  
  getSchema() {
    return {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'content.json文件路径'
        },
        outline: {
          type: 'string',
          description: 'outline.json文件路径'
        },
        out: {
          type: 'string',
          description: '输出DOCX文件路径'
        },
        style: {
          type: 'string',
          description: '样式方案',
          default: 'default',
          enum: ['default', 'academic', 'simple']
        }
      },
      required: ['content', 'outline', 'out']
    };
  },
  
  validate(params) {
    const errors = [];
    
    // 检查必需参数
    if (!params.content) {
      errors.push('缺少content参数');
    }
    if (!params.outline) {
      errors.push('缺少outline参数');
    }
    if (!params.out) {
      errors.push('缺少out参数');
    }
    
    // 检查文件扩展名
    if (params.out && !params.out.toLowerCase().endsWith('.docx')) {
      errors.push('输出文件必须以.docx结尾');
    }
    
    // 检查样式参数
    if (params.style && !['default', 'academic', 'simple'].includes(params.style)) {
      errors.push('不支持的样式方案：' + params.style);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },
  
  async execute(params) {
    const startTime = Date.now();
    
    try {
      // 使用importx统一导入模块
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, Packer } = await importx('docx');
      const fs = await importx('fs');
      const path = await importx('path');
      
      // 定义promisify的fs方法
      const { promisify } = await importx('util');
      const readFile = promisify(fs.readFile);
      const writeFile = promisify(fs.writeFile);
      const mkdir = promisify(fs.mkdir);
      const stat = promisify(fs.stat);
      const access = promisify(fs.access);
      
      // 参数验证
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '参数验证失败',
            details: validation.errors
          },
          exitCode: 2
        };
      }
      
      // 读取输入文件
      let contentData, outlineData;
      
      try {
        // 检查文件是否存在
        try {
          await access(params.content, fs.constants.F_OK);
        } catch {
          throw new Error(`content文件不存在: ${params.content}`);
        }
        
        try {
          await access(params.outline, fs.constants.F_OK);
        } catch {
          throw new Error(`outline文件不存在: ${params.outline}`);
        }
        
        // 读取JSON文件
        const contentText = await readFile(params.content, 'utf8');
        const outlineText = await readFile(params.outline, 'utf8');
        contentData = JSON.parse(contentText);
        outlineData = JSON.parse(outlineText);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '输入文件读取失败',
            details: error.message
          },
          exitCode: 2
        };
      }
      
      // 验证JSON数据结构
      if (!contentData.title || !contentData.sections || !Array.isArray(contentData.sections)) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'content.json格式不正确',
            details: '缺少必需字段：title, sections'
          },
          exitCode: 2
        };
      }
      
      if (!outlineData.structure || !Array.isArray(outlineData.structure)) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'outline.json格式不正确',
            details: '缺少必需字段：structure'
          },
          exitCode: 2
        };
      }
      
      // 创建Word文档
      const doc = new Document({
        styles: this.getDocumentStyles(params.style || 'default'),
        sections: [{
          properties: {},
          children: await this.generateDocumentContent(contentData, outlineData, { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType })
        }]
      });
      
      // 确保输出目录存在
      const outputDir = path.dirname(params.out);
      try {
        await mkdir(outputDir, { recursive: true });
      } catch (err) {
        // 目录已存在或创建失败
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
      
      // 生成DOCX文件
      const docxBuffer = await Packer.toBuffer(doc);
      await writeFile(params.out, docxBuffer);
      
      // 统计信息
      const fileStats = await stat(params.out);
      const processingTime = (Date.now() - startTime) / 1000;
      
      const stats = this.calculateDocumentStats(contentData, outlineData);
      
      return {
        success: true,
        data: {
          status: 'success',
          out: params.out,
          fileSize: fileStats.size,
          pagesGenerated: stats.estimatedPages,
          sectionsProcessed: stats.sectionsCount,
          figuresInserted: stats.figuresCount,
          processingTime: processingTime
        },
        exitCode: 0
      };
      
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Word文档生成失败',
          details: error.message
        },
        exitCode: 3
      };
    }
  },
  
  // 获取文档样式配置
  getDocumentStyles(styleType) {
    const baseStyles = {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: {
            size: 28,
            bold: true,
            color: '000000'
          },
          paragraph: {
            spacing: { after: 300 },
            alignment: 'center'
          }
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: {
            size: 24,
            bold: true,
            color: '2E74B5'
          },
          paragraph: {
            spacing: { before: 240, after: 120 }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          run: {
            size: 20,
            bold: true,
            color: '2E74B5'
          },
          paragraph: {
            spacing: { before: 180, after: 90 }
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          run: {
            size: 16,
            bold: true,
            color: '1F4E79'
          },
          paragraph: {
            spacing: { before: 120, after: 60 }
          }
        }
      ]
    };
    
    // 根据样式类型调整
    if (styleType === 'academic') {
      baseStyles.paragraphStyles[0].run.size = 32; // 标题更大
      baseStyles.paragraphStyles[0].run.bold = true;
    } else if (styleType === 'simple') {
      baseStyles.paragraphStyles.forEach(style => {
        if (style.run.color) {
          style.run.color = '000000'; // 统一使用黑色
        }
      });
    }
    
    return baseStyles;
  },
  
  // 生成文档内容
  async generateDocumentContent(contentData, outlineData, docxClasses) {
    const { Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = docxClasses;
    const content = [];
    
    // 添加标题
    content.push(
    new Paragraph({
    children: [new TextRun({ text: contentData.title, bold: true, size: 32 })],
    heading: 'Title',
    alignment: 'center',
    spacing: { after: 400 }
    })
    );
    
    // 添加作者
    if (contentData.author) {
      content.push(
        new Paragraph({
          children: [new TextRun({ text: `作者：${contentData.author}`, size: 24 })],
          alignment: 'center',
          spacing: { after: 600 }
        })
      );
    }
    
    // 按照大纲结构生成内容
    const sectionMap = this.createSectionMap(contentData.sections);
    
    for (const outlineItem of outlineData.structure) {
      await this.processOutlineItem(outlineItem, sectionMap, content, docxClasses);
    }
    
    return content;
  },
  
  // 创建章节映射
  createSectionMap(sections) {
    const map = new Map();
    for (const section of sections) {
      map.set(section.id, section);
    }
    return map;
  },
  
  // 处理大纲项目
  async processOutlineItem(outlineItem, sectionMap, content, docxClasses, level = 1) {
    const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docxClasses;
    
    // 获取对应的章节数据
    const sectionData = sectionMap.get(outlineItem.id);
    
    if (sectionData) {
      // 添加章节标题
      const headingLevel = this.getHeadingLevel(level);
      content.push(
        new Paragraph({
          children: [new TextRun({ text: sectionData.title, bold: true })],
          heading: headingLevel,
          spacing: { before: 240, after: 120 }
        })
      );
      
      // 添加章节内容
      if (sectionData.content) {
        const paragraphs = sectionData.content.split('\n\n');
        for (const para of paragraphs) {
          if (para.trim()) {
            content.push(
              new Paragraph({
                children: [new TextRun({ text: para.trim() })],
                spacing: { after: 120 }
              })
            );
          }
        }
      }
      
      // 添加图表
      if (sectionData.figures && Array.isArray(sectionData.figures)) {
        for (const figure of sectionData.figures) {
          await this.addFigure(figure, content, docxClasses);
        }
      }
    } else {
      // 如果没有对应的章节数据，只添加标题
      const headingLevel = this.getHeadingLevel(level);
      content.push(
        new Paragraph({
          children: [new TextRun({ text: outlineItem.title, bold: true })],
          heading: headingLevel,
          spacing: { before: 240, after: 120 }
        })
      );
    }
    
    // 递归处理子章节
    if (outlineItem.children && Array.isArray(outlineItem.children)) {
      for (const child of outlineItem.children) {
        await this.processOutlineItem(child, sectionMap, content, docxClasses, level + 1);
      }
    }
  },
  
  // 获取标题级别
  getHeadingLevel(level) {
    // 直接返回字符串常量，docx库会自动识别
    switch (level) {
      case 1: return 'Heading1';
      case 2: return 'Heading2';
      case 3: return 'Heading3';
      case 4: return 'Heading4';
      case 5: return 'Heading5';
      case 6: return 'Heading6';
      default: return 'Heading6';
    }
  },
  
  // 添加图表
  async addFigure(figure, content, docxClasses) {
    const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = docxClasses;
    
    try {
      // 如果是表格数据，创建表格
      if (figure.type === 'table' && figure.data && Array.isArray(figure.data)) {
        const tableRows = figure.data.map(row => {
          return new TableRow({
            children: row.map(cell => 
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(String(cell || ''))] })],
                width: { size: 2000, type: WidthType.DXA }
              })
            )
          });
        });
        
        content.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        );
      } else {
        // 对于其他类型的图表，添加文本描述
        content.push(
          new Paragraph({
            children: [new TextRun({ text: `[图表] ${figure.caption || figure.id}`, italics: true })],
            spacing: { before: 120, after: 120 }
          })
        );
      }
      
      // 添加图表说明
      if (figure.caption) {
        content.push(
          new Paragraph({
            children: [new TextRun({ text: `图 ${figure.id}: ${figure.caption}`, size: 20, italics: true })],
            spacing: { after: 240 }
          })
        );
      }
    } catch (error) {
      // 图表处理失败，添加错误信息
      content.push(
        new Paragraph({
          children: [new TextRun({ text: `[图表处理失败] ${figure.id}: ${error.message}`, color: 'FF0000' })],
          spacing: { after: 120 }
        })
      );
    }
  },
  
  // 计算文档统计信息
  calculateDocumentStats(contentData, outlineData) {
    let sectionsCount = 0;
    let figuresCount = 0;
    let totalWords = 0;
    
    // 统计章节数量
    if (contentData.sections) {
      sectionsCount = contentData.sections.length;
      
      // 统计图表数量和字数
      for (const section of contentData.sections) {
        if (section.figures) {
          figuresCount += section.figures.length;
        }
        if (section.content) {
          totalWords += section.content.split(/\s+/).length;
        }
      }
    }
    
    // 估算页数（每页约250字）
    const estimatedPages = Math.max(1, Math.ceil(totalWords / 250));
    
    return {
      sectionsCount,
      figuresCount,
      totalWords,
      estimatedPages
    };
  }
};