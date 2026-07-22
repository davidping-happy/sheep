import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  registerDeadline?: string;

  @IsOptional()
  @IsBoolean()
  requiresGuardianConsent?: boolean;
}

export class RegisterEventDto {
  // 兒少活動需監護人同意 (§6.1)
  @IsOptional()
  @IsBoolean()
  guardianConsent?: boolean;
}

export class CheckinDto {
  // 由 App 動態 QR Code 帶入的短效期 token
  @IsString()
  token!: string;
}
