module.exports = {
  getDependencies() {
    return {
      'node-sql-parser': '^4.17.0',  // SQL DDL解析
      'fs-extra': '^11.1.0',        // 增强文件操作
      'joi': '^17.11.0'             // 数据验证
    };
  },
  
  getMetadata() {
    return {
      name: 'luban-table',
      description: '专业的三线表生成与校验工具，支持从JSON数据生成、SQL DDL解析生成以及格式校验功能',
      version: '1.0.0',
      category: 'document',
      author: '鲁班',
      tags: ['table', 'sql', 'json', 'validation', 'document'],
      manual: '@manual://luban-table'
    };
  },
  
  getSchema() {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['gen', 'from-sql', 'validate'],
          description: '操作模式：gen(生成)、from-sql(从SQL生成)、validate(校验)'
        },
        data: {
          type: 'object',
          properties: {
            schema: {
              type: 'array',
              items: { type: 'string' },
              description: '表头schema数组'
            },
            rows: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'string' }
              },
              description: '表格数据行数组'
            }
          },
          additionalProperties: false,
          description: 'gen模式使用的表格数据'
        },
        inputPath: {
          type: 'string',
          description: '输入文件路径（from-sql和validate模式使用）'
        },
        outputPath: {
          type: 'string',
          description: '输出文件路径（gen和from-sql模式使用）'
        },
        format: {
          type: 'string',
          enum: ['json', 'console'],
          default: 'json',
          description: '输出格式'
        }
      },
      required: ['action'],
      additionalProperties: false
    };
  },
  
  validate(params) {
    const errors = [];
    
    try {
      // 基础action验证
      if (!params.action) {
        errors.push('action参数是必需的');
      } else if (!['gen', 'from-sql', 'validate'].includes(params.action)) {
        errors.push('action必须是gen、from-sql或validate之一');
      }
      
      // 根据action验证相关参数
      switch (params.action) {
        case 'gen':
          if (!params.data) {
            errors.push('gen模式需要data参数');
          } else {
            if (!params.data.schema || !Array.isArray(params.data.schema)) {
              errors.push('data.schema必须是字符串数组');
            }
            if (!params.data.rows || !Array.isArray(params.data.rows)) {
              errors.push('data.rows必须是二维字符串数组');
            }
          }
          if (!params.outputPath) {
            errors.push('gen模式需要outputPath参数');
          }
          break;
          
        case 'from-sql':
          if (!params.inputPath) {
            errors.push('from-sql模式需要inputPath参数');
          }
          if (!params.outputPath) {
            errors.push('from-sql模式需要outputPath参数');
          }
          break;
          
        case 'validate':
          if (!params.inputPath) {
            errors.push('validate模式需要inputPath参数');
          }
          break;
      }
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`参数验证异常: ${error.message}`]
      };
    }
  },
  
  async execute(params) {
    try {
      // 使用importx统一导入模块
      const { Parser } = await importx('node-sql-parser');
      const fs = await importx('fs-extra');
      const fsNative = await importx('fs');
      const path = await importx('path');
      const Joi = await importx('joi');
      
      // 参数验证
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          action: params.action,
          error: {
            code: 'VALIDATION_ERROR',
            message: '参数验证失败',
            details: validation.errors
          },
          exitCode: 2
        };
      }
      
      // 根据action执行相应操作
      switch (params.action) {
        case 'gen':
          return await this.generateTable(params, fs, path);
          
        case 'from-sql':
          return await this.generateFromSQL(params, Parser, fs, path);
          
        case 'validate':
          return await this.validateTable(params, fs, Joi);
          
        default:
          return {
            success: false,
            action: params.action,
            error: {
              code: 'INVALID_ACTION',
              message: `不支持的操作: ${params.action}`
            },
            exitCode: 2
          };
      }
    } catch (error) {
      return {
        success: false,
        action: params.action || 'unknown',
        error: {
          code: 'SYSTEM_ERROR',
          message: error.message,
          details: {
            stack: error.stack
          }
        },
        exitCode: 3
      };
    }
  },
  
  // gen模式：生成三线表JSON
  async generateTable(params, fs, path) {
    try {
      const { data, outputPath } = params;
      
      // 构建标准三线表格式
      const tableData = {
        schema: data.schema,
        rows: data.rows
      };
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      await fs.ensureDir(outputDir);
      
      // 写入JSON文件
      const jsonContent = JSON.stringify(tableData, null, 2);
      await fs.outputFile(outputPath, jsonContent, 'utf8');
      
      return {
        success: true,
        action: 'gen',
        data: {
          outputPath: outputPath,
          rowCount: data.rows.length,
          schemaFields: data.schema,
          fileSize: jsonContent.length
        },
        exitCode: 0,
        message: '三线表JSON文件生成成功'
      };
    } catch (error) {
      return {
        success: false,
        action: 'gen',
        error: {
          code: 'GENERATION_ERROR',
          message: `文件生成失败: ${error.message}`,
          details: {
            outputPath: params.outputPath,
            systemError: error.code
          }
        },
        exitCode: 3
      };
    }
  },
  
  // from-sql模式：从SQL DDL生成三线表
  async generateFromSQL(params, Parser, fs, path) {
    try {
      const { inputPath, outputPath } = params;
      
      // 导入原生fs模块
      const fsNative = await importx('fs');
      
      // 读取SQL文件
      if (!await fs.pathExists(inputPath)) {
        return {
          success: false,
          action: 'from-sql',
          error: {
            code: 'FILE_NOT_FOUND',
            message: `SQL文件不存在: ${inputPath}`
          },
          exitCode: 2
        };
      }
      
      const sqlContent = await fsNative.promises.readFile(inputPath, 'utf8');
      
      // 创建SQL解析器
      const parser = new Parser();
      
      // 解析SQL
      let ast;
      try {
        ast = parser.astify(sqlContent);
      } catch (parseError) {
        return {
          success: false,
          action: 'from-sql',
          error: {
            code: 'PARSE_ERROR',
            message: 'SQL DDL解析失败',
            details: {
              parseError: parseError.message,
              inputPath: inputPath
            }
          },
          exitCode: 2
        };
      }
      
      // 查找CREATE TABLE语句
      const createTables = Array.isArray(ast) ? ast : [ast];
      const createTable = createTables.find(stmt => stmt.type === 'create' && stmt.keyword === 'table');
      
      if (!createTable) {
        return {
          success: false,
          action: 'from-sql',
          error: {
            code: 'NO_CREATE_TABLE',
            message: 'SQL文件中未找到CREATE TABLE语句'
          },
          exitCode: 2
        };
      }
      
      // 提取表结构信息
      const tableName = createTable.table[0].table;
      const fields = [];
      
      for (const column of createTable.create_definitions) {
        if (column.resource === 'column') {
          const fieldName = column.column.column;
          const fieldType = this.formatDataType(column.definition);
          const fieldComment = column.comment ? column.comment.value.value : ''; // 处理注释
          
          fields.push([fieldName, fieldType, fieldComment]);
        }
      }
      
      // 构建三线表数据
      const tableData = {
        schema: ['字段名', '类型', '说明'],
        rows: fields
      };
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      await fs.ensureDir(outputDir);
      
      // 写入JSON文件
      const jsonContent = JSON.stringify(tableData, null, 2);
      await fs.outputFile(outputPath, jsonContent, 'utf8');
      
      return {
        success: true,
        action: 'from-sql',
        data: {
          inputPath: inputPath,
          outputPath: outputPath,
          tableName: tableName,
          fieldCount: fields.length,
          extractedFields: fields.map(([name, type, comment]) => ({
            name, type, comment
          }))
        },
        exitCode: 0,
        message: '从SQL DDL成功生成三线表'
      };
    } catch (error) {
      return {
        success: false,
        action: 'from-sql',
        error: {
          code: 'SYSTEM_ERROR',
          message: `从SQL生成失败: ${error.message}`,
          details: {
            inputPath: params.inputPath,
            systemError: error.code
          }
        },
        exitCode: 3
      };
    }
  },
  
  // validate模式：校验三线表格式
  async validateTable(params, fs, Joi) {
    try {
      const { inputPath } = params;
      
      // 导入原生fs模块
      const fsNative = await importx('fs');
      
      // 检查文件是否存在
      if (!await fs.pathExists(inputPath)) {
        return {
          success: false,
          action: 'validate',
          error: {
            code: 'FILE_NOT_FOUND',
            message: `JSON文件不存在: ${inputPath}`
          },
          exitCode: 2
        };
      }
      
      // 读取JSON文件
      let jsonData;
      try {
        const jsonContent = await fsNative.promises.readFile(inputPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch (jsonError) {
        return {
          success: false,
          action: 'validate',
          error: {
            code: 'INVALID_JSON',
            message: 'JSON文件格式错误',
            details: {
              jsonError: jsonError.message
            }
          },
          exitCode: 2
        };
      }
      
      // 定义三线表schema
      const tableSchema = Joi.object({
        schema: Joi.array().items(Joi.string()).required(),
        rows: Joi.array().items(
          Joi.array().items(Joi.string())
        ).required()
      });
      
      // 校验数据结构
      const { error, value } = tableSchema.validate(jsonData);
      
      if (error) {
        return {
          success: false,
          action: 'validate',
          error: {
            code: 'FORMAT_ERROR',
            message: '三线表格式不符合规范',
            details: {
              validationError: error.details.map(detail => detail.message),
              expectedFormat: '{ "schema": ["字段名", "类型", "说明"], "rows": [["字段1", "类型1", "说明1"]] }'
            }
          },
          exitCode: 2
        };
      }
      
      // 额外的逻辑校验
      const issues = [];
      
      // 检查schema是否为标准三列格式
      if (value.schema.length !== 3) {
        issues.push('schema应包含3个字段：字段名、类型、说明');
      }
      
      // 检查每行数据是否与schema长度匹配
      const invalidRows = [];
      value.rows.forEach((row, index) => {
        if (row.length !== value.schema.length) {
          invalidRows.push(index);
        }
      });
      
      if (invalidRows.length > 0) {
        issues.push(`第${invalidRows.join(', ')}行数据列数与schema不匹配`);
      }
      
      const isValid = issues.length === 0;
      
      return {
        success: true,
        action: 'validate',
        data: {
          inputPath: inputPath,
          isValid: isValid,
          schemaValid: value.schema.length === 3,
          rowsValid: invalidRows.length === 0,
          rowCount: value.rows.length,
          schemaFields: value.schema,
          issues: issues
        },
        exitCode: isValid ? 0 : 2,
        message: isValid ? '三线表格式校验通过' : '三线表格式校验发现问题'
      };
    } catch (error) {
      return {
        success: false,
        action: 'validate',
        error: {
          code: 'SYSTEM_ERROR',
          message: `校验失败: ${error.message}`,
          details: {
            inputPath: params.inputPath,
            systemError: error.code
          }
        },
        exitCode: 3
      };
    }
  },
  
  // 格式化数据类型字符串
  formatDataType(definition) {
    if (!definition) return 'UNKNOWN';
    
    let typeStr = definition.dataType.toUpperCase();
    
    // 处理长度参数
    if (definition.length) {
      if (Array.isArray(definition.length)) {
        typeStr += `(${definition.length.join(',')})`;
      } else {
        typeStr += `(${definition.length})`;
      }
    }
    
    // 处理其他修饰符
    if (definition.suffix && definition.suffix.length > 0) {
      const suffixes = definition.suffix.map(s => s.toUpperCase());
      typeStr += ` ${suffixes.join(' ')}`;
    }
    
    return typeStr;
  }
};