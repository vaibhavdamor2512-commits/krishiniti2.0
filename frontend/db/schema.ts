import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  passwordHash: text('password_hash').notNull(),
  location: text('location').notNull().default(''),
  farmSize: real('farm_size').notNull().default(0),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('idx_users_mobile').on(table.mobile)])

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('idx_sessions_token_hash').on(table.tokenHash), index('idx_sessions_user_id').on(table.userId)])

export const farms = sqliteTable('farms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  location: text('location').notNull(),
  totalArea: real('total_area').notNull().default(0),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_farms_user_id').on(table.userId)])

export const fields = sqliteTable('fields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  farmId: integer('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  polygon: text('polygon').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  area: real('area').notNull(),
  currentCrop: text('current_crop'),
  sowingDate: text('sowing_date'),
  irrigationAvailable: integer('irrigation_available', { mode: 'boolean' }).notNull().default(true),
  soil: text('soil').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_fields_farm_id').on(table.farmId)])

export const diseaseAnalyses = sqliteTable('disease_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  cropName: text('crop_name').notNull(),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  analysisJson: text('analysis_json').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_disease_analyses_user_id').on(table.userId)])

export const recommendationRuns = sqliteTable('recommendation_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldId: integer('field_id').notNull().references(() => fields.id, { onDelete: 'cascade' }),
  resultJson: text('result_json').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_recommendation_runs_user_id').on(table.userId), index('idx_recommendation_runs_field_id').on(table.fieldId)])
