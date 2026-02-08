import { useState, useEffect, useCallback } from 'react';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { ChevronRight, CornerLeftUp, FolderOpen, Folder } from '@tamagui/lucide-icons';

interface DirEntry {
  name: string;
  path: string;
}

interface DirListing {
  current: string;
  parent: string;
  dirs: DirEntry[];
}

function PathBreadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const segments = path.split('/').filter(Boolean);

  return (
    <XStack items="center" gap="$0.5" flexWrap="wrap" minHeight={20}>
      {/* Root */}
      <Text
        fontSize={12}
        fontFamily="$mono"
        color="$gray9"
        cursor="pointer"
        onPress={() => onNavigate('/')}
        px="$1"
        py="$0.5"
        rounded="$1"
        hoverStyle={{ color: '$blue9', bg: '$gray3' }}
      >
        /
      </Text>

      {segments.map((seg, i) => {
        const segPath = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        return (
          <XStack key={segPath} items="center" gap="$0.5">
            <ChevronRight size={10} color="$gray7" />
            <Text
              fontSize={12}
              fontFamily="$mono"
              color={isLast ? '$gray12' : '$gray9'}
              fontWeight={isLast ? '600' : '400'}
              cursor={isLast ? 'default' : 'pointer'}
              px="$1"
              py="$0.5"
              rounded="$1"
              {...(!isLast && {
                hoverStyle: { color: '$blue9', bg: '$gray3' },
                onPress: () => onNavigate(segPath),
              })}
            >
              {seg}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

export function DirPicker({
  initialPath,
  onSelect,
  onClose,
}: {
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDirs = useCallback(async (path?: string) => {
    setLoading(true);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetch(`/api/dirs${params}`);
      if (res.ok) {
        setListing(await res.json());
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDirs(initialPath || undefined);
  }, []);

  if (!listing) {
    return (
      <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" p="$4" items="center">
        <Text fontSize={12} color="$gray9">Loading...</Text>
      </YStack>
    );
  }

  return (
    <YStack bg="$gray2" borderColor="$gray4" borderWidth={1} rounded="$3" overflow="hidden">
      {/* Header: breadcrumb path + up button */}
      <XStack
        items="center"
        gap="$2"
        px="$3"
        py="$2"
        borderBottomWidth={1}
        borderBottomColor="$gray4"
        bg="$gray3"
      >
        <YStack
          tag="button"
          cursor="pointer"
          p="$1"
          rounded="$2"
          hoverStyle={{ bg: '$gray4' }}
          onPress={() => fetchDirs(listing.parent)}
        >
          <CornerLeftUp size={14} color="$gray9" />
        </YStack>
        <YStack flex={1} minWidth={0}>
          <PathBreadcrumb path={listing.current} onNavigate={fetchDirs} />
        </YStack>
      </XStack>

      {/* Directory list */}
      <ScrollView maxHeight={280}>
        {loading ? (
          <YStack px="$3" py="$6" items="center">
            <Text fontSize={12} color="$gray9">Loading...</Text>
          </YStack>
        ) : listing.dirs.length === 0 ? (
          <YStack px="$3" py="$6" items="center" gap="$1">
            <FolderOpen size={20} color="$gray6" />
            <Text fontSize={12} color="$gray7">No subdirectories</Text>
          </YStack>
        ) : (
          <YStack py="$1">
            {listing.dirs.map(dir => (
              <XStack
                key={dir.path}
                tag="button"
                width="100%"
                px="$3"
                py="$2"
                items="center"
                gap="$2"
                cursor="pointer"
                hoverStyle={{ bg: '$gray3' }}
                onPress={() => fetchDirs(dir.path)}
              >
                <Folder size={14} color="$gray8" />
                <Text fontSize={13} fontFamily="$mono" color="$gray11" flex={1}>
                  {dir.name}
                </Text>
                <ChevronRight size={12} color="$gray6" />
              </XStack>
            ))}
          </YStack>
        )}
      </ScrollView>

      {/* Footer: selected path + actions */}
      <XStack
        items="center"
        gap="$3"
        px="$3"
        py="$2"
        borderTopWidth={1}
        borderTopColor="$gray4"
        bg="$gray3"
      >
        <XStack flex={1} items="center" gap="$1.5" minWidth={0}>
          <FolderOpen size={13} color="$blue9" />
          <Text fontSize={12} fontFamily="$mono" color="$gray11" numberOfLines={1} flex={1}>
            {listing.current}
          </Text>
        </XStack>
        <XStack gap="$2" shrink={0}>
          <Text
            tag="button"
            fontSize={12}
            color="$gray9"
            cursor="pointer"
            hoverStyle={{ color: '$gray12' }}
            onPress={onClose}
          >
            Cancel
          </Text>
          <Button
            size="$2"
            bg="$blue9"
            color="white"
            fontWeight="500"
            fontSize={12}
            hoverStyle={{ bg: '$blue8' }}
            pressStyle={{ bg: '$blue10' }}
            rounded="$2"
            onPress={() => onSelect(listing.current)}
          >
            Select Folder
          </Button>
        </XStack>
      </XStack>
    </YStack>
  );
}
