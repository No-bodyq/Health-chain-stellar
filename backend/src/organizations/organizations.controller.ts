import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { memoryStorage } from 'multer';

import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Public()
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'licenseDocument', maxCount: 1 },
        { name: 'certificateDocument', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024, files: 2 },
      },
    ),
  )
  register(
    @Body() dto: RegisterOrganizationDto,
    @UploadedFiles()
    files: {
      licenseDocument?: Express.Multer.File[];
      certificateDocument?: Express.Multer.File[];
    },
  ) {
    return this.organizationsService.register(dto, files);
  }

  @RequirePermissions(Permission.ADMIN_ACCESS)
  @Get('pending')
  listPending() {
    return this.organizationsService.listPending();
  }

  @RequirePermissions(Permission.ADMIN_ACCESS)
  @Patch(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.organizationsService.approve(id, req.user.id);
  }

  @RequirePermissions(Permission.ADMIN_ACCESS)
  @Patch(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectOrganizationDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.organizationsService.reject(id, dto, req.user.id);
  }
}
