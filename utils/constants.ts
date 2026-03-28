/**
 * 常量定义
 */

/** 默认 SSH 端口 */
export const DEFAULT_SSH_PORT = 22;

/** 监控数据采集合并命令 */
export const MONITOR_COMMAND = [
  'echo "===CPU==="',
  'cat /proc/stat | head -1',
  'echo "===LOAD==="',
  'cat /proc/loadavg',
  'echo "===MEM==="',
  'cat /proc/meminfo | head -5',
  'echo "===DISK==="',
  'df -B1 --total | tail -1',
  'echo "===DISKIO==="',
  'cat /proc/diskstats',
  'echo "===NET==="',
  'cat /proc/net/dev',
  'echo "===TEMP==="',
  'cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null || echo "N/A"',
  'echo "===UPTIME==="',
  'cat /proc/uptime',
].join(' && ');

/** 系统基础信息采集命令 */
export const SYSTEM_INFO_COMMAND = [
  'echo "===HOSTNAME==="',
  'hostname',
  'echo "===OS==="',
  'cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'',
  'echo "===KERNEL==="',
  'uname -r',
  'echo "===ARCH==="',
  'uname -m',
  'echo "===CPUMODEL==="',
  'lscpu 2>/dev/null | grep "Model name" | sed "s/Model name:\\s*//"',
  'echo "===CPUCORES==="',
  'nproc',
  'echo "===TOTALMEM==="',
  'grep MemTotal /proc/meminfo | awk \'{print $2}\'',
  'echo "===UPTIME==="',
  'cat /proc/uptime | awk \'{print $1}\'',
].join(' && ');

/** Docker 容器列表命令 */
export const DOCKER_LIST_COMMAND =
  'docker ps -a --format \'{{json .}}\' 2>/dev/null';

/** Docker 版本命令 */
export const DOCKER_VERSION_COMMAND =
  'docker version --format \'{{.Server.Version}}\' 2>/dev/null';

/** Docker 统计命令 */
export const DOCKER_STATS_COMMAND =
  'docker stats --no-stream --format \'{{json .}}\' 2>/dev/null';
