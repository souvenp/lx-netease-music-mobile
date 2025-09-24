import { memo, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Animated, Easing } from 'react-native';
import { usePlayerMusicInfo, useIsPlay } from '@/store/player/hook';
import { useWindowSize } from '@/utils/hooks';
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant';
import { HEADER_HEIGHT } from './components/Header';
import Image from '@/components/common/Image';
import { useStatusbarHeight } from '@/store/common/hook';
import { useSettingValue } from '@/store/setting/hook';
import { createStyle } from '@/utils/tools';

export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo();
  const { width: winWidth, height: winHeight } = useWindowSize();
  const statusBarHeight = useStatusbarHeight();
  const isPlay = useIsPlay();
  const isCoverSpin = useSettingValue('playDetail.isCoverSpin');
  const spinValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isAnimating = useRef(false);

  const createAnimation = useCallback((value: number) => {
    return Animated.timing(spinValue, {
      toValue: 1,
      duration: 20000 * (1 - value),
      easing: Easing.linear,
      useNativeDriver: true,
    });
  }, [spinValue]);

  const startAnimation = useCallback(() => {
    if (isAnimating.current || !isCoverSpin) return;
    isAnimating.current = true;
    spinValue.stopAnimation(value => {
      animationRef.current = createAnimation(value);
      animationRef.current.start(({ finished }) => {
        if (finished && isAnimating.current) {
          spinValue.setValue(0);
          isAnimating.current = false;
          startAnimation();
        }
      });
    });
  }, [spinValue, createAnimation, isCoverSpin]);

  const stopAnimation = useCallback(() => {
    if (!isAnimating.current) return;
    isAnimating.current = false;
    animationRef.current?.stop();
    animationRef.current = null;
    spinValue.stopAnimation();
  }, [spinValue]);

  useEffect(() => {
    if (isPlay && isCoverSpin) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [isPlay, isCoverSpin, startAnimation, stopAnimation]);

  useEffect(() => {
    stopAnimation();
    spinValue.setValue(0);
    if (isPlay && isCoverSpin) {
      startAnimation();
    }
  }, [musicInfo.id, isCoverSpin, startAnimation, stopAnimation, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const imageContainerStyle = useMemo(() => {
    const imgWidth = Math.min(winWidth * 0.8, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.5);
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: isCoverSpin ? imgWidth / 2 : 4,
      elevation: 3,
      opacity: 1, // 直接设置为1，让动画引擎控制可见性
    };
  }, [statusBarHeight, winHeight, winWidth, isCoverSpin]);

  const imageStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    borderRadius: imageContainerStyle.borderRadius,
  }), [imageContainerStyle.borderRadius]);

  return (
    <View style={styles.container}>
      <View style={[styles.content, imageContainerStyle, { overflow: 'hidden' }]}>
        <Animated.View style={{ width: '100%', height: '100%', transform: [{ rotate: spin }] }}>
          <Image
            url={musicInfo.pic} // 直接使用 store 中的数据
            nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic}
            style={imageStyle}
          />
        </Animated.View>
      </View>
    </View>
  );
});

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
});
