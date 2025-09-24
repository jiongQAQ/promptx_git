const fs = require('fs');
const path = require('path');

// 分析所有表的外键关系
const tablesDir = '/Users/jiongjiong/Documents/a_git_project/promptx_tools/projects/gym/paper/exports/tables';
const tables = [];
const relations = [];

// 读取所有JSON文件
const files = fs.readdirSync(tablesDir).filter(f => f.endsWith('.json'));

console.log('=== 健身房管理系统 - 表结构分析 ===\n');

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
      // 从说明中提取关联表信息
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

// 打印表信息
console.log('📊 数据库表概览:');
tables.forEach(table => {
  console.log(`- ${table.tableCnName} (${table.tableName}): ${table.columns.length}个字段`);
});

console.log('\n🔗 表关系分析:');
relations.forEach(rel => {
  console.log(`${rel.from} --[${rel.fromField}]--> ${rel.to}`);
});

console.log('\n📋 详细外键信息:');
tables.forEach(table => {
  if (table.foreignKeys.length > 0) {
    console.log(`\n${table.tableCnName}:`);
    table.foreignKeys.forEach(fk => {
      console.log(`  - ${fk.field} → ${fk.targetTable}`);
    });
  }
});

// 分析表的重要性（被其他表引用的次数）
const tableCounts = {};
relations.forEach(rel => {
  tableCounts[rel.to] = (tableCounts[rel.to] || 0) + 1;
});

console.log('\n📈 表重要性排序（被引用次数）:');
Object.entries(tableCounts)
  .sort(([,a], [,b]) => b - a)
  .forEach(([tableName, count]) => {
    console.log(`${tableName}: ${count}次`);
  });

// 导出数据供其他脚本使用
const analysisResult = {
  tables,
  relations,
  tableCounts
};

fs.writeFileSync(path.join(__dirname, 'table_analysis.json'), JSON.stringify(analysisResult, null, 2));
console.log('\n💾 分析结果已保存到 table_analysis.json');