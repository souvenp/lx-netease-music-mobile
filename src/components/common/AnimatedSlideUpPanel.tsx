import React, {forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState} from 'react';
import { Animated, View, StyleSheet, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useWindowSize } from '@/utils/hooks';

export interface AnimatedSlideUpPanelType {
  setVisible: (visible: boolean) => void;
}

interface Props {
  children: React.ReactNode;
  onHide?: () => void;
}

const AnimatedSlideUpPanel = forwardRef<AnimatedSlideUpPanelType, Props>(({ children, onHide }, ref) => {
  const { height: windowHeight } = useWindowSize();
  const [isVisible, setIsVisible] = useState(false);
  const animatedValue = useRef(new Animated.Value(windowHeight)).current;

  const show = useCallback(() => {
    setIsVisible(true);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }).start();
  }, [animatedValue]);

  const hide = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: windowHeight,
      duration: 0,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onHide?.();
    });
  }, [animatedValue, windowHeight, onHide]);

  useImperativeHandle(ref, () => ({
    setVisible: (visible: boolean) => {
      if (visible) {
        show();
      } else {
        hide();
      }
    },
  }));

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible) {
        hide();
        return true; // 阻止事件冒泡
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isVisible, hide]);

  if (!isVisible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={hide}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              opacity: animatedValue.interpolate({
                inputRange: [0, windowHeight],
                outputRange: [1, 0],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateY: animatedValue }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
});

export default AnimatedSlideUpPanel;
