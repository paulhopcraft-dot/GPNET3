-- GPM3 v1.6 init
CREATE TYPE risk_level AS ENUM ('Low','Medium','High');
CREATE TYPE work_status AS ENUM ('Not working','Suitable duties','Full duties');

CREATE TABLE IF NOT EXISTS cases (
  id varchar(64) PRIMARY KEY,
  worker_name varchar(256) NOT NULL,
  employer varchar(256) NOT NULL,
  injury_date date NOT NULL,
  work_status work_status NOT NULL DEFAULT 'Not working',
  risk risk_level NOT NULL DEFAULT 'Medium',
  is_work_cover boolean NOT NULL DEFAULT true,
  expected_recovery_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS case_progress (
  id serial PRIMARY KEY,
  case_id varchar(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  date date NOT NULL,
  capacity integer NOT NULL
);

-- basic indexes
CREATE INDEX IF NOT EXISTS idx_cases_employer ON cases (employer);
CREATE INDEX IF NOT EXISTS idx_progress_case ON case_progress (case_id, date);
