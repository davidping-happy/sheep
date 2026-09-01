import { Global, Module } from '@nestjs/common';
import { FieldEncryptionService } from './crypto/field-encryption.service';
import { AuditService } from './audit/audit.service';
import { SchemaSyncBootstrap } from './schema-sync.bootstrap';

@Global()
@Module({
  providers: [FieldEncryptionService, AuditService, SchemaSyncBootstrap],
  exports: [FieldEncryptionService, AuditService, SchemaSyncBootstrap],
})
export class CommonModule {}
