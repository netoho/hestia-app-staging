'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Send, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { t } from '@/lib/i18n';

interface PolicyReviewStepProps {
  policy: {
    profileData?: any;
    employmentData?: any;
    referencesData?: any;
    documentsData?: any;
  };
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function PolicyReviewStep({ policy, onBack, onSubmit, isSubmitting }: PolicyReviewStepProps) {
  const isComplete = policy.profileData && policy.employmentData && policy.referencesData;
  const hasRequiredDocuments = policy.documentsData && 
    policy.documentsData.identificationCount > 0 && 
    policy.documentsData.incomeCount > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{t.wizard.review.title}</h2>
        <p className="text-muted-foreground">
          {t.wizard.review.description}
        </p>
      </div>

      {/* Completion Status */}
      <Alert className={isComplete && hasRequiredDocuments ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
        <div className="flex items-center gap-2">
          {isComplete && hasRequiredDocuments ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          )}
          <AlertDescription className={isComplete && hasRequiredDocuments ? "text-green-800" : "text-orange-800"}>
            {isComplete && hasRequiredDocuments 
              ? t.wizard.review.completeStatus
              : t.wizard.review.incompleteStatus
            }
          </AlertDescription>
        </div>
      </Alert>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {policy.profileData ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            {t.wizard.review.personalInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policy.profileData ? (
            <div className="space-y-3">
              <div>
                <span className="font-medium">{t.wizard.review.nationality}</span>{" "}
                <Badge variant="outline">
                  {policy.profileData.nationality === 'mexican' ? t.wizard.review.mexican : t.wizard.review.foreign}
                </Badge>
              </div>
              {policy.profileData.curp && (
                <div>
                  <span className="font-medium">{t.wizard.review.curp}</span> {policy.profileData.curp}
                </div>
              )}
              {policy.profileData.passport && (
                <div>
                  <span className="font-medium">{t.wizard.review.passport}</span> {policy.profileData.passport}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">{t.wizard.review.notCompleted}</p>
          )}
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {policy.employmentData ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            {t.wizard.review.employmentInfo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policy.employmentData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">{t.wizard.review.employmentStatus}</span> {policy.employmentData.employmentStatus}
                </div>
                <div>
                  <span className="font-medium">{t.wizard.review.industry}</span> {policy.employmentData.industry}
                </div>
                <div>
                  <span className="font-medium">{t.wizard.review.occupation}</span> {policy.employmentData.occupation}
                </div>
                <div>
                  <span className="font-medium">{t.wizard.review.company}</span> {policy.employmentData.companyName}
                </div>
                <div>
                  <span className="font-medium">{t.wizard.review.position}</span> {policy.employmentData.position}
                </div>
                <div>
                  <span className="font-medium">{t.wizard.review.monthlyIncome}</span>{" "}
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(policy.employmentData.monthlyIncome)}
                  </span>
                </div>
              </div>
              {policy.employmentData.companyWebsite && (
                <div>
                  <span className="font-medium">{t.wizard.review.companyWebsite}</span> {policy.employmentData.companyWebsite}
                </div>
              )}
              {policy.employmentData.workAddress && (
                <div>
                  <span className="font-medium">{t.wizard.review.workAddress}</span> {policy.employmentData.workAddress}
                </div>
              )}
              <div>
                <span className="font-medium">{t.wizard.review.creditCheckConsent}</span>{" "}
                <Badge variant={policy.employmentData.creditCheckConsent ? "default" : "destructive"}>
                  {policy.employmentData.creditCheckConsent ? t.wizard.review.granted : t.wizard.review.notGranted}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">{t.wizard.review.notCompleted}</p>
          )}
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {policy.referencesData ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            {t.wizard.review.references}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policy.referencesData ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t.wizard.review.personalReference}</h4>
                <div className="pl-4 space-y-1">
                  <div><span className="font-medium">{t.wizard.review.name}</span> {policy.referencesData.personalReferenceName}</div>
                  <div><span className="font-medium">{t.wizard.review.phone}</span> {policy.referencesData.personalReferencePhone}</div>
                </div>
              </div>
              
              {(policy.referencesData.workReferenceName || policy.referencesData.landlordReferenceName) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">{t.wizard.review.additionalReferences}</h4>
                    <div className="pl-4 space-y-3">
                      {policy.referencesData.workReferenceName && (
                        <div>
                          <div className="font-medium text-sm">{t.wizard.review.workReference}</div>
                          <div className="text-sm">
                            {policy.referencesData.workReferenceName} - {policy.referencesData.workReferencePhone}
                          </div>
                        </div>
                      )}
                      {policy.referencesData.landlordReferenceName && (
                        <div>
                          <div className="font-medium text-sm">{t.wizard.review.landlordReference}</div>
                          <div className="text-sm">
                            {policy.referencesData.landlordReferenceName} - {policy.referencesData.landlordReferencePhone}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">{t.wizard.review.notCompleted}</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasRequiredDocuments ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            {t.wizard.review.documents}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policy.documentsData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{t.wizard.review.identification}</span>
                  <Badge variant={policy.documentsData.identificationCount > 0 ? "default" : "outline"}>
                    {policy.documentsData.identificationCount} {t.wizard.review.files}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{t.wizard.review.incomeProof}</span>
                  <Badge variant={policy.documentsData.incomeCount > 0 ? "default" : "outline"}>
                    {policy.documentsData.incomeCount} {t.wizard.review.files}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{t.wizard.review.optional}</span>
                  <Badge variant="outline">
                    {policy.documentsData.optionalCount} {t.wizard.review.files}
                  </Badge>
                </div>
              </div>
              {policy.documentsData.incomeDocsHavePassword && (
                <div>
                  <span className="font-medium">{t.wizard.review.incomePasswordProtected}</span>{" "}
                  <Badge variant={policy.documentsData.incomeDocsHavePassword === 'yes' ? "destructive" : "default"}>
                    {policy.documentsData.incomeDocsHavePassword === 'yes' ? t.wizard.review.yes : t.wizard.review.no}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">{t.wizard.review.noDocuments}</p>
          )}
        </CardContent>
      </Card>

      {/* Submission */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>{t.wizard.review.readyToSubmit}</CardTitle>
          <CardDescription>
            {t.wizard.review.readyToSubmitDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t.wizard.review.backToDocuments}
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={!isComplete || !hasRequiredDocuments || isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.wizard.messages.submitting}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t.wizard.review.submitApplication}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}