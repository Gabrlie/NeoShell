/**
 * 服务器相关类型定义
 */

/** SSH 认证方式 */
export type AuthMethod = 'password' | 'key';

/** 服务器连接配置 */
export interface ServerConfig {
  /** 唯一标识符 */
  id: string;
  /** 服务器显示名称 */
  name: string;
  /** 主机地址（IP 或域名） */
  host: string;
  /** SSH 端口 */
  port: number;
  /** 用户名 */
  username: string;
  /** 认证方式 */
  authMethod: AuthMethod;
  /** 分组名称 */
  group?: string;
  /** 排序权重（越小越靠前） */
  sortOrder: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后连接时间 */
  lastConnectedAt?: number;
}

/** 服务器连接状态 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

/** 服务器运行时状态（包含连接状态和监控数据） */
export interface ServerState {
  /** 服务器配置 ID */
  serverId: string;
  /** 连接状态 */
  status: ConnectionStatus;
  /** 错误信息 */
  error?: string;
  /** 最后数据更新时间 */
  lastUpdated?: number;
}

/** 操作系统类型图标映射 */
export type OSType = 'linux' | 'ubuntu' | 'debian' | 'centos' | 'windows' | 'unknown';
