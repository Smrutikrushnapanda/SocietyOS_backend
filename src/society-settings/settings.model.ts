export const CURRENCIES = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$' } as const;
export type CurrencyCode = keyof typeof CURRENCIES;
export const TEMPLATE_KEYS = ['visitorArrival', 'maintenanceDue', 'maintenanceOverdue', 'notice'] as const;
export type TemplateKey = typeof TEMPLATE_KEYS[number];
export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  visitorArrival: 'Hello {resident_name}, {visitor_name} has checked in at {gate_name} for Flat {flat_number}. Open SocietyOS Visitors for details.',
  maintenanceDue: 'Hello {resident_name}, maintenance of {amount} for Flat {flat_number} is due on {due_date}. Open SocietyOS Payments for details.',
  maintenanceOverdue: 'Hello {resident_name}, maintenance of {amount} for Flat {flat_number} is overdue. Open SocietyOS Payments to view your bill.',
  notice: '*{society_name} notice*\n\n{notice_title}\n\n{notice_content}\n\nOpen SocietyOS Notices for attachments.',
};
export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  visitorArrival: ['resident_name', 'visitor_name', 'gate_name', 'flat_number', 'society_name'],
  maintenanceDue: ['resident_name', 'amount', 'due_date', 'flat_number', 'society_name'],
  maintenanceOverdue: ['resident_name', 'amount', 'due_date', 'flat_number', 'society_name'],
  notice: ['society_name', 'notice_title', 'notice_content'],
};
export interface EmergencyContact {
  id: string; name: string; phone: string; description: string;
  priority: 'Emergency' | 'Urgent' | 'Standard'; is24x7: boolean;
  residentVisible: boolean; guardVisible: boolean; active: boolean;
}
export interface BrandingSettings {
  campusImageFileId: string | null; campusTitle: string; campusDescription: string;
  accent: 'forest' | 'blue' | 'plum'; officePhone: string; officeEmail: string; officeHours: string; officeOpenTime: string; officeCloseTime: string;
}
export interface MasterSettings {
  profile: { registrationNumber: string; currencyCode: CurrencyCode };
  branding: BrandingSettings;
  emergencyContacts: EmergencyContact[];
  templates: Record<TemplateKey, string>;
}
export function defaultMasterSettings(): MasterSettings {
  return { profile: { registrationNumber: '', currencyCode: 'INR' }, branding: { campusImageFileId: null, campusTitle: 'Smart Living Campus', campusDescription: 'Manage society buildings, visitor access and shared facilities.', accent: 'forest', officePhone: '', officeEmail: '', officeHours: '', officeOpenTime: '', officeCloseTime: '' }, emergencyContacts: [], templates: { ...DEFAULT_TEMPLATES } };
}
export function mergeMasterSettings(saved?: Partial<MasterSettings> | null): MasterSettings {
  const defaults = defaultMasterSettings();
  const branding = { ...defaults.branding, ...saved?.branding };
  for (const key of ['officeStartDate', 'officeEndDate']) Reflect.deleteProperty(branding, key);
  return { ...defaults, ...saved, profile: { ...defaults.profile, ...saved?.profile }, branding, templates: { ...defaults.templates, ...saved?.templates }, emergencyContacts: saved?.emergencyContacts ?? [] };
}
