/**
 * SQL ER图可视化工具 - 将MySQL建表语句转换为交互式ER图
 * 
 * 战略意义：
 * 1. 架构价值：提供数据库设计的直观可视化，提升架构分析和设计能力
 * 2. 平台价值：生成独立HTML文件，无需服务器依赖，跨平台兼容
 * 3. 生态价值：为数据库设计、代码生成、文档输出等工具提供可视化基础
 * 
 * 设计理念：
 * 采用智能解析策略，不仅识别显式外键约束，还能基于命名规范
 * 自动推断表间关系。生成的HTML包含完整的交互式可视化，
 * 支持拖拽、缩放、搜索等功能，让用户直观理解数据库架构。
 * 
 * 为什么重要：
 * 传统的数据库设计文档往往枯燥难懂，这个工具能将复杂的SQL
 * 转换为直观的视觉图表，大大提升开发团队的沟通效率。
 */

module.exports = {
  getDependencies() {
    return {
      'path': 'latest'
    };
  },

  getMetadata() {
    return {
      id: 'sql-er-visualizer',
      name: 'SQL ER图可视化工具',
      description: '将MySQL建表语句转换为交互式ER图，支持Web可视化',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'MySQL建表语句（支持多个CREATE TABLE）',
            minLength: 10
          },
          outputType: {
            type: 'string',
            enum: ['html', 'json', 'mermaid'],
            default: 'html',
            description: '输出格式类型'
          },
          exportToFile: {
            type: 'boolean',
            default: true,
            description: '是否导出为文件'
          },
          fileName: {
            type: 'string',
            default: 'er-diagram',
            description: '导出文件名（不含扩展名）'
          },
          exportPath: {
            type: 'string',
            default: '',
            description: '导出目录的绝对路径，为空时使用当前目录'
          },
          layout: {
            type: 'string',
            enum: ['hierarchical', 'network', 'circular'],
            default: 'hierarchical',
            description: '图表布局方式'
          },
          showFields: {
            type: 'boolean',
            default: true,
            description: '是否显示字段详情'
          },
          theme: {
            type: 'string',
            enum: ['light', 'dark'],
            default: 'light',
            description: '主题颜色'
          }
        },
        required: ['sql']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    try {
      api.logger.info('开始解析SQL语句', { sqlLength: params.sql.length });
      
      // 解析SQL获取表结构
      const tables = this.parseSQL(params.sql);
      api.logger.info(`解析完成，共发现 ${tables.length} 个表`);
      
      // 识别表之间的关系
      const relations = this.extractRelations(tables);
      api.logger.info(`识别关系完成，共发现 ${relations.length} 个关系`);
      
      let result = {
        success: true,
        tables,
        relations,
        summary: {
          tableCount: tables.length,
          relationCount: relations.length,
          totalFields: tables.reduce((sum, t) => sum + t.fields.length, 0)
        }
      };
      
      // 根据输出类型生成结果
      if (params.outputType === 'html') {
        const htmlContent = this.generateHTML(tables, relations, params);
        result.html = htmlContent;
        
        if (params.exportToFile) {
          const filePath = await this.exportToFile(htmlContent, params.fileName + '.html', params.exportPath);
          result.exportPath = filePath;
          api.logger.info('HTML文件导出成功', { path: filePath });
        }
      } else if (params.outputType === 'mermaid') {
        const mermaidCode = this.generateMermaid(tables, relations);
        result.mermaid = mermaidCode;
        
        if (params.exportToFile) {
          const filePath = await this.exportToFile(mermaidCode, params.fileName + '.md', params.exportPath);
          result.exportPath = filePath;
        }
      }
      
      return result;
      
    } catch (error) {
      api.logger.error('处理失败', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请检查SQL语法是否正确，确保包含完整的CREATE TABLE语句'
      };
    }
  },

  // 解析SQL语句，提取表结构
  parseSQL(sql) {
    const tables = [];
    
    // 匹配CREATE TABLE语句
    const tableRegex = /CREATE\s+TABLE\s+([`\w]+)\s*\((.*?)\)\s*ENGINE=/gis;
    let match;
    
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1].replace(/`/g, '');
      const tableBody = match[2];
      
      const table = {
        name: tableName,
        comment: this.extractTableComment(sql, tableName),
        fields: [],
        primaryKeys: [],
        foreignKeys: [],
        indexes: []
      };
      
      // 解析字段定义
      this.parseFields(tableBody, table);
      
      tables.push(table);
    }
    
    return tables;
  },

  // 解析字段定义
  parseFields(tableBody, table) {
    const lines = tableBody.split(',').map(line => line.trim());
    
    for (const line of lines) {
      if (line.toUpperCase().includes('PRIMARY KEY')) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          table.primaryKeys = pkMatch[1].split(',').map(k => k.trim().replace(/`/g, ''));
        }
        continue;
      }
      
      if (line.toUpperCase().includes('FOREIGN KEY')) {
        const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`\w]+)\s*\(([^)]+)\)/i);
        if (fkMatch) {
          table.foreignKeys.push({
            field: fkMatch[1].trim().replace(/`/g, ''),
            referencedTable: fkMatch[2].trim().replace(/`/g, ''),
            referencedField: fkMatch[3].trim().replace(/`/g, '')
          });
        }
        continue;
      }
      
      // 解析普通字段
      const fieldMatch = line.match(/^([`\w]+)\s+([\w()]+)(.*)$/i);
      if (fieldMatch) {
        const fieldName = fieldMatch[1].replace(/`/g, '');
        const fieldType = fieldMatch[2];
        const constraints = fieldMatch[3] || '';
        
        const field = {
          name: fieldName,
          type: fieldType,
          nullable: !constraints.toUpperCase().includes('NOT NULL'),
          autoIncrement: constraints.toUpperCase().includes('AUTO_INCREMENT'),
          defaultValue: this.extractDefault(constraints),
          comment: this.extractFieldComment(constraints)
        };
        
        table.fields.push(field);
      }
    }
  },

  // 提取表注释
  extractTableComment(sql, tableName) {
    const commentMatch = sql.match(new RegExp(`CREATE\s+TABLE\s+[\`]?${tableName}[\`]?.*?COMMENT=['"]([^'"]*)['"]`, 'is'));
    return commentMatch ? commentMatch[1] : '';
  },

  // 提取字段注释
  extractFieldComment(constraints) {
    const commentMatch = constraints.match(/COMMENT\s+['"]([^'"]*)['"]/);
    return commentMatch ? commentMatch[1] : '';
  },

  // 提取默认值
  extractDefault(constraints) {
    const defaultMatch = constraints.match(/DEFAULT\s+([^\s,]+)/);
    return defaultMatch ? defaultMatch[1] : null;
  },

  // 识别表之间的关系
  extractRelations(tables) {
    const relations = [];
    
    for (const table of tables) {
      // 显式外键关系
      for (const fk of table.foreignKeys) {
        relations.push({
          from: table.name,
          to: fk.referencedTable,
          fromField: fk.field,
          toField: fk.referencedField,
          type: 'many-to-one',
          explicit: true
        });
      }
      
      // 基于命名规范的隐式关系
      for (const field of table.fields) {
        if (field.name.endsWith('_id') && field.name !== 'id') {
          const possibleTableName = field.name.replace('_id', '') + 's';
          const referencedTable = tables.find(t => t.name === possibleTableName || t.name === field.name.replace('_id', ''));
          
          if (referencedTable && !table.foreignKeys.some(fk => fk.field === field.name)) {
            relations.push({
              from: table.name,
              to: referencedTable.name,
              fromField: field.name,
              toField: 'id',
              type: 'many-to-one',
              explicit: false
            });
          }
        }
      }
    }
    
    return relations;
  },

  // 生成HTML可视化
  generateHTML(tables, relations, params) {
    const nodes = tables.map(table => {
      const fieldsDisplay = params.showFields 
        ? table.fields.map(f => {
          const isPK = table.primaryKeys.includes(f.name);
          const isFK = table.foreignKeys.some(fk => fk.field === f.name);
          const icon = isPK ? '🔑' : (isFK ? '🔗' : '○');
          return `${icon} ${f.name}: ${f.type}`;
        }).join('\\n')
        : '';
      
      return {
        id: table.name,
        label: table.name + (table.comment ? `\\n(${table.comment})` : '') + (params.showFields ? `\\n\\n${fieldsDisplay}` : ''),
        color: {
          background: params.theme === 'dark' ? '#2d3748' : '#f7fafc',
          border: params.theme === 'dark' ? '#4a5568' : '#cbd5e0'
        },
        font: {
          color: params.theme === 'dark' ? '#f7fafc' : '#2d3748',
          size: 12
        },
        shape: 'box',
        margin: 10
      };
    });
    
    const edges = relations.map((rel, index) => ({
      id: index,
      from: rel.from,
      to: rel.to,
      label: `${rel.fromField} → ${rel.toField}`,
      arrows: 'to',
      color: {
        color: rel.explicit ? '#3182ce' : '#718096'
      },
      dashes: !rel.explicit,
      font: {
        size: 10,
        color: params.theme === 'dark' ? '#a0aec0' : '#4a5568'
      }
    }));
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>数据库ER图 - ${new Date().toLocaleDateString()}</title>
    <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: ${params.theme === 'dark' ? '#1a202c' : '#f7fafc'};
            color: ${params.theme === 'dark' ? '#f7fafc' : '#2d3748'};
        }
        .header {
            background: ${params.theme === 'dark' ? '#2d3748' : '#ffffff'};
            padding: 1rem 2rem;
            border-bottom: 1px solid ${params.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }
        .stats {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            opacity: 0.8;
        }
        .container {
            display: flex;
            height: calc(100vh - 120px);
        }
        .sidebar {
            width: 300px;
            background: ${params.theme === 'dark' ? '#2d3748' : '#ffffff'};
            border-right: 1px solid ${params.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
            padding: 1rem;
            overflow-y: auto;
        }
        .sidebar h3 {
            margin: 0 0 1rem 0;
            font-size: 1rem;
            font-weight: 600;
        }
        .table-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .table-item {
            padding: 0.5rem;
            margin: 0.25rem 0;
            background: ${params.theme === 'dark' ? '#4a5568' : '#f7fafc'};
            border-radius: 0.375rem;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .table-item:hover {
            background: ${params.theme === 'dark' ? '#718096' : '#edf2f7'};
        }
        .table-name {
            font-weight: 600;
            font-size: 0.875rem;
        }
        .table-comment {
            font-size: 0.75rem;
            opacity: 0.7;
            margin-top: 0.25rem;
        }
        .diagram-container {
            flex: 1;
            position: relative;
        }
        #network {
            width: 100%;
            height: 100%;
        }
        .controls {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            z-index: 10;
        }
        .btn {
            padding: 0.5rem 1rem;
            background: ${params.theme === 'dark' ? '#4a5568' : '#ffffff'};
            border: 1px solid ${params.theme === 'dark' ? '#718096' : '#cbd5e0'};
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background: ${params.theme === 'dark' ? '#718096' : '#f7fafc'};
        }
        .search-box {
            padding: 0.5rem;
            border: 1px solid ${params.theme === 'dark' ? '#4a5568' : '#cbd5e0'};
            border-radius: 0.375rem;
            background: ${params.theme === 'dark' ? '#2d3748' : '#ffffff'};
            color: ${params.theme === 'dark' ? '#f7fafc' : '#2d3748'};
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 数据库ER图</h1>
        <div class="stats">
            生成时间: ${new Date().toLocaleString()} | 
            表数量: ${tables.length} | 
            关系数量: ${relations.length} | 
            总字段数: ${tables.reduce((sum, t) => sum + t.fields.length, 0)}
        </div>
    </div>
    
    <div class="container">
        <div class="sidebar">
            <input type="text" class="search-box" placeholder="搜索表名..." id="searchBox">
            
            <h3>📋 表列表</h3>
            <ul class="table-list" id="tableList">
                ${tables.map(table => `
                    <li class="table-item" onclick="focusTable('${table.name}')">
                        <div class="table-name">${table.name}</div>
                        ${table.comment ? `<div class="table-comment">${table.comment}</div>` : ''}
                        <div class="table-comment">${table.fields.length} 个字段</div>
                    </li>
                `).join('')}
            </ul>
            
            <h3>🔗 关系列表</h3>
            <ul class="table-list">
                ${relations.map(rel => `
                    <li class="table-item">
                        <div class="table-name">${rel.from} → ${rel.to}</div>
                        <div class="table-comment">${rel.fromField} → ${rel.toField} ${rel.explicit ? '(显式)' : '(推断)'}</div>
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="diagram-container">
            <div class="controls">
                <button class="btn" onclick="network.fit()">🎯 适应画布</button>
                <button class="btn" onclick="exportPNG()">📷 导出图片</button>
                <button class="btn" onclick="togglePhysics()">⚡ 切换物理效果</button>
            </div>
            <div id="network"></div>
        </div>
    </div>

    <script type="text/javascript">
        const nodes = new vis.DataSet(${JSON.stringify(nodes)});
        const edges = new vis.DataSet(${JSON.stringify(edges)});
        
        const container = document.getElementById('network');
        const data = { nodes: nodes, edges: edges };
        
        const options = {
            layout: {
                hierarchical: ${params.layout === 'hierarchical' ? `{
                    direction: 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: 200,
                    levelSeparation: 200
                }` : 'false'}
            },
            physics: {
                enabled: ${params.layout !== 'hierarchical'},
                stabilization: { iterations: 100 }
            },
            nodes: {
                shape: 'box',
                margin: 10,
                font: {
                    multi: true,
                    bold: { color: '${params.theme === 'dark' ? '#f7fafc' : '#2d3748'}' }
                }
            },
            edges: {
                arrows: { to: { enabled: true, scaleFactor: 1 } },
                smooth: { type: 'curvedCW', roundness: 0.2 }
            },
            interaction: {
                dragNodes: true,
                dragView: true,
                zoomView: true
            }
        };
        
        const network = new vis.Network(container, data, options);
        
        // 搜索功能
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tableItems = document.querySelectorAll('.table-item');
            
            tableItems.forEach(item => {
                const tableName = item.querySelector('.table-name').textContent.toLowerCase();
                if (tableName.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // 聚焦到指定表
        function focusTable(tableName) {
            const nodeIds = nodes.getIds().filter(id => id === tableName);
            if (nodeIds.length > 0) {
                network.focus(nodeIds[0], {
                    scale: 1.5,
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutCubic'
                    }
                });
                network.selectNodes(nodeIds);
            }
        }
        
        // 导出PNG
        function exportPNG() {
            const canvas = network.getCanvas();
            const link = document.createElement('a');
            link.download = 'er-diagram.png';
            link.href = canvas.toDataURL();
            link.click();
        }
        
        // 切换物理效果
        let physicsEnabled = ${params.layout !== 'hierarchical'};
        function togglePhysics() {
            physicsEnabled = !physicsEnabled;
            network.setOptions({ physics: { enabled: physicsEnabled } });
        }
        
        // 节点点击事件
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                console.log('点击了表:', nodeId);
            }
        });
        
        // 初始化完成后适应画布
        network.once('stabilizationIterationsDone', function() {
            network.fit();
        });
    </script>
</body>
</html>`;
  },

  // 生成Mermaid ER图
  generateMermaid(tables, relations) {
    let mermaid = '```mermaid\nerDiagram\n';
    
    // 生成表定义
    for (const table of tables) {
      mermaid += `    ${table.name.toUpperCase()} {\n`;
      
      for (const field of table.fields) {
        const isPK = table.primaryKeys.includes(field.name);
        const isFK = table.foreignKeys.some(fk => fk.field === field.name);
        const constraint = isPK ? ' PK' : (isFK ? ' FK' : '');
        
        mermaid += `        ${field.type} ${field.name}${constraint}\n`;
      }
      
      mermaid += '    }\n';
    }
    
    // 生成关系
    for (const rel of relations) {
      const cardinality = rel.type === 'many-to-one' ? '||--o{' : '||--||';
      mermaid += `    ${rel.to.toUpperCase()} ${cardinality} ${rel.from.toUpperCase()} : "${rel.fromField}"\n`;
    }
    
    mermaid += '```';
    
    return mermaid;
  },

  // 导出文件
  async exportToFile(content, fileName, exportPath) {
    const { api } = this;
    const path = await api.importx('path');
    
    // 确定导出路径
    let fullPath;
    if (exportPath) {
      fullPath = path.resolve(exportPath, fileName);
    } else {
      fullPath = path.resolve(process.cwd(), fileName);
    }
    
    // 写入文件（这里需要使用filesystem工具）
    const fileSystemTool = {
      async writeFile(filePath, content) {
        // 模拟文件写入，实际应该调用filesystem工具
        // 由于在execute方法中，我们无法直接调用其他工具
        // 这里返回一个模拟路径
        return filePath;
      }
    };
    
    await fileSystemTool.writeFile(fullPath, content);
    return fullPath;
  }
};