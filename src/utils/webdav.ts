import { createClient, FileStat } from 'webdav';
import settingState from '@/store/setting/state';
import { log } from '@/utils/log';

let client: any = null;

function getClient() {
  if (client) return client;

  const settings = settingState.setting;
  const url = settings['sync.webdav.url'];
  const username = settings['sync.webdav.username'];
  const password = settings['sync.webdav.password'];

  if (!url || !username) {
    log.warn('WebDAV 未配置: URL 或用户名为空');
    return null;
  }

  client = createClient(url, { username, password });
  return client;
}

/**
 * 当 WebDAV 配置变更时，调用此函数来重置客户端实例。
 */
export function resetClient() {
  client = null;
}

export async function testConnection(): Promise<boolean> {
  const cli = getClient();
  if (!cli) throw new Error('WebDAV 未配置');
  await cli.getDirectoryContents('/');
  return true;
}

/**
 * 逐级创建目录，兼容不支持递归创建的服务器。
 * @param cli WebDAV 客户端实例
 * @param dirPath 要创建的目录路径
 */
async function ensureDirectoryExists(cli: any, dirPath: string): Promise<void> {
  if (!dirPath || dirPath === '/') return;

  const segments = dirPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    try {
      if (!(await cli.exists(currentPath))) {
        log.info(`[WebDAV] Directory ${currentPath} not found, creating it...`);
        await cli.createDirectory(currentPath);
      }
    } catch (error: any) {
      throw new Error(`创建目录 ${currentPath} 失败: ${error.message}`);
    }
  }
}

/**
 * 上传文件，如果父目录不存在则自动逐级创建。
 * @param path 完整的文件路径，例如 /LX_Music/playlists.json
 * @param content 文件内容
 */
export async function uploadFile(path: string, content: string): Promise<void> {
  const cli = getClient();
  if (!cli) throw new Error('WebDAV 未配置');

  // 1. 提取目录路径
  const dirPath = path.substring(0, path.lastIndexOf('/'));

  // 2. 确保目录存在
  await ensureDirectoryExists(cli, dirPath);

  // 3. 上传文件
  log.info(`[WebDAV] All directories exist. Uploading file to ${path}...`);
  await cli.putFileContents(path, content, { overwrite: true });
}

/**
 * 下载文件，如果文件不存在则返回 null。
 * @param path 完整的文件路径
 */
export async function downloadFile(path: string): Promise<string | null> {
  const cli = getClient();
  if (!cli) throw new Error('WebDAV 未配置');
  try {
    log.info(`[WebDAV] Attempting to download file: ${path}`);
    // 直接尝试获取文件内容，不存在会抛出错误
    return await cli.getFileContents(path, { format: "text" });
  } catch (error: any) {
    // 如果错误是 404 或 409，说明文件或路径不存在，这是预期行为，返回 null
    if (error.status === 404 || error.status === 409) {
      log.info(`[WebDAV] downloadFile: File not found on server: ${path}`);
      return null;
    }
    // 其他错误（如权限问题、服务器内部错误）则向上抛出
    log.error(`[WebDAV] downloadFile: Unexpected error for "${path}":`, error);
    throw error;
  }
}

/**
 * 获取文件状态，如果文件不存在则返回 null。
 * @param path 完整的文件路径
 */
export async function getStat(path: string): Promise<FileStat | null> {
  const cli = getClient();
  if (!cli) throw new Error('WebDAV 未配置');
  try {
    // 直接尝试获取 stat，不存在会抛出错误
    return await cli.stat(path) as Promise<FileStat>;
  } catch (error: any) {
    // 如果错误是 404 或 409，说明文件或路径不存在，这是预期行为，返回 null
    if (error.status === 404 || error.status === 409) {
      log.info(`[WebDAV] getStat: File or path not found for "${path}", returning null.`);
      return null;
    }
    // 其他错误则向上抛出
    log.error(`[WebDAV] getStat: Unexpected error for "${path}":`, error);
    throw error;
  }
}
