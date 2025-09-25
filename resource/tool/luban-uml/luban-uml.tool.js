/**
 * PlantUML渲染工具 - 将PlantUML源码渲染为PNG/SVG图片
 *
 * 战略意义：
 * 1. 文档可视化：将PlantUML文本描述转化为直观的图表，提升文档质量和可理解性
 * 2. 开发效率：支持本地PlantUML文件快速预览，基于在线API服务实现
 * 3. 工程集成：为PromptX生态提供图表生成能力，支持架构图、时序图等技术文档需求
 *
 * 设计理念：
 * 基于PlantUML官方在线API实现云端渲染，无需本地环境依赖。通过HTTP接口
 * 调用PlantUML服务器，提供简单易用的渲染体验，支持多种输出格式和语法验证。
 * 专注于开发者友好的参数设计，让复杂的PlantUML渲染变得简单易用。
 *
 * 重要更新：
 * - 使用绝对路径参数，不再依赖沙箱环境
 * - 直接操作用户指定的项目文件系统
 * - 支持任意绝对路径的输入和输出
 * - 使用PlantUML在线API，移除JAR文件依赖
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'luban-uml',
      name: 'PlantUML渲染工具',
      description: '将PlantUML源码渲染为PNG/SVG图片，基于在线API服务，使用绝对路径',
      version: '1.2.0',
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
            description: 'PlantUML源文件绝对路径(.puml)或PlantUML源码内容',
            minLength: 1
          },
          output: {
            type: 'string',
            description: '输出文件的绝对路径，仅render操作需要'
          },
          format: {
            type: 'string',
            enum: ['png', 'svg'],
            description: '输出格式：png或svg',
            default: 'svg'
          }
        },
        required: ['input']
      },
      environment: {
        type: 'object',
        properties: {
          PLANTUML_SERVER_URL: {
            type: 'string',
            description: 'PlantUML服务器URL',
            default: 'http://www.plantuml.com/plantuml'
          }
        }
      }
    };
  },

  async execute(params) {
    console.log('PlantUML工具开始执行', { operation: params.operation, input: params.input, output: params.output });

    try {
      if (params.operation === 'validate') {
        return await this.validatePlantUML(params.input);
      } else {
        // render操作需要输出路径
        if (!params.output) {
          throw new Error('渲染操作必须指定output参数（绝对路径）');
        }
        return await this.renderPlantUML(params.input, params.output, params.format);
      }

    } catch (error) {
      console.error('PlantUML处理失败', error);
      throw error;
    }
  },

  // 获取PlantUML内容
  async getPlantUMLContent(input) {
    const fs = await importx('fs');
    const path = await importx('path');

    if (fs.existsSync(input)) {
      // 验证是绝对路径
      if (!path.isAbsolute(input)) {
        throw new Error(`输入文件路径必须是绝对路径：${input}`);
      }
      return fs.readFileSync(input, 'utf8');
    } else {
      // 作为内容处理
      return input;
    }
  },

  // 将PlantUML内容编码为URL安全格式
  encodePlantUML(content) {
    // 使用PlantUML的文本编码方式：deflate + base64url
    const zlib = require('zlib');

    // 添加UTF-8 BOM并压缩内容
    const utf8Content = Buffer.from(content, 'utf8');
    const compressed = zlib.deflateRawSync(utf8Content);

    // 使用PlantUML专用的base64编码表
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
    let result = '';

    for (let i = 0; i < compressed.length; i += 3) {
      const b1 = compressed[i] || 0;
      const b2 = compressed[i + 1] || 0;
      const b3 = compressed[i + 2] || 0;

      const bitmap = (b1 << 16) | (b2 << 8) | b3;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += chars.charAt((bitmap >> 6) & 63);
      result += chars.charAt(bitmap & 63);
    }

    return result;
  },

  // 验证PlantUML语法
  async validatePlantUML(input) {
    try {
      const content = await this.getPlantUMLContent(input);
      const encoded = this.encodePlantUML(content);
      const serverUrl = process.env.PLANTUML_SERVER_URL || 'http://www.plantuml.com/plantuml';
      const checkUrl = `${serverUrl}/check/${encoded}`;

      console.log('执行PlantUML语法检查', { checkUrl });

      const https = require('https');
      const http = require('http');
      const url = require('url');

      const parsedUrl = url.parse(checkUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const response = await new Promise((resolve, reject) => {
        const req = client.request(parsedUrl, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('请求超时')));
        req.end();
      });

      if (response.status === 200) {
        console.log('PlantUML语法验证通过');
        return {
          success: true,
          valid: true,
          message: 'PlantUML语法验证通过',
          exitCode: 0
        };
      } else {
        console.warn('PlantUML语法验证失败', { status: response.status, data: response.data });
        return {
          success: true,
          valid: false,
          message: 'PlantUML语法错误',
          error: response.data,
          exitCode: 2
        };
      }

    } catch (error) {
      console.error('PlantUML语法验证请求失败', { error: error.message });
      return {
        success: false,
        valid: false,
        message: 'PlantUML语法验证服务不可用',
        error: error.message,
        exitCode: 3
      };
    }
  },

  // 渲染PlantUML图片
  async renderPlantUML(input, output, format) {
    const fs = await importx('fs');
    const path = await importx('path');

    try {
      // 验证输出路径是绝对路径
      if (!path.isAbsolute(output)) {
        throw new Error(`输出路径必须是绝对路径：${output}`);
      }

      const content = await this.getPlantUMLContent(input);
      const encoded = this.encodePlantUML(content);
      const serverUrl = process.env.PLANTUML_SERVER_URL || 'http://www.plantuml.com/plantuml';
      const renderUrl = `${serverUrl}/${format}/${encoded}`;

      console.log('执行PlantUML渲染', { renderUrl });

      // 确保输出目录存在
      const outputDir = path.dirname(output);
      fs.mkdirSync(outputDir, { recursive: true });

      const https = require('https');
      const http = require('http');
      const url = require('url');

      const parsedUrl = url.parse(renderUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const response = await new Promise((resolve, reject) => {
        const req = client.request(parsedUrl, (res) => {
          if (res.statusCode === 200) {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({
              status: res.statusCode,
              data: Buffer.concat(chunks)
            }));
          } else {
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => resolve({
              status: res.statusCode,
              error: errorData
            }));
          }
        });
        req.on('error', reject);
        req.setTimeout(30000, () => reject(new Error('渲染请求超时')));
        req.end();
      });

      if (response.status === 200) {
        // 写入输出文件
        fs.writeFileSync(output, response.data);

        console.log('PlantUML渲染成功', { output });

        return {
          success: true,
          message: 'PlantUML渲染成功',
          outputPath: output,
          format: format,
          exitCode: 0
        };
      } else {
        console.error('PlantUML渲染失败', { status: response.status, error: response.error });
        return {
          success: false,
          message: 'PlantUML渲染失败',
          error: response.error || `HTTP ${response.status}`,
          exitCode: 2
        };
      }

    } catch (error) {
      console.error('PlantUML渲染请求失败', error);
      return {
        success: false,
        message: 'PlantUML渲染服务不可用',
        error: error.message,
        exitCode: 3
      };
    }
  },

  getBusinessErrors() {
    return [
      {
        code: 'INVALID_ABSOLUTE_PATH',
        description: '路径必须是绝对路径',
        match: /路径必须是绝对路径/i,
        solution: '请提供完整的绝对路径，以/开头（Linux/Mac）或C:\\\\开头（Windows）',
        retryable: false
      },
      {
        code: 'NETWORK_ERROR',
        description: '网络连接失败',
        match: /请求超时|渲染请求超时|ENOTFOUND|ECONNREFUSED/i,
        solution: '检查网络连接或配置PLANTUML_SERVER_URL环境变量使用其他服务器',
        retryable: true
      },
      {
        code: 'PLANTUML_SERVICE_ERROR',
        description: 'PlantUML服务不可用',
        match: /PlantUML.*服务不可用|HTTP 50\d/i,
        solution: '检查PlantUML服务器状态或稍后重试',
        retryable: true
      },
      {
        code: 'PLANTUML_SYNTAX_ERROR',
        description: 'PlantUML语法错误',
        match: /PlantUML语法错误|HTTP 400/i,
        solution: '检查PlantUML源码语法，可使用validate操作验证',
        retryable: false
      },
      {
        code: 'OUTPUT_FILE_ERROR',
        description: '输出文件写入失败',
        match: /permission denied|no such file or directory|EACCES/i,
        solution: '检查输出目录权限和路径是否正确',
        retryable: false
      }
    ];
  }
};