import { XStack, YStack, Text } from 'tamagui';
import { useStore } from '../../store/useStore';
import { Breadcrumb } from './Breadcrumb';
import { SessionSidebar } from './SessionSidebar';

function NavItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <YStack
      cursor="pointer"
      onPress={onPress}
      pb="$1.5"
      borderBottomWidth={2}
      borderBottomColor={active ? '$blue9' : 'transparent'}
    >
      <Text
        fontSize={13}
        fontWeight={active ? '600' : '400'}
        color={active ? '$gray12' : '$gray9'}
        hoverStyle={{ color: '$gray12' }}
        px="$1"
      >
        {label}
      </Text>
    </YStack>
  );
}

export function ViewShell({ children }: { children: React.ReactNode }) {
  const route = useStore(s => s.route);
  const navigate = useStore(s => s.navigate);
  const showSidebar =
    route.view !== 'session_list' &&
    route.view !== 'teammate_spec_list' &&
    route.view !== 'teammate_spec_detail';

  const isSessionsActive =
    route.view === 'session_list' ||
    route.view === 'session_detail' ||
    route.view === 'teammate_detail' ||
    route.view === 'task_detail';
  const isSpecsActive =
    route.view === 'teammate_spec_list' ||
    route.view === 'teammate_spec_detail';

  return (
    <YStack height="100vh" bg="$color1">
      {/* Header */}
      <XStack
        role="banner"
        items="flex-end"
        gap="$4"
        px="$4"
        pt="$2.5"
        bg="$gray2"
        borderBottomWidth={1}
        borderBottomColor="$gray4"
        shrink={0}
      >
        <Text
          fontSize={15}
          fontWeight="700"
          letterSpacing={-0.5}
          shrink={0}
          color="$gray12"
          pb="$1.5"
        >
          claude-team
        </Text>

        <NavItem
          label="Sessions"
          active={isSessionsActive}
          onPress={() => navigate({ view: 'session_list' })}
        />
        <NavItem
          label="Teammates"
          active={isSpecsActive}
          onPress={() => navigate({ view: 'teammate_spec_list' })}
        />

        <YStack pb="$1.5" marginLeft="auto">
          <Breadcrumb />
        </YStack>
      </XStack>

      {/* Body */}
      <XStack flex={1} overflow="hidden">
        {showSidebar && <SessionSidebar />}
        <YStack role="main" flex={1} overflow="hidden" minW={0}>
          {children}
        </YStack>
      </XStack>
    </YStack>
  );
}
