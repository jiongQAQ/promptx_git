/**
 * Thesis to DOCX Generator
 * 将论文章节JSON文件转换为格式化的DOCX文档
 * 
 * @author 鲁班
 * @version 1.0.0
 */

module.exports = {
  getDependencies() {
    return {
      'docx': '^9.0.2',        // DOCX文档生成
      'lodash': '^4.17.21',    // 工具函数库
      'glob': '^11.0.0',       // 文件模式匹配
      'path': '^0.12.7',       // 路径处理
      'fs-extra': '^11.2.0'    // 增强文件操作
    };
  },

  getMetadata() {
    return {
      name: 'thesis-to-docx',
      description: '论文章节JSON到DOCX文档转换工具，支持完整的学术论文格式生成',
      version: '1.0.0',
      category: 'document',
      author: '鲁班',
      tags: ['thesis', 'docx', 'document', 'academic'],
      manual: '@manual://thesis-to-docx'
    };
  },

  getSchema() {
    return {
      type: 'object',
      properties: {
        sourceDir: {
          type: 'string',
          description: '章节JSON文件所在目录',
          default: 'paper/splits'
        },
        outputPath: {
          type: 'string', 
          description: '输出DOCX文件路径',
          default: 'paper/thesis.docx'
        },
        thesisTitle: {
          type: 'string',
          description: '论文标题',
          default: '基于Spring Boot的校园食堂评价系统设计与实现'
        },
        author: {
          type: 'string',
          description: '论文作者',
          default: ''
        },
        includeTableOfContents: {
          type: 'boolean',
          description: '是否包含目录',
          default: true
        },
        styleTemplate: {
          type: 'string',
          description: '样式模板名称',
          default: 'academic'
        }
      },
      required: ['sourceDir', 'outputPath', 'thesisTitle']
    };
  },

  validate(params) {
    const errors = [];
    
    if (!params.sourceDir || typeof params.sourceDir !== 'string') {
      errors.push('sourceDir 参数必须是有效的字符串');
    }
    
    if (!params.outputPath || typeof params.outputPath !== 'string') {
      errors.push('outputPath 参数必须是有效的字符串');
    }
    
    if (!params.thesisTitle || typeof params.thesisTitle !== 'string') {
      errors.push('thesisTitle 参数必须是有效的字符串');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  async execute(params) {
    try {
      // 导入依赖
      const { Document, Paragraph, TextRun, Packer, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, TableOfContents } = await importx('docx');
      const _ = await importx('lodash');
      const glob = await importx('glob');
      const path = await importx('path');
      const fs = await importx('fs-extra');
      
      const startTime = Date.now();
      
      // 设置默认值
      const config = {
        sourceDir: params.sourceDir || 'paper/splits',
        outputPath: params.outputPath || 'paper/thesis.docx',
        thesisTitle: params.thesisTitle || '基于Spring Boot的校园食堂评价系统设计与实现',
        author: params.author || '',
        includeTableOfContents: params.includeTableOfContents !== false,
        styleTemplate: params.styleTemplate || 'academic'
      };
      
      console.log('📚 开始生成论文DOCX文档...');
      console.log(`📂 源目录: ${config.sourceDir}`);
      console.log(`📄 输出文件: ${config.outputPath}`);
      console.log(`📝 论文标题: ${config.thesisTitle}`);

      // 0. 加载样式配置
      const styleConfig = await this.loadStyleConfig(config.styleTemplate, path);
      console.log(`🎨 使用样式模板: ${config.styleTemplate}`);

      // 1. 查找所有章节文件
      const chapterFiles = await this.findChapterFiles(config.sourceDir, glob, path);
      if (chapterFiles.length === 0) {
        throw new Error(`未找到章节文件，请检查目录: ${config.sourceDir}`);
      }
      
      console.log(`📑 找到 ${chapterFiles.length} 个章节文件`);
      
      // 2. 读取并解析所有章节内容
      const chapters = await this.loadChapterContents(chapterFiles);
      
      // 3. 创建DOCX文档
      const doc = new Document({
        sections: [{
          properties: {
            pageMargin: {
              top: 1440,    // 2.54cm
              right: 1800,  // 3.18cm  
              bottom: 1440, // 2.54cm
              left: 1800    // 3.18cm
            }
          },
          children: await this.generateDocumentContent(
            chapters, config, styleConfig, Document, Paragraph, TextRun,
            HeadingLevel, Table, TableRow, TableCell,
            ImageRun, AlignmentType, TableOfContents, fs, path
          )
        }]
      });
      
      // 4. 生成并保存文档
      const buffer = await Packer.toBuffer(doc);
      
      // 确保输出目录存在
      const outputDir = path.dirname(config.outputPath);
      await fs.ensureDir(outputDir);
      
      // 保存文件
      await fs.outputFile(config.outputPath, buffer);
      
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('✅ 论文DOCX文档生成完成！');
      
      return {
        success: true,
        data: {
          outputFile: config.outputPath,
          statistics: {
            chaptersProcessed: chapters.length,
            processingTime: `${processingTime}s`,
            fileSize: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
          },
          debug: {
            sourceDir: config.sourceDir,
            chapterFilesFound: chapterFiles.length,
            chaptersLoaded: chapters.length
          }
        }
      };
      
    } catch (error) {
      console.error('❌ 论文生成失败:', error.message);
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message,
          stack: error.stack
        }
      };
    }
  },

  /**
   * 加载样式配置
   */
  async loadStyleConfig(templateName, path) {
    const fs = await importx('fs');
    const fsPromises = fs.promises;

    try {
      // 构建样式配置文件路径 - 使用项目的templates目录
      const currentDir = process.cwd();
      const styleConfigPath = path.join(currentDir, 'templates', 'docx-styles.json');

      console.log(`🔍 加载样式配置: ${styleConfigPath}`);

      // 读取样式配置文件
      const styleConfigContent = await fsPromises.readFile(styleConfigPath, 'utf-8');
      const styleConfig = JSON.parse(styleConfigContent);

      // 获取指定预设的样式配置
      if (!styleConfig.presets[templateName]) {
        console.warn(`⚠️ 未找到样式模板 '${templateName}'，使用默认模板 'academic'`);
        templateName = 'academic';
      }

      const preset = styleConfig.presets[templateName];

      return {
        styles: styleConfig.styles,
        preset: preset,
        defaultStyles: preset.defaultStyles
      };

    } catch (error) {
      console.warn(`⚠️ 加载样式配置失败: ${error.message}，使用内置默认样式`);

      // 返回内置默认样式
      return this.getDefaultStyleConfig();
    }
  },

  /**
   * 获取内置默认样式配置
   */
  getDefaultStyleConfig() {
    return {
      styles: {
        default: {
          font: { name: "SimSun", size: 24, color: "000000", bold: false, italic: false },
          alignment: "left",
          spacing: { before: 0, after: 0, line: 1.15 }
        },
        title: {
          font: { name: "SimHei", size: 44, color: "000000", bold: true, italic: false },
          alignment: "center",
          spacing: { before: 600, after: 400, line: 1.5 }
        },
        chapter_title: {
          font: { name: "SimHei", size: 36, color: "000000", bold: true, italic: false },
          alignment: "center",
          spacing: { before: 400, after: 300, line: 1.5 },
          headingLevel: 1
        },
        section_title: {
          font: { name: "SimHei", size: 32, color: "000000", bold: true, italic: false },
          alignment: "left",
          spacing: { before: 300, after: 200, line: 1.5 },
          headingLevel: 2
        },
        body_text: {
          font: { name: "SimSun", size: 24, color: "000000", bold: false, italic: false },
          alignment: "justified",
          spacing: { before: 0, after: 0, line: 1.5 },
          indent: { firstLine: 480 }
        }
      },
      preset: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 }
        }
      },
      defaultStyles: {
        title: "title",
        chapter: "chapter_title",
        section: "section_title",
        text: "body_text"
      }
    };
  },

  /**
   * 根据docx_type或默认类型获取样式
   */
  getStyle(element, type, styleConfig) {
    // 1. 优先使用元素指定的docx_type
    if (element.docx_type && styleConfig.styles[element.docx_type]) {
      return styleConfig.styles[element.docx_type];
    }

    // 2. 使用默认类型映射
    if (styleConfig.defaultStyles[type] && styleConfig.styles[styleConfig.defaultStyles[type]]) {
      return styleConfig.styles[styleConfig.defaultStyles[type]];
    }

    // 3. 使用类型直接匹配
    if (styleConfig.styles[type]) {
      return styleConfig.styles[type];
    }

    // 4. 返回默认样式
    return styleConfig.styles.default || {};
  },

  /**
   * 应用样式到Paragraph
   */
  applyStyleToParagraph(paragraphConfig, style) {
    if (!style) return paragraphConfig;

    // 应用对齐方式
    if (style.alignment) {
      const alignmentMap = {
        'left': 'LEFT',
        'center': 'CENTER',
        'right': 'RIGHT',
        'justified': 'JUSTIFIED'
      };
      paragraphConfig.alignment = alignmentMap[style.alignment];
    }

    // 应用间距
    if (style.spacing) {
      paragraphConfig.spacing = {
        before: style.spacing.before || 0,
        after: style.spacing.after || 0,
        line: Math.round((style.spacing.line || 1.15) * 240) // 转换为twips
      };
    }

    // 应用缩进
    if (style.indent) {
      paragraphConfig.indent = {
        firstLine: style.indent.firstLine || 0,
        left: style.indent.left || 0,
        right: style.indent.right || 0
      };
    }

    // 应用标题级别
    if (style.headingLevel) {
      const headingLevels = {
        1: 'HEADING_1',
        2: 'HEADING_2',
        3: 'HEADING_3',
        4: 'HEADING_4'
      };
      paragraphConfig.heading = headingLevels[style.headingLevel];
    }

    return paragraphConfig;
  },

  /**
   * 应用样式到TextRun
   */
  applyStyleToTextRun(textRunConfig, style) {
    if (!style || !style.font) return textRunConfig;

    const font = style.font;

    // 应用字体属性
    if (font.name) textRunConfig.font = font.name;
    if (font.size) textRunConfig.size = font.size;
    if (font.color) textRunConfig.color = font.color;
    if (font.bold) textRunConfig.bold = font.bold;
    if (font.italic) textRunConfig.italics = font.italic;

    return textRunConfig;
  },

  /**
   * 查找所有章节文件并排序
   */
  async findChapterFiles(sourceDir, glob, path) {
    console.log(`🔍 查找章节文件在目录: ${sourceDir}`);
    console.log(`📂 当前工作目录: ${process.cwd()}`);

    try {
      // 使用Node.js内置fs模块
      const fs = await importx('fs');
      const fsPromises = fs.promises;

      // 确保目录存在
      const absoluteDir = path.resolve(sourceDir);
      console.log(`📂 绝对路径: ${absoluteDir}`);

      try {
        await fsPromises.access(absoluteDir);
      } catch (error) {
        throw new Error(`目录不存在: ${absoluteDir}`);
      }

      const allFiles = await fsPromises.readdir(absoluteDir);
      console.log(`📄 目录中的所有文件: ${JSON.stringify(allFiles)}`);

      // 筛选章节文件
      console.log(`📋 筛选前的所有文件: ${JSON.stringify(allFiles)}`);
      const chapterFiles = allFiles
        .filter(file => {
          const isMatch = file.match(/^content\.ch\d+(-\d+)?\.run\.json$/);
          console.log(`📄 文件 ${file} 匹配结果: ${isMatch ? '是' : '否'}`);
          return isMatch;
        })
        .map(file => path.join(absoluteDir, file));

      console.log(`📚 找到章节文件: ${JSON.stringify(chapterFiles)}`);

      // 按章节号排序
      return chapterFiles.sort((a, b) => {
        const getChapterNum = (filename) => {
          const match = path.basename(filename).match(/content\.ch(\d+(?:-\d+)?)\.run\.json/);
          if (!match) return 0;
          const chNum = match[1];
          if (chNum.includes('-')) {
            return parseInt(chNum.split('-')[0]);
          }
          return parseInt(chNum);
        };

        return getChapterNum(a) - getChapterNum(b);
      });
    } catch (error) {
      console.error(`❌ 查找文件出错: ${error.message}`);
      throw error;
    }
  },

  /**
   * 加载所有章节内容
   */
  async loadChapterContents(chapterFiles) {
    const chapters = [];
    const fs = await importx('fs');
    const fsPromises = fs.promises;

    for (const file of chapterFiles) {
      try {
        console.log(`📖 读取文件: ${file}`);
        const content = await fsPromises.readFile(file, 'utf-8');
        const chapterData = JSON.parse(content);
        chapters.push({
          file,
          data: chapterData
        });
      } catch (error) {
        console.warn(`⚠️ 读取文件失败: ${file}, 错误: ${error.message}`);
      }
    }
    
    return chapters;
  },

  /**
   * 生成文档内容
   */
  async generateDocumentContent(chapters, config, styleConfig, Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, TableOfContents, fs, path) {
    const content = [];
    
    // 添加论文标题
    const titleStyle = this.getStyle({ docx_type: 'title' }, 'title', styleConfig);
    const titleTextConfig = this.applyStyleToTextRun({
      text: config.thesisTitle
    }, titleStyle);
    const titleParagraphConfig = this.applyStyleToParagraph({
      children: [new TextRun(titleTextConfig)]
    }, titleStyle);

    content.push(new Paragraph(titleParagraphConfig));
    
    // 添加作者信息
    if (config.author) {
      const authorStyle = this.getStyle({ docx_type: 'author' }, 'author', styleConfig);
      const authorTextConfig = this.applyStyleToTextRun({
        text: `作者：${config.author}`
      }, authorStyle);
      const authorParagraphConfig = this.applyStyleToParagraph({
        children: [new TextRun(authorTextConfig)]
      }, authorStyle);

      content.push(new Paragraph(authorParagraphConfig));
    }
    
    // 添加目录（如果需要）
    if (config.includeTableOfContents) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '目录',
              bold: true,
              size: 28, // 三号字体
              font: 'SimHei'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          heading: HeadingLevel.HEADING_1
        })
      );
      
      content.push(new TableOfContents('Summary', {
        hyperlink: true,
        headingStyleRange: '1-3'
      }));
      
      // 分页
      content.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true
        })
      );
    }
    
    // 处理每个章节
    for (const chapter of chapters) {
      const chapterContent = await this.processChapterContent(
        chapter, styleConfig, fs, path, Paragraph, TextRun, HeadingLevel,
        Table, TableRow, TableCell, ImageRun, AlignmentType
      );
      content.push(...chapterContent);
    }
    
    return content;
  },

  /**
   * 处理单个章节的内容
   */
  async processChapterContent(chapter, styleConfig, fs, path, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType) {
    const content = [];
    const chapterData = chapter.data;
    
    console.log(`📝 处理章节: ${chapterData.meta?.title || '未知标题'}`);
    
    // 递归处理contents对象
    const sortedKeys = this.sortContentKeys(Object.keys(chapterData.contents));
    
    for (const key of sortedKeys) {
      const section = chapterData.contents[key];
      const sectionContent = await this.processSectionContent(
        section, key, chapter.file, styleConfig, fs, path, Paragraph, TextRun,
        HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType
      );
      content.push(...sectionContent);
    }
    
    return content;
  },

  /**
   * 排序内容键值（章节号排序）
   */
  sortContentKeys(keys) {
    return keys.sort((a, b) => {
      const parseKey = (key) => {
        const parts = key.split('.').map(part => {
          const num = parseInt(part);
          return isNaN(num) ? 0 : num;
        });
        return parts;
      };
      
      const aParts = parseKey(a);
      const bParts = parseKey(b);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }
      
      return 0;
    });
  },

  /**
   * 处理单个节的内容
   */
  async processSectionContent(section, sectionId, chapterFile, styleConfig, fs, path, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType) {
    const content = [];
    
    // 确定标题级别
    const level = this.getHeadingLevel(sectionId);
    const fontSize = this.getHeadingFontSize(level);
    
    // 添加标题
    if (section.title) {
      const titleType = level === 1 ? 'chapter' : (level === 2 ? 'section' : 'subsection');
      const titleStyle = this.getStyle(section, titleType, styleConfig);

      const titleTextConfig = this.applyStyleToTextRun({
        text: section.title
      }, titleStyle);

      const titleParagraphConfig = this.applyStyleToParagraph({
        children: [new TextRun(titleTextConfig)]
      }, titleStyle);

      // 如果样式中没有定义headingLevel，使用计算的级别
      if (!titleParagraphConfig.heading && titleStyle.headingLevel) {
        const headingLevels = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4
        };
        titleParagraphConfig.heading = headingLevels[titleStyle.headingLevel] || headingLevels[level];
      }

      content.push(new Paragraph(titleParagraphConfig));
    }
    
    // 添加正文内容
    if (section.text) {
      const paragraphs = section.text.split('\n\n').filter(p => p.trim());

      for (const paragraph of paragraphs) {
        const textType = section.docx_type_text || 'text';
        const textStyle = this.getStyle(section, textType, styleConfig);

        const textConfig = this.applyStyleToTextRun({
          text: paragraph.trim()
        }, textStyle);

        const paragraphConfig = this.applyStyleToParagraph({
          children: [new TextRun(textConfig)]
        }, textStyle);

        content.push(new Paragraph(paragraphConfig));
      }
    }
    
    // 处理图片
    if (section.figures && section.figures.length > 0) {
      for (const figure of section.figures) {
        const figureContent = await this.processFigure(
          figure, chapterFile, styleConfig, fs, path, Paragraph, TextRun, ImageRun, AlignmentType
        );
        content.push(...figureContent);
      }
    }
    
    // 处理表格
    if (section.tables && section.tables.length > 0) {
      for (const table of section.tables) {
        const tableContent = await this.processTable(
          table, chapterFile, styleConfig, fs, path, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType
        );
        content.push(...tableContent);
      }
    }
    
    // 处理嵌套items
    if (section.items && section.items.length > 0) {
      for (const item of section.items) {
        const itemContent = await this.processSectionContent(
          item, `${sectionId}.${item.order || 'item'}`, chapterFile,
          styleConfig, fs, path, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType
        );
        content.push(...itemContent);
      }
    }
    
    return content;
  },

  /**
   * 处理图片
   */
  async processFigure(figure, chapterFile, styleConfig, fs, path, Paragraph, TextRun, ImageRun, AlignmentType) {
    const content = [];
    const fsPromises = fs.promises;

    try {
      // 解析图片路径
      const chapterDir = path.dirname(chapterFile);
      const projectRoot = path.resolve(chapterDir, '..');
      let imagePath = figure.imagePath || figure.umlCodePath;
      
      if (imagePath) {
        // 统一使用绝对路径处理
        if (!path.isAbsolute(imagePath)) {
          // 如果是相对路径，基于项目根目录解析为绝对路径
          if (imagePath.startsWith('./')) {
            imagePath = path.resolve(projectRoot, imagePath.substring(2));
          } else {
            imagePath = path.resolve(projectRoot, imagePath);
          }
        }

        console.log(`🔍 查找图片绝对路径: ${imagePath}`);
        
        // 检查文件是否存在
        try {
          await fsPromises.access(imagePath);
          const imageBuffer = await fsPromises.readFile(imagePath);
          
          content.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 400,  // 调整图片宽度
                    height: 300  // 调整图片高度
                  }
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 }
            })
          );
          
          console.log(`📸 插入图片: ${imagePath}`);
        } catch (error) {
          console.warn(`⚠️ 图片文件不存在: ${imagePath}`);
          
          // 添加占位符
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[图片文件缺失: ${path.basename(imagePath)}]`,
                  italics: true,
                  color: 'FF0000'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 }
            })
          );
        }
      }
      
      // 添加图片标签
      if (figure.label) {
        const captionStyle = this.getStyle(figure, 'figure', styleConfig);
        const captionTextConfig = this.applyStyleToTextRun({
          text: figure.label
        }, captionStyle);
        const captionParagraphConfig = this.applyStyleToParagraph({
          children: [new TextRun(captionTextConfig)]
        }, captionStyle);

        content.push(new Paragraph(captionParagraphConfig));
      }
      
    } catch (error) {
      console.warn(`⚠️ 处理图片失败: ${error.message}`);
      
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[图片处理失败: ${figure.label || '未知图片'}]`,
              italics: true,
              color: 'FF0000'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 }
        })
      );
    }
    
    return content;
  },

  /**
   * 处理表格
   */
  async processTable(table, chapterFile, styleConfig, fs, path, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType) {
    const content = [];
    const fsPromises = fs.promises;

    try {
      // 读取表格数据
      const chapterDir = path.dirname(chapterFile);
      const projectRoot = path.resolve(chapterDir, '..');
      let tablePath = table.dataPath;

      if (tablePath) {
        // 统一使用绝对路径处理
        if (!path.isAbsolute(tablePath)) {
          // 如果是相对路径，基于项目根目录解析为绝对路径
          if (tablePath.startsWith('./')) {
            tablePath = path.resolve(projectRoot, tablePath.substring(2));
          } else {
            tablePath = path.resolve(projectRoot, tablePath);
          }
        }

        console.log(`🔍 查找表格绝对路径: ${tablePath}`);

        try {
          await fsPromises.access(tablePath);
          const tableData = JSON.parse(await fsPromises.readFile(tablePath, 'utf-8'));
          
          if (tableData.columns && tableData.columns.length > 0) {
            const rows = [];
            
            // 处理表格数据
            for (let i = 0; i < tableData.columns.length; i++) {
              const rowData = tableData.columns[i];
              const cells = [];
              
              for (const cellData of rowData) {
                cells.push(
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: String(cellData || ''),
                            size: 20, // 五号字体
                            font: 'SimSun'
                          })
                        ],
                        alignment: AlignmentType.CENTER
                      })
                    ]
                  })
                );
              }
              
              rows.push(new TableRow({ children: cells }));
            }
            
            // 创建表格
            content.push(
              new Table({
                rows: rows,
                width: { size: 100, type: 'pct' },
                borders: {
                  top: { style: 'single', size: 1 },
                  bottom: { style: 'single', size: 1 },
                  left: { style: 'none' },
                  right: { style: 'none' },
                  insideHorizontal: { style: 'none' },
                  insideVertical: { style: 'none' }
                }
              })
            );
            
            console.log(`📊 插入表格: ${tablePath}`);
          }
        } catch (error) {
          console.warn(`⚠️ 表格文件不存在: ${tablePath}`);
          
          // 添加占位符
          content.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[表格文件缺失: ${path.basename(tablePath)}]`,
                  italics: true,
                  color: 'FF0000'
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 }
            })
          );
        }
      }
      
      // 添加表格标签
      if (table.label) {
        content.push(
          new Paragraph({
            children: [
              new TextRun({
                text: table.label,
                size: 20, // 五号字体
                font: 'SimSun'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        );
      }
      
    } catch (error) {
      console.warn(`⚠️ 处理表格失败: ${error.message}`);
      
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[表格处理失败: ${table.label || '未知表格'}]`,
              italics: true,
              color: 'FF0000'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 }
        })
      );
    }
    
    return content;
  },

  /**
   * 获取标题级别
   */
  getHeadingLevel(sectionId) {
    const parts = sectionId.split('.');
    return Math.min(parts.length, 4); // 最多4级标题
  },

  /**
   * 获取标题字体大小
   */
  getHeadingFontSize(level) {
    const sizes = {
      1: 28, // 三号
      2: 24, // 小三号 
      3: 22, // 四号
      4: 20  // 小四号
    };
    return sizes[level] || 20;
  },

  /**
   * 获取DOCX标题级别
   */
  getDocxHeadingLevel(level, HeadingLevel) {
    const levels = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4
    };
    return levels[level] || HeadingLevel.HEADING_4;
  }
};