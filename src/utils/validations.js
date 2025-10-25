// A fixed list of the 18 standard activities.
export const DEFAULT_ACTIVITIES = [
    "Preparation And Assistance with Required Corporate Actions",
    "Completion Of Requirement and Application Process",
    "Customized, State-Specific Policies and Procedures",
    "Client Admission Packet",
    "Website, Domain, And Email Setup",
    "Marketing And Advertising Materials",
    "Operational Training",
    "Compliance And Regulatory Support",
    "Marketing And Client Acquisition Strategies",
    "Accreditation Support",
    "Quality Assurance Programs",
    "Certificate Of Needs Development",
    "Medicaid Provider Enrollment",
    "MCO Enrollment & Credentialing",
    "Medicare Enrollment & Certification",
    "Other Insurance Payers",
    "Private Pay & Referral Network",
    "Accreditation Support Services (ACHC, Chap, Joint Commission)"
];

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
const ASSIGNED_CONSULTANTS = [
  "Michael Tarr",
  "Sheikh Konneh",
  "Varlee Massalay",
  "Amara M Kamara",
  "Michelle Gottlieb",
  "Fatu Kaba",
];
const SUPERVISING_CONSULTANTS = ['Amara M Kamara', 'Michelle Gottlieb'];
const PROJECT_MANAGERS = ['Dave Logan', 'Fatima Koroma', 'System Notification', 'Waiver Group']
const STATUS_OPTIONS = [
  'Active',
  'Preparatory Stage with Consultant',
  'Waiting on Client',
  'Submitted to State',
  'Under State Review',
  'Provisional Approval',
  'Completed'
];
const YES_NO_OPTIONS = ['Yes', 'No'];
const OPERATION_OPTIONS = ['Active', 'Deactivated'];
function isValidEmail(email) {
    return /.+@.+\..+/.test(email);
}

export const FORM_FIELD_TYPES = [
    "Single line text",
    "Date",
    "Email",
    "Phone number",
    "Number"
];
export const assignedConsultants_record_ids = {
  "Michael Tarr": "recOzrRz3YrzGii4n",
  "Sheikh Konneh": "rec3fMpelGC2FuNEn",
  "Varlee Massalay": "recmZVYx7eWMegqws",
  "Amara M Kamara": "recq5ysM6WlPuPjvV",
  "Michelle Gottlieb": "recXHKvFddE9Czi6e",
  "Fatu Kaba": "reckzFP0vNYatsd3E"
}
export const dropdownFields = {
    "Assigned Consultant": [
      "Michael Tarr",
      "Sheikh Konneh",
      "Varlee Massalay",
      "Amara M Kamara",
      "Michelle Gottlieb",
      "Fatu Kaba",
    ],
    "Project Manager": [
      "Dave Logan",
      "Fatima Koroma",
      "System Notification",
      "Waiver Group"
    ],
    "Supervising Consultant": [
      "Amara M Kamara",
      "Michelle Gottlieb"
    ],
    "States": [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE",
    "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
    "LA", "ME", "MD", "MA", "MI", "MN", "MS",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
    "NY", "NC", "ND", "OH", "OK", "OR", "PA",
    "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY"
    ],
    "Project Type": [
        "Licensing & Medicaid",
        "Licensing Only",
        "Technical (Other)",
        "Market Research",
        "Medicaid Enrollment Only",
        "Policy & Procedure Manual",
        "PA",
        "Home Health"
    ],
    "Status": [
      "Active",
      "Preparatory Stage with Consultant",
      "Waiting on Client",
      "Submitted to State",
      "Under State Review",
      "Provisional Approval",
      "Completed"
    ],
    "Submitted (Y/N)": [
        "Yes",
        "No"
    ],
    "Operation": [
        "Active",
        "Deactivated"
    ],
    "Action_type": [
        "Attach Files",
        "Complete Form",
        "Complete Checklist",
        "Require Approval",
        "Default",
        "Review Only"
    ],
    "field_type": [
        "Single line text",
        "Date",
        "Email",
        "Phone number",
        "Number"
    ]
};

export const validateRow = (fields) => {
    const rowErrors = {};

    if (!fields['Project Name']) rowErrors['Project Name'] = 'Required';
    if (!isValidEmail(fields['Client Email'])) rowErrors['Client Email'] = 'Invalid email';
    if (!STATES.includes(fields['States'])) rowErrors['States'] = 'Invalid state';
    if (!PROJECT_TYPES.includes(fields['Project Type'])) rowErrors['Project Type'] = 'Invalid project type';
    if (!ASSIGNED_CONSULTANTS.includes(fields['Assigned Consultant'])) rowErrors['Assigned Consultant'] = 'Invalid';
    if (fields['Supervising Consultant'] && !SUPERVISING_CONSULTANTS.includes(fields['Supervising Consultant'])) rowErrors['Supervising Consultant'] = 'Invalid';
    if (!PROJECT_MANAGERS.includes(fields['Project Manager'])) rowErrors['Project Manager'] = 'Invalid';
    if (!STATUS_OPTIONS.includes(fields['Status'])) rowErrors['Status'] = 'Invalid';
    if (!YES_NO_OPTIONS.includes(fields['Submitted (Y/N)'])) rowErrors['Submitted (Y/N)'] = 'Must be Yes or No';
    if (fields['Operation'] && !OPERATION_OPTIONS.includes(fields['Operation'])) rowErrors['Operation'] = 'Must be Active or Deactivated';
    if (fields['Full Cost'] !== undefined && isNaN(fields['Full Cost'])) rowErrors['Full Cost'] = 'Must be a number';
    if (fields['Paid'] !== undefined && isNaN(fields['Paid'])) rowErrors['Paid'] = 'Must be a number';
    const startDate = new Date(fields['Start date']);

    const today = new Date();
    if (fields['Start date'] && (isNaN(startDate.getTime()) || startDate > today)) {
      rowErrors['Start date'] = 'Start date must be valid and not in the future';
    }

    return rowErrors;
  };

export const safeNewDate = (dateValue) => {
    if (!dateValue) return null;

    let d;
    // If it's a string in YYYY-MM-DD format, add time to avoid timezone issues.
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        d = new Date(dateValue + 'T00:00:00');
    } else {
        // For other formats (ISO strings, timestamps, Date objects), create date directly.
        d = new Date(dateValue);
    }

    // Final check for validity
    if (isNaN(d.getTime())) {
        return null;
    }

    return d;
};

export const fromLexical = (lexicalJSON) => {
  try {
      const parsed = JSON.parse(lexicalJSON);
      return parsed.root.children.map(p => p.children.map(c => c.text).join('')).join('\n');
  } catch (e) {
      return lexicalJSON;
  }
};