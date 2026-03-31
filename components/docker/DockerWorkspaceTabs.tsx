import { useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type {
  DockerComposeProject,
  DockerContainer,
  DockerDashboard,
  DockerImage,
  DockerVolume,
  ServerConfig,
} from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/theme';
import { ComposeProjectCard } from './ComposeProjectCard';
import { ContainerCard } from './ContainerCard';
import {
  DockerEmptySection,
  DockerFilterChip,
} from './DockerScaffold';
import { DockerImageCard } from './DockerImageCard';
import { DockerStatCard } from './DockerStatCard';
import { DockerVolumeCard } from './DockerVolumeCard';

type WorkspaceTabKey = 'info' | 'containers' | 'compose' | 'images' | 'volumes';
type ContainerFilter = 'all' | 'running' | 'stopped';

const TABS: Array<{ key: WorkspaceTabKey; label: string }> = [
  { key: 'info', label: '信息' },
  { key: 'containers', label: '容器' },
  { key: 'compose', label: '编排' },
  { key: 'images', label: '镜像' },
  { key: 'volumes', label: '存储' },
];

interface DockerWorkspaceTabsProps {
  server: ServerConfig;
  dashboard: DockerDashboard;
  busy?: boolean;
  onOpenCreateContainer: () => void;
  onOpenCreateCompose: () => void;
  onOpenContainer: (container: DockerContainer) => void;
  onOpenCompose: (project: DockerComposeProject) => void;
  onContainerAction: (
    container: DockerContainer,
    action: 'start' | 'stop' | 'restart' | 'logs' | 'details',
  ) => void;
  onComposeAction: (project: DockerComposeProject, action: 'edit' | 'up' | 'stop' | 'restart' | 'down') => void;
  onImageAction: (image: DockerImage, action: 'pull' | 'delete') => void;
  onVolumeAction: (volume: DockerVolume, action: 'delete') => void;
}

export function DockerWorkspaceTabs({
  server,
  dashboard,
  busy = false,
  onOpenCreateContainer,
  onOpenCreateCompose,
  onOpenContainer,
  onOpenCompose,
  onContainerAction,
  onComposeAction,
  onImageAction,
  onVolumeAction,
}: DockerWorkspaceTabsProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>('info');
  const [containerFilter, setContainerFilter] = useState<ContainerFilter>('all');
  const [expandedVolumeName, setExpandedVolumeName] = useState<string>();

  const filteredContainers = useMemo(() => {
    if (containerFilter === 'running') {
      return dashboard.containers.filter((item) => item.state === 'running');
    }

    if (containerFilter === 'stopped') {
      return dashboard.containers.filter((item) => item.state !== 'running');
    }

    return dashboard.containers;
  }, [containerFilter, dashboard.containers]);

  const goToTab = (tab: WorkspaceTabKey) => {
    const index = TABS.findIndex((item) => item.key === tab);
    if (index < 0) {
      return;
    }

    pagerRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                active && [styles.tabButtonActive, { backgroundColor: colors.cardElevated }],
              ]}
              onPress={() => goToTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: active ? colors.text : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveTab(TABS[page]?.key ?? 'info');
        }}
      >
        <Page width={width}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statsGrid}>
              <DockerStatCard label="运行中容器" value={String(dashboard.overview.containersRunning)} tone="success" />
              <DockerStatCard label="容器总数" value={String(dashboard.overview.containersTotal)} tone="accent" />
              <DockerStatCard label="编排数量" value={String(dashboard.overview.composeProjectsTotal)} tone="info" />
              <DockerStatCard label="Docker 版本" value={dashboard.overview.engineVersion || '--'} tone="warning" />
            </View>

            <Section title="环境概览">
              <InfoRow label="当前服务器" value={server.name} />
              <InfoRow label="镜像数量" value={`${dashboard.overview.imagesTotal} 个`} />
              <InfoRow label="存储卷数量" value={`${dashboard.overview.volumesTotal} 个`} />
              <InfoRow label="停止中的容器" value={`${dashboard.overview.containersStopped} 个`} />
            </Section>
          </ScrollView>
        </Page>

        <Page width={width}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Section
              title="容器列表"
              actionIcon="add-outline"
              onPressAction={onOpenCreateContainer}
            >
              <View style={styles.filterRow}>
                <DockerFilterChip
                  label={`全部 ${dashboard.overview.containersTotal}`}
                  active={containerFilter === 'all'}
                  onPress={() => setContainerFilter('all')}
                />
                <DockerFilterChip
                  label={`运行中 ${dashboard.overview.containersRunning}`}
                  active={containerFilter === 'running'}
                  onPress={() => setContainerFilter('running')}
                />
                <DockerFilterChip
                  label={`已停止 ${dashboard.overview.containersStopped}`}
                  active={containerFilter === 'stopped'}
                  onPress={() => setContainerFilter('stopped')}
                />
              </View>

              {filteredContainers.length === 0 ? (
                <DockerEmptySection
                  icon="cube-outline"
                  title="当前筛选下没有容器"
                  description="你可以创建新的容器，或者切换筛选查看其它状态。"
                />
              ) : (
                filteredContainers.map((container) => (
                  <ContainerCard
                    key={container.id}
                    container={container}
                    onPress={() => onOpenContainer(container)}
                    onAction={(action) => onContainerAction(container, action)}
                  />
                ))
              )}
            </Section>
          </ScrollView>
        </Page>

        <Page width={width}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Section
              title="Compose 编排"
              actionIcon="add-outline"
              onPressAction={onOpenCreateCompose}
            >
              {dashboard.composeProjects.length === 0 ? (
                <DockerEmptySection
                  icon="layers-outline"
                  title="暂未发现 Compose 项目"
                  description="当前会扫描常见目录中的 compose 文件，也可以直接手动新增。"
                />
              ) : (
                dashboard.composeProjects.map((project) => (
                  <ComposeProjectCard
                    key={`${project.name}-${project.configFiles[0] ?? 'unknown'}`}
                    project={project}
                    busy={busy}
                    onPress={() => onOpenCompose(project)}
                    onAction={(action) => onComposeAction(project, action)}
                  />
                ))
              )}
            </Section>
          </ScrollView>
        </Page>

        <Page width={width}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Section title="镜像列表">
              {dashboard.images.length === 0 ? (
                <DockerEmptySection
                  icon="albums-outline"
                  title="当前没有镜像"
                  description="可以先通过容器或编排拉起业务后再回来看。"
                />
              ) : (
                dashboard.images.map((image) => (
                  <DockerImageCard
                    key={`${image.id}-${image.reference}`}
                    image={image}
                    busy={busy}
                    onAction={(action) => onImageAction(image, action)}
                  />
                ))
              )}
            </Section>
          </ScrollView>
        </Page>

        <Page width={width}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Section title="存储卷">
              {dashboard.volumes.length === 0 ? (
                <DockerEmptySection
                  icon="save-outline"
                  title="当前没有存储卷"
                  description="Docker volume 为空时，这里会自动显示空状态。"
                />
              ) : (
                dashboard.volumes.map((volume) => (
                  <DockerVolumeCard
                    key={volume.name}
                    volume={volume}
                    busy={busy}
                    expanded={expandedVolumeName === volume.name}
                    onToggleExpand={() =>
                      setExpandedVolumeName((current) =>
                        current === volume.name ? undefined : volume.name,
                      )
                    }
                    onDelete={() => onVolumeAction(volume, 'delete')}
                  />
                ))
              )}
            </Section>
          </ScrollView>
        </Page>
      </ScrollView>
    </View>
  );
}

function Page({ width, children }: { width: number; children: React.ReactNode }) {
  return <View style={[styles.page, { width }]}>{children}</View>;
}

function Section({
  title,
  actionIcon,
  onPressAction,
  children,
}: {
  title: string;
  actionIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onPressAction?: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionText}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {actionIcon ? (
          <TouchableOpacity
            style={[
              styles.sectionAction,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={onPressAction}
          >
            <Ionicons name={actionIcon} size={18} color={colors.accent} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: '#00000018', // 内部暗黑背景垫底
    borderRadius: BorderRadius.lg,
  },
  tabButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tabButtonText: {
    ...Typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  page: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionAction: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000012',
  },
  infoLabel: {
    ...Typography.bodySmall,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
});
