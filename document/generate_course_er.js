const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 解析SQL CREATE TABLE语句
function parseSqlCreateTable(sql) {
  try {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    // 提取表名
    const tableMatch = cleanSql.match(/CREATE TABLE\s+`?(\w+)`?\s*\(/i);
    if (!tableMatch) {
      return null;
    }

    const tableName = tableMatch[1];

    // 提取字段定义部分
    const fieldsStart = cleanSql.indexOf('(');
    const fieldsEnd = cleanSql.lastIndexOf(')');
    const fieldsSection = cleanSql.substring(fieldsStart + 1, fieldsEnd);

    // 解析每个字段
    const fields = [];
    const fieldLines = fieldsSection.split(',').map(line => line.trim());

    for (const line of fieldLines) {
      if (line.startsWith('`') && !line.toUpperCase().includes('PRIMARY KEY') &&
          !line.toUpperCase().includes('KEY ') && !line.toUpperCase().includes('INDEX ')) {

        // 提取字段名
        const fieldMatch = line.match(/`(\w+)`/);
        if (!fieldMatch) continue;

        const fieldName = fieldMatch[1];

        // 提取注释
        let comment = '';
        const commentMatch = line.match(/COMMENT\s+['"](.*?)['"]/i);
        if (commentMatch) {
          comment = commentMatch[1];
        }

        fields.push({
          name: fieldName,
          comment: comment || fieldName
        });
      }
    }

    return {
      tableName,
      fields
    };

  } catch (error) {
    return null;
  }
}

// 生成ER图
function generateERImage(tableInfo, outputPath) {
  const { tableName, fields } = tableInfo;

  // 画布设置
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // 中心表名矩形
  const centerX = width / 2;
  const centerY = height / 2;
  const rectWidth = 120;
  const rectHeight = 40;

  // 绘制中心矩形
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight);

  // 表名文字
  ctx.fillStyle = 'black';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(tableName, centerX, centerY + 5);

  // 绘制属性椭圆
  const radius = 200; // 椭圆距离中心的半径
  const ellipseWidth = 80;
  const ellipseHeight = 25;

  fields.forEach((field, index) => {
    const angle = (2 * Math.PI * index) / fields.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    // 绘制椭圆
    ctx.beginPath();
    ctx.ellipse(x, y, ellipseWidth/2, ellipseHeight/2, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    // 椭圆背景
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();

    // 属性文字
    ctx.fillStyle = 'black';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    const text = field.comment || field.name;
    ctx.fillText(text, x, y + 3);

    // 连接线
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 保存图片
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`ER图已生成: ${outputPath}`);
}

// 课程表SQL
const courseSQL = `CREATE TABLE \`course\` (
  \`id\` bigint NOT NULL AUTO_INCREMENT COMMENT '课程ID',
  \`name\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '课程名称',
  \`description\` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '课程描述',
  \`teacher_id\` bigint NOT NULL COMMENT '教师ID',
  \`category_id\` bigint NOT NULL COMMENT '课程分类ID',
  \`price\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '课程价格',
  \`duration\` int NOT NULL DEFAULT '0' COMMENT '课程时长(分钟)',
  \`level\` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner' COMMENT '课程难度',
  \`status\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '课程状态:0-下架,1-上架',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  KEY \`idx_teacher_id\` (\`teacher_id\`),
  KEY \`idx_category_id\` (\`category_id\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表';`;

// 解析并生成图片
const tableInfo = parseSqlCreateTable(courseSQL);
if (tableInfo) {
  const outputPath = path.join(__dirname, 'course_clean_er.png');
  generateERImage(tableInfo, outputPath);
} else {
  console.error('SQL解析失败');
}