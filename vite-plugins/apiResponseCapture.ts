/**
 * Vite 插件：API 响应捕获器
 * 自动保存 API 测试响应到本地文件，便于后续接入参考
 */

import type { Plugin, ViteDevServer } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

// 响应记录结构
interface ResponseRecord {
  module: string;
  method: string;
  endpoint: string;
  statusCode: number;
  timestamp: string;
  request?: unknown;
  response: unknown;
}

// 存储的响应记录
const responseRecords: Map<string, ResponseRecord> = new Map();

// 输出目录
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/api-responses');

/**
 * 生成记录的唯一键（模块+方法+状态码）
 */
function getRecordKey(module: string, method: string, statusCode: number): string {
  return `${module}/${method}_${statusCode}`;
}

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 保存响应到文件
 */
function saveResponses(): void {
  ensureDir(OUTPUT_DIR);

  // 按模块分组
  const groupedRecords: Record<string, ResponseRecord[]> = {};

  responseRecords.forEach((record, key) => {
    if (!groupedRecords[record.module]) {
      groupedRecords[record.module] = [];
    }
    groupedRecords[record.module].push(record);
  });

  // 写入文件
  Object.entries(groupedRecords).forEach(([module, records]) => {
    const moduleDir = path.join(OUTPUT_DIR, module);
    ensureDir(moduleDir);

    // 按方法和状态码保存
    records.forEach(record => {
      const fileName = `${record.method}_${record.statusCode}.json`;
      const filePath = path.join(moduleDir, fileName);

      const content = {
        endpoint: record.endpoint,
        method: record.method,
        statusCode: record.statusCode,
        capturedAt: record.timestamp,
        request: record.request,
        response: record.response,
      };

      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    });
  });

  // 更新索引文件
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  const indexContent = {
    updatedAt: new Date().toISOString(),
    totalRecords: responseRecords.size,
    modules: Object.fromEntries(
      Object.entries(groupedRecords).map(([module, records]) => [
        module,
        records.map(r => ({
          method: r.method,
          statusCode: r.statusCode,
          endpoint: r.endpoint,
          file: `${module}/${r.method}_${r.statusCode}.json`,
        })),
      ])
    ),
  };
  fs.writeFileSync(indexPath, JSON.stringify(indexContent, null, 2), 'utf-8');
}

/**
 * Vite 插件
 */
export function apiResponseCapture(): Plugin {
  return {
    name: 'vite-plugin-api-response-capture',
    apply: 'serve', // 仅在开发服务器中生效

    configureServer(server: ViteDevServer) {
      // 监听来自前端的消息
      server.ws.on('api-response-capture', (data: ResponseRecord) => {
        const key = getRecordKey(data.module, data.method, data.statusCode);

        // 去重：相同接口+状态码只保留一份
        if (!responseRecords.has(key)) {
          responseRecords.set(key, {
            ...data,
            timestamp: new Date().toISOString(),
          });

          // 实时保存
          saveResponses();

          // 通知前端
          server.ws.send('api-response-saved', {
            key,
            totalRecords: responseRecords.size,
          });
        }
      });

      // 清空记录
      server.ws.on('api-response-clear', () => {
        responseRecords.clear();
        saveResponses();
        server.ws.send('api-response-cleared', { success: true });
      });

      // 获取所有记录
      server.ws.on('api-response-get-all', () => {
        server.ws.send('api-response-all', {
          records: Object.fromEntries(responseRecords),
        });
      });
    },
  };
}

/**
 * 前端工具函数
 * 在 ApiTestPage 中使用
 */
export const ApiResponseCollector = {
  /**
   * 发送响应到 Vite 插件保存
   */
  capture(data: ResponseRecord): void {
    // @ts-expect-error - Vite WS 扩展
    if (typeof window !== 'undefined' && window.__vite_ws__) {
      // @ts-expect-error - Vite WS 扩展
      window.__vite_ws__.send('api-response-capture', data);
    }
  },

  /**
   * 清空所有保存的响应
   */
  clear(): void {
    // @ts-expect-error - Vite WS 扩展
    if (typeof window !== 'undefined' && window.__vite_ws__) {
      // @ts-expect-error - Vite WS 扩展
      window.__vite_ws__.send('api-response-clear', {});
    }
  },
};

export default apiResponseCapture;