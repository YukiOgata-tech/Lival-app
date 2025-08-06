// src/components/AItools-related/AItoolsChatBubble.tsx
import { Card, Text } from 'react-native-paper';

type Props = {
  message: string;
  isUser: boolean;
  subText?: string;
};

export default function AItoolsChatBubble({ message, isUser, subText }: Props) {
  return (
    <Card
      className={`
        p-2 mb-1 rounded-2xl max-w-[88%] 
        ${isUser
          ? "bg-gradient-to-r from-sky-200 to-lime-100 self-end"
          : "bg-white dark:bg-neutral-800 self-start"
        }`}
    >
      <Text className={isUser ? "text-right font-semibold" : ""}>
        {message}
      </Text>
      {subText && (
        <Text className="mt-2 text-xs text-gray-500 font-medium">{subText}</Text>
      )}
    </Card>
  );
}
