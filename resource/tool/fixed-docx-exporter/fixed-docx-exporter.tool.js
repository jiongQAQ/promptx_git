/**
 * Fixed DOCX Exporter - 固定格式DOCX文档导出工具
 * 
 * 战略意义：
 * 1. 格式规范化：确保输出文档格式的一致性和标准化
 * 2. 效率优化：专注固定格式，避免复杂编辑器的开销
 * 3. 使用简化：简单文本输入即可生成专业格式文档
 * 
 * 设计理念：
 * 专门针对需要固定字体字号的办公文档场景设计，通过预设
 * 格式模板和简单的文本输入，快速生成符合标准的DOCX文档。
 * 避免了复杂富文本编辑器的学习成本和格式不一致问题。
 * 
 * 为什么重要：
 * 解决了办公场景中文档格式标准化的需求，特别适合批量
 * 生成格式一致的报告、合同、公文等文档。
 */

module.exports = {
  getDependencies() {
    return {
      'docx': '^8.5.0'
    };
  },

  getMetadata() {
    return {
      id: 'fixed-docx-exporter',
      name: '固定格式DOCX导出器',
      description: '生成固定字体字号的标准DOCX文档',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '文档内容，支持\\n分段',
            minLength: 1,
            maxLength: 100000
          },
          title: {
            type: 'string',
            description: '文档标题（可选）',
            maxLength: 200,
            default: ''
          },
          font: {
            type: 'string',
            enum: ['微软雅黑', '宋体', 'Arial', 'Times New Roman', 'Calibri'],
            description: '字体选择',
            default: '微软雅黑'
          },
          fontSize: {
            type: 'number',
            enum: [10, 11, 12, 14, 16, 18, 20],
            description: '字号（磅）',
            default: 12
          },
          lineSpacing: {
            type: 'number',
            enum: [1.0, 1.15, 1.5, 2.0],
            description: '行距倍数',
            default: 1.15
          },
          filename: {
            type: 'string',
            description: '文件名（不含扩展名）',
            pattern: '^[a-zA-Z0-9\\u4e00-\\u9fa5_-]+$',
            maxLength: 50,
            default: '文档'
          }
        },
        required: ['content']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    try {
      api.logger.info('开始生成DOCX文档', { 
        font: params.font,
        fontSize: params.fontSize,
        contentLength: params.content.length
      });

      // 导入docx库
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } = await api.importx('docx');
      const fs = await api.importx('fs');
      const path = await api.importx('path');
      const os = await api.importx('os');

      // 准备文档内容
      const paragraphs = [];
      
      // 添加标题（如果有）
      if (params.title && params.title.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: params.title.trim(),
                font: params.font,
                size: (params.fontSize + 4) * 2, // 标题比正文大4号
                bold: true
              })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400  // 标题后间距
            }
          })
        );
      }

      // 处理正文内容
      const contentLines = params.content.split('\n');
      
      for (const line of contentLines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          // 空行
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '',
                  font: params.font,
                  size: params.fontSize * 2
                })
              ],
              spacing: {
                line: Math.round(params.lineSpacing * 240), // 行距
                lineRule: 'auto'
              }
            })
          );
        } else {
          // 正文段落
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmedLine,
                  font: params.font,
                  size: params.fontSize * 2  // docx库使用半磅为单位
                })
              ],
              spacing: {
                line: Math.round(params.lineSpacing * 240), // 行距
                lineRule: 'auto',
                after: 100  // 段后间距
              },
              indent: {
                firstLine: 480  // 首行缩进2字符
              }
            })
          );
        }
      }

      // 创建文档
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,    // 1英寸 = 1440缇
                  right: 1440,
                  bottom: 1440,
                  left: 1440
                }
              }
            },
            children: paragraphs
          }
        ]
      });

      // 生成文件
      const Packer = (await api.importx('docx')).Packer;
      const buffer = await Packer.toBuffer(doc);
      
      // 保存到下载目录
      const downloadsPath = path.join(os.homedir(), 'Downloads');
      const filename = `${params.filename || '文档'}.docx`;
      const filePath = path.join(downloadsPath, filename);
      
      await fs.promises.writeFile(filePath, buffer);
      
      api.logger.info('文档生成成功', { filePath });
      
      return {
        success: true,
        message: '固定格式DOCX文档生成成功',
        details: {
          filename: filename,
          path: filePath,
          font: params.font,
          fontSize: `${params.fontSize}pt`,
          lineSpacing: `${params.lineSpacing}倍`,
          paragraphs: paragraphs.length,
          fileSize: `${Math.round(buffer.length / 1024)}KB`
        }
      };
      
    } catch (error) {
      api.logger.error('文档生成失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查输入内容格式，确保文本长度适中'
      };
    }
  }
};