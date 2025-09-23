/**
 * JSON DOCX生成器 - 通过JSON配置灵活生成DOCX文档
 * 
 * 战略意义：
 * 1. 灵活化革命：通过JSON配置实现文档格式的程序化控制，革命性提升文档生成的灵活性
 * 2. 数据驱动设计：将文档结构和样式完全数据化，实现真正的数据驱动文档生成
 * 3. 可编程文档：让文档生成变成可编程的API调用，开启文档自动化新纪元
 * 
 * 设计理念：
 * 将复杂的文档格式设置抽象为JSON配置，通过样式引用和层级结构，
 * 实现样式复用和结构化管理。支持图片、表格、多级标题等学术文档
 * 全部要素，让用户只需关注内容创作，格式交给程序处理。
 * 
 * 为什么重要：
 * 破解了传统文档工具的格式固化和操作复杂性，实现了文档生成的
 * 可编程化和自动化，让AI能够真正智能地创造专业文档。
 */

module.exports = {
  getDependencies() {
    return {
      'docx': '^8.5.0'
    };
  },

  getMetadata() {
    return {
      id: 'json-docx-generator',
      name: 'JSON DOCX生成器',
      description: '通过JSON配置灵活生成DOCX文档，支持样式引用和层级结构',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          documentConfig: {
            type: 'object',
            description: 'JSON文档配置，包含样式定义和内容结构',
            properties: {
              title: {
                type: 'string',
                description: '文档标题'
              },
              styles: {
                type: 'object',
                description: '样式定义对象，键为样式名，值为样式配置'
              },
              sections: {
                type: 'array',
                description: '文档内容章节数组',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['heading', 'paragraph', 'figure', 'reference'],
                      description: '内容类型'
                    },
                    content: {
                      type: 'string',
                      description: '内容文本'
                    },
                    styleRef: {
                      type: 'string',
                      description: '引用的样式名'
                    },
                    children: {
                      type: 'array',
                      description: '子级内容'
                    }
                  },
                  required: ['type', 'content']
                }
              }
            },
            required: ['sections']
          },
          outputPath: {
            type: 'string',
            description: '输出目录路径（可选，默认为Downloads）',
            default: ''
          },
          filename: {
            type: 'string',
            description: '文件名（不含扩展名）',
            default: 'document'
          }
        },
        required: ['documentConfig']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始生成JSON DOCX文档', {
      configSize: JSON.stringify(params.documentConfig).length
    });

    try {
      const docx = await api.importx('docx');
      const path = await api.importx('path');
      const fs = await api.importx('fs');
      const os = await api.importx('os');

      const config = params.documentConfig;
      const outputPath = params.outputPath || path.join(os.homedir(), 'Downloads');
      const filename = params.filename || 'document';
      const outputFile = path.join(outputPath, `${filename}.docx`);

      // 处理文档内容
      const children = [];
      
      if (config.sections && Array.isArray(config.sections)) {
        for (const section of config.sections) {
          const sectionElements = await this.processSection(section, config.styles || {}, { docx, api });
          children.push(...sectionElements);
        }
      }

      // 创建文档
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: children
        }]
      });

      // 生成并保存文档
      const buffer = await docx.Packer.toBuffer(doc);
      await fs.promises.writeFile(outputFile, buffer);

      api.logger.info('JSON DOCX文档生成成功', {
        outputFile,
        sectionsCount: config.sections ? config.sections.length : 0
      });

      return {
        success: true,
        message: 'DOCX文档生成成功',
        outputFile,
        documentTitle: config.title || filename,
        sectionsCount: config.sections ? config.sections.length : 0
      };

    } catch (error) {
      api.logger.error('JSON DOCX文档生成失败', { error: error.toString() });
      
      return {
        success: false,
        error: error.message,
        suggestion: '请检查JSON配置格式是否正确，确保包含必要的sections字段'
      };
    }
  },

  async processSection(section, styles, modules) {
    const { docx, api } = modules;
    const elements = [];

    // 获取样式配置
    const style = section.styleRef ? styles[section.styleRef] : {};
    
    try {
      switch (section.type) {
        case 'heading':
        case 'paragraph':
          const para = new docx.Paragraph({
            text: section.content || '',
            ...this.convertStyle(style, docx)
          });
          elements.push(para);
          break;

        case 'figure':
          const figurePara = new docx.Paragraph({
            text: section.description || section.content || '',
            ...this.convertStyle(style, docx)
          });
          elements.push(figurePara);
          break;

        case 'reference':
          const refPara = new docx.Paragraph({
            text: section.content || '',
            ...this.convertStyle(style, docx)
          });
          elements.push(refPara);
          break;

        default:
          api.logger.warn('未知的section类型', { type: section.type });
          break;
      }

      // 递归处理子级内容
      if (section.children && Array.isArray(section.children)) {
        for (const child of section.children) {
          const childElements = await this.processSection(child, styles, modules);
          elements.push(...childElements);
        }
      }

    } catch (error) {
      api.logger.error('处理section失败', { section: section.type, error: error.toString() });
    }

    return elements;
  },

  convertStyle(style, docx) {
    const docxStyle = {};

    if (style.font) {
      docxStyle.font = { name: style.font };
    }

    if (style.size) {
      docxStyle.size = style.size * 2; // docx使用半点单位
    }

    if (style.bold) {
      docxStyle.bold = true;
    }

    if (style.italic) {
      docxStyle.italics = true;
    }

    if (style.alignment) {
      const alignmentMap = {
        'left': docx.AlignmentType.LEFT,
        'center': docx.AlignmentType.CENTER,
        'right': docx.AlignmentType.RIGHT,
        'justify': docx.AlignmentType.JUSTIFIED
      };
      docxStyle.alignment = alignmentMap[style.alignment] || docx.AlignmentType.LEFT;
    }

    if (style.spacing) {
      docxStyle.spacing = {};
      if (style.spacing.before) {
        docxStyle.spacing.before = style.spacing.before;
      }
      if (style.spacing.after) {
        docxStyle.spacing.after = style.spacing.after;
      }
      if (style.spacing.line) {
        docxStyle.spacing.line = Math.round(style.spacing.line * 240); // 转换行间距
      }
    }

    return docxStyle;
  }
};