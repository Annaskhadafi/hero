import { db } from '@/db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateSections,
  formTemplateFields,
  formFieldOptions,
  formValidationRules,
  formSubmissions,
  formSubmissionValues,
} from '@/db/schema/hero'
import { eq, desc, and, sql } from 'drizzle-orm'
import type {
  FormFieldDefinition,
  FormSettings,
  FormThemeConfig,
  FormTemplateDetail,
} from './form-builder-types'

export async function listFormTemplates(options?: { category?: string; search?: string }) {
  try {
    const list = await db
      .select()
      .from(formTemplates)
      .orderBy(desc(formTemplates.updatedAt))

    return list.map((item) => ({
      id: item.id,
      templateKey: item.templateKey,
      slug: item.slug || item.templateKey,
      name: item.name,
      category: item.category,
      description: item.description,
      isActive: item.isActive,
      viewCount: item.viewCount || 0,
      startCount: item.startCount || 0,
      completionCount: item.completionCount || 0,
      themeConfig: safeJsonParse<FormThemeConfig>(item.themeConfigJson, {}),
      settings: safeJsonParse<FormSettings>(item.settingsJson, {
        requireIdentity: true,
        requireEmail: true,
        requirePhone: false,
        allowMultipleSubmissions: true,
        showProgressBar: true,
      }),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error listFormTemplates:', error)
    return []
  }
}

export async function getFormTemplateBySlugOrKey(slugOrKey: string): Promise<FormTemplateDetail | null> {
  try {
    const cleanSlug = slugOrKey.trim().toLowerCase()
    const templates = await db
      .select()
      .from(formTemplates)
      .where(sql`LOWER(${formTemplates.slug}) = ${cleanSlug} OR LOWER(${formTemplates.templateKey}) = ${cleanSlug}`)
      .limit(1)

    if (templates.length === 0) {
      return null
    }

    const tpl = templates[0]

    // Ambil latest published version atau latest version
    const versions = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, tpl.id))
      .orderBy(desc(formTemplateVersions.versionNumber))
      .limit(1)

    let fields: FormFieldDefinition[] = []

    if (versions.length > 0) {
      const v = versions[0]
      const dbFields = await db
        .select()
        .from(formTemplateFields)
        .where(eq(formTemplateFields.versionId, v.id))
        .orderBy(formTemplateFields.sortOrder)

      for (const f of dbFields) {
        // Ambil options jika ada
        const opts = await db
          .select()
          .from(formFieldOptions)
          .where(eq(formFieldOptions.fieldId, f.id))
          .orderBy(formFieldOptions.sortOrder)

        const config = safeJsonParse<Record<string, any>>(f.configJson, {})
        const logicRules = safeJsonParse<any[]>(f.logicRulesJson, [])

        fields.push({
          id: f.id,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType as any,
          label: f.label,
          placeholder: f.placeholder || undefined,
          helpText: f.helpText || undefined,
          defaultValue: f.defaultValue || undefined,
          isRequired: f.isRequired,
          isHidden: f.isHidden,
          sortOrder: f.sortOrder,
          options: opts.map((o) => ({ id: String(o.id), value: o.optionValue, label: o.optionLabel })),
          likertRows: config.likertRows,
          likertColumns: config.likertColumns,
          min: config.min,
          max: config.max,
          step: config.step,
          minLabel: config.minLabel,
          maxLabel: config.maxLabel,
          allowedFileTypes: config.allowedFileTypes,
          maxFileSizeMb: config.maxFileSizeMb,
          pageNumber: config.pageNumber || 1,
          logicRules,
        })
      }
    }

    return {
      id: tpl.id,
      templateKey: tpl.templateKey,
      slug: tpl.slug || tpl.templateKey,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      isActive: tpl.isActive,
      viewCount: tpl.viewCount || 0,
      startCount: tpl.startCount || 0,
      completionCount: tpl.completionCount || 0,
      themeConfig: safeJsonParse<FormThemeConfig>(tpl.themeConfigJson, {}),
      settings: safeJsonParse<FormSettings>(tpl.settingsJson, {
        requireIdentity: true,
        requireEmail: true,
        requirePhone: false,
        allowMultipleSubmissions: true,
        showProgressBar: true,
      }),
      fields,
      createdAt: tpl.createdAt.toISOString(),
      updatedAt: tpl.updatedAt.toISOString(),
    }
  } catch (error) {
    console.error('Error getFormTemplateBySlugOrKey:', error)
    return null
  }
}

export async function getFormTemplateById(id: number): Promise<FormTemplateDetail | null> {
  try {
    const templates = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, id))
      .limit(1)

    if (templates.length === 0) return null
    return getFormTemplateBySlugOrKey(templates[0].slug || templates[0].templateKey)
  } catch (error) {
    console.error('Error getFormTemplateById:', error)
    return null
  }
}

export async function incrementFormMetric(
  slugOrKey: string,
  metric: 'view' | 'start' | 'completion',
) {
  try {
    const clean = slugOrKey.trim().toLowerCase()
    if (metric === 'view') {
      await db
        .update(formTemplates)
        .set({
          viewCount: sql`${formTemplates.viewCount} + 1`,
        })
        .where(sql`LOWER(${formTemplates.slug}) = ${clean} OR LOWER(${formTemplates.templateKey}) = ${clean}`)
    } else if (metric === 'start') {
      await db
        .update(formTemplates)
        .set({
          startCount: sql`${formTemplates.startCount} + 1`,
        })
        .where(sql`LOWER(${formTemplates.slug}) = ${clean} OR LOWER(${formTemplates.templateKey}) = ${clean}`)
    } else if (metric === 'completion') {
      await db
        .update(formTemplates)
        .set({
          completionCount: sql`${formTemplates.completionCount} + 1`,
        })
        .where(sql`LOWER(${formTemplates.slug}) = ${clean} OR LOWER(${formTemplates.templateKey}) = ${clean}`)
    }
  } catch (err) {
    console.error('Failed to increment metric:', err)
  }
}

function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback
  try {
    return JSON.parse(jsonStr) as T
  } catch {
    return fallback
  }
}
