-- CreateIndex
CREATE INDEX "ActorDocument_landlordId_idx" ON "ActorDocument"("landlordId");

-- CreateIndex
CREATE INDEX "ActorDocument_tenantId_idx" ON "ActorDocument"("tenantId");

-- CreateIndex
CREATE INDEX "ActorDocument_jointObligorId_idx" ON "ActorDocument"("jointObligorId");

-- CreateIndex
CREATE INDEX "ActorDocument_avalId_idx" ON "ActorDocument"("avalId");

-- CreateIndex
CREATE INDEX "Aval_policyId_idx" ON "Aval"("policyId");

-- CreateIndex
CREATE INDEX "CommercialReference_tenantId_idx" ON "CommercialReference"("tenantId");

-- CreateIndex
CREATE INDEX "CommercialReference_jointObligorId_idx" ON "CommercialReference"("jointObligorId");

-- CreateIndex
CREATE INDEX "CommercialReference_avalId_idx" ON "CommercialReference"("avalId");

-- CreateIndex
CREATE INDEX "Incident_policyId_idx" ON "Incident"("policyId");

-- CreateIndex
CREATE INDEX "Incident_policyId_status_idx" ON "Incident"("policyId", "status");

-- CreateIndex
CREATE INDEX "JointObligor_policyId_idx" ON "JointObligor"("policyId");

-- CreateIndex
CREATE INDEX "Payment_policyId_idx" ON "Payment"("policyId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "PersonalReference_tenantId_idx" ON "PersonalReference"("tenantId");

-- CreateIndex
CREATE INDEX "PersonalReference_jointObligorId_idx" ON "PersonalReference"("jointObligorId");

-- CreateIndex
CREATE INDEX "PersonalReference_avalId_idx" ON "PersonalReference"("avalId");

-- CreateIndex
CREATE INDEX "Policy_status_createdAt_idx" ON "Policy"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PolicyActivity_policyId_createdAt_idx" ON "PolicyActivity"("policyId", "createdAt");
