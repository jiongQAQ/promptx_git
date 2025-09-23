/**
 * 增强版Java CRUD代码生成器（修复版）
 * 
 * 功能特点：
 * 1. 基于SQL表结构自动生成完整的Spring Boot CRUD代码
 * 2. 生成Entity、Mapper、Service、ServiceImpl、Controller、DTO等完整层级
 * 3. 支持枚举字段自动生成options接口
 * 4. 所有接口使用POST请求和@RequestBody
 * 5. 支持分页查询、批量操作等高级功能
 * 6. 遵循项目现有的Result、PageParam、PageResult规范
 * 7. RequestMapping格式：/api/tablename（无admin前缀）
 * 
 * @author 鲁班
 * @version 1.0.1
 */

module.exports = {
  getDependencies() {
    return {};
  },

  getMetadata() {
    return {
      id: 'java-crud-generator-enhanced',
      name: '增强版Java CRUD代码生成器',
      description: '基于SQL表结构生成完整的Spring Boot CRUD代码，支持枚举options接口和POST请求',
      version: '1.0.1',
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
    
    api.logger.info('开始生成Java CRUD代码', {
      sqlLength: params.sql.length,
      basePackage: params.basePackage || 'com.graduation'
    });
    
    try {
      // 1. 调用sql-table-parser解析SQL
      const parseResult = await api.callTool('sql-table-parser', {
        sql: params.sql,
        includeComments: true,
        parseEnums: true
      });
      
      if (!parseResult.success) {
        return {
          success: false,
          error: '解析SQL失败：' + parseResult.error,
          suggestion: '请检查SQL语句格式是否正确'
        };
      }
      
      const tables = parseResult.data.tables;
      api.logger.info('SQL解析成功', { tableCount: tables.length });
      
      // 2. 生成代码文件
      const generateResult = await this.generateCrudCode(tables, params, api);
      if (!generateResult.success) {
        return generateResult;
      }
      
      api.logger.info('Java CRUD代码生成完成', {
        tableCount: tables.length,
        totalFiles: generateResult.data.totalFiles
      });
      
      return {
        success: true,
        data: {
          tables: tables.map(t => t.tableName),
          generatedFiles: generateResult.data.files,
          totalFiles: generateResult.data.totalFiles,
          summary: {
            entities: tables.length,
            controllers: tables.length,
            services: tables.length * 2, // interface + impl
            mappers: tables.length,
            dtos: tables.length * 3 // create, update, query
          }
        }
      };
    } catch (error) {
      api.logger.error('生成Java CRUD代码失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查参数和SQL语句'
      };
    }
  },

  // 生成CRUD代码
  async generateCrudCode(tables, params, api) {
    const basePackage = params.basePackage || 'com.graduation';
    const outputPath = params.outputPath || 'project/backend/src/main/java';
    const author = params.author || '李工 (Java后端开发工程师)';
    
    const generatedFiles = [];
    
    try {
      for (const table of tables) {
        api.logger.info('生成表代码', { tableName: table.tableName });
        
        // 计算类名和变量名
        const className = this.toPascalCase(table.tableName);
        const variableName = this.toCamelCase(table.tableName);
        
        // 1. 生成Entity实体类
        const entityFiles = await this.generateEntity(table, className, basePackage, outputPath, author, api);
        generatedFiles.push(...entityFiles);
        
        // 2. 生成Mapper接口
        const mapperFiles = await this.generateMapper(table, className, basePackage, outputPath, author, api);
        generatedFiles.push(...mapperFiles);
        
        // 3. 生成Service接口
        const serviceFiles = await this.generateService(table, className, variableName, basePackage, outputPath, author, api);
        generatedFiles.push(...serviceFiles);
        
        // 4. 生成ServiceImpl实现类
        const serviceImplFiles = await this.generateServiceImpl(table, className, variableName, basePackage, outputPath, author, api);
        generatedFiles.push(...serviceImplFiles);
        
        // 5. 生成Controller控制器
        const controllerFiles = await this.generateController(table, className, variableName, basePackage, outputPath, author, api);
        generatedFiles.push(...controllerFiles);
        
        // 6. 生成DTO类
        const dtoFiles = await this.generateDTOs(table, className, basePackage, outputPath, author, api);
        generatedFiles.push(...dtoFiles);
      }
      
      return {
        success: true,
        data: {
          files: generatedFiles,
          totalFiles: generatedFiles.length
        }
      };
    } catch (error) {
      api.logger.error('生成代码文件失败', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // 生成Entity实体类
  async generateEntity(table, className, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.entity`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    const fileName = `${className}.java`;
    
    // 生成字段代码
    const fieldsCode = table.fields.map(field => {
      const fieldType = this.mapJavaType(field.type.name);
      const fieldName = this.toCamelCase(field.name);
      
      let annotations = [];
      let comment = field.comment ? `    /**\n     * ${field.comment}\n     */` : '';
      
      // 主键注解
      if (field.primaryKey) {
        annotations.push('    @TableId(type = IdType.AUTO)');
      }
      
      // 字段注解（非主键字段）
      if (!field.primaryKey && field.name !== fieldName) {
        annotations.push(`    @TableField("${field.name}")`);
      }
      
      return `${comment}
${annotations.join('\n')}
    private ${fieldType} ${fieldName};`;
    }).join('\n\n');
    
    const entityContent = `package ${packagePath};

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ${table.comment || className + '实体类'}
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Data
@TableName("${table.tableName}")
public class ${className} implements Serializable {
    
    private static final long serialVersionUID = 1L;

${fieldsCode}
}`;
    
    // 创建目录并写入文件
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${fileName}`,
      content: entityContent
    });
    
    return [{
      type: 'Entity',
      path: `${filePath}/${fileName}`,
      className: className
    }];
  },

  // 生成Mapper接口
  async generateMapper(table, className, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.mapper`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    const fileName = `${className}Mapper.java`;
    
    const mapperContent = `package ${packagePath};

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import ${basePackage}.entity.${className};
import org.apache.ibatis.annotations.Mapper;

/**
 * ${table.comment || className}数据访问层
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Mapper
public interface ${className}Mapper extends BaseMapper<${className}> {
    
}`;
    
    // 创建目录并写入文件
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${fileName}`,
      content: mapperContent
    });
    
    return [{
      type: 'Mapper',
      path: `${filePath}/${fileName}`,
      className: `${className}Mapper`
    }];
  },

  // 生成Service接口
  async generateService(table, className, variableName, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.service`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    const fileName = `${className}Service.java`;
    
    const serviceContent = `package ${packagePath};

import ${basePackage}.entity.${className};
import ${basePackage}.dto.${className}CreateDTO;
import ${basePackage}.dto.${className}UpdateDTO;
import ${basePackage}.dto.${className}QueryDTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;

import java.util.List;

/**
 * ${table.comment || className}业务接口
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
public interface ${className}Service {
    
    /**
     * 创建${table.comment || className}
     */
    Result<Void> create(${className}CreateDTO createDTO);
    
    /**
     * 更新${table.comment || className}
     */
    Result<Void> update(${className}UpdateDTO updateDTO);
    
    /**
     * 删除${table.comment || className}
     */
    Result<Void> delete(Long id);
    
    /**
     * 批量删除${table.comment || className}
     */
    Result<Void> batchDelete(List<Long> ids);
    
    /**
     * 获取${table.comment || className}详情
     */
    Result<${className}> getDetail(Long id);
    
    /**
     * 分页查询${table.comment || className}列表
     */
    Result<PageResult<${className}>> getList(${className}QueryDTO queryDTO);
}`;
    
    // 创建目录并写入文件
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${fileName}`,
      content: serviceContent
    });
    
    return [{
      type: 'Service',
      path: `${filePath}/${fileName}`,
      className: `${className}Service`
    }];
  },

  // 生成ServiceImpl实现类
  async generateServiceImpl(table, className, variableName, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.service.impl`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    const fileName = `${className}ServiceImpl.java`;
    
    const serviceImplContent = `package ${packagePath};

import ${basePackage}.entity.${className};
import ${basePackage}.mapper.${className}Mapper;
import ${basePackage}.service.${className}Service;
import ${basePackage}.dto.${className}CreateDTO;
import ${basePackage}.dto.${className}UpdateDTO;
import ${basePackage}.dto.${className}QueryDTO;
import com.graduation.service.BaseService;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * ${table.comment || className}业务实现类
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Slf4j
@Service
public class ${className}ServiceImpl extends BaseService<${className}, Long> implements ${className}Service {
    
    @Autowired
    private ${className}Mapper ${variableName}Mapper;
    
    @Override
    protected BaseMapper<${className}> getBaseMapper() {
        return ${variableName}Mapper;
    }
    
    @Override
    public Result<Void> create(${className}CreateDTO createDTO) {
        ${className} ${variableName} = new ${className}();
        BeanUtils.copyProperties(createDTO, ${variableName});
        return save(${variableName});
    }
    
    @Override
    public Result<Void> update(${className}UpdateDTO updateDTO) {
        ${className} ${variableName} = new ${className}();
        BeanUtils.copyProperties(updateDTO, ${variableName});
        return update(${variableName}, updateDTO.getId(), "${table.comment || className}");
    }
    
    @Override
    public Result<Void> delete(Long id) {
        return deleteById(id, "${table.comment || className}");
    }
    
    @Override
    public Result<Void> batchDelete(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Result.badRequest("删除ID列表不能为空");
        }
        try {
            ${variableName}Mapper.deleteBatchIds(ids);
            return Result.success();
        } catch (Exception e) {
            return Result.error("批量删除失败：" + e.getMessage());
        }
    }
    
    @Override
    public Result<${className}> getDetail(Long id) {
        return checkEntityExists(id, "${table.comment || className}");
    }
    
    @Override
    public Result<PageResult<${className}>> getList(${className}QueryDTO queryDTO) {
        try {
            QueryWrapper<${className}> queryWrapper = new QueryWrapper<>();
            queryWrapper.orderByDesc("id");
            
            Page<${className}> page = queryDTO.toPage();
            Page<${className}> result = ${variableName}Mapper.selectPage(page, queryWrapper);
            
            return Result.success(PageResult.of(result));
        } catch (Exception e) {
            return Result.error("查询失败：" + e.getMessage());
        }
    }
}`;
    
    // 创建目录并写入文件
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${fileName}`,
      content: serviceImplContent
    });
    
    return [{
      type: 'ServiceImpl',
      path: `${filePath}/${fileName}`,
      className: `${className}ServiceImpl`
    }];
  },

  // 生成Controller控制器
  async generateController(table, className, variableName, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.controller`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    const fileName = `${className}Controller.java`;
    
    // 获取枚举字段
    const enumFields = table.fields.filter(field => field.enumValues && field.enumValues.length > 0);
    
    // 生成枚举options接口
    const enumOptionsCode = enumFields.map(field => {
      const fieldName = this.toCamelCase(field.name);
      const methodName = this.toPascalCase(fieldName);
      const optionsData = field.enumValues.map(item => 
        `            Map.of("value", ${item.value}, "label", "${item.label}")`
      ).join(',\n');
      
      return `    /**
     * 获取${field.comment || field.name}选项列表
     */
    @PostMapping("/${field.name.replace(/_/g, '-')}-options")
    public Result<List<Map<String, Object>>> get${methodName}Options() {
        List<Map<String, Object>> options = Arrays.asList(
${optionsData}
        );
        return Result.success(options);
    }`;
    }).join('\n\n');
    
    const controllerContent = `package ${packagePath};

import ${basePackage}.entity.${className};
import ${basePackage}.service.${className}Service;
import ${basePackage}.dto.${className}CreateDTO;
import ${basePackage}.dto.${className}UpdateDTO;
import ${basePackage}.dto.${className}QueryDTO;
import com.graduation.common.Result;
import com.graduation.common.PageResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * ${table.comment || className}控制器
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Slf4j
@RestController
@RequestMapping("/api/${table.tableName.replace(/_/g, '-')}")
public class ${className}Controller {
    
    @Autowired
    private ${className}Service ${variableName}Service;
    
    @PostMapping("/create")
    public Result<Void> create(@Valid @RequestBody ${className}CreateDTO createDTO) {
        return ${variableName}Service.create(createDTO);
    }
    
    @PostMapping("/update")
    public Result<Void> update(@Valid @RequestBody ${className}UpdateDTO updateDTO) {
        return ${variableName}Service.update(updateDTO);
    }
    
    @PostMapping("/delete")
    public Result<Void> delete(@RequestBody Map<String, Long> request) {
        return ${variableName}Service.delete(request.get("id"));
    }
    
    @PostMapping("/batch-delete")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        return ${variableName}Service.batchDelete(ids);
    }
    
    @PostMapping("/detail")
    public Result<${className}> getDetail(@RequestBody Map<String, Long> request) {
        return ${variableName}Service.getDetail(request.get("id"));
    }
    
    @PostMapping("/list")
    public Result<PageResult<${className}>> getList(@Valid @RequestBody ${className}QueryDTO queryDTO) {
        return ${variableName}Service.getList(queryDTO);
    }
${enumFields.length > 0 ? '\n' + enumOptionsCode : ''}
}`;
    
    // 创建目录并写入文件
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${fileName}`,
      content: controllerContent
    });
    
    return [{
      type: 'Controller',
      path: `${filePath}/${fileName}`,
      className: `${className}Controller`
    }];
  },

  // 生成DTO类
  async generateDTOs(table, className, basePackage, outputPath, author, api) {
    const packagePath = `${basePackage}.dto`;
    const filePath = `${outputPath}/${packagePath.replace(/\./g, '/')}`;
    
    const files = [];
    
    // 创建目录
    await api.callTool('filesystem', {
      method: 'create_directory',
      path: filePath
    });
    
    // 1. 生成CreateDTO
    const createFields = table.fields
      .filter(field => !field.primaryKey && field.name !== 'created_at')
      .map(field => {
        const fieldType = this.mapJavaType(field.type.name);
        const fieldName = this.toCamelCase(field.name);
        const comment = field.comment ? `    /**\n     * ${field.comment}\n     */` : '';
        
        return `${comment}
    private ${fieldType} ${fieldName};`;
      }).join('\n\n');
    
    const createDTOContent = `package ${packagePath};

import lombok.Data;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ${table.comment || className}创建请求DTO
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Data
public class ${className}CreateDTO {

${createFields}
}`;
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${className}CreateDTO.java`,
      content: createDTOContent
    });
    
    files.push({
      type: 'DTO',
      path: `${filePath}/${className}CreateDTO.java`,
      className: `${className}CreateDTO`
    });
    
    // 2. 生成UpdateDTO
    const updateFields = table.fields
      .filter(field => field.name !== 'created_at')
      .map(field => {
        const fieldType = this.mapJavaType(field.type.name);
        const fieldName = this.toCamelCase(field.name);
        const comment = field.comment ? `    /**\n     * ${field.comment}\n     */` : '';
        
        return `${comment}
    private ${fieldType} ${fieldName};`;
      }).join('\n\n');
    
    const updateDTOContent = `package ${packagePath};

import lombok.Data;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ${table.comment || className}更新请求DTO
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Data
public class ${className}UpdateDTO {

${updateFields}
}`;
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${className}UpdateDTO.java`,
      content: updateDTOContent
    });
    
    files.push({
      type: 'DTO',
      path: `${filePath}/${className}UpdateDTO.java`,
      className: `${className}UpdateDTO`
    });
    
    // 3. 生成QueryDTO
    const queryFields = table.fields
      .filter(field => !field.primaryKey && field.name !== 'created_at')
      .map(field => {
        const fieldType = this.mapJavaType(field.type.name);
        const fieldName = this.toCamelCase(field.name);
        const comment = field.comment ? `    /**\n     * ${field.comment}\n     */` : '';
        
        return `${comment}
    private ${fieldType} ${fieldName};`;
      }).join('\n\n');
    
    const queryDTOContent = `package ${packagePath};

import com.graduation.common.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ${table.comment || className}查询请求DTO
 * 
 * @author ${author}
 * @since ${new Date().toISOString().split('T')[0]}
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ${className}QueryDTO extends PageParam {

${queryFields}
}`;
    
    await api.callTool('filesystem', {
      method: 'write_file',
      path: `${filePath}/${className}QueryDTO.java`,
      content: queryDTOContent
    });
    
    files.push({
      type: 'DTO',
      path: `${filePath}/${className}QueryDTO.java`,
      className: `${className}QueryDTO`
    });
    
    return files;
  },

  // 工具方法：转换为驼峰命名
  toCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  },

  // 工具方法：转换为帕斯卡命名
  toPascalCase(str) {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  },

  // 工具方法：映射Java类型
  mapJavaType(sqlType) {
    const typeMapping = {
      'BIGINT': 'Long',
      'INT': 'Integer',
      'INTEGER': 'Integer',
      'TINYINT': 'Integer',
      'SMALLINT': 'Integer',
      'VARCHAR': 'String',
      'CHAR': 'String',
      'TEXT': 'String',
      'LONGTEXT': 'String',
      'DECIMAL': 'BigDecimal',
      'DOUBLE': 'Double',
      'FLOAT': 'Float',
      'TIMESTAMP': 'LocalDateTime',
      'DATETIME': 'LocalDateTime',
      'DATE': 'LocalDate',
      'TIME': 'LocalTime',
      'BOOLEAN': 'Boolean',
      'BIT': 'Boolean'
    };
    
    return typeMapping[sqlType.toUpperCase()] || 'String';
  }
};