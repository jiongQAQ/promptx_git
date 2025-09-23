/**
 * Java实体和CRUD控制器生成工具（文件写入版）
 *
 * 战略意义：
 * 1. 开发效率革命：将手动编写CRUD代码的时间从数小时缩减到分钟级别，直接生成到项目目录
 * 2. 代码规范统一：确保所有生成的代码遵循统一的架构模式和命名规范，自动创建标准目录结构
 * 3. 项目集成无缝：直接写入Spring Boot项目目录，无需手动复制粘贴，立即可用
 *
 * 设计理念：
 * 基于现代Spring Boot + MyBatis Plus架构，结合项目现有的Result封装和BaseService模式，
 * 实现从SQL建表语句到完整后端代码的一键生成并自动写入。特别针对毕设项目中常见的枚举字段
 * 和中文注释进行优化处理，生成即可运行的高质量代码。
 *
 * 生态定位：
 * 作为毕设开发工具链的核心组件，与现有的sql-table-parser配合，
 * 为Spring Boot项目提供完整的代码生成解决方案，大幅提升开发效率。
 *
 * @author 鲁班 (PromptX工具开发大师)
 * @version 4.0 - 集成文件系统版本，直接写入项目目录
 */

const tool = {
    name: "java-entity-crud-generator-with-filesystem",
    description: "Java实体和CRUD控制器代码生成工具（直接写入文件版），支持主键ID识别和枚举选项接口生成",

    getDependencies() {
        return {};
    },

    getMetadata() {
        return {
            id: 'java-entity-crud-generator-with-filesystem',
            name: 'Java Entity CRUD Generator with Filesystem',
            description: 'Java实体和CRUD控制器代码生成工具，直接写入项目目录',
            version: '4.0.0',
            author: '鲁班'
        };
    },

    getSchema() {
        return {
            parameters: {
                type: "object",
                properties: {
                    sql: {
                        type: "string",
                        description: "CREATE TABLE SQL语句，支持中文注释和枚举值",
                        minLength: 1
                    },
                    basePackage: {
                        type: "string",
                        description: "Java包名前缀",
                        default: "com.graduation"
                    },
                    outputPath: {
                        type: "string",
                        description: "输出路径，相对于当前工作目录",
                        default: "project/backend/src/main/java/com/graduation"
                    }
                },
                required: ["sql"]
            }
        };
    },

    async execute(params) {
        const { api } = this;
        const { sql, basePackage = "com.graduation", outputPath = "project/backend/src/main/java/com/graduation" } = params;

        try {
            api.logger.info('开始生成Java CRUD代码', { basePackage, outputPath });

            // 解析SQL语句
            const tables = this.parseSql(sql);

            if (tables.length === 0) {
                return {
                    success: false,
                    message: "未能解析到有效的表结构，请检查SQL语句格式"
                };
            }

            api.logger.info(`解析到 ${tables.length} 个表`, { tables: tables.map(t => t.tableName) });

            // 加载 filesystem 工具进行文件操作
            const filesystem = await api.importx('@tool://filesystem');

            // 创建目录结构
            await this.createDirectories(filesystem, outputPath);

            // 为每个表生成并写入代码文件
            const results = [];
            for (const table of tables) {
                api.logger.info(`开始生成表 ${table.tableName} 的代码`);
                
                const generatedFiles = await this.generateAndWriteFiles(filesystem, table, basePackage, outputPath);
                results.push({
                    tableName: table.tableName,
                    className: table.className,
                    generatedFiles
                });
                
                api.logger.info(`表 ${table.tableName} 代码生成完成`, { files: generatedFiles });
            }

            api.logger.info('所有代码生成完成');
            return {
                success: true,
                message: `成功生成${results.length}个表的代码并写入文件`,
                data: {
                    tables: results.length,
                    outputPath,
                    results
                }
            };

        } catch (error) {
            api.logger.error('代码生成失败', error);
            return {
                success: false,
                message: `代码生成失败: ${error.message}`,
                error: error.stack
            };
        }
    },

    /**
     * 创建所需的目录结构
     */
    async createDirectories(filesystem, basePath) {
        const directories = [
            `${basePath}/entity`,
            `${basePath}/mapper`,
            `${basePath}/service`,
            `${basePath}/service/impl`,
            `${basePath}/controller`,
            `${basePath}/dto`
        ];

        for (const dir of directories) {
            try {
                await filesystem.execute({
                    method: 'create_directory',
                    path: dir
                });
            } catch (error) {
                // 目录可能已存在，忽略错误
                if (!error.message.includes('exists')) {
                    throw error;
                }
            }
        }
    },

    /**
     * 生成并写入代码文件
     */
    async generateAndWriteFiles(filesystem, table, basePackage, outputPath) {
        const { className } = table;
        const generatedFiles = [];

        // 生成各种代码
        const entityCode = this.generateEntity(table, basePackage);
        const mapperCode = this.generateMapper(table, basePackage);
        const serviceCode = this.generateService(table, basePackage);
        const serviceImplCode = this.generateServiceImpl(table, basePackage);
        const controllerCode = this.generateController(table, basePackage);
        const dtoCode = this.generateQueryDTO(table, basePackage);

        // 定义文件路径和内容
        const files = [
            {
                path: `${outputPath}/entity/${className}.java`,
                content: entityCode,
                type: 'Entity'
            },
            {
                path: `${outputPath}/mapper/${className}Mapper.java`,
                content: mapperCode,
                type: 'Mapper'
            },
            {
                path: `${outputPath}/service/${className}Service.java`,
                content: serviceCode,
                type: 'Service'
            },
            {
                path: `${outputPath}/service/impl/${className}ServiceImpl.java`,
                content: serviceImplCode,
                type: 'ServiceImpl'
            },
            {
                path: `${outputPath}/controller/${className}Controller.java`,
                content: controllerCode,
                type: 'Controller'
            },
            {
                path: `${outputPath}/dto/${className}QueryDTO.java`,
                content: dtoCode,
                type: 'QueryDTO'
            }
        ];

        // 写入所有文件
        for (const file of files) {
            await filesystem.execute({
                method: 'write_file',
                path: file.path,
                content: file.content
            });
            generatedFiles.push(`${file.type}: ${file.path}`);
        }

        return generatedFiles;
    },

    /**
     * 解析SQL CREATE TABLE语句
     */
    parseSql(sql) {
        const tables = [];

        // 改进的表匹配正则，支持单个CREATE TABLE语句
        const tableMatches = sql.match(/CREATE\s+TABLE[\s\S]*?(?=(?:CREATE\s+TABLE)|$)/gi);

        if (!tableMatches) {
            console.log("未匹配到CREATE TABLE语句");
            return tables;
        }

        console.log(`找到 ${tableMatches.length} 个CREATE TABLE语句`);

        for (const tableMatch of tableMatches) {
            try {
                const table = this.parseTable(tableMatch);
                if (table) {
                    tables.push(table);
                }
            } catch (error) {
                console.log(`解析表时出错: ${error.message}`);
                continue;
            }
        }

        return tables;
    },

    /**
     * 解析单个表的SQL语句
     */
    parseTable(tableSql) {
        // 提取表名
        const tableNameMatch = tableSql.match(/CREATE\s+TABLE\s+[`]?(\w+)[`]?/i);
        if (!tableNameMatch) {
            throw new Error("无法提取表名");
        }

        const tableName = tableNameMatch[1];
        const className = this.toPascalCase(tableName);

        console.log(`解析表: ${tableName} -> ${className}`);

        // 提取字段定义
        const fieldsMatch = tableSql.match(/\(([\s\S]*)\)/);
        if (!fieldsMatch) {
            throw new Error(`表 ${tableName} 没有找到字段定义`);
        }

        const fieldsContent = fieldsMatch[1];
        const fields = [];

        // 分割字段，处理复杂的字段定义
        const fieldLines = fieldsContent.split(',').map(line => line.trim());

        for (const line of fieldLines) {
            if (line.toUpperCase().includes('PRIMARY KEY') ||
                line.toUpperCase().includes('INDEX') ||
                line.toUpperCase().includes('KEY') ||
                line.toUpperCase().includes('CONSTRAINT') ||
                line.length === 0) {
                continue;
            }

            const field = this.parseField(line);
            if (field) {
                fields.push(field);
            }
        }

        // 确保主键ID字段存在
        const hasIdField = fields.some(field => field.name === 'id');
        if (!hasIdField) {
            // 添加默认的ID字段到开头
            fields.unshift({
                name: 'id',
                javaName: 'id',
                type: 'BIGINT',
                javaType: 'Long',
                nullable: false,
                comment: '主键ID',
                isPrimaryKey: true,
                autoIncrement: true,
                enumValues: null
            });
        }

        return {
            tableName,
            className,
            fields
        };
    },

    /**
     * 解析单个字段
     */
    parseField(fieldLine) {
        try {
            // 基础字段信息正则
            const fieldMatch = fieldLine.match(/^\s*[`]?(\w+)[`]?\s+([^\s]+)(?:\s+(.*))?$/);
            if (!fieldMatch) {
                console.log(`无法解析字段行: ${fieldLine}`);
                return null;
            }

            const name = fieldMatch[1];
            const sqlType = fieldMatch[2].toUpperCase();
            const constraints = fieldMatch[3] || '';

            // 检查是否为主键
            const isPrimaryKey = constraints.toUpperCase().includes('PRIMARY KEY');
            const autoIncrement = constraints.toUpperCase().includes('AUTO_INCREMENT');

            // 解析注释
            const commentMatch = constraints.match(/COMMENT\s+['"](.*?)['"]/);
            const comment = commentMatch ? commentMatch[1] : '';

            // 解析枚举值
            const enumValues = this.parseEnumFromComment(comment);

            // 检查是否可为空
            const nullable = !constraints.toUpperCase().includes('NOT NULL') && !isPrimaryKey;

            const field = {
                name,
                javaName: this.toCamelCase(name),
                type: sqlType,
                javaType: this.getJavaType(sqlType),
                nullable,
                comment,
                isPrimaryKey,
                autoIncrement,
                enumValues
            };

            console.log(`解析字段: ${name} -> ${field.javaType} (${field.comment})`);
            return field;

        } catch (error) {
            console.log(`解析字段时出错: ${fieldLine}, 错误: ${error.message}`);
            return null;
        }
    },

    /**
     * 从注释中解析枚举值
     */
    parseEnumFromComment(comment) {
        if (!comment || !comment.includes('【枚举】')) {
            return null;
        }

        try {
            const enumMatch = comment.match(/【枚举】[：:]\s*(.+)/);
            if (!enumMatch) return null;

            const enumStr = enumMatch[1];
            const enumValues = [];

            // 解析枚举值：1-必修，2-选修，3-公选
            const pairs = enumStr.split(/[，,]/).map(s => s.trim());

            for (const pair of pairs) {
                const match = pair.match(/(\d+)-(.+)/);
                if (match) {
                    enumValues.push({
                        value: parseInt(match[1]),
                        label: match[2].trim()
                    });
                }
            }

            console.log(`解析枚举值:`, enumValues);
            return enumValues.length > 0 ? enumValues : null;

        } catch (error) {
            console.log(`解析枚举值时出错: ${error.message}`);
            return null;
        }
    },

    /**
     * SQL类型转Java类型
     */
    getJavaType(sqlType) {
        const type = sqlType.toUpperCase();

        if (type.includes('BIGINT')) return 'Long';
        if (type.includes('INT')) return 'Integer';
        if (type.includes('TINYINT')) return 'Integer';
        if (type.includes('SMALLINT')) return 'Integer';
        if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'BigDecimal';
        if (type.includes('FLOAT')) return 'Float';
        if (type.includes('DOUBLE')) return 'Double';
        if (type.includes('VARCHAR') || type.includes('CHAR') || type.includes('TEXT')) return 'String';
        if (type.includes('DATETIME') || type.includes('TIMESTAMP')) return 'LocalDateTime';
        if (type.includes('DATE')) return 'LocalDate';
        if (type.includes('TIME')) return 'LocalTime';
        if (type.includes('BOOLEAN') || type.includes('BIT')) return 'Boolean';

        return 'String'; // 默认类型
    },

    /**
     * 生成Java实体类代码
     */
    generateEntity(table, basePackage) {
        const { className, fields } = table;

        // 收集需要的imports
        const imports = new Set([
            'lombok.Data',
            'com.baomidou.mybatisplus.annotation.TableName',
            'com.baomidou.mybatisplus.annotation.TableId',
            'com.baomidou.mybatisplus.annotation.IdType',
            'com.baomidou.mybatisplus.annotation.TableField',
            'com.baomidou.mybatisplus.annotation.TableLogic'
        ]);

        // 根据字段类型添加imports
        fields.forEach(field => {
            if (field.javaType === 'LocalDateTime') {
                imports.add('java.time.LocalDateTime');
            } else if (field.javaType === 'LocalDate') {
                imports.add('java.time.LocalDate');
            } else if (field.javaType === 'LocalTime') {
                imports.add('java.time.LocalTime');
            } else if (field.javaType === 'BigDecimal') {
                imports.add('java.math.BigDecimal');
            }
        });

        // 生成字段代码
        const fieldCodes = fields.map(field => {
            let fieldCode = '';

            // 添加注释
            if (field.comment) {
                fieldCode += `    /**\n     * ${field.comment}\n     */\n`;
            }

            // 添加注解
            if (field.isPrimaryKey) {
                fieldCode += `    @TableId(type = IdType.AUTO)\n`;
            } else {
                fieldCode += `    @TableField("${field.name}")\n`;
            }

            if (field.name === 'is_deleted') {
                fieldCode += `    @TableLogic\n`;
            }

            // 字段定义
            fieldCode += `    private ${field.javaType} ${field.javaName};`;

            return fieldCode;
        }).join('\n\n');

        return `package ${basePackage}.entity;

${Array.from(imports).sort().map(imp => `import ${imp};`).join('\n')}

/**
 * ${table.tableName}表实体类
 *
 * @author 系统生成
 */
@Data
@TableName("${table.tableName}")
public class ${className} {

${fieldCodes}

}`;
    },

    /**
     * 生成Mapper接口代码
     */
    generateMapper(table, basePackage) {
        const { className } = table;

        return `package ${basePackage}.mapper;

import ${basePackage}.entity.${className};
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * ${className}Mapper
 *
 * @author 系统生成
 */
@Mapper
public interface ${className}Mapper extends BaseMapper<${className}> {

}`;
    },

    /**
     * 生成Service接口代码
     */
    generateService(table, basePackage) {
        const { className } = table;

        return `package ${basePackage}.service;

import ${basePackage}.entity.${className};
import ${basePackage}.dto.${className}QueryDTO;
import com.graduation.common.Result;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

/**
 * ${className}Service
 *
 * @author 系统生成
 */
public interface ${className}Service {

    Result<${className}> getById(Long id);

    Result<Void> save(${className} ${this.toCamelCase(className)});

    Result<Void> updateById(${className} ${this.toCamelCase(className)});

    Result<Void> deleteById(Long id);

    Result<Page<${className}>> page(${className}QueryDTO queryDTO);

}`;
    },

    /**
     * 生成ServiceImpl实现类代码
     */
    generateServiceImpl(table, basePackage) {
        const { className, fields } = table;
        const serviceName = this.toCamelCase(className) + 'Service';
        const mapperName = this.toCamelCase(className) + 'Mapper';

        // 生成查询条件代码
        const queryConditions = fields
            .filter(field => !field.isPrimaryKey)
            .map(field => {
                if (field.javaType === 'String') {
                    return `        if (queryDTO.get${this.toPascalCase(field.javaName)}() != null && !queryDTO.get${this.toPascalCase(field.javaName)}().trim().isEmpty()) {
            queryWrapper.like("${field.name}", queryDTO.get${this.toPascalCase(field.javaName)}());
        }`;
                } else {
                    return `        if (queryDTO.get${this.toPascalCase(field.javaName)}() != null) {
            queryWrapper.eq("${field.name}", queryDTO.get${this.toPascalCase(field.javaName)}());
        }`;
                }
            })
            .join('\n');

        return `package ${basePackage}.service.impl;

import ${basePackage}.entity.${className};
import ${basePackage}.dto.${className}QueryDTO;
import ${basePackage}.mapper.${className}Mapper;
import ${basePackage}.service.${className}Service;
import com.graduation.service.BaseService;
import com.graduation.common.Result;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * ${className}ServiceImpl
 *
 * @author 系统生成
 */
@Service
public class ${className}ServiceImpl extends BaseService<${className}, Long> implements ${className}Service {

    @Autowired
    private ${className}Mapper ${mapperName};

    @Override
    protected BaseMapper<${className}> getBaseMapper() {
        return ${mapperName};
    }

    @Override
    public Result<${className}> getById(Long id) {
        return checkEntityExists(id, "${className}");
    }

    @Override
    public Result<Void> save(${className} ${this.toCamelCase(className)}) {
        return super.save(${this.toCamelCase(className)});
    }

    @Override
    public Result<Void> updateById(${className} ${this.toCamelCase(className)}) {
        return super.update(${this.toCamelCase(className)}, ${this.toCamelCase(className)}.getId(), "${className}");
    }

    @Override
    public Result<Void> deleteById(Long id) {
        return super.deleteById(id, "${className}");
    }

    @Override
    public Result<Page<${className}>> page(${className}QueryDTO queryDTO) {
        QueryWrapper<${className}> queryWrapper = new QueryWrapper<>();
${queryConditions}
        return super.page(queryDTO.getCurrent(), queryDTO.getSize(), queryWrapper);
    }
}`;
    },

    /**
     * 生成Controller控制器代码
     */
    generateController(table, basePackage) {
        const { className, tableName, fields } = table;
        const serviceName = this.toCamelCase(className) + 'Service';

        // 生成枚举选项方法
        const enumMethods = fields
            .filter(field => field.enumValues && field.enumValues.length > 0)
            .map(field => {
                const methodName = `get${this.toPascalCase(field.javaName)}Options`;
                const optionsCode = field.enumValues.map(ev =>
                    `            new HashMap<String, Object>() {{
                put("value", ${ev.value});
                put("label", "${ev.label}");
            }}`
                ).join(',\n');

                return `    /**
     * 获取${field.comment}选项
     */
    @GetMapping("/${field.javaName}-options")
    public Result<List<Map<String, Object>>> ${methodName}() {
        List<Map<String, Object>> options = Arrays.asList(
${optionsCode}
        );
        return Result.success(options);
    }`;
            }).join('\n\n');

        const enumMethodsSection = enumMethods ? `\n\n${enumMethods}` : '';

        return `package ${basePackage}.controller;

import ${basePackage}.entity.${className};
import ${basePackage}.dto.${className}QueryDTO;
import ${basePackage}.service.${className}Service;
import com.graduation.common.Result;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * ${className}控制器
 *
 * @author 系统生成
 */
@Slf4j
@Tag(name = "${className}管理")
@RestController
@RequestMapping("/api/admin/${tableName}")
public class ${className}Controller {

    @Autowired
    private ${className}Service ${serviceName};

    /**
     * 根据ID查询${className}
     */
    @Operation(summary = "根据ID查询${className}")
    @GetMapping("/{id}")
    public Result<${className}> getById(@PathVariable Long id) {
        return ${serviceName}.getById(id);
    }

    /**
     * 新增${className}
     */
    @Operation(summary = "新增${className}")
    @PostMapping
    public Result<Void> save(@RequestBody ${className} ${this.toCamelCase(className)}) {
        return ${serviceName}.save(${this.toCamelCase(className)});
    }

    /**
     * 更新${className}
     */
    @Operation(summary = "更新${className}")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody ${className} ${this.toCamelCase(className)}) {
        return ${serviceName}.updateById(${this.toCamelCase(className)});
    }

    /**
     * 删除${className}
     */
    @Operation(summary = "删除${className}")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        return ${serviceName}.deleteById(id);
    }

    /**
     * 分页查询${className}
     */
    @Operation(summary = "分页查询${className}")
    @PostMapping("/list")
    public Result<Page<${className}>> list(@RequestBody ${className}QueryDTO queryDTO) {
        return ${serviceName}.page(queryDTO);
    }${enumMethodsSection}

}`;
    },

    /**
     * 生成QueryDTO代码
     */
    generateQueryDTO(table, basePackage) {
        const { className, fields } = table;

        // 收集需要的imports
        const imports = new Set(['lombok.Data']);

        // 根据字段类型添加imports
        fields.forEach(field => {
            if (field.javaType === 'LocalDateTime') {
                imports.add('java.time.LocalDateTime');
            } else if (field.javaType === 'LocalDate') {
                imports.add('java.time.LocalDate');
            } else if (field.javaType === 'LocalTime') {
                imports.add('java.time.LocalTime');
            } else if (field.javaType === 'BigDecimal') {
                imports.add('java.math.BigDecimal');
            }
        });

        // 生成字段代码（排除主键）
        const fieldCodes = fields
            .filter(field => !field.isPrimaryKey)
            .map(field => {
                let fieldCode = '';

                // 添加注释
                if (field.comment) {
                    fieldCode += `    /**\n     * ${field.comment}\n     */\n`;
                }

                // 字段定义
                fieldCode += `    private ${field.javaType} ${field.javaName};`;

                return fieldCode;
            }).join('\n\n');

        return `package ${basePackage}.dto;

${Array.from(imports).sort().map(imp => `import ${imp};`).join('\n')}

/**
 * ${className}查询DTO
 *
 * @author 系统生成
 */
@Data
public class ${className}QueryDTO {

    /**
     * 当前页码
     */
    private Long current = 1L;

    /**
     * 每页大小
     */
    private Long size = 10L;

${fieldCodes}

}`;
    },

    /**
     * 转换为驼峰命名
     */
    toCamelCase(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    },

    /**
     * 转换为帕斯卡命名（首字母大写的驼峰）
     */
    toPascalCase(str) {
        const camelCase = this.toCamelCase(str);
        return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }
};

module.exports = tool;