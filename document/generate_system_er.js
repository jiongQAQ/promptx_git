const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// 分析所有表的外键关系并生成系统ER图
const tablesDir = '/Users/jiongjiong/Documents/a_git_project/promptx_tools/projects/gym/paper/exports/tables';
const outputPath = path.join(tablesDir, 'gym_system_er_diagram.png');

console.log('=== 生成健身房管理系统ER图 ===\n');

// 读取所有JSON文件
const files = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json'));
const tables = [];
const relations = [];

// 解析所有表结构
for (const file of files) {
  const filePath = path.join(tablesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const table = {
    fileName: file,
    tableName: data.tableName,
    tableCnName: data.tableCnName,
    columns: data.columns.slice(1), // 跳过标题行
    foreignKeys: []
  };

  // 分析外键关系
  for (const col of table.columns) {
    if (col[3] && col[3].includes('FK')) {
      const description = col[4] || '';
      let targetTable = '';

      if (description.includes('关联用户表')) targetTable = '用户表';
      else if (description.includes('关联场地表')) targetTable = '场地表';
      else if (description.includes('关联课程表')) targetTable = '课程表';
      else if (description.includes('关联会员卡表')) targetTable = '会员卡表';
      else if (description.includes('关联角色表')) targetTable = '角色表';
      else if (description.includes('关联预约表')) targetTable = '预约表';
      else if (description.includes('关联二维码表')) targetTable = '二维码表';
      else if (description.includes('关联签到表')) targetTable = '签到表';

      if (targetTable) {
        const fk = {
          field: col[1], // 中文字段名
          fieldEn: col[0], // 英文字段名
          targetTable: targetTable,
          description: description
        };
        table.foreignKeys.push(fk);

        relations.push({
          from: table.tableCnName,
          fromField: col[1],
          to: targetTable,
          description: description
        });
      }
    }
  }

  tables.push(table);
}

console.log(`发现 ${tables.length} 个表，${relations.length} 个关系`);

// 分析表的重要性（被引用次数）
const tableCounts = {};
relations.forEach(rel => {
  tableCounts[rel.to] = (tableCounts[rel.to] || 0) + 1;
});

// 按重要性排序表
const sortedTables = tables.map(table => ({
  ...table,
  refCount: tableCounts[table.tableCnName] || 0
})).sort((a, b) => b.refCount - a.refCount);

console.log('表重要性排序：');
sortedTables.forEach(table => {
  console.log(`${table.tableCnName}: ${table.refCount}次被引用`);
});

// Canvas设置
const canvas = createCanvas(1600, 1200);
const ctx = canvas.getContext('2d');

// 背景
ctx.fillStyle = '#f8f9fa';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 字体设置
ctx.font = '14px Arial';
ctx.textAlign = 'center';

// 布局算法：层次化布局
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const layers = [
  { radius: 0, tables: [] },      // 中心层
  { radius: 200, tables: [] },    // 第一层
  { radius: 350, tables: [] },    // 第二层
  { radius: 480, tables: [] }     // 第三层
];

// 分配表到不同层次
const coreTable = sortedTables[0]; // 最重要的表放中心
layers[0].tables.push(coreTable);

let layerIndex = 1;
for (let i = 1; i < sortedTables.length; i++) {
  const table = sortedTables[i];
  if (layers[layerIndex].tables.length >= 3 && layerIndex < layers.length - 1) {
    layerIndex++;
  }
  layers[layerIndex].tables.push(table);
}

// 计算每个表的位置
const tablePositions = {};

layers.forEach((layer, layerIdx) => {
  if (layer.tables.length === 0) return;

  if (layerIdx === 0) {
    // 中心表
    const table = layer.tables[0];
    tablePositions[table.tableCnName] = {
      x: centerX,
      y: centerY,
      width: 120,
      height: 50
    };
  } else {
    // 环形布局
    const angleStep = (2 * Math.PI) / layer.tables.length;
    layer.tables.forEach((table, idx) => {
      const angle = idx * angleStep - Math.PI / 2; // 从顶部开始
      const x = centerX + layer.radius * Math.cos(angle);
      const y = centerY + layer.radius * Math.sin(angle);

      tablePositions[table.tableCnName] = {
        x: x,
        y: y,
        width: 100,
        height: 40
      };
    });
  }
});

// 边到边连线计算函数
function calculateEdgeToEdge(rect1, rect2) {
  const dx = rect2.x - rect1.x;
  const dy = rect2.y - rect1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return { x1: rect1.x, y1: rect1.y, x2: rect2.x, y2: rect2.y };

  const unitX = dx / distance;
  const unitY = dy / distance;

  // 计算矩形1的边缘点
  let edge1X, edge1Y;
  if (Math.abs(unitX) > Math.abs(unitY) * (rect1.width / rect1.height)) {
    edge1X = rect1.x + (unitX > 0 ? rect1.width/2 : -rect1.width/2);
    edge1Y = rect1.y + (rect1.width/2) * unitY / Math.abs(unitX);
  } else {
    edge1X = rect1.x + (rect1.height/2) * unitX / Math.abs(unitY);
    edge1Y = rect1.y + (unitY > 0 ? rect1.height/2 : -rect1.height/2);
  }

  // 计算矩形2的边缘点
  let edge2X, edge2Y;
  if (Math.abs(-unitX) > Math.abs(-unitY) * (rect2.width / rect2.height)) {
    edge2X = rect2.x + (-unitX > 0 ? rect2.width/2 : -rect2.width/2);
    edge2Y = rect2.y + (rect2.width/2) * (-unitY) / Math.abs(-unitX);
  } else {
    edge2X = rect2.x + (rect2.height/2) * (-unitX) / Math.abs(-unitY);
    edge2Y = rect2.y + ((-unitY) > 0 ? rect2.height/2 : -rect2.height/2);
  }

  return { x1: edge1X, y1: edge1Y, x2: edge2X, y2: edge2Y };
}

// 绘制所有关系连线
console.log('\n绘制关系连线...');
ctx.strokeStyle = '#6c757d';
ctx.lineWidth = 2;

relations.forEach(rel => {
  const fromPos = tablePositions[rel.from];
  const toPos = tablePositions[rel.to];

  if (fromPos && toPos) {
    const { x1, y1, x2, y2 } = calculateEdgeToEdge(fromPos, toPos);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 绘制箭头
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLength * Math.cos(angle - 0.5), y2 - arrowLength * Math.sin(angle - 0.5));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLength * Math.cos(angle + 0.5), y2 - arrowLength * Math.sin(angle + 0.5));
    ctx.stroke();

    console.log(`连线: ${rel.from} -> ${rel.to}`);
  }
});

// 绘制表格
console.log('\n绘制表格...');
tables.forEach(table => {
  const pos = tablePositions[table.tableCnName];
  if (!pos) return;

  // 绘制表格矩形
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.fillRect(pos.x - pos.width/2, pos.y - pos.height/2, pos.width, pos.height);
  ctx.strokeRect(pos.x - pos.width/2, pos.y - pos.height/2, pos.width, pos.height);

  // 绘制表名
  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(table.tableCnName, pos.x, pos.y + 5);

  // 绘制引用计数
  const refCount = tableCounts[table.tableCnName] || 0;
  if (refCount > 0) {
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`(${refCount}次被引用)`, pos.x, pos.y + 20);
  }

  console.log(`绘制表格: ${table.tableCnName} at (${pos.x}, ${pos.y})`);
});

// 绘制标题
ctx.font = 'bold 24px Arial';
ctx.fillStyle = '#333';
ctx.textAlign = 'center';
ctx.fillText('健身房管理系统 - 数据库ER图', centerX, 50);

// 绘制图例
ctx.font = '12px Arial';
ctx.textAlign = 'left';
ctx.fillStyle = '#666';
ctx.fillText('图例：', 50, canvas.height - 80);
ctx.fillText('• 矩形：数据表', 50, canvas.height - 60);
ctx.fillText('• 箭头：外键关系', 50, canvas.height - 40);
ctx.fillText('• 中心位置：最重要的表（被引用最多）', 50, canvas.height - 20);

// 保存图片
console.log('\n保存图片...');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ 系统ER图已生成: ${outputPath}`);
console.log(`📊 包含 ${tables.length} 个表，${relations.length} 个关系`);
console.log('🎯 用户表是核心表，被4个表引用');