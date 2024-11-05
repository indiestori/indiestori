import { IsArray, IsDecimal, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateProductSizeDto {
  @IsString()
  size: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  discountPrice: number;

  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })  // Optional: To validate each string as a valid URL
  imageUrl: string[];
}

class CreateReviewDto {
  @IsString()
  name: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  rating: number; // Assuming rating is a numeric value
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsString()
  sku: string;

  @IsString()
  origin: string;

  @IsString()
  benefits: string;

  @IsString()
  uses: string;

  @IsString()
  ingredients: string;

  @IsString()
  safetyInformation: string;

  @IsString()
  video1: string;

  @IsString()
  video2: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSizeDto)
  sizes: CreateProductSizeDto[];

  @IsString()
  bannerUrl: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReviewDto)
  reviews: CreateReviewDto[]; // Add the reviews array
}
