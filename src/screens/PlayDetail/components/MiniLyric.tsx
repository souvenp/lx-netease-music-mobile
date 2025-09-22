// src/screens/PlayDetail/components/MiniLyric.tsx

import { memo, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useLrcPlay, useLrcSet } from '@/plugins/lyric';
import { createStyle } from '@/utils/tools';
import { useTheme } from '@/store/theme/hook';
import Text from '@/components/common/Text';
import { useSettingValue } from '@/store/setting/hook';
import { setSpText } from '@/utils/pixelRatio';

const MiniLyric = ({ onPress, style }: { onPress?: () => void, style?: any }) => {
  const theme = useTheme();
  const { line: activeLine } = useLrcPlay();
  const lyricLines = useLrcSet();
  const textAlign = useSettingValue('playDetail.style.align');
  const lrcFontSize = useSettingValue('playDetail.vertical.style.lrcFontSize');

  const { currentLine, translationLine } = useMemo(() => {
    if (activeLine < 0 || lyricLines.length <= activeLine) {
      return { currentLine: null, translationLine: null };
    }
    const line = lyricLines[activeLine];
    return {
      currentLine: line.text,
      translationLine: line.extendedLyrics.length > 0 ? line.extendedLyrics[0] : null,
    };
  }, [activeLine, lyricLines]);

  const size = lrcFontSize / 16; // 缩小字体
  const lineHeight = setSpText(size) * 1.3;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.container, style]}>
      {currentLine ? (
        <>
          <Text
            size={size}
            color={theme['c-font']}
            style={{ textAlign }}
            numberOfLines={1}
          >
            {currentLine}
          </Text>
          {translationLine && (
            <Text
              size={size}
              color={theme['c-font-label']}
              style={{ textAlign, marginTop: 4 }}
              numberOfLines={1}
            >
              {translationLine}
            </Text>
          )}
        </>
      ) : (
        <Text size={size} color={theme['c-font-label']} style={{ textAlign }}>
          ...
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = createStyle({
  container: {
    paddingVertical: 10,
    alignItems: 'flex-start',
    width: '100%',
  },
});

export default memo(MiniLyric);
