const fs = require('fs').promises;
const path = require('path');

module.exports = {
  getDependencies() {
    return {
      'axios': '^1.6.0',
      'plantuml-encoder': '^1.4.0'
    };
  },
  
  getMetadata() {
    return {
      name: 'luban-uml',
      description: 'PlantUML渲染和语法校验工具，支持render和validate子命令',
      version: '1.0.0',
      category: 'utility',
      author: '鲁班',
      tags: ['plantuml', 'uml', 'diagram', 'validation'],
      manual: '@manual://luban-uml'
    };
  },
  
  getSchema() {
    return {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['render', 'validate'],
          description: '子命令：render（渲染）或validate（校验）'
        },
        input: {
          type: 'string',
          description: '输入的.puml文件路径'
        },
        output: {
          type: 'string',
          description: '输出文件路径（仅render命令需要）'
        },
        format: {
          type: 'string',
          enum: ['png', 'svg'],
          default: 'png',
          description: '输出格式（png或svg）'
        },
        plantUmlPath: {
          type: 'string',
          description: '可选：PlantUML可执行文件路径'
        }
      },
      required: ['command', 'input']
    };
  },
  
  validate(params) {
    const errors = [];
    
    if (!params.command) {
      errors.push('缺少command参数');
    } else if (!['render', 'validate'].includes(params.command)) {
      errors.push('command必须是render或validate');
    }
    
    if (!params.input) {
      errors.push('缺少input参数');
    } else if (!params.input.endsWith('.puml')) {
      errors.push('input文件必须是.puml格式');
    }
    
    if (params.command === 'render' && !params.output) {
      errors.push('render命令需要output参数');
    }
    
    if (params.format && !['png', 'svg'].includes(params.format)) {
      errors.push('format必须是png或svg');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },
  
  async execute(params) {
    try {
      // 使用importx统一导入模块
      const axios = await importx('axios');
      const plantumlEncoder = await importx('plantuml-encoder');
      
      // 参数验证
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; ')
          }
        };
      }
      
      // 检查输入文件是否存在
      try {
        await fs.access(params.input);
      } catch (error) {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `输入文件不存在: ${params.input}`
          }
        };
      }
      
      // 读取PlantUML文件内容
      let pumlContent;
      try {
        pumlContent = await fs.readFile(params.input, 'utf8');
      } catch (error) {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'READ_ERROR',
            message: `无法读取文件: ${error.message}`
          }
        };
      }
      
      if (params.command === 'validate') {
        // 验证语法
        return await this.validateSyntax(axios, plantumlEncoder, pumlContent);
      } else if (params.command === 'render') {
        // 渲染图片
        return await this.renderDiagram(axios, plantumlEncoder, pumlContent, params);
      }
      
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        error: {
          code: 'SYSTEM_ERROR',
          message: `系统错误: ${error.message}`
        }
      };
    }
  },
  
  async validateSyntax(axios, plantumlEncoder, pumlContent) {
    try {
      // 编码PlantUML内容
      const encoded = plantumlEncoder.encode(pumlContent);
      
      // 使用PlantUML在线服务验证语法（尝试生成SVG）
      const response = await axios.get(`http://www.plantuml.com/plantuml/svg/${encoded}`, {
        timeout: 10000,
        validateStatus: (status) => status < 500 // 允许4xx错误，但不允许5xx
      });
      
      // 检查响应内容是否包含错误信息
      if (response.data && response.data.includes('Syntax Error')) {
        return {
          success: false,
          exitCode: 2,
          error: {
            code: 'SYNTAX_ERROR',
            message: 'PlantUML语法错误：代码包含语法错误'
          }
        };
      }
      
      return {
        success: true,
        exitCode: 0,
        status: 'success',
        message: 'PlantUML语法验证通过'
      };
      
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'NETWORK_ERROR',
            message: '无法连接到PlantUML服务器，请检查网络连接'
          }
        };
      }
      
      return {
        success: false,
        exitCode: 2,
        error: {
          code: 'SYNTAX_ERROR',
          message: `语法验证失败: ${error.message}`
        }
      };
    }
  },
  
  async renderDiagram(axios, plantumlEncoder, pumlContent, params) {
    try {
      const format = params.format || 'png';
      const outputPath = params.output;
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      try {
        await fs.mkdir(outputDir, { recursive: true });
      } catch (error) {
        // 目录可能已存在，忽略错误
      }
      
      // 编码PlantUML内容
      const encoded = plantumlEncoder.encode(pumlContent);
      
      // 构建请求URL
      const baseUrl = 'http://www.plantuml.com/plantuml';
      const url = `${baseUrl}/${format}/${encoded}`;
      
      // 请求生成图片
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'luban-uml/1.0.0'
        }
      });
      
      // 检查响应状态
      if (response.status !== 200) {
        return {
          success: false,
          exitCode: 3,
          error: {
            code: 'RENDER_FAILED',
            message: `PlantUML服务返回错误: HTTP ${response.status}`
          }
        };
      }
      
      // 写入文件
      const buffer = Buffer.from(response.data);
      await fs.writeFile(outputPath, buffer);
      
      return {
        success: true,
        exitCode: 0,
        status: 'success',
        out: outputPath,
        format: format,
        size: buffer.length
      };
      
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'NETWORK_ERROR',
            message: '无法连接到PlantUML服务器，请检查网络连接'
          }
        };
      }
      
      if (error.code === 'ENOENT') {
        return {
          success: false,
          exitCode: 1,
          error: {
            code: 'WRITE_ERROR',
            message: `无法写入输出文件: ${params.output}`
          }
        };
      }
      
      return {
        success: false,
        exitCode: 3,
        error: {
          code: 'RENDER_FAILED',
          message: `渲染过程出错: ${error.message}`
        }
      };
    }
  }
};