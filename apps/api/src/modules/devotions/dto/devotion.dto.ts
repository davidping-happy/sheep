import { Visibility } from '../../../common/enums';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDevotionDto {
  @IsDateString()
  noteDate!: string;

  @IsOptional()
  @IsString()
  scriptureRef?: string;

  @IsString()
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
  scriptureRef?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsUUID()
  sharedGroupId?: string;
}
