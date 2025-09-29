/**
 * 09-thesis-to-docx - 学术论文章节JSON到DOCX文档转换工具
 * 
 * 战略意义：
 * 1. 文档自动化价值：将结构化的论文章节数据转换为标准学术格式文档，
 *    大幅提升论文写作效率，避免手工排版的重复劳动
 * 2. 格式标准化价值：确保生成的文档符合学术规范，统一图表标签位置、
 *    三线表格式、字体段落等细节，提升论文质量
 * 3. 数据驱动价值：基于JSON结构化数据生成文档，支持批量处理、
 *    版本控制和自动化工作流集成
 * 
 * 设计理念：
 * 采用声明式数据驱动的文档生成方式，将内容与格式分离。
 * 通过Bridge模式隔离docx库依赖，确保工具在无真实依赖环境下
 * 也能通过mock数据进行逻辑验证。重点关注图片标签下置、
 * 表格标签下置的学术规范要求。
 * 
 * 为什么重要：
 * 解决了论文写作中格式化耗时、标准不统一的关键痛点，
 * 让作者专注内容创作而非排版细节。
 */

module.exports = {
  // 声明npm依赖
  getDependencies() {
    return {
      'docx': '^9.0.2',
      'glob': '^11.0.0', 
      'fs-extra': '^11.2.0',
      'lodash': '^4.17.21'
    };
  },

  // 工具元信息
  getMetadata() {
    return {
      id: '09-thesis-to-docx',
      name: '论文章节转DOCX工具',
      description: '将JSON格式的论文章节转换为标准学术格式的DOCX文档',
      version: '1.0.0',
      author: '鲁班',
      tags: ['thesis', 'docx', 'document', 'academic', 'conversion']
    };
  },

  // 参数Schema定义
  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          sourceDir: {
            type: 'string',
            description: '章节JSON文件所在目录的绝对路径',
            minLength: 1
          },
          outputPath: {
            type: 'string', 
            description: '输出DOCX文件的绝对路径',
            minLength: 1
          },
          thesisTitle: {
            type: 'string',
            description: '论文标题，用于文档标题页',
            minLength: 1
          },
          includeImages: {
            type: 'boolean',
            description: '是否包含图片（默认true）',
            default: true
          },
          includeTables: {
            type: 'boolean', 
            description: '是否包含表格（默认true）',
            default: true
          }
        },
        required: ['sourceDir', 'outputPath', 'thesisTitle'],
        additionalProperties: false
      }
    };
  },

  // Bridge隔离外部依赖
  getBridges() {
    return {
      // 读取章节文件
      'file:readChapter': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Reading chapter file: ${args.path}`);
          const fs = await api.importx('fs-extra');
          const content = await fs.readJson(args.path);
          api.logger.info(`[Bridge] Chapter loaded: ${content.id} - ${content.title}`);
          return content;
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Reading chapter file: ${args.path}`);
          return {
            id: '1.1.1',
            title: '示例章节',
            content: '这是一个示例章节的内容，用于演示文档生成功能。',
            imagePath: '/mock/path/example-image.png',
            imageLabel: '图1-1 示例图片',
            tablePath: '/mock/path/example-table.json',
            tableLabel: '表1-1 示例表格',
            docx_style: { preset: 'academic' }
          };
        }
      },

      // 读取样式配置文件
      'file:readStyleConfig': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Reading style config: ${args.path}`);
          const fs = await api.importx('fs-extra');
          const config = await fs.readJson(args.path);
          api.logger.info(`[Bridge] Style config loaded`);
          return config;
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Reading style config: ${args.path}`);
          return {
            styles: {
              chapter_title: { font: { size: 28, bold: true }, alignment: 'center' },
              keywords_label: { font: { size: 24, bold: true } },
              keywords_content: { font: { size: 24, bold: false } }
            },
            presets: {
              academic: {
                defaultStyles: {
                  chapter: 'chapter_title',
                  keywordsLabel: 'keywords_label',
                  keywordsContent: 'keywords_content'
                }
              }
            }
          };
        }
      },

      // 读取内容计划文件
      'file:readContentPlan': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Reading content plan: ${args.path}`);
          const fs = await api.importx('fs-extra');
          const plan = await fs.readJson(args.path);
          api.logger.info(`[Bridge] Content plan loaded with ${plan.length} items`);
          return plan;
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Reading content plan: ${args.path}`);
          return [
            { id: '1', title: '第1章 绪论' },
            { id: '1.1', title: '研究背景与意义' },
            { id: '1.1.1', title: '研究背景' }
          ];
        }
      },

      // 读取表格文件
      'file:readTable': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Reading table file: ${args.path}`);
          const fs = await api.importx('fs-extra');
          const tableData = await fs.readJson(args.path);
          api.logger.info(`[Bridge] Table loaded: ${tableData.tableCnName}`);
          return tableData;
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Reading table file: ${args.path}`);
          return {
            tableName: 'example_table',
            tableCnName: '示例表',
            columns: [
              ['字段名', '类型', '说明'],
              ['id', 'BIGINT', '主键'],
              ['name', 'VARCHAR(255)', '名称'],
              ['created_time', 'DATETIME', '创建时间']
            ]
          };
        }
      },

      // 读取图片文件
      'file:readImage': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Reading image file: ${args.path}`);
          const fs = await api.importx('fs-extra');
          const imageBuffer = await fs.readFile(args.path);
          api.logger.info(`[Bridge] Image loaded, size: ${imageBuffer.length} bytes`);
          return imageBuffer;
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Reading image file: ${args.path}`);
          // 返回一个小的透明PNG的Base64数据
          const mockPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
          return Buffer.from(mockPngBase64, 'base64');
        }
      },

      // 生成DOCX文档
      'docx:generate': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] Generating DOCX: ${args.outputPath}`);
          const docx = await api.importx('docx');
          const fs = await api.importx('fs-extra');
          
          // 写入DOCX文件
          const buffer = await docx.Packer.toBuffer(args.document);
          await fs.writeFile(args.outputPath, buffer);
          
          const stats = await fs.stat(args.outputPath);
          api.logger.info(`[Bridge] DOCX generated successfully, size: ${stats.size} bytes`);
          
          return {
            path: args.outputPath,
            size: stats.size,
            success: true
          };
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] Generating DOCX: ${args.outputPath}`);
          return {
            path: args.outputPath,
            size: 2048576, // 模拟2MB文件
            success: true
          };
        }
      }
    };
  },

  // 提供测试参数
  getMockArgs(operation) {
    const mockArgs = {
      'file:readChapter': {
        path: '/mock/chapters/chapter.1.1.1.json'
      },
      'file:readStyleConfig': {
        path: '/mock/templates/docx-styles.json'
      },
      'file:readContentPlan': {
        path: '/mock/paper/content.plan.json'
      },
      'file:readTable': {
        path: '/mock/tables/Tab-user.json'
      },
      'file:readImage': {
        path: '/mock/images/example.png'
      },
      'docx:generate': {
        outputPath: '/mock/output/thesis.docx',
        document: {} // Mock docx Document object
      }
    };
    return mockArgs[operation] || {};
  },

  // 主执行逻辑
  async execute(params) {
    const { api } = this;

    api.logger.info('开始生成论文DOCX文档', {
      chapterDirectoryPath: params.chapterDirectoryPath,
      outputPath: params.outputPath,
      styleConfigPath: params.styleConfigPath,
      contentPlanPath: params.contentPlanPath
    });

    try {
      // 1. 加载样式配置
      const styleConfig = await api.bridge.execute('file:readStyleConfig', { path: params.styleConfigPath });
      api.logger.info('样式配置加载成功');

      // 2. 加载内容计划（大纲结构）
      const contentPlan = await api.bridge.execute('file:readContentPlan', { path: params.contentPlanPath });
      const chapterStructure = this.buildChapterStructure(contentPlan);
      api.logger.info(`内容大纲加载成功，共 ${contentPlan.length} 个节点`);

      // 3. 扫描并排序章节文件
      const chapters = await this.scanChapters(params.chapterDirectoryPath, api);
      api.logger.info(`发现 ${chapters.length} 个章节文件`);

      // 4. 收集所有文档段落（避免分页问题）
      const allParagraphs = [];
      let imageCount = 0;
      let tableCount = 0;

      for (const chapterPath of chapters) {
        const chapter = await api.bridge.execute('file:readChapter', { path: chapterPath });

        // 判断是否显示内容（检查是否有子章节）
        const hasSubChapters = this.hasSubChapters(chapter.id, chapterStructure);

        const { paragraphs, images, tables } = await this.processChapterToParagraphs(
          chapter, hasSubChapters, styleConfig, params, api
        );

        allParagraphs.push(...paragraphs);
        imageCount += images;
        tableCount += tables;
      }

      // 5. 创建DOCX文档（一次性生成所有段落）
      const document = await this.createDocumentWithParagraphs(
        params.thesisTitle, allParagraphs, styleConfig, api
      );

      // 6. 生成并保存文档
      const result = await api.bridge.execute('docx:generate', {
        document: document,
        outputPath: params.outputPath
      });

      api.logger.info('DOCX文档生成成功', {
        chapters: chapters.length,
        images: imageCount,
        tables: tableCount,
        outputPath: params.outputPath
      });

      return {
        success: true,
        outputPath: params.outputPath,
        stats: {
          chapters: chapters.length,
          images: imageCount,
          tables: tableCount,
          fileSize: this.formatFileSize(result.size)
        }
      };

    } catch (error) {
      api.logger.error('DOCX文档生成失败', error);
      throw error;
    }
  },

  // 扫描并排序章节文件
  async scanChapters(sourceDir, api) {
    const glob = await api.importx('glob');
    const path = await api.importx('path');
    
    const pattern = path.join(sourceDir, '**/*.json');
    const files = await glob.glob(pattern);
    
    // 按章节ID排序
    return files.sort((a, b) => {
      const idA = this.extractChapterId(a);
      const idB = this.extractChapterId(b);
      return this.compareChapterIds(idA, idB);
    });
  },

  // 提取章节ID
  extractChapterId(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return '0';
    }
    const match = filePath.match(/chapter\.(\d+(?:\.\d+)*)\.json$/);
    return match ? match[1] : '0';
  },

  // 比较章节ID（支持多级编号）
  compareChapterIds(idA, idB) {
    // 确保两个ID都是字符串
    if (!idA || typeof idA !== 'string') idA = '0';
    if (!idB || typeof idB !== 'string') idB = '0';

    const partsA = idA.split('.').map(Number);
    const partsB = idB.split('.').map(Number);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      const a = partsA[i] || 0;
      const b = partsB[i] || 0;
      if (a !== b) return a - b;
    }

    return 0;
  },

  // 构建章节结构映射
  buildChapterStructure(contentPlan) {
    const structure = {};
    const childrenMap = {};

    for (const item of contentPlan) {
      // 确保item.id存在且是字符串
      if (!item.id || typeof item.id !== 'string') {
        continue;
      }

      structure[item.id] = item;
      const parts = item.id.split('.');

      // 记录父子关系
      if (parts.length > 1) {
        const parentId = parts.slice(0, -1).join('.');
        if (!childrenMap[parentId]) {
          childrenMap[parentId] = [];
        }
        childrenMap[parentId].push(item.id);
      }
    }

    return { structure, childrenMap };
  },

  // 检查是否有子章节
  hasSubChapters(chapterId, chapterStructure) {
    return !!(chapterStructure.childrenMap[chapterId] &&
              chapterStructure.childrenMap[chapterId].length > 0);
  },

  // 处理章节并转换为段落数组
  async processChapterToParagraphs(chapter, hasSubChapters, styleConfig, params, api) {
    const paragraphs = [];
    let imageCount = 0;
    let tableCount = 0;

    // 获取样式预设
    const preset = chapter.docx_style?.preset || 'academic';
    const defaultStyles = styleConfig.presets[preset]?.defaultStyles || {};

    // 处理特殊章节（摘要、关键词等）
    if (chapter.id === '0') {
      // 摘要标题
      paragraphs.push(await this.createStyledParagraph(
        chapter.title, 'title', styleConfig, api
      ));
    } else if (chapter.id === '0.1' || chapter.id === '0.3') {
      // 关键词处理（标签和内容在同一行）
      const keywordContent = chapter.content || chapter.text || '';
      paragraphs.push(await this.createKeywordsParagraph(
        chapter.title, keywordContent, styleConfig, api
      ));
    } else if (chapter.id === '0.2') {
      // Abstract标题
      paragraphs.push(await this.createStyledParagraph(
        chapter.title, 'title', styleConfig, api
      ));
    } else {
      // 普通章节标题 - 添加"第X章"前缀
      const level = this.getChapterLevel(chapter.id);
      const styleName = level === 1 ? 'chapter' :
                       level === 2 ? 'section' : 'subsection';
      const styleKey = defaultStyles[styleName] || 'chapter_title';

      let titleText = chapter.title;
      // 为一级标题添加"第X章"前缀
      if (level === 1 && /^\d+$/.test(chapter.id)) {
        titleText = `第${chapter.id}章 ${chapter.title}`;
      }

      paragraphs.push(await this.createStyledParagraph(
        titleText, styleKey, styleConfig, api
      ));
    }

    // 主章节内容：只有叶子节点才显示content
    if (!hasSubChapters && chapter.content) {
      paragraphs.push(await this.createStyledParagraph(
        chapter.content, defaultStyles.text || 'body_text', styleConfig, api
      ));
    }

    // 处理图片
    if ((params.includeImages !== false) && chapter.imagePath) {
      const imageParagraphs = await this.createImageParagraphs(
        chapter.imagePath, chapter.imageLabel, styleConfig, api
      );
      paragraphs.push(...imageParagraphs);
      imageCount++;
    }

    // 处理时序图
    if ((params.includeImages !== false) && chapter.imagePathSequence) {
      const imageParagraphs = await this.createImageParagraphs(
        chapter.imagePathSequence, chapter.imageLabelSequence, styleConfig, api
      );
      paragraphs.push(...imageParagraphs);
      imageCount++;
    }

    // 处理表格
    if ((params.includeTables !== false) && chapter.tablePath) {
      const tableParagraphs = await this.createTableParagraphs(
        chapter.tablePath, chapter.tableLabel, styleConfig, api
      );
      paragraphs.push(...tableParagraphs);
      tableCount++;
    }

    // 处理items子项 - 特殊处理逻辑
    if (chapter.items && Array.isArray(chapter.items)) {
      for (const item of chapter.items) {
        const itemResult = await this.processItemToParagraphs(
          item, styleConfig, params, api
        );
        paragraphs.push(...itemResult.paragraphs);
        imageCount += itemResult.images;
        tableCount += itemResult.tables;
      }
    }

    return { paragraphs, images: imageCount, tables: tableCount };
  },

  // 处理items子项的特殊逻辑
  async processItemToParagraphs(item, styleConfig, params, api) {
    const paragraphs = [];
    let imageCount = 0;
    let tableCount = 0;

    // 获取样式预设
    const preset = item.docx_style?.preset || 'academic';
    const defaultStyles = styleConfig.presets[preset]?.defaultStyles || {};

    // 1. 子项标题
    if (item.title) {
      paragraphs.push(await this.createStyledParagraph(
        item.title, defaultStyles.subsection || 'subsection_title', styleConfig, api
      ));
    }

    // 2. 子项内容 - items用text字段，不是content
    const itemContentText = item.text || item.content || '';
    if (itemContentText) {
      paragraphs.push(await this.createStyledParagraph(
        itemContentText, defaultStyles.text || 'body_text', styleConfig, api
      ));
    }

    // 3. 子项图片
    if ((params.includeImages !== false) && item.imagePath) {
      const imageParagraphs = await this.createImageParagraphs(
        item.imagePath, item.imageLabel, styleConfig, api
      );
      paragraphs.push(...imageParagraphs);
      imageCount++;
    }

    // 4. 子项表格
    if ((params.includeTables !== false) && item.tablePath) {
      const tableParagraphs = await this.createTableParagraphs(
        item.tablePath, item.tableLabel, styleConfig, api
      );
      paragraphs.push(...tableParagraphs);
      tableCount++;
    }

    return { paragraphs, images: imageCount, tables: tableCount };
  },

  // 获取章节层级
  getChapterLevel(chapterId) {
    if (!chapterId || typeof chapterId !== 'string') {
      return 1;
    }
    const parts = chapterId.split('.');
    return parts.length;
  },

  // 创建DOCX文档（一次性包含所有段落）
  async createDocumentWithParagraphs(title, allParagraphs, styleConfig, api) {
    const docx = await api.importx('docx');

    return new docx.Document({
      creator: 'PromptX 09-thesis-to-docx',
      title: title,
      description: '学术论文自动生成文档',
      styles: await this.convertStylesToDocxStyles(styleConfig, api),
      sections: [{
        properties: {
          page: {
            margin: {
              top: styleConfig.presets.academic?.page?.margin?.top || 1440,
              bottom: styleConfig.presets.academic?.page?.margin?.bottom || 1440,
              left: styleConfig.presets.academic?.page?.margin?.left || 1800,
              right: styleConfig.presets.academic?.page?.margin?.right || 1800
            }
          }
        },
        children: allParagraphs
      }]
    });
  },

  // 创建带样式的段落
  async createStyledParagraph(text, styleKey, styleConfig, api) {
    const docx = await api.importx('docx');
    const style = styleConfig.styles[styleKey] || styleConfig.styles.default || {};

    return new docx.Paragraph({
      text: text,
      alignment: this.convertAlignment(style.alignment),
      spacing: {
        before: style.spacing?.before || 0,
        after: style.spacing?.after || 0,
        line: Math.round((style.spacing?.line || 1.15) * 240) // 转换为twips
      },
      indent: {
        firstLine: style.indent?.firstLine || 0,
        left: style.indent?.left || 0,
        right: style.indent?.right || 0
      },
      run: {
        font: style.font?.name || 'SimSun',
        size: style.font?.size || 24,
        bold: style.font?.bold || false,
        italic: style.font?.italic || false,
        color: style.font?.color || '000000'
      }
    });
  },

  // 创建关键词段落（标签和内容在同一行）
  async createKeywordsParagraph(label, content, styleConfig, api) {
    const docx = await api.importx('docx');
    const labelStyle = styleConfig.styles.keywords_label || styleConfig.styles.default;
    const contentStyle = styleConfig.styles.keywords_content || styleConfig.styles.default;

    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: label + '：',
          font: labelStyle.font?.name || 'SimSun',
          size: labelStyle.font?.size || 24,
          bold: labelStyle.font?.bold || false,
          color: labelStyle.font?.color || '000000'
        }),
        new docx.TextRun({
          text: content,
          font: contentStyle.font?.name || 'SimSun',
          size: contentStyle.font?.size || 24,
          bold: contentStyle.font?.bold || false,
          color: contentStyle.font?.color || '000000'
        })
      ],
      spacing: {
        before: labelStyle.spacing?.before || 100,
        after: labelStyle.spacing?.after || 100,
        line: Math.round((labelStyle.spacing?.line || 1.5) * 240)
      }
    });
  },

  // 创建图片段落（图片+标签）
  async createImageParagraphs(imagePath, imageLabel, styleConfig, api) {
    const paragraphs = [];

    try {
      // 检查图片路径是否存在
      if (!imagePath) {
        api.logger.warn('图片路径为空');
        return paragraphs;
      }

      const fs = await api.importx('fs-extra');
      const path = await api.importx('path');

      // 检查文件是否存在
      if (!(await fs.pathExists(imagePath))) {
        api.logger.warn(`图片文件不存在: ${imagePath}`);
        // 添加错误提示段落
        const docx = await api.importx('docx');
        paragraphs.push(new docx.Paragraph({
          text: `[图片文件不存在: ${path.basename(imagePath)}]`,
          alignment: 'center',
          spacing: { before: 100, after: 100 },
          run: {
            font: 'SimSun',
            size: 22,
            color: 'FF0000',
            italic: true
          }
        }));
        return paragraphs;
      }

      const docx = await api.importx('docx');
      const imageBuffer = await api.bridge.execute('file:readImage', { path: imagePath });

      if (!imageBuffer || imageBuffer.length === 0) {
        api.logger.warn(`图片读取失败: ${imagePath}`);
        return paragraphs;
      }

      // 添加图片段落
      paragraphs.push(new docx.Paragraph({
        children: [
          new docx.ImageRun({
            data: imageBuffer,
            transformation: {
              width: 400,
              height: 300
            }
          })
        ],
        alignment: 'center',
        spacing: { after: 60 }
      }));

      // 添加图片标签（在下方）
      if (imageLabel) {
        const captionStyle = styleConfig.styles.figure_caption || styleConfig.styles.default;
        paragraphs.push(new docx.Paragraph({
          text: imageLabel,
          alignment: this.convertAlignment(captionStyle.alignment),
          spacing: {
            before: captionStyle.spacing?.before || 100,
            after: captionStyle.spacing?.after || 200,
            line: Math.round((captionStyle.spacing?.line || 1.15) * 240)
          },
          run: {
            font: captionStyle.font?.name || 'SimSun',
            size: captionStyle.font?.size || 22,
            bold: captionStyle.font?.bold || false,
            color: captionStyle.font?.color || '000000'
          }
        }));
      }

      api.logger.info(`图片已添加: ${imageLabel} (${imagePath})`);
    } catch (error) {
      api.logger.warn(`图片添加失败: ${imagePath}`, error);
      // 添加错误提示段落
      try {
        const docx = await api.importx('docx');
        paragraphs.push(new docx.Paragraph({
          text: `[图片加载错误: ${imageLabel || 'Unknown'}]`,
          alignment: 'center',
          spacing: { before: 100, after: 100 },
          run: {
            font: 'SimSun',
            size: 22,
            color: 'FF0000',
            italic: true
          }
        }));
      } catch (e) {
        // 如果连错误段落都无法添加，则忽略
      }
    }

    return paragraphs;
  },

  // 创建表格段落（表格+标签）
  async createTableParagraphs(tablePath, tableLabel, styleConfig, api) {
    const paragraphs = [];

    try {
      // 检查表格路径是否存在
      if (!tablePath) {
        api.logger.warn('表格路径为空');
        return paragraphs;
      }

      const fs = await api.importx('fs-extra');
      const path = await api.importx('path');

      // 检查文件是否存在
      if (!(await fs.pathExists(tablePath))) {
        api.logger.warn(`表格文件不存在: ${tablePath}`);
        // 添加错误提示段落
        const docx = await api.importx('docx');
        paragraphs.push(new docx.Paragraph({
          text: `[表格文件不存在: ${path.basename(tablePath)}]`,
          alignment: 'center',
          spacing: { before: 100, after: 100 },
          run: {
            font: 'SimSun',
            size: 22,
            color: 'FF0000',
            italic: true
          }
        }));
        return paragraphs;
      }

      const docx = await api.importx('docx');
      const tableData = await api.bridge.execute('file:readTable', { path: tablePath });

      if (!tableData || !tableData.columns || tableData.columns.length === 0) {
        api.logger.warn(`表格数据为空: ${tablePath}`);
        paragraphs.push(new docx.Paragraph({
          text: `[表格数据为空: ${tableLabel || 'Unknown'}]`,
          alignment: 'center',
          spacing: { before: 100, after: 100 },
          run: {
            font: 'SimSun',
            size: 22,
            color: 'FF0000',
            italic: true
          }
        }));
        return paragraphs;
      }

      // 创建表格行（三线表格式）
      const rows = tableData.columns.map((row, index) => {
        return new docx.TableRow({
          children: row.map((cell, cellIndex) => {
            const isHeader = index === 0;
            const isLastRow = index === tableData.columns.length - 1;

            return new docx.TableCell({
              children: [new docx.Paragraph({
                text: cell || '',
                alignment: isHeader ? 'center' : 'left',
                run: {
                  font: 'SimSun',
                  size: 20,
                  bold: isHeader
                }
              })],
              borders: {
                // 三线表：只有表头上下线和表格底线
                top: isHeader ? { style: 'single', size: 2, color: '000000' } : { style: 'none' },
                bottom: (isHeader || isLastRow) ? { style: 'single', size: isHeader ? 1 : 2, color: '000000' } : { style: 'none' },
                left: { style: 'none' },
                right: { style: 'none' }
              },
              width: {
                size: Math.floor(100 / row.length),
                type: 'percentage'
              }
            });
          })
        });
      });

      // 添加表格
      paragraphs.push(new docx.Table({
        rows: rows,
        width: {
          size: 100,
          type: 'percentage'
        },
        alignment: 'center',
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
      }));

      // 添加表格标签（在下方）
      if (tableLabel) {
        const captionStyle = styleConfig.styles.table_caption || styleConfig.styles.default;
        paragraphs.push(new docx.Paragraph({
          text: tableLabel,
          alignment: this.convertAlignment(captionStyle.alignment),
          spacing: {
            before: captionStyle.spacing?.before || 200,
            after: captionStyle.spacing?.after || 100,
            line: Math.round((captionStyle.spacing?.line || 1.15) * 240)
          },
          run: {
            font: captionStyle.font?.name || 'SimSun',
            size: captionStyle.font?.size || 22,
            bold: captionStyle.font?.bold || false,
            color: captionStyle.font?.color || '000000'
          }
        }));
      }

      api.logger.info(`表格已添加: ${tableLabel} (${tablePath})`);
    } catch (error) {
      api.logger.warn(`表格添加失败: ${tablePath}`, error);
      // 添加错误提示段落
      try {
        const docx = await api.importx('docx');
        paragraphs.push(new docx.Paragraph({
          text: `[表格加载错误: ${tableLabel || 'Unknown'}]`,
          alignment: 'center',
          spacing: { before: 100, after: 100 },
          run: {
            font: 'SimSun',
            size: 22,
            color: 'FF0000',
            italic: true
          }
        }));
      } catch (e) {
        // 如果连错误段落都无法添加，则忽略
      }
    }

    return paragraphs;
  },

  // 转换对齐方式（使用字符串常量）
  convertAlignment(alignment) {
    switch (alignment) {
      case 'center': return 'center';
      case 'right': return 'right';
      case 'justified': return 'justified';
      default: return 'left';
    }
  },

  // 转换样式配置为DOCX样式
  async convertStylesToDocxStyles(styleConfig, api) {
    const defaultStyle = styleConfig.styles.default || {};

    return {
      default: {
        document: {
          run: {
            font: defaultStyle.font?.name || 'SimSun',
            size: defaultStyle.font?.size || 24
          },
          paragraph: {
            spacing: {
              line: Math.round((defaultStyle.spacing?.line || 1.15) * 240),
              before: defaultStyle.spacing?.before || 0,
              after: defaultStyle.spacing?.after || 0
            },
            indent: {
              firstLine: defaultStyle.indent?.firstLine || 0
            }
          }
        }
      }
    };
  },


  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};