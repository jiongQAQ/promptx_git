<manual>
<identity>
## 工具名称
@tool://luban-sql

## 简介
SQL DDL解析工具，从建表SQL生成ER图JSON和主外键摘要，支持MySQL/PostgreSQL方言
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决数据库设计文档化问题，从建表SQL脚本自动提取表结构、主外键关系，生成可视化的ER图数据和简洁的关系摘要。

## 价值主张
- 🎯 **解决什么痛点**：手工整理数据库表结构文档耗时费力，容易出错
- 🚀 **带来什么价值**：自动化SQL解析，生成标准化JSON格式，支持批量处理
- 🌟 **独特优势**：双模式输出（完整ER + 简洁摘要），支持glob模式批量处理

## 应用边界
- ✅ **适用场景**：
  - 数据库设计文档自动生成
  - 学术论文中的数据库ER图制作
  - 代码审查中的表结构分析
  - 数据库迁移项目的结构梳理
  - CI/CD流程中的文档自动更新
  
- ❌ **不适用场景**：
  - 复杂的存储过程和视图解析
  - 实时数据库结构监控
  - DML语句（INSERT/UPDATE/DELETE）处理
  - 跨数据库的复杂关联分析
</purpose>

<usage>
## 使用时机
- 开发阶段：数据库设计完成后，需要生成文档时
- 维护阶段：表结构变更后，更新相关文档时
- 审查阶段：需要快速理解数据库结构时
- 迁移项目：分析现有数据库结构时

## 操作步骤

### 1. 生成完整ER关系图数据
```bash
# 等效CLI命令
luban-sql er --in source/db/schema.sql --out paper/tmp/er.json
```

**工具调用参数**：
```json
{
  "command": "er",
  "input": "source/db/schema.sql",
  "output": "paper/tmp/er.json",
  "dialect": "mysql"
}
```

### 2. 生成主外键摘要
```bash
# 等效CLI命令
luban-sql pkfk --in source/db/schema.sql --out paper/tmp/pkfk.json
```

**工具调用参数**：
```json
{
  "command": "pkfk",
  "input": "source/db/schema.sql",
  "output": "paper/tmp/pkfk.json",
  "dialect": "mysql"
}
```

### 3. 批量处理多个SQL文件
```bash
# 等效CLI命令
luban-sql er --in "db/**/*.sql" --out exports/full-er.json
```

**工具调用参数**：
```json
{
  "command": "er",
  "input": "db/**/*.sql",
  "output": "exports/full-er.json",
  "dialect": "postgres"
}
```

### 4. 推荐的工作流程
1. **准备SQL文件**：确保包含完整的CREATE TABLE语句
2. **生成ER数据**：使用er命令获取完整的表结构和关系
3. **生成简洁摘要**：使用pkfk命令获取核心关系信息
4. **验证结果**：检查生成的JSON文件是否符合预期

## 最佳实践
- 🎯 **效率提升**：使用glob模式批量处理，避免逐个文件处理
- ⚠️ **避免陷阱**：确保输入SQL文件格式正确，包含完整的CREATE TABLE语句
- 🔧 **故障排除**：检查SQL语法、文件路径、输出目录权限

## 注意事项
- 只解析CREATE TABLE语句，忽略其他DDL/DML语句
- 支持基本的主外键定义，复杂约束可能解析不全
- 输出目录会自动创建（如果不存在）
- 解析失败的SQL语句会被跳过，不影响其他语句
- 生成的JSON文件会覆盖同名文件
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| command | string | 子命令：er或pkfk | "er" |
| input | string | 输入SQL文件路径或glob模式 | "schema.sql" |
| output | string | 输出JSON文件路径 | "output/er.json" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| dialect | string | "mysql" | SQL方言：mysql或postgres |

## 参数约束
- **command约束**：必须是"er"或"pkfk"
- **input约束**：支持单文件路径或glob模式
- **output约束**：必须以.json结尾
- **dialect约束**：只支持"mysql"和"postgres"
- **路径格式**：支持相对路径和绝对路径

## Glob模式示例
- `*.sql` - 当前目录所有SQL文件
- `db/**/*.sql` - db目录及子目录所有SQL文件
- `schema/tables_*.sql` - schema目录下tables_开头的SQL文件

## 参数示例

### 解析单个MySQL文件生成ER数据
```json
{
  "command": "er",
  "input": "database/schema.sql",
  "output": "docs/er-diagram.json",
  "dialect": "mysql"
}
```

### 解析PostgreSQL文件生成主外键摘要
```json
{
  "command": "pkfk",
  "input": "migrations/001_create_tables.sql",
  "output": "analysis/pk-fk-summary.json",
  "dialect": "postgres"
}
```

### 批量处理多个文件
```json
{
  "command": "er",
  "input": "sql/**/*.sql",
  "output": "exports/complete-er.json"
}
```

### 使用默认方言（MySQL）
```json
{
  "command": "pkfk",
  "input": "app/models/*.sql",
  "output": "tmp/relationships.json"
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "exitCode": 0,
  "status": "success",
  "output": "path/to/output.json",
  "tablesFound": 5,
  "relationsFound": 8,
  "mode": "er"
}
```

## ER模式输出格式
```json
{
  "entities": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "bigint(20)",
          "pk": true,
          "autoIncrement": true
        },
        {
          "name": "email",
          "type": "varchar(255)",
          "nullable": false
        },
        {
          "name": "created_at",
          "type": "timestamp"
        }
      ]
    },
    {
      "name": "orders",
      "columns": [
        {
          "name": "id",
          "type": "bigint(20)",
          "pk": true
        },
        {
          "name": "user_id",
          "type": "bigint(20)"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "orders.user_id",
      "to": "users.id",
      "type": "FK"
    }
  ]
}
```

## PKFK模式输出格式
```json
{
  "entities": ["users", "orders", "products"],
  "primaryKeys": {
    "users": "id",
    "orders": "id",
    "products": "id"
  },
  "foreignKeys": [
    {
      "table": "orders",
      "column": "user_id",
      "refTable": "users",
      "refColumn": "id"
    },
    {
      "table": "order_items",
      "column": "order_id", 
      "refTable": "orders",
      "refColumn": "id"
    }
  ]
}
```

## 错误返回格式
```json
{
  "success": false,
  "exitCode": 2,
  "error": {
    "code": "PARSE_ERROR",
    "message": "未找到有效的CREATE TABLE语句"
  }
}
```

## 退出码说明
| 退出码 | 含义 | 描述 |
|--------|------|------|
| 0 | 成功 | 解析成功，文件生成完成 |
| 2 | 解析错误 | SQL解析失败或未找到有效表 |
| 3 | 系统错误 | 文件错误、参数错误等 |

## 错误代码分类
- **VALIDATION_ERROR**：参数验证失败
- **FILE_NOT_FOUND**：输入文件不存在
- **READ_ERROR**：文件读取失败
- **PARSE_ERROR**：SQL解析失败
- **SYSTEM_ERROR**：系统级错误

## 结果解读指南
- **判断成功**：检查success字段和exitCode为0
- **获取统计信息**：tablesFound和relationsFound显示解析结果
- **检查输出文件**：output字段显示生成文件路径
- **区分模式**：mode字段显示使用的命令模式

## 后续动作建议
### 成功生成后
- **ER模式**：使用生成的JSON数据创建可视化ER图
- **PKFK模式**：整理主外键关系到文档或图表中
- **数据验证**：对比生成结果与实际数据库结构
- **文档更新**：将JSON数据集成到项目文档中

### 失败时的处理
- **解析错误**：检查SQL语法，确认CREATE TABLE语句完整
- **文件错误**：确认文件路径正确，检查读写权限
- **方言错误**：尝试切换到合适的SQL方言
- **部分成功**：即使有些语句解析失败，也会输出成功解析的部分
</outcome>
</manual>