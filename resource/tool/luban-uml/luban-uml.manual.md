<manual>
<identity>
## 工具名称
@tool://luban-uml

## 简介
PlantUML图表渲染和语法校验工具，支持将.puml文件渲染为PNG/SVG图片，并提供语法验证功能
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决PlantUML文件的语法验证和图表渲染问题，避免无效PlantUML代码的空跑，提供可靠的UML图表生成流程。

## 价值主张
- 🎯 **解决什么痛点**：PlantUML语法错误导致渲染失败，浪费时间和资源
- 🚀 **带来什么价值**：先验证后渲染的工作流，支持PNG/SVG多种格式输出
- 🌟 **独特优势**：集成语法校验和渲染功能，标准化的退出码和错误处理

## 应用边界
- ✅ **适用场景**：
  - 学术论文中的UML图表生成
  - 技术文档的架构图制作
  - PlantUML文件的批量处理
  - CI/CD流程中的图表自动生成
  
- ❌ **不适用场景**：
  - 非PlantUML格式的图表处理
  - 交互式图表编辑
  - 实时预览功能
  - 复杂图表的性能优化
</purpose>

<usage>
## 使用时机
- 在提交包含PlantUML图表的文档前进行语法验证
- 需要将PlantUML代码转换为图片文件时
- 批量处理多个PlantUML文件时
- 在自动化构建流程中生成文档图表时

## 操作步骤

### 1. 语法验证工作流
```bash
# 等效CLI命令
luban-uml validate --in path/to/diagram.puml
```

**工具调用参数**：
```json
{
  "command": "validate",
  "input": "path/to/diagram.puml"
}
```

### 2. 图表渲染工作流
```bash
# 等效CLI命令
luban-uml render \
  --in projects/myproject/diagrams/architecture.puml \
  --out projects/myproject/images/architecture.png \
  --format png
```

**工具调用参数**：
```json
{
  "command": "render",
  "input": "projects/myproject/diagrams/architecture.puml",
  "output": "projects/myproject/images/architecture.png",
  "format": "png"
}
```

### 3. 推荐的完整工作流
1. **验证阶段**：先调用validate命令检查语法
2. **渲染阶段**：语法通过后调用render命令生成图片
3. **验证输出**：检查生成的图片文件是否正确

## 最佳实践
- 🎯 **效率提升**：总是先validate再render，避免语法错误导致的渲染失败
- ⚠️ **避免陷阱**：确保输入文件路径正确，输出目录有写权限
- 🔧 **故障排除**：检查PlantUML语法、文件路径、目录权限

## 注意事项
- 输入文件必须是.puml格式
- render命令需要指定output参数
- 输出目录会自动创建（如果不存在）
- 支持相对路径和绝对路径
- 生成的图片会覆盖同名文件
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| command | string | 子命令：render或validate | "render" |
| input | string | 输入的.puml文件路径 | "diagrams/seq.puml" |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| output | string | - | 输出文件路径（render命令必需） |
| format | string | "png" | 输出格式：png或svg |
| plantUmlPath | string | - | 自定义PlantUML可执行文件路径 |

## 参数约束
- **command约束**：必须是"render"或"validate"
- **input约束**：必须以.puml结尾
- **output约束**：render命令时必须提供
- **format约束**：只支持"png"和"svg"
- **路径格式**：支持相对路径和绝对路径

## 参数示例

### 验证PlantUML语法
```json
{
  "command": "validate",
  "input": "projects/myapp/docs/sequence-diagram.puml"
}
```

### 渲染PNG图片
```json
{
  "command": "render",
  "input": "diagrams/class-diagram.puml",
  "output": "images/class-diagram.png",
  "format": "png"
}
```

### 渲染SVG图片
```json
{
  "command": "render",
  "input": "docs/architecture.puml",
  "output": "exports/architecture.svg",
  "format": "svg"
}
```

### 使用自定义PlantUML路径
```json
{
  "command": "render",
  "input": "diagram.puml",
  "output": "diagram.png",
  "plantUmlPath": "/usr/local/bin/plantuml"
}
```
</parameter>

<outcome>
## 成功返回格式

### validate命令成功
```json
{
  "success": true,
  "exitCode": 0,
  "status": "success",
  "message": "PlantUML语法验证通过"
}
```

### render命令成功
```json
{
  "success": true,
  "exitCode": 0,
  "status": "success",
  "out": "projects/myapp/images/diagram.png",
  "format": "png",
  "size": 15420
}
```

## 错误返回格式
```json
{
  "success": false,
  "exitCode": 2,
  "error": {
    "code": "SYNTAX_ERROR",
    "message": "PlantUML语法错误: Unknown directive @startuml2"
  }
}
```

## 退出码说明
| 退出码 | 含义 | 描述 |
|--------|------|------|
| 0 | 成功 | 操作成功完成 |
| 1 | 系统错误 | 参数错误、文件不存在等 |
| 2 | 语法错误 | PlantUML语法验证失败 |
| 3 | 渲染失败 | 图表渲染过程失败 |

## 错误代码分类
- **VALIDATION_ERROR**：参数验证失败
- **FILE_NOT_FOUND**：输入文件不存在
- **READ_ERROR**：文件读取失败
- **SYNTAX_ERROR**：PlantUML语法错误
- **RENDER_FAILED**：图表渲染失败
- **WRITE_ERROR**：输出文件写入失败
- **SYSTEM_ERROR**：系统级错误

## 结果解读指南
- **判断成功**：检查success字段和exitCode为0
- **获取输出路径**：render成功时查看out字段
- **错误分析**：根据error.code进行分类处理
- **文件大小**：render成功时size字段显示生成文件大小

## 后续动作建议
### 验证成功后
- 继续执行render命令生成图片
- 可以安全地在CI/CD流程中使用该文件

### 渲染成功后
- 检查生成的图片文件是否符合预期
- 可以在文档中引用生成的图片路径
- 将图片文件纳入版本控制

### 失败时的处理
- **语法错误**：检查PlantUML代码，修复语法问题
- **文件错误**：确认文件路径正确，检查权限
- **渲染错误**：检查输出目录权限，确认PlantUML版本兼容性
</outcome>
</manual>