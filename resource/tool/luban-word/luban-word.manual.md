<manual>
<identity>
## 工具名称
@tool://luban-word

## 简介
专业论文Word文档生成器，基于JSON数据和大纲结构生成标准DOCX格式论文文档
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决从结构化JSON数据批量生成专业格式Word论文文档的问题，支持复杂的章节结构、图表插入和样式配置。

## 价值主张
- 🎯 **解决什么痛点**：手动创建Word论文文档费时费力，格式不统一
- 🚀 **带来什么价值**：自动化生成标准格式论文，支持批量处理，样式一致性保证
- 🌟 **独特优势**：专业论文模板，支持图表、参考文献、多级标题等学术文档要素

## 应用边界
- ✅ **适用场景**：
  - 学术论文文档生成
  - 研究报告自动化输出
  - 技术文档批量生成
  - 结构化内容转Word文档
  
- ❌ **不适用场景**：
  - 复杂图像处理需求
  - 实时协作编辑
  - 非结构化内容处理
  - 超大文档（>1000页）
</purpose>

<usage>
## 使用时机
- 拥有完整的content.json和outline.json数据文件时
- 需要生成标准格式的学术论文或研究报告时
- 批量文档生成项目中需要保持格式一致性时
- 从其他系统导出数据需要转换为Word格式时

## 操作步骤
1. **准备阶段**：
   - 确保content.json包含完整的正文和图表数据
   - 验证outline.json包含正确的章节结构
   - 确定输出路径和文件名
   
2. **执行阶段**：
   - 指定content和outline文件路径
   - 设置输出DOCX文件路径
   - 可选择样式方案（默认为default）
   
3. **验证阶段**：
   - 检查生成的DOCX文件是否存在
   - 验证文档内容和格式是否正确
   - 确认所有章节和图表都已正确插入

## 最佳实践
- 🎯 **效率提升**：
  - 使用标准化的JSON数据格式
  - 预先验证输入文件的完整性
  - 设置清晰的文件命名规范
  
- ⚠️ **避免陷阱**：
  - 确保JSON文件格式正确且完整
  - 避免输出路径权限问题
  - 注意大文件生成的内存占用
  
- 🔧 **故障排除**：
  - 检查JSON文件语法是否正确
  - 验证输出目录是否存在且可写
  - 查看详细错误信息确定具体问题

## 注意事项
- 输入文件必须是有效的JSON格式
- 输出路径必须具有写入权限
- 大型文档生成可能需要较长时间
- 图表数据格式必须符合docx库要求
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| content | string | content.json文件路径 | "projects/demo/paper/content.json" |
| outline | string | outline.json文件路径 | "projects/demo/paper/outline.json" |
| out | string | 输出DOCX文件路径 | "projects/demo/paper/exports/docx/paper.docx" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| style | string | "default" | 样式方案（default/academic/simple） |

## 参数约束
- **路径格式**：所有路径必须是有效的文件系统路径
- **文件存在性**：content和outline文件必须存在且可读
- **输出目录**：输出文件的目录必须存在或能够创建
- **文件扩展名**：输出文件必须以.docx结尾

## 参数示例
```json
{
  "content": "projects/demo/paper/content.json",
  "outline": "projects/demo/paper/outline.json",
  "out": "projects/demo/paper/exports/docx/paper.docx",
  "style": "academic"
}
```

## JSON数据格式要求

### content.json结构
```json
{
  "title": "论文标题",
  "author": "作者姓名",
  "sections": [
    {
      "id": "section1",
      "title": "章节标题",
      "content": "章节正文内容",
      "level": 1,
      "figures": [
        {
          "id": "fig1",
          "caption": "图表说明",
          "data": "图表数据或路径"
        }
      ]
    }
  ]
}
```

### outline.json结构
```json
{
  "structure": [
    {
      "id": "section1",
      "title": "章节标题",
      "level": 1,
      "children": [
        {
          "id": "section1.1",
          "title": "子章节标题",
          "level": 2
        }
      ]
    }
  ]
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "data": {
    "status": "success",
    "out": "projects/demo/paper/exports/docx/paper.docx",
    "fileSize": 245760,
    "pagesGenerated": 15,
    "sectionsProcessed": 8,
    "figuresInserted": 3,
    "processingTime": 2.5
  }
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR|FILE_NOT_FOUND|GENERATION_FAILED",
    "message": "具体错误描述",
    "details": {
      "file": "出错的文件路径",
      "line": "错误行号（如适用）"
    }
  },
  "exitCode": 2
}
```

## 退出码说明
- **0**: 执行成功
- **2**: 输入参数不合法（文件不存在、路径无效、JSON格式错误）
- **3**: 文档生成失败（Word生成过程出错、输出路径无权限）

## 结果解读指南
- **判断执行成功**：检查success字段和exitCode
- **获取输出文件**：成功时data.out包含完整的输出文件路径
- **性能评估**：查看processingTime和fileSize评估生成效率
- **内容验证**：通过sectionsProcessed和figuresInserted确认内容完整性

## 后续动作建议
- **成功时**：
  - 打开生成的DOCX文件验证格式和内容
  - 根据需要进行手动微调
  - 可以基于生成的文档进行进一步编辑
  
- **失败时**：
  - 根据error.code确定问题类型
  - 检查输入文件的JSON格式和完整性
  - 验证输出路径的权限和可用性
  - 查看详细错误信息进行针对性修复
</outcome>
</manual>