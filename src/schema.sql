-- Packages table
CREATE TABLE packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_id INT NOT NULL UNIQUE,
  version VARCHAR(100) NOT NULL,
  description TEXT,
  maintainer VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  name_with_namespace VARCHAR(255),
  web_url VARCHAR(255),
  last_activity_at DATETIME,
  ci_config_path VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME
);

-- Pipelines table
CREATE TABLE pipelines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pipeline_id INT NOT NULL UNIQUE,
  project_id INT NOT NULL,
  status VARCHAR(50),
  created_at DATETIME,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  duration INT NULL,
  web_url VARCHAR(255) NULL,
  ref VARCHAR(100) NULL,
  sha VARCHAR(100) NULL,
  user_id INT NULL,
  CONSTRAINT fk_pipeline_package FOREIGN KEY (project_id) REFERENCES packages(project_id) ON DELETE CASCADE
);

-- Job Types table
CREATE TABLE job_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  origin ENUM('external', 'salsaci') DEFAULT 'external' NOT NULL,
  stage VARCHAR(255) NULL,
  description TEXT NULL,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  INDEX idx_job_types_name (name)
);

-- Jobs table
CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  pipeline_id INT NOT NULL,
  project_id INT NOT NULL,
  job_type_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  duration INT NULL,
  web_url VARCHAR(255) NULL,
  runner_info TEXT NULL,
  CONSTRAINT fk_job_package FOREIGN KEY (project_id) REFERENCES packages(project_id) ON DELETE CASCADE,
  CONSTRAINT fk_job_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(pipeline_id) ON DELETE CASCADE,
  CONSTRAINT fk_job_job_type FOREIGN KEY (job_type_id) REFERENCES job_types(id) ON DELETE CASCADE
);

-- Merge Requests table
CREATE TABLE merge_requests (
  iid INT PRIMARY KEY,
  title TEXT,
  description TEXT,
  created_at DATETIME NOT NULL,
  merged_at DATETIME NOT NULL,
  user_notes_count INT,
  author_id INT,
  author_username VARCHAR(255),
  author_name VARCHAR(255),
  author_avatar_url TEXT
);
