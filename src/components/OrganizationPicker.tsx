import type { Organization } from '../lib/userService'

type OrganizationPickerProps = {
  organizations: Organization[]
  isOpen: boolean
  onSelect: (organizationId: string) => void
  onClose: () => void
  onCreateRequested: () => void
}

export const OrganizationPicker = ({
  organizations,
  isOpen,
  onSelect,
  onClose,
  onCreateRequested
}: OrganizationPickerProps) => {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>Select an organization</h3>
          <button className="ghost-btn" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p>Choose which workspace you want to browse. You can switch at any time.</p>

        <ul className="organization-picker__list">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <button type="button" className="channel-btn" onClick={() => onSelect(organization.id)}>
                <span>{organization.name}</span>
                <small>Member count: {organization.memberIds.length}</small>
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="ghost-btn" onClick={onCreateRequested}>
          + Create a new organization
        </button>
      </div>
    </div>
  )
}
