/**
 * Debug 工具模块
 * 统一管理控制台输出和性能测量的开关
 */

// 默认关闭调试模式以提高性能
const DEBUG_ENABLED = false;

// 空函数，用于替代调试输出
const noop = (...args: any[]) => {};

/**
 * 调试用的控制台输出函数
 * 当 DEBUG_ENABLED 为 false 时，这些函数不会执行任何操作
 */
export const debugLog = DEBUG_ENABLED ? console.log.bind(console) : noop;
export const debugWarn = DEBUG_ENABLED ? console.warn.bind(console) : noop;
export const debugError = DEBUG_ENABLED ? console.error.bind(console) : noop;
export const debugInfo = DEBUG_ENABLED ? console.info.bind(console) : noop;
export const debugGroup = DEBUG_ENABLED ? console.group.bind(console) : noop;
export const debugGroupEnd = DEBUG_ENABLED ? console.groupEnd.bind(console) : noop;
export const debugTable = DEBUG_ENABLED ? console.table.bind(console) : noop;

/**
 * 性能测量相关函数
 */
export const debugTime = DEBUG_ENABLED
  ? (label: string) => performance.mark(`${label}-start`)
  : noop;

export const debugTimeEnd = DEBUG_ENABLED
  ? (label: string) => {
      try {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);
        const measures = performance.getEntriesByName(label);
        if (measures.length > 0 && measures[0]) {
          console.log(`${label}: ${measures[0].duration.toFixed(2)}ms`);
        }
        // 清理性能标记
        performance.clearMarks(`${label}-start`);
        performance.clearMarks(`${label}-end`);
        performance.clearMeasures(label);
      } catch (error) {
        // 忽略性能测量错误
      }
    }
  : noop;

export const debugPerformance = DEBUG_ENABLED
  ? {
      mark: performance.mark.bind(performance),
      measure: performance.measure.bind(performance),
      getEntriesByName: performance.getEntriesByName.bind(performance),
      clearMarks: performance.clearMarks.bind(performance),
      clearMeasures: performance.clearMeasures.bind(performance),
      now: performance.now.bind(performance),
    }
  : {
      mark: noop,
      measure: noop,
      getEntriesByName: () => [],
      clearMarks: noop,
      clearMeasures: noop,
      now: () => 0,
    };

/**
 * 开发环境检查
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 条件性调试输出 - 仅在开发环境中启用
 */
export const devLog = isDevelopment && DEBUG_ENABLED ? console.log.bind(console) : noop;
export const devWarn = isDevelopment && DEBUG_ENABLED ? console.warn.bind(console) : noop;
export const devError = isDevelopment && DEBUG_ENABLED ? console.error.bind(console) : noop;

/**
 * 调试配置
 */
export const debugConfig = {
  enabled: DEBUG_ENABLED,
  development: isDevelopment,
};

/**
 * 运行时启用调试 (仅用于开发调试)
 * 注意: 这只能在运行时暂时启用部分功能，完整启用需要重新构建
 */
export const enableDebugRuntime = () => {
  if (isDevelopment) {
    (window as any).__DEBUG_ENABLED__ = true;
    console.warn('Debug mode enabled at runtime. Some functions may still be optimized away.');
  }
};

/**
 * 检查运行时调试状态
 */
export const isDebugRuntimeEnabled = () => {
  return isDevelopment && (window as any).__DEBUG_ENABLED__;
};
