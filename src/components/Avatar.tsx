import type { User } from '../types'

const sizes = {
  sm: 'h-10 w-10 text-base',
  md: 'h-14 w-14 text-xl',
  lg: 'h-24 w-24 text-3xl',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({
  user,
  size = 'md',
}: {
  user: Pick<User, 'name' | 'photoUrl'>
  size?: keyof typeof sizes
}) {
  if (user.photoUrl) {
    return (
      <img
        src={user.photoUrl}
        alt={user.name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white shadow`}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`${sizes[size]} flex items-center justify-center rounded-full bg-brand-600 font-semibold text-white shadow`}
    >
      {initials(user.name)}
    </div>
  )
}
