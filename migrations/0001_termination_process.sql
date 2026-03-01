-- Termination process core table
CREATE TABLE IF NOT EXISTS "termination_processes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_case_id" varchar NOT NULL REFERENCES "worker_cases"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'NOT_STARTED',
  "pre_injury_role" text,
  "rtw_attempts_summary" text,
  "has_sustainable_role" boolean,
  "alternative_roles_considered_summary" text,
  "agent_meeting_date" timestamp,
  "agent_meeting_notes_id" text,
  "consultant_invite_date" timestamp,
  "consultant_appointment_date" timestamp,
  "consultant_report_id" text,
  "long_term_restrictions_summary" text,
  "can_return_pre_injury_role" boolean,
  "pre_termination_invite_sent_date" timestamp,
  "pre_termination_meeting_date" timestamp,
  "pre_termination_meeting_location" text,
  "worker_allowed_representative" boolean,
  "worker_instructed_not_to_attend_work" boolean,
  "pay_status_during_stand_down" text,
  "pre_termination_letter_doc_id" text,
  "pre_termination_meeting_held" boolean,
  "pre_termination_meeting_notes_id" text,
  "any_new_medical_info_provided" boolean,
  "new_medical_docs_summary" text,
  "decision" text NOT NULL DEFAULT 'NO_DECISION',
  "decision_date" timestamp,
  "decision_rationale" text,
  "termination_effective_date" timestamp,
  "termination_notice_weeks" integer,
  "notice_type" text,
  "termination_letter_doc_id" text,
  "entitlements_summary" text,
  "ongoing_comp_arrangements" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Extend worker_cases with termination tracking
ALTER TABLE "worker_cases"
  ADD COLUMN IF NOT EXISTS "employment_status" text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "termination_process_id" varchar,
  ADD COLUMN IF NOT EXISTS "termination_reason" text,
  ADD COLUMN IF NOT EXISTS "termination_audit_flag" text;

-- Document templates + generated docs
CREATE TABLE IF NOT EXISTS "document_templates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "generated_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "worker_case_id" varchar REFERENCES "worker_cases"("id") ON DELETE CASCADE,
  "template_code" text,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Seed termination letter template if not present
INSERT INTO "document_templates" ("code", "body")
SELECT 'TERMINATION_LETTER', '{{date}}\n\n{{workerName}}\n{{workerAddressLine1}}\n{{workerAddressLine2}}\n\nDear {{workerFirstName}},\n\nRe: Termination of Employment\n\nWe write further to our recent correspondence and the request for medical information regarding your capacity to perform the inherent requirements of your pre-injury position as {{positionTitle}} at {{companyName}}.\n\n{{#noAdditionalMedicalInfo}}\n{{companyName}} has not received any additional medical information regarding your ability to carry out the inherent requirements of your pre-injury position as {{positionTitle}}.\n{{/noAdditionalMedicalInfo}}\n\n{{#medicalInfoReceivedNotFit}}\n{{companyName}} has received the medical information submitted by {{doctorName}}. After reviewing this material, we are not satisfied that you are fit to carry out the inherent requirements of your pre-injury position as {{positionTitle}} now or in the foreseeable future.\n\n{{medicalExplanation}}\n{{/medicalInfoReceivedNotFit}}\n\n{{#medicalInfoReceivedFit}}\n{{companyName}} has received the medical information submitted by {{doctorName}} regarding your ability to carry out the inherent requirements of your pre-injury position as {{positionTitle}}. On the basis of that information, we have concluded that your employment will not be terminated at this time, and we will continue to work with you regarding your return to work.\n{{/medicalInfoReceivedFit}}\n\n{{#employmentTerminated}}\nIt is with regret that we advise the available information supports that you are unable to carry out the inherent requirements of your pre-injury position as {{positionTitle}} and are unlikely to be able to do so in the foreseeable future.\n\nTogether with you, we have explored alternative positions within {{companyName}} and have not been able to identify any suitable options that would accommodate your current level of reduced capacity.\n\nOn the basis of the above, your employment with {{companyName}} is terminated on incapacity grounds, effective from {{terminationDate}}.\n\nYour employment entitlements will be paid to you on {{entitlementPaymentDate}}, including:\n- Payment of your notice period (if applicable),\n- Accrued but untaken annual leave, and\n- Any other applicable entitlements in accordance with legislation and your contract.\n\nWe will also provide you with a Separation Certificate.\n\nWe thank you for the contribution you have made to our business since your commencement and we wish you well in your future endeavours.\n{{/employmentTerminated}}\n\nYours sincerely,\n\n{{managerName}}\n{{managerTitle}}\n{{managerPhone}}\n'
WHERE NOT EXISTS (SELECT 1 FROM "document_templates" WHERE "code" = 'TERMINATION_LETTER');
