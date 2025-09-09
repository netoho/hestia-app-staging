'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Briefcase, Users } from 'lucide-react';
import { t } from '@/lib/i18n';

interface PolicyDetailsContentProps {
  profileData?: any;
  employmentData?: any;
  referencesData?: any;
}

export function PolicyDetailsContent({ 
  profileData, 
  employmentData, 
  referencesData 
}: PolicyDetailsContentProps) {
  return (
    <div className="space-y-6">
      {/* Profile Data */}
      {profileData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.pages.policies.details.sections.personalInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.nationality}</p>
                <p className="font-medium">{profileData.nationality === 'mexican' ? t.pages.policies.details.fields.mexican : t.pages.policies.details.fields.foreign}</p>
              </div>
              {profileData.curp && (
                <div>
                  <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.curp}</p>
                  <p className="font-medium">{profileData.curp}</p>
                </div>
              )}
              {profileData.passport && (
                <div>
                  <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.passport}</p>
                  <p className="font-medium">{profileData.passport}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment Data */}
      {employmentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t.pages.policies.details.sections.employmentInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.employmentStatus}</p>
                <p className="font-medium">{employmentData.employmentStatus}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.industry}</p>
                <p className="font-medium">{employmentData.industry}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.company}</p>
                <p className="font-medium">{employmentData.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.position}</p>
                <p className="font-medium">{employmentData.position}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.monthlyIncome}</p>
                <p className="font-medium">${employmentData.monthlyIncome?.toLocaleString()} MXN</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.pages.policies.details.fields.creditCheckConsent}</p>
                <p className="font-medium">{employmentData.creditCheckConsent ? t.pages.policies.details.fields.yes : t.pages.policies.details.fields.no}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* References Data */}
      {referencesData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t.pages.policies.details.sections.references}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t.pages.policies.details.references.personalReference}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.name}</p>
                    <p className="font-medium">{referencesData.personalReferenceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.phone}</p>
                    <p className="font-medium">{referencesData.personalReferencePhone}</p>
                  </div>
                </div>
              </div>
              
              {referencesData.workReferenceName && (
                <div>
                  <h4 className="font-medium mb-2">{t.pages.policies.details.references.workReference}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.name}</p>
                      <p className="font-medium">{referencesData.workReferenceName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.phone}</p>
                      <p className="font-medium">{referencesData.workReferencePhone}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {referencesData.landlordReferenceName && (
                <div>
                  <h4 className="font-medium mb-2">{t.pages.policies.details.references.landlordReference}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.name}</p>
                      <p className="font-medium">{referencesData.landlordReferenceName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.pages.policies.details.references.phone}</p>
                      <p className="font-medium">{referencesData.landlordReferencePhone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}