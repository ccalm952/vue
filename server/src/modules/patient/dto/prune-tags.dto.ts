import { IsArray, IsOptional, IsString } from "class-validator";

export class PruneTagsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTags?: string[];
}
