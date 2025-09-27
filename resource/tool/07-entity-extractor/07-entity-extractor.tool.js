/**
 * 07-entity-extractor - 实体类识别与三线表生成器
 * 
 * 战略意义：
 * 1. 架构价值：通过代码分析自动化数据库设计文档生成，确保论文与实际代码的一致性
 * 2. 平台价值：支持多语言实体类识别，为跨技术栈项目提供统一的数据建模分析
 * 3. 生态价值：作为论文工具链的核心组件，连接源码分析与文档生成环节
 * 
 * 设计理念：
 * 不仅要识别实体类的结构信息，更要智能推断中文业务含义。通过多层次的
 * 证据收集和优先级规则，将技术实现转化为可读的业务文档，实现代码到
 * 论文的自动化桥接。
 * 
 * 为什么重要：
 * 手动维护数据字典容易与代码脱节，这个工具确保论文中的表格设计
 * 与实际代码保持同步，是软件工程文档自动化的重要实践。
 */

module.exports = {
  getDependencies() {
    return {
      'fs': '^0.0.1-security',
      'path': '^0.12.7'
    };
  },

  getMetadata() {
    return {
      id: '07-entity-extractor',
      name: '实体类识别与三线表生成器',
      description: '扫描源码目录，自动识别实体类定义，提取字段信息并生成标准化三线表JSON文件',
      version: '1.0.0',
      category: 'code-analysis',
      author: '鲁班',
      tags: ['entity', 'database', 'table', 'extraction', 'java', 'analysis']
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          sourceDir: {
            type: 'string',
            description: '源码目录路径，默认为 <projectRoot>/source/',
            default: 'auto'
          },
          outputDir: {
            type: 'string',
            description: '输出目录路径，默认为 <projectRoot>/paper/exports/tables/',
            default: 'auto'
          },
          projectRoot: {
            type: 'string',
            description: '项目根目录，默认为当前工作目录',
            default: 'auto'
          }
        },
        required: []
      }
    };
  },

  validate(params) {
    return { valid: true, errors: [] };
  },

  async execute(params) {
    const { api } = this;
    const fs = await api.importx('fs');
    const path = await api.importx('path');

    try {
      api.logger.info('开始实体类识别与三线表生成', { params });
      
      // 确定工作路径 - 修复undefined问题
      const projectRoot = (!params.projectRoot || params.projectRoot === 'auto') ? process.cwd() : params.projectRoot;
      const sourceDir = (!params.sourceDir || params.sourceDir === 'auto') ? path.join(projectRoot, 'source') : params.sourceDir;
      const outputDir = (!params.outputDir || params.outputDir === 'auto') ? path.join(projectRoot, 'paper', 'exports', 'tables') : params.outputDir;
      
      api.logger.info('路径配置', { projectRoot, sourceDir, outputDir });
      
      // 检查源码目录
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`源码目录不存在: ${sourceDir}`);
      }
      
      // 确保输出目录存在
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        api.logger.info('创建输出目录', { outputDir });
      }
      
      // 扫描并识别实体类
      const entities = await this.scanEntities(sourceDir, fs, path, api);
      api.logger.info('实体类扫描完成', { count: entities.length });
      
      if (entities.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ENTITIES_FOUND',
            message: '未发现可解析的实体定义'
          }
        };
      }
      
      // 处理每个实体
      const results = {
        tables: [],
        failList: [],
        generatedFiles: []
      };
      
      for (const entity of entities) {
        try {
          const tableData = await this.processEntity(entity, params, api);
          
          // 生成文件名
          const fileName = `Tab-${tableData.tableName}.json`;
          const filePath = path.join(outputDir, fileName);
          
          // 写入文件
          fs.writeFileSync(filePath, JSON.stringify(tableData, null, 2), 'utf8');
          
          results.tables.push({
            name: tableData.tableName,
            cn: tableData.tableCnName,
            columns: tableData.columns.length - 1 // 减去表头
          });
          
          results.generatedFiles.push(path.relative(projectRoot, filePath));
          
          api.logger.info('实体处理成功', { 
            entity: tableData.tableName, 
            fields: tableData.columns.length - 1 
          });
          
        } catch (error) {
          api.logger.error('实体处理失败', { entity: entity.className, error });
          results.failList.push({
            file: entity.filePath,
            entity: entity.className,
            reason: error.message
          });
        }
      }
      
      // 生成最终结果
      const summary = {
        status: 'success',
        project: path.basename(projectRoot),
        entityCount: results.tables.length,
        tableJsonDir: outputDir,
        tables: results.tables,
        failList: results.failList,
        generatedFiles: results.generatedFiles
      };
      
      api.logger.info('实体识别完成', summary);
      
      return {
        success: true,
        message: `成功处理 ${results.tables.length} 个实体类，生成 ${results.generatedFiles.length} 个三线表文件`,
        data: summary
      };
      
    } catch (error) {
      api.logger.error('实体识别失败', error);
      return {
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: `实体识别失败: ${error.message}`
        }
      };
    }
  },

  async scanEntities(sourceDir, fs, path, api) {
    const entities = [];
    
    // 递归扫描 Java 实体类
    const javaFiles = this.findFiles(sourceDir, /\.java$/, fs, path);
    
    for (const filePath of javaFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查是否为实体类
        if (this.isJavaEntity(content, filePath)) {
          const entity = this.parseJavaEntity(content, filePath, path);
          if (entity) {
            entities.push(entity);
            api.logger.info('发现实体类', { file: path.basename(filePath), className: entity.className });
          }
        }
      } catch (error) {
        api.logger.warn('文件解析失败', { file: filePath, error: error.message });
      }
    }
    
    return entities;
  },

  findFiles(dir, pattern, fs, path) {
    const files = [];
    
    const scan = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (stat.isFile() && pattern.test(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略权限错误
      }
    };
    
    scan(dir);
    return files;
  },

  isJavaEntity(content, filePath) {
    // 检查是否包含实体注解
    const entityAnnotations = [
      /@Entity/,
      /@Table/,
      /@Document/, // MongoDB
      /class\s+\w+.*extends.*BaseEntity/,
      /\/entity\//,  // 路径包含 entity
      /\/model\//   // 路径包含 model
    ];
    
    return entityAnnotations.some(pattern => 
      pattern.test(content) || pattern.test(filePath)
    );
  },

  parseJavaEntity(content, filePath, path) {
    try {
      // 提取类名
      const classMatch = content.match(/public\s+class\s+(\w+)/);
      if (!classMatch) return null;
      
      const className = classMatch[1];
      
      // 提取表名（从 @Table 注解或类名推断）
      let tableName = this.extractTableName(content, className);
      
      // 提取字段
      const fields = this.extractJavaFields(content);
      
      return {
        className,
        tableName,
        filePath,
        language: 'java',
        fields
      };
      
    } catch (error) {
      throw new Error(`Java实体解析失败: ${error.message}`);
    }
  },

  extractTableName(content, className) {
    // 从 @Table 注解提取
    const tableMatch = content.match(/@Table\s*\(\s*name\s*=\s*["'](\w+)["']/); 
    if (tableMatch) {
      return tableMatch[1].toLowerCase();
    }
    
    // 从类名推断（驼峰转下划线）
    return this.camelToSnake(className);
  },

  extractJavaFields(content) {
    const fields = [];
    
    // 匹配字段定义（支持注解）
    const fieldPattern = /(?:@[\w\s\(\)="',\.]+\s*)*private\s+(\w+(?:<[^>]+>)?)\s+(\w+);/g;
    
    let match;
    while ((match = fieldPattern.exec(content)) !== null) {
      const type = match[1];
      const name = match[2];
      
      // 获取字段前的注解
      const fieldStart = match.index;
      const beforeField = content.substring(Math.max(0, fieldStart - 200), fieldStart);
      const annotations = this.extractFieldAnnotations(beforeField);
      
      fields.push({
        name,
        type,
        annotations,
        originalType: type
      });
    }
    
    return fields;
  },

  extractFieldAnnotations(annotationText) {
    const annotations = {};
    
    // @Id
    if (/@Id/.test(annotationText)) {
      annotations.primary = true;
    }
    
    // @Column
    const columnMatch = annotationText.match(/@Column\s*\(([^)]+)\)/);
    if (columnMatch) {
      const columnDef = columnMatch[1];
      
      // nullable
      const nullableMatch = columnDef.match(/nullable\s*=\s*(false|true)/);
      if (nullableMatch) {
        annotations.nullable = nullableMatch[1] === 'true';
      }
      
      // length
      const lengthMatch = columnDef.match(/length\s*=\s*(\d+)/);
      if (lengthMatch) {
        annotations.length = parseInt(lengthMatch[1]);
      }
      
      // unique
      if (/unique\s*=\s*true/.test(columnDef)) {
        annotations.unique = true;
      }
    }
    
    return annotations;
  },

  async processEntity(entity, params, api) {
    // 生成表名和中文名
    const tableName = entity.tableName;
    const tableCnName = this.generateChineseName(entity.className, 'table');
    
    // 处理字段
    const columns = [['字段名', '字段中文名', '类型', '约束', '说明']];
    
    for (const field of entity.fields) {
      // 跳过特定字段
      if (['serialVersionUID', 'class'].includes(field.name)) {
        continue;
      }
      
      const fieldName = this.camelToSnake(field.name);
      const fieldCnName = this.generateChineseName(field.name, 'field');
      const sqlType = this.mapToSqlType(field.type, field.annotations);
      const constraints = this.buildConstraints(field.annotations);
      const description = this.generateDescription(field.name, field.annotations);
      
      columns.push([fieldName, fieldCnName, sqlType, constraints, description]);
    }
    
    return {
      tableName,
      tableCnName,
      columns
    };
  },

  generateChineseName(englishName, type) {
    // 基础词典映射
    const dictionary = {
      // 表名映射
      'User': '用户',
      'Dish': '菜品',
      'Rating': '评分',
      'Stall': '档口',
      'Canteen': '食堂',
      'Complaint': '投诉',
      'SensitiveWord': '敏感词',
      'BaseEntity': '基础实体',
      
      // 字段映射
      'id': '编号',
      'name': '名称',
      'username': '用户名',
      'password': '密码',
      'email': '邮箱',
      'phone': '电话',
      'title': '标题',
      'content': '内容',
      'description': '描述',
      'price': '价格',
      'category': '分类',
      'status': '状态',
      'type': '类型',
      'rating': '评分',
      'comment': '评论',
      'address': '地址',
      'location': '位置',
      'contact': '联系方式',
      'created': '创建时间',
      'createdAt': '创建时间',
      'createdTime': '创建时间',
      'updated': '更新时间',
      'updatedAt': '更新时间',
      'updatedTime': '更新时间',
      'deleted': '删除标识',
      'version': '版本号',
      'userId': '用户编号',
      'dishId': '菜品编号',
      'stallId': '档口编号',
      'canteenId': '食堂编号'
    };
    
    // 直接映射
    if (dictionary[englishName]) {
      return type === 'table' ? dictionary[englishName] + '表' : dictionary[englishName];
    }
    
    // 模式匹配
    if (type === 'field') {
      if (englishName.startsWith('is') || englishName.startsWith('has')) {
        return '是否' + this.camelToWords(englishName.substring(2));
      }
      
      if (englishName.endsWith('Time') || englishName.endsWith('Date')) {
        return this.camelToWords(englishName.replace(/(Time|Date)$/, '')) + '时间';
      }
      
      if (englishName.endsWith('Count') || englishName.endsWith('Num')) {
        return this.camelToWords(englishName.replace(/(Count|Num)$/, '')) + '数量';
      }
      
      if (englishName.endsWith('Id')) {
        return this.camelToWords(englishName.replace(/Id$/, '')) + '编号';
      }
    }
    
    // 分词翻译
    const words = this.camelToWords(englishName);
    return type === 'table' ? words + '表' : words;
  },

  camelToWords(camelCase) {
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => {
        const lower = word.toLowerCase();
        const commonWords = {
          'user': '用户', 'dish': '菜品', 'rating': '评分',
          'stall': '档口', 'canteen': '食堂', 'complaint': '投诉',
          'id': '编号', 'name': '名称', 'time': '时间',
          'date': '日期', 'status': '状态', 'type': '类型',
          'word': '词', 'sensitive': '敏感'
        };
        return commonWords[lower] || word;
      })
      .join('');
  },

  camelToSnake(camelCase) {
    return camelCase
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },

  mapToSqlType(javaType, annotations) {
    const typeMap = {
      'String': annotations.length ? `VARCHAR(${annotations.length})` : 'VARCHAR(255)',
      'int': 'INT',
      'Integer': 'INT',
      'long': 'BIGINT',
      'Long': 'BIGINT',
      'boolean': 'TINYINT(1)',
      'Boolean': 'TINYINT(1)',
      'double': 'DOUBLE',
      'Double': 'DOUBLE',
      'float': 'FLOAT',
      'Float': 'FLOAT',
      'BigDecimal': 'DECIMAL(10,2)',
      'Date': 'DATETIME',
      'LocalDate': 'DATE',
      'LocalDateTime': 'DATETIME',
      'LocalTime': 'TIME',
      'Timestamp': 'TIMESTAMP'
    };
    
    return typeMap[javaType] || 'VARCHAR(255)';
  },

  buildConstraints(annotations) {
    const constraints = [];
    
    if (annotations.primary) {
      constraints.push('PK');
    }
    
    if (annotations.nullable === false) {
      constraints.push('NOT NULL');
    }
    
    if (annotations.unique) {
      constraints.push('UNIQUE');
    }
    
    return constraints.join(', ');
  },

  generateDescription(fieldName, annotations) {
    if (annotations.primary) {
      return '主键';
    }
    
    // 根据字段名生成描述
    const descriptions = {
      'id': '主键',
      'username': '登录账号',
      'password': '加密存储',
      'email': '邮箱地址',
      'phone': '联系电话',
      'createdTime': '记录创建时间',
      'updatedTime': '记录更新时间',
      'deleted': '软删除标识',
      'version': '乐观锁版本号'
    };
    
    return descriptions[fieldName] || '';
  }
};