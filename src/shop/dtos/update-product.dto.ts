import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProductSizeDto {
  @IsOptional() // Marked as optional since it's an update
  @IsString()
  size?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsNumber()
  price?: number;

  @IsOptional() // Marked as optional since it's an update
  @IsNumber()
  discountPrice?: number;

  @IsArray() // Assuming you want to keep imageUrl for ProductSize
  @IsString({ each: true })
  imageUrl?: string[]; // Include imageUrl here
}

export class UpdateProductDto {
  @IsNumber()
  id: number;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  name?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  category?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  sku?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  origin?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  benefits?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  uses?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  ingredients?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  safetyInformation?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  video1?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  video2?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  description?: string;

  @IsOptional() // Marked as optional since it's an update
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductSizeDto)
  sizes?: UpdateProductSizeDto[];

  @IsOptional() // Marked as optional since it's an update
  @IsString()
  bannerUrl?: string;
}
