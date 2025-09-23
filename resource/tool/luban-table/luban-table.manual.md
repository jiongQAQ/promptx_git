<manual>
<identity>
## 工具名称
@tool://luban-table

## 简介
专业的三线表生成与校验工具，支持从JSON数据生成、SQL DDL解析生成以及格式校验功能
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决学术论文和技术文档中三线表格式化、生成和校验的问题，提供从数据到标准表格的完整转换链路。

## 价值主张
- 🎯 **解决什么痛点**：手动制作三线表格式复杂、容易出错、从DDL转换困难
- 🚀 **带来什么价值**：自动化生成标准格式三线表，提升文档制作效率
- 🌟 **独特优势**：支持多种输入源（JSON数据、SQL DDL）、严格的格式校验

## 应用边界
- ✅ **适用场景**：
  - 学术论文表格制作
  - 技术文档数据表生成
  - 数据库设计文档制作
  - 表格格式标准化校验
  - 从SQL DDL自动生成表结构说明
  
- ❌ **不适用场景**：
  - 复杂数据分析和计算
  - 图表可视化生成
  - 非结构化数据处理
  - 实时数据流处理
</purpose>

<usage>
## 使用时机
- 需要制作标准化的三线表格时
- 从数据库DDL生成表结构文档时
- 校验现有表格数据格式时
- 批量生成多个表格文件时

## 操作步骤

### 1. gen模式 - 从JSON数据生成三线表
1. **准备阶段**：准备包含schema和rows的JSON数据
2. **执行阶段**：调用工具指定action为'gen'
3. **验证阶段**：检查生成的JSON文件格式

### 2. from-sql模式 - 从SQL DDL生成表结构
1. **准备阶段**：准备包含CREATE TABLE语句的SQL文件
2. **执行阶段**：调用工具指定action为'from-sql'
3. **验证阶段**：检查解析结果和字段映射

### 3. validate模式 - 校验三线表格式
1. **准备阶段**：准备需要校验的JSON文件
2. **执行阶段**：调用工具指定action为'validate'
3. **验证阶段**：根据校验结果修正格式问题

## 最佳实践
- 🎯 **效率提升**：使用from-sql模式快速从数据库设计生成表格
- ⚠️ **避免陷阱**：确保SQL文件包含完整的CREATE TABLE语句和字段注释
- 🔧 **故障排除**：validate模式可以帮助定位格式问题的具体位置

## 注意事项
- 输入的JSON数据必须包含schema和rows两个字段
- SQL DDL解析仅支持标准的CREATE TABLE语法
- 生成的文件会覆盖已存在的同名文件
- 文件路径支持相对路径和绝对路径
- 退出码0表示成功，2表示格式错误，3表示系统错误
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| action | string | 操作模式：'gen'\|'from-sql'\|'validate' | "gen" |

## action='gen' 专用参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| data | object | 表数据对象 | {"schema":["字段","类型","说明"],"rows":[["id","BIGINT","主键"]]} |
| outputPath | string | 输出JSON文件路径 | "paper/tmp/tab-6-3-1.json" |

## action='from-sql' 专用参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| inputPath | string | SQL文件路径 | "source/db/users.sql" |
| outputPath | string | 输出JSON文件路径 | "paper/tmp/tab-3-4-1.json" |

## action='validate' 专用参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| inputPath | string | 要校验的JSON文件路径 | "paper/tmp/tab-6-3-1.json" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| format | string | "json" | 输出格式：'json'\|'console' |

## 参数约束
- **action参数**：必须是 'gen'、'from-sql' 或 'validate' 之一
- **data对象**：必须包含schema（字符串数组）和rows（二维字符串数组）
- **文件路径**：支持相对路径和绝对路径，自动创建目录
- **SQL文件**：必须包含有效的CREATE TABLE语句

## 参数示例

### gen模式示例
```json
{
  "action": "gen",
  "data": {
    "schema": ["用例ID", "测试结果", "执行时间"],
    "rows": [
      ["TC-001", "通过", "2023-12-01"],
      ["TC-002", "失败", "2023-12-01"]
    ]
  },
  "outputPath": "paper/tmp/test-results.json"
}
```

### from-sql模式示例
```json
{
  "action": "from-sql",
  "inputPath": "source/db/users.sql",
  "outputPath": "paper/tmp/user-table.json"
}
```

### validate模式示例
```json
{
  "action": "validate",
  "inputPath": "paper/tmp/tab-6-3-1.json",
  "format": "console"
}
```
</parameter>

<outcome>
## 成功返回格式

### gen模式成功返回
```json
{
  "success": true,
  "action": "gen",
  "data": {
    "outputPath": "paper/tmp/tab-6-3-1.json",
    "rowCount": 3,
    "schemaFields": ["用例ID", "结果"],
    "fileSize": 256
  },
  "exitCode": 0,
  "message": "三线表JSON文件生成成功"
}
```

### from-sql模式成功返回
```json
{
  "success": true,
  "action": "from-sql",
  "data": {
    "inputPath": "source/db/users.sql",
    "outputPath": "paper/tmp/tab-3-4-1.json",
    "tableName": "users",
    "fieldCount": 5,
    "extractedFields": [
      {"name": "id", "type": "BIGINT", "comment": "主键"},
      {"name": "name", "type": "VARCHAR", "comment": "用户名"}
    ]
  },
  "exitCode": 0,
  "message": "从SQL DDL成功生成三线表"
}
```

### validate模式成功返回
```json
{
  "success": true,
  "action": "validate",
  "data": {
    "inputPath": "paper/tmp/tab-6-3-1.json",
    "isValid": true,
    "schemaValid": true,
    "rowsValid": true,
    "rowCount": 3,
    "schemaFields": ["字段名", "类型", "说明"]
  },
  "exitCode": 0,
  "message": "三线表格式校验通过"
}
```

## 错误处理格式

### 格式错误（退出码2）
```json
{
  "success": false,
  "action": "validate",
  "error": {
    "code": "FORMAT_ERROR",
    "message": "三线表格式不符合规范",
    "details": {
      "missingFields": ["schema"],
      "invalidRows": [1, 3],
      "expectedSchema": ["字段名", "类型", "说明"]
    }
  },
  "exitCode": 2
}
```

### 解析错误（退出码2）
```json
{
  "success": false,
  "action": "from-sql",
  "error": {
    "code": "PARSE_ERROR",
    "message": "SQL DDL解析失败",
    "details": {
      "line": 5,
      "position": 23,
      "expectedToken": "CREATE TABLE",
      "actualToken": "CREAT TABL"
    }
  },
  "exitCode": 2
}
```

### 系统错误（退出码3）
```json
{
  "success": false,
  "action": "gen",
  "error": {
    "code": "SYSTEM_ERROR",
    "message": "文件写入失败",
    "details": {
      "path": "paper/tmp/tab-6-3-1.json",
      "reason": "权限不足",
      "systemError": "EACCES: permission denied"
    }
  },
  "exitCode": 3
}
```

## 结果解读指南
- **判断执行成功**：检查success字段和exitCode（0为成功）
- **获取核心数据**：data字段包含操作结果的详细信息
- **错误诊断**：error.code指示错误类型，details提供具体错误信息
- **文件路径确认**：返回结果包含实际的输入输出文件路径

## 三线表标准格式
```json
{
  "schema": ["字段名", "类型", "说明"],
  "rows": [
    ["id", "BIGINT", "主键标识符"],
    ["name", "VARCHAR(100)", "用户姓名"],
    ["email", "VARCHAR(255)", "电子邮箱地址"]
  ]
}
```

## 后续动作建议
- **gen模式成功后**：可使用validate模式验证生成的文件格式
- **from-sql模式成功后**：检查字段映射是否正确，必要时手动调整
- **validate模式失败后**：根据错误详情修正JSON格式问题
- **批量处理**：可以编写脚本循环调用处理多个文件
- **文档集成**：生成的JSON可以进一步转换为LaTeX表格或Markdown表格
</outcome>
</manual>