import { Component, type ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <YStack
          height="100vh"
          items="center"
          justify="center"
          bg="$gray1"
        >
          <YStack
            maxWidth={480}
            p="$4"
            bg="$gray2"
            rounded="$3"
            borderWidth={1}
            borderColor="$red7"
            gap="$3"
          >
            <Text fontSize={15} fontWeight="700" color="$red9">
              Rendering Error
            </Text>
            <YStack
              tag="pre"
              maxHeight={256}
              overflow="scroll"
              bg="$gray3"
              rounded="$2"
              p="$3"
            >
              <Text
                fontSize={12}
                color="$gray11"
                fontFamily="$mono"
                whiteSpace="pre-wrap"
                lineHeight={18}
              >
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </Text>
            </YStack>
            <Text
              fontSize={13}
              fontWeight="500"
              color="$blue9"
              cursor="pointer"
              hoverStyle={{ color: '$blue10' }}
              onPress={() => this.setState({ error: null })}
            >
              Retry
            </Text>
          </YStack>
        </YStack>
      );
    }
    return this.props.children;
  }
}
