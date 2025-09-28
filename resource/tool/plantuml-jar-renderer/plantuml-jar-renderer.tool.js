/**
 * PlantUML JAR渲染器 - 基于本地jar包的UML图表渲染工具
 * 
 * 战略意义：
 * 1. 架构价值：通过本地jar包执行确保完全离线工作，无需网络依赖
 * 2. 平台价值：基于标准Java环境，跨平台兼容性强
 * 3. 生态价值：为文档自动化、论文图表生成提供可靠的本地渲染能力
 * 
 * 设计理念：
 * 采用本地jar包策略而非在线服务，确保渲染的可靠性和速度。
 * 通过Bridge模式隔离Java进程调用，支持mock测试和真实渲染。
 * 直接操作项目文件系统，无需临时文件处理。
 * 
 * 为什么重要：
 * 解决了网络服务不稳定的问题，让AI能够在任何环境下创建
 * 专业的UML图、流程图、架构图等，提供100%可靠的渲染能力。
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'plantuml-jar-renderer',
      name: 'PlantUML JAR渲染器',
      description: '使用本地jar包渲染PlantUML图表为PNG/SVG格式',
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
            description: 'PlantUML源码目录路径（相对于项目根目录）',
            default: 'paper/pngs/plantuml'
          },
          outputDir: {
            type: 'string',
            description: '输出图片目录路径（相对于项目根目录）',
            default: 'paper/pngs'
          },
          format: {
            type: 'string',
            enum: ['png', 'svg', 'txt', 'eps'],
            description: '输出图片格式',
            default: 'png'
          },
          singleFile: {
            type: 'string',
            description: '单文件渲染时的源文件名（不含路径）'
          }
        },
        required: ['action']
      },
      environment: {
        type: 'object',
        properties: {
          PROJECT_ROOT: {
            type: 'string',
            description: '项目根目录路径',
            default: '/Users/pc/Documents/promptx_tools/projects/canteen-rating'
          },
          JAVA_HOME: {
            type: 'string',
            description: 'Java安装路径（可选）'
          }
        }
      }
    };
  },

  getBridges() {
    return {
      'java:execute': {
        real: async (args, api) => {
          api.logger.info(`[Bridge] 执行Java命令: ${args.command}`);
          const { exec } = await api.importx('child_process');
          const { promisify } = await api.importx('util');
          const execAsync = promisify(exec);
          
          try {
            const result = await execAsync(args.command, {
              cwd: args.workingDir,
              timeout: args.timeout || 60000,
              maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            
            api.logger.info('[Bridge] Java命令执行成功');
            return {
              success: true,
              stdout: result.stdout,
              stderr: result.stderr
            };
          } catch (error) {
            api.logger.error('[Bridge] Java命令执行失败', error);
            throw error;
          }
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟Java命令执行: ${args.command}`);
          return {
            success: true,
            stdout: 'Mock: PlantUML渲染完成\n生成文件: mock-output.png',
            stderr: ''
          };
        }
      },
      
      'fs:scan': {
        real: async (args, api) => {
          const fs = await api.importx('fs');
          const path = await api.importx('path');
          
          try {
            const files = await fs.promises.readdir(args.dir);
            const pumlFiles = files.filter(file => file.endsWith('.puml'));
            api.logger.info(`[Bridge] 发现${pumlFiles.length}个PlantUML文件`);
            return pumlFiles;
          } catch (error) {
            if (error.code === 'ENOENT') {
              api.logger.warn(`[Bridge] 目录不存在: ${args.dir}`);
              return [];
            }
            throw error;
          }
        },
        mock: async (args, api) => {
          api.logger.debug(`[Mock] 模拟扫描目录: ${args.dir}`);
          return [
            'activity-user-auth.puml',
            'sequence-user-auth.puml',
            'usecase-user.puml',
            'er-overview.puml'
          ];
        }
      },
      
      'fs:exists': {
        real: async (args, api) => {
          const fs = await api.importx('fs');
          try {
            await fs.promises.access(args.path, fs.constants.F_OK);
            return true;
          } catch {
            return false;
          }
        },
        mock: async (args, api) => {
          return true;
        }
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('PlantUML JAR渲染器启动', { params });
    
    try {
      // 获取项目根目录
      const projectRoot = await api.environment.get('PROJECT_ROOT') || 
        '/Users/pc/Documents/promptx_tools/projects/canteen-rating';
      
      // 验证jar包是否存在
      const jarPath = `${projectRoot}/tar/plantuml.jar`;
      const jarExists = await api.bridge.execute('fs:exists', { path: jarPath });
      
      if (!jarExists) {
        throw new Error(`PlantUML jar包不存在: ${jarPath}`);
      }
      
      // 构建路径
      const sourceDir = `${projectRoot}/${params.sourceDir}`;
      const outputDir = `${projectRoot}/${params.outputDir}`;
      
      switch (params.action) {
        case 'list_files':
          return await this.listFiles(sourceDir, api);
          
        case 'render_single':
          return await this.renderSingle(params, sourceDir, outputDir, jarPath, api);
          
        case 'render_batch':
        default:
          return await this.renderBatch(params, sourceDir, outputDir, jarPath, api);
      }
    } catch (error) {
      api.logger.error('PlantUML JAR渲染失败', error);
      throw error;
    }
  },
  
  async listFiles(sourceDir, api) {
    const files = await api.bridge.execute('fs:scan', { dir: sourceDir });
    
    api.logger.info(`发现${files.length}个PlantUML文件`);
    
    return {
      success: true,
      action: 'list_files',
      sourceDir: sourceDir,
      files: files,
      total: files.length
    };
  },
  
  async renderSingle(params, sourceDir, outputDir, jarPath, api) {
    if (!params.singleFile) {
      throw new Error('单文件渲染需要指定singleFile参数');
    }
    
    const path = await api.importx('path');
    const sourcePath = path.join(sourceDir, params.singleFile);
    
    // 构建Java命令
    const formatFlag = `-t${params.format}`;
    const command = `java -jar "${jarPath}" ${formatFlag} -o "${outputDir}" "${sourcePath}"`;
    
    api.logger.info(`开始渲染单文件: ${params.singleFile}`);
    
    // 执行渲染
    const result = await api.bridge.execute('java:execute', {
      command: command,
      workingDir: path.dirname(sourceDir)
    });
    
    if (!result.success) {
      throw new Error(`渲染失败: ${result.stderr || '未知错误'}`);
    }
    
    // 生成输出文件名
    const baseName = path.basename(params.singleFile, '.puml');
    const outputFile = `${baseName}.${params.format}`;
    
    api.logger.info(`单文件渲染完成: ${outputFile}`);
    
    return {
      success: true,
      action: 'render_single',
      file: {
        source: params.singleFile,
        output: outputFile,
        format: params.format
      },
      command: command,
      stdout: result.stdout,
      stderr: result.stderr
    };
  },
  
  async renderBatch(params, sourceDir, outputDir, jarPath, api) {
    const path = await api.importx('path');
    
    // 扫描源码文件
    const files = await api.bridge.execute('fs:scan', { dir: sourceDir });
    
    if (files.length === 0) {
      return {
        success: true,
        action: 'render_batch',
        message: '没有找到PlantUML文件',
        sourceDir: sourceDir,
        processed: 0,
        results: []
      };
    }
    
    api.logger.info(`开始批量渲染${files.length}个文件`);
    
    // 构建批量渲染命令
    const formatFlag = `-t${params.format}`;
    const sourcePattern = path.join(sourceDir, '*.puml');
    const command = `java -jar "${jarPath}" ${formatFlag} -o "${outputDir}" "${sourcePattern}"`;
    
    api.logger.info(`执行批量渲染命令: ${command}`);
    
    // 执行批量渲染
    const result = await api.bridge.execute('java:execute', {
      command: command,
      workingDir: path.dirname(sourceDir)
    });
    
    if (!result.success) {
      throw new Error(`批量渲染失败: ${result.stderr || '未知错误'}`);
    }
    
    // 分析渲染结果
    const processedFiles = files.map(file => {
      const baseName = path.basename(file, '.puml');
      return {
        source: file,
        output: `${baseName}.${params.format}`,
        status: 'success',
        format: params.format
      };
    });
    
    api.logger.info(`批量渲染完成: 处理了${files.length}个文件`);
    
    return {
      success: true,
      action: 'render_batch',
      sourceDir: sourceDir,
      outputDir: outputDir,
      format: params.format,
      total: files.length,
      processed: files.length,
      successCount: files.length,
      failedCount: 0,
      command: command,
      stdout: result.stdout,
      stderr: result.stderr,
      results: processedFiles,
      summary: {
        allFiles: files,
        successFiles: processedFiles.map(r => r.output),
        failedFiles: []
      }
    };
  },
  
  getBusinessErrors() {
    return [
      {
        code: 'JAVA_NOT_FOUND',
        description: 'Java环境未安装或不可用',
        match: /java.*not found|command not found.*java/i,
        solution: '请安装Java Runtime Environment (JRE)',
        retryable: false
      },
      {
        code: 'JAR_NOT_FOUND',
        description: 'PlantUML jar包不存在',
        match: /jar.*not found|no such file.*jar/i,
        solution: '请确保PlantUML.jar存在于tar目录中',
        retryable: false
      },
      {
        code: 'PLANTUML_SYNTAX_ERROR',
        description: 'PlantUML语法错误',
        match: /syntax.*error|error.*line/i,
        solution: '检查PlantUML源码语法',
        retryable: false
      },
      {
        code: 'PERMISSION_DENIED',
        description: '文件权限不足',
        match: /permission denied|access denied/i,
        solution: '检查文件和目录的读写权限',
        retryable: false
      }
    ];
  }
};