import dgram from 'react-native-udp';
import settingState from '@/store/setting/state';
import { Buffer } from 'buffer';
import playerState from '@/store/player/state';
import { onLyricLinePlay, setSendLyricTextEvent } from '@/utils/nativeModules/lyricDesktop';
import { playNext, playPrev, togglePlay } from '@/core/player/player';

const BROADCAST_PORT = 41234;
const COMMAND_PORT = 41235;

let targetIp: string | null = null;
let ipClearTimeout: NodeJS.Timeout | null = null;

let lyricSocket: dgram.Socket | null = null;
let commandSocket: dgram.Socket | null = null;

let isLyricListenerActive = false;
let unsubscribeLyricListener: (() => void) | null = null;

const initLyricSocket = () => {
  if (lyricSocket) return;
  try {
    lyricSocket = dgram.createSocket('udp4');
    lyricSocket.on('message', (msg, rinfo) => {
      if (msg.toString() === 'LX_LYRIC_CLIENT_HERE') {
        console.log(`>>>>> [网络歌词] 发现接收端: ${rinfo.address}`);
        targetIp = rinfo.address;

        // 如果 90 秒沒收到新的廣播，就清空 IP，防止電腦離線後還一直發
        if (ipClearTimeout) clearTimeout(ipClearTimeout);
        ipClearTimeout = setTimeout(() => {
          console.log('>>>>> [网络歌词] 接收端超时，已清除 IP');
          targetIp = null;
        }, 90 * 1000);
      }
    });

    lyricSocket.bind(BROADCAST_PORT, () => {
      lyricSocket?.setBroadcast(true);
      console.log('>>>>> [网络歌词] UDP 歌词广播 Socket 初始化并监听成功');
    });

    lyricSocket.on('error', (err) => {
      console.error('>>>>> [网络歌词] UDP 歌词广播 Socket 错误:', err);
      destroyLyricSocket();
    });
  } catch (error) {
    console.error('>>>>> [网络歌词] 创建 UDP 歌词广播 Socket 失败:', error);
  }
};

// 启动命令监听服务
const startCommandListener = () => {
  if (commandSocket) return;
  try {
    commandSocket = dgram.createSocket('udp4');
    commandSocket.on('message', (msg) => {
      const command = msg.toString();
      console.log(`>>>>> [网络命令] 收到命令: ${command}`);
      switch (command) {
        case 'next':
          void playNext();
          break;
        case 'prev':
          void playPrev();
          break;
        case 'toggle':
          togglePlay();
          break;
      }
    });

    commandSocket.bind(COMMAND_PORT, () => {
      console.log(`>>>>> [网络命令] UDP 命令监听器已在端口 ${COMMAND_PORT} 启动`);
    });

    commandSocket.on('error', (err) => {
      console.error('>>>>> [网络命令] UDP 命令监听器错误:', err);
      stopCommandListener();
    });
  } catch (e) {
    console.error('>>>>> [网络命令] 启动命令监听失败:', e);
  }
};

const sendUdpPacket = (lineInfo: { text: string; extendedLyrics: string[] }) => {
  if (!targetIp || !lyricSocket) return;

  // 在歌词数据包中加入当前播放状态
  const payload = {
    lyric: lineInfo.text,
    tlyric: lineInfo.extendedLyrics?.[0] || '',
    name: playerState.musicInfo.name,
    singer: playerState.musicInfo.singer,
    is_playing: playerState.isPlay,
  };
  console.log(`>>>>> [網絡歌詞] 正在發送至 ${targetIp}: ${lineInfo.text}`);

  const message = Buffer.from(JSON.stringify(payload));
  lyricSocket.send(message, 0, message.length, BROADCAST_PORT, targetIp, (err) => {
    if (err) console.error('>>>>> [网络歌词] 发送失败:', err);
  });
};

const destroyLyricSocket = () => {
  if (!lyricSocket) return;
  try {
    lyricSocket.close();
  } catch (error) {
    console.error('>>>>> [网络歌词] 关闭 UDP 歌词广播 Socket 失败:', error);
  } finally {
    lyricSocket = null;
  }
};

// 停止命令监听服务
const stopCommandListener = () => {
  if (!commandSocket) return;
  try {
    commandSocket.close();
  } catch (error) {
    console.error('>>>>> [网络命令] 关闭 UDP 命令监听器失败:', error);
  } finally {
    commandSocket = null;
  }
};

const startLyricListener = () => {
  if (isLyricListenerActive) return;

  console.log('>>>>> [网络歌词] 启动原生歌词事件监听');
  setSendLyricTextEvent(true);
  unsubscribeLyricListener = onLyricLinePlay((lineInfo) => {
    if (settingState.setting['player.isSendNetworkLyric']) {
      sendUdpPacket(lineInfo);
    } else {
      stopLyricListener();
    }
  });
  isLyricListenerActive = true;
};

const stopLyricListener = () => {
  if (!isLyricListenerActive) return;

  console.log('>>>>> [网络歌词] 停止原生歌词事件监听');
  setSendLyricTextEvent(false);
  unsubscribeLyricListener?.();
  unsubscribeLyricListener = null;
  isLyricListenerActive = false;
};

// 同时管理两个Socket的生命周期
export const toggle = (enable: boolean) => {
  if (enable) {
    initLyricSocket();
    startLyricListener();
    startCommandListener();
  } else {
    stopLyricListener();
    // 延迟销毁，以防用户快速开关
    setTimeout(() => {
      if (!settingState.setting['player.isSendNetworkLyric']) {
        destroyLyricSocket();
        stopCommandListener(); // 停用时关闭命令监听
      }
    }, 3000);
  }
};
