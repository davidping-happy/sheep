import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AdminBootstrapService,
    MailService,
    SmsService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
