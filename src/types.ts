export type UserType = 'admin' | 'office' | 'applicant';

export interface User {
  User_ID: string;
  User_Name: string;
  Password?: string;
  User_Type: UserType;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Department {
  Dept_ID: string;
  Dept_Name: string;
  Dept_Type: string; // 1. Central, 2. State, 3. PSU, 4. Private
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Office {
  Office_ID: string;
  Office_Name: string;
  Address: string;
  State: string;
  District: string;
  Pincode: string;
  Dept_ID: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface GeneralUser {
  User_ID: string;
  Candidate_Name: string;
  Candidate_Name_HI: string;
  Gender: string;
  DOB: string;
  DOB_Certificate_Type: string;
  DOB_Doc: string;
  Father_Name: string;
  Father_Name_HI: string;
  Mother_Name: string;
  Mother_Name_HI: string;
  Photo_URL: string;
  Signature_URL: string;
  ID_Proof: string;
  ID_Number: string;
  ID_Doc: string;
  Email_ID: string;
  Mobile: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface OfficeUser {
  Dept_ID: string;
  Office_ID: string;
  User_ID: string;
  Officer_Name: string;
  Designation: string;
  Email_ID: string;
  Mobile: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Advertisement {
  Adv_ID: string;
  Dept_ID: string;
  Office_ID: string;
  Letter_No: string;
  Title: string;
  Instructions: string;
  Terms_Conditions: string;
  Adv_Doc?: string;
  Start_Date: string;
  End_Date: string;
  Clm_Strt_Dt?: string;
  Clm_End_Dt?: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Post {
  Post_ID: string;
  Post_Name: string;
  Post_Type: string;
  Service_Type: string;
  Class: string;
  Payscale: string;
  Qualification: string;
  Experience: string;
  Adv_ID: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Application {
  Appl_ID: string;
  Adv_ID: string;
  Post_ID: string;
  User_ID: string;
  Apply_Date: string;
  Status?: string; // e.g., 'Submitted', 'Eligible', 'Ineligible'
  Remark?: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface AdditionalInfo {
  Appl_ID: string;
  User_ID: string;
  Candidate_Name: string;
  Is_CG: string;
  Domicile_State: string;
  Domicile_District: string;
  Locality: string;
  Domicile_Certificate_URL: string;
  Caste_Category: string;
  Caste_State: string;
  Caste_District: string;
  Caste_Certificate_URL: string;
  Is_PWD: string;
  PwD_State: string;
  PwD_District: string;
  PwD_Percentage: string;
  PwD_Certificate_URL: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface AddressInfo {
  Appl_ID: string;
  User_ID: string;
  Candidate_Name: string;
  Perm_Address: string;
  Perm_Landmark: string;
  Perm_State: string;
  Perm_District: string;
  Perm_Pincode: string;
  Is_Same: string;
  Curr_Address: string;
  Curr_Landmark: string;
  Curr_State: string;
  Curr_District: string;
  Curr_Pincode: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface QualificationInfo {
  Appl_ID: string;
  User_ID: string;
  Candidate_Name: string;
  Qualification_Type: string;
  Course_Name: string;
  Board_Name: string;
  Institute_Name: string;
  Pass_Year: string;
  Result_Status: string;
  Marks_Type: string;
  Max_Marks: string;
  Marks_Obtained: string;
  Percentage: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface ExperienceInfo {
  Appl_ID: string;
  User_ID: string;
  Candidate_Name: string;
  Currently_Working: string;
  Employer_Type: string;
  Employment_Type: string;
  Employer_Name: string;
  Employer_Address: string;
  Post_Held: string;
  Start_Date: string;
  End_Date: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface GlobalConstant {
  Constant_ID: string;
  Category: string; // e.g., 'ID_PROOF', 'GENDER', etc.
  Value: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}

export interface Claim {
  Claim_ID: string;
  Appl_ID: string;
  User_ID: string;
  Description: string;
  Proof_Doc_URL: string;
  Status: string; // 'Pending', 'Verified', 'Rejected'
  Officer_Remark: string;
  T_STMP_ADD: string;
  T_STMP_UPD: string;
}
