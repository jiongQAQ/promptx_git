# PromptX 工具仓库

这是一个 PromptX 工具和资源的管理仓库，包含了各种自定义工具和配置。

## 📁 目录结构

```
.promptx/
├── resource/           # PromptX 资源目录
│   └── tool/          # 工具目录
│       ├── luban-uml/     # PlantUML 渲染和验证工具
│       ├── luban-sql/     # SQL 解析和 ER 图生成工具
│       ├── academic-expression-optimizer/  # 学术表达优化工具
│       ├── docx-toc-extractor/            # DOCX 目录提取工具
│       ├── json-docx-generator/           # JSON 到 DOCX 生成工具
│       └── txt-creator/                   # 文本创建工具
├── project/           # 项目配置
├── cognition/         # 认知模型
└── desktop/           # 桌面相关
```

## 🔧 主要工具

### luban-uml
- **功能**: PlantUML 图表渲染和语法验证
- **支持格式**: PNG, SVG
- **命令**: `render`, `validate`

### luban-sql  
- **功能**: SQL DDL 解析，生成 ER 图 JSON 和主外键摘要
- **支持方言**: MySQL, PostgreSQL
- **命令**: `er`, `pkfk`

### 其他工具
- **academic-expression-optimizer**: 学术表达优化
- **docx-toc-extractor**: DOCX 文件目录提取
- **json-docx-generator**: JSON 到 DOCX 转换
- **txt-creator**: 文本文件创建

## 🚀 使用方法

通过 PromptX 系统调用工具：

```javascript
// 使用 luban-uml 渲染 PlantUML
toolx("@tool://luban-uml", {
  command: "render",
  input: "diagram.puml", 
  output: "diagram.png",
  format: "png"
})

// 使用 luban-sql 解析 SQL
toolx("@tool://luban-sql", {
  command: "er",
  input: "schema.sql",
  output: "er-diagram.json", 
  dialect: "mysql"
})
```

## 📖 文档

每个工具都有对应的手册文件：
- `@manual://luban-uml` 
- `@manual://luban-sql`
- 其他工具的手册...

## 🔄 更新历史

- 2025-09-23: 创建 luban-uml 和 luban-sql 工具
- 更早期间: 添加其他实用工具

## 📄 许可证

这个仓库包含的工具遵循各自的许可证要求。
