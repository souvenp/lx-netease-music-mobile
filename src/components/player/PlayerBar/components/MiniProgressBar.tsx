import { memo } from 'react';
import { View } from 'react-native';
import { useProgress } from '@/store/player/hook';
import { useTheme } from '@/store/theme/hook';
import { createStyle } from '@/utils/tools';

/**
 * 底部播放栏顶部的迷你进度条
 */
const MiniProgressBar = () => {
  const theme = useTheme();
  const { progress } = useProgress();

  const progressStyle = {
    width: `${progress * 100}%`,
    backgroundColor: theme['c-primary'],
  };

  return (
    <View style={{ ...styles.track, backgroundColor: theme['c-primary-alpha-800'] }}>
      <View style={[styles.progress, progressStyle]} />
    </View>
  );
};

const styles = createStyle({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  progress: {
    height: '100%',
  },
});

export default memo(MiniProgressBar);
