/**
 * Web自动化测试工具 - 浏览器控制与接口监听的完整测试解决方案
 * 
 * 战略意义：
 * 1. 架构稳定性：通过Puppeteer沙箱隔离确保测试过程不会影响开发环境，
 *    即使测试脚本出错也不会破坏系统稳定性，提供安全可靠的自动化测试基础设施
 * 2. 平台统一性：实现跨浏览器、跨平台的统一测试接口，无论是Web应用还是小程序，
 *    都能通过相同的API进行自动化测试，降低测试成本和学习门槛
 * 3. 生态集成性：作为PromptX测试生态的核心组件，为其他工具提供浏览器控制、
 *    错误监听、接口验证等基础能力，支撑整个测试工具链的发展
 * 
 * 设计理念：
 * 采用"监听优先"的设计思想，通过被动监听页面错误和网络请求，
 * 而非主动轮询，确保测试的真实性和性能。同时提供灵活的断言机制，
 * 让AI能够基于业务逻辑自动判断测试结果，实现真正的智能化测试。
 * 
 * 核心价值：
 * 这不仅是一个自动化测试工具，更是AI驱动测试的基础设施，
 * 让AI能够像人类测试工程师一样理解和验证Web应用的行为。
 */

module.exports = {
  /**
   * 声明工具依赖
   */
  getDependencies() {
    return {
      'puppeteer': '^21.0.0',
      'lodash': '^4.17.21'
    };
  },

  /**
   * 工具元信息
   */
  getMetadata() {
    return {
      id: 'web-automation-test',
      name: 'Web自动化测试工具',
      description: '基于Puppeteer的Web/小程序自动化测试，支持控制台错误监听和接口验证',
      version: '1.0.0',
      author: '鲁班',
      tags: ['automation', 'testing', 'puppeteer', 'web', 'miniprogram']
    };
  },

  /**
   * 参数和环境变量定义
   */
  getSchema() {
    return {
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '要测试的网站URL或小程序路径',
            format: 'uri'
          },
          actions: {
            type: 'array',
            description: '要执行的操作列表',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['click', 'input', 'wait', 'screenshot', 'assert'],
                  description: '操作类型'
                },
                selector: {
                  type: 'string',
                  description: 'CSS选择器或元素标识'
                },
                value: {
                  type: 'string',
                  description: '输入值或等待时间'
                },
                expected: {
                  type: 'string',
                  description: '预期结果（用于断言）'
                }
              },
              required: ['type']
            },
            default: []
          },
          timeout: {
            type: 'number',
            description: '操作超时时间（毫秒）',
            minimum: 1000,
            maximum: 60000,
            default: 30000
          },
          headless: {
            type: 'boolean',
            description: '是否使用无头模式',
            default: true
          },
          captureErrors: {
            type: 'boolean',
            description: '是否捕获控制台错误',
            default: true
          },
          captureRequests: {
            type: 'boolean',
            description: '是否捕获网络请求',
            default: true
          },
          viewportWidth: {
            type: 'number',
            description: '浏览器视口宽度',
            minimum: 320,
            maximum: 2560,
            default: 1920
          },
          viewportHeight: {
            type: 'number',
            description: '浏览器视口高度',
            minimum: 200,
            maximum: 1440,
            default: 1080
          }
        },
        required: ['url']
      },
      environment: {
        type: 'object',
        properties: {
          PUPPETEER_EXECUTABLE_PATH: {
            type: 'string',
            description: 'Puppeteer可执行文件路径（可选）'
          }
        }
      }
    };
  },

  /**
   * 执行自动化测试
   */
  async execute(params) {
    const { api } = this;
    
    // 记录开始测试
    api.logger.info('开始Web自动化测试', { 
      url: params.url,
      actions: params.actions?.length || 0,
      headless: params.headless
    });

    let browser = null;
    let page = null;
    const testResults = {
      success: true,
      url: params.url,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      screenshots: [],
      consoleErrors: [],
      networkRequests: [],
      actionResults: [],
      errors: []
    };

    try {
      // 导入依赖
      const puppeteer = await api.importx('puppeteer');
      const _ = await api.importx('lodash');
      
      // 获取环境变量
      const executablePath = await api.environment.get('PUPPETEER_EXECUTABLE_PATH');
      
      // 启动浏览器
      const launchOptions = {
        headless: params.headless,
        defaultViewport: {
          width: params.viewportWidth || 1920,
          height: params.viewportHeight || 1080,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false
        },
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-features=VizDisplayCompositor'
        ]
      };
      
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      
      api.logger.info('启动浏览器', { options: launchOptions });
      browser = await puppeteer.launch(launchOptions);
      page = await browser.newPage();
      
      // 设置用户代理
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 监听控制台错误
      if (params.captureErrors) {
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const error = {
              timestamp: new Date().toISOString(),
              message: msg.text(),
              type: 'console-error',
              location: msg.location()
            };
            testResults.consoleErrors.push(error);
            api.logger.warn('控制台错误', error);
          }
        });
        
        page.on('pageerror', (error) => {
          const pageError = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            type: 'page-error'
          };
          testResults.consoleErrors.push(pageError);
          api.logger.error('页面错误', pageError);
        });
      }
      
      // 监听网络请求
      if (params.captureRequests) {
        page.on('response', (response) => {
          const request = {
            timestamp: new Date().toISOString(),
            url: response.url(),
            status: response.status(),
            method: response.request().method(),
            headers: response.headers(),
            type: 'network-response'
          };
          testResults.networkRequests.push(request);
          
          // 记录错误状态码
          if (response.status() >= 400) {
            api.logger.warn('HTTP错误响应', request);
          }
        });
      }
      
      // 导航到目标页面
      api.logger.info('导航到页面', { url: params.url });
      await page.goto(params.url, { 
        waitUntil: 'domcontentloaded',
        timeout: params.timeout 
      });
      
      // 等待页面加载完成
      await page.waitForTimeout(3000);
      
      // 确保页面完全加载
      try {
        await page.waitForSelector('body', { timeout: 5000 });
      } catch (error) {
        api.logger.warn('等待body元素超时', { error: error.message });
      }
      
      // 执行测试动作
      if (params.actions && params.actions.length > 0) {
        api.logger.info('开始执行测试动作', { count: params.actions.length });
        
        for (let i = 0; i < params.actions.length; i++) {
          const action = params.actions[i];
          const actionResult = {
            index: i,
            action: action,
            success: false,
            timestamp: new Date().toISOString(),
            error: null,
            result: null
          };
          
          try {
            api.logger.info(`执行动作 ${i + 1}/${params.actions.length}`, action);
            
            switch (action.type) {
              case 'click':
                if (!action.selector) throw new Error('click动作需要selector参数');
                await page.click(action.selector);
                actionResult.result = '点击成功';
                break;
                
              case 'input':
                if (!action.selector || !action.value) {
                  throw new Error('input动作需要selector和value参数');
                }
                await page.type(action.selector, action.value);
                actionResult.result = `输入: ${action.value}`;
                break;
                
              case 'wait':
                const waitTime = parseInt(action.value) || 1000;
                await page.waitForTimeout(waitTime);
                actionResult.result = `等待: ${waitTime}ms`;
                break;
                
              case 'screenshot':
                const screenshotBuffer = await page.screenshot({ 
                  type: 'png',
                  fullPage: true 
                });
                const screenshotData = {
                  timestamp: new Date().toISOString(),
                  filename: `screenshot_${i}.png`,
                  size: screenshotBuffer.length + ' bytes'
                };
                testResults.screenshots.push(screenshotData);
                actionResult.result = '截图完成';
                break;
                
              case 'assert':
                if (!action.selector || !action.expected) {
                  throw new Error('assert动作需要selector和expected参数');
                }
                const element = await page.$(action.selector);
                if (!element) {
                  throw new Error(`元素未找到: ${action.selector}`);
                }
                const actualText = await page.evaluate(el => el.textContent, element);
                if (actualText.includes(action.expected)) {
                  actionResult.result = `断言成功: ${actualText}`;
                } else {
                  throw new Error(`断言失败: 期望包含 "${action.expected}", 实际为 "${actualText}"`);
                }
                break;
                
              default:
                throw new Error(`未知的动作类型: ${action.type}`);
            }
            
            actionResult.success = true;
            api.logger.info(`动作 ${i + 1} 执行成功`, { result: actionResult.result });
            
          } catch (error) {
            actionResult.success = false;
            actionResult.error = error.message;
            testResults.success = false;
            api.logger.error(`动作 ${i + 1} 执行失败`, { error: error.message });
          }
          
          testResults.actionResults.push(actionResult);
          
          // 动作间隔
          await page.waitForTimeout(500);
        }
      }
      
      // 最终截图
      try {
        const finalScreenshot = await page.screenshot({ 
          type: 'png',
          fullPage: true 
        });
        testResults.screenshots.push({
          timestamp: new Date().toISOString(),
          filename: 'final_screenshot.png',
          size: finalScreenshot.length + ' bytes'
        });
      } catch (error) {
        api.logger.warn('最终截图失败', { error: error.message });
      }
      
      // 完成测试
      testResults.endTime = new Date().toISOString();
      testResults.duration = Date.now() - new Date(testResults.startTime).getTime();
      
      api.logger.info('测试完成', {
        success: testResults.success,
        duration: testResults.duration,
        consoleErrors: testResults.consoleErrors.length,
        networkRequests: testResults.networkRequests.length,
        screenshots: testResults.screenshots.length
      });
      
      return {
        success: true,
        data: testResults,
        summary: {
          testPassed: testResults.success,
          totalActions: testResults.actionResults.length,
          successfulActions: testResults.actionResults.filter(a => a.success).length,
          consoleErrors: testResults.consoleErrors.length,
          networkErrors: testResults.networkRequests.filter(r => r.status >= 400).length,
          testDuration: `${testResults.duration}ms`,
          screenshotCount: testResults.screenshots.length
        }
      };
      
    } catch (error) {
      testResults.success = false;
      testResults.errors.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        type: 'execution-error'
      });
      testResults.endTime = new Date().toISOString();
      testResults.duration = Date.now() - new Date(testResults.startTime).getTime();
      
      api.logger.error('测试执行失败', { error: error.message });
      
      return {
        success: false,
        error: error.message,
        data: testResults,
        suggestion: '请检查URL是否可访问，或查看详细错误信息进行调试'
      };
      
    } finally {
      // 清理资源
      try {
        if (page) await page.close();
        if (browser) await browser.close();
        api.logger.info('浏览器资源已清理');
      } catch (error) {
        api.logger.warn('清理资源失败', { error: error.message });
      }
    }
  },

  /**
   * 定义业务错误
   */
  getBusinessErrors() {
    return [
      {
        code: 'NAVIGATION_TIMEOUT',
        description: '页面导航超时',
        match: /Navigation timeout/i,
        solution: '增加timeout参数或检查网络连接',
        retryable: true
      },
      {
        code: 'ELEMENT_NOT_FOUND',
        description: '页面元素未找到',
        match: /Element.*not found|No element found/i,
        solution: '检查CSS选择器是否正确或等待元素加载',
        retryable: true
      },
      {
        code: 'BROWSER_LAUNCH_FAILED',
        description: '浏览器启动失败',
        match: /Failed to launch.*browser/i,
        solution: '检查Puppeteer安装或设置PUPPETEER_EXECUTABLE_PATH',
        retryable: false
      },
      {
        code: 'ASSERTION_FAILED',
        description: '断言验证失败',
        match: /断言失败/,
        solution: '检查预期结果是否正确',
        retryable: false
      }
    ];
  }
};