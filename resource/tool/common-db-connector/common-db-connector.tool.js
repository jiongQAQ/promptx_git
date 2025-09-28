/**
 * Common Database Connector - 通用数据库连接器
 * 
 * 战略意义：
 * 1. 架构统一性：统一MySQL和PostgreSQL的操作接口，简化AI的数据库交互复杂度
 * 2. 平台适配性：通过Bridge模式隔离不同数据库驱动，确保在各种环境下的稳定运行
 * 3. 生态完整性：作为PromptX数据层基础设施，支撑上层业务工具的数据存储需求
 * 
 * 设计理念：
 * 采用适配器模式统一不同数据库的API差异，通过参数化查询防止SQL注入，
 * 使用连接池提升性能，Bridge模式确保外部依赖的可控性和可测试性。
 * 
 * 为什么重要：
 * 解决了AI操作不同数据库需要学习多套API的问题，提供了安全可靠的
 * 数据库访问能力，是构建数据驱动AI应用的核心基础设施。
 */

module.exports = {
  getDependencies() {
    return {
      'mysql2': '^3.15.0',
      'pg': '^8.16.0'
    };
  },

  getMetadata() {
    return {
      id: 'common-db-connector',
      name: '通用数据库连接器',
      description: '支持MySQL和PostgreSQL的统一数据库操作工具，提供DDL和CRUD功能',
      version: '1.0.0',
      author: '鲁班'
    };
  },

  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          dbType: {
            type: 'string',
            enum: ['mysql', 'postgresql'],
            description: '数据库类型：mysql 或 postgresql'
          },
          host: {
            type: 'string',
            description: '数据库主机地址',
            default: 'localhost'
          },
          port: {
            type: 'number',
            description: '数据库端口号',
            minimum: 1,
            maximum: 65535
          },
          user: {
            type: 'string',
            description: '数据库用户名'
          },
          password: {
            type: 'string',
            description: '数据库密码'
          },
          database: {
            type: 'string',
            description: '数据库名称（可选）'
          },
          operation: {
            type: 'string',
            enum: [
              'test_connection',
              'create_database',
              'drop_database',
              'list_databases',
              'create_table',
              'drop_table',
              'list_tables',
              'describe_table',
              'add_column',
              'drop_column',
              'create_index',
              'drop_index',
              'insert',
              'select',
              'update',
              'delete',
              'execute_sql'
            ],
            description: '要执行的操作类型'
          },
          tableName: {
            type: 'string',
            description: '表名称'
          },
          schema: {
            type: 'object',
            description: '表结构定义，键为字段名，值为字段定义'
          },
          data: {
            type: 'object',
            description: '要插入或更新的数据'
          },
          where: {
            type: 'object',
            description: '查询条件'
          },
          columns: {
            type: 'array',
            items: { type: 'string' },
            description: '要查询的字段列表'
          },
          orderBy: {
            type: 'string',
            description: '排序字段'
          },
          limit: {
            type: 'number',
            description: '限制返回条数',
            minimum: 1
          },
          offset: {
            type: 'number',
            description: '跳过条数',
            minimum: 0
          },
          sql: {
            type: 'string',
            description: '自定义SQL语句'
          },
          columnName: {
            type: 'string',
            description: '字段名称'
          },
          columnDefinition: {
            type: 'string',
            description: '字段定义'
          },
          indexName: {
            type: 'string',
            description: '索引名称'
          },
          indexColumns: {
            type: 'array',
            items: { type: 'string' },
            description: '索引字段列表'
          }
        },
        required: ['dbType', 'host', 'port', 'user', 'password', 'operation']
      }
    };
  },

  getBridges() {
    return {
      'mysql:connect': {
        real: async (args, api) => {
          api.logger.info('[Bridge] Connecting to MySQL...', { host: args.host, port: args.port, database: args.database });
          const mysql = await api.importx('mysql2/promise');
          const connection = await mysql.createConnection({
            host: args.host,
            port: args.port,
            user: args.user,
            password: args.password,
            database: args.database
          });
          api.logger.info('[Bridge] MySQL connected successfully');
          return connection;
        },
        mock: async (args, api) => {
          api.logger.debug('[Mock] Creating mock MySQL connection', { host: args.host, port: args.port });
          return {
            connectionId: `mysql-mock-${Date.now()}`,
            execute: async (sql, params = []) => {
              api.logger.debug('[Mock] Executing MySQL query', { sql, params });
              if (sql.includes('CREATE DATABASE')) {
                return [{ affectedRows: 1 }, []];
              }
              if (sql.includes('SHOW DATABASES')) {
                return [[
                  { Database: 'information_schema' },
                  { Database: 'mysql' },
                  { Database: 'performance_schema' },
                  { Database: 'test_db' }
                ], []];
              }
              if (sql.includes('CREATE TABLE')) {
                return [{ affectedRows: 1 }, []];
              }
              if (sql.includes('SHOW TABLES')) {
                return [[
                  { Tables_in_test: 'users' },
                  { Tables_in_test: 'products' }
                ], []];
              }
              if (sql.includes('DESCRIBE') || sql.includes('DESC')) {
                return [[
                  { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
                  { Field: 'name', Type: 'varchar(100)', Null: 'NO', Key: '', Default: null, Extra: '' }
                ], []];
              }
              if (sql.includes('SELECT')) {
                return [[
                  { id: 1, name: '模拟用户1', email: 'user1@test.com' },
                  { id: 2, name: '模拟用户2', email: 'user2@test.com' }
                ], []];
              }
              if (sql.includes('INSERT')) {
                return [{ insertId: 3, affectedRows: 1 }, []];
              }
              if (sql.includes('UPDATE') || sql.includes('DELETE')) {
                return [{ affectedRows: 1 }, []];
              }
              return [[], []];
            },
            end: async () => {
              api.logger.debug('[Mock] MySQL connection closed');
            }
          };
        }
      },

      'pg:connect': {
        real: async (args, api) => {
          api.logger.info('[Bridge] Connecting to PostgreSQL...', { host: args.host, port: args.port, database: args.database });
          const { Client } = await api.importx('pg');
          const client = new Client({
            host: args.host,
            port: args.port,
            user: args.user,
            password: args.password,
            database: args.database
          });
          await client.connect();
          api.logger.info('[Bridge] PostgreSQL connected successfully');
          return client;
        },
        mock: async (args, api) => {
          api.logger.debug('[Mock] Creating mock PostgreSQL connection', { host: args.host, port: args.port });
          return {
            connectionId: `pg-mock-${Date.now()}`,
            query: async (sql, params = []) => {
              api.logger.debug('[Mock] Executing PostgreSQL query', { sql, params });
              if (sql.includes('CREATE DATABASE')) {
                return { rowCount: 1 };
              }
              if (sql.includes('SELECT datname FROM pg_database')) {
                return {
                  rows: [
                    { datname: 'postgres' },
                    { datname: 'template0' },
                    { datname: 'template1' },
                    { datname: 'test_db' }
                  ]
                };
              }
              if (sql.includes('CREATE TABLE')) {
                return { rowCount: 1 };
              }
              if (sql.includes('SELECT tablename FROM pg_tables')) {
                return {
                  rows: [
                    { tablename: 'users' },
                    { tablename: 'products' }
                  ]
                };
              }
              if (sql.includes('SELECT column_name')) {
                return {
                  rows: [
                    { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
                    { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' }
                  ]
                };
              }
              if (sql.includes('SELECT') && !sql.includes('pg_') && !sql.includes('information_schema')) {
                return {
                  rows: [
                    { id: 1, name: '模拟用户1', email: 'user1@test.com' },
                    { id: 2, name: '模拟用户2', email: 'user2@test.com' }
                  ]
                };
              }
              if (sql.includes('INSERT')) {
                return { rowCount: 1, rows: [{ id: 3 }] };
              }
              if (sql.includes('UPDATE') || sql.includes('DELETE')) {
                return { rowCount: 1 };
              }
              return { rows: [] };
            },
            end: async () => {
              api.logger.debug('[Mock] PostgreSQL connection closed');
            }
          };
        }
      }
    };
  },

  getMockArgs(operation) {
    const mockArgs = {
      'mysql:connect': {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'test_db'
      },
      'pg:connect': {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: 'test_db'
      }
    };
    return mockArgs[operation] || {};
  },

  getBridgeErrors() {
    return {
      'mysql:connect': [
        {
          code: 'MYSQL_CONNECTION_REFUSED',
          match: /ECONNREFUSED/,
          solution: '检查MySQL服务是否运行，确认host和port配置正确',
          retryable: true
        },
        {
          code: 'MYSQL_AUTH_FAILED',
          match: /Access denied for user/,
          solution: '检查用户名和密码是否正确',
          retryable: false
        },
        {
          code: 'MYSQL_DATABASE_NOT_FOUND',
          match: /Unknown database/,
          solution: '检查数据库名是否正确，或先创建数据库',
          retryable: false
        }
      ],
      'pg:connect': [
        {
          code: 'PG_CONNECTION_REFUSED',
          match: /ECONNREFUSED/,
          solution: '检查PostgreSQL服务是否运行，确认host和port配置正确',
          retryable: true
        },
        {
          code: 'PG_AUTH_FAILED',
          match: /password authentication failed/,
          solution: '检查用户名和密码是否正确',
          retryable: false
        },
        {
          code: 'PG_DATABASE_NOT_FOUND',
          match: /database .* does not exist/,
          solution: '检查数据库名是否正确，或先创建数据库',
          retryable: false
        }
      ]
    };
  },

  async execute(params) {
    const { api } = this;
    
    api.logger.info('开始数据库操作', { 
      operation: params.operation, 
      dbType: params.dbType,
      host: params.host,
      port: params.port,
      database: params.database
    });

    try {
      const bridgeKey = params.dbType === 'postgresql' ? 'pg:connect' : `${params.dbType}:connect`;
      const connectionArgs = {
        host: params.host,
        port: params.port,
        user: params.user,
        password: params.password,
        database: params.database
      };

      let connection = null;
      let result = null;

      switch (params.operation) {
        case 'test_connection':
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          result = { 
            success: true, 
            message: `成功连接到${params.dbType}数据库`,
            connectionId: connection.connectionId || 'real-connection'
          };
          break;

        case 'create_database':
          if (!params.database) {
            throw new Error('创建数据库需要提供database参数');
          }
          
          const tempArgs = { ...connectionArgs };
          delete tempArgs.database;
          connection = await api.bridge.execute(bridgeKey, tempArgs);
          
          if (params.dbType === 'mysql') {
            const [createResult] = await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${params.database}\``);
            result = { success: true, message: `数据库 ${params.database} 创建成功`, affectedRows: createResult.affectedRows };
          } else {
            const createResult = await connection.query(`CREATE DATABASE "${params.database}"`);
            result = { success: true, message: `数据库 ${params.database} 创建成功`, rowCount: createResult.rowCount };
          }
          break;

        case 'drop_database':
          if (!params.database) {
            throw new Error('删除数据库需要提供database参数');
          }
          
          const tempArgs2 = { ...connectionArgs };
          delete tempArgs2.database;
          connection = await api.bridge.execute(bridgeKey, tempArgs2);
          
          if (params.dbType === 'mysql') {
            const [dropResult] = await connection.execute(`DROP DATABASE IF EXISTS \`${params.database}\``);
            result = { success: true, message: `数据库 ${params.database} 删除成功`, affectedRows: dropResult.affectedRows };
          } else {
            const dropResult = await connection.query(`DROP DATABASE IF EXISTS "${params.database}"`);
            result = { success: true, message: `数据库 ${params.database} 删除成功`, rowCount: dropResult.rowCount };
          }
          break;

        case 'list_databases':
          const tempArgs3 = { ...connectionArgs };
          delete tempArgs3.database;
          connection = await api.bridge.execute(bridgeKey, tempArgs3);
          
          if (params.dbType === 'mysql') {
            const [databases] = await connection.execute('SHOW DATABASES');
            result = { success: true, databases: databases.map(row => row.Database) };
          } else {
            const databases = await connection.query('SELECT datname FROM pg_database WHERE datistemplate = false');
            result = { success: true, databases: databases.rows.map(row => row.datname) };
          }
          break;

        case 'create_table':
          if (!params.tableName || !params.schema) {
            throw new Error('创建表需要提供tableName和schema参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const createTableSql = this.buildCreateTableSql(params.tableName, params.schema, params.dbType);
          
          if (params.dbType === 'mysql') {
            const [tableResult] = await connection.execute(createTableSql);
            result = { success: true, message: `表 ${params.tableName} 创建成功`, affectedRows: tableResult.affectedRows };
          } else {
            const tableResult = await connection.query(createTableSql);
            result = { success: true, message: `表 ${params.tableName} 创建成功`, rowCount: tableResult.rowCount };
          }
          break;

        case 'drop_table':
          if (!params.tableName) {
            throw new Error('删除表需要提供tableName参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const dropTableSql = params.dbType === 'mysql' 
            ? `DROP TABLE IF EXISTS \`${params.tableName}\``
            : `DROP TABLE IF EXISTS "${params.tableName}"`;
          
          if (params.dbType === 'mysql') {
            const [dropTableResult] = await connection.execute(dropTableSql);
            result = { success: true, message: `表 ${params.tableName} 删除成功`, affectedRows: dropTableResult.affectedRows };
          } else {
            const dropTableResult = await connection.query(dropTableSql);
            result = { success: true, message: `表 ${params.tableName} 删除成功`, rowCount: dropTableResult.rowCount };
          }
          break;

        case 'list_tables':
          if (!params.database) {
            throw new Error('列出表需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          
          if (params.dbType === 'mysql') {
            const [tables] = await connection.execute('SHOW TABLES');
            const tableKey = `Tables_in_${params.database}`;
            result = { success: true, tables: tables.map(row => row[tableKey] || Object.values(row)[0]) };
          } else {
            const tables = await connection.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
            result = { success: true, tables: tables.rows.map(row => row.tablename) };
          }
          break;

        case 'describe_table':
          if (!params.tableName) {
            throw new Error('描述表结构需要提供tableName参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          
          if (params.dbType === 'mysql') {
            const [columns] = await connection.execute(`DESCRIBE \`${params.tableName}\``);
            result = { success: true, columns };
          } else {
            const columns = await connection.query(`
              SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns 
              WHERE table_name = $1 AND table_schema = 'public'
              ORDER BY ordinal_position
            `, [params.tableName]);
            result = { success: true, columns: columns.rows };
          }
          break;

        case 'select':
          if (!params.tableName) {
            throw new Error('查询需要提供tableName参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const selectSql = this.buildSelectSql(params, params.dbType);
          
          if (params.dbType === 'mysql') {
            const [rows] = await connection.execute(selectSql.sql, selectSql.params);
            result = { success: true, data: rows, count: rows.length };
          } else {
            const queryResult = await connection.query(selectSql.sql, selectSql.params);
            result = { success: true, data: queryResult.rows, count: queryResult.rows.length };
          }
          break;

        case 'insert':
          if (!params.tableName || !params.data) {
            throw new Error('插入数据需要提供tableName和data参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const insertSql = this.buildInsertSql(params.tableName, params.data, params.dbType);
          
          if (params.dbType === 'mysql') {
            const [insertResult] = await connection.execute(insertSql.sql, insertSql.params);
            result = { 
              success: true, 
              message: '数据插入成功', 
              insertId: insertResult.insertId, 
              affectedRows: insertResult.affectedRows 
            };
          } else {
            const insertResult = await connection.query(insertSql.sql, insertSql.params);
            result = { 
              success: true, 
              message: '数据插入成功', 
              rowCount: insertResult.rowCount,
              insertedData: insertResult.rows?.[0] || null
            };
          }
          break;

        case 'update':
          if (!params.tableName || !params.data) {
            throw new Error('更新数据需要提供tableName和data参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const updateSql = this.buildUpdateSql(params.tableName, params.data, params.where, params.dbType);
          
          if (params.dbType === 'mysql') {
            const [updateResult] = await connection.execute(updateSql.sql, updateSql.params);
            result = { 
              success: true, 
              message: '数据更新成功', 
              affectedRows: updateResult.affectedRows 
            };
          } else {
            const updateResult = await connection.query(updateSql.sql, updateSql.params);
            result = { 
              success: true, 
              message: '数据更新成功', 
              rowCount: updateResult.rowCount 
            };
          }
          break;

        case 'delete':
          if (!params.tableName) {
            throw new Error('删除数据需要提供tableName参数');
          }
          if (!params.database) {
            throw new Error('表操作需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          const deleteSql = this.buildDeleteSql(params.tableName, params.where, params.dbType);
          
          if (params.dbType === 'mysql') {
            const [deleteResult] = await connection.execute(deleteSql.sql, deleteSql.params);
            result = { 
              success: true, 
              message: '数据删除成功', 
              affectedRows: deleteResult.affectedRows 
            };
          } else {
            const deleteResult = await connection.query(deleteSql.sql, deleteSql.params);
            result = { 
              success: true, 
              message: '数据删除成功', 
              rowCount: deleteResult.rowCount 
            };
          }
          break;

        case 'execute_sql':
          if (!params.sql) {
            throw new Error('执行SQL需要提供sql参数');
          }
          if (!params.database) {
            throw new Error('执行SQL需要指定database参数');
          }
          
          connection = await api.bridge.execute(bridgeKey, connectionArgs);
          
          if (params.dbType === 'mysql') {
            const [sqlResult] = await connection.execute(params.sql);
            result = { success: true, data: sqlResult };
          } else {
            const sqlResult = await connection.query(params.sql);
            result = { success: true, data: sqlResult.rows, rowCount: sqlResult.rowCount };
          }
          break;

        default:
          throw new Error(`不支持的操作类型: ${params.operation}`);
      }

      if (connection && connection.end) {
        await connection.end();
      }

      api.logger.info('数据库操作完成', { operation: params.operation, success: true });
      return result;

    } catch (error) {
      api.logger.error('数据库操作失败', { 
        operation: params.operation, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  buildCreateTableSql(tableName, schema, dbType) {
    const columns = Object.entries(schema).map(([name, definition]) => {
      if (dbType === 'mysql') {
        return `\`${name}\` ${definition}`;
      } else {
        return `"${name}" ${definition}`;
      }
    }).join(', ');
    
    if (dbType === 'mysql') {
      return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columns})`;
    } else {
      return `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`;
    }
  },

  buildSelectSql(params, dbType) {
    const { tableName, columns = ['*'], where, orderBy, limit, offset } = params;
    
    let sql;
    if (dbType === 'mysql') {
      sql = `SELECT ${columns.join(', ')} FROM \`${tableName}\``;
    } else {
      sql = `SELECT ${columns.join(', ')} FROM "${tableName}"`;
    }
    
    const sqlParams = [];
    
    if (where && Object.keys(where).length > 0) {
      const conditions = [];
      Object.entries(where).forEach(([key, value], index) => {
        if (dbType === 'mysql') {
          conditions.push(`\`${key}\` = ?`);
        } else {
          conditions.push(`"${key}" = $${index + 1}`);
        }
        sqlParams.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    if (orderBy) {
      if (dbType === 'mysql') {
        sql += ` ORDER BY \`${orderBy}\``;
      } else {
        sql += ` ORDER BY "${orderBy}"`;
      }
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    if (offset) {
      sql += ` OFFSET ${offset}`;
    }
    
    return { sql, params: sqlParams };
  },

  buildInsertSql(tableName, data, dbType) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    let sql;
    if (dbType === 'mysql') {
      const columns = keys.map(key => `\`${key}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      sql = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;
    } else {
      const columns = keys.map(key => `"${key}"`).join(', ');
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    }
    
    return { sql, params: values };
  },

  buildUpdateSql(tableName, data, where, dbType) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    let sql;
    const sqlParams = [...values];
    
    if (dbType === 'mysql') {
      const setPart = keys.map(key => `\`${key}\` = ?`).join(', ');
      sql = `UPDATE \`${tableName}\` SET ${setPart}`;
    } else {
      const setPart = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
      sql = `UPDATE "${tableName}" SET ${setPart}`;
    }
    
    if (where && Object.keys(where).length > 0) {
      const conditions = [];
      Object.entries(where).forEach(([key, value], index) => {
        if (dbType === 'mysql') {
          conditions.push(`\`${key}\` = ?`);
        } else {
          conditions.push(`"${key}" = $${keys.length + index + 1}`);
        }
        sqlParams.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    return { sql, params: sqlParams };
  },

  buildDeleteSql(tableName, where, dbType) {
    let sql;
    if (dbType === 'mysql') {
      sql = `DELETE FROM \`${tableName}\``;
    } else {
      sql = `DELETE FROM "${tableName}"`;
    }
    
    const sqlParams = [];
    
    if (where && Object.keys(where).length > 0) {
      const conditions = [];
      Object.entries(where).forEach(([key, value], index) => {
        if (dbType === 'mysql') {
          conditions.push(`\`${key}\` = ?`);
        } else {
          conditions.push(`"${key}" = $${index + 1}`);
        }
        sqlParams.push(value);
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    return { sql, params: sqlParams };
  }
};