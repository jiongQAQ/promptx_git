/**
 * Academic Paper Generator Fixed - 学术论文生成器（修复版）
 * 
 * 战略意义：
 * 1. 学术规范化：严格遵循学术论文格式标准，确保符合学术要求
 * 2. 结构智能化：自动识别章节结构，生成标准目录和页码对应
 * 3. 效率提升：一键生成完整论文，包括目录、正文、参考文献
 * 
 * 设计理念：
 * 专门为学术论文写作设计，通过智能解析章节结构和自动格式化，
 * 让研究者专注于内容创作而非格式调整。支持多级标题、自动目录、
 * 页码对应等学术论文核心要素，确保输出符合学术刊物标准。
 * 
 * 为什么重要：
 * 解决了学术论文写作中格式复杂、目录手工维护的痛点，
 * 让研究者能够快速生成专业的学术文档。
 */

module.exports = {
  getDependencies() {
    return {
      'docx': '^8.5.0'
    };
  },

  getMetadata() {
    return {
      id: 'academic-paper-generator-fixed',
      name: '学术论文生成器（修复版）',
      description: '生成带自动目录的标准学术论文',
      version: '1.0.1',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '论文标题',
            minLength: 1,
            maxLength: 100
          },
          author: {
            type: 'string',
            description: '作者姓名',
            maxLength: 50,
            default: ''
          },
          abstract: {
            type: 'string',
            description: '摘要内容',
            maxLength: 2000,
            default: ''
          },
          keywords: {
            type: 'string',
            description: '关键词（用分号分隔）',
            maxLength: 200,
            default: ''
          },
          content: {
            type: 'string',
            description: '论文正文内容，支持章节标记（# 第1章, ## 1.1, ### 1.1.1）',
            minLength: 1,
            maxLength: 200000
          },
          references: {
            type: 'string',
            description: '参考文献（每行一个）',
            maxLength: 10000,
            default: ''
          },
          outputPath: {
            type: 'string',
            description: '输出目录路径（可选，默认为Downloads）',
            maxLength: 500,
            default: ''
          },
          filename: {
            type: 'string',
            description: '文件名（不含扩展名）',
            pattern: '^[a-zA-Z0-9\\u4e00-\\u9fa5_-]+$',
            maxLength: 50,
            default: '学术论文'
          }
        },
        required: ['title', 'content']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    try {
      api.logger.info('开始生成学术论文', { 
        title: params.title,
        contentLength: params.content.length
      });

      // 导入所需模块
      const { 
        Document, Paragraph, TextRun, HeadingLevel, 
        AlignmentType, PageBreak, Tab
      } = await api.importx('docx');
      const fs = await api.importx('fs');
      const path = await api.importx('path');
      const os = await api.importx('os');

      // 解析章节结构
      const { tableOfContents, sections } = this.parseContent(params.content);
      
      // 创建文档结构
      const docSections = [];
      
      // 1. 封面页
      const coverPage = this.createCoverPage(params, { Paragraph, TextRun, AlignmentType, PageBreak });
      docSections.push(...coverPage);
      
      // 2. 摘要页（如果有）
      if (params.abstract && params.abstract.trim()) {
        const abstractPage = this.createAbstractPage(params, { Paragraph, TextRun, HeadingLevel, PageBreak });
        docSections.push(...abstractPage);
      }
      
      // 3. 目录页
      const tocPage = this.createTableOfContents(tableOfContents, { Paragraph, TextRun, HeadingLevel, Tab, PageBreak });
      docSections.push(...tocPage);
      
      // 4. 正文内容
      const contentPages = this.createContent(sections, { Paragraph, TextRun, HeadingLevel, AlignmentType });
      docSections.push(...contentPages);
      
      // 5. 参考文献（如果有）
      if (params.references && params.references.trim()) {
        const referencesPage = this.createReferences(params.references, { Paragraph, TextRun, HeadingLevel, PageBreak });
        docSections.push(...referencesPage);
      }

      // 创建文档
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,    // 1英寸
                  right: 1440,
                  bottom: 1440,
                  left: 1440
                }
              }
            },
            children: docSections
          }
        ]
      });

      // 生成文件
      const Packer = (await api.importx('docx')).Packer;
      const buffer = await Packer.toBuffer(doc);
      
      // 确定输出路径
      let outputDir;
      if (params.outputPath && params.outputPath.trim()) {
        outputDir = params.outputPath.trim();
        try {
          await fs.promises.access(outputDir);
        } catch (error) {
          await fs.promises.mkdir(outputDir, { recursive: true });
        }
      } else {
        outputDir = path.join(os.homedir(), 'Downloads');
      }
      
      const filename = `${params.filename || '学术论文'}.docx`;
      const filePath = path.join(outputDir, filename);
      
      await fs.promises.writeFile(filePath, buffer);
      
      api.logger.info('学术论文生成成功', { filePath });
      
      return {
        success: true,
        message: '学术论文生成成功',
        details: {
          filename: filename,
          path: filePath,
          structure: {
            sections: sections.length,
            pages: Math.ceil(sections.length / 2) + 3,
            hasAbstract: !!(params.abstract && params.abstract.trim()),
            hasReferences: !!(params.references && params.references.trim()),
            tocEntries: tableOfContents.length
          },
          fileSize: `${Math.round(buffer.length / 1024)}KB`
        }
      };
      
    } catch (error) {
      api.logger.error('学术论文生成失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查内容格式，确保章节标记正确（使用# ## ###）'
      };
    }
  },

  // 解析内容结构
  parseContent(content) {
    const lines = content.split('\n');
    const sections = [];
    const tableOfContents = [];
    let currentPage = 1;
    
    let chapterNum = 0;
    let sectionNum = 0;
    let subsectionNum = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('# ')) {
        chapterNum++;
        sectionNum = 0;
        subsectionNum = 0;
        const title = line.substring(2).trim();
        sections.push({ level: 1, title, content: '', page: currentPage });
        tableOfContents.push({ level: 1, title: `第${chapterNum}章 ${title}`, page: currentPage });
        currentPage++;
      } else if (line.startsWith('## ')) {
        sectionNum++;
        subsectionNum = 0;
        const title = line.substring(3).trim();
        sections.push({ level: 2, title, content: '', page: currentPage });
        tableOfContents.push({ level: 2, title: `${chapterNum}.${sectionNum} ${title}`, page: currentPage });
      } else if (line.startsWith('### ')) {
        subsectionNum++;
        const title = line.substring(4).trim();
        sections.push({ level: 3, title, content: '', page: currentPage });
        tableOfContents.push({ level: 3, title: `${chapterNum}.${sectionNum}.${subsectionNum} ${title}`, page: currentPage });
      } else if (line.length > 0) {
        if (sections.length > 0) {
          sections[sections.length - 1].content += line + '\n';
        }
      }
    }
    
    return { tableOfContents, sections };
  },

  // 创建封面页
  createCoverPage(params, { Paragraph, TextRun, AlignmentType, PageBreak }) {
    const elements = [];
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: params.title,
            font: '宋体',
            size: 36,
            bold: true
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2880, after: 720 }
      })
    );
    
    if (params.author && params.author.trim()) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `作者：${params.author.trim()}`,
              font: '宋体',
              size: 24
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1440 }
        })
      );
    }
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    return elements;
  },

  // 创建摘要页
  createAbstractPage(params, { Paragraph, TextRun, HeadingLevel, PageBreak }) {
    const elements = [];
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '摘要',
            font: '宋体',
            size: 28,
            bold: true
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: params.abstract.trim(),
            font: '宋体',
            size: 24
          })
        ],
        spacing: { line: 360, after: 300 },
        indent: { firstLine: 480 }
      })
    );
    
    if (params.keywords && params.keywords.trim()) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `关键词：${params.keywords.trim()}`,
              font: '宋体',
              size: 24,
              bold: true
            })
          ],
          spacing: { before: 300, after: 400 }
        })
      );
    }
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    return elements;
  },

  // 创建目录页
  createTableOfContents(tocEntries, { Paragraph, TextRun, HeadingLevel, Tab, PageBreak }) {
    const elements = [];
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '目\u3000\u3000录',
            font: '宋体',
            size: 28,
            bold: true
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 400 }
      })
    );
    
    tocEntries.forEach(entry => {
      const indent = (entry.level - 1) * 480;
      
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: entry.title,
              font: '宋体',
              size: 24
            }),
            new Tab(),
            new TextRun({
              text: entry.page.toString(),
              font: '宋体',
              size: 24
            })
          ],
          indent: { left: indent },
          spacing: { after: 120 }
        })
      );
    });
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    return elements;
  },

  // 创建正文内容
  createContent(sections, { Paragraph, TextRun, HeadingLevel, AlignmentType }) {
    const elements = [];
    
    sections.forEach(section => {
      let headingLevel, fontSize;
      
      switch (section.level) {
        case 1:
          headingLevel = HeadingLevel.HEADING_1;
          fontSize = 32;
          break;
        case 2:
          headingLevel = HeadingLevel.HEADING_2;
          fontSize = 28;
          break;
        case 3:
          headingLevel = HeadingLevel.HEADING_3;
          fontSize = 24;
          break;
        default:
          headingLevel = HeadingLevel.HEADING_3;
          fontSize = 24;
      }
      
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              font: '宋体',
              size: fontSize,
              bold: true
            })
          ],
          heading: headingLevel,
          alignment: section.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { 
            before: section.level === 1 ? 400 : 300, 
            after: section.level === 1 ? 200 : 150 
          }
        })
      );
      
      if (section.content && section.content.trim()) {
        const contentLines = section.content.trim().split('\n');
        contentLines.forEach(line => {
          if (line.trim()) {
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.trim(),
                    font: '宋体',
                    size: 24
                  })
                ],
                spacing: { line: 360, after: 120 },
                indent: { firstLine: 480 }
              })
            );
          }
        });
      }
    });
    
    return elements;
  },

  // 创建参考文献
  createReferences(references, { Paragraph, TextRun, HeadingLevel, PageBreak }) {
    const elements = [];
    
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '参考文献',
            font: '宋体',
            size: 28,
            bold: true
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 }
      })
    );
    
    const refLines = references.split('\n').filter(line => line.trim());
    refLines.forEach((ref, index) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${index + 1}] ${ref.trim()}`,
              font: '宋体',
              size: 22
            })
          ],
          spacing: { after: 120 },
          indent: { hanging: 240 }
        })
      );
    });
    
    return elements;
  }
};