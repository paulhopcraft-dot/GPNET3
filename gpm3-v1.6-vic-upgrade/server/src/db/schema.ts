import { pgTable, varchar, date, boolean, integer, pgEnum, serial, primaryKey } from 'drizzle-orm/pg-core';

export const riskEnum = pgEnum('risk_level', ['Low','Medium','High']);
export const workStatusEnum = pgEnum('work_status', ['Not working','Suitable duties','Full duties']);

export const cases = pgTable('cases', {
  id: varchar('id', { length: 64 }).primaryKey(),
  workerName: varchar('worker_name', { length: 256 }).notNull(),
  employer: varchar('employer', { length: 256 }).notNull(),
  injuryDate: date('injury_date').notNull(),
  workStatus: workStatusEnum('work_status').notNull().default('Not working'),
  risk: riskEnum('risk').notNull().default('Medium'),
  isWorkCover: boolean('is_work_cover').notNull().default(true),
  expectedRecoveryDate: date('expected_recovery_date').notNull()
});

export const caseProgress = pgTable('case_progress', {
  id: serial('id').primaryKey(),
  caseId: varchar('case_id', { length: 64 }).notNull(),
  date: date('date').notNull(),
  capacity: integer('capacity').notNull()
});
