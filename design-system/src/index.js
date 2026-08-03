/* Public API — @slep/ui */

export { cn } from './lib/cn.js'
export {
  chartColors,
  seriesColor,
  prioritySeriesColor,
  deriveColorTokens,
  chartAxisTick,
  chartGridProps,
} from './lib/charts.js'

export { Icon, iconNames, iconLabels, resolveIconName } from './icons/Icon.jsx'

export { Button, IconButton, ButtonSplit, ACTION_TO_VARIANT } from './components/ui/Button.jsx'
export {
  Field,
  Input,
  Select,
  Textarea,
  Switch,
  FileInput,
  TextField,
} from './components/ui/Field.jsx'
export {
  CurrencyInput,
  formatCLPDisplay,
  parseCLPInput,
} from './components/ui/CurrencyInput.jsx'
export {
  KmInput,
  formatKmDisplay,
  parseKmInput,
} from './components/ui/KmInput.jsx'
export { Badge } from './components/ui/Badge.jsx'
export { Avatar, getAvatarInitials } from './components/ui/Avatar.jsx'
export { Alert } from './components/ui/Alert.jsx'
export { ToastProvider, useToast } from './components/ui/Toast.jsx'
export {
  EmptyState,
  Skeleton,
  PermissionBlock,
  ActionBlock,
  EmptyStateWithAction,
} from './components/ui/EmptyState.jsx'
export { PageHeader, Breadcrumbs } from './components/ui/PageHeader.jsx'
export { FiltersBar } from './components/ui/FiltersBar.jsx'
export {
  DataTable,
  TableSkeleton,
  Pagination,
  PageSizeSelector,
} from './components/ui/DataTable.jsx'
export { Modal, ConfirmModal, Drawer } from './components/ui/Modal.jsx'
export {
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from './components/ui/Dropdown.jsx'
export {
  CrudForm,
  FormSection,
  FormStatus,
  FormActions,
  DetailView,
  DetailGrid,
  DetailItem,
} from './components/ui/CrudForm.jsx'
export { FormOverlay } from './components/ui/FormOverlay.jsx'
export { useFormOverlay, formatApiFormError } from './hooks/useFormOverlay.js'
export { LoginCard } from './components/ui/LoginCard.jsx'
export {
  Card,
  CardHeader,
  MetricStrip,
  AccessList,
  FeedList,
} from './components/ui/Card.jsx'
export { ChartCard } from './components/ui/ChartCard.jsx'
export {
  ChartTooltip,
  ChartBar,
  ChartArea,
  ChartPie,
} from './components/charts/index.js'

export {
  AppShell,
  useAppShell,
  SidebarBrand,
  NavItem,
  NavAccordion,
  Topbar,
  NotificationBell,
} from './layouts/AppShell.jsx'
