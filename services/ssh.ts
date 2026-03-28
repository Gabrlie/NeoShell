/**
 * SSH 连接服务（占位）
 *
 * 实际 SSH 功能需要 @dylankenneally/react-native-ssh-sftp
 * 该库需要 Expo Dev Build，在 Expo Go 阶段使用 mock 数据
 *
 * TODO: Phase 1 后期集成真实 SSH
 */

/**
 * 判断当前是否可用真实 SSH
 * 在 Expo Go 环境下返回 false
 */
export function isSSHAvailable(): boolean {
  // Expo Go 无法加载原生 SSH 模块
  // Dev Build 时改为 true
  return false;
}
