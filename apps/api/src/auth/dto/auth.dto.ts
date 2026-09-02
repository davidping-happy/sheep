import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  displayName!: string;

  /** 手機（台灣 09xxxxxxxx），忘記密碼／帳號時收簡訊 */
  @IsString()
  @MinLength(9)
  phone!: string;

  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;
}

export class LoginDto {
  /** 帳號：Email 或手機（與舊版 email 欄位相容） */
  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  @MinLength(3)
  account?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  totp?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  /** Email 或手機 */
  @IsString()
  @MinLength(3)
  account!: string;
}

export class ResetPasswordDto {
  /** Email 或手機 */
  @IsString()
  @MinLength(3)
  account!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

/** 忘記帳號：手機或顯示名稱 → Email／簡訊通知帳號 */
export class HintAccountDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
