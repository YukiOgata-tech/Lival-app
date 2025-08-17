declare module 'react-native-math-view' {
  import * as React from 'react';
  import { ViewProps, StyleProp, ViewStyle } from 'react-native';
  export interface MathViewProps extends ViewProps {
    math?: string;            // LaTeX
    mathml?: string;         
    html?: string;           
    resizeToFit?: boolean;
    onError?: (e: Error) => void;
    renderError?: (e: Error) => React.ReactNode;
    debug?: boolean;
    style?: StyleProp<ViewStyle>;
  }
  const MathView: React.ComponentType<MathViewProps>;
  export default MathView;
}
