/**
 * SQL建表语句解析器 - 智能识别表结构和枚举信息（增强版）
 * 
 * 战略意义：
 * 1. 架构价值：提供统一的数据库结构解析标准，确保跨项目的一致性
 * 2. 平台价值：支持多种SQL方言，实现平台无关的表结构分析
 * 3. 生态价值：为代码生成器、文档生成器等下游工具提供标准化输入
 * 
 * 设计理念：
 * 采用渐进式解析策略，从粗粒度的表识别到细粒度的字段解析，
 * 确保即使部分SQL语句有问题也能提取有效信息。支持灵活的文件
 * 导出配置，可指定绝对路径为离线分析和团队协作提供便利。
 * 
 * 增强功能：
 * - 支持JSON文件导出到指定目录
 * - 按表划分的结构化数据
 * - 提取字段名、字段类型、注释三要素
 * - 支持绝对路径导出配置
 */

module.exports = {
  getDependencies() {
    return {
      'path': 'latest'
    };
  },

  getMetadata() {
    return {
      id: 'sql-table-parser',
      name: 'SQL建表语句解析器（增强版）',
      description: '智能解析SQL建表语句，支持JSON文件导出和结构化数据提取',
      version: '2.1.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'SQL建表语句，支持一次输入多个表',
            minLength: 10
          },
          includeComments: {
            type: 'boolean',
            description: '是否包含字段注释',
            default: true
          },
          parseEnums: {
            type: 'boolean', 
            description: '是否解析枚举值',
            default: true
          },
          exportToFile: {
            type: 'boolean',
            description: '是否导出JSON文件',
            default: false
          },
          fileName: {
            type: 'string',
            description: '导出的JSON文件名（不含扩展名）',
            default: 'database_schema'
          },
          exportPath: {
            type: 'string',
            description: '导出目录的绝对路径，不填则使用当前工作目录',
            default: ''
          }
        },
        required: ['sql']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始解析SQL建表语句', { 
      sqlLength: params.sql.length,
      exportToFile: params.exportToFile,
      exportPath: params.exportPath 
    });
    
    try {
      const tables = this.parseCreateTableStatements(params.sql, params);
      
      // 生成简化的JSON结构（按表划分）
      const simplifiedData = this.generateSimplifiedSchema(tables);
      
      let filePath = null;
      
      // 如果需要导出到文件
      if (params.exportToFile) {
        filePath = await this.exportToJsonFile(
          simplifiedData, 
          params.fileName || 'database_schema',
          params.exportPath || '',
          api
        );
      }
      
      api.logger.info('解析完成', { 
        tableCount: tables.length,
        exported: !!filePath
      });
      
      return {
        success: true,
        data: {
          tables: simplifiedData,
          summary: {
            tableCount: tables.length,
            totalFields: tables.reduce((sum, table) => sum + table.fields.length, 0),
            exportedFile: filePath
          },
          // 保留完整数据供高级用户使用
          fullData: tables
        }
      };
    } catch (error) {
      api.logger.error('解析失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查SQL语句格式是否正确或导出路径是否有效'
      };
    }
  },

  /**
   * 生成简化的JSON结构，仅包含字段名、字段类型、注释
   */
  generateSimplifiedSchema(tables) {
    const schema = {};
    
    for (const table of tables) {
      schema[table.tableName] = {
        comment: table.comment,
        fields: table.fields.map(field => ({
          name: field.name,
          type: typeof field.type === 'object' ? field.type.originalType : field.type,
          comment: field.comment || ''
        }))
      };
    }
    
    return schema;
  },

  /**
   * 导出JSON文件到指定目录
   */
  async exportToJsonFile(data, fileName, exportPath, api) {
    try {
      const path = await api.importx('path');
      
      // 确定导出目录
      let targetDir;
      if (exportPath) {
        // 使用用户指定的绝对路径
        targetDir = exportPath;
      } else {
        // 使用当前工作目录（获取真实的项目目录）
        targetDir = process.env.PWD || process.cwd();
      }
      
      const fullFileName = `${fileName}.json`;
      const filePath = path.join(targetDir, fullFileName);
      
      // 将数据转换为格式化的JSON字符串
      const jsonContent = JSON.stringify(data, null, 2);
      
      // 使用PromptX的filesystem工具写入文件
      // 首先检查目录是否存在
      try {
        // 尝试使用直接路径写入
        const fs = await api.importx('fs');
        await fs.promises.writeFile(filePath, jsonContent, 'utf8');
        
        api.logger.info('JSON文件导出成功', { filePath });
        return filePath;
      } catch (fsError) {
        // 如果直接写入失败，尝试使用相对路径
        api.logger.warn('直接写入失败，尝试相对路径', { error: fsError.message });
        
        // 计算相对于当前目录的相对路径
        const relativePath = path.relative(process.cwd(), filePath);
        
        const fs = await api.importx('fs');
        await fs.promises.writeFile(relativePath, jsonContent, 'utf8');
        
        api.logger.info('JSON文件导出成功（相对路径）', { filePath: relativePath });
        return path.resolve(relativePath);
      }
    } catch (error) {
      api.logger.error('文件导出失败', error);
      throw new Error(`文件导出失败: ${error.message}`);
    }
  },

  parseCreateTableStatements(sql, options = {}) {
    const { includeComments = true, parseEnums = true } = options;
    const tables = [];
    
    // 移除多行注释和单行注释（但保留字段注释）
    const cleanedSql = sql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^--[^\n]*$/gm, (match) => {
        // 保留表注释
        if (match.includes('表')) {
          return match;
        }
        return '';
      });
    
    // 匹配所有CREATE TABLE语句
    const tableRegex = /CREATE\s+TABLE\s+`?([^`\s]+)`?\s*\(([\s\S]*?)\)\s*(?:COMMENT\s*=\s*['"]([^'"]*)['"])?\s*;/gi;
    
    let match;
    while ((match = tableRegex.exec(cleanedSql)) !== null) {
      const [, tableName, fieldsSection, tableComment] = match;
      
      const table = {
        tableName: tableName.replace(/`/g, ''),
        comment: tableComment || '',
        fields: []
      };
      
      // 解析字段定义
      table.fields = this.parseFields(fieldsSection, { includeComments, parseEnums });
      
      tables.push(table);
    }
    
    if (tables.length === 0) {
      throw new Error('未找到有效的CREATE TABLE语句');
    }
    
    return tables;
  },

  parseFields(fieldsSection, options) {
    const { includeComments, parseEnums } = options;
    const fields = [];
    
    // 按逗号分割，但要考虑括号内的逗号
    const fieldLines = this.splitFieldDefinitions(fieldsSection);
    
    for (const line of fieldLines) {
      const trimmedLine = line.trim();
      
      // 跳过约束定义（PRIMARY KEY, FOREIGN KEY等）
      if (this.isConstraintDefinition(trimmedLine)) {
        continue;
      }
      
      const field = this.parseField(trimmedLine, { includeComments, parseEnums });
      if (field) {
        fields.push(field);
      }
    }
    
    return fields;
  },

  splitFieldDefinitions(fieldsSection) {
    const lines = [];
    let currentLine = '';
    let parenthesesCount = 0;
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < fieldsSection.length; i++) {
      const char = fieldsSection[i];
      
      if (!inQuotes && (char === '\'' || char === '"')) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes) {
        if (char === '(') {
          parenthesesCount++;
        } else if (char === ')') {
          parenthesesCount--;
        } else if (char === ',' && parenthesesCount === 0) {
          lines.push(currentLine.trim());
          currentLine = '';
          continue;
        }
      }
      
      currentLine += char;
    }
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    return lines;
  },

  // 修复的约束识别方法
  isConstraintDefinition(line) {
    const upperLine = line.toUpperCase().trim();
    
    // 表级约束关键字 - 这些关键字开头的行是约束定义
    const tableConstraintKeywords = [
      'PRIMARY KEY',
      'FOREIGN KEY', 
      'UNIQUE KEY',
      'KEY ',
      'INDEX ',
      'CONSTRAINT',
      'CHECK '
    ];
    
    // 检查是否以约束关键字开头（表级约束）
    for (const keyword of tableConstraintKeywords) {
      if (upperLine.startsWith(keyword)) {
        return true;
      }
    }
    
    // 如果包含字段名模式，则认为是字段定义（不是约束）
    // 字段定义格式：`字段名` 或 字段名 开头
    if (upperLine.match(/^`?[A-Z_][A-Z0-9_]*`?\s+/)) {
      return false;
    }
    
    return false;
  },

  parseField(line, options) {
    const { includeComments, parseEnums } = options;
    
    // 字段定义正则：字段名 类型 [约束] [COMMENT '注释']
    const fieldRegex = /^`?([^`\s]+)`?\s+([^\s]+(?:\([^)]*\))?)(.*?)(?:COMMENT\s+['"]([^'"]*)['"])?$/i;
    const match = line.match(fieldRegex);
    
    if (!match) {
      return null;
    }
    
    const [, fieldName, fieldType, constraints, comment] = match;
    
    const field = {
      name: fieldName.replace(/`/g, ''),
      type: this.normalizeFieldType(fieldType),
      nullable: !constraints.toUpperCase().includes('NOT NULL'),
      defaultValue: this.extractDefaultValue(constraints),
      autoIncrement: constraints.toUpperCase().includes('AUTO_INCREMENT'),
      primaryKey: constraints.toUpperCase().includes('PRIMARY KEY'),
      comment: includeComments ? (comment || '') : ''
    };
    
    // 解析枚举值
    if (parseEnums && comment && comment.includes('枚举')) {
      field.enumValues = this.parseEnumValues(comment);
    }
    
    return field;
  },

  normalizeFieldType(type) {
    // 标准化字段类型
    const upperType = type.toUpperCase();
    
    // 提取类型名和长度
    const typeMatch = upperType.match(/^([A-Z]+)(?:\((\d+(?:,\d+)?)\))?/);
    if (!typeMatch) {
      return type;
    }
    
    const [, typeName, length] = typeMatch;
    
    return {
      name: typeName,
      length: length || null,
      originalType: type
    };
  },

  extractDefaultValue(constraints) {
    const defaultMatch = constraints.match(/DEFAULT\s+([^\s]+)/i);
    if (!defaultMatch) {
      return null;
    }
    
    let value = defaultMatch[1];
    
    // 移除引号
    if ((value.startsWith('\'') && value.endsWith('\'')) || 
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    
    // 特殊值处理
    if (value.toUpperCase() === 'CURRENT_TIMESTAMP') {
      return 'CURRENT_TIMESTAMP';
    }
    
    // 数字值
    if (/^\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    return value;
  },

  parseEnumValues(comment) {
    // 解析形如：状态【枚举】：0-待处理，1-处理中，2-已完成
    const enumRegex = /【枚举】[：:]([^，。\n]+)/;
    const match = comment.match(enumRegex);
    
    if (!match) {
      return null;
    }
    
    const enumString = match[1];
    const enumValues = [];
    
    // 分割每个枚举项
    const items = enumString.split(/[，,]/);
    
    for (const item of items) {
      const trimmedItem = item.trim();
      // 匹配 "数字-中文" 格式
      const itemMatch = trimmedItem.match(/^(\d+)[-—](.+)$/);
      
      if (itemMatch) {
        const [, value, label] = itemMatch;
        enumValues.push({
          value: parseInt(value),
          label: label.trim()
        });
      }
    }
    
    return enumValues.length > 0 ? enumValues : null;
  }
};