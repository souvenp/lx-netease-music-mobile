import { memo, useRef, useEffect, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Text, { type TextProps } from '@/components/common/Text';

interface MarqueeProps extends TextProps {
  children: string;
}

export default memo(({ children, style, ...props }: MarqueeProps) => {
  const containerWidth = useRef(0);
  const textWidth = useRef(0);
  const [isAnimating, setAnimating] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (textWidth.current <= containerWidth.current) {
      setAnimating(false);
      animatedValue.setValue(0);
      return;
    }
    setAnimating(true);
  }, [children, animatedValue]);

  useEffect(() => {
    if (!isAnimating) return;

    const duration = (textWidth.current + 50) * 35;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 0, // Reset instantly
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isAnimating, animatedValue, textWidth]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(textWidth.current + 50)], // 50 is padding between repeats
  });

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const newWidth = e.nativeEvent.layout.width;
        if (newWidth === containerWidth.current) return;
        containerWidth.current = newWidth;
        if (textWidth.current > containerWidth.current) {
          setAnimating(true);
        } else {
          setAnimating(false);
        }
      }}
    >
      <Animated.View style={[styles.marqueeWrapper, { transform: [{ translateX }] }]}>
        <Text
          {...props}
          style={style}
          numberOfLines={1}
          onLayout={(e) => {
            const newWidth = e.nativeEvent.layout.width;
            if (newWidth === textWidth.current) return;
            textWidth.current = newWidth;
            if (textWidth.current > containerWidth.current) {
              setAnimating(true);
            } else {
              setAnimating(false);
            }
          }}
        >
          {children}
        </Text>
        {isAnimating && (
          <Text {...props} style={[style, { paddingLeft: 50 }]}>
            {children}
          </Text>
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    flex: 1,
  },
  marqueeWrapper: {
    flexDirection: 'row',
    width: '1000%', // Provide ample space for long text and repetition
  },
});
