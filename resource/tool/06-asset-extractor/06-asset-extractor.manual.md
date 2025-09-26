<manual>
<identity>
## 工具名称
@tool://06-asset-extractor

## 简介
从content-plan.json中提取带有imagePath和tablePath的块，并按路径分类保存到对应目录的JSON文件中
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决从content-plan.json中批量提取包含图片路径(imagePath)和表格路径(tablePath)的内容块，并将这些块按照资源类型分类存储为独立JSON文件的需求。

## 价值主张
- 🎯 **解决什么痛点**：手动查找和提取包含资源路径的内容块效率低下，容易遗漏
- 🚀 **带来什么价值**：自动化提取和分类存储，便于后续处理和管理资源相关内容
- 🌟 **独特优势**：智能路径解析，按原始路径结构自动分类到pngs和tables目录

## 应用边界
- ✅ **适用场景**：
  - 从论文内容计划中提取图表相关章节
  - 批量处理包含资源引用的JSON数据
  - 按资源类型组织内容结构
  - 为后续资源处理工具提供输入
  
- ❌ **不适用场景**：
  - 处理非JSON格式的内容文件
  - 提取不包含imagePath或tablePath字段的内容
  - 需要修改原始内容的场景
</purpose>

<usage>
## 使用时机
- 当content-plan.json中包含imagePath或tablePath字段的条目需要单独处理时
- 需要按资源类型重新组织内容结构时
- 为图表内容生成独立文件准备数据时
- 进行内容资源审核或批量处理前的数据准备

## 操作步骤
1. **准备阶段**：确保content-plan.json文件存在且格式正确
2. **执行阶段**：调用工具并指定输入文件路径和输出目录
3. **验证阶段**：检查输出目录中生成的JSON文件是否正确

## 最佳实践
- 🎯 **效率提升**：使用默认路径映射配置，减少参数设置
- ⚠️ **避免陷阱**：确保输入文件是有效的JSON数组格式
- 🔧 **故障排除**：检查文件路径权限，确认目录创建权限

## 注意事项
- 工具会自动创建不存在的输出目录
- 同名文件会被覆盖，请提前备份重要数据
- 提取的JSON文件包含原始条目的完整信息
- 工具按照路径中的目录结构(pngs/tables)自动分类
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| inputPath | string | content-plan.json文件的完整路径 | "/path/to/content-plan.json" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| outputBaseDir | string | "." | 输出文件的基础目录路径 |
| pathMapping | object | {"pngs": "pngs", "tables": "tables"} | 路径映射配置，指定不同资源类型的目标目录 |

## 参数约束
- **inputPath**：必须是有效的JSON文件路径，文件必须存在
- **outputBaseDir**：必须是有效的目录路径，工具会自动创建不存在的目录
- **pathMapping**：对象格式，键为资源类型，值为目标目录名

## 参数示例
```json
{
  "inputPath": "<projectRoot>/paper/content-plan.json",
  "outputBaseDir": "<projectRoot>/paper",
  "pathMapping": {
    "pngs": "pngs",
    "tables": "tables"
  }
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "message": "成功提取15个资源块",
  "data": {
    "imageBlocks": [
      {
        "id": "2.2.3.1",
        "title": "普通用户角色用例",
        "assetType": "image",
        "originalPath": "/path/to/usecase-user.png",
        "extractedTo": "pngs/usecase-user.json",
        "fileName": "usecase-user.json"
      }
    ],
    "tableBlocks": [
      {
        "id": "3.5",
        "title": "数据库详细设计",
        "assetType": "table",
        "originalPath": "/path/to/database-design.json",
        "extractedTo": "tables/database-design.json",
        "fileName": "database-design.json"
      }
    ],
    "totalProcessed": 15
  }
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": {
    "code": "EXTRACTION_ERROR",
    "message": "提取失败: 文件不存在或格式错误"
  }
}
```

## 结果解读指南
- **成功标识**：检查success字段是否为true
- **提取统计**：totalProcessed显示总共处理的资源块数量
- **文件位置**：extractedTo字段显示生成文件的完整路径
- **资源分类**：imageBlocks和tableBlocks分别包含图片和表格相关的内容块
- **错误处理**：失败时error.message提供具体错误信息

## 后续动作建议
- 成功后检查输出目录中的JSON文件内容
- 可以使用其他工具进一步处理提取的资源文件
- 建议验证提取的文件数量是否符合预期
- 如有错误，检查输入文件格式和路径权限
</outcome>
</manual>