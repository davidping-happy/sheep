import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** 帳號：繁中／英／數字（2～32 字） */
const ACCOUNT_PATTERN = /^[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9]{2,32}$/;

export class RegisterDto {
  /** 登入帳號＝顯示名稱（不必 Email） */
  @IsString()
  @Matches(ACCOUNT_PATTERN, {
    message: '帳號限 2～32 字，可為繁體中文、英文、數字',
  })
  account!: string;

  @IsString()
  @MinLength(6, { message: '密碼至少 6 字元' })
  password!: string;

  /** 手機（台灣 09xxxxxxxx），忘記帳號／密碼用簡訊 */
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
  /** 帳號（顯示名稱）；後台仍可用 email 欄位 */
  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  @MinLength(1)
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
  @IsString()
  @MinLength(9)
  phone!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(9)
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

/** 忘記帳號：以手機簡訊通知登入帳號 */
export class HintAccountDto {
  @IsString()
  @MinLength(9)
  phone!: string;
}
