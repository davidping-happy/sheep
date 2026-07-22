import { Global, Module } from '@nestjs/common';
import { FieldEncryptionService } from './crypto/field-encryption.service';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  providers: [FieldEncryptionService, AuditService],
  exports: [FieldEncryptionService, AuditService],
})
export class CommonModule {}
