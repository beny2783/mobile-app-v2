declare module 'react-native-gifted-charts' {
  import { ViewStyle, TextStyle } from 'react-native';

  interface DataPoint {
    value: number;
    label?: string;
    date?: string;
    dataPointText?: string;
    showDataPoint?: boolean;
    customDataPoint?: React.ReactNode;
    color?: string;
    focused?: boolean;
    hideDataPoint?: boolean;
  }

  interface LineChartProps {
    data: DataPoint[];
    height?: number;
    width?: number;
    spacing?: number;
    color?: string;
    thickness?: number;
    startFillColor?: string;
    endFillColor?: string;
    initialSpacing?: number;
    endSpacing?: number;
    hideDataPoints?: boolean;
    hideRules?: boolean;
    hideYAxisText?: boolean;
    hideXAxisText?: boolean;
    yAxisColor?: string;
    xAxisColor?: string;
    yAxisTextStyle?: TextStyle;
    xAxisTextStyle?: TextStyle;
    yAxisLabelSuffix?: string;
    yAxisLabelPrefix?: string;
    yAxisTextNumberOfLines?: number;
    yAxisLabelWidth?: number;
    rulesColor?: string;
    rulesType?: 'solid' | 'dashed' | 'dotted';
    noOfSections?: number;
    maxValue?: number;
    minValue?: number;
    curved?: boolean;
    hideOrigin?: boolean;
    onPress?: (item: DataPoint) => void;
    renderTooltip?: (item: DataPoint) => React.ReactNode;
    containerStyle?: ViewStyle;
    formatXLabel?: (label: string) => string;
    xAxisLabelsVerticalShift?: number;
    dataPointsHeight?: number;
    dataPointsWidth?: number;
    dataPointsColor?: string;
    dataPointsShape?: 'circle' | 'square' | 'triangle';
  }

  export const LineChart: React.FC<LineChartProps>;
}
