const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const Icon = ({ path, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    {path}
  </svg>
)

export const HomeIcon = (p) => (
  <Icon {...p} path={<><path d="M4 10.5L12 4l8 6.5" /><path d="M6 9.8V20h12V9.8" /><path d="M10 20v-5h4v5" /></>} />
)

export const DbIcon = (p) => (
  <Icon {...p} path={<><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></>} />
)

export const CheckCircleIcon = (p) => (
  <Icon {...p} path={<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>} />
)

export const AlertIcon = (p) => (
  <Icon {...p} path={<><path d="M12 4.5L21 19.5H3z" /><path d="M12 10v4" /><path d="M12 16.6v.4" /></>} />
)

export const ActivityIcon = (p) => (
  <Icon {...p} path={<path d="M3 12h4l2.5-7 4 14 2.5-7H21" />} />
)

export const ShieldIcon = (p) => (
  <Icon {...p} path={<><path d="M12 3l7.5 3v5.2c0 4.6-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5.2-7.5-9.8V6z" /><path d="M9 12l2 2 4-4.5" /></>} />
)

export const MicIcon = (p) => (
  <Icon {...p} path={<><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" /></>} />
)

export const SearchIcon = (p) => (
  <Icon {...p} path={<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>} />
)

export const SendIcon = (p) => (
  <Icon {...p} path={<><path d="M21 3L10.5 13.5" /><path d="M21 3l-6.8 18-3.7-7.5L3 9.8z" /></>} />
)

export const TrashIcon = (p) => (
  <Icon {...p} path={<><path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5l.9 12.2A1.8 1.8 0 0 0 9.2 20.5h5.6a1.8 1.8 0 0 0 1.8-1.8l.9-12.2" /><path d="M10 10.5v6M14 10.5v6" /></>} />
)

export const ChevronRightIcon = (p) => (
  <Icon {...p} path={<path d="M9.5 5.5l6 6.5-6 6.5" />} />
)

export const SparkIcon = (p) => (
  <Icon {...p} path={<path d="M12 4l1.7 4.6L18.3 10l-4.6 1.7L12 16.3l-1.7-4.6L5.7 10l4.6-1.4z" />} />
)

export const SignOutIcon = (p) => (
  <Icon {...p} path={<><path d="M9.5 21H5.8A1.8 1.8 0 0 1 4 19.2V4.8A1.8 1.8 0 0 1 5.8 3h3.7" /><path d="M15.5 16.5L20 12l-4.5-4.5" /><path d="M20 12H9" /></>} />
)
