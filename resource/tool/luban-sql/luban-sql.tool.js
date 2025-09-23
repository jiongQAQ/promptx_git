const fs = require('fs').promises;
const path = require('path');

module.exports = {
  getDependencies() {
    return {
      'glob': '^10.3.0'
    };
  },
  
  getMetadata() {
    return {
      name: 'luban-sql',
      description: 'SQL解析工具，生成ER图JSON和主外键摘要，支持MySQL/PostgreSQL',
      version: '1.0.0',
      category: 'database',
      author: '鲁班',
      tags: ['sql', 'parser', 'er', 'database', 'ddl'],
      manual: '@manual://luban-sql'
    };
  },
  
  getSchema() {
    return {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['er', 'pkfk'],
          description: '子命令：er（完整ER关系）或pkfk（主外键摘要）'
        },
        input: {
          type: 'string',
          description: '输入SQL文件路径或glob模式'
        },
        output: {
          type: 'string',
          description: '输出JSON文件路径'
        },
        dialect: {
          type: 'string',
          enum: ['mysql', 'postgres'],
          default: 'mysql',
          description: 'SQL方言：mysql或postgres'
        }
      },
      required: ['command', 'input', 'output']
    };
  },
  
  validate(params) {
    const errors = [];
    
    if (!params.command) {
      errors.push('缺少command参数');
    } else if (!['er', 'pkfk'].includes(params.command)) {
      errors.push('command必须是er或pkfk');
    }
    
    if (!params.input) {
      errors.push('缺少input参数');
    }
    
    if (!params.output) {
      errors.push('缺少output参数');
    } else if (!params.output.endsWith('.json')) {
      errors.push('output文件必须是.json格式');
    }
    
    if (params.dialect && !['mysql', 'postgres'].includes(params.dialect)) {
      errors.push('dialect必须是mysql或postgres');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },
  
  async execute(params) {
    try {
      // 参数验证
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          exitCode: 3,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; ')
          }
        };
      }
      
      const dialect = params.dialect || 'mysql';
      
      // 解析输入文件
      const sqlFiles = await this.resolveInputFiles(params.input);
      if (sqlFiles.length === 0) {
        return {
          success: false,
          exitCode: 3,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `未找到匹配的SQL文件: ${params.input}`
          }
        };
      }
      
      // 读取并解析所有SQL文件
      const tables = [];
      const relations = [];
      
      for (const file of sqlFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const { tables: fileTables, relations: fileRelations } = this.parseSQL(content, dialect);
          
          tables.push(...fileTables.map(table => ({ ...table, sourceFile: file })));
          relations.push(...fileRelations);
        } catch (error) {
          return {
            success: false,
            exitCode: 3,
            error: {
              code: 'READ_ERROR',
              message: `无法读取文件 ${file}: ${error.message}`
            }
          };
        }
      }
      
      if (tables.length === 0) {
        return {
          success: false,
          exitCode: 2,
          error: {
            code: 'PARSE_ERROR',
            message: '未找到有效的CREATE TABLE语句'
          }
        };
      }
      
      // 生成输出
      let result;
      if (params.command === 'er') {
        result = this.generateERJson(tables, relations);
      } else {
        result = this.generatePKFKJson(tables, relations);
      }
      
      // 确保输出目录存在
      const outputDir = path.dirname(params.output);
      try {
        await fs.mkdir(outputDir, { recursive: true });
      } catch (error) {
        // 目录可能已存在，忽略错误
      }
      
      // 写入输出文件
      await fs.writeFile(params.output, JSON.stringify(result, null, 2), 'utf8');
      
      return {
        success: true,
        exitCode: 0,
        status: 'success',
        output: params.output,
        tablesFound: tables.length,
        relationsFound: relations.length,
        mode: params.command
      };
      
    } catch (error) {
      return {
        success: false,
        exitCode: 3,
        error: {
          code: 'SYSTEM_ERROR',
          message: `系统错误: ${error.message}`
        }
      };
    }
  },
  
  async resolveInputFiles(input) {
    try {
      // 检查是否是glob模式
      if (input.includes('*') || input.includes('?')) {
        const { glob } = await importx('glob');
        return await glob(input, { nonull: false });
      } else {
        // 单个文件
        try {
          await fs.access(input);
          return [input];
        } catch {
          return [];
        }
      }
    } catch (error) {
      return [];
    }
  },
  
  parseSQL(content, dialect) {
    const tables = [];
    const relations = [];
    
    // 简化的正则表达式解析CREATE TABLE语句
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`\w]+)\s*\(([^;]+)\);?/gis;
    
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1].replace(/[`"\[\]]/g, '');
      const tableBody = match[2];
      
      const table = this.parseTableDefinition(tableName, tableBody, dialect);
      if (table) {
        tables.push(table);
        
        // 提取外键关系
        const fkRelations = this.extractForeignKeysFromBody(tableBody, tableName);
        relations.push(...fkRelations);
      }
    }
    
    return { tables, relations };
  },
  
  parseTableDefinition(tableName, tableBody, dialect) {
    const columns = [];
    let primaryKey = null;
    
    // 分割表体为行
    const lines = tableBody.split(',').map(line => line.trim());
    
    for (const line of lines) {
      // 跳过空行和约束定义
      if (!line || line.toLowerCase().includes('constraint') || 
          line.toLowerCase().includes('foreign key') ||
          line.toLowerCase().includes('index') ||
          line.toLowerCase().includes('key ')) {
        
        // 检查是否是PRIMARY KEY约束
        if (line.toLowerCase().includes('primary key')) {
          const pkMatch = line.match(/primary\s+key\s*\(([^)]+)\)/i);
          if (pkMatch) {
            primaryKey = pkMatch[1].replace(/[`"\[\]\s]/g, '');
          }
        }
        continue;
      }
      
      // 解析列定义
      const column = this.parseColumnDefinition(line, dialect);
      if (column) {
        columns.push(column);
        if (column.pk && !primaryKey) {
          primaryKey = column.name;
        }
      }
    }
    
    return {
      name: tableName,
      columns: columns,
      primaryKey: primaryKey
    };
  },
  
  parseColumnDefinition(line, dialect) {
    // 基本的列定义正则
    const columnRegex = /^([`\w]+)\s+([^,\s]+(?:\s*\([^)]*\))?(?:\s+\w+)*)/i;
    const match = line.match(columnRegex);
    
    if (!match) return null;
    
    const name = match[1].replace(/[`"\[\]]/g, '');
    const typeAndModifiers = match[2].toLowerCase();
    
    const column = {
      name: name,
      type: this.extractDataType(typeAndModifiers),
      nullable: !typeAndModifiers.includes('not null'),
      pk: false
    };
    
    // 检查是否是主键
    if (typeAndModifiers.includes('primary key')) {
      column.pk = true;
    }
    
    // 检查自增
    if (typeAndModifiers.includes('auto_increment') || typeAndModifiers.includes('serial')) {
      column.autoIncrement = true;
    }
    
    return column;
  },
  
  extractDataType(typeString) {
    // 提取基本数据类型（包括长度）
    const typeMatch = typeString.match(/^(\w+(?:\s*\([^)]*\))?)/i);
    return typeMatch ? typeMatch[1] : 'unknown';
  },
  
  extractForeignKeysFromBody(tableBody, tableName) {
    const relations = [];
    
    // 查找外键约束
    const fkRegex = /foreign\s+key\s*\(([^)]+)\)\s+references\s+([`\w]+)\s*\(([^)]+)\)/gi;
    
    let match;
    while ((match = fkRegex.exec(tableBody)) !== null) {
      const fromColumn = match[1].replace(/[`"\[\]\s]/g, '');
      const toTable = match[2].replace(/[`"\[\]]/g, '');
      const toColumn = match[3].replace(/[`"\[\]\s]/g, '');
      
      relations.push({
        from: `${tableName}.${fromColumn}`,
        to: `${toTable}.${toColumn}`,
        type: 'FK'
      });
    }
    
    return relations;
  },
  
  generateERJson(tables, relations) {
    const entities = tables.map(table => ({
      name: table.name,
      columns: table.columns.map(col => {
        const column = {
          name: col.name,
          type: col.type
        };
        if (col.pk) column.pk = true;
        if (!col.nullable) column.nullable = false;
        if (col.autoIncrement) column.autoIncrement = true;
        return column;
      })
    }));
    
    return {
      entities: entities,
      relations: relations
    };
  },
  
  generatePKFKJson(tables, relations) {
    const entities = tables.map(table => table.name);
    const primaryKeys = {};
    const foreignKeys = [];
    
    // 收集主键
    for (const table of tables) {
      if (table.primaryKey) {
        primaryKeys[table.name] = table.primaryKey;
      }
    }
    
    // 转换外键格式
    for (const relation of relations) {
      const [fromTable, fromColumn] = relation.from.split('.');
      const [toTable, toColumn] = relation.to.split('.');
      
      foreignKeys.push({
        table: fromTable,
        column: fromColumn,
        refTable: toTable,
        refColumn: toColumn
      });
    }
    
    return {
      entities: entities,
      primaryKeys: primaryKeys,
      foreignKeys: foreignKeys
    };
  }
};