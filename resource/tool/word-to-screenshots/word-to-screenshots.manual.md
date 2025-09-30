# Word文档截图工具使用手册

## 工具简介

Word文档截图工具（word-to-screenshots）是鲁班工具集中的一个专业文档处理工具，用于将Word文档的每一页转换为高清PNG或JPG图片。

## 战略价值

1. **架构价值**: 通过系统命令桥接实现跨平台的文档渲染能力
2. **平台价值**: 为AI提供将Word文档可视化为图片的能力，支持演示和预览场景
3. **生态价值**: 补充文档处理工具链，支持论文图表生成、文档预览等高级工作流

## 依赖安装

### macOS 环境

#### 1. 安装 LibreOffice

```bash
brew install --cask libreoffice
```

**作用**: LibreOffice 用于将 Word 文档转换为 PDF 格式

#### 2. 安装 Poppler

```bash
brew install poppler
```

**作用**: Poppler 提供 pdftoppm 工具，用于将 PDF 转换为图片

### 验证安装

```bash
# 检查 LibreOffice
/Applications/LibreOffice.app/Contents/MacOS/soffice --version

# 检查 pdftoppm
pdftoppm -h
```

## 使用方法

### 基本用法

通过 PromptX 调用工具：

```javascript
// 基本调用
await mcp.action('word-to-screenshots', {
  wordFile: '/path/to/document.docx'
});

// 完整参数
await mcp.action('word-to-screenshots', {
  wordFile: '/path/to/document.docx',
  outputDir: 'reference-papers',
  dpi: 300,
  format: 'png',
  cleanupPdf: true
});
```

### 参数说明

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `wordFile` | string | ✅ | - | Word文档路径（.docx） |
| `outputDir` | string | ❌ | `reference-papers` | 输出目录路径 |
| `dpi` | number | ❌ | `300` | 图片分辨率（72-600） |
| `format` | string | ❌ | `png` | 输出格式（png/jpg） |
| `cleanupPdf` | boolean | ❌ | `true` | 是否清理临时PDF文件 |

## 输出结构

```
reference-papers/
└── 文档名_screenshots/
    ├── page-001.png
    ├── page-002.png
    ├── page-003.png
    └── ...
```

## 转换流程

```
Word (.docx)
    ↓ [LibreOffice headless]
PDF (临时文件)
    ↓ [pdftoppm]
PNG/JPG 图片集
```

## 使用示例

### 示例 1: 转换论文文档

```javascript
const result = await mcp.action('word-to-screenshots', {
  wordFile: '/Users/pc/Downloads/毕业论文.docx',
  dpi: 300,
  format: 'png'
});

console.log(result);
// {
//   success: true,
//   screenshotsDir: 'reference-papers/毕业论文_screenshots',
//   imageFiles: [
//     'reference-papers/毕业论文_screenshots/page-001.png',
//     'reference-papers/毕业论文_screenshots/page-002.png',
//     ...
//   ],
//   statistics: {
//     totalPages: 45,
//     totalSize: '12.3 MB',
//     dpi: 300,
//     format: 'png'
//   }
// }
```

### 示例 2: 高分辨率转换

```javascript
// 用于打印或高质量展示
await mcp.action('word-to-screenshots', {
  wordFile: '/path/to/document.docx',
  dpi: 600,  // 更高分辨率
  format: 'png'
});
```

### 示例 3: JPG格式（文件更小）

```javascript
// 用于网页展示或快速预览
await mcp.action('word-to-screenshots', {
  wordFile: '/path/to/document.docx',
  dpi: 150,  // 较低分辨率
  format: 'jpg'  // JPG格式文件更小
});
```

## 常见问题

### Q1: LibreOffice未安装

**错误信息**: `未找到LibreOffice`

**解决方案**:
```bash
brew install --cask libreoffice
```

### Q2: Poppler未安装

**错误信息**: `未找到pdftoppm`

**解决方案**:
```bash
brew install poppler
```

### Q3: 转换速度慢

**原因**: 文档页数多或分辨率高

**建议**:
- 对于预览，使用较低DPI（150-200）
- 对于打印，使用标准DPI（300）
- 大文档可能需要等待1-2分钟

### Q4: 临时PDF文件未清理

**解决方案**:
设置 `cleanupPdf: true`（默认已启用）

### Q5: 权限错误

**错误信息**: `Permission denied`

**解决方案**:
```bash
chmod +x /Applications/LibreOffice.app/Contents/MacOS/soffice
```

## 技术细节

### 分辨率建议

- **72 DPI**: 快速预览，文件极小
- **150 DPI**: 网页显示，文件较小
- **300 DPI**: 标准打印质量（推荐）
- **600 DPI**: 高质量打印，文件很大

### 格式选择

| 格式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| PNG | 无损压缩，质量高 | 文件较大 | 文档存档、专业排版 |
| JPG | 文件小，压缩率高 | 有损压缩 | 网页展示、快速预览 |

### 性能参考

| 文档页数 | DPI | 格式 | 预计时间 | 预计大小 |
|---------|-----|------|---------|---------|
| 10页 | 300 | PNG | 10-15秒 | 2-5 MB |
| 50页 | 300 | PNG | 40-60秒 | 10-25 MB |
| 100页 | 300 | PNG | 80-120秒 | 20-50 MB |

## 与其他工具配合

### 配合 word-to-md 使用

```javascript
// 先提取文本内容
await mcp.action('word-to-md', {
  wordFile: 'document.docx'
});

// 再生成图片预览
await mcp.action('word-to-screenshots', {
  wordFile: 'document.docx'
});
```

### 配合论文生成流程

在论文生成流程中使用截图工具进行效果预览：

```javascript
// 1. 生成论文Word文档
await mcp.action('thesis-to-docx', { ... });

// 2. 生成预览图片
await mcp.action('word-to-screenshots', {
  wordFile: 'paper/论文.docx',
  dpi: 200  // 预览用较低DPI即可
});
```

## 版本历史

- **v1.0.0** (2025-09-30)
  - 首次发布
  - 支持 Word → PDF → PNG/JPG 转换链
  - 支持自定义DPI和输出格式
  - 支持自动清理临时文件

## 作者

鲁班 - PromptX 工具生态

## 许可

MIT License