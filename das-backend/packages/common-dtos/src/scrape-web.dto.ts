import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUrl, IsNotEmpty, IsObject, ValidateNested, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class ScrapeRulesDto {
  @ApiProperty({ description: 'The maximum crawl depth.', example: 2, default: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  depth?: number = 1;

  @ApiProperty({ description: 'CSS selector to find target elements (e.g., images).', example: '.gallery img' })
  @IsNotEmpty()
  selector: string;
}

export class ScrapeWebRequestDto {
  @ApiProperty({
    description: 'A list of seed URLs to start scraping from.',
    type: [String],
    example: ['https://www.lsuagcenter.com/topics/crops/rice/diseases'],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  urls: string[];

  @ApiProperty({ description: 'Detailed rules for the scraping process.' })
  @IsObject()
  @ValidateNested()
  @Type(() => ScrapeRulesDto)
  rules: ScrapeRulesDto;
  
  @ApiProperty({ description: 'Priority of the job (1-10, 1 is highest).', example: 5, default: 5 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 5;
}
