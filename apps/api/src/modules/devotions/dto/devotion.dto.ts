import { DevotionCategory, Visibility } from '../../../common/enums';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 靈修隨記內容上限（字元） */
const CONTENT_MAX = 800;
const COMMENT_MAX = 500;

export class CreateDevotionCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(COMMENT_MAX)
  content!: string;
}

export class CreateDevotionDto {
  @IsDateString()
  noteDate!: string;

  @IsEnum(DevotionCategory)
  category!: DevotionCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  scriptureRef?: string;

  @IsString()
  @MaxLength(CONTENT_MAX)
  content!: string; // 明文進來，service 內加密後才落地

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility; // 預設 PRIVATE

  @IsOptional()
  @IsUUID()
  sharedGroupId?: string;
}

export class UpdateDevotionDto {
  @IsOptional()
  @IsEnum(DevotionCategory)
  category?: DevotionCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  scriptureRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_MAX)
  content?: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsUUID()
  sharedGroupId?: string;
}
