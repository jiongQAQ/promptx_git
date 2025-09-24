const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 读取JSON文件并解析
const jsonPath = '/Users/jiongjiong/Documents/a_git_project/promptx_tools/projects/gym/paper/exports/tables/Tab-course.json';
const jsonContent = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(jsonContent);

console.log('JSON数据:', JSON.stringify(data, null, 2));

// 解析JSON数据
function parseJsonData(data) {
  const tableName = data.tableCnName || data.tableName;
  const columns = data.columns;

  if (!columns || !Array.isArray(columns) || columns.length < 2) {
    return null;
  }

  // 第一行是标题行，跳过
  const fields = [];
  for (let i = 1; i < columns.length; i++) {
    const row = columns[i];
    if (Array.isArray(row) && row.length >= 2) {
      fields.push({
        name: row[0],        // 字段名
        cnName: row[1],      // 字段中文名
        type: row[2] || '',  // 类型
        comment: row[1]      // 使用中文名作为显示文本
      });
    }
  }

  return {
    tableName: data.tableName,
    tableCnName: tableName,
    fields
  };
}

const tableInfo = parseJsonData(data);
console.log('解析后的表信息:', JSON.stringify(tableInfo, null, 2));

// 生成ER图
function generateERImage(tableInfo, outputPath) {
  const { tableCnName, fields } = tableInfo;
  console.log('开始生成ER图:', tableCnName, '字段数量:', fields.length);

  // 画布设置
  const width = 1000;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  console.log('Canvas创建成功');

  // 背景
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // 中心表名矩形
  const centerX = width / 2;
  const centerY = height / 2;
  const rectWidth = 140;
  const rectHeight = 50;

  // 绘制中心矩形
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight);

  // 矩形背景
  ctx.fillStyle = '#f0f8ff';
  ctx.fillRect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight);
  ctx.strokeRect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight);

  // 表名文字
  ctx.fillStyle = 'black';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tableCnName, centerX, centerY);

  console.log('中心矩形和表名绘制完成');

  // 绘制属性椭圆
  const radius = 280;
  const ellipseWidth = 120;
  const ellipseHeight = 35;

  fields.forEach((field, index) => {
    const angle = (2 * Math.PI * index) / fields.length;
    const ellipseX = centerX + radius * Math.cos(angle);
    const ellipseY = centerY + radius * Math.sin(angle);

    // 绘制椭圆
    ctx.beginPath();
    ctx.ellipse(ellipseX, ellipseY, ellipseWidth/2, ellipseHeight/2, 0, 0, 2 * Math.PI);

    // 椭圆背景
    ctx.fillStyle = '#fffacd';
    ctx.fill();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 属性文字
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = field.comment || field.cnName || field.name;
    ctx.fillText(text, ellipseX, ellipseY);

    // 计算连接线的起点和终点
    const dx = ellipseX - centerX;
    const dy = ellipseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;

    // 矩形边缘点
    let rectEdgeX, rectEdgeY;
    if (Math.abs(unitX) > Math.abs(unitY) * (rectWidth / rectHeight)) {
      rectEdgeX = centerX + (unitX > 0 ? rectWidth/2 : -rectWidth/2);
      rectEdgeY = centerY + (rectWidth/2) * unitY / Math.abs(unitX);
    } else {
      rectEdgeX = centerX + (rectHeight/2) * unitX / Math.abs(unitY);
      rectEdgeY = centerY + (unitY > 0 ? rectHeight/2 : -rectHeight/2);
    }

    // 椭圆边缘点
    const ellipseEdgeX = ellipseX - (ellipseWidth/2) * unitX;
    const ellipseEdgeY = ellipseY - (ellipseHeight/2) * unitY;

    // 绘制连接线
    ctx.beginPath();
    ctx.moveTo(rectEdgeX, rectEdgeY);
    ctx.lineTo(ellipseEdgeX, ellipseEdgeY);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    console.log(`字段 ${index + 1}: ${text} 绘制完成`);
  });

  console.log('所有椭圆和连接线绘制完成');

  // 保存图片
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`ER图已生成: ${outputPath}`);
}

if (tableInfo) {
  const outputPath = '/Users/jiongjiong/.promptx/document/test_course_er.png';
  generateERImage(tableInfo, outputPath);
} else {
  console.error('JSON解析失败');
}