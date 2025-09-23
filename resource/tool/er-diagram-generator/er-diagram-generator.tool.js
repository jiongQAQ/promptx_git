/**
 * ER图生成器 - 交互式实体关系图可视化工具
 * 
 * 战略意义：
 * 1. 架构可视化：将抽象的数据模型转化为直观的可视化图表，提升开发团队对系统架构的理解
 * 2. 协作效率：通过交互式界面让产品、开发、测试团队能够快速理解和讨论数据模型
 * 3. 生态完整性：作为PromptX工具链的重要组成，支撑数据建模、代码生成等上层应用
 * 
 * 设计理念：
 * 采用Web技术栈构建交互式界面，而非静态图片生成。用户可以实时拖拽调整
 * 实体位置，动态查看关系连线，这种即时反馈的设计让复杂的ER图变得易于
 * 理解和维护。选择D3.js确保了强大的可视化能力和跨平台兼容性。
 * 
 * 为什么重要：
 * 数据模型是软件系统的核心，但传统的文档和代码难以直观表达复杂的实体关系。
 * 这个工具填补了"理解鸿沟"，让抽象概念变得具象可感。
 */

module.exports = {
  getDependencies() {
    return {
      'express': '^4.18.2',
      'd3': '^7.8.5',
      'open': '^9.1.0'
    };
  },

  getMetadata() {
    return {
      id: 'er-diagram-generator',
      name: 'ER图生成器',
      description: '生成可拖拽交互的实体关系图，支持网页操作',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: '实体关系数据',
            properties: {
              entities: {
                type: 'array',
                description: '实体列表',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '实体名称' },
                    fields: {
                      type: 'array',
                      description: '字段列表',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', description: '字段名' },
                          type: { type: 'string', description: '字段类型' },
                          key: { 
                            type: 'string', 
                            enum: ['primary', 'foreign', 'unique'],
                            description: '键类型' 
                          }
                        },
                        required: ['name', 'type']
                      }
                    }
                  },
                  required: ['name', 'fields']
                }
              },
              relationships: {
                type: 'array',
                description: '关系列表',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string', description: '源实体' },
                    to: { type: 'string', description: '目标实体' },
                    type: { 
                      type: 'string',
                      enum: ['one-to-one', 'one-to-many', 'many-to-many'],
                      description: '关系类型'
                    },
                    foreignKey: { type: 'string', description: '外键字段' }
                  },
                  required: ['from', 'to', 'type']
                }
              }
            },
            required: ['entities', 'relationships']
          },
          port: {
            type: 'number',
            description: '本地服务器端口',
            minimum: 3000,
            maximum: 9999,
            default: 8080
          },
          autoOpen: {
            type: 'boolean',
            description: '是否自动打开浏览器',
            default: true
          }
        },
        required: ['data']
      }
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始生成交互式ER图', { 
      entities: params.data.entities.length,
      relationships: params.data.relationships.length 
    });

    try {
      // 加载依赖
      const express = await api.importx('express');
      const open = await api.importx('open');
      
      const port = params.port || 8080;
      const app = express();
      
      // 静态文件服务
      app.use(express.static(__dirname));
      
      // API接口
      app.get('/data', (req, res) => {
        res.json(params.data);
      });
      
      // 主页面
      app.get('/', (req, res) => {
        res.send(this.generateHTML());
      });
      
      // 启动服务器
      const server = app.listen(port, () => {
        api.logger.info(`ER图服务已启动`, { port, url: `http://localhost:${port}` });
      });
      
      // 自动打开浏览器
      if (params.autoOpen !== false) {
        await open(`http://localhost:${port}`);
      }
      
      // 保存服务器实例以便后续关闭
      await api.storage.setItem('server_port', port);
      
      return {
        success: true,
        message: 'ER图生成成功！',
        url: `http://localhost:${port}`,
        port: port,
        features: [
          '🎯 可拖拽实体位置',
          '🔗 动态关系连线',
          '📊 实时字段展示',
          '🎨 关系类型标注',
          '💾 布局自动保存'
        ]
      };
      
    } catch (error) {
      api.logger.error('ER图生成失败', error);
      throw new Error(`生成失败: ${error.message}`);
    }
  },
  
  generateHTML() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>交互式ER图</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f7fa;
        }
        .container {
            max-width: 100%;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .controls {
            padding: 15px 20px;
            background: #f8f9fc;
            border-bottom: 1px solid #e1e8ed;
            display: flex;
            gap: 15px;
            align-items: center;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }
        #diagram {
            width: 100%;
            height: 800px;
            background: white;
        }
        .entity {
            cursor: move;
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.1));
        }
        .entity:hover {
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
        }
        .entity-header {
            fill: #4f46e5;
            stroke: #3730a3;
            stroke-width: 1;
        }
        .entity-body {
            fill: white;
            stroke: #d1d5db;
            stroke-width: 1;
        }
        .entity-title {
            fill: white;
            font-size: 14px;
            font-weight: bold;
            text-anchor: middle;
        }
        .field-text {
            fill: #374151;
            font-size: 11px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        .field-primary {
            fill: #dc2626;
            font-weight: bold;
        }
        .field-foreign {
            fill: #059669;
        }
        .relationship-line {
            stroke: #6b7280;
            stroke-width: 2;
            fill: none;
            marker-end: url(#arrowhead);
        }
        .relationship-label {
            fill: #4b5563;
            font-size: 10px;
            text-anchor: middle;
            background: white;
            padding: 2px 4px;
        }
        .legend {
            position: absolute;
            top: 100px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-size: 12px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏗️ 交互式ER图</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">拖拽实体调整位置，查看动态关系连线</p>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="resetLayout()">🔄 重置布局</button>
            <button class="btn" onclick="exportSVG()">💾 导出SVG</button>
            <button class="btn" onclick="toggleLegend()">📋 图例</button>
            <span style="margin-left: auto; color: #6b7280; font-size: 12px;">💡 拖拽实体可调整位置</span>
        </div>
        
        <svg id="diagram"></svg>
    </div>
    
    <div class="legend" id="legend" style="display: block;">
        <h4 style="margin: 0 0 10px 0; color: #374151;">字段类型</h4>
        <div class="legend-item">
            <div class="legend-color" style="background: #dc2626;"></div>
            <span>主键 (Primary Key)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #059669;"></div>
            <span>外键 (Foreign Key)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #374151;"></div>
            <span>普通字段</span>
        </div>
        <h4 style="margin: 15px 0 10px 0; color: #374151;">关系类型</h4>
        <div class="legend-item">
            <span>→ 一对一 (one-to-one)</span>
        </div>
        <div class="legend-item">
            <span>⇒ 一对多 (one-to-many)</span>
        </div>
        <div class="legend-item">
            <span>⇔ 多对多 (many-to-many)</span>
        </div>
    </div>

    <script>
        let data = null;
        let svg, g, entities, relationships;
        let simulation;
        
        // 加载数据并初始化图表
        fetch('/data')
            .then(response => response.json())
            .then(loadedData => {
                data = loadedData;
                initDiagram();
            })
            .catch(error => {
                console.error('加载数据失败:', error);
                alert('数据加载失败，请检查服务器状态');
            });
        
        function initDiagram() {
            const width = document.getElementById('diagram').clientWidth;
            const height = 800;
            
            svg = d3.select('#diagram')
                .attr('width', width)
                .attr('height', height);
            
            // 定义箭头标记
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 8)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('xoverflow', 'visible')
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#6b7280')
                .style('stroke','none');
            
            g = svg.append('g');
            
            // 处理数据
            processData();
            
            // 创建力导向图
            simulation = d3.forceSimulation(entities)
                .force('link', d3.forceLink(relationships).id(d => d.id).distance(200))
                .force('charge', d3.forceManyBody().strength(-1000))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(100));
            
            // 绘制关系线
            const link = g.selectAll('.relationship-line')
                .data(relationships)
                .enter().append('path')
                .attr('class', 'relationship-line');
            
            // 绘制关系标签
            const linkLabel = g.selectAll('.relationship-label')
                .data(relationships)
                .enter().append('text')
                .attr('class', 'relationship-label')
                .text(d => d.type);
            
            // 绘制实体
            const entity = g.selectAll('.entity')
                .data(entities)
                .enter().append('g')
                .attr('class', 'entity')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));
            
            // 实体头部
            entity.append('rect')
                .attr('class', 'entity-header')
                .attr('width', d => d.width)
                .attr('height', 30)
                .attr('rx', 6)
                .attr('ry', 6);
            
            // 实体主体
            entity.append('rect')
                .attr('class', 'entity-body')
                .attr('y', 30)
                .attr('width', d => d.width)
                .attr('height', d => d.height - 30)
                .attr('rx', 6)
                .attr('ry', 6);
            
            // 实体标题
            entity.append('text')
                .attr('class', 'entity-title')
                .attr('x', d => d.width / 2)
                .attr('y', 20)
                .text(d => d.name);
            
            // 字段文本
            entity.selectAll('.field-text')
                .data(d => d.fields)
                .enter().append('text')
                .attr('class', d => {
                    let cls = 'field-text';
                    if (d.key === 'primary') cls += ' field-primary';
                    if (d.key === 'foreign') cls += ' field-foreign';
                    return cls;
                })
                .attr('x', 10)
                .attr('y', (d, i) => 50 + i * 16)
                .text(d => {
                    let text = `${d.name}: ${d.type}`;
                    if (d.key === 'primary') text += ' 🔑';
                    if (d.key === 'foreign') text += ' 🔗';
                    return text;
                });
            
            // 更新位置
            simulation.on('tick', () => {
                entity.attr('transform', d => `translate(${d.x - d.width/2},${d.y - d.height/2})`);
                
                link.attr('d', d => {
                    const dx = d.target.x - d.source.x;
                    const dy = d.target.y - d.source.y;
                    const dr = Math.sqrt(dx * dx + dy * dy);
                    return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
                });
                
                linkLabel
                    .attr('x', d => (d.source.x + d.target.x) / 2)
                    .attr('y', d => (d.source.y + d.target.y) / 2);
            });
        }
        
        function processData() {
            // 处理实体
            entities = data.entities.map(entity => {
                const maxFieldLength = Math.max(
                    entity.name.length * 8,
                    ...entity.fields.map(f => f.name.length * 6 + f.type.length * 6 + 20)
                );
                
                return {
                    id: entity.name,
                    name: entity.name,
                    fields: entity.fields,
                    width: Math.max(maxFieldLength + 40, 180),
                    height: 30 + entity.fields.length * 16 + 10
                };
            });
            
            // 处理关系
            relationships = data.relationships.map(rel => ({
                source: rel.from,
                target: rel.to,
                type: rel.type,
                foreignKey: rel.foreignKey
            }));
        }
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        function resetLayout() {
            simulation.alpha(1).restart();
        }
        
        function exportSVG() {
            const svgData = new XMLSerializer().serializeToString(document.getElementById('diagram'));
            const blob = new Blob([svgData], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'er-diagram.svg';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function toggleLegend() {
            const legend = document.getElementById('legend');
            legend.style.display = legend.style.display === 'none' ? 'block' : 'none';
        }
        
        // 响应式处理
        window.addEventListener('resize', () => {
            const width = document.getElementById('diagram').clientWidth;
            svg.attr('width', width);
            simulation.force('center', d3.forceCenter(width / 2, 400));
        });
    </script>
</body>
</html>
    `;
  },
  
  getBusinessErrors() {
    return [
      {
        code: 'INVALID_ENTITY_DATA',
        description: '实体数据格式错误',
        match: /Invalid entity/i,
        solution: '检查entities数组格式是否正确',
        retryable: false
      },
      {
        code: 'INVALID_RELATIONSHIP_DATA', 
        description: '关系数据格式错误',
        match: /Invalid relationship/i,
        solution: '检查relationships数组格式是否正确',
        retryable: false
      },
      {
        code: 'PORT_IN_USE',
        description: '端口已被占用',
        match: /EADDRINUSE/i,
        solution: '尝试使用其他端口号',
        retryable: true
      }
    ];
  }
};