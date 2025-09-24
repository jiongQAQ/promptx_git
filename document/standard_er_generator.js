const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

/**
 * 标准ER图生成器
 * 输入格式：JSON文件包含entities和relationships
 * 输出：标准ER图（矩形实体 + 菱形关系 + 基数标记）
 */

function generateStandardER(inputFile, outputFile) {
  console.log('=== 标准ER图生成器 ===\n');

  // 读取输入文件
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const { title, entities, relationships } = data;

  console.log(`标题: ${title}`);
  console.log(`实体数量: ${entities.length}`);
  console.log(`关系数量: ${relationships.length}`);

  // Canvas设置
  const canvas = createCanvas(1400, 1000);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 字体设置
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';

  // 布局算法：力导向布局的简化版本
  const entityPositions = {};
  const relationshipPositions = {};

  // 初始化实体位置（网格布局）
  const gridCols = Math.ceil(Math.sqrt(entities.length));
  const gridRows = Math.ceil(entities.length / gridCols);
  const startX = 150;
  const startY = 150;
  const spacingX = (canvas.width - 300) / Math.max(gridCols - 1, 1);
  const spacingY = (canvas.height - 300) / Math.max(gridRows - 1, 1);

  entities.forEach((entity, index) => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    entityPositions[entity.name] = {
      x: startX + col * spacingX,
      y: startY + row * spacingY,
      width: 100,
      height: 50
    };
  });

  // 计算关系的位置（在相关实体之间）
  relationships.forEach((rel, index) => {
    const entity1Pos = entityPositions[rel.entity1];
    const entity2Pos = entityPositions[rel.entity2];

    if (entity1Pos && entity2Pos) {
      const midX = (entity1Pos.x + entity2Pos.x) / 2;
      const midY = (entity1Pos.y + entity2Pos.y) / 2;

      // 添加一些随机偏移避免重叠
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;

      relationshipPositions[`${rel.entity1}-${rel.entity2}-${index}`] = {
        x: midX + offsetX,
        y: midY + offsetY,
        width: 80,
        height: 50,
        relationship: rel
      };
    }
  });

  // 绘制连接线
  console.log('\n绘制关系连线...');
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;

  Object.values(relationshipPositions).forEach(relPos => {
    const rel = relPos.relationship;
    const entity1Pos = entityPositions[rel.entity1];
    const entity2Pos = entityPositions[rel.entity2];

    if (entity1Pos && entity2Pos) {
      // 从实体1到关系的连线
      const line1 = calculateConnectionPoints(entity1Pos, relPos);
      ctx.beginPath();
      ctx.moveTo(line1.x1, line1.y1);
      ctx.lineTo(line1.x2, line1.y2);
      ctx.stroke();

      // 从关系到实体2的连线
      const line2 = calculateConnectionPoints(relPos, entity2Pos);
      ctx.beginPath();
      ctx.moveTo(line2.x1, line2.y1);
      ctx.lineTo(line2.x2, line2.y2);
      ctx.stroke();

      // 绘制基数标记
      drawCardinality(ctx, line1, rel.cardinality1);
      drawCardinality(ctx, line2, rel.cardinality2);
    }
  });

  // 绘制实体（矩形）
  console.log('绘制实体...');
  entities.forEach(entity => {
    const pos = entityPositions[entity.name];
    if (pos) {
      // 实体矩形
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.fillRect(pos.x - pos.width/2, pos.y - pos.height/2, pos.width, pos.height);
      ctx.strokeRect(pos.x - pos.width/2, pos.y - pos.height/2, pos.width, pos.height);

      // 实体名称
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(entity.name, pos.x, pos.y + 5);

      console.log(`实体: ${entity.name} at (${pos.x}, ${pos.y})`);
    }
  });

  // 绘制关系（菱形）
  console.log('绘制关系...');
  Object.values(relationshipPositions).forEach(relPos => {
    const rel = relPos.relationship;

    // 菱形路径
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(relPos.x, relPos.y - relPos.height/2); // 上
    ctx.lineTo(relPos.x + relPos.width/2, relPos.y); // 右
    ctx.lineTo(relPos.x, relPos.y + relPos.height/2); // 下
    ctx.lineTo(relPos.x - relPos.width/2, relPos.y); // 左
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 关系名称
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(rel.name, relPos.x, relPos.y + 4);

    console.log(`关系: ${rel.name} at (${relPos.x}, ${relPos.y})`);
  });

  // 绘制标题
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 40);

  // 保存文件
  console.log('\\n保存ER图...');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputFile, buffer);

  console.log(`✅ 标准ER图已生成: ${outputFile}`);
  console.log(`📊 包含 ${entities.length} 个实体，${relationships.length} 个关系`);
}

// 计算两个矩形/菱形之间的连接点
function calculateConnectionPoints(shape1, shape2) {
  const dx = shape2.x - shape1.x;
  const dy = shape2.y - shape1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return { x1: shape1.x, y1: shape1.y, x2: shape2.x, y2: shape2.y };

  const unitX = dx / distance;
  const unitY = dy / distance;

  // 计算shape1的边缘点
  let edge1X, edge1Y;
  if (Math.abs(unitX) > Math.abs(unitY) * (shape1.width / shape1.height)) {
    edge1X = shape1.x + (unitX > 0 ? shape1.width/2 : -shape1.width/2);
    edge1Y = shape1.y + (shape1.width/2) * unitY / Math.abs(unitX);
  } else {
    edge1X = shape1.x + (shape1.height/2) * unitX / Math.abs(unitY);
    edge1Y = shape1.y + (unitY > 0 ? shape1.height/2 : -shape1.height/2);
  }

  // 计算shape2的边缘点
  let edge2X, edge2Y;
  if (Math.abs(-unitX) > Math.abs(-unitY) * (shape2.width / shape2.height)) {
    edge2X = shape2.x + (-unitX > 0 ? shape2.width/2 : -shape2.width/2);
    edge2Y = shape2.y + (shape2.width/2) * (-unitY) / Math.abs(-unitX);
  } else {
    edge2X = shape2.x + (shape2.height/2) * (-unitX) / Math.abs(-unitY);
    edge2Y = shape2.y + ((-unitY) > 0 ? shape2.height/2 : -shape2.height/2);
  }

  return { x1: edge1X, y1: edge1Y, x2: edge2X, y2: edge2Y };
}

// 绘制基数标记
function drawCardinality(ctx, line, cardinality) {
  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;

  // 计算标记位置（稍微偏离线条）
  const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
  const offsetX = -Math.sin(angle) * 15;
  const offsetY = Math.cos(angle) * 15;

  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(cardinality, midX + offsetX, midY + offsetY);
}

// 如果直接运行此脚本
if (require.main === module) {
  const inputFile = process.argv[2] || '/Users/jiongjiong/.promptx/document/er_format_example.json';
  const outputFile = process.argv[3] || '/Users/jiongjiong/.promptx/document/standard_er_diagram.png';

  if (!fs.existsSync(inputFile)) {
    console.error(`错误：输入文件不存在 ${inputFile}`);
    process.exit(1);
  }

  generateStandardER(inputFile, outputFile);
}

module.exports = { generateStandardER };