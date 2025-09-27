/**
 * 批量章节处理器 - 智能分批生成论文章节内容
 * 
 * 战略意义：
 * 1. 效率提升：通过批量处理避免重复性操作，让CC专注内容生成
 * 2. 质量保证：分批处理避免疲劳导致的质量下降，确保每个章节高质量
 * 3. 流程优化：自动化扫描和规划，减少人工干预和确认步骤
 * 
 * 设计理念：
 * 核心思想是"分治法"处理大量章节任务。将54个章节分成小批次，
 * 让CC以最佳状态处理每批，通过自动调用PRA角色确保专业论文写作质量。
 * 避免一次性处理导致的疲劳和质量下降问题。
 * 
 * 生态定位：
 * 作为PromptX体系中的任务调度工具，专门解决AI在大量重复任务中的
 * 疲劳问题，为其他需要批量处理的场景提供可复用的解决方案。
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'chapter-batch-processor',
      name: '批量章节处理器',
      description: '智能扫描和分批处理论文章节内容生成',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['scan', 'process-all'],
            description: '操作类型：scan=扫描章节，process-all=处理所有章节',
            default: 'process-all'
          },
          batchSize: {
            type: 'number',
            description: '每批处理的章节数量',
            minimum: 1,
            maximum: 8,
            default: 4
          },
          projectPath: {
            type: 'string',
            description: '项目根路径',
            default: '/Users/jiongjiong/Documents/a_git_project/promptx_tools/projects/canteen-rating'
          }
        },
        required: ['action']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    const { action, batchSize = 4, projectPath = '/Users/jiongjiong/Documents/a_git_project/promptx_tools/projects/canteen-rating' } = params;
    
    api.logger.info('开始章节批量处理', { action, batchSize });
    
    try {
      if (action === 'scan') {
        return await this.scanChapters(projectPath);
      } else if (action === 'process-all') {
        return await this.processAllChapters(projectPath, batchSize);
      }
    } catch (error) {
      api.logger.error('处理失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async scanChapters(projectPath) {
    const { api } = this;
    const fs = await api.importx('fs');
    const path = await api.importx('path');
    
    const chaptersDir = path.join(projectPath, 'paper/chapters');
    api.logger.info('扫描章节目录', { chaptersDir });
    
    const files = await fs.promises.readdir(chaptersDir);
    const chapters = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(chaptersDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // 检查是否需要生成内容
        const needsContent = !data.content || data.content.length < 50;
        
        chapters.push({
          id: data.id,
          title: data.title,
          file: file,
          filePath: filePath,
          hasPrompt: !!data.prompt,
          wordLimit: data.word_limit,
          needsContent: needsContent,
          currentLength: data.content ? data.content.length : 0
        });
      }
    }
    
    const needProcessing = chapters.filter(c => c.needsContent);
    
    api.logger.info('章节扫描完成', { 
      total: chapters.length,
      needProcessing: needProcessing.length 
    });
    
    return {
      success: true,
      total: chapters.length,
      needProcessing: needProcessing.length,
      chapters: needProcessing
    };
  },

  async processAllChapters(projectPath, batchSize) {
    const { api } = this;
    
    // 首先扫描章节
    const scanResult = await this.scanChapters(projectPath);
    if (!scanResult.success) {
      return scanResult;
    }
    
    const chapters = scanResult.chapters;
    if (chapters.length === 0) {
      return {
        success: true,
        message: '所有章节都已有内容，无需处理',
        processed: 0
      };
    }
    
    // 分批处理
    const batches = [];
    for (let i = 0; i < chapters.length; i += batchSize) {
      batches.push(chapters.slice(i, i + batchSize));
    }
    
    api.logger.info('开始批量处理', { 
      totalChapters: chapters.length,
      batches: batches.length,
      batchSize 
    });
    
    // 生成处理指令
    const instructions = this.generateProcessingInstructions(batches, projectPath);
    
    return {
      success: true,
      message: `已规划${chapters.length}个章节的处理任务，分${batches.length}批执行`,
      totalChapters: chapters.length,
      batches: batches.length,
      batchSize: batchSize,
      instructions: instructions,
      chapterList: chapters.map(c => ({
        id: c.id,
        title: c.title,
        wordLimit: c.wordLimit
      }))
    };
  },

  generateProcessingInstructions(batches, projectPath) {
    const instructions = [];
    
    instructions.push({
      step: 0,
      action: 'activate_pra',
      description: '激活PRA角色进行专业论文写作',
      command: 'mcp__promptx__action',
      params: { role: 'pra' }
    });
    
    batches.forEach((batch, index) => {
      instructions.push({
        step: index + 1,
        action: 'process_batch',
        description: `处理批次${index + 1}/${batches.length}`,
        batchIndex: index + 1,
        totalBatches: batches.length,
        chapters: batch.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          file: chapter.filePath,
          prompt: chapter.hasPrompt ? '按照JSON中的prompt要求生成' : '生成标准学术内容',
          wordLimit: chapter.wordLimit || '根据章节层级自适应',
          instruction: `读取${chapter.filePath}，根据prompt字段生成content内容，使用Edit工具更新文件`
        }))
      });
    });
    
    return instructions;
  }
};
