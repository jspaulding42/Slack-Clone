import type { Channel } from '../lib/chatService'

type ChannelSidebarProps = {
  channels: Channel[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onCreateChannel: () => void
  isLoading?: boolean
}

export const ChannelSidebar = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  isLoading = false
}: ChannelSidebarProps) => (
  <aside className="sidebar">
    <header>
      <h2>Channels</h2>
      <button className="ghost-btn" type="button" onClick={onCreateChannel}>
        + New
      </button>
    </header>

    {isLoading && <p className="sidebar__hint">Loading channels…</p>}
    {!isLoading && channels.length === 0 && (
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
