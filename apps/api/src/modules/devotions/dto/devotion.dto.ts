import { Visibility } from '../../../common/enums';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** 晨禱筆記內容上限（字元） */
const CONTENT_MAX = 800;

export class CreateDevotionDto {
  @IsDateString()
  noteDate!: string;

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
