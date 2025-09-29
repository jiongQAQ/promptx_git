/**
 * 08-docx-style-enhancer - 论文章节样式配置工具
 * 
 * 战略意义：
 * 1. 架构价值：通过标准化样式配置确保论文格式的一致性和专业性
 * 2. 平台价值：支持从JSON到Word的无缝转换，打通学术写作工作流
 * 3. 生态价值：为PromptX论文工具链提供样式标准化基础设施
 * 
 * 设计理念：
 * 专注于批量添加docx_style配置，确保所有章节都有统一的样式设置。
 * 采用非侵入式设计，只添加缺失的docx_style字段，不修改其他内容。
 * 图表标签等需要人工判断的内容不由工具处理，保证内容质量。
 * 
 * 为什么重要：
 * 解决了学术论文样式配置批量化的关键问题，没有它就需要手动逐个
 * 为章节添加docx_style配置，效率低下且容易遗漏。
 */

module.exports = {
  getDependencies() {
    return {
      'glob': '^10.3.10'
    };
  },

  getMetadata() {
    return {
      id: '08-docx-style-enhancer',
      name: '章节样式配置工具',
      description: '为论文章节文件批量添加docx_style配置',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          projectPath: {
            type: 'string',
            description: '项目根目录的绝对路径（包含paper/chapters目录）',
            minLength: 1
          },
          preset: {
            type: 'string',
            description: '使用的样式预设',
            enum: ['academic', 'simple'],
            default: 'academic'
          },
          dryRun: {
            type: 'boolean',
            description: '是否为预览模式（不实际修改文件）',
            default: false
          },
          backup: {
            type: 'boolean',
            description: '是否创建备份',
            default: true
          }
        },
        required: ['projectPath']
      }
    };
  },

  getBridges() {
    return {
      'fs:readFile': {
        real: async (args, api) => {
          api.logger.debug(`[Bridge] 读取文件: ${args.path}`);
          const fs = await api.importx('fs');
          return await fs.promises.readFile(args.path, 'utf8');
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟读取文件: ${args.path}`);
          if (args.path.includes('chapter.3.2.json')) {
            return JSON.stringify({
              id: '3.2',
              title: '系统软件逻辑架构',
              text: '采用前后端分离的三层架构...',
              imagePath: '/path/to/software-architecture.png',
              content: '系统采用经典的三层架构模式...'
            }, null, 2);
          }
          if (args.path.includes('chapter.6.3.1.json')) {
            return JSON.stringify({
              id: '6.3.1',
              title: '用户认证管理功能测试',
              text: '详细测试用户注册、登录...',
              tablePath: '/path/to/test-cases.json',
              content: '用户认证管理功能测试...'
            }, null, 2);
          }
          return JSON.stringify({
            id: '1.1.1',
            title: '研究背景',
            text: '阐述高校食堂管理数字化转型需求...',
            content: '随着我国高等教育事业的快速发展...'
          }, null, 2);
        }
      },

      'fs:writeFile': {
        real: async (args, api) => {
          api.logger.debug(`[Bridge] 写入文件: ${args.path}`);
          const fs = await api.importx('fs');
          return await fs.promises.writeFile(args.path, args.content, 'utf8');
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟写入文件: ${args.path}`);
          api.logger.debug(`[Mock] 内容预览: ${args.content.substring(0, 100)}...`);
          return { written: true, size: args.content.length };
        }
      },

      'glob:scan': {
        real: async (args, api) => {
          api.logger.debug(`[Bridge] 扫描文件: ${args.pattern}`);
          const glob = await api.importx('glob');
          return await glob.glob(args.pattern, { cwd: args.cwd });
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟扫描: ${args.pattern}`);
          return [
            'chapter.1.1.1.json',
            'chapter.3.2.json',
            'chapter.6.3.1.json',
            'chapter.6.3.2.json'
          ];
        }
      },

      'fs:mkdir': {
        real: async (args, api) => {
          api.logger.debug(`[Bridge] 创建目录: ${args.path}`);
          const fs = await api.importx('fs');
          return await fs.promises.mkdir(args.path, { recursive: true });
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟创建目录: ${args.path}`);
          return { created: true };
        }
      }
    };
  },

  getMockArgs(operation) {
    const mockArgs = {
      'fs:readFile': { path: '/mock/project/paper/chapters/chapter.3.2.json' },
      'fs:writeFile': { path: '/mock/project/paper/chapters/chapter.3.2.json', content: '{}' },
      'glob:scan': { pattern: 'chapter.*.json', cwd: '/mock/project/paper/chapters' },
      'fs:mkdir': { path: '/mock/backup/chapters_backup_20250929' }
    };
    return mockArgs[operation] || {};
  },



  async execute(params) {
    const { api } = this;
    const { projectPath, preset = 'academic', dryRun = false, backup = true } = params;
    
    api.logger.info('开始执行章节样式配置增强', { projectPath, preset, dryRun, backup });
    
    try {
      const path = await api.importx('path');
      const chaptersDir = path.join(projectPath, 'paper', 'chapters');
      
      // 1. 扫描章节文件
      api.logger.info('扫描章节文件...');
      const files = await api.bridge.execute('glob:scan', {
        pattern: 'chapter.*.json',
        cwd: chaptersDir
      });
      
      if (files.length === 0) {
        return {
          success: false,
          error: '未找到章节文件',
          suggestion: '请确认paper/chapters目录中存在chapter.*.json文件'
        };
      }
      
      api.logger.info(`找到 ${files.length} 个章节文件`);
      
      // 2. 创建备份（如果启用）
      let backupDir = null;
      if (backup && !dryRun) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        backupDir = path.join(projectPath, 'paper', `chapters_backup_${timestamp}`);
        await api.bridge.execute('fs:mkdir', { path: backupDir });
        api.logger.info(`创建备份目录: ${backupDir}`);
      }
      
      // 3. 处理文件
      const results = {
        processed: 0,
        modified: 0,
        addedDocxStyle: 0,

        errors: []
      };
      
      const counters = {}; // 按章节计数器
      
      // 排序文件确保编号连续性
      files.sort();
      
      for (const filename of files) {
        try {
          const filePath = path.join(chaptersDir, filename);
          api.logger.debug(`处理文件: ${filename}`);
          
          // 读取文件
          const content = await api.bridge.execute('fs:readFile', { path: filePath });
          const chapter = JSON.parse(content);
          let modified = false;
          
          results.processed++;
          
          // 添加docx_style配置
          if (!chapter.docx_style) {
            chapter.docx_style = { preset };
            results.addedDocxStyle++;
            modified = true;
            api.logger.debug(`  ✅ 添加docx_style配置`);
          }
          
          // 保存文件
          if (modified) {
            results.modified++;
            
            if (!dryRun) {
              // 备份原文件
              if (backup && backupDir) {
                const backupPath = path.join(backupDir, filename);
                await api.bridge.execute('fs:writeFile', { 
                  path: backupPath, 
                  content 
                });
              }
              
              // 写入修改后的文件
              const newContent = JSON.stringify(chapter, null, 2);
              await api.bridge.execute('fs:writeFile', { 
                path: filePath, 
                content: newContent 
              });
              api.logger.debug(`  💾 已保存: ${filename}`);
            } else {
              api.logger.debug(`  👁️ 预览模式，未实际修改`);
            }
          } else {
            api.logger.debug(`  ⏭️ 无需修改`);
          }
          
        } catch (error) {
          api.logger.error(`处理文件 ${filename} 失败`, error);
          results.errors.push({ file: filename, error: error.message });
        }
      }
      
      // 4. 生成统计报告
      const summary = {
        totalFiles: results.processed,
        modifiedFiles: results.modified,
        addedDocxStyle: results.addedDocxStyle,
        addedDocxStyleCount: results.addedDocxStyle,
        errors: results.errors,
        backupLocation: backupDir,
        dryRun
      };
      
      api.logger.info('处理完成', summary);
      
      return {
        success: true,
        message: dryRun ? '预览完成' : '处理完成',
        data: summary
      };
      
    } catch (error) {
      api.logger.error('执行失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查项目路径和文件权限'
      };
    }
  }
};