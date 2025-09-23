/**
 * Java CRUD生成器 - 基于SQL表结构生成完整Spring Boot CRUD代码
 * 
 * 战略意义：
 * 1. 架构价值：通过代码生成确保项目结构一致性和开发规范统一
 * 2. 平台价值：实现从SQL到完整后端代码的自动化转换，提升开发效率
 * 3. 生态价值：为BMAD工作流提供Java后端代码生成能力，支持快速原型开发
 * 
 * 设计理念：
 * 采用集成SQL解析和文件生成的单体架构，避免工具间依赖问题。
 * 生成的代码遵循Spring Boot最佳实践，包含完整的分层架构和枚举接口。
 * 
 * 为什么重要：
 * 解决了手动编写重复CRUD代码的痛点，让开发者专注于业务逻辑而非样板代码。
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'java-crud-generator-fixed',
      name: 'Java CRUD生成器(修复版)',
      description: '基于SQL表结构生成完整的Spring Boot CRUD代码，支持枚举options接口',
      version: '1.0.3',
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
            description: 'SQL建表语句，支持多个表',
            minLength: 10
          },
          basePackage: {
            type: 'string',
            description: '基础包名',
            default: 'com.graduation'
          },
          outputPath: {
            type: 'string',
            description: '输出路径（相对于项目根目录）',
            default: 'project/backend/src/main/java'
          },
          author: {
            type: 'string',
            description: '作者名称',
            default: '李工 (Java后端开发工程师)'
          }
        },
        required: ['sql']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始生成Java CRUD代码', { params });
    
    try {
      // 解析SQL表结构
      const tables = this.parseSQL(params.sql);
      if (!tables || tables.length === 0) {
        return {
          success: false,
          error: '未能解析到任何表结构，请检查SQL语句格式'
        };
      }

      // 生成代码文件
      const generatedFiles = [];
      for (const table of tables) {
        const files = await this.generateCRUDFiles(table, params, api);
        generatedFiles.push(...files);
      }

      api.logger.info('代码生成完成', { 
        tableCount: tables.length,
        fileCount: generatedFiles.length 
      });

      return {
        success: true,
        data: {
          tables: tables.map(t => t.tableName),
          generatedFiles,
          summary: `成功为${tables.length}个表生成了${generatedFiles.length}个Java文件`
        }
      };

    } catch (error) {
      api.logger.error('代码生成失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查SQL语句格式是否正确'
      };
    }
  },

  parseSQL(sql) {
    // 简化的SQL解析逻辑
    const tables = [];
    const createTableRegex = /CREATE TABLE\s+`?([\w]+)`?\s*\((.*?)\)/gis;
    let match;

    while ((match = createTableRegex.exec(sql)) !== null) {
      const tableName = match[1];
      const fieldsPart = match[2];
      const fields = this.parseFields(fieldsPart);
      
      if (fields.length > 0) {
        tables.push({
          tableName,
          fields,
          comment: this.extractTableComment(match[0])
        });
      }
    }

    return tables;
  },

  parseFields(fieldsPart) {
    const fields = [];
    const lines = fieldsPart.split(',').map(line => line.trim());
    
    for (const line of lines) {
      if (this.isFieldDefinition(line)) {
        const field = this.parseFieldDefinition(line);
        if (field) {
          fields.push(field);
        }
      }
    }
    
    return fields;
  },

  isFieldDefinition(line) {
    const upperLine = line.toUpperCase().trim();
    
    // 跳过约束定义
    const constraintKeywords = ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE KEY', 'KEY ', 'INDEX ', 'CONSTRAINT', 'CHECK '];
    for (const keyword of constraintKeywords) {
      if (upperLine.startsWith(keyword)) {
        return false;
      }
    }
    
    // 检查是否为字段定义
    return upperLine.match(/^`?[A-Z_][A-Z0-9_]*`?\s+/);
  },

  parseFieldDefinition(line) {
    const fieldMatch = line.match(/^`?([\w]+)`?\s+([\w()]+)(.*)$/i);
    if (!fieldMatch) return null;

    const fieldName = fieldMatch[1];
    const dataType = fieldMatch[2].toUpperCase();
    const modifiers = fieldMatch[3] || '';
    
    const field = {
      name: fieldName,
      type: this.mapJavaType(dataType),
      nullable: !modifiers.toUpperCase().includes('NOT NULL'),
      primaryKey: modifiers.toUpperCase().includes('PRIMARY KEY'),
      autoIncrement: modifiers.toUpperCase().includes('AUTO_INCREMENT'),
      defaultValue: this.extractDefaultValue(modifiers),
      comment: this.extractComment(modifiers)
    };

    // 检查是否为枚举字段
    if (field.comment && field.comment.includes('【枚举】')) {
      field.isEnum = true;
      field.enumOptions = this.parseEnumOptions(field.comment);
    }

    return field;
  },

  mapJavaType(sqlType) {
    const typeMapping = {
      'BIGINT': 'Long',
      'INT': 'Integer', 
      'INTEGER': 'Integer',
      'TINYINT': 'Integer',
      'VARCHAR': 'String',
      'TEXT': 'String',
      'DATETIME': 'LocalDateTime',
      'TIMESTAMP': 'LocalDateTime',
      'DECIMAL': 'BigDecimal',
      'DOUBLE': 'Double',
      'FLOAT': 'Float'
    };
    
    for (const [sql, java] of Object.entries(typeMapping)) {
      if (sqlType.startsWith(sql)) {
        return java;
      }
    }
    return 'String'; // 默认类型
  },

  extractComment(modifiers) {
    const commentMatch = modifiers.match(/COMMENT\s+['"]([^'"]+)['"]/i);
    return commentMatch ? commentMatch[1] : '';
  },

  extractDefaultValue(modifiers) {
    const defaultMatch = modifiers.match(/DEFAULT\s+([^\s]+)/i);
    return defaultMatch ? defaultMatch[1] : null;
  },

  extractTableComment(createTableStatement) {
    const commentMatch = createTableStatement.match(/COMMENT\s*=?\s*['"]([^'"]+)['"]/i);
    return commentMatch ? commentMatch[1] : '';
  },

  parseEnumOptions(comment) {
    // 解析枚举选项：0-下架，1-上架，2-预售
    const optionsMatch = comment.match(/：(.+)$/);
    if (!optionsMatch) return [];
    
    const optionsText = optionsMatch[1];
    return optionsText.split(/[，,]/).map(option => {
      const parts = option.trim().split(/[-：:]/);
      if (parts.length === 2) {
        return {
          value: parts[0].trim(),
          label: parts[1].trim()
        };
      }
      return null;
    }).filter(Boolean);
  },

  async generateCRUDFiles(table, params, api) {
    const generatedFiles = [];
    const className = this.toPascalCase(table.tableName);
    const packagePath = params.basePackage.replace(/\./g, '/');
    
    // 生成各个文件
    const files = {
      entity: this.generateEntity(table, params, className),
      mapper: this.generateMapper(table, params, className),
      service: this.generateService(table, params, className),
      serviceImpl: this.generateServiceImpl(table, params, className),
      controller: this.generateController(table, params, className),
      dto: this.generateDTO(table, params, className)
    };

    // 写入文件
    for (const [type, content] of Object.entries(files)) {
      const filePath = this.getFilePath(type, packagePath, className, params.outputPath);
      
      try {
        // 使用filesystem工具创建文件
        await api.importx('@promptx/filesystem').then(fs => 
          fs.writeFile(filePath, content)
        ).catch(async () => {
          // 降级使用原生方式
          const path = await api.importx('path');
          const fsNative = await api.importx('fs');
          const dir = path.dirname(filePath);
          await fsNative.promises.mkdir(dir, { recursive: true });
          await fsNative.promises.writeFile(filePath, content, 'utf8');
        });
        
        generatedFiles.push(filePath);
        api.logger.info(`生成文件: ${filePath}`);
      } catch (error) {
        api.logger.error(`创建文件失败: ${filePath}`, error);
        throw new Error(`创建文件失败: ${filePath} - ${error.message}`);
      }
    }

    return generatedFiles;
  },

  getFilePath(type, packagePath, className, outputPath) {
    const typePathMap = {
      entity: `${packagePath}/entity/${className}.java`,
      mapper: `${packagePath}/mapper/${className}Mapper.java`,
      service: `${packagePath}/service/${className}Service.java`,
      serviceImpl: `${packagePath}/service/impl/${className}ServiceImpl.java`,
      controller: `${packagePath}/controller/${className}Controller.java`,
      dto: `${packagePath}/dto/${className}DTO.java`
    };
    
    return `${outputPath}/${typePathMap[type]}`;
  },

  generateEntity(table, params, className) {
    const fields = table.fields.map(field => {
      const annotations = [];
      if (field.primaryKey) {
        annotations.push('    @TableId(type = IdType.AUTO)');
      }
      
      const javaName = this.toCamelCase(field.name);
      const comment = field.comment ? ` // ${field.comment}` : '';
      
      return `${annotations.join('\n')}${annotations.length > 0 ? '\n' : ''}    private ${field.type} ${javaName};${comment}`;
    }).join('\n\n');

    return `package ${params.basePackage}.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.math.BigDecimal;

/**
 * ${table.comment || table.tableName}
 * @author ${params.author}
 */
@Data
@TableName("${table.tableName}")
public class ${className} {

${fields}

}`;
  },

  generateMapper(table, params, className) {
    return `package ${params.basePackage}.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import ${params.basePackage}.entity.${className};
import org.apache.ibatis.annotations.Mapper;

/**
 * ${table.comment || table.tableName} Mapper
 * @author ${params.author}
 */
@Mapper
public interface ${className}Mapper extends BaseMapper<${className}> {

}`;
  },

  generateService(table, params, className) {
    return `package ${params.basePackage}.service;

import com.baomidou.mybatisplus.extension.service.IService;
import ${params.basePackage}.entity.${className};
import ${params.basePackage}.dto.${className}DTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import com.graduation.common.PageParam;

/**
 * ${table.comment || table.tableName} Service
 * @author ${params.author}
 */
public interface ${className}Service extends IService<${className}> {

    Result<PageResult<${className}>> list(PageParam pageParam);
    
    Result<${className}> getById(Long id);
    
    Result<${className}> save(${className}DTO dto);
    
    Result<${className}> update(${className}DTO dto);
    
    Result<Void> deleteById(Long id);
    
    Result<Void> deleteBatch(Long[] ids);

}`;
  },

  generateServiceImpl(table, params, className) {
    return `package ${params.basePackage}.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import ${params.basePackage}.entity.${className};
import ${params.basePackage}.mapper.${className}Mapper;
import ${params.basePackage}.service.${className}Service;
import ${params.basePackage}.dto.${className}DTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import com.graduation.common.PageParam;
import org.springframework.stereotype.Service;
import org.springframework.beans.BeanUtils;
import java.util.Arrays;

/**
 * ${table.comment || table.tableName} Service实现
 * @author ${params.author}
 */
@Service
public class ${className}ServiceImpl extends ServiceImpl<${className}Mapper, ${className}> implements ${className}Service {

    @Override
    public Result<PageResult<${className}>> list(PageParam pageParam) {
        Page<${className}> page = new Page<>(pageParam.getPageNum(), pageParam.getPageSize());
        Page<${className}> result = this.page(page);
        return Result.success(PageResult.of(result));
    }
    
    @Override
    public Result<${className}> getById(Long id) {
        ${className} entity = this.getById(id);
        return entity != null ? Result.success(entity) : Result.error("数据不存在");
    }
    
    @Override
    public Result<${className}> save(${className}DTO dto) {
        ${className} entity = new ${className}();
        BeanUtils.copyProperties(dto, entity);
        this.save(entity);
        return Result.success(entity);
    }
    
    @Override
    public Result<${className}> update(${className}DTO dto) {
        ${className} entity = new ${className}();
        BeanUtils.copyProperties(dto, entity);
        this.updateById(entity);
        return Result.success(entity);
    }
    
    @Override
    public Result<Void> deleteById(Long id) {
        this.removeById(id);
        return Result.success();
    }
    
    @Override
    public Result<Void> deleteBatch(Long[] ids) {
        this.removeByIds(Arrays.asList(ids));
        return Result.success();
    }

}`;
  },

  generateController(table, params, className) {
    const enumFields = table.fields.filter(field => field.isEnum);
    const enumMethods = enumFields.map(field => {
      const methodName = this.toCamelCase(field.name);
      const options = field.enumOptions.map(opt => 
        `        result.add(Map.of(\"value\", ${opt.value}, \"label\", \"${opt.label}\"));`
      ).join('\n');
      
      return `    @PostMapping(\"/${methodName}-options\")
    public Result<List<Map<String, Object>>> ${methodName}Options() {
        List<Map<String, Object>> result = new ArrayList<>();
${options}
        return Result.success(result);
    }`;
    }).join('\n\n');

    return `package ${params.basePackage}.controller;

import ${params.basePackage}.service.${className}Service;
import ${params.basePackage}.entity.${className};
import ${params.basePackage}.dto.${className}DTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import com.graduation.common.PageParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * ${table.comment || table.tableName} Controller
 * @author ${params.author}
 */
@RestController
@RequestMapping(\"/api/${table.tableName}\")
public class ${className}Controller {

    @Autowired
    private ${className}Service ${this.toCamelCase(className)}Service;

    @PostMapping(\"/list\")
    public Result<PageResult<${className}>> list(@RequestBody PageParam pageParam) {
        return ${this.toCamelCase(className)}Service.list(pageParam);
    }

    @PostMapping(\"/get\")
    public Result<${className}> getById(@RequestBody Map<String, Long> request) {
        Long id = request.get(\"id\");
        return ${this.toCamelCase(className)}Service.getById(id);
    }

    @PostMapping(\"/save\")
    public Result<${className}> save(@RequestBody ${className}DTO dto) {
        return ${this.toCamelCase(className)}Service.save(dto);
    }

    @PostMapping(\"/update\")
    public Result<${className}> update(@RequestBody ${className}DTO dto) {
        return ${this.toCamelCase(className)}Service.update(dto);
    }

    @PostMapping(\"/delete\")
    public Result<Void> deleteById(@RequestBody Map<String, Long> request) {
        Long id = request.get(\"id\");
        return ${this.toCamelCase(className)}Service.deleteById(id);
    }

    @PostMapping(\"/delete-batch\")
    public Result<Void> deleteBatch(@RequestBody Map<String, Long[]> request) {
        Long[] ids = request.get(\"ids\");
        return ${this.toCamelCase(className)}Service.deleteBatch(ids);
    }

${enumMethods ? enumMethods + '\n' : ''}
}`;
  },

  generateDTO(table, params, className) {
    const fields = table.fields
      .filter(field => !field.primaryKey && !['create_time', 'update_time', 'is_deleted'].includes(field.name))
      .map(field => {
        const javaName = this.toCamelCase(field.name);
        const comment = field.comment ? ` // ${field.comment}` : '';
        return `    private ${field.type} ${javaName};${comment}`;
      }).join('\n');

    return `package ${params.basePackage}.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.math.BigDecimal;

/**
 * ${table.comment || table.tableName} DTO
 * @author ${params.author}
 */
@Data
public class ${className}DTO {

${fields}

}`;
  },

  toPascalCase(str) {
    return str.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  },

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

};