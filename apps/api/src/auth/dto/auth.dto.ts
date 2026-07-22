import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10) // 建議搭配前端密碼強度檢查
  password!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;

  // 未成年須提供監護人資訊 (§四.8)
  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  // 後台帳號 2FA 一次性密碼 (§四.3)
  @IsOptional()
  @IsString()
  totp?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
