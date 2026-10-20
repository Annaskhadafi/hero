// Central barrel export for all HERO Shadcn Reusable Component Templates

// 1. Data Table & Grid System
export {
  HeroDataTable,
  type HeroColumnDef,
  type HeroTableFilter,
  type HeroTableFilterOption,
  type HeroDataTableProps,
} from '@/components/ui/hero-data-table'

// 2. Searchable Select Dropdown
export {
  HeroSearchableSelect,
  type HeroSearchableSelectOption,
  type HeroSearchableSelectProps,
} from '@/components/ui/hero-searchable-select'

// 3. Form Controls (Input, Number, Textarea, Switch, Field Wrapper)
export {
  HeroFormField,
  HeroInput,
  HeroNumberInput,
  HeroTextarea,
  HeroSwitch,
  type HeroFormFieldProps,
  type HeroInputProps,
  type HeroNumberInputProps,
  type HeroTextareaProps,
  type HeroSwitchProps,
} from '@/components/templates/hero-form-controls'

// 4. Date Pickers (Single Date & Range with Presets)
export {
  HeroDatePicker,
  HeroDateRangePicker,
  type HeroDatePickerProps,
  type HeroDateRangePickerProps,
} from '@/components/templates/hero-date-picker'

// 5. File Upload (Persistent S3 / Dokploy & Lightbox Preview)
export {
  HeroFileUpload,
  type HeroFileUploadProps,
} from '@/components/templates/hero-file-upload'

// 6. Modal Dialogs (Form Dialog, Confirm Alert, Detail Modal)
export {
  HeroFormDialog,
  HeroConfirmDialog,
  HeroDetailModal,
  type HeroFormDialogProps,
  type HeroConfirmDialogProps,
  type HeroDetailModalProps,
  type HeroConfirmTone,
} from '@/components/templates/hero-dialogs'

// 7. KPI & Metric Card
export {
  HeroKpiCard,
  type HeroKpiCardProps,
} from '@/components/templates/hero-kpi-card'

// 8. Status Badge & Inline Status Editor
export {
  HeroStatusBadge,
  type HeroStatusBadgeProps,
  type HeroStatusOption,
} from '@/components/templates/hero-status-badge'

// 9. Empty State
export {
  HeroEmptyState,
  type HeroEmptyStateProps,
} from '@/components/templates/hero-empty-state'
