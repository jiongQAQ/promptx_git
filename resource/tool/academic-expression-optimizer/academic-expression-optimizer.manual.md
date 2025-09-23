<manual>
<identity>
## 工具名称
@tool://academic-expression-optimizer

## 简介
学术表达优化工具，专为计算机专业论文设计，提供表达多样化和学术规范性优化，帮助原创内容避免因用词简单导致的无意重复
</identity>

<purpose>
⚠️ **AI重要提醒**: 调用此工具前必须完整阅读本说明书，理解工具功能边界、参数要求和使用限制。禁止在不了解工具功能的情况下盲目调用。

## 核心问题定义
解决计算机专业学术论文因表达方式单一、用词简单而与网络内容产生无意重复的问题，通过表达多样化提升学术写作质量。

## 价值主张
- 🎯 **解决痛点**：原创内容因表达局限导致查重率偏高的困扰
- 🚀 **核心价值**：保持原创思想内核，显著提升表达多样性和学术规范性
- 🌟 **独特优势**：专门针对计算机专业优化，内置CS专业术语库，智能保护专业术语

## 应用边界
- ✅ **适用场景**：
  - 原创学术论文的表达优化（计算机科学、软件工程、信息技术等）
  - 技术文档和研究报告的语言润色
  - 学位论文的表达多样化改进
  - 学术期刊投稿前的语言优化
  
- ❌ **不适用场景**：
  - 非原创内容的伪装处理（严格禁止）
  - 抄袭内容的降重处理
  - 改变核心学术观点和研究结论
  - 处理非计算机专业的专业术语
</purpose>

<usage>
## 使用时机
- 📝 **论文初稿完成后**：对完整论文进行表达优化
- 📊 **查重报告显示重复率偏高时**：针对性优化重复片段
- 🔍 **投稿前语言润色**：提升学术表达规范性
- 📚 **导师建议改进表达多样性时**：系统化优化用词和句式

## 操作步骤
1. **文本准备阶段**：
   - 确保论文内容为原创撰写
   - 准备完整的论文文本（建议单独处理章节）
   - 可选：准备查重报告PDF以获得针对性优化

2. **参数设置阶段**：
   - 选择优化强度：conservative（保守）/moderate（适中）/aggressive（积极）
   - 设置目标相似度：0.85（推荐）
   - 确认是否保留专业术语（默认保留）

3. **执行优化阶段**：
   - 调用工具进行文本分析和优化
   - 系统自动识别CS专业术语并保护
   - 应用同义词替换和句式重构策略

4. **结果验证阶段**：
   - 检查语义相似度是否达标（≥0.8）
   - 对比原文和优化文本的差异
   - 根据优化报告评估改进效果

## 最佳实践
- 🎯 **分段处理**：建议按章节或段落分批处理，避免一次处理过长文本
- ⚠️ **术语保护**：自动保护计算机专业术语，如"算法"、"数据结构"等关键概念
- 🔧 **渐进优化**：首次使用建议选择conservative模式，逐步调整强度
- 📊 **效果验证**：优化后务必通读全文，确保语义准确性
- 🔄 **迭代改进**：可针对特定段落进行多轮优化

## 注意事项
- **学术诚信**：本工具仅用于提升原创内容的表达质量，严禁用于伪造或抄袭
- **专业术语**：计算机专业核心术语会自动识别和保护，避免错误替换
- **语义保持**：所有优化都以保持原意为前提，建议检查关键学术观点
- **适度原则**：过度优化可能影响表达自然性，建议moderate模式
- **人工复核**：优化结果需要人工最终审核，工具辅助不能完全替代人工判断
</usage>

<parameter>
## 必需参数
| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| text | string | 待优化的学术文本内容，建议50-10万字符 | "本文提出了一种新的机器学习算法..." |

## 可选参数
| 参数名 | 类型 | 默认值 | 描述 |
|--------|------|--------|---------|
| options.language | string | "chinese" | 文本主要语言：chinese/english/mixed |
| options.optimizationLevel | string | "moderate" | 优化强度：conservative(保守)/moderate(适中)/aggressive(积极) |
| options.preserveTerminology | boolean | true | 是否保留CS专业术语不变 |
| options.targetSimilarity | number | 0.85 | 目标语义相似度(0.7-0.95) |
| reportData | object | null | 查重报告数据（可选），用于针对性优化 |

## 参数约束
- **文本长度**：50-100,000字符
- **相似度范围**：targetSimilarity必须在0.7-0.95之间
- **语言支持**：主要支持中文，英文和中英混合文本
- **专业领域**：专门针对计算机科学相关专业优化

## 参数示例
### 基础优化示例
```json
{
  "text": "本研究提出了一种基于深度学习的图像识别算法。该算法通过卷积神经网络实现特征提取，然后使用分类器进行图像分类。实验结果表明，该方法在标准数据集上取得了良好的效果。",
  "options": {
    "language": "chinese",
    "optimizationLevel": "moderate",
    "targetSimilarity": 0.85
  }
}
```

### 高级优化示例（含查重报告）
```json
{
  "text": "系统设计采用分层架构，数据访问层负责数据库操作，业务逻辑层处理核心算法，表示层提供用户界面。通过这种设计，系统具有良好的可维护性和扩展性。",
  "options": {
    "language": "chinese",
    "optimizationLevel": "aggressive",
    "preserveTerminology": true,
    "targetSimilarity": 0.82
  },
  "reportData": {
    "duplicateSegments": [
      {
        "text": "采用分层架构",
        "similarity": 0.95
      },
      {
        "text": "具有良好的可维护性",
        "similarity": 0.88
      }
    ]
  }
}
```

### 保守优化示例
```json
{
  "text": "算法的时间复杂度为O(n log n)，空间复杂度为O(n)。相比传统方法，本算法在处理大规模数据时表现更佳。",
  "options": {
    "language": "chinese",
    "optimizationLevel": "conservative",
    "preserveTerminology": true,
    "targetSimilarity": 0.90
  }
}
```
</parameter>

<outcome>
## 成功返回格式
```json
{
  "success": true,
  "data": {
    "original": "原始文本内容",
    "optimized": "优化后的文本内容",
    "similarity": 0.87,
    "suggestions": [
      {
        "segmentIndex": 0,
        "original": "本研究提出",
        "synonyms": [{
          "original": "提出",
          "alternatives": ["设计", "构建", "给出"],
          "type": "synonym",
          "confidence": 0.8
        }],
        "structures": [],
        "priority": 0.7
      }
    ],
    "terminology": {
      "identifiedTerms": ["算法", "数据结构", "系统"],
      "mappings": {
        "算法": ["算法", "Algorithm", "计算方法"]
      },
      "count": 3
    },
    "report": {
      "summary": {
        "totalSuggestions": 15,
        "appliedChanges": 12,
        "semanticSimilarity": 0.87,
        "recommendedForSubmission": true
      },
      "improvements": [
        "提升了词汇多样性",
        "优化了句式结构",
        "增强了学术表达规范性",
        "保持了良好的语义一致性"
      ],
      "warnings": []
    },
    "statistics": {
      "originalLength": 245,
      "optimizedLength": 267,
      "changeRate": "8.98%",
      "optimizationPoints": 15
    }
  },
  "metadata": {
    "executionTime": 1250,
    "language": "chinese",
    "optimizationLevel": "moderate",
    "targetSimilarity": 0.85,
    "actualSimilarity": 0.87
  }
}
```

## 错误处理格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "文本长度不能超过100,000字符",
    "details": "当前文本长度: 150,000字符"
  }
}
```

## 结果解读指南
### 语义相似度评估
- **0.90-0.95**：优秀，表达优化且语义高度保持
- **0.85-0.89**：良好，适合大多数学术应用场景
- **0.80-0.84**：及格，建议人工检查关键内容
- **< 0.80**：需要调整，可能过度修改影响原意

### 优化建议应用率
- **appliedChanges/totalSuggestions > 0.8**：积极优化，表达多样性显著提升
- **0.5-0.8**：适度优化，平衡了保守性和改进性
- **< 0.5**：保守优化，保持原文风格为主

### 专业术语保护验证
- 检查**terminology.identifiedTerms**确认专业术语被正确识别
- 验证**mappings**中的术语替换选项是否合理
- 确认核心CS概念（如"算法"、"数据结构"等）未被错误替换

## 后续动作建议
### 成功优化后
1. **人工审核**：逐段对比原文和优化文本，确保关键学术观点未改变
2. **专业检查**：验证CS专业术语使用的准确性和一致性
3. **整体润色**：针对过渡词和连接词进行微调
4. **查重验证**：使用查重系统验证优化效果

### 相似度过低时
1. **降低优化强度**：从aggressive调整为moderate或conservative
2. **提高目标相似度**：将targetSimilarity调整至0.90以上
3. **分段处理**：将长文本分解为较短段落单独处理
4. **人工干预**：对关键段落进行人工精调

### 效果不佳时
1. **检查文本质量**：确保原文表达相对规范
2. **调整参数组合**：尝试不同的optimizationLevel和targetSimilarity组合
3. **提供查重报告**：通过reportData参数提供针对性优化信息
4. **多轮迭代**：对特定问题段落进行多次优化
</outcome>
</manual>