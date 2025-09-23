<manual>
<identity>
## 工具名称
@tool://json-docx-generator

## 简介
JSON配置驱动的DOCX文档生成工具，通过结构化JSON配置实现文档的程序化生成，支持样式引用和层级结构，让AI能够智能地创造专业文档
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决传统文档生成工具的格式固化和操作复杂性问题，通过JSON配置实现文档的数据驱动生成，让AI能够程序化地控制文档的结构、内容和样式，实现真正的文档自动化生成。

## 价值主张
- 🎯 **解决什么痛点**：文档格式设置复杂、样式不一致、手动操作效率低下
- 🚀 **带来什么价值**：实现文档生成的可编程化和自动化，提升生产效率
- 🌟 **独特优势**：样式引用系统、层级结构管理、JSON配置的数据驱动方式

## 应用边界
- ✅ **适用场景**：
  - AI驱动的文档自动化生成系统
  - 需要程序化控制文档格式的场景
  - 学术论文、技术报告、商业提案等结构化文档的批量生成
  - 文档模板化和标准化生产流程
  - 数据驱动的报告生成系统
  - 多语言文档的统一格式输出
  
- ❌ **不适用场景**：
  - 简单的一次性文档创建（直接使用Word更方便）
  - 复杂的图文排版和设计导向的文档
  - 需要复杂图表、公式编辑的专业文档
  - 需要复杂对象模型（OLE对象、测量图等）的文档
  - 非结构化的创意性内容创作
</purpose>

<usage>
## 使用时机
- 📊 **数据驱动文档**：有结构化数据需要转换为文档时
- 🔄 **批量生成需求**：需要生成大量类似结构的文档时
- 🎨 **样式标准化**：需要保证文档格式一致性时
- 🤖 **AI生成文档**：AI系统需要自动生成专业文档时
- 📦 **模板化生产**：建立文档生产的可复用模板系统时

## 操作步骤
1. **JSON配置设计阶段**：
   - 设计文档的整体结构和层级关系
   - 定义所需的样式集合（字体、大小、对齐、间距等）
   - 规划内容章节和元素类型（标题、段落、图片、引用等）

2. **样式定义阶段**：
   - 在JSON的styles对象中定义各种样式
   - 设置字体、字号、颜色、对齐方式等
   - 配置段落间距、行间距等排版参数

3. **内容结构阶段**：
   - 在sections数组中定义文档内容
   - 为每个元素指定类型（heading/paragraph/figure/reference）
   - 通过styleRef引用预定义的样式
   - 使用children实现层级结构

4. **文档生成阶段**：
   - 调用工具传入完整的JSON配置
   - 指定输出路径和文件名
   - 系统自动解析配置并生成DOCX文件

## 最佳实践
- 🎯 **样式复用**：先定义频繁使用的样式，通过styleRef引用避免重复
- ⚠️ **结构清晰**：使用合理的层级结构，避免过深的嵌套
- 🔧 **配置验证**：先用简单配置测试，再逐步扩展复杂功能
- 📊 **参数优化**：合理设置字号和间距，注意docx库的单位转换
- 🔄 **模板化**：创建可复用的JSON模板，提高后续开发效率

## 注意事项
- **JSON格式验证**：确保配置符合正确JSON语法，特别注意引号和逗号
- **必需字段**：必须包含sections数组，每个元素必须有type和content字段
- **输出权限**：确保对指定输出目录有写入权限
- **字体支持**：使用系统安装的字体，避免使用不存在的字体名
- **性能考虑**：过大的文档配置可能影响生成速度，建议分段处理
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| documentConfig | object | JSON文档配置对象，包含样式定义和内容结构 | {见下方详细示例} |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|----------|
| outputPath | string | Downloads目录 | 输出目录路径 |
| filename | string | "document" | 文件名（不含扩展名） |

## documentConfig 结构说明
### 顶层结构
| 字段名 | 类型 | 必需 | 描述 |
|---------|------|------|------|
| title | string | 否 | 文档标题 |
| styles | object | 否 | 样式定义对象 |
| sections | array | 是 | 文档内容章节数组 |

### styles 对象结构
键为样式名，值为样式配置对象：
| 属性名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| font | string | 字体名称 | "Microsoft YaHei" |
| size | number | 字号（磅） | 14 |
| bold | boolean | 是否加粗 | true |
| italic | boolean | 是否斜体 | false |
| alignment | string | 对齐方式 | "center" |
| spacing | object | 间距设置 | {见下方} |

### spacing 对象结构
| 属性名 | 类型 | 描述 | 单位 |
|--------|------|------|------|
| before | number | 段前间距 | 磅 |
| after | number | 段后间距 | 磅 |
| line | number | 行间距倍数 | 倍数 |

### sections 数组元素结构
| 属性名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| type | string | 是 | 内容类型: heading/paragraph/figure/reference |
| content | string | 是 | 内容文本 |
| styleRef | string | 否 | 引用的样式名 |
| children | array | 否 | 子级内容数组 |

## 参数约束
- **JSON格式**：documentConfig必须是有效的JSON对象
- **必需字段**：sections字段不能为空，每个元素必须有type和content
- **类型限制**：type只能是: heading, paragraph, figure, reference
- **样式引用**：styleRef必须在styles对象中存在
- **路径限制**：outputPath必须是有效的目录路径

## 参数示例
### 基础文档示例
```json
{
  "documentConfig": {
    "title": "技术报告",
    "styles": {
      "title": {
        "font": "Microsoft YaHei",
        "size": 18,
        "bold": true,
        "alignment": "center",
        "spacing": {
          "before": 12,
          "after": 12
        }
      },
      "heading1": {
        "font": "Microsoft YaHei",
        "size": 16,
        "bold": true,
        "spacing": {
          "before": 12,
          "after": 6
        }
      },
      "normal": {
        "font": "Times New Roman",
        "size": 12,
        "spacing": {
          "line": 1.5
        }
      }
    },
    "sections": [
      {
        "type": "heading",
        "content": "AI技术应用报告",
        "styleRef": "title"
      },
      {
        "type": "heading",
        "content": "1. 概述",
        "styleRef": "heading1"
      },
      {
        "type": "paragraph",
        "content": "本报告介绍了AI技术在本项目中的应用情况...",
        "styleRef": "normal"
      }
    ]
  },
  "filename": "AI技术报告"
}
```

### 层级结构示例
```json
{
  "documentConfig": {
    "styles": {
      "h1": {"size": 16, "bold": true},
      "h2": {"size": 14, "bold": true},
      "content": {"size": 12, "spacing": {"line": 1.5}}
    },
    "sections": [
      {
        "type": "heading",
        "content": "第一章 研究背景",
        "styleRef": "h1",
        "children": [
          {
            "type": "heading",
            "content": "1.1 问题描述",
            "styleRef": "h2"
          },
          {
            "type": "paragraph",
            "content": "目前在AI领域存在的主要问题...",
            "styleRef": "content"
          }
        ]
      }
    ]
  }
}
```

### 完整配置示例
```json
{
  "documentConfig": {
    "title": "学术论文",
    "styles": {
      "title": {
        "font": "Microsoft YaHei",
        "size": 20,
        "bold": true,
        "alignment": "center",
        "spacing": {"before": 0, "after": 24}
      },
      "abstract": {
        "font": "Times New Roman",
        "size": 11,
        "italic": true,
        "spacing": {"before": 12, "after": 12, "line": 1.2}
      },
      "heading": {
        "font": "Microsoft YaHei",
        "size": 14,
        "bold": true,
        "spacing": {"before": 18, "after": 6}
      },
      "body": {
        "font": "Times New Roman",
        "size": 12,
        "spacing": {"line": 1.5, "after": 6}
      },
      "reference": {
        "font": "Times New Roman",
        "size": 10,
        "spacing": {"before": 3, "after": 3}
      }
    },
    "sections": [
      {
        "type": "heading",
        "content": "基于AI的文档自动化生成系统研究",
        "styleRef": "title"
      },
      {
        "type": "paragraph",
        "content": "摘要：本文提出了一种基于JSON配置的文档自动化生成方法...",
        "styleRef": "abstract"
      },
      {
        "type": "heading",
        "content": "1. 引言",
        "styleRef": "heading"
      },
      {
        "type": "paragraph",
        "content": "随着AI技术的快速发展，文档自动化生成成为了一个重要的研究方向...",
        "styleRef": "body"
      },
      {
        "type": "reference",
        "content": "[1] Smith, J. (2023). Automated Document Generation using AI. Journal of Computer Science, 45(2), 123-135.",
        "styleRef": "reference"
      }
    ]
  },
  "outputPath": "/Users/research/papers",
  "filename": "AI文档生成系统研究"
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "message": "DOCX文档生成成功",
  "outputFile": "/Users/username/Downloads/技术报告.docx",
  "documentTitle": "AI技术应用报告",
  "sectionsCount": 15
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": "JSON配置格式错误",
  "suggestion": "请检查JSON配置格式是否正确，确保包含必要的sections字段"
}
```

## 常见错误类型
```json
{
  "success": false,
  "error": "样式引用不存在",
  "suggestion": "styleRef 'invalidStyle' 在 styles 对象中不存在，请检查样式名称"
}
```

## 结果解读指南
### 文件输出位置
- **默认位置**：用户的Downloads目录
- **自定义路径**：根据outputPath参数指定
- **文件命名**：根据filename参数，自动添加.docx扩展名

### 生成结果评估
- **sectionsCount > 0**：成功生成文档，包含指定数量的内容元素
- **文件大小**：正常情况下生成的DOCX文件大小应在合理范围内
- **格式正确性**：生成的文件可以用Word正常打开并显示正确的格式

### 样式效果验证
- **字体显示**：检查设置的字体是否正确应用
- **排版效果**：验证对齐、间距等排版参数是否生效
- **层级结构**：确认文档的层级关系是否正确呈现

## 后续动作建议
### 生成成功后
1. **文档验证**：使用Word打开生成的文档，检查格式和内容是否符合预期
2. **样式调优**：根据实际显示效果调整JSON配置中的样式参数
3. **模板保存**：将成功的JSON配置保存为模板，供后续复用
4. **批量优化**：基于成功的配置开发批量生成脚本

### 生成失败时
1. **JSON验证**：使用JSON校验工具检查配置格式是否正确
2. **字段检查**：确认必需字段（sections、type、content）是否存在
3. **样式引用**：检查所有styleRef是否在styles对象中定义
4. **路径权限**：验证输出目录是否存在且可写入

### 性能优化建议
1. **配置简化**：对于大型文档，考虑分段处理或简化样式设置
2. **内容分块**：将过长的内容分解为多个段落或章节
3. **样式复用**：最大化利用样式引用，减少重复定义
4. **逐步构建**：先生成简单版本，再逐步添加复杂功能
</outcome>
</manual>