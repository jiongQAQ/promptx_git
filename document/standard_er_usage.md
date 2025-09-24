# 标准ER图生成工具使用说明

## 功能描述
生成标准的实体关系图（Entity-Relationship Diagram），包含：
- **实体**：矩形框
- **关系**：菱形框
- **基数标记**：1, n 标记在连线上
- **边到边连接**：所有连线从形状边缘连接

## 输入格式

创建JSON文件，包含以下结构：

```json
{
  "title": "系统名称ER图",
  "entities": [
    { "name": "实体1", "type": "entity" },
    { "name": "实体2", "type": "entity" }
  ],
  "relationships": [
    {
      "name": "关系名称",
      "entity1": "实体1",
      "entity2": "实体2",
      "cardinality1": "1",
      "cardinality2": "n"
    }
  ]
}
```

### 字段说明
- **title**: ER图标题
- **entities**: 实体数组，每个实体包含name（名称）
- **relationships**: 关系数组，包含：
  - **name**: 关系名称
  - **entity1**: 起始实体名称
  - **entity2**: 目标实体名称
  - **cardinality1**: 起始实体的基数（"1" 或 "n"）
  - **cardinality2**: 目标实体的基数（"1" 或 "n"）

## 使用方法

### 方法1：直接运行脚本
```bash
node standard_er_generator.js input.json output.png
```

### 方法2：在代码中调用
```javascript
const { generateStandardER } = require('./standard_er_generator.js');
generateStandardER('input.json', 'output.png');
```

## 示例

### 健身房管理系统ER图
```json
{
  "title": "健身房管理系统ER图",
  "entities": [
    { "name": "用户", "type": "entity" },
    { "name": "课程", "type": "entity" },
    { "name": "教练", "type": "entity" },
    { "name": "预约", "type": "entity" }
  ],
  "relationships": [
    {
      "name": "预约",
      "entity1": "用户",
      "entity2": "课程",
      "cardinality1": "n",
      "cardinality2": "n"
    },
    {
      "name": "教授",
      "entity1": "教练",
      "entity2": "课程",
      "cardinality1": "1",
      "cardinality2": "n"
    }
  ]
}
```

## 基数标记说明
- **1**: 一对关系（一个实体实例）
- **n**: 多对关系（多个实体实例）

常见的关系类型：
- **1:1** - 一对一关系
- **1:n** - 一对多关系
- **n:n** - 多对多关系

## 输出特点
- 图片尺寸：1400x1000像素
- 格式：PNG
- 布局：网格自动布局，关系菱形位于相关实体之间
- 字体：Arial，清晰易读
- 连线：边到边连接，避免中心点连接

## Claude Code使用建议

1. **快速创建**：根据系统需求快速定义实体和关系
2. **逐步完善**：先创建主要实体，再添加详细关系
3. **验证逻辑**：检查基数标记是否符合业务逻辑
4. **迭代优化**：根据生成结果调整实体位置关系

## 文件位置
- 生成工具：`/Users/jiongjiong/.promptx/document/standard_er_generator.js`
- 示例输入：`/Users/jiongjiong/.promptx/document/er_format_example.json`
- 使用说明：`/Users/jiongjiong/.promptx/document/standard_er_usage.md`