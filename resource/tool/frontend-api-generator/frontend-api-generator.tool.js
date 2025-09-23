/**
 * 前端API生成器 - 从Spring Boot Controller自动生成前端API调用文件
 * 
 * 战略意义：
 * 1. 开发效率价值：消除前后端API对接的手工重复劳动，显著提升开发效率
 * 2. 一致性保证：确保前端API调用与后端接口定义完全一致，减少对接错误
 * 3. 多平台支持：统一生成Vue和UniApp项目的API文件，支持多端开发
 * 
 * 设计理念：
 * 基于Java Controller注解的静态分析，通过AST解析自动提取API信息，
 * 智能处理路径映射、参数传递、认证模式等细节，生成符合各前端框架
 * 规范的API调用代码。避免手工维护带来的不一致性和低效率问题。
 * 
 * 生态定位：
 * 作为BMAD工作流中前后端协同的关键工具，连接Java后端开发和前端开发，
 * 实现代码生成驱动的开发模式，是全栈开发效率提升的核心组件。
 */

module.exports = {
    getDependencies() {
        return {};
    },

    getMetadata() {
        return {
            id: 'frontend-api-generator',
            name: '前端API生成器',
            description: '从Spring Boot Controller自动生成前端API调用文件，支持Vue和UniApp项目',
            version: '1.0.0',
            author: '鲁班',
            category: 'code-generator',
            tags: ['frontend', 'api', 'vue', 'uniapp', 'spring-boot']
        };
    },

    getSchema() {
        return {
            parameters: {
                type: 'object',
                properties: {
                    controllerPath: {
                        type: 'string',
                        description: 'Spring Boot Controller文件路径（相对或绝对路径）',
                        minLength: 1
                    },
                    projects: {
                        type: 'array',
                        description: '目标前端项目列表',
                        items: {
                            type: 'string',
                            enum: ['admin_front', 'user_front', 'mini_program']
                        },
                        default: ['admin_front', 'user_front', 'mini_program']
                    },
                    pathStrategy: {
                        type: 'string',
                        description: 'API路径处理策略',
                        enum: ['smart', 'keep'],
                        default: 'smart'
                    },
                    authMode: {
                        type: 'string',
                        description: '认证模式',
                        enum: ['auto', 'auth', 'public'],
                        default: 'auto'
                    },
                    overwrite: {
                        type: 'boolean',
                        description: '是否覆盖已存在的文件',
                        default: true
                    },
                    outputBaseDir: {
                        type: 'string',
                        description: '输出基础目录',
                        default: 'project'
                    }
                },
                required: ['controllerPath']
            }
        };
    },

    async execute(params) {
        const { api } = this;
        const {
            controllerPath,
            projects = ['admin_front', 'user_front', 'mini_program'],
            pathStrategy = 'smart',
            authMode = 'auto',
            overwrite = true,
            outputBaseDir = 'project'
        } = params;

        try {
            api.logger.info('开始生成前端API调用文件', {
                controllerPath,
                projects,
                pathStrategy,
                authMode
            });

            // 导入依赖
            const fs = await api.importx('fs');
            const path = await api.importx('path');

            // 1. 读取Controller文件
            const controllerContent = await this.readControllerFile(controllerPath, fs, path);

            // 2. 解析Controller获取API信息
            const apiInfo = this.parseController(controllerContent);
            api.logger.info('Controller解析完成', { apisCount: apiInfo.length });

            // 3. 处理API路径
            const processedApis = this.processApiPaths(apiInfo, pathStrategy);

            // 4. 为每个项目生成API文件
            const results = [];
            for (const project of projects) {
                const result = await this.generateApiFile(project, processedApis, {
                    authMode,
                    overwrite,
                    outputBaseDir,
                    controllerPath,
                    fs,
                    path
                });
                results.push(result);
            }

            return {
                success: true,
                message: `成功为${projects.length}个前端项目生成API调用文件`,
                details: {
                    controllerName: this.extractControllerName(controllerPath),
                    apisCount: processedApis.length,
                    projects: results
                }
            };

        } catch (error) {
            api.logger.error('生成前端API文件失败', error);
            return {
                success: false,
                message: `生成失败: ${error.message}`,
                error: error.stack
            };
        }
    },

    /**
     * 读取Controller文件
     */
    async readControllerFile(controllerPath, fs, path) {
        try {
            const fullPath = path.isAbsolute(controllerPath)
                ? controllerPath
                : path.resolve(process.cwd(), controllerPath);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Controller文件不存在: ${fullPath}`);
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            this.api.logger.info('Controller文件读取成功', { path: fullPath });

            return content;
        } catch (error) {
            throw new Error(`读取Controller文件失败: ${error.message}`);
        }
    },

    /**
     * 解析Controller获取API信息
     */
    parseController(content) {
        const apis = [];

        // 1. 提取Controller基础信息
        const controllerInfo = this.extractControllerInfo(content);

        // 2. 提取所有API方法
        const methods = this.extractApiMethods(content);

        // 3. 组合API信息
        methods.forEach(method => {
            const fullPath = controllerInfo.basePath + method.path;

            apis.push({
                name: method.name,
                method: method.httpMethod,
                path: fullPath,
                originalPath: fullPath,
                description: method.description,
                parameters: method.parameters,
                returnType: method.returnType,
                requiresAuth: this.determineAuthRequirement(method, content)
            });
        });

        return apis;
    },

    /**
     * 提取Controller基础信息
     */
    extractControllerInfo(content) {
        // 提取@RequestMapping注解的路径
        const requestMappingMatch = content.match(/@RequestMapping\s*\(\s*["']([^"']+)["']\s*\)/);
        const basePath = requestMappingMatch ? requestMappingMatch[1] : '';

        // 提取Controller类名
        const classMatch = content.match(/public\s+class\s+(\w+Controller)/);
        const className = classMatch ? classMatch[1] : 'Unknown';

        // 提取@Tag注解的描述
        const tagMatch = content.match(/@Tag\s*\(\s*name\s*=\s*["']([^"']+)["']/);
        const description = tagMatch ? tagMatch[1] : '';

        return {
            className,
            basePath,
            description
        };
    },

    /**
     * 提取API方法信息
     */
    extractApiMethods(content) {
        const methods = [];

        // HTTP方法映射
        const httpMethods = [
            { annotation: 'GetMapping', method: 'GET' },
            { annotation: 'PostMapping', method: 'POST' },
            { annotation: 'PutMapping', method: 'PUT' },
            { annotation: 'DeleteMapping', method: 'DELETE' },
            { annotation: 'PatchMapping', method: 'PATCH' }
        ];

        // 分割成行来更精确地匹配
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 查找HTTP映射注解
            for (const { annotation, method: httpMethod } of httpMethods) {
                const mappingPattern = new RegExp(`@${annotation}\\s*\\(\\s*["']([^"']+)["']\\s*\\)`);
                const mappingMatch = line.match(mappingPattern);

                if (mappingMatch) {
                    const path = mappingMatch[1];

                    // 查找对应的方法定义
                    let methodInfo = this.findMethodDefinition(lines, i);
                    if (methodInfo) {
                        // 查找@Operation注解
                        const description = this.findOperationDescription(lines, i);

                        methods.push({
                            name: methodInfo.methodName,
                            path: path,
                            httpMethod,
                            description: description || this.generateDescription(methodInfo.methodName, httpMethod),
                            parameters: methodInfo.parameters,
                            returnType: methodInfo.returnType
                        });
                    }
                }
            }
        }

        return methods;
    },

    /**
     * 查找方法定义
     */
    findMethodDefinition(lines, startIndex) {
        // 从HTTP映射注解往下查找方法定义
        for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
            const line = lines[i].trim();

            // 匹配方法定义
            const methodPattern = /public\s+([\w<>,\s\[\]]+)\s+(\w+)\s*\(([^)]*)\)/;
            const methodMatch = line.match(methodPattern);

            if (methodMatch) {
                const [, returnType, methodName, parametersStr] = methodMatch;

                // 解析参数
                const parameters = this.parseMethodParameters(parametersStr, lines, i);

                return {
                    methodName,
                    returnType: returnType.trim(),
                    parameters
                };
            }
        }

        return null;
    },

    /**
     * 查找Operation描述
     */
    findOperationDescription(lines, startIndex) {
        // 从HTTP映射注解往上查找@Operation注解
        for (let i = Math.max(0, startIndex - 5); i <= startIndex; i++) {
            const line = lines[i].trim();
            const operationMatch = line.match(/@Operation\s*\(\s*summary\s*=\s*["']([^"']+)["']/);
            if (operationMatch) {
                return operationMatch[1];
            }
        }
        return null;
    },

    /**
     * 解析方法参数
     */
    parseMethodParameters(parametersStr, lines, lineIndex) {
        const parameters = {
            requestBody: null,
            requestParams: [],
            pathVariables: []
        };

        if (!parametersStr.trim()) {
            return parameters;
        }

        // 处理跨行参数的情况
        let fullParametersStr = parametersStr;
        if (!parametersStr.includes(')')) {
            // 参数可能跨多行，继续读取
            for (let i = lineIndex + 1; i < Math.min(lineIndex + 5, lines.length); i++) {
                fullParametersStr += ' ' + lines[i].trim();
                if (lines[i].includes(')')) {
                    break;
                }
            }
        }

        // 分割参数
        const paramParts = fullParametersStr.split(',').map(p => p.trim());

        for (const part of paramParts) {
            if (part.includes('@RequestBody')) {
                const bodyMatch = part.match(/@RequestBody[^)]*\s+(\w+)\s+(\w+)/);
                if (bodyMatch) {
                    parameters.requestBody = {
                        type: bodyMatch[1],
                        name: bodyMatch[2]
                    };
                }
            } else if (part.includes('@RequestParam')) {
                const paramMatch = part.match(/@RequestParam[^)]*\s+(\w+)\s+(\w+)/);
                if (paramMatch) {
                    parameters.requestParams.push({
                        type: paramMatch[1],
                        name: paramMatch[2]
                    });
                }
            } else if (part.includes('@PathVariable')) {
                const pathMatch = part.match(/@PathVariable[^)]*\s+(\w+)\s+(\w+)/);
                if (pathMatch) {
                    parameters.pathVariables.push({
                        type: pathMatch[1],
                        name: pathMatch[2]
                    });
                }
            }
        }

        return parameters;
    },

    /**
     * 判断是否需要认证
     */
    determineAuthRequirement(method, content) {
        // 简单规则：POST, PUT, DELETE通常需要认证，GET可能不需要
        const authRequiredMethods = ['POST', 'PUT', 'DELETE'];
        return authRequiredMethods.includes(method.httpMethod);
    },

    /**
     * 生成API描述
     */
    generateDescription(methodName, httpMethod) {
        const actionMap = {
            'GET': '查询',
            'POST': '创建',
            'PUT': '更新',
            'DELETE': '删除',
            'PATCH': '修改'
        };

        return `${actionMap[httpMethod] || '操作'}${methodName}`;
    },

    /**
     * 处理API路径（避免重复/api）
     */
    processApiPaths(apiInfo, strategy) {
        return apiInfo.map(api => {
            let processedPath = api.path;

            if (strategy === 'smart') {
                // 智能移除重复的/api前缀
                processedPath = api.path.replace(/^\/api/, '');

                // 确保路径以/开头
                if (!processedPath.startsWith('/')) {
                    processedPath = '/' + processedPath;
                }
            }

            return {
                ...api,
                processedPath: processedPath
            };
        });
    },

    /**
     * 为指定项目生成API文件
     */
    async generateApiFile(project, apis, options) {
        const { authMode, overwrite, outputBaseDir, controllerPath, fs, path } = options;

        // 获取Controller名称
        const controllerName = this.extractControllerName(controllerPath, path);
        const apiFileName = this.toKebabCase(controllerName.replace('Controller', ''));

        // 确定输出路径
        const outputPath = this.getOutputPath(project, apiFileName, outputBaseDir, path);

        // 生成API代码
        let apiCode;
        if (project === 'mini_program') {
            apiCode = this.generateUniAppCode(apis, controllerName, authMode);
        } else {
            apiCode = this.generateVueCode(apis, controllerName, authMode);
        }

        // 写入文件
        await this.writeApiFile(outputPath, apiCode, overwrite, fs, path);

        return {
            project,
            fileName: `${apiFileName}.js`,
            outputPath,
            apisCount: apis.length
        };
    },

    /**
     * 提取Controller名称
     */
    extractControllerName(controllerPath, path) {
        const fileName = path.basename(controllerPath, '.java');
        return fileName;
    },

    /**
     * 转换为kebab-case命名
     */
    toKebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    },

    /**
     * 转换为camelCase命名
     */
    toCamelCase(str) {
        return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    },

    /**
     * 获取输出路径
     */
    getOutputPath(project, apiFileName, outputBaseDir, path) {
        const projectPaths = {
            'admin_front': `${outputBaseDir}/admin_front/src/api`,
            'user_front': `${outputBaseDir}/user_front/src/api`,
            'mini_program': `${outputBaseDir}/mini_program/api`
        };

        const basePath = projectPaths[project];
        if (!basePath) {
            throw new Error(`不支持的项目类型: ${project}`);
        }

        return path.join(basePath, `${apiFileName}.js`);
    },

    /**
     * 生成Vue项目API代码
     */
    generateVueCode(apis, controllerName, authMode) {
        const entityName = controllerName.replace('Controller', '');
        const apiName = this.toCamelCase(this.toKebabCase(entityName));

        let code = `import { request } from '@/utils/request'\n\n`;
        code += `/**\n * ${entityName} API\n * 自动生成于 ${new Date().toISOString().split('T')[0]}\n */\n\n`;

        apis.forEach(api => {
            const functionName = this.generateFunctionName(api);
            const params = this.generateVueParameters(api);
            const requestCall = this.generateVueRequestCall(api, authMode);

            code += `// ${api.description}\n`;
            code += `export const ${functionName} = ${params} => {\n`;
            code += `  return ${requestCall}\n`;
            code += `}\n\n`;
        });

        return code;
    },

    /**
     * 生成UniApp项目API代码
     */
    generateUniAppCode(apis, controllerName, authMode) {
        const entityName = controllerName.replace('Controller', '');

        let code = `import { request } from '@/api/request'\n\n`;
        code += `/**\n * ${entityName} API\n * 自动生成于 ${new Date().toISOString().split('T')[0]}\n */\n\n`;

        apis.forEach(api => {
            const functionName = this.generateFunctionName(api);
            const params = this.generateUniAppParameters(api);
            const requestCall = this.generateUniAppRequestCall(api);

            code += `// ${api.description}\n`;
            code += `export const ${functionName} = ${params} => {\n`;
            code += `  return ${requestCall}\n`;
            code += `}\n\n`;
        });

        return code;
    },

    /**
     * 生成函数名
     */
    generateFunctionName(api) {
        const actionMap = {
            'GET': api.name.startsWith('get') ? api.name : `get${this.capitalize(api.name)}`,
            'POST': api.name.startsWith('create') || api.name.startsWith('add') ? api.name :
                   api.name === 'list' ? `get${this.capitalize(api.name)}` : api.name,
            'PUT': api.name.startsWith('update') ? api.name : `update${this.capitalize(api.name)}`,
            'DELETE': api.name.startsWith('delete') ? api.name : `delete${this.capitalize(api.name)}`,
            'PATCH': api.name.startsWith('patch') ? api.name : `patch${this.capitalize(api.name)}`
        };

        let functionName = actionMap[api.httpMethod] || api.name;

        // 处理JavaScript保留关键字
        functionName = this.handleReservedKeywords(functionName);

        return functionName;
    },

    /**
     * 处理JavaScript保留关键字
     */
    handleReservedKeywords(functionName) {
        const reservedKeywords = [
            'delete', 'import', 'export', 'default', 'function', 'var', 'let', 'const',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
            'return', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
            'class', 'extends', 'static', 'public', 'private', 'protected', 'async',
            'await', 'yield', 'from', 'as', 'with', 'typeof', 'instanceof', 'in'
        ];

        if (reservedKeywords.includes(functionName)) {
            // 对于delete关键字，使用remove作为替代
            if (functionName === 'delete') {
                return 'remove';
            }
            // 对于其他关键字，添加前缀
            return `api${this.capitalize(functionName)}`;
        }

        return functionName;
    },

    /**
     * 首字母大写
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * 生成Vue项目参数
     */
    generateVueParameters(api) {
        if (api.parameters.requestBody) {
            return '(data)';
        } else if (api.parameters.requestParams.length > 0) {
            if (api.parameters.requestParams.length === 1) {
                return `(${api.parameters.requestParams[0].name})`;
            } else {
                return '(params)';
            }
        } else {
            return '()';
        }
    },

    /**
     * 生成UniApp项目参数
     */
    generateUniAppParameters(api) {
        return this.generateVueParameters(api); // 与Vue项目相同
    },

    /**
     * 生成Vue项目请求调用
     */
    generateVueRequestCall(api, authMode) {
        const method = api.method.toLowerCase();
        const path = api.processedPath;

        // 确定使用public还是auth请求
        let requestType = 'auth';
        if (authMode === 'public') {
            requestType = 'public';
        } else if (authMode === 'auto') {
            requestType = api.requiresAuth ? 'auth' : 'public';
        }

        if (api.parameters.requestBody) {
            return `request.${requestType}.${method}('${path}', data)`;
        } else if (api.parameters.requestParams.length > 0) {
            if (method === 'get' || method === 'delete') {
                if (api.parameters.requestParams.length === 1) {
                    const paramName = api.parameters.requestParams[0].name;
                    return `request.${requestType}.${method}('${path}', { params: { ${paramName} } })`;
                } else {
                    return `request.${requestType}.${method}('${path}', { params })`;
                }
            } else {
                if (api.parameters.requestParams.length === 1) {
                    const paramName = api.parameters.requestParams[0].name;
                    return `request.${requestType}.${method}('${path}', { ${paramName} })`;
                } else {
                    return `request.${requestType}.${method}('${path}', params)`;
                }
            }
        } else {
            return `request.${requestType}.${method}('${path}')`;
        }
    },

    /**
     * 生成UniApp项目请求调用
     */
    generateUniAppRequestCall(api) {
        const method = api.method.toLowerCase();
        const path = api.processedPath;

        if (api.parameters.requestBody) {
            return `request.${method}('${path}', data)`;
        } else if (api.parameters.requestParams.length > 0) {
            if (api.parameters.requestParams.length === 1) {
                const paramName = api.parameters.requestParams[0].name;
                return `request.${method}('${path}', { ${paramName} })`;
            } else {
                return `request.${method}('${path}', params)`;
            }
        } else {
            return `request.${method}('${path}')`;
        }
    },

    /**
     * 写入API文件
     */
    async writeApiFile(outputPath, content, overwrite, fs, path) {
        const dir = path.dirname(outputPath);

        // 确保目录存在
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            this.api.logger.info('创建目录', { dir });
        }

        // 检查文件是否已存在
        if (fs.existsSync(outputPath) && !overwrite) {
            throw new Error(`文件已存在且未设置覆盖: ${outputPath}`);
        }

        // 写入文件
        fs.writeFileSync(outputPath, content, 'utf8');
        this.api.logger.info('API文件生成成功', { path: outputPath });
    }
};