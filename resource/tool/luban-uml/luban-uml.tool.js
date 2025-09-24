/**
 * PlantUML渲染工具 - 将PlantUML源码渲染为PNG/SVG图片
 * 
 * 战略意义：
 * 1. 文档可视化：将PlantUML文本描述转化为直观的图表，提升文档质量和可理解性
 * 2. 开发效率：支持本地PlantUML文件快速预览，无需依赖在线服务或重型IDE插件
 * 3. 工程集成：为PromptX生态提供图表生成能力，支持架构图、时序图等技术文档需求
 * 
 * 设计理念：
 * 基于PlantUML官方JAR包实现本地渲染，确保渲染质量和隐私安全。通过命令行
 * 接口封装，提供类似PlantUML CLI的使用体验，支持多种输出格式和语法验证。
 * 专注于开发者友好的参数设计，让复杂的PlantUML渲染变得简单易用。
 * 
 * 为什么重要：
 * 在软件开发中，可视化文档是沟通的桥梁。这个工具让AI能够快速生成和验证
 * PlantUML图表，提升技术文档的质量和开发团队的协作效率。
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'luban-uml',
      name: 'PlantUML渲染工具',
      description: '将PlantUML源码渲染为PNG/SVG图片，支持语法验证',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['render', 'validate'],
            description: '操作类型：render-渲染图片，validate-语法验证',
            default: 'render'
          },
          input: {
            type: 'string',
            description: 'PlantUML源文件路径(.puml)或PlantUML源码内容',
            minLength: 1
          },
          output: {
            type: 'string',
            description: '输出文件路径，仅render操作需要'
          },
          format: {
            type: 'string',
            enum: ['png', 'svg'],
            description: '输出格式：png或svg',
            default: 'png'
          }
        },
        required: ['input']
      },
      environment: {
        type: 'object',
        properties: {
          PLANTUML_JAR_PATH: {
            type: 'string',
            description: 'PlantUML JAR文件路径，如未设置将尝试自动下载'
          },
          JAVA_PATH: {
            type: 'string',
            description: 'Java可执行文件路径',
            default: 'java'
          }
        }
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('PlantUML工具开始执行', { operation: params.operation });

    try {
      // 检查Java环境
      await this.checkJavaEnvironment();
      
      // 确保PlantUML JAR文件存在
      const jarPath = await this.ensurePlantUMLJar();
      
      if (params.operation === 'validate') {
        return await this.validatePlantUML(params.input, jarPath);
      } else {
        return await this.renderPlantUML(params.input, params.output, params.format, jarPath);
      }

    } catch (error) {
      api.logger.error('PlantUML处理失败', error);
      throw error;
    }
  },

  // 检查Java环境
  async checkJavaEnvironment() {
    const { api } = this;
    const javaPath = await api.environment.get('JAVA_PATH') || 'java';
    
    try {
      const { execSync } = await api.importx('child_process');
      const result = execSync(`"${javaPath}" -version`, { encoding: 'utf8', stdio: 'pipe' });
      api.logger.info('Java环境检查通过');
      return true;
    } catch (error) {
      throw new Error('Java环境不可用，请确保已安装Java并配置PATH环境变量');
    }
  },

  // 确保PlantUML JAR文件存在
  async ensurePlantUMLJar() {
    const { api } = this;
    let jarPath = await api.environment.get('PLANTUML_JAR_PATH');
    
    if (jarPath) {
      const fs = await api.importx('fs');
      if (fs.existsSync(jarPath)) {
        api.logger.info('使用配置的PlantUML JAR路径', { jarPath });
        return jarPath;
      }
    }
    
    throw new Error('请配置PLANTUML_JAR_PATH环境变量指向PlantUML JAR文件路径。\n可从 https://plantuml.com/download 下载最新版本');
  },

  // 验证PlantUML语法
  async validatePlantUML(input, jarPath) {
    const { api } = this;
    const { execSync } = await api.importx('child_process');
    const fs = await api.importx('fs');
    const path = await api.importx('path');
    
    // 判断input是文件路径还是内容
    let inputPath;
    let isTemporaryFile = false;
    
    if (fs.existsSync(input)) {
      inputPath = input;
    } else {
      // 创建临时文件
      const tempDir = path.join(process.env.HOME || process.env.USERPROFILE, '.promptx', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      inputPath = path.join(tempDir, `temp_${Date.now()}.puml`);
      fs.writeFileSync(inputPath, input, 'utf8');
      isTemporaryFile = true;
    }
    
    try {
      const javaPath = await api.environment.get('JAVA_PATH') || 'java';
      const command = `"${javaPath}" -jar "${jarPath}" -checkonly "${inputPath}"`;
      
      api.logger.info('执行PlantUML语法检查', { command });
      
      const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      
      api.logger.info('PlantUML语法验证通过');
      
      return {
        success: true,
        valid: true,
        message: 'PlantUML语法验证通过',
        exitCode: 0
      };
      
    } catch (error) {
      api.logger.warn('PlantUML语法验证失败', { error: error.message });
      
      return {
        success: true,
        valid: false,
        message: 'PlantUML语法错误',
        error: error.message,
        exitCode: 2
      };
    } finally {
      // 清理临时文件
      if (isTemporaryFile && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    }
  },

  // 渲染PlantUML图片
  async renderPlantUML(input, output, format, jarPath) {
    const { api } = this;
    const { execSync } = await api.importx('child_process');
    const fs = await api.importx('fs');
    const path = await api.importx('path');
    
    // 判断input是文件路径还是内容
    let inputPath;
    let isTemporaryFile = false;
    
    if (fs.existsSync(input)) {
      inputPath = input;
    } else {
      // 创建临时文件
      const tempDir = path.join(process.env.HOME || process.env.USERPROFILE, '.promptx', 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      inputPath = path.join(tempDir, `temp_${Date.now()}.puml`);
      fs.writeFileSync(inputPath, input, 'utf8');
      isTemporaryFile = true;
    }
    
    if (!output) {
      const baseName = path.basename(inputPath, '.puml');
      const inputDir = path.dirname(inputPath);
      output = path.join(inputDir, `${baseName}.${format}`);
    }
    
    try {
      const javaPath = await api.environment.get('JAVA_PATH') || 'java';
      const formatArg = format === 'svg' ? '-tsvg' : '-tpng';
      const outputDir = path.dirname(output);
      
      // 确保输出目录存在
      fs.mkdirSync(outputDir, { recursive: true });
      
      const command = `"${javaPath}" -jar "${jarPath}" ${formatArg} -o "${outputDir}" "${inputPath}"`;
      
      api.logger.info('执行PlantUML渲染', { command });
      
      execSync(command, { encoding: 'utf8' });
      
      // 检查输出文件是否生成
      if (!fs.existsSync(output)) {
        // PlantUML可能生成了不同的文件名，尝试查找
        const baseName = path.basename(inputPath, '.puml');
        const generatedFile = path.join(outputDir, `${baseName}.${format}`);
        if (fs.existsSync(generatedFile) && generatedFile !== output) {
          fs.renameSync(generatedFile, output);
        } else {
          throw new Error('渲染完成但未找到输出文件');
        }
      }
      
      api.logger.info('PlantUML渲染成功', { output });
      
      return {
        success: true,
        message: 'PlantUML渲染成功',
        outputPath: output,
        format: format,
        exitCode: 0
      };
      
    } catch (error) {
      api.logger.error('PlantUML渲染失败', error);
      
      if (error.status === 2) {
        return {
          success: false,
          message: 'PlantUML语法错误',
          error: error.message,
          exitCode: 2
        };
      } else {
        return {
          success: false,
          message: 'PlantUML渲染系统错误',
          error: error.message,
          exitCode: 3
        };
      }
    } finally {
      // 清理临时文件
      if (isTemporaryFile && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    }
  },

  getBusinessErrors() {
    return [
      {
        code: 'JAVA_NOT_FOUND',
        description: 'Java环境未安装或不可用',
        match: /java.*not found|command not found.*java/i,
        solution: '请安装Java JRE或JDK，并确保java命令在PATH中',
        retryable: false
      },
      {
        code: 'PLANTUML_JAR_NOT_FOUND',
        description: 'PlantUML JAR文件未找到',
        match: /请配置PLANTUML_JAR_PATH/i,
        solution: '请配置PLANTUML_JAR_PATH环境变量或手动下载PlantUML JAR文件',
        retryable: false
      },
      {
        code: 'PLANTUML_SYNTAX_ERROR',
        description: 'PlantUML语法错误',
        match: /syntax error|invalid.*syntax/i,
        solution: '检查PlantUML源码语法，可使用validate操作验证',
        retryable: false
      },
      {
        code: 'OUTPUT_FILE_ERROR',
        description: '输出文件写入失败',
        match: /permission denied|no such file or directory/i,
        solution: '检查输出目录权限和路径是否正确',
        retryable: false
      }
    ];
  }
};