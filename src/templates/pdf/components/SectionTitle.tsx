import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

interface SectionTitleProps {
  title: string;
}

export function SectionTitle({ title }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitle}>
      <Text>{title}</Text>
    </View>
  );
}

interface SubsectionTitleProps {
  title: string;
}

export function SubsectionTitle({ title }: SubsectionTitleProps) {
  return (
    <View style={styles.subsectionTitle}>
      <Text>{title}</Text>
    </View>
  );
}
