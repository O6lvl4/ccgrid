import { useState, useRef, useEffect } from 'react';
import { Input, Text, XStack } from 'tamagui';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  fontSize?: number;
  fontWeight?: string;
}

export function InlineEdit({ value, onSave, fontSize = 13, fontWeight = '600' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onKeyPress={(e: { nativeEvent: { key: string } }) => {
          if (e.nativeEvent.key === 'Enter') commit();
          if (e.nativeEvent.key === 'Escape') cancel();
        }}
        unstyled
        bg="transparent"
        borderWidth={0}
        borderBottomWidth={1}
        borderBottomColor="$blue9"
        color="$gray12"
        fontSize={fontSize}
        fontWeight={fontWeight as any}
        px={0}
        py="$0.5"
        outlineWidth={0}
      />
    );
  }

  return (
    <Text
      fontSize={fontSize}
      fontWeight={fontWeight as any}
      color="$gray12"
      numberOfLines={1}
      cursor="pointer"
      borderBottomWidth={1}
      borderBottomColor="transparent"
      hoverStyle={{ borderBottomColor: '$gray6' }}
      onPress={() => setEditing(true)}
    >
      {value}
    </Text>
  );
}
