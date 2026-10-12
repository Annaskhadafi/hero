export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'star_rating'
  | 'likert_matrix'
  | 'nps'
  | 'ranking'
  | 'file_upload'
  | 'signature'
  | 'slider'
  | 'page_break'
  | 'section_header'

export interface FormOptionItem {
  id?: string
  value: string
  label: string
}

export interface LikertRow {
  id: string
  label: string
}

export interface LikertColumn {
  id: string
  label: string
  points: number
}

export interface FieldLogicRule {
  id: string
  action: 'show' | 'hide' | 'jump_to_page'
  targetFieldOrPageKey: string
  conditionOperator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  compareValue: string
}

export interface FormFieldDefinition {
  id?: number
  fieldKey: string
  fieldType: FormFieldType
  label: string
  placeholder?: string
  helpText?: string
  defaultValue?: string
  isRequired: boolean
  isHidden?: boolean
  sortOrder: number
  sectionKey?: string
  pageNumber?: number
  options?: FormOptionItem[]
  likertRows?: LikertRow[]
  likertColumns?: LikertColumn[]
  min?: number
  max?: number
  step?: number
  minLabel?: string
  maxLabel?: string
  allowedFileTypes?: string[]
  maxFileSizeMb?: number
  logicRules?: FieldLogicRule[]
}

export interface FormThemeConfig {
  primaryColor?: string
  accentColor?: string
  backgroundColor?: string
  bgPattern?: 'none' | 'dots' | 'grid' | 'mesh' | 'waves' | 'gradient' | 'luxury'
  headerBannerStyle?: 'minimal' | 'gradient' | 'glass' | 'corporate'
  cardBackgroundColor?: string
  textColor?: string
  fontFamily?: string
  logoUrl?: string
  bannerUrl?: string
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  buttonStyle?: 'solid' | 'outline' | 'soft'
}

export interface CustomIdentityField {
  id: string
  key: string
  label: string
  placeholder?: string
  isRequired: boolean
}

export interface FormSettings {
  requireIdentity: boolean
  requireEmail: boolean
  requirePhone: boolean
  requireCompany?: boolean // Nama Customer / Perusahaan
  requireSite?: boolean // Nama Site / Lokasi Tambang/Pabrik
  requireDepartment?: boolean // Departemen / Divisi
  identityTitle?: string
  identitySubtitle?: string
  companyLabel?: string // e.g. "Nama Customer / Perusahaan"
  siteLabel?: string // e.g. "Nama Site / Lokasi Kerja"
  departmentLabel?: string // e.g. "Departemen / Divisi"
  customIdentityFields?: CustomIdentityField[]
  allowMultipleSubmissions: boolean
  showProgressBar: boolean
  shuffleQuestions?: boolean
  closeDate?: string | null
  maxResponses?: number | null
  accessPassword?: string
  customThankYouMessage?: string
  redirectUrl?: string
  notifyEmailOnSubmission?: string
}

export interface FormTemplateDetail {
  id: number
  templateKey: string
  slug: string
  name: string
  category: string
  description: string
  isActive: boolean
  viewCount: number
  startCount: number
  completionCount: number
  themeConfig: FormThemeConfig
  settings: FormSettings
  fields: FormFieldDefinition[]
  createdAt: string
  updatedAt: string
}
