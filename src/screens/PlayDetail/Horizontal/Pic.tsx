import { memo, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animated, Easing, View } from 'react-native';
import { usePlayerMusicInfo, useIsPlay } from '@/store/player/hook';
import { useWindowSize } from '@/utils/hooks';
// import { useNavigationComponentDidAppear } from '@/navigation'; // <--- 移除
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant';
import { createStyle } from '@/utils/tools';
import { HEADER_HEIGHT } from './components/Header';
import { BTN_WIDTH } from './MoreBtn/Btn';
import { marginLeft } from './constant';
import Image from '@/components/common/Image';
import { useStatusbarHeight } from '@/store/common/hook';
import { useSettingValue } from '@/store/setting/hook';

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
    let imgWidth = Math.min(
      (winWidth * 0.45 - marginLeft - BTN_WIDTH) * 0.76,
      (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.62,
    );
    imgWidth -= imgWidth * (global.lx.fontSize - 1) * 0.3;
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: isCoverSpin ? imgWidth / 2 : 4,
      elevation: 3,
      opacity: 1, // 直接设置为1，让动画引擎控制可见性
    };
  }, [winWidth, winHeight, statusBarHeight, isCoverSpin]);

  const imageStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    borderRadius: imageContainerStyle.borderRadius,
  }), [imageContainerStyle.borderRadius]);

  let contentHeight = (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.66;
  contentHeight -= contentHeight * (global.lx.fontSize - 1) * 0.2;

  return (
    <View style={{ ...styles.container, height: contentHeight }}>
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
    flexShrink: 1,
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0)',
  },
});
