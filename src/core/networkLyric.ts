import dgram from 'react-native-udp';
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

const startLyricSocket = () => {
  if (lyricSocket) return;
  try {
    lyricSocket = dgram.createSocket('udp4');
    lyricSocket.on('message', (msg, rinfo) => {
      if (msg.toString() === 'LX_LYRIC_CLIENT_HERE') {
        console.log(`>>>>> [网络歌词] 发现接收端: ${rinfo.address}`);
        targetIp = rinfo.address;
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

  const payload = {
    lyric: lineInfo.text,
    tlyric: lineInfo.extendedLyrics?.[0] || '',
    name: playerState.musicInfo.name,
    singer: playerState.musicInfo.singer,
    is_playing: playerState.isPlay,
  };

  const message = Buffer.from(JSON.stringify(payload));
  lyricSocket.send(message, 0, message.length, BROADCAST_PORT, targetIp, (err) => {
    if (err) console.error('>>>>> [网络歌词] 发送失败:', err);
  });
};

const destroyLyricSocket = () => {
  if (!lyricSocket) return;
  try { lyricSocket.close(); } catch (error) {}
  lyricSocket = null;
};

const stopCommandListener = () => {
  if (!commandSocket) return;
  try { commandSocket.close(); } catch (error) {}
  commandSocket = null;
};

const startLyricListener = () => {
  if (isLyricListenerActive) return;
  console.log('>>>>> [网络歌词] 启动原生歌词事件监听');
  setSendLyricTextEvent(true);
  unsubscribeLyricListener = onLyricLinePlay((lineInfo) => {
    if (targetIp) sendUdpPacket(lineInfo);
  });
  isLyricListenerActive = true;
};

export const init = () => {
  startLyricSocket();
  startCommandListener();
  startLyricListener();
};
