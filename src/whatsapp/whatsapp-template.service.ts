import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization } from '../database/entities/organization.entity';
import { CURRENCIES, DEFAULT_TEMPLATES, mergeMasterSettings, TEMPLATE_VARIABLES, type TemplateKey } from '../society-settings/settings.model';

export function validateMessageTemplates(templates: Record<TemplateKey, string>): void {
  for (const key of Object.keys(TEMPLATE_VARIABLES) as TemplateKey[]) {
    const template = templates[key];
    if (typeof template !== 'string' || !template.trim() || template.length > 2000) throw new BadRequestException(`Invalid ${key} template`);
    for (const match of template.matchAll(/\{([^{}]+)\}/g)) if (!TEMPLATE_VARIABLES[key].includes(match[1])) throw new BadRequestException(`Unsupported variable {${match[1]}} in ${key}`);
    if (/[{}]/.test(template.replace(/\{[a-z_]+\}/g, ''))) throw new BadRequestException(`Invalid variable syntax in ${key}`);
    const required = key === 'notice' ? ['notice_title', 'notice_content'] : key === 'visitorArrival' ? ['visitor_name'] : ['amount'];
    if (required.some(name => !template.includes(`{${name}}`))) throw new BadRequestException(`${key} must include ${required.map(name => `{${name}}`).join(' and ')}`);
  }
}
export function renderMessage(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    if (variables[key] === undefined) throw new BadRequestException(`Missing template variable ${key}`);
    return variables[key];
  });
}
@Injectable()
export class WhatsAppTemplateService {
  constructor(private readonly source: DataSource) {}
  async render(organizationId: string, key: TemplateKey, variables: Record<string, string>): Promise<string> {
    const organization = await this.source.getRepository(Organization).findOne({ where: { id: organizationId, isActive: true }, select: { id: true, name: true, master_settings: true } });
    if (!organization) throw new BadRequestException('Society unavailable');
    const settings = mergeMasterSettings(organization.master_settings);
    const values: Record<string, string> = { ...variables, society_name: organization.name };
    if ('amount' in variables) values.amount = `${CURRENCIES[settings.profile.currencyCode]}${variables.amount}`;
    return renderMessage(settings.templates[key] || DEFAULT_TEMPLATES[key], values);
  }
}
