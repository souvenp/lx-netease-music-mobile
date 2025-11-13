import { memo, useRef, useEffect } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useProgress } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const MiniProgressBar = () => {
  const theme = useTheme()
  const { progress } = useProgress()
  const progressAnim = useRef(new Animated.Value(progress)).current

  useEffect(() => {
    const isJump = Math.abs(progress - (progressAnim as any)._value) > 0.05

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: isJump ? 200 : 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()
  }, [progress, progressAnim])

  const progressStyle = {
    width: progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
    backgroundColor: theme['c-primary'],
  }

  return (
    <View style={{ ...styles.track, backgroundColor: theme['c-primary-alpha-800'] }}>
      <Animated.View style={[styles.progress, progressStyle]} />
    </View>
  )
}

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
})

export default memo(MiniProgressBar)
