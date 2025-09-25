<manual>
<identity>
## 工具名称
@tool://thesis-to-docx

## 简介
将论文章节JSON文件转换为格式化的DOCX文档，支持完整的学术论文排版，包括标题层级、正文、图片和三线表格式化
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决毕业论文写作中格式化排版的复杂问题，将分散的章节JSON文件自动转换为符合学术规范的完整DOCX文档，包含目录、标题层级、正文内容、图片插入和三线表格式化。

## 价值主张
- 🎯 **解决什么痛点**：手动论文排版耗时费力、格式不统一、图表插入复杂
- 🚀 **带来什么价值**：自动化论文排版、统一格式规范、一键生成完整论文
- 🌟 **独特优势**：支持层级嵌套、智能图表处理、符合学术标准

## 应用边界
- ✅ **适用场景**：
  - 毕业论文、学术论文的完整文档生成
  - 包含多层级标题结构的文档
  - 需要插入大量图片和表格的文档
  - 需要符合学术规范格式的文档
  
- ❌ **不适用场景**：
  - 简单的单页文档生成
  - 不包含结构化内容的文档
  - 需要复杂自定义样式的文档
  - 非学术类的商业报告
</purpose>

<usage>
## 使用时机
- 完成了所有论文章节内容的编写（存在多个 content.ch*.run.json 文件）
- 需要生成完整的论文DOCX文档进行打印或提交
- 需要统一论文格式和样式时
- 论文内容包含大量图片和表格需要正确插入时

## 操作步骤
1. **准备阶段**：确保项目中存在完整的章节文件和相关图片表格文件
2. **执行阶段**：配置源目录、输出路径、论文标题和作者信息
3. **验证阶段**：检查生成的DOCX文件内容和格式

## 最佳实践
- 🎯 **效率提升**：确保所有图片和表格文件路径正确，避免处理错误
- ⚠️ **避免陷阱**：检查章节文件命名规范，确保按顺序处理
- 🔧 **故障排除**：查看控制台输出了解处理进度和错误信息

## 注意事项
- 工具会在项目目录内创建输出文件
- 图片和表格文件路径必须真实存在（使用绝对路径查找）
- 章节文件必须符合标准JSON格式
- 生成的DOCX文件可能较大，处理时间取决于内容复杂度
- 样式配置文件位于项目的 `templates/docx-styles.json`

## 样式配置系统
工具支持通过docx_type字段自定义样式：

### 可用的样式类型
- `title` - 论文标题
- `author` - 作者信息
- `chapter_title` - 章标题
- `section_title` - 节标题
- `subsection_title` - 小节标题
- `body_text` - 正文内容
- `figure_caption` - 图片标签
- `table_caption` - 表格标签
- `error_text` - 错误提示文本

### 在章节文件中使用样式
```json
{
  "title": "第一章 系统概述",
  "docx_type": "chapter_title",
  "text": "本章介绍系统的整体架构...",
  "docx_type_text": "body_text",
  "figures": [{
    "label": "图 1-1 系统架构图",
    "docx_type": "figure_caption"
  }]
}
```
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| sourceDir | string | 章节JSON文件所在目录 | "paper/splits" |
| outputPath | string | 输出DOCX文件路径 | "paper/thesis.docx" |
| thesisTitle | string | 论文标题 | "基于Spring Boot的校园食堂评价系统设计与实现" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| author | string | "" | 论文作者姓名 |
| includeTableOfContents | boolean | true | 是否包含目录页 |
| styleTemplate | string | "academic" | 样式模板名称 |

## 参数约束
- **路径格式**：sourceDir 和 outputPath 必须是有效的文件系统路径
- **文件存在性**：sourceDir 必须包含至少一个 content.ch*.run.json 文件
- **标题长度**：thesisTitle 建议不超过50个字符以确保良好的显示效果

## 参数示例
```json
{
  "sourceDir": "paper/splits",
  "outputPath": "paper/my-thesis.docx",
  "thesisTitle": "基于Spring Boot的校园食堂评价系统设计与实现",
  "author": "张三",
  "includeTableOfContents": true,
  "styleTemplate": "academic"
}
```

## 高级配置示例
```json
{
  "sourceDir": "/Users/username/Documents/thesis/chapters",
  "outputPath": "/Users/username/Documents/thesis/final-thesis.docx",
  "thesisTitle": "人工智能在教育领域的应用研究",
  "author": "李四",
  "includeTableOfContents": false,
  "styleTemplate": "academic"
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "data": {
    "outputFile": "paper/thesis.docx",
    "statistics": {
      "chaptersProcessed": 7,
      "processingTime": "3.2s",
      "fileSize": "2.5 MB"
    }
  }
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "未找到章节文件，请检查目录: paper/splits",
    "stack": "详细错误堆栈信息"
  }
}
```

## 生成的文档特性

### 文档结构
1. **论文标题页** - 居中显示的论文标题和作者信息
2. **目录页** - 自动生成的多级目录（可选）
3. **正文内容** - 按章节顺序排列的完整内容
4. **图片插入** - 自动插入并居中对齐的图片
5. **三线表格** - 符合学术规范的表格格式

### 格式规范
- **页面设置**: 上下边距2.54cm，左右边距3.18cm
- **论文标题**: 黑体二号字，居中
- **章标题**: 黑体三号字，居中  
- **节标题**: 黑体四号字，左对齐
- **正文**: 宋体小四号字，首行缩进2字符，1.5倍行距
- **图表标签**: 宋体五号字，居中

### 处理能力
- **章节层级**: 支持无限层级嵌套（如 1, 1.1, 1.1.1, 1.1.1.1）
- **图片格式**: PNG, JPG, SVG等常见格式
- **表格类型**: JSON格式的三线表数据
- **文档大小**: 支持大型论文（100+页）

## 结果解读指南
- **检查处理统计**: 确认所有章节都被正确处理
- **验证文件大小**: 正常论文文件大小在1-10MB之间
- **打开文档检查**: 使用Word或WPS打开生成的文档验证格式
- **检查图表显示**: 确保所有图片和表格都正确显示

## 后续动作建议
- 成功后可在Word中进行最终的格式微调
- 如有警告信息，建议修复相关问题后重新生成
- 生成的文档可直接用于打印、提交或进一步编辑
- 建议保留JSON源文件以便后续修改和重新生成

## 常见问题解决

### 图片无法显示
- 检查图片文件路径是否正确
- 确认图片文件确实存在
- 验证图片格式是否支持

### 表格格式异常
- 检查表格JSON文件格式是否正确
- 确认表格数据结构完整
- 验证表格文件路径

### 章节顺序错误
- 检查章节文件命名是否符合 content.chN.run.json 格式
- 确认章节编号连续性
- 验证文件名中的数字部分

### 生成文档过大
- 检查是否有超大图片文件
- 考虑压缩图片以减少文件大小
- 分章节生成以避免内存问题
</outcome>
</manual>