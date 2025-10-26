import type { Channel } from '../lib/chatService'

type ChannelSidebarProps = {
  channels: Channel[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onCreateChannel: () => void
  onSwitchOrganization: () => void
  onCreateOrganization: () => void
  onSignOut: () => void
  onEditProfile: () => void
  organizationName?: string | null
  canSwitchOrganization?: boolean
  userDisplayName?: string | null
  userEmail?: string | null
  userProfilePictureUrl?: string | null
  isLoading?: boolean
}

export const ChannelSidebar = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  onSwitchOrganization,
  onCreateOrganization,
  onSignOut,
  onEditProfile,
  organizationName,
  canSwitchOrganization = false,
  userDisplayName,
  userEmail,
  userProfilePictureUrl,
  isLoading = false
}: ChannelSidebarProps) => (
  <aside className="sidebar">
    <section className="sidebar__section">
      <p className="sidebar__label">Organization</p>
      <div className="sidebar__section-row">
        <div className="sidebar__section-copy">
          <strong>{organizationName ?? 'No organization selected'}</strong>
        </div>
        <div className="sidebar__actions">
          <button
            className="ghost-btn"
            type="button"
            onClick={onSwitchOrganization}
            disabled={!canSwitchOrganization}
          >
            Switch
          </button>
          <button className="ghost-btn" type="button" onClick={onCreateOrganization}>
            + Org
          </button>
        </div>
      </div>
    </section>

    <section className="sidebar__section">
      <p className="sidebar__label">Account</p>
      <div className="sidebar__section-row">
        <div className="sidebar__user-info">
          <div className="sidebar__user-avatar">
            {userProfilePictureUrl ? (
              <img 
                src={userProfilePictureUrl} 
                alt="Profile" 
                className="sidebar__user-avatar-img"
              />
            ) : (
              <div className="sidebar__user-avatar-placeholder">
                {(userDisplayName ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="sidebar__section-copy">
            <strong>{userDisplayName ?? 'Anonymous'}</strong>
            {userEmail && <small>{userEmail}</small>}
          </div>
        </div>
        <div className="sidebar__actions">
          <button className="ghost-btn" type="button" onClick={onEditProfile}>
            Edit Profile
          </button>
          <button className="ghost-btn" type="button" onClick={onSignOut}>
            Log out
          </button>
        </div>
      </div>
    </section>

    <section className="sidebar__channels">
      <header className="sidebar__channels-header">
        <div>
          <p className="sidebar__label">Browse</p>
          <h2>Channels</h2>
        </div>
        <button className="ghost-btn" type="button" onClick={onCreateChannel} disabled={!organizationName}>
          + New
        </button>
      </header>

      {!organizationName && (
        <p className="sidebar__hint">Select or create an organization to see channels.</p>
      )}
      {organizationName && isLoading && <p className="sidebar__hint">Loading channels…</p>}
      {organizationName && !isLoading && channels.length === 0 && (
        <p className="sidebar__hint">Create your first channel to get started.</p>
      )}

      <ul className="sidebar__channel-list">
        {channels.map((channel) => (
          <li key={channel.id}>
            <button
              className={channel.id === selectedChannelId ? 'channel-btn active' : 'channel-btn'}
              type="button"
              onClick={() => onSelectChannel(channel.id)}
            >
              <span className="channel-btn__name"># {channel.name}</span>
              {channel.topic && <small className="channel-btn__topic">{channel.topic}</small>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  </aside>
)
