/**
 * PlantUML渲染器 - 批量将PlantUML源码渲染为图片
 * 
 * 战略意义：
 * 1. 架构价值：通过沙箱隔离确保AI工具不会破坏系统稳定性
 * 2. 平台价值：实现跨平台PlantUML图表生成，不依赖本地安装
 * 3. 生态价值：支撑文档自动化、论文图表生成等高级工作流
 * 
 * 设计理念：
 * 采用在线渲染策略而非本地安装，确保在任何环境下都能工作。
 * 通过Bridge模式隔离HTTP请求，支持mock测试和真实渲染两种模式。
 * 批量处理优化性能，支持多种输出格式满足不同场景需求。
 * 
 * 为什么重要：
 * 解决了AI无法直接生成可视化图表的关键问题，让AI能够创建
 * 专业的UML图、流程图、架构图等，极大提升AI的文档创作能力。
 */

module.exports = {
  getDependencies() {
    return {
      'axios': '^1.6.0',
      'path': '^0.12.7'
    };
  },

  getMetadata() {
    return {
      id: 'plantuml-renderer',
      name: 'PlantUML渲染器',
      description: '批量将PlantUML源码渲染为PNG/SVG图片',
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
            enum: ['render_single', 'render_batch', 'list_files'],
            description: '操作类型',
            default: 'render_batch'
          },
          sourceDir: {
            type: 'string',
            description: 'PlantUML源码目录路径',
            default: 'paper/pngs/plantuml'
          },
          outputDir: {
            type: 'string', 
            description: '输出图片目录路径',
            default: 'paper/pngs'
          },
          format: {
            type: 'string',
            enum: ['png', 'svg'],
            description: '输出图片格式',
            default: 'png'
          },
          singleFile: {
            type: 'string',
            description: '单文件渲染时的源文件路径'
          }
        },
        required: ['action']
      },
      environment: {
        type: 'object',
        properties: {
          PLANTUML_SERVER: {
            type: 'string',
            description: 'PlantUML服务器地址',
            default: 'http://www.plantuml.com/plantuml'
          },
          TIMEOUT: {
            type: 'number',
            description: '请求超时时间(ms)',
            default: 30000
          }
        }
      }
    };
  },

  getBridges() {
    return {
      'http:plantuml': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] 渲染PlantUML: ${args.filename}`);
          const axios = await api.importx('axios');
          
          const response = await axios.post(
            `${args.server}/${args.format}`,
            args.source,
            {
              headers: {
                'Content-Type': 'text/plain'
              },
              responseType: 'arraybuffer',
              timeout: args.timeout
            }
          );
          
          return {
            success: true,
            data: response.data,
            contentType: response.headers['content-type']
          };
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟渲染PlantUML: ${args.filename}`);
          
          // 模拟PNG图片数据（最小的1x1透明PNG）
          const mockPngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
          ]);
          
          return {
            success: true,
            data: mockPngData,
            contentType: 'image/png'
          };
        }
      },
      
      'fs:read': {
        real: async (args, api) => {
          const fs = await api.importx('fs');
          return await fs.promises.readFile(args.path, 'utf8');
        },
        mock: async (args, api) => {
          return `@startuml\nactor User\nUser -> System : Mock Request\nSystem -> User : Mock Response\n@enduml`;
        }
      },
      
      'fs:write': {
        real: async (args, api) => {
          const fs = await api.importx('fs');
          const path = await api.importx('path');
          
          // 确保输出目录存在
          const dir = path.dirname(args.path);
          await fs.promises.mkdir(dir, { recursive: true });
          
          await fs.promises.writeFile(args.path, args.data);
          return { success: true, path: args.path };
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 保存文件: ${args.path}`);
          return { success: true, path: args.path };
        }
      },
      
      'fs:scan': {
        real: async (args, api) => {
          const fs = await api.importx('fs');
          const path = await api.importx('path');
          
          const files = await fs.promises.readdir(args.dir);
          return files.filter(file => file.endsWith('.puml'));
        },
        mock: async (args, api) => {
          return [
            'activity-user-auth.puml',
            'sequence-user-auth.puml',
            'usecase-user.puml',
            'er-overview.puml'
          ];
        }
      }
    };
  },

  async execute(params) {
    const { api } = this;
    const path = await api.importx('path');
    
    api.logger.info('PlantUML渲染器启动', { params });
    
    try {
      const server = await api.environment.get('PLANTUML_SERVER') || 'http://www.plantuml.com/plantuml';
      const timeout = parseInt(await api.environment.get('TIMEOUT')) || 30000;
      
      switch (params.action) {
        case 'list_files':
          return await this.listFiles(params, api);
          
        case 'render_single':
          return await this.renderSingle(params, api, server, timeout);
          
        case 'render_batch':
        default:
          return await this.renderBatch(params, api, server, timeout);
      }
    } catch (error) {
      api.logger.error('PlantUML渲染失败', error);
      throw error;
    }
  },
  
  async listFiles(params, api) {
    const files = await api.bridge.execute('fs:scan', {
      dir: params.sourceDir
    });
    
    api.logger.info(`发现${files.length}个PlantUML文件`);
    
    return {
      success: true,
      action: 'list_files',
      sourceDir: params.sourceDir,
      files: files,
      total: files.length
    };
  },
  
  async renderSingle(params, api, server, timeout) {
    if (!params.singleFile) {
      throw new Error('单文件渲染需要指定singleFile参数');
    }
    
    const path = await api.importx('path');
    const sourcePath = path.join(params.sourceDir, params.singleFile);
    
    // 读取源码
    const source = await api.bridge.execute('fs:read', { path: sourcePath });
    
    // 渲染图片
    const result = await api.bridge.execute('http:plantuml', {
      server,
      format: params.format,
      source,
      filename: params.singleFile,
      timeout
    });
    
    if (!result.success) {
      throw new Error(`渲染失败: ${result.error}`);
    }
    
    // 生成输出文件名
    const baseName = path.basename(params.singleFile, '.puml');
    const outputFile = `${baseName}.${params.format}`;
    const outputPath = path.join(params.outputDir, outputFile);
    
    // 保存图片
    await api.bridge.execute('fs:write', {
      path: outputPath,
      data: result.data
    });
    
    api.logger.info(`单文件渲染完成: ${outputFile}`);
    
    return {
      success: true,
      action: 'render_single',
      file: {
        source: params.singleFile,
        output: outputFile,
        path: outputPath,
        format: params.format
      }
    };
  },
  
  async renderBatch(params, api, server, timeout) {
    const path = await api.importx('path');
    
    // 扫描源码文件
    const files = await api.bridge.execute('fs:scan', {
      dir: params.sourceDir
    });
    
    if (files.length === 0) {
      return {
        success: true,
        action: 'render_batch',
        message: '没有找到PlantUML文件',
        sourceDir: params.sourceDir,
        processed: 0,
        results: []
      };
    }
    
    api.logger.info(`开始批量渲染${files.length}个文件`);
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    // 批量处理每个文件
    for (const file of files) {
      try {
        api.logger.info(`正在渲染: ${file}`);
        
        // 读取源码
        const sourcePath = path.join(params.sourceDir, file);
        const source = await api.bridge.execute('fs:read', { path: sourcePath });
        
        // 渲染图片
        const renderResult = await api.bridge.execute('http:plantuml', {
          server,
          format: params.format,
          source,
          filename: file,
          timeout
        });
        
        if (!renderResult.success) {
          throw new Error(renderResult.error || '渲染失败');
        }
        
        // 生成输出文件名
        const baseName = path.basename(file, '.puml');
        const outputFile = `${baseName}.${params.format}`;
        const outputPath = path.join(params.outputDir, outputFile);
        
        // 保存图片
        await api.bridge.execute('fs:write', {
          path: outputPath,
          data: renderResult.data
        });
        
        results.push({
          source: file,
          output: outputFile,
          path: outputPath,
          status: 'success',
          format: params.format
        });
        
        successCount++;
        api.logger.info(`渲染成功: ${file} -> ${outputFile}`);
        
      } catch (error) {
        results.push({
          source: file,
          status: 'failed',
          error: error.message
        });
        
        failedCount++;
        api.logger.error(`渲染失败: ${file}`, error);
      }
    }
    
    api.logger.info(`批量渲染完成: 成功${successCount}个，失败${failedCount}个`);
    
    return {
      success: true,
      action: 'render_batch',
      sourceDir: params.sourceDir,
      outputDir: params.outputDir,
      format: params.format,
      total: files.length,
      processed: files.length,
      successCount,
      failedCount,
      results: results.slice(0, 10), // 只返回前10个结果避免数据过大
      summary: {
        allFiles: files,
        successFiles: results.filter(r => r.status === 'success').map(r => r.output),
        failedFiles: results.filter(r => r.status === 'failed').map(r => r.source)
      }
    };
  },
  
  getBusinessErrors() {
    return [
      {
        code: 'PLANTUML_SERVER_ERROR',
        description: 'PlantUML服务器错误',
        match: /plantuml.*error|server.*error/i,
        solution: '检查PlantUML服务器是否可用',
        retryable: true
      },
      {
        code: 'PLANTUML_SYNTAX_ERROR',
        description: 'PlantUML语法错误',
        match: /syntax.*error|invalid.*uml/i,
        solution: '检查PlantUML源码语法',
        retryable: false
      },
      {
        code: 'NETWORK_TIMEOUT',
        description: '网络请求超时',
        match: /timeout|etimedout/i,
        solution: '增加TIMEOUT环境变量或检查网络连接',
        retryable: true
      }
    ];
  }
};