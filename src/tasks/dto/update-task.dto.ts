import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  iconEmoji?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

