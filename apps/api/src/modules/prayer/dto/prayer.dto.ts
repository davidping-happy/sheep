import { Visibility } from '../../../common/enums';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePrayerDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility; // 預設 PRIVATE

  @IsOptional()
  @IsUUID()
  sharedGroupId?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class ModeratePrayerDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReportPrayerDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePrayerCommentDto {
  @IsString()
  @MinLength(1, { message: '請輸入留言內容' })
  @MaxLength(500, { message: '留言請控制在 500 字以內' })
  content!: string;
}

export class RespondPrayerDto {
  @IsOptional()
  @IsBoolean()
  showIdentity?: boolean;
}

export class ArchivePolicyDto {
  // 幾天後自動封存不再公開（§6.2 延伸）
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}
