-- Add case_phase column to profiles for tracking case advancement
ALTER TABLE profiles 
ADD COLUMN case_phase TEXT DEFAULT 'submitted';

-- Add comment
COMMENT ON COLUMN profiles.case_phase IS 'Case phase: submitted, review, investigation, recovery, completed';