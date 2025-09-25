/**
 * JSON章节拆分工具 - 将论文content.json按大章节拆分为多个独立文件
 * 
 * 战略意义：
 * 1. 内容管理革命：将大型JSON文档拆分为可管理的章节文件，提升编辑效率
 * 2. 协作友好性：不同章节可以并行编辑，避免合并冲突，支持团队协作
 * 3. 版本控制优化：Git等版本控制系统能更精确地跟踪章节级别的变更
 * 
 * 设计理念：
 * 保持每个拆分文件的独立性和完整性，确保含义不变。每个章节文件
 * 包含完整的文档元信息和配置，可以独立使用或重新合并。
 * 
 * 为什么重要：
 * 解决了大型学术文档难以管理、协作困难的痛点，让复杂论文的
 * 编写变得模块化和可控制。
 */

module.exports = {
  getDependencies() {
    return {
      'path': 'latest',
      'fs': 'latest'
    };
  },

  getMetadata() {
    return {
      id: 'json-chapter-splitter',
      name: 'JSON章节拆分工具',
      description: '将论文content.json按大章节拆分为多个独立文件，保持结构完整性',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          inputFile: {
            type: 'string',
            description: '输入的content.json文件路径',
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径（相对于~/.promptx/）',
            default: 'chapters'
          },
          preserveStructure: {
            type: 'boolean',
            description: '是否保持完整的文档结构（包含元信息和配置）',
            default: true
          }
        },
        required: ['inputFile']
      }
    };
  },

  async execute(params) {
    
    console.log('开始拆分JSON章节', {
      inputFile: params.inputFile,
      outputDir: params.outputDir
    });

    try {
      const path = await importx('path');
      const fs = await importx('fs');
      
      // 读取原始JSON文件
      const content = await fs.promises.readFile(params.inputFile, 'utf8');
      const originalData = JSON.parse(content);
      const contents = originalData.contents;
      
      if (!contents) {
        throw new Error('JSON文件中未找到contents字段');
      }
      
      // 处理输出目录路径
      let outputPath;
      if (params.outputDir.startsWith('./')) {
        // 相对路径，直接使用
        outputPath = params.outputDir;
      } else {
        // 默认路径或其他，处理为~/.promptx下的路径
        const outputDir = params.outputDir || 'chapters';
        outputPath = path.join(process.env.HOME, '.promptx', outputDir);
      }
      await fs.promises.mkdir(outputPath, { recursive: true });
      
      // 分析章节结构，找出所有大章节（纯数字编号）
      const chapters = this.extractChapters(contents);
      
      console.log(`发现 ${chapters.length} 个大章节`, { chapters: chapters.map(c => c.number) });
      
      // 为每个章节创建独立文件
      const createdFiles = [];
      
      for (const chapter of chapters) {
        const chapterData = params.preserveStructure ? 
          this.createChapterFile(originalData, chapter) :
          { contents: chapter.content };
        
        const fileName = `content.ch${chapter.number}.json`;
        const filePath = path.join(outputPath, fileName);
        
        await fs.promises.writeFile(filePath, JSON.stringify(chapterData, null, 2), 'utf8');
        
        createdFiles.push({
          chapter: chapter.number,
          file: fileName,
          sections: chapter.sectionCount,
          fullPath: filePath
        });
      }
      
      console.log('章节拆分完成', {
        totalChapters: chapters.length,
        outputDir: outputPath
      });
      
      return {
        success: true,
        message: '章节拆分完成',
        totalChapters: chapters.length,
        outputDirectory: outputPath,
        createdFiles
      };
      
    } catch (error) {
      console.error('章节拆分失败', { error: error.toString() });
      
      return {
        success: false,
        error: error.message,
        suggestion: '请检查输入文件路径是否正确，确保JSON格式有效'
      };
    }
  },
  
  // 提取大章节及其所有子内容
  extractChapters(contents) {
    const chapters = [];
    const chapterNumbers = new Set();
    
    // 首先找出所有大章节编号（纯数字）
    for (const key of Object.keys(contents)) {
      if (/^\d+$/.test(key)) {
        chapterNumbers.add(parseInt(key));
      }
    }
    
    // 为每个大章节收集所有相关内容
    for (const chapterNum of Array.from(chapterNumbers).sort((a, b) => a - b)) {
      const chapterContent = {};
      const chapterKey = chapterNum.toString();
      let sectionCount = 0;
      
      // 收集该章节的所有内容（包括子章节）
      for (const [key, value] of Object.entries(contents)) {
        if (key === chapterKey || key.startsWith(chapterKey + '.')) {
          chapterContent[key] = value;
          sectionCount++;
        }
      }
      
      chapters.push({
        number: chapterNum,
        content: chapterContent,
        sectionCount
      });
    }
    
    return chapters;
  },
  
  // 创建包含完整结构的章节文件
  createChapterFile(originalData, chapter) {
    return {
      docId: `${originalData.docId}-chapter-${chapter.number}`,
      meta: {
        ...originalData.meta,
        chapter: chapter.number,
        originalDocId: originalData.docId,
        splitDate: new Date().toISOString()
      },
      defaults: originalData.defaults,
      _templates: originalData._templates,
      promptSnippets: originalData.promptSnippets || {},
      autoApply: originalData.autoApply || [],
      contents: chapter.content
    };
  }
};