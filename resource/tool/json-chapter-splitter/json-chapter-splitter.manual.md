<manual>
<identity>
## 工具名称
@tool://json-chapter-splitter

## 简介
基于id字段拆分论文内容JSON，仅对有text模块的内容拆分，保持结构完整性的章节拆分工具
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决大型学术论文JSON文档难以管理、协作困难的问题，通过基于id的智能拆分，将复杂文档拆解为可独立编辑的章节文件，同时完整保留所有原始信息和结构。

## 价值主张
- 🎯 **解决什么痛点**：大型JSON文档难以协作编辑，版本控制冲突频繁，内容管理混乱
- 🚀 **带来什么价值**：模块化内容管理，支持并行编辑，精确版本控制，提升编辑效率
- 🌟 **独特优势**：智能识别有实际内容的条目，完整保留复杂嵌套结构，支持items数组完整性

## 应用边界
- ✅ **适用场景**：
  - 学术论文JSON文档的章节化管理
  - 包含text或items字段的结构化文档拆分
  - 需要保持原始数据完整性的文档处理
  - 团队协作的大型文档编辑项目
  - 版本控制系统的细粒度追踪需求
  
- ❌ **不适用场景**：
  - 纯标题结构（无实际内容）的文档
  - 需要按章节层级合并拆分的场景
  - 二进制文件或非JSON格式文档
  - 实时协作编辑的场景
</purpose>

<usage>
## 使用时机
- 当学术论文JSON文档变得庞大，难以管理时
- 需要多人协作编辑不同章节内容时
- 希望在版本控制中精确追踪章节级变更时
- 要将复杂文档模块化处理时

## 操作步骤
1. **准备阶段**：确认输入JSON文件为数组结构，包含id、title等字段
2. **执行阶段**：指定输入文件和输出目录的绝对路径，设置拆分条件
3. **验证阶段**：检查输出目录中生成的文件，确认内容完整性

## 最佳实践
- 🎯 **效率提升**：使用onlyWithContent=true仅拆分有实际内容的条目，减少文件数量
- ⚠️ **避免陷阱**：确保输入文件是有效的JSON数组格式，路径必须使用绝对路径
- 🔧 **故障排除**：如拆分失败，检查JSON格式、路径权限和文件编码

## 注意事项
- 输入文件必须是JSON数组格式，每个元素包含id字段
- 生成的文件名基于id字段，特殊字符会被替换为下划线
- 工具会完整保留原始条目的所有字段和结构
- items数组等复杂结构会被完整保留
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| inputFile | string | 输入JSON文件的绝对路径 | "/Users/pc/Documents/content-plan.json" |
| outputDir | string | 输出目录的绝对路径 | "/Users/pc/Documents/chapters" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| onlyWithContent | boolean | true | 仅拆分包含text或items字段的条目 |

## 参数约束
- **路径要求**：inputFile和outputDir必须使用绝对路径
- **文件格式**：输入文件必须是有效的JSON数组
- **权限要求**：需要对输入文件的读权限和输出目录的写权限

## 参数示例
```json
{
  "inputFile": "/Users/pc/Documents/promptx_tools/projects/canteen-rating/paper/content-plan.json",
  "outputDir": "/Users/pc/Documents/promptx_tools/projects/canteen-rating/paper/chapters",
  "onlyWithContent": true
}
```

## 输入数据格式示例
```json
[
  {
    "id": "2.2.3",
    "title": "系统用例图",
    "items": [
      {
        "title": "普通用户角色用例",
        "text": "普通用户可以浏览食堂信息、查看菜品详情...",
        "imagePath": "/path/to/image.png"
      }
    ]
  },
  {
    "id": "1.1.1",
    "title": "研究背景",
    "text": "随着高校规模的不断扩大..."
  }
]
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "message": "章节拆分完成",
  "totalItems": 54,
  "outputDirectory": "/Users/pc/Documents/chapters",
  "createdFiles": [
    {
      "id": "2.2.3",
      "title": "系统用例图",
      "file": "content.2.2.3.json",
      "fullPath": "/Users/pc/Documents/chapters/content.2.2.3.json",
      "hasText": false,
      "hasItems": true,
      "itemsCount": 3
    }
  ]
}
```

## 生成文件格式
每个拆分的文件包含以下结构：
```json
{
  "splitInfo": {
    "originalId": "2.2.3",
    "splitDate": "2025-09-26T06:45:10.884Z",
    "splitVersion": "2.0.0"
  },
  "content": {
    "id": "2.2.3",
    "title": "系统用例图",
    "items": [
      {
        "title": "普通用户角色用例",
        "text": "普通用户可以浏览食堂信息...",
        "imagePath": "/path/to/image.png"
      }
    ]
  }
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": "输入文件必须是绝对路径：./content.json",
  "suggestion": "请检查输入文件路径是否正确，确保JSON格式有效且为数组结构"
}
```

## 结果解读指南
- **判断拆分成功**：检查success字段是否为true
- **查看拆分统计**：totalItems显示成功拆分的条目数量
- **文件位置**：每个createdFiles条目包含完整的文件路径
- **内容类型识别**：hasText和hasItems字段帮助识别条目的内容类型
- **文件结构**：生成的文件包含splitInfo元信息和完整的原始content

## 后续动作建议
- 成功拆分后，可以独立编辑每个章节文件
- 使用版本控制系统追踪每个文件的变更历史
- 如需合并，可以根据splitInfo中的originalId重新组合
- 团队协作时，分配不同成员负责不同的章节文件
- 定期备份输出目录，防止编辑过程中的意外数据丢失
</outcome>
</manual>