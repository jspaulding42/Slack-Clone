import type { Channel } from '../lib/chatService'

type ChannelSidebarProps = {
  channels: Channel[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onCreateChannel: () => void
  onSwitchOrganization: () => void
  onInvite: () => void
  onLogout: () => void
  organizationName?: string
  isLoading?: boolean
}

export const ChannelSidebar = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  onSwitchOrganization,
  onInvite,
  onLogout,
  organizationName,
  isLoading = false
}: ChannelSidebarProps) => (
  <aside className="sidebar">
    <div className="sidebar__org-card">
      <div>
        <p>Workspace</p>
        <strong>{organizationName ?? 'No organization selected'}</strong>
      </div>
      <div className="sidebar__org-actions">
        <button className="ghost-btn" type="button" onClick={onSwitchOrganization}>
          Switch
        </button>
        <button className="ghost-btn" type="button" onClick={onInvite} disabled={!organizationName}>
          Invite
        </button>
        <button className="ghost-btn" type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>

    <header>
      <h2>Channels</h2>
      <button className="ghost-btn" type="button" onClick={onCreateChannel} disabled={!organizationName}>
        + New
      </button>
    </header>

    {isLoading && <p className="sidebar__hint">Loading channels…</p>}
    {!isLoading && channels.length === 0 && organizationName && (
      <p className="sidebar__hint">Create your first channel to get started.</p>
    )}

    <ul>
      {channels.map((channel) => (
        <li key={channel.id}>
          <button
            className={channel.id === selectedChannelId ? 'channel-btn active' : 'channel-btn'}
            type="button"
            onClick={() => onSelectChannel(channel.id)}
          >
            <span># {channel.name}</span>
            {channel.topic && <small>{channel.topic}</small>}
          </button>
        </li>
      ))}
    </ul>
  </aside>
)
