
const STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
const PROJECT_TYPES = [
  'Licensing & Medicaid', 'Licensing Only', 'Technical (Other)',
  'Market Research', 'Medicaid Enrollment Only',
  'Policy & Procedure Manual', 'PA', 'Home Health'
];
const ASSIGNED_CONSULTANTS = ['Michael Tarr', 'Sheikh Konneh', 'Varlee Massalay', 'Amara Kamara'];
const SUPERVISING_CONSULTANTS = ['Amara Kamara', 'Michelle Gottlieb'];
const STATUS_OPTIONS = [
  'Preparatory Stage with Consultant', 'Under State Review', 'Completed',
  'Waiting on Client', 'Submitted to State', 'Varlee Massalay'
];
const YES_NO_OPTIONS = ['Yes', 'No'];
function isValidEmail(email) {
    return /.+@.+\..+/.test(email);
}

export const dropdownFields = {
  'States': STATES,
  'Project Type': PROJECT_TYPES,
  'Assigned Consultant': ASSIGNED_CONSULTANTS,
  'Supervising Consultant': SUPERVISING_CONSULTANTS,
  'Status': STATUS_OPTIONS,
  'Submitted (Y/N)': YES_NO_OPTIONS
};

export const validateRow = (fields, isNew = false) => {
    const rowErrors = {};

    if (!fields['Project Name']) rowErrors['Project Name'] = 'Required';
    if (!isValidEmail(fields['Client Email'])) rowErrors['Client Email'] = 'Invalid email';
    if (!STATES.includes(fields['States'])) rowErrors['States'] = 'Invalid state';
    if (!PROJECT_TYPES.includes(fields['Project Type'])) rowErrors['Project Type'] = 'Invalid project type';
    if (!ASSIGNED_CONSULTANTS.includes(fields['Assigned Consultant'])) rowErrors['Assigned Consultant'] = 'Invalid';
    if (!SUPERVISING_CONSULTANTS.includes(fields['Supervising Consultant'])) rowErrors['Supervising Consultant'] = 'Invalid';
    if (!STATUS_OPTIONS.includes(fields['Status'])) rowErrors['Status'] = 'Invalid';
    if (!YES_NO_OPTIONS.includes(fields['Submitted (Y/N)'])) rowErrors['Submitted (Y/N)'] = 'Must be Yes or No';
    if (fields['Full Cost'] !== undefined && isNaN(fields['Full Cost'])) rowErrors['Full Cost'] = 'Must be a number';
    if (fields['Paid'] !== undefined && isNaN(fields['Paid'])) rowErrors['Paid'] = 'Must be a number';

    const startDate = new Date(fields['Start date']);
    const today = new Date();
    if (fields['Start date'] && (isNaN(startDate.getTime()) || startDate > today)) {
      rowErrors['Start date'] = 'Start date must be valid and not in the future';
    }

    return rowErrors;
  };